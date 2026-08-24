import type { ScoreCard } from "../types";

export default function ScorecardView({
  scorecard,
  memoryInfluencedDimension,
  memoryConstraintLabel,
  sourceProvider,
}: {
  scorecard: ScoreCard;
  memoryInfluencedDimension?: string | null;
  memoryConstraintLabel?: string;
  sourceProvider?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sourceProvider && (
        <span className="pill pill-neutral" style={{ alignSelf: "flex-start", fontSize: 11 }}>
          Source: {sourceProvider[0].toUpperCase() + sourceProvider.slice(1)}
        </span>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {scorecard.dimensions.map((d) => (
          <div
            key={d.name}
            className="bg-card-raised"
            style={{ padding: "10px 14px", minWidth: 180, flex: "1 1 220px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{d.name.replace(/_/g, " ")}</span>
              <span className={`pill ${d.passed ? "pill-pass" : "pill-block"}`} style={{ fontSize: 11, padding: "2px 8px" }}>
                {d.passed ? "pass" : "fail"}
              </span>
            </div>
            <p className="text-muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
              {d.detail}
              {d.score !== null && ` (${d.score}/5)`}
            </p>
            {memoryInfluencedDimension === d.name && (
              <p style={{ fontSize: 12, margin: "6px 0 0", color: "var(--accent)" }}>
                🧠 Influenced by brand memory{memoryConstraintLabel ? `: ${memoryConstraintLabel}` : ""}
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="text-muted" style={{ fontSize: 13, marginTop: 8 }}>{scorecard.overall_rationale}</p>
    </div>
  );
}
