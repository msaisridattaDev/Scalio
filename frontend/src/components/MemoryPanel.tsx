import { useEffect, useState } from "react";
import type { MemoryEntry } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

const CONFIDENCE_CLASS: Record<MemoryEntry["confidence"], string> = {
  high: "pill-pass",
  medium: "pill-escalate",
  low: "pill-neutral",
};

export default function MemoryPanel({ brandId, refreshKey }: { brandId: string; refreshKey?: number }) {
  const [entries, setEntries] = useState<MemoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/brands/${brandId}/memory`)
      .then((res) => res.json())
      .then(setEntries)
      .catch((err) => setError(String(err)));
  }, [brandId, refreshKey]);

  return (
    <div>
      {error && <p style={{ color: "var(--block)" }}>error: {error}</p>}
      {!entries && !error && <p className="text-muted">loading...</p>}
      {entries && entries.length === 0 && <p className="text-muted">No memory entries yet.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries?.map((e) => (
          <div
            key={e.id}
            className="bg-card-raised"
            style={{
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <strong style={{ fontSize: 14 }}>{e.key.replace(/_/g, " ")}</strong>
              <span className="text-muted" style={{ fontSize: 13 }}>: {e.value}</span>
              <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                source: {e.source}
              </div>
            </div>
            <span className={`pill ${CONFIDENCE_CLASS[e.confidence]}`}>{e.confidence}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
