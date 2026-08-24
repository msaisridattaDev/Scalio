from app.models import Fixture


async def apply_repair(fixture: Fixture) -> Fixture:
    # Simulated repair swap for demo purposes — production would call an
    # inpainting API scoped to the flagged defect region. Here we swap in
    # the known-clean image as a plausible stand-in for "the defect was
    # fixed," and return a NEW Fixture rather than mutating the original.
    return fixture.model_copy(update={"image_path": "/fixtures/clean-good.jpeg", "known_defect": None})
