"""Provider-performance memory + the deterministic routing policy.

Deliberately NOT an LLM decision and NOT a bandit/RL algorithm — sorting
three numbers doesn't need a model call. This is sized to the amount of
real signal available (a handful of provider-tagged runs), with an
interface narrow enough that a real bandit or LLM-based policy could
slot in later once there's enough production volume to justify it.
"""

import json
import uuid
from datetime import datetime, timezone

from app import memory
from app.models import Fixture, MemoryEntry, ScoreCard

_DEFAULT_PROVIDER = "veo"
_BRAND_ID = "priya-sarees"

# Seeded historical runs: (provider, had_defect, defect_type | None)
_SEEDED_HISTORY: list[tuple[str, bool, str | None]] = [
    ("veo", True, "hand_distortion"),
    ("veo", True, "hand_distortion"),
    ("veo", False, None),
    ("kling", False, None),
    ("kling", False, None),
    ("kling", False, None),
    ("heygen", False, None),
    ("heygen", False, None),
]


def _provider_run_key(provider: str) -> str:
    return f"provider_run:{provider}"


def log_provider_outcome(fixture: Fixture, scorecard: ScoreCard) -> None:
    defect_dim = next((d for d in scorecard.dimensions if d.name == "defect_detection"), None)
    had_defect = defect_dim is not None and not defect_dim.passed
    defect_type = fixture.known_defect.type if had_defect and fixture.known_defect else None

    entry = MemoryEntry(
        id=str(uuid.uuid4()),
        brand_id=_BRAND_ID,
        type="episodic",
        key=_provider_run_key(fixture.source_provider),
        value=json.dumps({"defect": had_defect, "defect_type": defect_type}),
        confidence="high",
        source="brandguard_run",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    memory.write_memory(entry)


def seed_provider_history() -> None:
    entries = memory.get_memory(_BRAND_ID)
    if any(e.source == "seeded_history" for e in entries):
        return

    for provider, had_defect, defect_type in _SEEDED_HISTORY:
        entry = MemoryEntry(
            id=str(uuid.uuid4()),
            brand_id=_BRAND_ID,
            type="episodic",
            key=_provider_run_key(provider),
            value=json.dumps({"defect": had_defect, "defect_type": defect_type}),
            confidence="high",
            source="seeded_history",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        memory.write_memory(entry)


def get_leaderboard() -> dict[str, dict]:
    entries = memory.get_memory(_BRAND_ID)
    stats: dict[str, dict] = {}

    for e in entries:
        if e.source not in ("seeded_history", "brandguard_run"):
            continue
        if not e.key.startswith("provider_run:"):
            continue
        provider = e.key.split(":", 1)[1]
        payload = json.loads(e.value)

        s = stats.setdefault(provider, {"runs": 0, "defects": 0, "hand_distortion_runs": 0})
        s["runs"] += 1
        if payload.get("defect"):
            s["defects"] += 1
        if payload.get("defect_type") == "hand_distortion":
            s["hand_distortion_runs"] += 1

    for s in stats.values():
        s["defect_rate"] = round(s["defects"] / s["runs"], 3) if s["runs"] else 0.0
        s["hand_distortion_rate"] = round(s["hand_distortion_runs"] / s["runs"], 3) if s["runs"] else 0.0

    return stats


def select_provider(content_type_hint: str) -> dict:
    leaderboard = get_leaderboard()
    sample_note = (
        "Includes seeded historical data for demo purposes, clearly distinguished from this "
        "session's live runs — not a production-scale benchmark."
    )

    providers_with_data = [p for p, s in leaderboard.items() if s["runs"] > 0]
    if len(providers_with_data) < 2:
        return {
            "selected_provider": _DEFAULT_PROVIDER,
            "reason": f"Insufficient provider history (only {len(providers_with_data)} provider(s) with "
            f"data) — defaulting to '{_DEFAULT_PROVIDER}'.",
            "leaderboard": leaderboard,
            "sample_note": sample_note,
        }

    hand_heavy = "hand" in content_type_hint.lower()
    rate_key = "hand_distortion_rate" if hand_heavy else "defect_rate"

    ranked = sorted(
        providers_with_data,
        key=lambda p: (leaderboard[p][rate_key], -leaderboard[p]["runs"]),
    )
    selected = ranked[0]
    worst = ranked[-1]  # contrast against the worst performer, not just the runner-up

    selected_pct = round(leaderboard[selected][rate_key] * 100)
    worst_pct = round(leaderboard[worst][rate_key] * 100)
    metric_label = "hand-distortion rate" if hand_heavy else "defect rate"

    reason = (
        f"{selected} selected: {selected_pct}% {metric_label} vs {worst}'s "
        f"{worst_pct}% across seeded history"
    )

    return {
        "selected_provider": selected,
        "reason": reason,
        "leaderboard": leaderboard,
        "sample_note": sample_note,
    }
