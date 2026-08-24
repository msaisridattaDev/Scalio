import type { GenerateResponse } from "../types";

export type StreamEvent = { node: string; state: GenerateResponse };

const NODE_LABEL: Record<string, string> = {
  load_context: "load_context",
  evaluate: "evaluate",
  decide: "decide",
  select_provider: "select_provider",
  regenerate: "regenerate",
  repair: "repair",
};

// Mirrors the backend's real conditional edges (_route_after_decide in
// graph.py) so the "currently running" row is a deterministic consequence
// of what has already actually happened, never a guess.
export function predictNextNode(events: StreamEvent[]): string | null {
  if (events.length === 0) return "load_context";
  const last = events[events.length - 1];
  switch (last.node) {
    case "load_context":
      return "evaluate";
    case "evaluate":
      return "decide";
    case "decide": {
      const { decision, attempt } = last.state;
      if ((attempt ?? 0) >= 1) return null;
      if (decision?.action === "AUTO_REPAIR") return "repair";
      if (decision?.action === "REGENERATE") return "select_provider";
      return null;
    }
    case "select_provider":
      return "regenerate";
    case "repair":
    case "regenerate":
      return "evaluate";
    default:
      return null;
  }
}

function NodeDetail({ node, state }: { node: string; state: GenerateResponse }) {
  if (node === "load_context") {
    return (
      <p className="text-muted" style={{ margin: "1px 0 0", fontSize: 11 }}>
        brand_id={state.brand_id} · memory_context: {state.memory_context.length} chars retrieved
      </p>
    );
  }

  if (node === "evaluate") {
    const dims = state.scorecard?.dimensions ?? [];
    const failed = dims.filter((d) => !d.passed);
    return (
      <div style={{ marginTop: 1 }}>
        <p className="text-muted" style={{ margin: 0, fontSize: 11 }}>model: gpt-4o · temperature: 0</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
          {dims.map((d) => (
            <span
              key={d.name}
              className="mono"
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 4,
                background: d.passed ? "var(--pass-bg)" : "var(--block-bg)",
                color: d.passed ? "var(--pass)" : "var(--block)",
              }}
            >
              {d.name}
            </span>
          ))}
        </div>
        {failed.length > 0 && (
          <p className="text-muted" style={{ margin: "3px 0 0", fontSize: 11 }}>
            failed: {failed.map((d) => d.name).join(", ")}
          </p>
        )}
      </div>
    );
  }

  if (node === "decide") {
    return (
      <p className="text-muted" style={{ margin: "1px 0 0", fontSize: 11 }}>
        action: <strong style={{ color: "var(--text)" }}>{state.decision.action}</strong> · confidence: {state.decision.confidence}
      </p>
    );
  }

  if (node === "select_provider" && state.provider_selection) {
    const sel = state.provider_selection;
    return (
      <div style={{ marginTop: 1 }}>
        <p className="text-muted" style={{ margin: 0, fontSize: 11 }}>
          content_type_hint: <span className="mono">{sel.content_type_hint}</span>
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 3 }}>
          {Object.entries(sel.leaderboard).map(([provider, stats]) => (
            <div key={provider} style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
              <span style={{ fontWeight: provider === sel.selected_provider ? 800 : 400, color: provider === sel.selected_provider ? "var(--accent)" : "var(--text-muted)" }}>
                {provider}
              </span>
              <span className="mono text-muted">
                {stats.runs} runs · {Math.round(stats.defect_rate * 100)}% defect rate
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (node === "regenerate" || node === "repair") {
    return (
      <p className="text-muted" style={{ margin: "1px 0 0", fontSize: 11 }}>
        ⚠ simulated/staged output — no live generation call
      </p>
    );
  }

  return null;
}

export default function LiveAgentExecution({ events, done }: { events: StreamEvent[]; done: boolean }) {
  const current = done ? null : predictNextNode(events);

  return (
    <div className="bg-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 2, minWidth: 300, flex: "1 1 320px", alignSelf: "flex-start" }}>
      <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        Live agent execution
      </p>

      {events.length === 0 && !current && (
        <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>Waiting to run...</p>
      )}

      {events.map((e, i) => {
        const trace = e.state.trace;
        const step = trace[trace.length - 1];
        return (
          <div key={i}>
            <Row status="done" label={NODE_LABEL[e.node] ?? e.node} latencyMs={step?.latency_ms}>
              <NodeDetail node={e.node} state={e.state} />
            </Row>
            {(i < events.length - 1 || current) && <Connector />}
          </div>
        );
      })}

      {current && <Row status="running" label={NODE_LABEL[current] ?? current} />}

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
        <p className="text-muted" style={{ margin: 0, fontSize: 11 }}>
          Current node: <strong style={{ color: "var(--text)" }}>{current ?? (events.length ? "done" : "—")}</strong>
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .lae-spin { display: inline-block; animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

function Connector() {
  return <div style={{ marginLeft: 11, color: "var(--border)", fontSize: 12, lineHeight: "16px" }}>│</div>;
}

function Row({
  status,
  label,
  latencyMs,
  children,
}: {
  status: "done" | "running" | "pending";
  label: string;
  latencyMs?: number;
  children?: React.ReactNode;
}) {
  const icon = status === "done" ? "✓" : status === "running" ? "⟳" : "○";
  const iconColor = status === "done" ? "var(--pass)" : status === "running" ? "var(--accent)" : "var(--text-muted)";
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "4px 0" }}>
      <span
        className={status === "running" ? "lae-spin" : undefined}
        style={{ color: iconColor, fontWeight: 800, fontSize: 14, width: 16, textAlign: "center", flexShrink: 0, marginTop: 1 }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span className="mono" style={{ fontSize: 13, fontWeight: status === "running" ? 700 : 600, color: status === "pending" ? "var(--text-muted)" : "var(--text)" }}>
            {label}
          </span>
          {status === "done" && latencyMs !== undefined && (
            <span className="mono text-muted" style={{ fontSize: 11 }}>{(latencyMs / 1000).toFixed(1)}s</span>
          )}
          {status === "running" && <span className="mono text-muted" style={{ fontSize: 11 }}>...</span>}
        </div>
        {children}
      </div>
    </div>
  );
}
