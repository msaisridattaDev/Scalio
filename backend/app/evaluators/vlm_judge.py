"""VLM judge — one structured multimodal call standing in for defect
detection, OCR/text-legibility checking, and brand-fit judging.

Deliberate consolidation for build speed: production would likely split
this into a specialized defect detector, a real OCR pass, and a
brand-fit classifier. The interface (Fixture + BrandKit + memory_context
-> list[ScoreCardDimension]) is kept narrow so swapping in specialized
models later doesn't require touching callers.

Deliberately, this evaluator never branches on Fixture.source_provider:
it judges the delivered asset, not which generator produced it. Scalio's
product likely composites multiple third-party generators (Veo/Kling/
Seedance for video, HeyGen for the AI Actor avatar), each with different
failure modes the team doesn't control upstream. A gate that only worked
for one provider would break the moment they add or swap a generator —
this one doesn't care which provider it's looking at.
"""

import base64
import os
import pathlib
from typing import Literal, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.models import BrandKit, Fixture, ScoreCardDimension

_FIXTURES_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent.parent / "public"

_SYSTEM_PROMPT = """You are BrandGuard's visual QA judge for an Indian saree/festive-fashion \
brand. You are given a generated social media image, its caption, a brand kit summary, and \
the brand's known memory (preferences learned from the brand kit and past human feedback).

Judge the image for:
1. AI generation defects (distorted hands/limbs, garbled/illegible overlaid text, warped \
objects, anatomical impossibilities).
2. Prompt/meta-text leakage: raw AI generation instructions, prompts, camera settings \
(e.g. "85mm", "f/1.8"), negative prompts, technical parameters (e.g. "CFG", "seed"), or other \
generation metadata appearing visibly in the final image instead of intended marketing/content \
text. If this is present, it is a MAJOR AI generation defect on its own — set \
defect_detected=true, defect_severity="major", defect_type="prompt_leakage", even if the rest \
of the image looks otherwise clean.
3. Whether any overlaid text is legible, and what it says.
4. How well the image matches the brand's visual palette/style (1-5).
5. How well the image matches the brand's tone descriptors (1-5).
6. Compliance: does the image violate any known brand memory constraint?

IMPORTANT: brand memory constraints override general quality judgment. If the memory context \
mentions the brand wants to avoid a specific visual element (e.g. "avoid visible hands") and \
this image contains that element, you MUST treat it as a defect — set defect_detected=true, \
lower brand_visual_match — even if the image is otherwise well-formed and would normally pass.

Return your judgment via the structured schema only."""


class VlmJudgeOutput(BaseModel):
    defect_detected: bool
    defect_type: Optional[str] = None
    defect_severity: Optional[Literal["minor", "major"]] = None
    defect_description: str
    text_legible: bool
    detected_text: Optional[str] = None
    brand_visual_match: float = Field(ge=1, le=5)
    brand_tone_match: float = Field(ge=1, le=5)
    compliance_flag: bool
    compliance_reason: Optional[str] = None
    rationale: str


def _encode_image(image_path: str) -> str:
    relative = image_path.lstrip("/")
    full_path = _FIXTURES_ROOT / relative
    data = full_path.read_bytes()
    return base64.b64encode(data).decode("utf-8")


def _build_user_content(fixture: Fixture, brand_kit: BrandKit, memory_context: str) -> list[dict]:
    b64_image = _encode_image(fixture.image_path)
    brand_summary = (
        f"Brand: {brand_kit.name} ({brand_kit.vertical}). "
        f"Palette: {', '.join(brand_kit.palette)}. "
        f"Tone: {', '.join(brand_kit.tone_descriptors)}. "
        f"Audience: {brand_kit.audience}."
    )
    text_block = (
        f"{brand_summary}\n\n"
        f"Brand memory: {memory_context}\n\n"
        f"Caption text: {fixture.caption_text}\n"
        f"Intended platform: {fixture.intended_platform} (aspect ratio {fixture.aspect_ratio})"
    )
    return [
        {"type": "text", "text": text_block},
        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image}"}},
    ]


def _severity_tag(severity: Optional[str]) -> str:
    return f"[severity:{severity}] " if severity else ""


def _map_to_dimensions(output: VlmJudgeOutput) -> list[ScoreCardDimension]:
    return [
        ScoreCardDimension(
            name="defect_detection",
            method="vlm",
            passed=not output.defect_detected,
            # severity is embedded as a leading [severity:minor|major] tag so
            # decision.py (Phase 4) can recover it without a schema change.
            detail=f"{_severity_tag(output.defect_severity)}{output.defect_type or 'none'}: {output.defect_description}",
        ),
        ScoreCardDimension(
            name="text_rendering",
            method="vlm",
            passed=output.text_legible,
            detail=f"Detected text: {output.detected_text or '(none)'}",
        ),
        ScoreCardDimension(
            name="brand_visual_match",
            method="vlm",
            passed=output.brand_visual_match >= 3,
            detail=f"Visual match score {output.brand_visual_match}/5.",
            score=output.brand_visual_match,
        ),
        ScoreCardDimension(
            name="brand_tone_match",
            method="vlm",
            passed=output.brand_tone_match >= 3,
            detail=f"Tone match score {output.brand_tone_match}/5.",
            score=output.brand_tone_match,
        ),
        ScoreCardDimension(
            name="compliance",
            method="vlm",
            passed=not output.compliance_flag,
            detail=output.compliance_reason or "No compliance issues found.",
        ),
    ]


async def run_vlm_judge(
    fixture: Fixture, brand_kit: BrandKit, memory_context: str
) -> tuple[list[ScoreCardDimension], str]:
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Add it to backend/.env before calling /generate or /eval/run."
        )

    model = ChatOpenAI(model="gpt-4o", temperature=0).with_structured_output(VlmJudgeOutput)

    messages = [
        SystemMessage(content=_SYSTEM_PROMPT),
        HumanMessage(content=_build_user_content(fixture, brand_kit, memory_context)),
    ]

    output: VlmJudgeOutput = await model.ainvoke(messages)
    return _map_to_dimensions(output), output.rationale
