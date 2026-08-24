import json
import pathlib

from app.graph import run_brandguard

_GOLDEN_SET_PATH = pathlib.Path(__file__).resolve().parent.parent.parent / "eval" / "golden_set.json"


async def run_golden_set() -> tuple[list[dict], float]:
    cases = json.loads(_GOLDEN_SET_PATH.read_text(encoding="utf-8"))

    results = []
    correct = 0
    for case in cases:
        final_state = await run_brandguard(case["fixture_id"], case["brand_id"])
        actual = final_state["decision"]["action"]
        passed = actual == case["expected_decision"]
        if passed:
            correct += 1
        results.append(
            {
                "id": case["id"],
                "fixture_id": case["fixture_id"],
                "expected_decision": case["expected_decision"],
                "actual_decision": actual,
                "passed": passed,
                "note": case["note"],
                "reason": final_state["decision"]["reason"],
            }
        )

    agreement_pct = round(100 * correct / len(cases), 1) if cases else 0.0
    return results, agreement_pct
