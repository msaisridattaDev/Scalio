// Mirrors backend/app/defect_rules.py's extraction — turns the real VLM
// defect_detection detail string into a category + a friendly headline.
// Never used until the real evaluate/decide events have actually arrived.

const DETAIL_RE = /^(?:\[severity:(?:minor|major)\]\s*)?([a-zA-Z_]+):\s*(.*)$/;

const CATEGORY_LABEL: Record<string, string> = {
  hand_distortion: "Hand distortion",
  text_defect: "Text rendering defect",
  prompt_leakage: "Text rendering defect",
};

const HEADLINE: Record<string, string> = {
  hand_distortion: "Distorted hands detected.",
  text_defect: "Text rendering problem detected.",
  prompt_leakage: "Text rendering problem detected.",
};

const KNOWN_CATEGORIES = new Set(["hand_distortion", "text_defect", "prompt_leakage"]);

export function extractDefectType(detail: string): string {
  const match = DETAIL_RE.exec(detail);
  if (!match) return "general_content_regeneration";
  const [, defectType, description] = match;
  if (KNOWN_CATEGORIES.has(defectType.toLowerCase())) return defectType.toLowerCase();

  const lowered = description.toLowerCase();
  if (lowered.includes("hand") || lowered.includes("finger") || lowered.includes("limb")) return "hand_distortion";
  if (lowered.includes("prompt") || lowered.includes("text") || lowered.includes("caption")) return "text_defect";
  if (!["major", "minor", "none"].includes(defectType.toLowerCase())) return defectType;
  return "general_content_regeneration";
}

export function categoryLabel(detail: string): string {
  return CATEGORY_LABEL[extractDefectType(detail)] ?? "Content defect";
}

export function headlineFor(detail: string): string {
  return HEADLINE[extractDefectType(detail)] ?? "A content defect was detected.";
}
