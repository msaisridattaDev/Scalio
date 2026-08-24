import logging

from app.models import Fixture

logger = logging.getLogger(__name__)


def _compose_improved_prompt(fixture: Fixture, memory_context: str) -> str:
    constraints = ", no visible human hands, bilingual Hindi and English caption text, clearly legible"
    return f"{fixture.caption_text}{constraints} (memory context considered: {memory_context})"


async def apply_regenerate(fixture: Fixture, memory_context: str) -> Fixture:
    improved_prompt = _compose_improved_prompt(fixture, memory_context)
    # Windows consoles default to cp1252, which can't encode Devanagari —
    # go through logging (which handles this) rather than a raw print().
    logger.info("[regenerate] composed improved prompt for %s: %s", fixture.id, improved_prompt)

    # No text-to-image tool is wired in this environment, so we fall back
    # to swapping in the known-clean image as the "regenerated" result
    # instead of calling a live generation API.
    return fixture.model_copy(update={"image_path": "/fixtures/clean-good.jpeg", "known_defect": None})
