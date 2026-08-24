# BrandGuard — 4-Hour Build Playbook (FastAPI + LangGraph + LangChain)
**v2 — supersedes the earlier TypeScript/Netlify-only version. Open this beside VS Code.**

**Why this stack:** FastAPI, LangGraph, LangChain, Pydantic, and SQLAlchemy are already on your resume from achieve.ai. Building the demo in this exact stack means the demo doesn't just prove "can build agents" — it proves direct, provable continuity with production work you've already shipped. Lead with that when you present it.

---

## 0. Four-Hour Strategy

**Total phases: 6**, same shape as before, budgets adjusted for standing up two processes (FastAPI backend + React frontend) instead of one static app.

| Phase | Name | Minutes | Running total |
|---|---|---|---|
| 1 | Foundation: FastAPI + React scaffold, Pydantic models, fixtures | 35 | 0:35 |
| 2 | Brand Context & Memory (SQLAlchemy/SQLite) | 25 | 1:00 |
| 3 | Hybrid Evaluation: LangChain tools + VLM judge | 45 | 1:45 |
| 4 | LangGraph Orchestrator + Decision Routing + Golden-Set Eval | 40 | 2:25 |
| 5 | Repair/Regenerate Nodes + Feedback → Memory Update | 45 | 3:10 |
| 6 | Tracing (LangSmith) + Scalio-Styled UI + Polish | 40 | 3:50 |
| — | Buffer / rehearsal | 10 | 4:00 |
| 7 (optional) | Provider Router — Closed-Loop Selection | ~38 | 4:38 (stretch) |

**Phase 7 is deliberately outside the hard 4-hour core, and its budget is honest, not padded.** Closing the loop for real — a router that consumes stored provider intelligence and changes an actual tool call — costs more than a passive leaderboard would. It's only worth that cost because it's the highest-leverage "founding engineer, not just AI engineer" signal available, and because it's demonstrated against clearly-labeled seeded historical data rather than a statistically thin live-learning claim. If there's no time left, the fallback is one spoken sentence, not a broken half-built router.

**Locked architecture:**
- **Backend:** FastAPI (Python), run via `uvicorn app.main:app --reload --port 8000`. Pydantic models for every data shape. SQLite via SQLAlchemy (or SQLModel, if Claude Code prefers it — it reduces boilerplate by merging Pydantic + SQLAlchemy) for persistence.
- **Agent orchestration:** LangGraph `StateGraph`. Nodes: `load_context → evaluate → decide`, then conditional edges to `repair` / `regenerate` / straight-to-`END` based on `decision.action`.
- **Evaluators:** LangChain `@tool`-decorated functions — rule checks (deterministic) and the VLM judge (LangChain `ChatAnthropic`/`ChatOpenAI` with multimodal input + structured output via a Pydantic schema). Called directly from the `evaluate` node (we always want both to run, so this is deterministic tool invocation, not open-ended ReAct tool selection — a deliberate, explainable choice).
- **Tracing:** set `LANGCHAIN_TRACING_V2=true` + `LANGCHAIN_API_KEY` (LangSmith) — LangChain/LangGraph auto-trace every node and LLM call with zero extra code. Keep a lightweight custom trace panel in the UI for the live click-through, and treat the real LangSmith dashboard as a bonus "here's the actual trace" credibility moment.
- **Frontend:** React + Vite SPA, same as before, now calling FastAPI REST endpoints instead of a Netlify function.
- **Demo hosting:** run both processes locally for the live demo (`uvicorn` + `npm run dev`). Deploying FastAPI (Railway/Render, one-click) and the frontend (Netlify) is an optional stretch goal only if Phase 6 finishes early — do not let it eat core budget.

**What's still deliberately cut (unchanged from v1):**
- Real Scalio image/video generation (mocked via fixtures)
- A real OCR library (folded into the VLM judge's structured output)
- A specialized fine-tuned defect detector (the VLM stands in, interface documented as swappable)
- Docker/Redis/multi-service infra
- Multi-tenant auth, multi-brand switching UI (one demo brand: **Priya Sarees**)
- CI regression pipeline, post-publish performance memory, a full India-compliance module

**Final MVP definition:** unchanged from v1 — one brand, one guided flow, a real hybrid evaluation, a LangGraph-routed decision engine reaching all five actions, one real repair cycle and one real regenerate cycle, a human-feedback action that writes SQLite-backed memory, and a second generation whose decision is provably changed by that memory. Plus a small honestly-labeled golden-set harness and real LangSmith tracing.

---

## Phase 1 — Foundation: FastAPI + React Scaffold, Pydantic Models, Fixtures
**Budget: 35 min**

### Objective
Stand up both processes, define every shared data shape as a Pydantic model, and produce the three fixture images with known defect metadata.

### Scope
- FastAPI app skeleton with CORS enabled for the local React dev server
- Pydantic models for every shared type
- Vite + React + TS frontend skeleton (unchanged from v1's Phase 1 UI shell)
- 3 fixture images with metadata

### Explicitly NOT in scope
- Any database, evaluation, or LangGraph logic yet
- Styling/theming (Phase 6)
- Deployment — local only for now

### Architecture
```
[FastAPI app, port 8000] <──CORS-enabled fetch── [React dev server, port 5173]
```
Nothing downstream exists yet; this phase is pure scaffolding.

### Files/components to create
```
backend/
  app/
    __init__.py
    main.py              (FastAPI app, CORS, a GET /health route)
    models.py            (all Pydantic models)
    fixtures.py          (DEMO_BRAND + 3 fixtures, as Python data)
  requirements.txt        (fastapi, uvicorn, langchain, langgraph,
                            langchain-anthropic or langchain-openai,
                            sqlalchemy, pydantic)
frontend/
  (vite + react + ts scaffold, same shape as v1)
  src/App.tsx              (placeholder page fetching GET /health and
                             rendering the 3 fixture images)
public/fixtures/
  flawed-hand.png
  flawed-text.png
  clean-good.png
```

### Exact Claude Prompt
```
Set up a two-process project: a Python FastAPI backend in ./backend and a
Vite + React + TypeScript frontend in ./frontend.

BACKEND:
Create backend/requirements.txt with: fastapi, uvicorn[standard],
langchain, langgraph, langchain-anthropic (or langchain-openai if that's
the provider we'll use — pick one and be consistent throughout),
sqlalchemy, pydantic, python-dotenv, python-multipart.

Create backend/app/models.py with these Pydantic models (BaseModel):
- BrandKit: brand_id: str; name: str; vertical: str; languages: list[str];
  palette: list[str]; tone_descriptors: list[str]; audience: str
- MemoryEntry: id: str; brand_id: str;
  type: Literal['semantic','procedural','episodic']; key: str; value: str;
  confidence: Literal['high','medium','low'];
  source: Literal['brand_kit','human_feedback']; created_at: str
- Fixture: id: str; image_path: str; caption_text: str;
  intended_platform: Literal['instagram_reel','instagram_post'];
  aspect_ratio: str; source_provider: str;  # illustrative only — e.g.
  'veo', 'kling', 'heygen' — labels which third-party generator
  plausibly produced this asset, since Scalio's real pipeline likely
  composites several providers rather than one in-house model
  known_defect: dict | None   # {type, severity, description}
- ScoreCardDimension: name: str; method: Literal['deterministic','vlm'];
  passed: bool; detail: str; score: float | None = None
- ScoreCard: fixture_id: str; brand_id: str;
  dimensions: list[ScoreCardDimension]; overall_rationale: str;
  timestamp: str
- Decision: action: Literal['PASS','AUTO_REPAIR','REGENERATE','ESCALATE','BLOCK'];
  reason: str; confidence: Literal['high','medium','low']
- TraceEvent: step: int; component: str; input_summary: str;
  output_summary: str; latency_ms: float; timestamp: str

Create backend/app/fixtures.py:
- DEMO_BRAND: a BrandKit for "Priya Sarees", a saree/fashion boutique in
  Jaipur, languages ['hi','en'], a warm festive palette (3-4 plausible
  hex colors), tone_descriptors ['warm','traditional','trustworthy'],
  audience "Indian women 25-45 shopping for festive and wedding sarees"
- Three Fixture objects (same as the v1 plan, now with an illustrative
  source_provider label each, since Scalio's product likely composites
  more than one third-party generator — Veo/Kling/Seedance for video,
  HeyGen for the AI Actor avatar, per public tooling signals):
  1. id "flawed-hand", image_path "/fixtures/flawed-hand.png", a
     plausible Hindi+English caption, intended_platform
     "instagram_reel", aspect_ratio "9:16", source_provider "veo",
     known_defect {type: 'hand_distortion', severity: 'minor', description: 'malformed
     hand visible in close-up product shot'}
  2. id "flawed-text", image_path "/fixtures/flawed-text.png", a
     caption, intended_platform "instagram_post", aspect_ratio "1:1",
     source_provider "kling", known_defect {type: 'text_garbled', severity: 'major', description:
     'overlaid offer text is garbled/illegible'}
  3. id "clean-good", image_path "/fixtures/clean-good.png", a caption
     in Hindi and English, intended_platform "instagram_post",
     aspect_ratio "1:1", source_provider "heygen", known_defect: null

Create backend/app/main.py: a FastAPI() app with CORSMiddleware allowing
http://localhost:5173, and a GET /health route returning {"status":"ok"}.
Serve /fixtures/* as static files from ../public/fixtures (mount via
StaticFiles) so the frontend can load fixture images directly from the
backend, OR alternatively just put the fixture images in
frontend/public/fixtures/ and let Vite serve them directly — pick
whichever is simpler and be consistent.

For the actual fixture images: same approach as before — if any
text-to-image generation tool is available in this environment, use it
to generate two images likely to show a hand-distortion artifact (a
prompt like "close-up photo of a hand holding a gold bangle, festive
background, photorealistic" often produces distorted hands in many
generative models — regenerate if needed until you get a visible defect,
don't fake it) and one clean product/lifestyle photo. For the
flawed-text fixture, generate or composite an image with a garbled/
illegible text overlay. If no image-gen tool is available, source small,
clearly-licensed example images illustrating the well-documented AI
hand-distortion failure mode and note in a code comment that they are
illustrative examples.

FRONTEND:
Scaffold Vite + React + TypeScript in ./frontend. Build a placeholder
App.tsx that on load calls fetch('http://localhost:8000/health') and
renders the result, plus renders the three fixture images with captions
underneath as plain <img> tags, to confirm both processes are wired
together.

Confirm: `uvicorn app.main:app --reload --port 8000` (run from ./backend)
starts cleanly, and `npm run dev` (run from ./frontend) starts cleanly
and successfully fetches /health from the backend.
```

### Expected Output
Both dev servers running; the React app shows "ok" from the health check plus the three fixture images.

### Verification Checklist
- [ ] `pip install -r requirements.txt` succeeds
- [ ] `uvicorn app.main:app --reload --port 8000` starts with no errors
- [ ] `npm install && npm run dev` starts with no errors
- [ ] The frontend successfully fetches `/health` and shows `{"status":"ok"}`
- [ ] All 3 fixture images render in the browser
- [ ] Each `Fixture` includes a `source_provider` label
- [ ] `models.py` has zero import/type errors

### Stop Condition
Both servers are running and the frontend shows the health check + 3 images. Stop — do not add any more logic yet. Move to Phase 2.

---

## Phase 2 — Brand Context & Memory (SQLAlchemy/SQLite)
**Budget: 25 min**

### Objective
A real, persistent, server-side memory store with one seeded entry and an endpoint to read it.

### Scope
- SQLAlchemy models + SQLite engine
- `POST`/seed logic for one initial memory entry
- `GET /brands/{brand_id}/memory` endpoint
- A memory-context formatter used later by the VLM prompt
- A minimal `MemoryPanel` on the frontend reading from that endpoint

### Explicitly NOT in scope
- Writing new memory entries from feedback (Phase 5)
- Multi-brand support

### Architecture
```
FastAPI startup ──> seed_if_empty(DEMO_BRAND) ──> SQLite (memory.db)
GET /brands/{id}/memory ──> query SQLite ──> [MemoryEntry, ...] ──> frontend MemoryPanel
```

### Files/components to create
```
backend/app/db.py            (SQLAlchemy engine/session, SQLite file)
backend/app/memory.py         (MemoryEntry ORM model, get_memory,
                                write_memory, get_memory_context_string,
                                seed_if_empty)
backend/app/main.py           (extend: GET /brands/{brand_id}/memory)
frontend/src/components/MemoryPanel.tsx
```

### Exact Claude Prompt
```
Add persistent, server-side brand memory using SQLAlchemy + SQLite.

backend/app/db.py: set up a SQLAlchemy engine pointed at a local file
`brandguard.db`, a declarative Base, and a session factory/dependency
suitable for FastAPI (e.g. a get_db() generator for Depends()).

backend/app/memory.py:
- A SQLAlchemy ORM model MemoryEntryORM mirroring the MemoryEntry
  Pydantic model from models.py (id, brand_id, type, key, value,
  confidence, source, created_at).
- get_memory(db, brand_id: str) -> list[MemoryEntry]: query all entries
  for a brand, return as Pydantic MemoryEntry objects.
- write_memory(db, entry: MemoryEntry) -> None: insert a new row
  (generate id/created_at if not provided).
- get_memory_context_string(db, brand_id: str) -> str: format all
  entries into a short readable paragraph for LLM prompting, e.g.
  "Known brand preferences: Hindi and English captions required (source:
  brand kit, confidence: high). Known constraints: none yet." Group
  'semantic' entries under preferences and 'procedural' entries under
  constraints.
- seed_if_empty(db, brand_kit: BrandKit) -> None: if get_memory returns
  empty for that brand, write one MemoryEntry: type 'semantic', key
  'caption_language', value the brand's languages joined as a readable
  string (e.g. "Hindi and English"), confidence 'high', source
  'brand_kit'.

In main.py: on FastAPI startup (an @app.on_event("startup") handler or
lifespan), call Base.metadata.create_all and seed_if_empty(DEMO_BRAND).
Add a route GET /brands/{brand_id}/memory returning get_memory(db,
brand_id) as JSON.

Frontend: create src/components/MemoryPanel.tsx that fetches
GET http://localhost:8000/brands/priya-sarees/memory (use whatever
brand_id you assigned DEMO_BRAND) and renders each entry as a small
card: key, value, a confidence badge (high=green, medium=amber,
low=gray), and a source label. Render it under the fixture images in
App.tsx.

Verify: restart the backend process and confirm the seeded entry is
still there on the next GET (proving it's in SQLite, not memory) — check
by inspecting brandguard.db with a SQLite browser or `sqlite3
brandguard.db "select * from memory_entries;"`.
```

### Expected Output
A visible memory card fetched from a real FastAPI endpoint, backed by SQLite, surviving a backend restart.

### Verification Checklist
- [ ] `brandguard.db` file exists after first run
- [ ] The seeded entry is present via `sqlite3 brandguard.db "select * from memory_entries;"`
- [ ] Restarting `uvicorn` does not lose the entry (proves real persistence, not in-memory)
- [ ] `GET /brands/{brand_id}/memory` returns valid JSON matching `MemoryEntry`
- [ ] `get_memory_context_string()` returns a plain sentence, not raw JSON
- [ ] `MemoryPanel` renders at least one card

### Stop Condition
One memory card is visible in the frontend, sourced from a real SQLite-backed endpoint, and survives a backend restart. Stop — do not build the write path yet. Move to Phase 3.

---

## Phase 3 — Hybrid Evaluation: LangChain Tools + VLM Judge
**Budget: 45 min — the largest phase**

### Objective
Real evaluators built as LangChain tools: deterministic rule checks plus one real multimodal LLM call with structured output, merged into a `ScoreCard`.

### Scope
- Rule checks as LangChain `@tool` functions (zero LLM calls)
- The VLM judge as a LangChain `@tool` function wrapping a multimodal chat model call with a Pydantic-schema structured output
- A merge function producing the final `ScoreCard`
- A temporary `POST /evaluate` test route to prove it works end to end

### Explicitly NOT in scope
- A real OCR library — folded into the VLM judge's structured output
- A specialized/fine-tuned defect detector — the VLM stands in
- LangGraph orchestration (Phase 4) — this phase only builds the tools themselves
- Any UI polish

**Document this simplification explicitly in code comments**, same as v1: defect detection, text-rendering checks, and brand-fit judging are consolidated into one structured vision-LLM call for time; the rule checks remain genuinely separate and deterministic.

**Also document, deliberately, why the evaluator never branches on `source_provider`:** it evaluates the delivered *asset*, not which generator produced it. This is intentional — Scalio's product likely composites multiple third-party generators (Veo/Kling/Seedance for video, HeyGen for the AI Actor avatar), each with different failure modes the team doesn't control upstream. A gate that only worked for one provider would break the moment they add or swap a generator; this one doesn't care.

### Architecture
```
Fixture + BrandKit + memory_context_string
        │
        ├──> rule_checks_tool (LangChain @tool, sync, no network) ──> ScoreCardDimension[]
        │
        └──> vlm_judge_tool (LangChain @tool, async) ──> ChatAnthropic/ChatOpenAI
                                                          (multimodal input,
                                                           .with_structured_output)
                                                                │
                                                     VlmJudgeOutput (Pydantic)
                                                                │
                                                     ──> ScoreCardDimension[]
        │
        ▼
   merge ──> ScoreCard
```

### Files/components to create
```
backend/app/evaluators/rule_checks.py
backend/app/evaluators/vlm_judge.py
backend/app/evaluators/pipeline.py
backend/app/main.py   (extend: POST /evaluate test route)
```

### Exact Claude Prompt
```
Build the hybrid evaluation pipeline using LangChain tools.

1. backend/app/evaluators/rule_checks.py
   Using LangChain's @tool decorator (from langchain_core.tools import
   tool), define a function `run_rule_checks(fixture: Fixture, brand_kit:
   BrandKit, memory_context: str) -> list[ScoreCardDimension]` that is
   itself a plain Python function (not necessarily wrapped in @tool
   directly, since it returns a structured list — but implement it in
   the same module and structure it so it could be exposed as a tool if
   the agent needed to call it individually). It should run three
   deterministic checks, each producing one ScoreCardDimension with
   method='deterministic':
   a) "caption_language" — if 'hi' in brand_kit.languages, check
      fixture.caption_text contains at least one Devanagari character
      (unicode range U+0900-U+097F) AND at least one Latin letter; pass
      only if both present.
   b) "format_compliance" — a dict lookup {'instagram_reel': '9:16',
      'instagram_post': '1:1'}; check fixture.aspect_ratio matches the
      expected ratio for fixture.intended_platform.
   c) "banned_word_scan" — a hardcoded list of 5-6 risky phrases (e.g.
      "guaranteed cure", "100% risk-free", "best in the world"); check
      fixture.caption_text doesn't contain any (case-insensitive).

2. backend/app/evaluators/vlm_judge.py
   Define a Pydantic model VlmJudgeOutput with fields: defect_detected:
   bool; defect_type: str | None; defect_severity: Literal['minor',
   'major'] | None; defect_description: str; text_legible: bool;
   detected_text: str | None; brand_visual_match: float (1-5);
   brand_tone_match: float (1-5); compliance_flag: bool;
   compliance_reason: str | None; rationale: str.

   Define async function `run_vlm_judge(fixture: Fixture, brand_kit:
   BrandKit, memory_context: str) -> list[ScoreCardDimension]`:
   - Instantiate a multimodal chat model (ChatAnthropic with a
     vision-capable model, or ChatOpenAI with gpt-4o — pick one
     consistent with Phase 1's requirements.txt choice) via
     `.with_structured_output(VlmJudgeOutput)`.
   - Build a multimodal HumanMessage containing the fixture image
     (read the image file and base64-encode it, or pass its local path/
     URL depending on the provider's expected input format) plus a text
     block with brand_kit summary, memory_context, and
     fixture.caption_text.
   - System prompt must instruct: return a structured judgment; if the
     brand's known constraints (from memory_context) mention avoiding a
     specific visual element and this image contains it, treat that as
     a defect (raise defect_detected, lower brand_visual_match) even if
     the image is otherwise well-formed — brand memory constraints
     override general quality judgment.
   - Invoke the model, get a VlmJudgeOutput, map it into 5
     ScoreCardDimension entries (method='vlm'): defect_detection,
     text_rendering, brand_visual_match, brand_tone_match, compliance —
     each with passed/detail/score derived from the relevant fields.
   - Wrap the call so defect_severity is retrievable later (attach it to
     the defect_detection dimension's `detail` string, or keep a
     side-channel — the decision engine in Phase 4 needs severity, so
     make sure it's not lost in the mapping).

3. backend/app/evaluators/pipeline.py
   async function `run_evaluation_pipeline(fixture, brand_kit, db,
   brand_id) -> ScoreCard`: build memory_context via
   memory.get_memory_context_string(db, brand_id), run
   run_rule_checks (sync) and run_vlm_judge (async) — use
   asyncio.gather or run rule checks first (they're instant) then await
   the VLM call — merge both dimension lists, and build a ScoreCard with
   an overall_rationale (reuse the VLM's rationale, prefixed with a note
   if any rule check failed).

4. In main.py, add a temporary POST /evaluate route accepting
   {fixture_id, brand_id}, looking up the fixture from fixtures.py,
   calling run_evaluation_pipeline, and returning the ScoreCard as JSON
   — this is a functional test route, not the final API shape (Phase 4
   replaces it with the real orchestrator route).

Set the LLM API key via a .env file in backend/ (ANTHROPIC_API_KEY or
OPENAI_API_KEY, matching whichever provider you chose), loaded via
python-dotenv at startup.
```

### Expected Output
`POST /evaluate` with `{"fixture_id": "flawed-hand", "brand_id": "priya-sarees"}` returns a real ScoreCard with 8 dimensions (3 rule + 5 VLM), reflecting an actual detected hand defect.

### Verification Checklist
- [ ] `run_rule_checks` returns 3 dimensions with zero network calls
- [ ] `run_vlm_judge` returns a valid `VlmJudgeOutput` (test directly via a small script or the `/evaluate` route)
- [ ] Calling `/evaluate` on `flawed-hand` returns `defect_detected: true` with a hand-related `defect_type`
- [ ] Calling `/evaluate` on `clean-good` returns `defect_detected: false`
- [ ] The merged ScoreCard has 8 total dimensions
- [ ] No unhandled exceptions in the FastAPI logs

### Stop Condition
You've called `/evaluate` on at least two different fixtures (via curl, the FastAPI `/docs` Swagger UI, or a quick script) and gotten visibly different, sensible ScoreCards back. Stop tuning the prompt further — move to Phase 4.

---

## Phase 4 — LangGraph Orchestrator + Decision Routing + Golden-Set Eval
**Budget: 40 min**

### Objective
Wire the evaluation pipeline and a decision policy into a real LangGraph `StateGraph`, and prove the routing logic against a small golden set.

### Scope
- `decide()` — pure decision policy function
- A LangGraph `StateGraph` with nodes `load_context`, `evaluate`, `decide`, and conditional routing (repair/regenerate nodes are stubbed as pass-through for now — Phase 5 fills them in)
- `eval/golden_set.json` + a script/route running it through the graph
- Replace the temporary `/evaluate` route with the real `POST /brands/{brand_id}/generate` route calling the graph

### Explicitly NOT in scope
- Actually executing repair/regenerate logic (Phase 5) — this phase gets the graph *routing* correctly to stub nodes, not doing the real work yet
- Any UI styling

### Architecture
```
LangGraph StateGraph:

START ──> load_context ──> evaluate ──> decide ──[conditional edge on decision.action]──┬─> repair (stub) ──> END
                                                                                          ├─> regenerate (stub) ──> END
                                                                                          └─> END   (PASS / ESCALATE / BLOCK)
```
State object carries: fixture_id, brand_id, brand_kit, memory_context, scorecard, decision, trace (list of TraceEvent), attempt count.

### Files/components to create
```
backend/app/graph.py           (StateGraph definition, BrandGuardState)
backend/app/decision.py         (decide() policy function)
backend/app/main.py             (replace /evaluate with POST /brands/{brand_id}/generate)
eval/golden_set.json
backend/app/eval_harness.py     (loads golden_set.json, runs the graph
                                  for each case, compares actual vs
                                  expected)
backend/app/main.py             (extend: GET /eval/run route)
```

### Exact Claude Prompt
```
1. backend/app/decision.py
   Export function decide(scorecard: ScoreCard) -> Decision implementing
   this exact priority-ordered policy over scorecard.dimensions (find
   dimensions by name):
   a) If the "compliance" dimension has passed=False → action 'BLOCK',
      reason quoting its detail/compliance_reason.
   b) Else if "defect_detection" passed=False AND its associated
      severity (recover this from wherever Phase 3 stored it — e.g.
      parsed out of the dimension's detail string, or a dedicated field)
      is 'minor' → action 'AUTO_REPAIR', reason naming the specific
      defect.
   c) Else if "defect_detection" passed=False AND severity is 'major' →
      action 'REGENERATE', reason naming the specific defect.
   d) Else if "brand_visual_match" score < 3 OR "brand_tone_match" score
      < 3 with no hard defect → action 'ESCALATE', reason naming which
      brand-fit dimension was weak.
   e) Else → action 'PASS', reason "All checks passed: no defects,
      brand-fit scores acceptable."
   The reason string must always be specific, referencing the actual
   dimension(s) involved — never generic filler.

2. backend/app/graph.py
   Define a TypedDict or Pydantic model BrandGuardState with fields:
   fixture_id: str; brand_id: str; brand_kit: dict; memory_context: str;
   scorecard: dict | None; decision: dict | None; trace: list[dict];
   attempt: int (default 0).

   Using langgraph.graph.StateGraph, define these nodes (each a function
   taking and returning the state, appending one TraceEvent to
   state['trace'] with component name, a short input/output summary, and
   measured latency_ms):
   - load_context: loads brand_kit from fixtures.DEMO_BRAND and
     memory_context via memory.get_memory_context_string; sets both on
     state.
   - evaluate: calls run_evaluation_pipeline (from Phase 3) with the
     fixture looked up by fixture_id; sets state['scorecard'].
   - decide: calls decision.decide(scorecard); sets state['decision'].
   - repair: a STUB for now — just append a trace event
     "repair_stub_called" and pass state through unchanged (Phase 5
     implements the real logic).
   - regenerate: same stub pattern as repair.

   Wire edges: START -> load_context -> evaluate -> decide. From
   "decide", use add_conditional_edges with a routing function reading
   state['decision']['action']: if 'AUTO_REPAIR' -> "repair"; if
   'REGENERATE' -> "regenerate"; otherwise (PASS/ESCALATE/BLOCK) ->
   END. From "repair" -> END and from "regenerate" -> END (Phase 5 will
   extend these).

   Compile the graph and export a function
   `async def run_brandguard(fixture_id: str, brand_id: str, db) ->
   BrandGuardState` that builds the initial state and invokes the
   compiled graph (graph.ainvoke(...)), returning the final state.

3. In main.py: remove/replace the temporary /evaluate route with
   POST /brands/{brand_id}/generate accepting {fixture_id}, calling
   graph.run_brandguard, and returning the final state as JSON.

4. eval/golden_set.json: an array of 6-8 objects: {id, fixture_id,
   brand_id, expected_decision, note}. Include at minimum:
   - flawed-hand, priya-sarees, expected_decision "AUTO_REPAIR"
   - flawed-text, priya-sarees, expected_decision "REGENERATE"
   - clean-good, priya-sarees, expected_decision "PASS"
   - 2-3 more cases you construct by reasoning about edge cases (e.g. a
     case you'd expect ESCALATE due to borderline brand-fit scores),
     each with a short "note" explaining your reasoning since these are
     hand-labeled judgment calls.

5. backend/app/eval_harness.py: a function run_golden_set(db) that loads
   golden_set.json, calls run_brandguard for each case, compares
   final_state['decision']['action'] to expected_decision, and returns a
   list of results plus a computed agreement percentage (never
   hardcoded). Add GET /eval/run in main.py returning this as JSON, with
   a "label" field explicitly stating "Demo evaluation set — N=8
   hand-labeled cases. Not a production benchmark."
```

### Expected Output
`POST /brands/priya-sarees/generate` with a fixture_id returns a full graph run (scorecard, decision, trace) via LangGraph. `GET /eval/run` returns real pass/fail results and a genuinely computed agreement percentage.

### Verification Checklist
- [ ] The graph compiles with no errors (`langgraph` import succeeds, `.compile()` doesn't throw)
- [ ] `decide()` correctly implements all 5 branches (spot-check manually)
- [ ] `POST /brands/{id}/generate` returns a state with `trace` containing at least 3 events with real (non-zero) `latency_ms`
- [ ] Conditional routing actually reaches the `repair` stub for the flawed-hand fixture and the `regenerate` stub for flawed-text (verify via the trace log)
- [ ] `GET /eval/run` returns a real table of results and a computed (not hardcoded) agreement percentage
- [ ] The "not a production benchmark" label is present in the response

### Stop Condition
`/eval/run` returns real results with a genuine agreement percentage, and you've confirmed via the trace that routing correctly reaches the repair/regenerate stubs. Stop — do not implement the real repair/regenerate logic yet, that's Phase 5. Do not try to push the agreement percentage higher by tuning prompts.

---

## Phase 5 — Repair/Regenerate Nodes + Feedback → Memory Update
**Budget: 45 min — contains the single most important checkpoint in the build**

### Objective
Fill in the real `repair` and `regenerate` graph nodes (re-evaluate after acting, cap at one attempt), and wire a feedback endpoint that writes memory and **measurably changes a later graph run's decision for the same brand**.

### Scope
- Real `repair` and `regenerate` node logic, each followed by a re-evaluation and re-decision inside the graph, looping back through `evaluate → decide` once (not indefinitely)
- `POST /brands/{brand_id}/feedback` writing a new `MemoryEntry`
- Live verification that memory changes a subsequent `/generate` call's outcome

### Explicitly NOT in scope
- A second live image-generation call for regenerate (attempt only as a stretch if Phase 1's image tool is already wired and time allows — a pre-staged fixture swap is fully acceptable)
- More than one repair/regenerate attempt per run — hard cap via `state['attempt']`
- Feedback UI polish (Phase 6)

### Architecture
```
... -> decide -[AUTO_REPAIR]-> repair -> evaluate (attempt=1, re-run) -> decide (attempt=1) -> END
       decide -[REGENERATE]--> regenerate -> evaluate (attempt=1, re-run) -> decide (attempt=1) -> END
       decide (attempt=1, still failing) -> END  (no further loop — surface honestly)

POST /brands/{id}/feedback {fixture_id, verdict, reason_label}
   -> memory.write_memory(new MemoryEntry, source='human_feedback')
   -> next POST /brands/{id}/generate call for the same brand now
      includes this constraint in memory_context -> passed into
      vlm_judge's prompt -> decision changes   [THE PROOF POINT]
```

### Files/components to create
```
backend/app/actions/repair.py
backend/app/actions/regenerate.py
backend/app/main.py            (extend: POST /brands/{brand_id}/feedback)
backend/app/graph.py            (extend: real repair/regenerate node
                                  logic, loop-back edges to evaluate/
                                  decide gated by attempt count)
public/fixtures/ (or frontend/public/fixtures/)
   repaired-hand.png            (optional — may reuse clean-good.png)
```

### Exact Claude Prompt
```
1. backend/app/actions/repair.py
   async function apply_repair(fixture: Fixture) -> Fixture: for this
   demo, "repair" swaps the flawed fixture for a pre-staged corrected
   version. If you don't have a distinct repaired image, reuse
   clean-good.png's image path as a plausible stand-in, but return a NEW
   Fixture object (same id, image_path pointing at the repaired image,
   known_defect set to None) rather than mutating the original. Add a
   comment: "Simulated repair swap for demo purposes — production would
   call an inpainting API scoped to the flagged defect region."

2. backend/app/actions/regenerate.py
   async function apply_regenerate(fixture: Fixture, memory_context:
   str) -> Fixture: compose an "improved prompt" string — the fixture's
   original intent plus explicit constraints derived from
   memory_context (e.g. append ", no visible human hands, bilingual
   Hindi and English caption text, clearly legible"). Log this composed
   prompt. IF a text-to-image tool is already wired from Phase 1 AND
   time allows, actually call it with the improved prompt and use the
   new image. OTHERWISE, fall back to swapping in clean-good.png as the
   "regenerated" result. Comment which path was taken.

3. Extend backend/app/graph.py:
   - Replace the repair stub: call apply_repair(fixture), update
     state's fixture reference, increment state['attempt'], append a
     trace event, then route to "evaluate" again (add a real edge
     repair -> evaluate) instead of straight to END.
   - Same pattern for regenerate -> evaluate.
   - In the "decide" node's conditional routing function, add a guard:
     if state['attempt'] >= 1, always route to END regardless of the
     new decision's action (no second repair/regenerate attempt) — just
     let the final decision stand, even if it's still not PASS. Surface
     this honestly rather than looping.
   - This means the full path for a first-time defect is:
     load_context -> evaluate -> decide -> repair/regenerate ->
     evaluate (attempt=1) -> decide (attempt=1, routes to END no matter
     what) -> END. Confirm this terminates correctly with no infinite
     loop risk.

4. In main.py, add POST /brands/{brand_id}/feedback accepting
   {fixture_id, verdict: 'accept'|'reject', reason_label: str | None}.
   On 'reject' with a reason_label (support at least: "Don't like:
   visible hands", "Wrong tone", "Wrong colors"), construct and write a
   new MemoryEntry via memory.write_memory: type 'procedural', key
   derived from the label (e.g. 'avoid_visible_hands'), value 'avoid',
   confidence 'high', source 'human_feedback'.

5. CRITICAL VERIFICATION STEP — do this manually against the running
   backend (via curl, /docs, or a quick script) before moving on:
   a. Call /brands/priya-sarees/generate on a fixture that does NOT
      currently register a hand defect but whose image plausibly
      contains a visible hand (check which fixture qualifies, or note
      the limitation if none do).
   b. Call /brands/priya-sarees/feedback with verdict 'reject',
      reason_label "Don't like: visible hands".
   c. Confirm GET /brands/priya-sarees/memory now shows the new
      procedural entry.
   d. Call /brands/priya-sarees/generate AGAIN on a DIFFERENT fixture
      for the same brand that also contains a visible hand.
   e. Confirm the returned decision or the VLM's rationale text now
      explicitly reflects the new constraint (e.g. it now escalates or
      flags the hand where it might not have before), because
      memory_context sent to vlm_judge now includes "avoid visible
      hands".
   If step (e) shows no visible change, strengthen the vlm_judge system
   prompt from Phase 3 to weight memory constraints more heavily, and
   re-test until the change is clearly observable.
```

### Expected Output
- `flawed-hand`, run end to end, reaches `PASS` after one repair cycle.
- `flawed-text`, run end to end, reaches `PASS` (or a clearly explained next state) after one regenerate cycle.
- Rejecting a generation writes a real memory entry.
- A second generation for the same brand, after that rejection, shows a decision/rationale visibly changed by the new memory constraint.

### Verification Checklist
- [ ] AUTO_REPAIR path reaches `PASS` after exactly one repair + re-evaluate cycle
- [ ] REGENERATE path reaches a sensible final state after exactly one regenerate + re-evaluate cycle
- [ ] The graph never loops more than once — confirmed by reading the `attempt`-gated routing logic
- [ ] `POST /feedback` with a reject verdict writes a new `MemoryEntry`, visible via `GET /memory`
- [ ] **A second `/generate` call on a different fixture for the same brand, after that rejection, shows a decision/rationale visibly shaped by the new memory constraint — confirmed by direct observation**
- [ ] Trace captures every step including the repair/regenerate cycle

### Stop Condition
You have personally watched, via API calls, memory change a decision for a second generation, live. Stop iterating on this phase the moment that works reliably once — this is the load-bearing proof point of the whole build. Move to Phase 6.

---

## Phase 6 — Tracing (LangSmith) + Scalio-Styled UI + Polish
**Budget: 40 min**

### Objective
Enable real LangSmith tracing with near-zero extra code, and assemble the frontend into one guided, Scalio-styled flow that IS the 90-second demo.

### Scope
- LangSmith env-var tracing (near-free win)
- A lightweight custom `TracePanel` in the UI reading the graph's returned `trace` array (for the live click-through — LangSmith's own dashboard is a separate, bonus artifact to show if time allows)
- `ScorecardView`, `DecisionBadge`, `MemoryPanel` (styled), `FeedbackControls`
- `DemoStepper` wiring the frontend into the exact 7-step sequence
- Final cleanup pass

### Explicitly NOT in scope
- Multi-brand switching
- Any new backend logic — this phase is wiring + presentation only
- Pixel-perfect Scalio cloning

### Architecture
```
Backend (unchanged) ──REST──> React SPA ──> DemoStepper walks through
Steps 1-7, calling /generate, /feedback, /memory, /eval/run as needed,
rendering TracePanel / ScorecardView / DecisionBadge / MemoryPanel at
each step.

Parallel, zero-extra-code: LANGCHAIN_TRACING_V2=true + LANGCHAIN_API_KEY
in backend/.env -> every graph node + LLM call auto-traced in LangSmith.
```

### Files/components to create
```
backend/.env                          (add LANGCHAIN_TRACING_V2=true,
                                        LANGCHAIN_API_KEY, LANGCHAIN_PROJECT)
frontend/src/styles/scalio-theme.css
frontend/src/components/TracePanel.tsx
frontend/src/components/ScorecardView.tsx
frontend/src/components/DecisionBadge.tsx
frontend/src/components/DemoStepper.tsx
frontend/src/App.tsx (rewrite)
```

### Exact Claude Prompt
```
1. Enable LangSmith tracing: add to backend/.env:
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=<the user's LangSmith key>
   LANGCHAIN_PROJECT=scalio-brandguard-demo
   Confirm python-dotenv loads these before the LangGraph/LangChain
   imports run (env vars must be set before the chat model / graph are
   instantiated). No other code changes are needed for this — LangChain
   picks these up automatically. After the next backend restart, running
   a /generate call should produce a trace visible at smith.langchain.com
   under the scalio-brandguard-demo project.

2. Visual reference: Scalio's product (scalio.app) uses dark background
   cards, one warm accent color, rounded-corner pill-shaped badges
   (visible in their credit/pricing UI), clean sans-serif type, generous
   whitespace, and real-time-completion microcopy ("Made in 45s"-style).
   Create frontend/src/styles/scalio-theme.css approximating this: dark
   card background (~#12141a range), one warm accent (amber/orange
   ~#e8792d or similar), pill-shaped badges, rounded-lg cards, an 8px
   spacing scale. Apply globally.

3. TracePanel.tsx: renders the trace array (from the last /generate
   response) as a vertical timeline — step number, component name, a
   one-line summary, latency_ms in monospace, styled as a subtle log
   panel with one accent-colored highlight per row on hover.

4. ScorecardView.tsx: renders a ScoreCard's dimensions as pill/badge
   cards — green for passed=true, amber/red for passed=false — each
   showing the dimension name and its detail text. Also show a small,
   muted tag near the top of the card reading the fixture's
   source_provider (e.g. "Source: Veo") — this is a deliberate detail:
   it signals the gate is provider-agnostic, catching defects the same
   way regardless of which third-party generator produced the asset.

5. DecisionBadge.tsx: a large, prominent pill showing decision.action,
   color-coded (PASS green, AUTO_REPAIR blue, REGENERATE amber, ESCALATE
   orange, BLOCK red), with decision.reason displayed beneath.

6. DemoStepper.tsx + rewrite App.tsx into this exact guided sequence:

   Step 1 — "The problem": a static card paraphrasing the pattern from a
   real public Scalio review describing distorted-hand/glitchy AI output
   (paraphrase, don't fabricate specifics beyond what's established),
   with the line: "This is the type of failure BrandGuard is designed to
   catch before defective content reaches the customer — regardless of
   which generation provider produced it." Do NOT claim this would have
   prevented a specific credit charge.

   Step 2 — Brand context: show "Priya Sarees" pre-selected with its
   palette/tone/audience as a small card, plus MemoryPanel (fetched from
   GET /brands/priya-sarees/memory).

   Step 3 — "Generate" button: calls POST /brands/priya-sarees/generate
   with fixture_id "flawed-hand". As the response comes back, populate
   TracePanel (a short artificial stagger like 150-300ms per revealed
   event is fine for visual effect). Show ScorecardView + DecisionBadge
   (expect AUTO_REPAIR, then the graph's own repair+re-evaluate already
   happened server-side — show both the original and final decision if
   your state shape captured both, or just the final PASS with a note
   "auto-repaired after 1 defect found").

   Step 4 — If not already shown in step 3's single call, a "Repair &
   Re-check" view showing the repaired asset and final ScorecardView/
   DecisionBadge (PASS). (Since Phase 5's graph already runs
   repair->re-evaluate->re-decide in one /generate call, this may just
   be a "before/after" toggle within Step 3's result rather than a
   separate network call — implement whichever is simpler given how you
   structured the graph's returned state.)

   Step 5 — FeedbackControls on a second fixture: "Reject: visible
   hands" button calls POST /brands/priya-sarees/feedback. MemoryPanel
   re-fetches and visibly gains the new procedural entry.

   Step 6 — "Generate" again on a third fixture for the same brand:
   calls /generate again. Next to whichever dimension is affected by the
   new memory constraint, show a small tag: "🧠 Influenced by brand
   memory: avoid visible hands". Make the contrast with Step 3 obvious.

   Step 7 — Summary bar: fetch GET /eval/run and show its agreement
   percentage plus session-derived counts ("Defects caught: N ·
   Auto-resolved: N · Escalated: N"), computed from real state, never
   hardcoded.

7. Final cleanup: remove debug console.logs/print statements, fix
   obvious layout issues, confirm the full stepper runs start to finish.
   Confirm both `uvicorn` and `npm run dev` boot cleanly from a fresh
   clone/checkout (no missing env vars silently breaking things — fail
   loudly and clearly if a key is missing).
```

### Expected Output
A single polished frontend page walking through the entire BrandGuard loop against the real FastAPI/LangGraph backend, styled to plausibly sit inside Scalio's product, with a real LangSmith trace available as a bonus artifact.

### Verification Checklist
- [ ] Full stepper flow runs start to finish with zero console/network errors
- [ ] Visual style plausibly resembles Scalio's dark/accent/pill aesthetic
- [ ] `TracePanel` visibly populates from real backend trace data
- [ ] `MemoryPanel` visibly gains a new entry after the reject action
- [ ] Step 6's decision/rationale visibly differs from Step 3 because of memory
- [ ] Summary bar shows real numbers from `/eval/run`, not hardcoded
- [ ] A `/generate` call produces a visible trace in the LangSmith dashboard (bonus check — do this once if the key is set up)
- [ ] Both backend and frontend boot cleanly from a fresh start

### Stop Condition
The full stepper flow runs cleanly once, end to end, against the live backend. Stop touching code entirely. Spend remaining time rehearsing the verbal walkthrough.

---

## Phase 7 (Optional / Stretch) — Provider Router: Closed-Loop Selection
**Budget: ~38 min — only attempt if Phases 1-6 finished under budget, and only as a whole. Do not half-build this.**

### Objective
Prove the loop is real: a router that reads BrandGuard's own stored evaluation history and uses it to choose which (mocked) generation provider handles the next request — an actual decision consuming that data, not a displayed number. Deliberately demonstrated against seeded historical data rather than a handful of live demo clicks, because that sample size can't credibly support a real comparison.

### Scope
- A common `VideoGenerationRequest` / `VideoGenerationResult` schema
- Three mocked provider tools (`generate_video_with_veo`, `_kling`, `_heygen`), each one clearly-commented line away from a real API call
- Seeded historical provider-performance data, explicitly labeled as seeded — not live — so the routing decision is demonstrated against a credible sample size
- A `select_provider(content_type_hint, db)` policy: deterministic, content-type-aware, defaults sanely when data is thin
- One new, additive endpoint that routes → generates (mocked) → runs the SAME existing evaluate/decide/repair/regen pipeline unchanged

### Explicitly NOT in scope
- Any real Veo/Kling/HeyGen API calls
- An LLM making the provider choice — deterministic only, and say why out loud in the demo (see the CTO Q&A on this)
- Modifying the existing `/generate` endpoint or Steps 1-7 of the stepper — this is purely additive, so nothing already working can regress
- Any bandit/RL algorithm — a sorted lookup is the right amount of sophistication here
- Claiming the seeded data is live or statistically significant — it must be labeled honestly in the UI

### Architecture
```
POST /brands/{id}/generate-routed {content_type_hint}
        │
        ▼
select_provider(content_type_hint, db)
   reads provider_stat memory entries (seeded_history + any live
   brandguard_run entries), filters by matching defect_type where
   available, picks lowest defect rate; falls back to a fixed default
   provider if data is too thin
        │
        ▼
dispatch to the matching mocked tool:
   generate_video_with_veo / _kling / _heygen (each returns a
   VideoGenerationResult wrapping the SAME Fixture type already used
   everywhere else)
        │
        ▼
run_brandguard_on_fixture(fixture, brand_id, db)   ← the SAME shared
   core function Steps 1-7 already use for evaluate → decide →
   repair/regenerate → trace (extracted once, reused twice)
        │
        ▼
response includes: selected_provider, selection_reason, scorecard,
   decision, trace — same shape as /generate plus two new fields
```

### Files/components to create
```
backend/app/tools/video_providers.py    (schema + 3 mocked @tool functions)
backend/app/providers.py                 (extend: seed_provider_history,
                                           content-type-aware select logic)
backend/app/graph.py                     (refactor: extract
                                           run_brandguard_on_fixture as a
                                           shared core; add a
                                           select_provider entry path —
                                           does not change the existing
                                           run_brandguard(fixture_id, ...)
                                           signature or behavior)
backend/app/main.py                      (extend: POST
                                           /brands/{brand_id}/generate-routed)
frontend/src/components/RouterPanel.tsx
```

### Exact Claude Prompt
```
Close the loop for real, without touching anything already working from
Phases 1-6.

1. backend/app/tools/video_providers.py
   Define Pydantic models:
   - VideoGenerationRequest: content_type_hint: str; brand_id: str
   - VideoGenerationResult: provider: str; fixture: Fixture (reuse the
     existing Fixture type from models.py — do not create a parallel
     asset type)

   Using LangChain's @tool decorator, define three functions, each
   MOCKED but structured so the mock is a one-line, clearly-commented
   swap point:
   - generate_video_with_veo(request: VideoGenerationRequest) ->
     VideoGenerationResult: constructs a VideoGenerationResult with
     provider="veo", fixture=<a fresh Fixture built from the flawed-hand
     data — don't mutate the shared fixtures.py object>. Add the
     comment: "# MOCK — replace this block with a real call to Veo's
     video generation API; everything downstream (BrandGuard, memory,
     provider intelligence) is unaffected by this swap because it only
     depends on the VideoGenerationResult shape."
   - generate_video_with_kling(request) -> VideoGenerationResult:
     provider="kling", fixture=<a fresh Fixture reusing the clean-good
     image/caption data but with source_provider explicitly set to
     "kling" — a deliberate demo simplification: the same underlying
     asset stands in for a clean Kling output since we're not calling a
     real API>. Same MOCK comment pattern.
   - generate_video_with_heygen(request) -> VideoGenerationResult:
     provider="heygen", fixture=<reuse flawed-text or clean-good,
     whichever fits>. Same MOCK comment pattern.

2. backend/app/providers.py:
   - log_provider_outcome(db, fixture, scorecard) -> None: writes an
     episodic MemoryEntry with source='brandguard_run' (live data).
   - seed_provider_history(db) -> None: writes a batch of clearly
     labeled historical entries with source='seeded_history' (NOT
     'brandguard_run', so live and seeded data are always
     distinguishable): e.g. 3 entries for 'veo' with defect_type
     'hand_distortion' on 2 of them, 3 entries for 'kling' with no
     defects, 2 entries for 'heygen' with no defects. Call this once on
     app startup, guarded by checking whether seeded_history entries
     already exist (don't re-seed on every restart).
   - get_leaderboard(db) -> dict aggregating ALL provider_stat entries
     (seeded_history + brandguard_run) by provider:
     {provider: {runs, defects, defect_rate, hand_distortion_rate}}.
     Compute hand_distortion_rate specifically, not just overall
     defect_rate, since routing needs to match provider strength to
     content type.
   - select_provider(content_type_hint: str, db) -> dict: if
     content_type_hint contains "hand", rank providers by
     hand_distortion_rate ascending; otherwise rank by overall
     defect_rate ascending. If fewer than 2 providers have any data,
     default to "veo" (a fixed, named default — this makes the router's
     improvement over "no routing" visible). Return
     {selected_provider, reason: a plain-English string like "kling
     selected: 0% hand-distortion rate vs veo's 67% across seeded
     history", leaderboard, sample_note: "Includes seeded historical
     data for demo purposes, clearly distinguished from this session's
     live runs — not a production-scale benchmark."}

3. backend/app/graph.py — refactor without breaking the existing path:
   - Extract the current body of run_brandguard (load_context through
     decide/repair/regenerate/trace) into a new function
     run_brandguard_on_fixture(fixture: Fixture, brand_id: str, db) ->
     BrandGuardState that takes a Fixture object directly.
   - Rewrite run_brandguard(fixture_id: str, brand_id: str, db) to look
     up the fixture from fixtures.py and call run_brandguard_on_fixture
     — its external signature and behavior must stay identical, so
     Steps 1-7 keep working unmodified.
   - Add run_brandguard_routed(content_type_hint: str, brand_id: str,
     db) -> dict: calls providers.select_provider, maps the selected
     provider name to its tool function via a dict lookup, invokes it
     with a VideoGenerationRequest, extracts the resulting Fixture,
     calls run_brandguard_on_fixture on it, calls
     providers.log_provider_outcome with the result, and returns
     {selected_provider, selection_reason, ...the BrandGuardState}.

4. backend/app/main.py: on startup, also call
   providers.seed_provider_history(db). Add POST
   /brands/{brand_id}/generate-routed accepting {content_type_hint: str},
   calling graph.run_brandguard_routed, returning the result as JSON.
   Do NOT modify the existing POST /brands/{brand_id}/generate route.

5. frontend/src/components/RouterPanel.tsx: a new panel added AFTER the
   existing Step 7 — do not insert it into or renumber the existing
   stepper. It should:
   - Show a button "Auto-Route: hand-heavy product shot" calling POST
     /brands/{brand_id}/generate-routed with
     content_type_hint="hand_heavy_product_shot".
   - On response, prominently display "Router selected: {provider}" and
     the plain-English selection_reason.
   - Reuse the EXISTING ScorecardView and DecisionBadge components for
     the routed result (expect PASS — the router should have avoided
     the hand-defect provider).
   - Show the sample_note clearly, not in fine print.
   - Add a short contrast line: "Step 3 used an unrouted request and got
     a Veo-sourced hand distortion requiring repair. This request let
     the router choose — it avoided Veo for hand-heavy content and
     passed clean on the first try."

Verify explicitly that Steps 1-7 still work exactly as before after this
change — this phase must be purely additive.
```

### Expected Output
A new "Auto-Route" panel that, for hand-heavy content, consults seeded + live provider history, picks Kling over Veo with a stated reason, generates via the mocked Kling tool, and passes BrandGuard's evaluation cleanly on the first try — with the mock boundary and the seeded/live data distinction both clearly visible.

### Verification Checklist
- [ ] `select_provider("hand_heavy_product_shot", db)` returns `kling` with a reason citing the seeded hand-distortion rates
- [ ] `POST /generate-routed` returns a full state with `selected_provider` and `selection_reason` fields
- [ ] The routed generation reaches `PASS` without needing a repair cycle (proving the choice was good, not lucky)
- [ ] The leaderboard visibly distinguishes `seeded_history` entries from `brandguard_run` entries
- [ ] Steps 1-7 of the original stepper still work exactly as before — confirm by running through them once
- [ ] Each mocked tool function has a clearly visible one-line comment showing where the real provider API call would go

### Stop Condition
The routed generation runs once, picks the historically-better provider for hand-heavy content, and passes clean — with Steps 1-7 confirmed still working. Stop immediately. Do not attempt to wire real provider APIs, do not add a second content-type scenario, and if this phase is running long, abandon it entirely in favor of the one-sentence verbal version rather than shipping a half-wired router.

---

## Final Integration Verification

**Functionality**
- [ ] Both `uvicorn` and `npm run dev` start cleanly from a fresh terminal
- [ ] All 3 fixtures load and are usable in the flow

**Evaluation**
- [ ] Rule checks run instantly, zero network calls (verify via logs/network tab)
- [ ] The VLM judge call returns real, schema-valid structured output
- [ ] Flawed and clean fixtures produce visibly different scorecards

**Memory**
- [ ] Seeded entry present on first run, persists across backend restarts (real SQLite, not in-memory)
- [ ] A new entry is written on rejection
- [ ] A later decision is demonstrably influenced by an earlier rejection

**Agent decisions**
- [ ] The LangGraph routes correctly to repair/regenerate/end based on the decision
- [ ] AUTO_REPAIR path reaches PASS after one cycle
- [ ] REGENERATE path reaches a sensible final state after one cycle
- [ ] The graph never loops more than once per run
- [ ] Every decision has a specific, non-generic reason string

**Error handling**
- [ ] A malformed/failed VLM response doesn't crash the route (basic try/except with a clear error response)
- [ ] Repair/regenerate genuinely cap at one attempt

**UI**
- [ ] Visual language is plausibly Scalio-adjacent
- [ ] The stepper flow is self-explanatory without narration

**Tracing**
- [ ] Every `/generate` call returns a non-empty, meaningful trace
- [ ] (Bonus) LangSmith shows a real trace for at least one run

**Demo scenario**
- [ ] You have personally run the full 7-step flow at least twice without issues

**Provider Router (only if Phase 7 was built)**
- [ ] Steps 1-7 still work exactly as before — confirmed unaffected
- [ ] The router picks Kling over Veo for hand-heavy content, with a stated reason
- [ ] The routed generation passes clean, without a repair cycle
- [ ] Seeded and live provider data are visibly distinguished in the UI, not blended silently

---

## Final 90-Second Demo Script

**0:00–0:15 — Open on the problem.** Point at Step 1's card. Say: *"This is drawn from Scalio's own reviews — users describing distorted hands and glitchy generations. Every one of those is a paying user's credit spent on something they can't use. Since you're compositing more than one generation provider under the hood, that failure can come from any of them — this gate doesn't care which one, it catches it before it reaches the customer."*

**0:15–0:40 — Live catch and fix.** Click "Generate" (Step 3). Let the trace panel populate. Point at the ScoreCard: *"Deterministic checks ran instantly — format, caption language, banned words, no LLM involved. Then one real vision-model call, orchestrated through a LangGraph state machine, judged brand fit and caught the hand distortion."* Point at the decision: *"AUTO_REPAIR — minor, localized, cheap to fix. The graph routed to the repair node, re-ran the evaluation, and landed on PASS automatically."*

**0:40–0:65 — Memory, live.** Move to Step 5: *"Now the user rejects something — not a technical defect, a preference: no visible hands in this brand's content."* Click reject. Point at MemoryPanel: *"Written to a real SQLite-backed memory store on the backend."* Move to Step 6, click "Generate" again: *"Same graph, same evaluation pipeline, different brand memory at t+1. Watch — it's now stricter about hands, because it remembers."* Point at the "🧠 Influenced by brand memory" tag: *"This is the personalization piece — it gets smarter about this specific brand, not just generically better."*

**0:65–0:90 — Close on the summary and the pitch.** Point at the summary numbers: *"Defects caught, auto-resolved, escalated — real numbers from this session, plus an honestly-labeled 8-case eval set, and a real LangSmith trace behind every one of these runs if you want to look under the hood."* Close verbally: *"This is FastAPI, LangGraph, and LangChain — the same stack I ran in production at achieve.ai. It's not a separate app — it's the QA layer that would sit between your generation step and your publish step."*

**0:90–1:15 — "And one more thing" (only if Phase 7 was built).** Click "Auto-Route: hand-heavy product shot." Say: *"Step 3 earlier got a hand-distortion defect from Veo and needed a repair cycle. This time, I'm not picking the provider — the router is, based on stored history: Kling has a 0% hand-distortion rate against Veo's 67% in the data it has so far."* Point at the result landing on PASS with no repair needed: *"Same evaluation pipeline, but the loop is closed — the reliability layer is now informing which generator gets used, not just judging what comes out of it."* If asked whether an LLM is choosing the provider, be direct: *"No — deterministic on purpose. Sorting three numbers doesn't need a model call; it needs a model call when there's actually judgment involved, and this isn't that yet."* If Phase 7 wasn't built, say the same idea in one sentence without the panel: *"One more thing I'd build next: this evaluation history is already provider-tagged — at volume, it tells you which generator to trust for which content type, not just whether this one output was good."*

---

## CTO Questions

**"Is this actually LangGraph, or did you just call it that?"**
Real — you can watch the trace panel populate from the graph's own returned state, and if LangSmith is wired, every node and LLM call shows up there too, node by node.

**"Why one VLM call instead of separate models for defects, OCR, and brand-fit?"**
Same answer as before — a documented, deliberate consolidation for build speed, with the interfaces kept separate in code so they're trivially splittable into specialized models later without a rewrite.

**"Why SQLite and not Postgres?"**
Speed of build, not a belief it's the final answer. The `memory.py` module is the only place that would change — same interface, different engine string.

**"Why does the graph only allow one repair/regenerate attempt?"**
Deliberate reliability choice — an uncapped retry loop is a real production failure mode (runaway cost, runaway latency). Capping at one and surfacing an honest "still not passing" result is safer than looping silently.

**"Could this actually plug into our pipeline?"**
Yes — same answer as before, the intended integration point is between your generator and your delivery step. FastAPI makes that concrete: it's a real HTTP service with a real API contract, not a client-only toy.

**"Why LangGraph instead of a plain function pipeline?"**
The decision branching (PASS/AUTO_REPAIR/REGENERATE/ESCALATE/BLOCK) is inherently a routing problem, and LangGraph's conditional edges express that directly and legibly — anyone reading `graph.py` can see the whole policy shape without tracing through nested if/else logic, which matters as this grows past a demo.

**"How did you know we use multiple generation providers?"**
Public tooling signals suggested it, so I designed around that assumption — but honestly, it doesn't matter if I'm exactly right. The evaluator scores the delivered asset, not the source, so it works the same whether you're on one provider or five, and it doesn't break the day you add or swap one.

**"Isn't this just what our creative producer already does by hand?"**
Largely, yes — and that's the point. The ESCALATE path is a formalized version of that manual review: the system handles the clear-cut cases automatically and only surfaces the genuinely ambiguous ones, with the reasoning attached. It doesn't replace that judgment, it scales it and leaves a record of it.

**"What would you build next, if you had more time?"**
Two things, in order. First, feed the provider-tagged evaluation history into actual routing decisions — not just "this output was bad" but "this generator is unreliable for this content type, route around it." Second, once you have real post-publish engagement data, connect brand memory to performance, not just brand-fit — the difference between "on-brand" and "on-brand and it worked."

**"Is the provider router actually agentic, or is this just sorting?"**
Honestly, it's sorting — and that's deliberate. An LLM reasoning about which of three numbers is smallest would be theater, not intelligence; it'd add latency and cost for zero real decision quality. The interface is built so a real bandit algorithm or an LLM-based policy could slot in later, once there's enough production volume for that sophistication to actually earn its cost. Right now, the honest answer beats the impressive-sounding one.

**"Is that provider performance data real?"**
Some of it's seeded, and I labeled it that way on purpose rather than pretending three demo clicks constitute learning — that sample size can't support a real comparison, and I'd rather you trust the honest version than the impressive-sounding one. What's real is the mechanism: the router actually reads that data and actually changes which tool gets called. Swap the seeded rows for real production history and the same code just starts telling the truth at scale.

---

## Emergency Cut List

**If you're at the 3:00 mark and behind:**
- Reduce `/eval/run` to a simple printed/logged table rather than a polished JSON response with extra fields.
- Skip a real regenerate image-gen call — pre-staged fixture swap only, no exceptions.
- Skip auto-advancing steps in `DemoStepper` — manual "Next" buttons are fine.

**If you're at the 3:30 mark and behind:**
- Cut the REGENERATE execution path's re-evaluation loop — let it return the REGENERATE decision and stop there without actually swapping the fixture; narrate verbally what would happen next.
- Skip LangSmith entirely — the custom TracePanel alone is enough; two env vars is a nice-to-have, not core.
- Drop Scalio-theme refinement to a single dark background + one accent color.

**If you're at the 3:50 mark and behind:**
Cut everything except the one non-negotiable core: one hardcoded flawed fixture → one real LangGraph run with a real VLM call → a decision → one memory write from a rejection via curl/`/docs` → one second run showing the memory-influenced decision, visible in raw JSON if necessary.
- Skip the trace panel UI — trace data returned in the JSON response is enough, don't build a renderer for it.
- Skip the eval harness.
- Skip repair/regenerate node execution — show the decision only.
- Skip the frontend polish — even a Swagger UI (`/docs`) walkthrough of raw API calls can carry the demo if it must.

**The one thing to protect no matter what:** the live moment where a rejection changes a later decision for the same brand. If you can only ship one thing, ship that.

---

## Bonus, Non-Code Ideas (only if you want to go further — none of this is build work)

**A one-page "first 90 days" leave-behind.** A short doc, separate from the live demo, sketching how you'd sequence real work if hired: week 1-2 stabilize the provider-QA gate in production, week 3-4 wire real post-publish data, month 2-3 the routing layer. Costs you 15 minutes to write, not part of the 4-hour build, and gives Aditya something to reread after the call ends.

**Mention ad-performance prediction as a spoken future direction only — do not attempt to build it.** Scalio's own positioning leans on "performance-driven creatives" for Meta/Google Ads. The natural next question after brand-fit is "did it work," but that needs real engagement data you don't have and can't fabricate credibly. Say it as a sentence, not a feature: *"Longer term, the same memory system that learns brand preferences could learn what actually performs — but that needs your real ad data, not something I can demo today."* Claiming this without data would be the one place in the whole pitch that reads as overclaiming — don't build toward it, just name it as a right question to ask next.
