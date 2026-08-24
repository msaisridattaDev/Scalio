import type { Decision } from "../types";

const PILL_CLASS: Record<Decision["action"], string> = {
  PASS: "pill-pass",
  AUTO_REPAIR: "pill-repair",
  REGENERATE: "pill-regenerate",
  ESCALATE: "pill-escalate",
  BLOCK: "pill-block",
};

export default function DecisionBadge({ decision }: { decision: Decision }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span className={`pill ${PILL_CLASS[decision.action]}`} style={{ fontSize: 16, padding: "8px 20px", alignSelf: "flex-start" }}>
        {decision.action.replace("_", " ")}
      </span>
      <p className="text-muted" style={{ margin: 0, fontSize: 14, maxWidth: 480 }}>
        {decision.reason}
      </p>
    </div>
  );
}
