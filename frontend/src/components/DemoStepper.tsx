import { useState } from "react";
import type { GenerateResponse } from "../types";
import MemoryPanel from "./MemoryPanel";
import ScorecardView from "./ScorecardView";
import FeedbackControls from "./FeedbackControls";
import RouterPanel from "./RouterPanel";
import RemediationScenario, { type ScenarioOutcome } from "./RemediationScenario";
import LiveAgentExecution, { type StreamEvent } from "./LiveAgentExecution";
import { streamNdjson } from "../lib/ndjsonStream";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const BRAND_ID = "priya-sarees";

type StreamMsg = { node: string; state: GenerateResponse } | { error: string; error_type: string };

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          className="mono"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--accent-bg)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {n}
        </span>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

const SCENARIOS = [{ id: "flawed-hand" }, { id: "flawed-text" }] as const;
type ScenarioId = (typeof SCENARIOS)[number]["id"];

export default function DemoStepper() {
  const [step, setStep] = useState(1);
  const [memoryRefreshKey, setMemoryRefreshKey] = useState(0);
  const [showBrandDetail, setShowBrandDetail] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("flawed-hand");

  const [scenario1Outcome, setScenario1Outcome] = useState<ScenarioOutcome | null>(null);
  const [scenario2Outcome, setScenario2Outcome] = useState<ScenarioOutcome | null>(null);

  const [memoryRuleText, setMemoryRuleText] = useState<string | null>(null);
  const [memoryEvents, setMemoryEvents] = useState<StreamEvent[]>([]);
  const [memoryRunning, setMemoryRunning] = useState(false);
  const [memoryDone, setMemoryDone] = useState(false);
  const memoryResult = memoryEvents.length > 0 ? memoryEvents[memoryEvents.length - 1].state : null;

  const [bonusRouted, setBonusRouted] = useState(false);

  const runMemoryApplied = async () => {
    setMemoryRunning(true);
    setMemoryDone(false);
    setMemoryEvents([]);
    try {
      const res = await fetch(`${API_BASE}/brands/${BRAND_ID}/generate/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixture_id: "clean-good" }),
      });
      if (!res.ok) throw new Error(`stream failed: ${res.status}`);
      for await (const msg of streamNdjson<StreamMsg>(res)) {
        if ("error" in msg) {
          alert(`Evaluate failed: ${msg.error}`);
          break;
        }
        setMemoryEvents((prev) => [...prev, { node: msg.node, state: msg.state }]);
      }
    } catch (err) {
      alert(`Evaluate failed: ${err}`);
    } finally {
      setMemoryRunning(false);
      setMemoryDone(true);
    }
  };

  const memoryConstraintApplied = !!memoryResult && !!memoryRuleText && memoryResult.memory_context.includes(memoryRuleText);

  // ----- Final session result — computed entirely from real completed state -----
  const scenariosDone = [scenario1Outcome, scenario2Outcome].filter(Boolean) as ScenarioOutcome[];
  const contentChecks =
    scenariosDone.reduce((n, s) => n + (s.remediated ? 2 : 1), 0) + (memoryResult ? 1 : 0);
  const problemsCaught =
    scenariosDone.filter((s) => s.originalDecision !== "PASS").length +
    (memoryResult && memoryResult.decision.action !== "PASS" ? 1 : 0);
  const automaticallyRemediated = scenariosDone.filter((s) => s.remediated).length;
  const passedAfterRecheck = scenariosDone.filter((s) => s.finalDecision === "PASS").length;
  const preferencesLearned = memoryRuleText ? 1 : 0;
  const providerDecisions = scenariosDone.filter((s) => s.routedProvider).length + (bonusRouted ? 1 : 0);

  const bothScenariosDone = !!scenario1Outcome && !!scenario2Outcome;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20, padding: "40px 20px 80px" }}>
      {/* HERO */}
      <header style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em", color: "#111827" }}>
          Scalio
        </span>
        <h1 style={{ fontSize: 36, margin: "14px 0 6px", color: "#111827", fontWeight: 800, lineHeight: 1.15 }}>
          Your AI content. Your brand.<br />Automatically guarded.
        </h1>
        <p style={{ margin: "0 auto", maxWidth: 520, fontSize: 16, fontWeight: 500, color: "#374151" }}>
          Give it content. Scalio decides what to check, what to fix, where to route it, and
          whether it's safe to ship.
        </p>
        <p className="text-muted" style={{ margin: "10px 0 0", fontSize: 12 }}>
          FastAPI + LangGraph + LangChain — a real agentic workflow, streamed live from the backend.
        </p>
      </header>

      {/* 1. PROBLEM */}
      <StepCard n={1} title="AI can create it. Who checks it before you ship it?">
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: 15 }}>
          AI-generated content can look perfect at first glance — until you notice the hands, the
          text, or something that simply doesn't feel like your brand.
        </p>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Let Scalio check it.</p>
        <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => setStep(2)}>
          Next
        </button>
      </StepCard>

      {/* 2. BRAND */}
      {step >= 2 && (
        <StepCard n={2} title="First, Scalio gets to know the brand.">
          <div className="bg-card-raised" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <strong style={{ fontSize: 17 }}>Priya Sarees</strong>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>Jaipur · Festive & Wedding Fashion</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {["Hindi + English", "Warm & traditional", "Trustworthy"].map((t) => (
                <span key={t} className="pill pill-neutral">{t}</span>
              ))}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
            Scalio carries this context into every decision.
          </p>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, alignSelf: "flex-start" }}
            onClick={() => setShowBrandDetail((v) => !v)}
          >
            {showBrandDetail ? "Hide" : "Show"} full brand memory
          </button>
          {showBrandDetail && <MemoryPanel brandId={BRAND_ID} refreshKey={memoryRefreshKey} />}
          <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => setStep(3)}>
            Next
          </button>
        </StepCard>
      )}

      {/* 3/4. SCENARIOS — single active view, selectable tabs */}
      {step >= 3 && (
        <StepCard n={3} title="Select an image. Click Run Scalio. Watch the agent take it from there.">
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
            Two sample creatives — pick one to inspect it up close. Scalio hasn't looked at either yet,
            so nothing about what's wrong with them is shown until it actually finds it.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {SCENARIOS.map((s, i) => {
              const outcome = s.id === "flawed-hand" ? scenario1Outcome : scenario2Outcome;
              const isActive = activeScenario === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveScenario(s.id)}
                  className={isActive ? "bg-card-raised" : "bg-card"}
                  style={{
                    flex: "1 1 260px",
                    maxWidth: 340,
                    padding: 14,
                    borderRadius: "var(--radius)",
                    border: isActive ? "3px solid var(--accent)" : "1px solid var(--border)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    textAlign: "left",
                  }}
                >
                  <img
                    src={`${API_BASE}/fixtures/${s.id}.jpeg`}
                    alt={`Sample ${i + 1}`}
                    style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 10 }}
                  />
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Sample {i + 1}</p>
                    <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>
                      {outcome
                        ? outcome.categoryLabel
                          ? `Found: ${outcome.categoryLabel} → ${outcome.finalDecision}`
                          : `Checked → ${outcome.finalDecision}`
                        : "Not checked yet"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: activeScenario === "flawed-hand" ? "block" : "none" }}>
            <RemediationScenario
              fixtureId="flawed-hand"
              caption="Wrap yourself in tradition this festive season"
              successTagline="Scalio caught it, routed it, fixed it, and verified the result."
              onComplete={setScenario1Outcome}
            />
          </div>
          <div style={{ display: activeScenario === "flawed-text" ? "block" : "none" }}>
            <RemediationScenario
              fixtureId="flawed-text"
              caption="Festive sale now live"
              successTagline="Same agent. Different defect. Same closed loop."
              onComplete={setScenario2Outcome}
            />
          </div>

          {bothScenariosDone && step === 3 && (
            <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => setStep(4)}>
              Next: teach Scalio a preference
            </button>
          )}
        </StepCard>
      )}

      {/* MEMORY — generated from the real defect, not a hardcoded fixture assumption */}
      {step >= 4 && (
        <StepCard n={4} title="Now teach Scalio one thing.">
          {scenario1Outcome?.defectDetail ? (
            <>
              <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
                Scenario 1 actually detected this defect. Rather than a generic "no hands ever" rule,
                Scalio generates a precise memory rule from what it really found.
              </p>
              <div className="bg-card-raised" style={{ padding: 14 }}>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em" }}>
                  DETECTED
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13 }}>{scenario1Outcome.defectDetail}</p>
              </div>
              <FeedbackControls
                brandId={BRAND_ID}
                fixtureId="flawed-hand"
                defectDetail={scenario1Outcome.defectDetail}
                buttonLabel="Remember this defect"
                onFeedbackWritten={(ruleText) => {
                  setMemoryRuleText(ruleText);
                  setMemoryRefreshKey((k) => k + 1);
                }}
              />
            </>
          ) : (
            <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
              Run Scenario 1 (Hand distortion) first — the memory rule below is generated from its
              real detected defect, not hardcoded.
            </p>
          )}

          {memoryRuleText && (
            <>
              <div className="bg-card-raised" style={{ padding: 14 }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>🧠 Brand memory updated</p>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--accent)", fontWeight: 700 }}>
                  {memoryRuleText}
                </p>
              </div>

              <p style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 800 }}>Let's try another creative.</p>
              <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
                A different image — never touched in Scenario 1 or 2 — evaluated fresh, automatically.
              </p>
              {memoryEvents.length === 0 && (
                <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={runMemoryApplied} disabled={memoryRunning}>
                  {memoryRunning ? "Evaluating..." : "Run Scalio"}
                </button>
              )}

              {memoryEvents.length > 0 && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div className="bg-card-raised" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, flex: "2 1 380px" }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <img src={`${API_BASE}/fixtures/clean-good.jpeg`} alt="clean-good" style={{ width: 110, borderRadius: 8 }} />
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <span className="pill pill-pass" style={{ fontWeight: 700 }}>
                          🧠 Brand memory applied
                        </span>
                        <p className="text-muted" style={{ fontSize: 12, margin: "6px 0 0" }}>"{memoryRuleText}"</p>
                      </div>
                    </div>

                    {memoryDone && memoryResult && (
                      <>
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: 34,
                            fontWeight: 900,
                            color: memoryResult.decision.action === "PASS" ? "var(--pass)" : "var(--block)",
                          }}
                        >
                          {memoryResult.decision.action}
                        </p>
                        {memoryResult.decision.action !== "PASS" ? (
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                            Scalio remembered your preference and caught the violation.
                          </p>
                        ) : (
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                            This creative didn't trigger the remembered rule — it genuinely doesn't have that defect.
                          </p>
                        )}
                        <ScorecardView
                          scorecard={memoryResult.scorecard}
                          sourceProvider={memoryResult.current_fixture?.source_provider}
                          memoryInfluencedDimension={memoryConstraintApplied ? "compliance" : null}
                          memoryConstraintLabel={memoryRuleText}
                        />
                        <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => setStep(5)}>
                          Next
                        </button>
                      </>
                    )}
                  </div>
                  <LiveAgentExecution events={memoryEvents} done={memoryDone} />
                </div>
              )}
            </>
          )}
        </StepCard>
      )}

      {/* FINAL RESULTS */}
      {step >= 5 && (
        <StepCard n={5} title="What Scalio just did">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <SummaryStat label="Content checks" value={contentChecks} />
            <SummaryStat label="Problems caught" value={problemsCaught} />
            <SummaryStat label="Automatically remediated" value={automaticallyRemediated} />
            <SummaryStat label="Passed after re-check" value={passedAfterRecheck} />
            <SummaryStat label="Brand preference learned" value={preferencesLearned} />
            <SummaryStat label="Provider decisions" value={providerDecisions} />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
            No manual routing. No manual re-checking. No guessing.
          </p>
          <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
            Every number above comes from this session's real streamed executions.
          </p>
        </StepCard>
      )}

      {/* AUTO-ROUTE BONUS */}
      {step >= 5 && <RouterPanel onRouted={() => setBonusRouted(true)} />}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card-raised" style={{ padding: "16px 24px", minWidth: 130 }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: "#111827" }}>{value}</div>
      <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
    </div>
  );
}
