"""Deterministic rule checks — zero LLM calls, run instantly.

These are plain functions (not @tool-wrapped) since they return a
structured list rather than something an agent would call standalone;
kept in their own module so they'd be trivially exposable as LangChain
tools later if needed.
"""

from app.models import BrandKit, Fixture, ScoreCardDimension

_DEVANAGARI_RANGE = range(0x0900, 0x0980)

_EXPECTED_ASPECT_RATIO = {
    "instagram_reel": "9:16",
    "instagram_post": "1:1",
}

_BANNED_PHRASES = [
    "guaranteed cure",
    "100% risk-free",
    "best in the world",
    "miracle results",
    "no side effects",
    "limited time only",
]


def _check_caption_language(fixture: Fixture, brand_kit: BrandKit) -> ScoreCardDimension:
    if "hi" not in brand_kit.languages:
        return ScoreCardDimension(
            name="caption_language",
            method="deterministic",
            passed=True,
            detail="Hindi not required for this brand's language set — check skipped as passing.",
        )

    has_devanagari = any(ord(ch) in _DEVANAGARI_RANGE for ch in fixture.caption_text)
    has_latin = any(ch.isalpha() and ch.isascii() for ch in fixture.caption_text)
    passed = has_devanagari and has_latin

    return ScoreCardDimension(
        name="caption_language",
        method="deterministic",
        passed=passed,
        detail=(
            "Caption contains both Devanagari and Latin script."
            if passed
            else f"Caption missing required script (devanagari={has_devanagari}, latin={has_latin})."
        ),
    )


def _check_format_compliance(fixture: Fixture) -> ScoreCardDimension:
    expected = _EXPECTED_ASPECT_RATIO.get(fixture.intended_platform)
    passed = expected is not None and fixture.aspect_ratio == expected

    return ScoreCardDimension(
        name="format_compliance",
        method="deterministic",
        passed=passed,
        detail=(
            f"Aspect ratio {fixture.aspect_ratio} matches expected {expected} for {fixture.intended_platform}."
            if passed
            else f"Aspect ratio {fixture.aspect_ratio} does not match expected {expected} for {fixture.intended_platform}."
        ),
    )


def _check_banned_words(fixture: Fixture) -> ScoreCardDimension:
    caption_lower = fixture.caption_text.lower()
    hits = [phrase for phrase in _BANNED_PHRASES if phrase in caption_lower]
    passed = not hits

    return ScoreCardDimension(
        name="banned_word_scan",
        method="deterministic",
        passed=passed,
        detail="No banned phrases found." if passed else f"Banned phrase(s) found: {', '.join(hits)}.",
    )


def run_rule_checks(fixture: Fixture, brand_kit: BrandKit, memory_context: str) -> list[ScoreCardDimension]:
    return [
        _check_caption_language(fixture, brand_kit),
        _check_format_compliance(fixture),
        _check_banned_words(fixture),
    ]
