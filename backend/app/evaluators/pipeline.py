from datetime import datetime, timezone

from app import memory
from app.evaluators.rule_checks import run_rule_checks
from app.evaluators.vlm_judge import run_vlm_judge
from app.fixtures import FIXTURES_BY_ID
from app.models import BrandKit, Fixture, ScoreCard


async def run_evaluation_pipeline(
    fixture: Fixture | str, brand_kit: BrandKit, brand_id: str
) -> ScoreCard:
    # Accepts either a fixture_id (looked up from the static registry) or an
    # already-resolved Fixture object — the latter lets repair/regenerate
    # pass a locally-swapped fixture through without mutating the registry.
    if isinstance(fixture, str):
        fixture = FIXTURES_BY_ID[fixture]

    memory_context = memory.get_memory_context_string(brand_id)

    rule_dimensions = run_rule_checks(fixture, brand_kit, memory_context)
    vlm_dimensions, vlm_rationale = await run_vlm_judge(fixture, brand_kit, memory_context)

    dimensions = rule_dimensions + vlm_dimensions

    failed_rules = [d.name for d in rule_dimensions if not d.passed]
    overall_rationale = vlm_rationale
    if failed_rules:
        overall_rationale = f"Rule check(s) failed: {', '.join(failed_rules)}. {overall_rationale}"

    return ScoreCard(
        fixture_id=fixture.id,
        brand_id=brand_id,
        dimensions=dimensions,
        overall_rationale=overall_rationale,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
