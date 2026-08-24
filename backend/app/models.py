from typing import Literal, Optional

from pydantic import BaseModel


class BrandKit(BaseModel):
    brand_id: str
    name: str
    vertical: str
    languages: list[str]
    palette: list[str]
    tone_descriptors: list[str]
    audience: str


class MemoryEntry(BaseModel):
    id: str
    brand_id: str
    type: Literal["semantic", "procedural", "episodic"]
    key: str
    value: str
    confidence: Literal["high", "medium", "low"]
    source: Literal["brand_kit", "human_feedback", "brandguard_run", "seeded_history"]
    created_at: str


class KnownDefect(BaseModel):
    type: str
    severity: Literal["minor", "major"]
    description: str


class Fixture(BaseModel):
    id: str
    image_path: str
    caption_text: str
    intended_platform: Literal["instagram_reel", "instagram_post"]
    aspect_ratio: str
    # Illustrative only — labels which third-party generator plausibly
    # produced this asset (e.g. 'veo', 'kling', 'heygen'), since Scalio's
    # real pipeline likely composites several providers rather than one
    # in-house model. The evaluator deliberately never branches on this
    # field — see evaluators/vlm_judge.py for why.
    source_provider: str
    known_defect: Optional[KnownDefect] = None


class ScoreCardDimension(BaseModel):
    name: str
    method: Literal["deterministic", "vlm"]
    passed: bool
    detail: str
    score: Optional[float] = None


class ScoreCard(BaseModel):
    fixture_id: str
    brand_id: str
    dimensions: list[ScoreCardDimension]
    overall_rationale: str
    timestamp: str


class Decision(BaseModel):
    action: Literal["PASS", "AUTO_REPAIR", "REGENERATE", "ESCALATE", "BLOCK"]
    reason: str
    confidence: Literal["high", "medium", "low"]


class TraceEvent(BaseModel):
    step: int
    component: str
    input_summary: str
    output_summary: str
    latency_ms: float
    timestamp: str
