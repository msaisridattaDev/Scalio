"""Mocked video-generation provider tools for Phase 7's provider router.

No real Veo/Kling/HeyGen API calls happen here — each function returns a
fresh Fixture built from existing fixture data, clearly marked as a MOCK
with a one-line comment showing exactly where a real API call would go.
Everything downstream (BrandGuard's evaluate/decide pipeline, memory,
provider intelligence) only depends on the VideoGenerationResult shape,
so swapping a mock for a real call is a localized, low-risk change.
"""

from langchain_core.tools import tool
from pydantic import BaseModel

from app.fixtures import FIXTURES_BY_ID
from app.models import Fixture


class VideoGenerationRequest(BaseModel):
    content_type_hint: str
    brand_id: str


class VideoGenerationResult(BaseModel):
    provider: str
    fixture: Fixture


@tool
def generate_video_with_veo(request: VideoGenerationRequest) -> VideoGenerationResult:
    """Generate a video/image asset via Veo (MOCKED)."""
    # MOCK — replace this block with a real call to Veo's video generation
    # API; everything downstream (BrandGuard, memory, provider
    # intelligence) is unaffected by this swap because it only depends on
    # the VideoGenerationResult shape.
    base = FIXTURES_BY_ID["flawed-hand"]
    fixture = base.model_copy(update={"source_provider": "veo"})
    return VideoGenerationResult(provider="veo", fixture=fixture)


@tool
def generate_video_with_kling(request: VideoGenerationRequest) -> VideoGenerationResult:
    """Generate a video/image asset via Kling (MOCKED)."""
    # MOCK — replace this block with a real call to Kling's video
    # generation API; everything downstream (BrandGuard, memory, provider
    # intelligence) is unaffected by this swap because it only depends on
    # the VideoGenerationResult shape.
    # Deliberate demo simplification: the same underlying clean-good asset
    # stands in for a clean Kling output since we're not calling a real API.
    base = FIXTURES_BY_ID["clean-good"]
    fixture = base.model_copy(update={"source_provider": "kling"})
    return VideoGenerationResult(provider="kling", fixture=fixture)


@tool
def generate_video_with_heygen(request: VideoGenerationRequest) -> VideoGenerationResult:
    """Generate a video/image asset via HeyGen (MOCKED)."""
    # MOCK — replace this block with a real call to HeyGen's video
    # generation API; everything downstream (BrandGuard, memory, provider
    # intelligence) is unaffected by this swap because it only depends on
    # the VideoGenerationResult shape.
    base = FIXTURES_BY_ID["clean-good"]
    fixture = base.model_copy(update={"source_provider": "heygen"})
    return VideoGenerationResult(provider="heygen", fixture=fixture)


PROVIDER_TOOLS = {
    "veo": generate_video_with_veo,
    "kling": generate_video_with_kling,
    "heygen": generate_video_with_heygen,
}
