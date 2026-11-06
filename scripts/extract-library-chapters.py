#!/usr/bin/env python3
"""Extract only selected chapter rows from the pinned public dataset.

This intentionally uses Hugging Face Datasets streaming instead of the Dataset
Viewer /filter endpoint, which can fail with transient Hub authentication 500s.
"""
from __future__ import annotations

import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

from datasets import load_dataset

DATASET = "Bayanat-Labs/open-arabic-books"
COLUMNS = (
    "book_id",
    "chapter_id",
    "chapter_index",
    "source_section",
    "section_type",
    "volume_title",
    "part_title",
    "chapter_label",
    "chapter_title",
    "title",
    "text_raw",
    "footnotes",
    "n_words",
    "n_footnotes",
    "n_images_omitted",
    "n_svg_omitted",
    "n_tables",
    "exact_duplicate_group",
    "near_duplicate_group",
    "attribution",
    "license_quote",
)


def fail(message: str) -> None:
    raise SystemExit(f"Library chapter extraction failed: {message}")


def main() -> None:
    if len(sys.argv) != 3:
        fail("usage: extract-library-chapters.py SELECTED_BOOKS_JSON OUTPUT_JSONL")

    selected_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    payload = json.loads(selected_path.read_text(encoding="utf-8"))
    revision = str(payload.get("datasetRevision") or "").strip()
    selected = payload.get("selected")

    if not revision or not isinstance(selected, list) or not selected:
        fail("selected-books file must contain a pinned datasetRevision and a non-empty selected array")

    expected: dict[str, int] = {}
    expected_attribution: dict[str, str] = {}
    expected_license_quote: dict[str, str] = {}
    for book in selected:
        book_id = str(book.get("book_id") or "").strip()
        chapter_count = int(book.get("n_chapters") or 0)
        if not book_id or chapter_count < 1 or book_id in expected:
            fail(f"invalid or duplicate selected book record: {book_id!r}")
        expected[book_id] = chapter_count
        expected_attribution[book_id] = str(book.get("attribution") or "")
        expected_license_quote[book_id] = str(book.get("license_quote") or "")

    selected_ids = set(expected)
    rows_by_book: dict[str, list[dict[str, Any]]] = defaultdict(list)
    seen_chapters: set[tuple[str, int]] = set()
    scanned = 0
    matched = 0

    print(
        f"Streaming {DATASET} / chapters at pinned revision {revision}; "
        f"extracting {len(selected_ids)} selected books only.",
        flush=True,
    )
    stream = load_dataset(
        DATASET,
        "chapters",
        split="train",
        revision=revision,
        streaming=True,
    )

    for source_row in stream:
        scanned += 1
        book_id = str(source_row.get("book_id") or "")
        if book_id not in selected_ids:
            if scanned % 5000 == 0:
                print(f"Scanned {scanned:,} source sections; matched {matched:,}.", flush=True)
            continue

        chapter_index = int(source_row.get("chapter_index") or 0)
        if chapter_index < 1:
            fail(f"{book_id} has an invalid chapter_index: {chapter_index}")
        key = (book_id, chapter_index)
        if key in seen_chapters:
            fail(f"duplicate chapter index {chapter_index} for {book_id}")
        seen_chapters.add(key)

        attribution = str(source_row.get("attribution") or "")
        license_quote = str(source_row.get("license_quote") or "")
        if expected_attribution[book_id] and attribution != expected_attribution[book_id]:
            fail(f"attribution changed between metadata and chapter rows for {book_id}")
        if expected_license_quote[book_id] and license_quote != expected_license_quote[book_id]:
            fail(f"colophon quotation changed between metadata and chapter rows for {book_id}")

        row = {column: source_row.get(column) for column in COLUMNS}
        rows_by_book[book_id].append(row)
        matched += 1

        if matched % 100 == 0:
            counts = sum(len(rows) for rows in rows_by_book.values())
            print(f"Matched {counts:,} selected sections across {len(rows_by_book)} books.", flush=True)

    total_rows = 0
    ordered_rows: list[dict[str, Any]] = []
    for book_id in expected:
        rows = sorted(rows_by_book.get(book_id, []), key=lambda row: int(row["chapter_index"]))
        if len(rows) != expected[book_id]:
            fail(
                f"{book_id}: metadata expects {expected[book_id]} sections, "
                f"but the pinned chapter dataset yielded {len(rows)}"
            )
        indices = [int(row["chapter_index"]) for row in rows]
        if indices != list(range(1, expected[book_id] + 1)):
            fail(f"{book_id}: chapter indexes are not contiguous from 1 through {expected[book_id]}")
        ordered_rows.extend(rows)
        total_rows += len(rows)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    with output_path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in ordered_rows:
            line = json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n"
            handle.write(line)
            digest.update(line.encode("utf-8"))

    print(
        f"SUCCESS: extracted {total_rows:,} complete source sections for "
        f"{len(expected)} books after scanning {scanned:,} rows. "
        f"JSONL SHA-256: {digest.hexdigest()}",
        flush=True,
    )
    print(
        "Per-book sections: "
        + json.dumps({book_id: len(rows_by_book[book_id]) for book_id in expected}, ensure_ascii=False),
        flush=True,
    )


if __name__ == "__main__":
    main()
