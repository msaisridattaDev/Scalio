import time
from datetime import datetime, timezone
from typing import AsyncIterator, TypedDict

from langgraph.graph import END, START, StateGraph

from app import decision as decision_module
from app import memory
from app import providers
from app.actions.regenerate import apply_regenerate
from app.actions.repair import apply_repair
from app.defect_rules import extract_defect_type
from app.evaluators.pipeline import run_evaluation_pipeline
from app.fixtures import DEMO_BRAND, FIXTURES_BY_ID
from app.models import Fixture, ScoreCard


class BrandGuardState(TypedDict, total=False):
    fixture_id: str
    brand_id: str
    brand_kit: dict
    memory_context: str
    current_fixture: dict | None  # per-run fixture override from repair/regenerate — never mutates the global registry
    scorecard: dict | None
    decision: dict | None
    original_scorecard: dict | None  # scorecard from the first evaluate pass, before any repair/regenerate
    original_decision: dict | None  # decision from the first decide pass, before any repair/regenerate
    original_fixture: dict | None  # fixture as first evaluated, before any repair/regenerate
    provider_selection: dict | None  # real select_provider() output, set only on the REGENERATE path
    trace: list[dict]
    attempt: int


def _trace_event(state: BrandGuardState, component: str, input_summary: str, output_summary: str, latency_ms: float) -> dict:
    return {
        "step": len(state["trace"]) + 1,
        "component": component,
        "input_summary": input_summary,
        "output_summary": output_summary,
        "latency_ms": latency_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _active_fixture(state: BrandGuardState) -> Fixture:
    if state.get("current_fixture"):
        return Fixture(**state["current_fixture"])
    return FIXTURES_BY_ID[state["fixture_id"]]


async def load_context(state: BrandGuardState) -> BrandGuardState:
    start = time.perf_counter()
    memory_context = memory.get_memory_context_string(state["brand_id"])
    latency_ms = (time.perf_counter() - start) * 1000

    state["brand_kit"] = DEMO_BRAND.model_dump()
    state["memory_context"] = memory_context
    state["trace"].append(
        _trace_event(
            state,
            "load_context",
            f"brand_id={state['brand_id']}",
            f"loaded brand_kit + memory_context ({len(memory_context)} chars)",
            latency_ms,
        )
    )
    return state


async def evaluate(state: BrandGuardState) -> BrandGuardState:
    start = time.perf_counter()
    fixture = _active_fixture(state)
    scorecard = await run_evaluation_pipeline(fixture, DEMO_BRAND, state["brand_id"])
    latency_ms = (time.perf_counter() - start) * 1000

    # Always keep current_fixture in sync with whichever fixture was just
    # evaluated (original or repaired/regenerated) so callers can read
    # things like source_provider without a separate lookup.
    state["current_fixture"] = fixture.model_dump()
    state["scorecard"] = scorecard.model_dump()
    if state.get("original_scorecard") is None:
        state["original_scorecard"] = scorecard.model_dump()
        state["original_fixture"] = fixture.model_dump()
    passed_count = sum(1 for d in scorecard.dimensions if d.passed)
    state["trace"].append(
        _trace_event(
            state,
            "evaluate",
            f"fixture_id={fixture.id} (attempt={state.get('attempt', 0)}) via gpt-4o, temperature=0",
            f"{passed_count}/{len(scorecard.dimensions)} dimensions passed",
            latency_ms,
        )
    )
    return state


async def decide(state: BrandGuardState) -> BrandGuardState:
    start = time.perf_counter()
    scorecard = ScoreCard(**state["scorecard"])
    result = decision_module.decide(scorecard)
    latency_ms = (time.perf_counter() - start) * 1000

    state["decision"] = result.model_dump()
    if state.get("original_decision") is None:
        state["original_decision"] = result.model_dump()
    state["trace"].append(
        _trace_event(
            state,
            "decide",
            f"scorecard for {state['fixture_id']}",
            f"{result.action} (confidence={result.confidence}): {result.reason}",
            latency_ms,
        )
    )
    return state


async def repair(state: BrandGuardState) -> BrandGuardState:
    start = time.perf_counter()
    fixture = _active_fixture(state)
    repaired = await apply_repair(fixture)
    state["current_fixture"] = repaired.model_dump()
    state["attempt"] = state.get("attempt", 0) + 1
    latency_ms = (time.perf_counter() - start) * 1000

    state["trace"].append(
        _trace_event(
            state,
            "repair",
            f"fixture_id={fixture.id}",
            f"repaired -> {repaired.image_path}",
            latency_ms,
        )
    )
    return state


async def select_provider_node(state: BrandGuardState) -> BrandGuardState:
    # A real graph node — not a decorative frontend call. Runs the same
    # select_provider() policy Phase 7 uses, but driven by the defect type
    # the evaluator actually just detected on THIS content, and wired
    # directly into the regenerate path so its output is consequential
    # (it changes which provider the resulting fixture is attributed to).
    start = time.perf_counter()
    scorecard = ScoreCard(**state["scorecard"])
    defect_dim = next((d for d in scorecard.dimensions if d.name == "defect_detection"), None)
    content_type_hint = extract_defect_type(defect_dim.detail) if defect_dim else "general_content_regeneration"

    selection = providers.select_provider(content_type_hint)
    state["provider_selection"] = {**selection, "content_type_hint": content_type_hint}
    latency_ms = (time.perf_counter() - start) * 1000

    state["trace"].append(
        _trace_event(
            state,
            "select_provider",
            f"content_type_hint={content_type_hint} (derived from detected defect)",
            f"{selection['selected_provider']}: {selection['reason']}",
            latency_ms,
        )
    )
    return state


async def regenerate(state: BrandGuardState) -> BrandGuardState:
    start = time.perf_counter()
    fixture = _active_fixture(state)
    regenerated = await apply_regenerate(fixture, state["memory_context"])

    selection = state.get("provider_selection")
    routed_provider = selection["selected_provider"] if selection else fixture.source_provider
    if selection:
        # The staged replacement asset is still a mocked demo image (no live
        # generation call), but the routing decision that picked this
        # provider was real — attribute the result to it honestly.
        regenerated = regenerated.model_copy(update={"source_provider": routed_provider})

    state["current_fixture"] = regenerated.model_dump()
    state["attempt"] = state.get("attempt", 0) + 1
    latency_ms = (time.perf_counter() - start) * 1000

    state["trace"].append(
        _trace_event(
            state,
            "regenerate",
            f"fixture_id={fixture.id}, routed_provider={routed_provider}",
            f"simulated/staged output attributed to {routed_provider} (no live generation call) -> {regenerated.image_path}",
            latency_ms,
        )
    )
    return state


def _route_after_decide(state: BrandGuardState) -> str:
    # Hard cap at one repair/regenerate attempt — an uncapped retry loop is
    # a real production failure mode (runaway cost/latency). Once we've
    # already looped once, let the decision stand and surface it honestly.
    if state.get("attempt", 0) >= 1:
        return END
    action = state["decision"]["action"]
    if action == "AUTO_REPAIR":
        return "repair"
    if action == "REGENERATE":
        return "select_provider"
    return END


def _build_graph():
    builder = StateGraph(BrandGuardState)
    builder.add_node("load_context", load_context)
    builder.add_node("evaluate", evaluate)
    builder.add_node("decide", decide)
    builder.add_node("repair", repair)
    builder.add_node("select_provider", select_provider_node)
    builder.add_node("regenerate", regenerate)

    builder.add_edge(START, "load_context")
    builder.add_edge("load_context", "evaluate")
    builder.add_edge("evaluate", "decide")
    builder.add_conditional_edges(
        "decide", _route_after_decide, {"repair": "repair", "select_provider": "select_provider", END: END}
    )
    builder.add_edge("repair", "evaluate")
    builder.add_edge("select_provider", "regenerate")
    builder.add_edge("regenerate", "evaluate")

    return builder.compile()


_compiled_graph = _build_graph()


def _initial_state(fixture: Fixture, brand_id: str) -> BrandGuardState:
    return {
        "fixture_id": fixture.id,
        "brand_id": brand_id,
        "brand_kit": {},
        "memory_context": "",
        "current_fixture": fixture.model_dump(),
        "scorecard": None,
        "decision": None,
        "original_scorecard": None,
        "original_decision": None,
        "original_fixture": None,
        "provider_selection": None,
        "trace": [],
        "attempt": 0,
    }


def _log_provider_outcome_if_routed(final_state: dict) -> None:
    if not final_state.get("provider_selection"):
        return
    # Close the loop: feed this run's real outcome back into the same
    # provider-history store select_provider() reads from, so future
    # routing decisions (including the Auto-Route bonus) reflect it.
    outcome_fixture = Fixture(**final_state["current_fixture"])
    outcome_scorecard = ScoreCard(**final_state["scorecard"])
    providers.log_provider_outcome(outcome_fixture, outcome_scorecard)


async def run_brandguard_on_fixture(fixture: Fixture, brand_id: str) -> dict:
    final_state = await _compiled_graph.ainvoke(_initial_state(fixture, brand_id))
    _log_provider_outcome_if_routed(final_state)
    return final_state


async def run_brandguard_on_fixture_stream(fixture: Fixture, brand_id: str) -> AsyncIterator[dict]:
    # Real per-node streaming: astream()'s default "updates" mode yields one
    # chunk per node AS IT FINISHES, each containing the full state at that
    # point (since our node functions return the whole mutated state, not a
    # partial patch). The caller gets these live, not replayed after the
    # graph has already finished.
    last_state: dict | None = None
    async for chunk in _compiled_graph.astream(_initial_state(fixture, brand_id)):
        node_name, state = next(iter(chunk.items()))
        last_state = state
        yield {"node": node_name, "state": dict(state)}

    if last_state is not None:
        _log_provider_outcome_if_routed(last_state)


async def run_brandguard(fixture_id: str, brand_id: str) -> dict:
    # External signature/behavior unchanged — Steps 1-7 of the stepper
    # keep working exactly as before this function became a thin wrapper.
    fixture = FIXTURES_BY_ID[fixture_id]
    return await run_brandguard_on_fixture(fixture, brand_id)


async def run_brandguard_stream(fixture_id: str, brand_id: str) -> AsyncIterator[dict]:
    fixture = FIXTURES_BY_ID[fixture_id]
    async for event in run_brandguard_on_fixture_stream(fixture, brand_id):
        yield event


async def run_brandguard_routed(content_type_hint: str, brand_id: str) -> dict:
    from app import providers
    from app.tools.video_providers import PROVIDER_TOOLS, VideoGenerationRequest

    selection = providers.select_provider(content_type_hint)
    selected_provider = selection["selected_provider"]

    tool = PROVIDER_TOOLS[selected_provider]
    request = VideoGenerationRequest(content_type_hint=content_type_hint, brand_id=brand_id)
    generation_result = tool.invoke({"request": request})

    final_state = await run_brandguard_on_fixture(generation_result.fixture, brand_id)

    scorecard = ScoreCard(**final_state["scorecard"])
    providers.log_provider_outcome(generation_result.fixture, scorecard)

    return {
        "selected_provider": selected_provider,
        "selection_reason": selection["reason"],
        "leaderboard": selection["leaderboard"],
        "sample_note": selection["sample_note"],
        **final_state,
    }
