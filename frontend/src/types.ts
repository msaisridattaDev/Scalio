export type ScoreCardDimension = {
  name: string;
  method: "deterministic" | "vlm";
  passed: boolean;
  detail: string;
  score: number | null;
};

export type ScoreCard = {
  fixture_id: string;
  brand_id: string;
  dimensions: ScoreCardDimension[];
  overall_rationale: string;
  timestamp: string;
};

export type DecisionAction = "PASS" | "AUTO_REPAIR" | "REGENERATE" | "ESCALATE" | "BLOCK";

export type Decision = {
  action: DecisionAction;
  reason: string;
  confidence: "high" | "medium" | "low";
};

export type TraceEvent = {
  step: number;
  component: string;
  input_summary: string;
  output_summary: string;
  latency_ms: number;
  timestamp: string;
};

export type FixtureRef = { id: string; image_path: string; source_provider: string; known_defect: unknown | null };

export type ProviderStats = { runs: number; defects: number; hand_distortion_runs: number; defect_rate: number; hand_distortion_rate: number };

export type ProviderSelection = {
  selected_provider: string;
  reason: string;
  leaderboard: Record<string, ProviderStats>;
  sample_note: string;
  content_type_hint: string;
};

export type GenerateResponse = {
  fixture_id: string;
  brand_id: string;
  brand_kit: Record<string, unknown>;
  memory_context: string;
  current_fixture: FixtureRef | null;
  scorecard: ScoreCard;
  decision: Decision;
  original_scorecard: ScoreCard | null;
  original_decision: Decision | null;
  original_fixture: FixtureRef | null;
  provider_selection: ProviderSelection | null;
  trace: TraceEvent[];
  attempt: number;
};

export type MemoryEntry = {
  id: string;
  brand_id: string;
  type: "semantic" | "procedural" | "episodic";
  key: string;
  value: string;
  confidence: "high" | "medium" | "low";
  source: "brand_kit" | "human_feedback" | "brandguard_run" | "seeded_history";
  created_at: string;
};

export type EvalCaseResult = {
  id: string;
  fixture_id: string;
  expected_decision: string;
  actual_decision: string;
  passed: boolean;
  note: string;
  reason: string;
};

export type EvalRunResponse = {
  label: string;
  agreement_pct: number;
  results: EvalCaseResult[];
};
