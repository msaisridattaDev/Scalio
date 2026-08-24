"""Turns a real evaluator defect finding into a routing hint or a brand-memory
rule. Shared by graph.py (routing) and main.py (feedback -> memory) so both
derive from the same source of truth: the VLM's actual output, never from
which fixture/image was involved.
"""

import re

_DEFECT_TYPE_RE = re.compile(r"^(?:\[severity:(?:minor|major)\]\s*)?([a-zA-Z_]+):\s*(.*)$")

_MEMORY_RULES = {
    "hand_distortion": "Avoid distorted or anatomically incorrect hands in generated marketing creatives.",
    "text_defect": "Avoid AI generation prompt or meta-text leaking into the final creative.",
    "prompt_leakage": "Avoid AI generation prompt or meta-text leaking into the final creative.",
}


_KNOWN_CATEGORIES = {"hand_distortion", "text_defect", "prompt_leakage"}


def extract_defect_type_and_description(detail: str) -> tuple[str, str]:
    match = _DEFECT_TYPE_RE.match(detail)
    if not match:
        return "general_content_regeneration", detail

    defect_type, description = match.group(1), match.group(2)

    # Trust defect_type only when the VLM already used one of our known
    # canonical categories. Otherwise — whether it echoed the severity word
    # ("major"/"minor") or returned some other synonym we don't canonicalize
    # (e.g. "anatomical_defect") — read the actual description instead of
    # routing/remembering on a label we don't recognize.
    if defect_type.lower() in _KNOWN_CATEGORIES:
        return defect_type.lower(), description

    lowered = description.lower()
    if "hand" in lowered or "finger" in lowered or "limb" in lowered:
        return "hand_distortion", description
    if "prompt" in lowered or "text" in lowered or "caption" in lowered:
        return "text_defect", description
    if defect_type.lower() not in ("major", "minor", "none"):
        return defect_type, description
    return "general_content_regeneration", description


def extract_defect_type(detail: str) -> str:
    return extract_defect_type_and_description(detail)[0]


def memory_rule_for(defect_type: str, description: str) -> str:
    return _MEMORY_RULES.get(defect_type, f"Avoid recurrence of: {description.strip()}")
