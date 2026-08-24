import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export default function FeedbackControls({
  brandId,
  fixtureId,
  defectDetail,
  buttonLabel,
  onFeedbackWritten,
}: {
  brandId: string;
  fixtureId: string;
  /** Raw defect_detection scorecard dimension detail from the real run being rejected. */
  defectDetail: string;
  buttonLabel: string;
  onFeedbackWritten: (ruleText: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [lastWritten, setLastWritten] = useState<string | null>(null);

  const reject = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/brands/${brandId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixture_id: fixtureId, verdict: "reject", defect_detail: defectDetail }),
      });
      const data = await res.json();
      if (data.written) {
        setLastWritten(data.entry.value);
        onFeedbackWritten(data.entry.value);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button className="btn btn-primary" disabled={submitting || !!lastWritten} onClick={reject}>
        {submitting ? "Remembering..." : lastWritten ? "Remembered" : buttonLabel}
      </button>
      {lastWritten && (
        <p style={{ fontSize: 13, color: "var(--pass)", margin: 0 }}>
          Written to brand memory: "{lastWritten}"
        </p>
      )}
    </div>
  );
}
