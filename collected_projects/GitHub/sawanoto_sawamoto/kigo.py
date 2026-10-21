"""Validate the editable calendar before generating public HTML."""
import calendar
import json
import re
from pathlib import Path
from urllib.parse import urlparse


def load_kigo(path: Path) -> dict:
    def unique_keys(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"Duplicate kigo JSON key: {key}")
            result[key] = value
        return result

    data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_keys)
    expected = {f"{month:02}-{day:02}" for month in range(1, 13)
                for day in range(1, calendar.monthrange(2024, month)[1] + 1)}
    if set(data) != expected:
        raise ValueError(f"Kigo calendar mismatch: missing={expected-set(data)}, extra={set(data)-expected}")
    terms = set()
    fields = {"term", "reading", "season", "summary", "scene", "source"}
    for date, entry in data.items():
        if not isinstance(entry, dict) or set(entry) != fields:
            raise ValueError(f"Invalid kigo fields: {date}")
        if any(not isinstance(v, str) or not v.strip() for v in entry.values()):
            raise ValueError(f"Empty kigo field: {date}")
        if entry["term"] in terms:
            raise ValueError(f"Duplicate kigo: {entry['term']}")
        terms.add(entry["term"])
        if entry["season"] not in {"春", "夏", "秋", "冬", "新年"}:
            raise ValueError(f"Invalid season: {date}")
        if not re.fullmatch(r"[ぁ-ゖー]+", entry["reading"]):
            raise ValueError(f"Use hiragana for kigo readings: {date}")
        source = urlparse(entry["source"])
        if source.scheme != "https" or not source.netloc:
            raise ValueError(f"Invalid source URL: {date}")
    return data
