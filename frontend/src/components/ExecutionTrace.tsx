import type { TraceEvent } from "../types";

const NODE_LABEL: Record<string, string> = {
  load_context: "Load brand context",
  evaluate: "Evaluate",
  decide: "Decide",
  select_provider: "Select provider",
  regenerate: "Regenerate",
  repair: "Repair",
};

export default function ExecutionTrace({ trace, visibleCount }: { trace: TraceEvent[]; visibleCount: number }) {
  const visible = trace.slice(0, visibleCount);
  return (
    <div className="bg-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4, minWidth: 260, flex: "1 1 280px" }}>
      <p className="text-muted" style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Live execution trace — real LangGraph run
      </p>
      {visible.length === 0 && <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>Waiting to run...</p>}
      {visible.map((t, i) => {
        const isLast = i === visible.length - 1;
        return (
          <div key={t.step} style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background: isLast ? "var(--accent-bg)" : "transparent",
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  minWidth: 16,
                  paddingTop: 2,
                }}
              >
                {t.step}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{NODE_LABEL[t.component] ?? t.component}</span>
                  <span className="mono text-muted" style={{ fontSize: 10 }}>{t.latency_ms.toFixed(0)}ms</span>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text)", wordBreak: "break-word" }}>
                  {t.output_summary}
                </p>
              </div>
            </div>
            {!isLast && (
              <div style={{ marginLeft: 25, color: "var(--text-muted)", fontSize: 12, lineHeight: 1 }}>↓</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
