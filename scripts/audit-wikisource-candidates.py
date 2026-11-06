#!/usr/bin/env python3
"""Audit a pinned Arabic Wikisource public-domain release without importing full books.

This is a candidate-discovery tool only. It does not write library books or change
the live catalogue. It deliberately excludes poetry, Quran/scripture entries,
the works-life50 tier, incomplete works and malformed residual wikitext.
"""

from __future__ import annotations

import json
import os
from collections import Counter, defaultdict

DATASET_ID = "Bayanat-Labs/arabic-wikisource-pd"
DATASET_CONFIG = "works-pd-core"
DATASET_REVISION = "7f7de3a3e95e3f4e0e29c72588fd73ad2a636ccd"
SOURCE_LICENSE = "CC BY-SA 4.0"
SOURCE_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/"
ALLOWED_GENRES = {
    "hadith", "tafsir", "fiqh", "creed", "sufism",
    "history", "biography", "language", "philosophy", "science", "essay",
}
GENRE_ORDER = [
    "hadith", "tafsir", "fiqh", "creed", "sufism",
    "history", "biography", "language", "philosophy", "science", "essay",
]
MIN_WORDS = 8_000
MAX_WORDS = 650_000
MIN_CHAPTERS = 3
TARGET_WORDS = 100_000
MAX_PER_GENRE = 12
INCOMPLETE_MARKERS = ("غير مكتمل", "غير مكتملة", "incomplete", "unfinished")


def _integer(value, default=0):
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return default


def _quality_levels(proofreading):
    levels = (proofreading or {}).get("quality_levels") or {}
    return {str(level): _integer(levels.get(str(level), levels.get(level, 0))) for level in range(5)}


def _has_incomplete_category(categories):
    for category in categories or []:
        value = str(category or "").strip().lower()
        if any(marker in value for marker in INCOMPLETE_MARKERS):
            return True
    return False


def is_candidate(row):
    """Strict metadata/content screen for a prose work in the pinned PD-core tier."""
    if row.get("tier") != DATASET_CONFIG:
        return False
    if row.get("pd_rule") != "all-died-by-1955":
        return False
    if _integer(row.get("latest_death_year"), 9999) > 1955:
        return False
    if row.get("source_license") != SOURCE_LICENSE:
        return False
    if row.get("source_license_url") != SOURCE_LICENSE_URL:
        return False
    if row.get("genre") not in ALLOWED_GENRES:
        return False
    if not str(row.get("id") or "").strip():
        return False
    if not str(row.get("title") or "").strip() or not str(row.get("author") or "").strip():
        return False
    if not str(row.get("url") or "").startswith("https://ar.wikisource.org/"):
        return False
    if not str(row.get("history_url") or "").startswith("https://ar.wikisource.org/"):
        return False

    words = _integer(row.get("words"))
    chapter_count = _integer(row.get("n_chapters"))
    if words < MIN_WORDS or words > MAX_WORDS or chapter_count < MIN_CHAPTERS:
        return False
    if _has_incomplete_category(row.get("categories")):
        return False

    persons = row.get("persons") or []
    named_credits = [
        person for person in persons
        if str(person.get("role") or "").lower() in {"author", "translator", "editor"}
        and str(person.get("name") or "").strip()
    ]
    if not any(str(person.get("role") or "").lower() == "author" for person in named_credits):
        return False
    if any(_integer(person.get("death_year"), 9999) > 1955 or person.get("death_year") is None for person in named_credits):
        return False
    if row.get("is_translation") and not any(
        str(person.get("role") or "").lower() == "translator" for person in named_credits
    ):
        return False

    proofreading = row.get("proofreading") or {}
    if _integer(proofreading.get("scan_pages_missing")) > 0:
        return False
    if _integer(proofreading.get("unresolved_transclusions")) > 0:
        return False
    levels = _quality_levels(proofreading)
    # Level 1 is problematic and level 2 is a page without text in this release.
    if levels["1"] > 0 or levels["2"] > 0:
        return False

    text_raw = str(row.get("text_raw") or "")
    if not text_raw.strip() or "{{" in text_raw or "[[" in text_raw:
        return False

    chapters = row.get("chapters") or []
    if len(chapters) != chapter_count:
        return False
    if any(not str(chapter.get("text") or "").strip() for chapter in chapters):
        return False

    source_pages = row.get("source_pages") or []
    if len(source_pages) < MIN_CHAPTERS:
        return False
    if _integer(row.get("n_source_pages")) != len(source_pages):
        return False
    if any(not page.get("url") or not page.get("revision_id") for page in source_pages):
        return False

    return True


def candidate_score(row):
    """Prefer authoritative genre evidence, stronger scan proofing and balanced length."""
    genre_source = row.get("genre_source")
    source_score = {
        "wikidata-P136": 3,
        "wikidata-P31": 2,
        "category": 1,
        "text": 0,
    }.get(genre_source, 0)
    levels = _quality_levels(row.get("proofreading"))
    proofread_pages = levels["3"] + levels["4"]
    total_scanned = sum(levels.values())
    proofread_ratio = proofread_pages / total_scanned if total_scanned else 0.0
    words = _integer(row.get("words"))
    source_pages = _integer(row.get("n_source_pages"))
    return (source_score, proofread_ratio, source_pages, -abs(words - TARGET_WORDS))


def deduplicate_candidates(rows):
    """Keep the highest-scoring work per upstream near_dup_group; keep ungrouped works."""
    ordered = sorted(rows, key=candidate_score, reverse=True)
    seen_groups = set()
    selected = []
    for row in ordered:
        group = str(row.get("near_dup_group") or "").strip()
        if group and group in seen_groups:
            continue
        if group:
            seen_groups.add(group)
        selected.append(row)
    return selected


def public_summary(row):
    proofreading = row.get("proofreading") or {}
    source_pages = row.get("source_pages") or []
    return {
        "id": row.get("id"),
        "title": row.get("title"),
        "author": row.get("author"),
        "genre": row.get("genre"),
        "genre_source": row.get("genre_source"),
        "words": _integer(row.get("words")),
        "chapters": _integer(row.get("n_chapters")),
        "latest_death_year": _integer(row.get("latest_death_year")),
        "pd_rule": row.get("pd_rule"),
        "is_translation": bool(row.get("is_translation")),
        "near_dup_group": row.get("near_dup_group"),
        "near_dup_size": _integer(row.get("near_dup_size")),
        "proofreading": {
            "scan_pages_transcluded": _integer(proofreading.get("scan_pages_transcluded")),
            "scan_pages_missing": _integer(proofreading.get("scan_pages_missing")),
            "unresolved_transclusions": _integer(proofreading.get("unresolved_transclusions")),
            "quality_levels": _quality_levels(proofreading),
        },
        # Preserve every source-page revision and all credited people for review.
        # The previous five-page preview was insufficient for complete provenance checks.
        "source_pages": source_pages,
        "persons": row.get("persons") or [],
        "categories": row.get("categories") or [],
        "source_record_fields": sorted(str(key) for key in row.keys()),
        "is_incomplete": row.get("is_incomplete"),
        "text_preview": str(row.get("text_raw") or "")[:1200],
        "raw_text_characters": len(str(row.get("text_raw") or "")),
        "tier": row.get("tier"),
        "pd_reason": row.get("pd_reason"),
        "first_publication_year": row.get("first_publication_year"),
        "publication_year": row.get("publication_year"),
        "author_death_year": row.get("author_death_year"),
        "author_qid": row.get("author_qid"),
        "wikidata_qid": row.get("wikidata_qid"),
        "diacritization_ratio": row.get("diacritization_ratio"),
        "footnotes": _integer(row.get("footnotes")),
        "chars": _integer(row.get("chars")),
        "poetry_lines": _integer(row.get("poetry_lines")),
        "century_ah_ce": row.get("century_ah_ce"),
        "death_century_ah": row.get("death_century_ah"),
        "death_century_ce": row.get("death_century_ce"),
        "genre_labels": row.get("genre_labels") or [],
        "language_labels": row.get("language_labels") or [],
        "dump_date": row.get("dump_date"),
        "n_source_pages": len(source_pages),
        "url": row.get("url"),
        "history_url": row.get("history_url"),
        "source_license": row.get("source_license"),
        "source_license_url": row.get("source_license_url"),
        "text_attribution": "Arabic Wikisource contributors; transcribed text licensed CC BY-SA 4.0.",
        "dataset_name": "Arabic Wikisource Public-Domain Works",
        "dataset_version": "0.1.0",
        "dataset_url": "https://huggingface.co/datasets/Bayanat-Labs/arabic-wikisource-pd",
        "dataset_revision": DATASET_REVISION,
        "dataset_citation": "Bayanat Labs (2026). Arabic Wikisource Public-Domain Works, version 0.1.0. Text by Arabic Wikisource contributors, CC BY-SA 4.0.",
    }


def main():
    from datasets import load_dataset

    print("Loading pinned Arabic Wikisource works-pd-core stream: " + DATASET_REVISION)
    stream = load_dataset(
        DATASET_ID,
        name=DATASET_CONFIG,
        split="train",
        streaming=True,
        revision=DATASET_REVISION,
    )

    scanned = 0
    candidates = []
    for row in stream:
        scanned += 1
        if is_candidate(row):
            candidates.append(row)
        if scanned % 5_000 == 0:
            print("Scanned " + str(scanned) + " rows; eligible candidates so far: " + str(len(candidates)))

    unique = deduplicate_candidates(candidates)
    counts = Counter(row.get("genre") for row in candidates)
    unique_counts = Counter(row.get("genre") for row in unique)
    print("SCAN_COMPLETE rows=" + str(scanned))
    print("ELIGIBLE_BEFORE_DEDUP=" + str(len(candidates)))
    print("ELIGIBLE_AFTER_NEAR_DUP_DEDUP=" + str(len(unique)))
    print("GENRE_COUNTS=" + json.dumps(dict(counts), ensure_ascii=False, sort_keys=True))
    print("GENRE_COUNTS_AFTER_DEDUP=" + json.dumps(dict(unique_counts), ensure_ascii=False, sort_keys=True))

    report = []
    for genre in GENRE_ORDER:
        group = [row for row in unique if row.get("genre") == genre]
        group.sort(key=candidate_score, reverse=True)
        report.extend(public_summary(row) for row in group[:MAX_PER_GENRE])

    report_path = "wikisource-candidate-report.jsonl"
    with open(report_path, "w", encoding="utf-8") as report_file:
        for item in report:
            report_file.write(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n")
    print("WIKISOURCE_CANDIDATE_REPORT_FILE=" + report_path)

    print("WIKISOURCE_CANDIDATE_REPORT_BEGIN")
    for item in report:
        print(json.dumps(item, ensure_ascii=False, separators=(",", ":")))
    print("WIKISOURCE_CANDIDATE_REPORT_END")

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as summary:
            summary.write("# Arabic Wikisource PD candidate audit\n\n")
            summary.write(f"- Pinned revision: {DATASET_REVISION}\n")
            summary.write(f"- Rows scanned: {scanned:,}\n")
            summary.write(f"- Eligible before near-duplicate filtering: {len(candidates):,}\n")
            summary.write(f"- Eligible after near-duplicate filtering: {len(unique):,}\n\n")
            summary.write("| Genre | Eligible | After dedup | Candidates shown |\n|---|---:|---:|---:|\n")
            for genre in GENRE_ORDER:
                shown = sum(1 for item in report if item["genre"] == genre)
                summary.write(f"| {genre} | {counts[genre]} | {unique_counts[genre]} | {shown} |\n")
            summary.write("\n## Candidate titles\n\n")
            for item in report:
                summary.write(
                    f"- **{item['title']}** — {item['author']} "
                    f"({item['genre']}, {item['words']:,} words, {item['chapters']} chapters) "
                    f"[source]({item['url']})\n"
                )


if __name__ == "__main__":
    main()
