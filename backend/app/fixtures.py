# The fixture images referenced below (public/fixtures/*.jpeg) are real
# photos/generated images, not synthetic placeholders — sourced directly
# so the VLM judge evaluates genuine visual content instead of abstract
# shapes it would (correctly) reject as not being real product photos.

from app.models import BrandKit, Fixture, KnownDefect

DEMO_BRAND = BrandKit(
    brand_id="priya-sarees",
    name="Priya Sarees",
    vertical="Saree & festive fashion boutique (Jaipur)",
    languages=["hi", "en"],
    palette=["#B5121B", "#E8A33D", "#6B2737", "#F5E1C8"],
    tone_descriptors=["warm", "traditional", "trustworthy"],
    audience="Indian women 25-45 shopping for festive and wedding sarees",
)

FIXTURES: list[Fixture] = [
    Fixture(
        id="flawed-hand",
        image_path="/fixtures/flawed-hand.jpeg",
        caption_text="Wrap yourself in tradition this festive season | इस त्योहार में परंपरा को अपनाएं",
        intended_platform="instagram_reel",
        aspect_ratio="9:16",
        source_provider="veo",
        known_defect=KnownDefect(
            type="hand_distortion",
            severity="major",
            description="visible pixel-corruption glitch across the hand and forearm holding the product",
        ),
    ),
    Fixture(
        id="flawed-text",
        image_path="/fixtures/flawed-text.jpeg",
        caption_text="Festive sale now live | त्योहारी सेल अब शुरू",
        intended_platform="instagram_post",
        aspect_ratio="1:1",
        source_provider="kling",
        known_defect=KnownDefect(
            type="text_garbled",
            severity="major",
            description="generation failed entirely — the raw AI image-generation prompt text leaked into the output instead of the intended product photo",
        ),
    ),
    Fixture(
        id="clean-good",
        image_path="/fixtures/clean-good.jpeg",
        caption_text="Handwoven elegance for every celebration | हर उत्सव के लिए हाथ से बुनी खूबसूरती",
        intended_platform="instagram_post",
        aspect_ratio="1:1",
        source_provider="heygen",
        known_defect=None,
    ),
]

FIXTURES_BY_ID: dict[str, Fixture] = {f.id: f for f in FIXTURES}
