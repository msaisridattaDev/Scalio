import { useState } from "react";
import type { Decision, ScoreCard } from "../types";
import ScorecardView from "./ScorecardView";
import DecisionBadge from "./DecisionBadge";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const BRAND_ID = "priya-sarees";

type ProviderStats = {
  runs: number;
  defects: number;
  hand_distortion_runs: number;
  defect_rate: number;
  hand_distortion_rate: number;
};

type RoutedResponse = {
  selected_provider: string;
  selection_reason: string;
  leaderboard: Record<string, ProviderStats>;
  sample_note: string;
  scorecard: ScoreCard;
  decision: Decision;
  current_fixture: { source_provider: string } | null;
};

export default function RouterPanel({ onRouted }: { onRouted?: () => void } = {}) {
  const [result, setResult] = useState<RoutedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const run = async () => {
    setLoading(true);
    setThinking(true);
    try {
      const [res] = await Promise.all([
        fetch(`${API_BASE}/brands/${BRAND_ID}/generate-routed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content_type_hint: "hand_heavy_product_shot" }),
        }),
        new Promise((r) => setTimeout(r, 700)),
      ]);
      if (!res.ok) throw new Error(`generate-routed failed: ${res.status}`);
      setResult(await res.json());
      onRouted?.();
    } catch (err) {
      alert(`Auto-route failed: ${err}`);
    } finally {
      setLoading(false);
      setThinking(false);
    }
  };

  return (
    <section className="bg-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
      <div>
        <span className="pill pill-neutral">Bonus</span>
        <h2 style={{ margin: "8px 0 4px", fontSize: 24, fontWeight: 800 }}>And it gets smarter.</h2>
        <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>Who should generate the next one?</p>
        <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
          Example scenario: <strong>hand-heavy product shot</strong>
        </p>
      </div>

      {!result && (
        <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={run} disabled={loading}>
          {loading ? "Checking provider history..." : "Run auto-route"}
        </button>
      )}

      {thinking && !result && (
        <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>📊 Checking provider history...</p>
      )}

      {result && (
        <>
          <div className="bg-card-raised" style={{ padding: 16 }}>
            <p className="text-muted" style={{ margin: "0 0 4px", fontSize: 12 }}>
              {result.selected_provider[0].toUpperCase() + result.selected_provider.slice(1)} — best historical result
            </p>
            <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>
              {result.selected_provider[0].toUpperCase() + result.selected_provider.slice(1)} selected automatically
            </p>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{result.selection_reason}</p>
          </div>

          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
            Generate → Evaluate → <span style={{ color: result.decision.action === "PASS" ? "var(--pass)" : "var(--block)" }}>{result.decision.action}</span>
          </p>

          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, alignSelf: "flex-start" }}
            onClick={() => setShowLeaderboard((v) => !v)}
          >
            {showLeaderboard ? "Hide" : "Show"} provider history & technical detail
          </button>

          {showLeaderboard && (
            <>
              <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{result.sample_note}</p>
              <div className="bg-card-raised" style={{ padding: 16 }}>
                <p className="text-muted" style={{ margin: "0 0 8px", fontSize: 12 }}>Provider leaderboard</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(result.leaderboard).map(([provider, stats]) => (
                    <div key={provider} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>{provider}</span>
                      <span className="text-muted">
                        {stats.runs} runs · {Math.round(stats.hand_distortion_rate * 100)}% hand-distortion
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <ScorecardView scorecard={result.scorecard} sourceProvider={result.current_fixture?.source_provider} />
              <DecisionBadge decision={result.decision} />
            </>
          )}

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>The agent doesn't just evaluate content.</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--accent)" }}>
              It decides what should happen next.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
