import uuid
from datetime import datetime, timezone

from app.models import BrandKit, MemoryEntry

_LANGUAGE_NAMES = {"hi": "Hindi", "en": "English"}

# In-process only — resets on restart. This is a demo/POC: memory needs to
# work correctly within a live session (feedback -> updated rules -> next
# eval), not survive process restarts.
_STORE: dict[str, list[MemoryEntry]] = {}


def _describe_languages(languages: list[str]) -> str:
    names = [_LANGUAGE_NAMES.get(lang, lang) for lang in languages]
    if len(names) <= 1:
        return names[0] if names else ""
    return " and ".join([", ".join(names[:-1]), names[-1]]) if len(names) > 2 else " and ".join(names)


def get_memory(brand_id: str) -> list[MemoryEntry]:
    return sorted(_STORE.get(brand_id, []), key=lambda e: e.created_at)


def write_memory(entry: MemoryEntry) -> None:
    entry = entry.model_copy(
        update={
            "id": entry.id or str(uuid.uuid4()),
            "created_at": entry.created_at or datetime.now(timezone.utc).isoformat(),
        }
    )
    _STORE.setdefault(entry.brand_id, []).append(entry)


def get_memory_context_string(brand_id: str) -> str:
    entries = get_memory(brand_id)
    preferences = [e for e in entries if e.type == "semantic"]
    constraints = [e for e in entries if e.type == "procedural"]

    def _fmt(e: MemoryEntry) -> str:
        return f"{e.key.replace('_', ' ')}: {e.value} (source: {e.source}, confidence: {e.confidence})"

    pref_str = "; ".join(_fmt(e) for e in preferences) if preferences else "none yet"
    constraint_str = "; ".join(_fmt(e) for e in constraints) if constraints else "none yet"

    return f"Known brand preferences: {pref_str}. Known constraints: {constraint_str}."


def seed_if_empty(brand_kit: BrandKit) -> None:
    if get_memory(brand_kit.brand_id):
        return
    write_memory(
        MemoryEntry(
            id=str(uuid.uuid4()),
            brand_id=brand_kit.brand_id,
            type="semantic",
            key="caption_language",
            value=_describe_languages(brand_kit.languages),
            confidence="high",
            source="brand_kit",
            created_at=datetime.now(timezone.utc).isoformat(),
        ),
    )
