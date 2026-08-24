"""Pure decision policy — no side effects, no I/O."""

import re

from app.models import Decision, ScoreCard, ScoreCardDimension

_SEVERITY_TAG = re.compile(r"\[severity:(minor|major)\]")


def _find(scorecard: ScoreCard, name: str) -> ScoreCardDimension | None:
    return next((d for d in scorecard.dimensions if d.name == name), None)


def _severity_of(dimension: ScoreCardDimension) -> str | None:
    match = _SEVERITY_TAG.search(dimension.detail)
    return match.group(1) if match else None


def decide(scorecard: ScoreCard) -> Decision:
    compliance = _find(scorecard, "compliance")
    defect = _find(scorecard, "defect_detection")
    visual = _find(scorecard, "brand_visual_match")
    tone = _find(scorecard, "brand_tone_match")

    if compliance is not None and not compliance.passed:
        return Decision(
            action="BLOCK",
            reason=f"Compliance check failed: {compliance.detail}",
            confidence="high",
        )

    if defect is not None and not defect.passed:
        severity = _severity_of(defect)
        if severity == "minor":
            return Decision(
                action="AUTO_REPAIR",
                reason=f"Minor defect detected: {defect.detail}",
                confidence="high",
            )
        if severity == "major":
            return Decision(
                action="REGENERATE",
                reason=f"Major defect detected: {defect.detail}",
                confidence="high",
            )

    weak_visual = visual is not None and visual.score is not None and visual.score < 3
    weak_tone = tone is not None and tone.score is not None and tone.score < 3
    if weak_visual or weak_tone:
        weak_names = [
            name
            for name, is_weak in (("brand_visual_match", weak_visual), ("brand_tone_match", weak_tone))
            if is_weak
        ]
        return Decision(
            action="ESCALATE",
            reason=f"Weak brand fit on: {', '.join(weak_names)} — no hard defect, needs human review.",
            confidence="medium",
        )

    return Decision(
        action="PASS",
        reason="All checks passed: no defects, brand-fit scores acceptable.",
        confidence="high",
    )
