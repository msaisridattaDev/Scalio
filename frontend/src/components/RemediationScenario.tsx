import { useRef, useState } from "react";
import type { GenerateResponse } from "../types";
import ScorecardView from "./ScorecardView";
import LiveAgentExecution, { type StreamEvent } from "./LiveAgentExecution";
import { streamNdjson } from "../lib/ndjsonStream";
import { categoryLabel, headlineFor } from "../lib/defectLabel";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const BRAND_ID = "priya-sarees";

export type ScenarioOutcome = {
  originalDecision: string;
  finalDecision: string;
  remediated: boolean;
  routedProvider: string;
  defectDetail: string | null;
  categoryLabel: string | null;
};

const DECISION_LABEL: Record<string, string> = {
  PASS: "Pass",
  AUTO_REPAIR: "Repair",
  REGENERATE: "Regenerate",
  ESCALATE: "Escalate",
  BLOCK: "Block",
};

type StreamMsg = { node: string; state: GenerateResponse } | { error: string; error_type: string };

export default function RemediationScenario({
  fixtureId,
  caption,
  successTagline,
  onComplete,
}: {
  fixtureId: string;
  caption: string;
  successTagline: string;
  onComplete?: (outcome: ScenarioOutcome) => void;
}) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showBeforeDetail, setShowBeforeDetail] = useState(true);
  const [showAfterDetail, setShowAfterDetail] = useState(true);
  const completedRef = useRef(false);

  const latest = events.length > 0 ? events[events.length - 1].state : null;
  const byNode = (name: string) => events.find((e) => e.node === name)?.state ?? null;
  const afterDecide = byNode("decide"); // first "decide" event in arrival order
  const afterSelectProvider = byNode("select_provider");
  const afterRegenerate = byNode("regenerate") ?? byNode("repair");

  // One click. Everything from here on is driven entirely by real NDJSON
  // events arriving from the backend's actual LangGraph execution — no
  // "Continue" buttons, no frontend-decided branching, and nothing about
  // the defect is revealed until the agent has actually found it.
  const run = async () => {
    setRunning(true);
    setDone(false);
    setEvents([]);
    setError(null);
    completedRef.current = false;
    try {
      const res = await fetch(`${API_BASE}/brands/${BRAND_ID}/generate/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixture_id: fixtureId }),
      });
      if (!res.ok) throw new Error(`stream failed: ${res.status}`);

      let finalState: GenerateResponse | null = null;
      for await (const msg of streamNdjson<StreamMsg>(res)) {
        if ("error" in msg) {
          setError(msg.error);
          break;
        }
        finalState = msg.state;
        setEvents((prev) => [...prev, { node: msg.node, state: msg.state }]);
      }
      setDone(true);
      if (finalState && onComplete && !completedRef.current) {
        completedRef.current = true;
        const defectDim = finalState.original_scorecard?.dimensions.find((d) => d.name === "defect_detection");
        const detail = defectDim && !defectDim.passed ? defectDim.detail : null;
        onComplete({
          originalDecision: finalState.original_decision?.action ?? "?",
          finalDecision: finalState.decision.action,
          remediated:
            (finalState.original_decision?.action === "AUTO_REPAIR" ||
              finalState.original_decision?.action === "REGENERATE") &&
            finalState.original_decision?.action !== finalState.decision.action,
          routedProvider: finalState.provider_selection?.selected_provider ?? "",
          defectDetail: detail,
          categoryLabel: detail ? categoryLabel(detail) : null,
        });
      }
    } catch (err) {
      setError(String(err));
      setDone(true);
    } finally {
      setRunning(false);
    }
  };

  const originalImagePath = `/fixtures/${fixtureId}.jpeg`;
  const originalFailed = afterDecide?.original_decision && afterDecide.original_decision.action !== "PASS";
  const finalPassed = latest?.decision?.action === "PASS";
  const defectDetail = afterDecide?.original_scorecard?.dimensions.find((d) => d.name === "defect_detection")?.detail;
  const category = defectDetail ? categoryLabel(defectDetail) : null;
  const headline = defectDetail ? headlineFor(defectDetail) : null;

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div className="bg-card-raised" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, flex: "2 1 420px", minWidth: 300 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <img src={`${API_BASE}${originalImagePath}`} alt="selected creative" style={{ width: 140, borderRadius: 8 }} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ margin: "0 0 8px" }}>{caption}</p>
            {!running && events.length === 0 && (
              <button className="btn btn-primary" onClick={run}>
                Run Scalio
              </button>
            )}
            {running && events.length === 0 && (
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>🔍 Inspecting content...</p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-card" style={{ padding: 16, borderLeft: "3px solid var(--block)" }}>
            <p style={{ margin: 0, color: "var(--block)", fontSize: 14 }}>{error}</p>
          </div>
        )}

        {/* Agent narration: problem found + decision — nothing about the defect shown before this */}
        {afterDecide && (
          <div className="bg-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {originalFailed ? (
              <>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>⚠️ Problem found</p>
                <span className="pill pill-regenerate" style={{ alignSelf: "flex-start", fontWeight: 700 }}>{category}</span>
                <p style={{ margin: 0, fontSize: 15 }}>{headline}</p>
                <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{defectDetail}</p>
                <p style={{ margin: "8px 0 0", fontWeight: 700, fontSize: 14, color: "var(--text-muted)" }}>
                  Scalio's decision
                </p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--regenerate)" }}>
                  {DECISION_LABEL[afterDecide.original_decision?.action ?? ""] ?? afterDecide.original_decision?.action}
                </p>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, alignSelf: "flex-start" }}
                  onClick={() => setShowBeforeDetail((v) => !v)}
                >
                  {showBeforeDetail ? "Hide" : "Show"} technical scorecard
                </button>
                {showBeforeDetail && (
                  <ScorecardView
                    scorecard={afterDecide.original_scorecard ?? afterDecide.scorecard}
                    sourceProvider={afterDecide.original_fixture?.source_provider}
                  />
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 15 }}>✅ No problem found — this one's already brand-safe.</p>
            )}
          </div>
        )}

        {/* Provider routing — real select_provider node output */}
        {originalFailed && (afterSelectProvider || (running && afterDecide)) && (
          <div className="bg-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {!afterSelectProvider ? (
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>🤖 Choosing the best provider...</p>
            ) : (
              <>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>🤖 Choosing the best provider...</p>
                <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>
                  {afterSelectProvider.provider_selection!.selected_provider[0].toUpperCase() +
                    afterSelectProvider.provider_selection!.selected_provider.slice(1)}{" "}
                  selected
                </p>
                <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{afterSelectProvider.provider_selection!.reason}</p>
                <p className="text-muted" style={{ margin: "4px 0 0", fontSize: 12, fontStyle: "italic" }}>
                  Scalio's select_provider node chose this — not the user — from real historical performance, as part of this same run.
                </p>
              </>
            )}
          </div>
        )}

        {/* Fixing / staged output — explicitly, unambiguously labeled as simulated */}
        {afterRegenerate?.current_fixture && (
          <div className="bg-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>🛠️ Scalio is fixing it.</p>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <img src={`${API_BASE}${originalImagePath}`} alt="original" style={{ width: 90, borderRadius: 8, opacity: 0.6 }} />
                <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>Original</p>
              </div>
              <span style={{ fontSize: 20, color: "var(--text-muted)" }}>→</span>
              <div style={{ textAlign: "center", position: "relative" }}>
                <img
                  src={`${API_BASE}${afterRegenerate.current_fixture.image_path}`}
                  alt="simulated provider output"
                  style={{ width: 110, borderRadius: 8, border: "2px solid var(--accent)" }}
                />
                <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>Simulated output</p>
              </div>
            </div>
            <div className="bg-card-raised" style={{ padding: "8px 12px", border: "1px solid var(--regenerate)" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--regenerate)" }}>
                ⚠ Generated using a simulated/staged provider output for this demo — no live Kling, Veo, or HeyGen call was made.
              </p>
            </div>
          </div>
        )}

        {/* Self-check — only meaningful once the stream has actually closed */}
        {done && originalFailed && !error && (
          <div className="bg-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>🔁 Checked my own work.</p>

            {latest && category && (
              <>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div>
                    <p className="text-muted" style={{ fontSize: 12, fontWeight: 700, margin: "0 0 6px", letterSpacing: "0.04em" }}>
                      BEFORE
                    </p>
                    <p style={{ margin: 0, fontSize: 14 }}>❌ {category}</p>
                    <p style={{ margin: 0, fontSize: 14 }}>❌ Quality blocked</p>
                  </div>
                  <div>
                    <p className="text-muted" style={{ fontSize: 12, fontWeight: 700, margin: "0 0 6px", letterSpacing: "0.04em" }}>
                      AFTER
                    </p>
                    {finalPassed ? (
                      <>
                        <p style={{ margin: 0, fontSize: 14 }}>✅ {category} resolved</p>
                        <p style={{ margin: 0, fontSize: 14 }}>✅ Quality passed</p>
                      </>
                    ) : (
                      <p style={{ margin: 0, fontSize: 14 }}>❌ Still not clean: {latest.decision.reason}</p>
                    )}
                  </div>
                </div>

                <p style={{ margin: "4px 0 0", fontSize: 34, fontWeight: 900, color: finalPassed ? "var(--pass)" : "var(--block)" }}>
                  {DECISION_LABEL[latest.decision.action] ?? latest.decision.action}
                </p>
                {finalPassed && <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{successTagline}</p>}

                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, alignSelf: "flex-start" }}
                  onClick={() => setShowAfterDetail((v) => !v)}
                >
                  {showAfterDetail ? "Hide" : "Show"} technical scorecard
                </button>
                {showAfterDetail && (
                  <ScorecardView scorecard={latest.scorecard} sourceProvider={latest.provider_selection?.selected_provider} />
                )}
              </>
            )}
          </div>
        )}
      </div>

      {(running || events.length > 0) && <LiveAgentExecution events={events} done={done} />}
    </div>
  );
}
