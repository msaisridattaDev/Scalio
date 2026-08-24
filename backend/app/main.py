import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal, Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

import openai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel

from app import defect_rules, memory, providers
from app.eval_harness import run_golden_set
from app.fixtures import DEMO_BRAND
from app.graph import run_brandguard, run_brandguard_routed, run_brandguard_stream
from app.models import MemoryEntry


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.environ.get("OPENAI_API_KEY"):
        logger.warning(
            "=" * 70
            + "\nOPENAI_API_KEY is not set. /generate and /eval/run will fail"
            " until it is added to backend/.env.\n"
            + "=" * 70
        )
    memory.seed_if_empty(DEMO_BRAND)
    providers.seed_provider_history()
    yield


app = FastAPI(title="BrandGuard", lifespan=lifespan)

_default_origins = "http://localhost:5173"
_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", _default_origins).split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/fixtures", StaticFiles(directory="../public/fixtures"), name="fixtures")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/brands/{brand_id}/memory")
def get_brand_memory(brand_id: str) -> list[MemoryEntry]:
    return memory.get_memory(brand_id)


class GenerateRequest(BaseModel):
    fixture_id: str


@app.post("/brands/{brand_id}/generate")
async def generate(brand_id: str, req: GenerateRequest) -> dict:
    try:
        return await run_brandguard(req.fixture_id, brand_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except openai.OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {exc}") from exc


@app.post("/brands/{brand_id}/generate/stream")
async def generate_stream(brand_id: str, req: GenerateRequest) -> StreamingResponse:
    # Real per-node streaming (NDJSON): each line is emitted the instant that
    # LangGraph node actually finishes executing, not replayed after the
    # fact. See app.graph.run_brandguard_on_fixture_stream.
    async def event_gen():
        try:
            async for event in run_brandguard_stream(req.fixture_id, brand_id):
                yield json.dumps(event, default=str) + "\n"
        except RuntimeError as exc:
            yield json.dumps({"error": str(exc), "error_type": "missing_key"}) + "\n"
        except openai.OpenAIError as exc:
            yield json.dumps({"error": str(exc), "error_type": "openai"}) + "\n"

    return StreamingResponse(event_gen(), media_type="application/x-ndjson")


class GenerateRoutedRequest(BaseModel):
    content_type_hint: str


@app.post("/brands/{brand_id}/generate-routed")
async def generate_routed(brand_id: str, req: GenerateRoutedRequest) -> dict:
    try:
        return await run_brandguard_routed(req.content_type_hint, brand_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except openai.OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {exc}") from exc


class FeedbackRequest(BaseModel):
    fixture_id: str
    verdict: Literal["accept", "reject"]
    # Raw defect_detection scorecard dimension detail (e.g.
    # "[severity:major] hand_distortion: ...") from the run being rejected.
    # The memory rule is generated FROM this real evaluator output — never
    # hardcoded to a fixture or picked from a fixed reason list.
    defect_detail: Optional[str] = None


@app.post("/brands/{brand_id}/feedback")
def feedback(brand_id: str, req: FeedbackRequest) -> dict:
    if req.verdict != "reject" or not req.defect_detail:
        return {"written": False}

    defect_type, description = defect_rules.extract_defect_type_and_description(req.defect_detail)
    rule_text = defect_rules.memory_rule_for(defect_type, description)

    entry = MemoryEntry(
        id=str(uuid.uuid4()),
        brand_id=brand_id,
        type="procedural",
        key=f"avoid_{defect_type}",
        value=rule_text,
        confidence="high",
        source="human_feedback",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    memory.write_memory(entry)
    return {"written": True, "entry": entry}


@app.get("/eval/run")
async def eval_run() -> dict:
    try:
        results, agreement_pct = await run_golden_set()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except openai.OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {exc}") from exc
    return {
        "label": f"Demo evaluation set — N={len(results)} hand-labeled cases. Not a production benchmark.",
        "agreement_pct": agreement_pct,
        "results": results,
    }
