import { useEffect, useState } from "react";
import type { TraceEvent } from "../types";

export default function TracePanel({ trace, animate = false }: { trace: TraceEvent[]; animate?: boolean }) {
  const [visibleCount, setVisibleCount] = useState(animate ? 0 : trace.length);

  useEffect(() => {
    if (!animate) {
      setVisibleCount(trace.length);
      return;
    }
    setVisibleCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= trace.length) clearInterval(interval);
    }, 220);
    return () => clearInterval(interval);
  }, [trace, animate]);

  return (
    <div className="bg-card" style={{ padding: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
        Trace
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {trace.slice(0, visibleCount).map((t) => (
          <div
            key={t.step}
            style={{
              display: "grid",
              gridTemplateColumns: "24px 130px 1fr auto",
              gap: 12,
              padding: "8px 10px",
              borderRadius: 8,
              alignItems: "baseline",
              transition: "background 0.15s ease",
            }}
            className="trace-row"
          >
            <span className="mono text-muted" style={{ fontSize: 12 }}>
              {t.step}
            </span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{t.component}</span>
            <span className="text-muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t.output_summary}
            </span>
            <span className="mono" style={{ fontSize: 12, color: "var(--accent)" }}>
              {t.latency_ms.toFixed(1)}ms
            </span>
          </div>
        ))}
        {trace.length === 0 && <p className="text-muted" style={{ fontSize: 13 }}>No trace yet.</p>}
      </div>
      <style>{`.trace-row:hover { background: var(--accent-bg); }`}</style>
    </div>
  );
}
