#!/usr/bin/env python3
"""Audit current Wikisource categories for every pinned candidate source page.

This is a live metadata enrichment step, separate from the pinned dataset scan.
It never imports book text. A page whose current revision differs from the
pinned source revision is explicitly marked; current categories must not be
mistaken for historical categories at the pinned revision.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_URL = "https://ar.wikisource.org/w/api.php"
USER_AGENT = "HUKM-Library-Provenance-Audit/1.0 (https://github.com/ifawz40-boop/HUKM)"
BATCH_SIZE = 50
FLAG_MARKERS = (
    "نصوص مجهولة المصدر",
    "غير مكتمل",
    "غير مكتملة",
    "أعمال غير مكتملة",
    "incomplete",
    "unfinished",
    "غير مصحح",
    "غير مصححة",
    "غير مدقق",
    "غير مدققة",
)


def normalize_title(value: str) -> str:
    return " ".join(str(value or "").replace("_", " ").split()).casefold()


def category_flags(categories: list[str]) -> list[str]:
    flags = []
    for category in categories:
        normalized = str(category).replace("تصنيف:", "").strip().casefold()
        if any(marker.casefold() in normalized for marker in FLAG_MARKERS):
            flags.append(str(category))
    return sorted(set(flags))


def chunks(items: list[str], size: int = BATCH_SIZE):
    for start in range(0, len(items), size):
        yield items[start : start + size]


def fetch_json(params: dict, timeout: int = 30) -> dict:
    query = dict(params)
    query.setdefault("action", "query")
    query.setdefault("format", "json")
    query.setdefault("formatversion", "2")
    query.setdefault("maxlag", "5")
    url = API_URL + "?" + urlencode(query, doseq=True)
    request = Request(url, headers={"User-Agent": USER_AGENT})
    last_error = None
    for attempt in range(5):
        try:
            with urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            last_error = exc
            if exc.code not in {429, 500, 502, 503, 504}:
                raise
            retry_after = exc.headers.get("Retry-After")
            delay = int(retry_after) if retry_after and retry_after.isdigit() else min(2 ** attempt, 20)
            time.sleep(delay)
        except (URLError, TimeoutError) as exc:
            last_error = exc
            time.sleep(min(2 ** attempt, 20))
    raise RuntimeError(f"Wikisource API failed after retries: {last_error}")


def fetch_batch(titles: list[str], fetcher=fetch_json) -> dict[str, dict]:
    """Fetch current page categories and last revision IDs for a title batch."""
    params = {
        "prop": "info|categories",
        "inprop": "url",
        "cllimit": "max",
        "redirects": "1",
        "curtimestamp": "1",
        "titles": "|".join(titles),
    }
    result: dict[str, dict] = {}
    while True:
        payload = fetcher(params)
        query = payload.get("query") or {}
        for page in query.get("pages") or []:
            title = page.get("title") or ""
            categories = [
                item.get("title", "")
                for item in (page.get("categories") or [])
                if item.get("title")
            ]
            key = normalize_title(title)
            existing = result.setdefault(key, {
                "title": title,
                "page_id": page.get("pageid"),
                "current_revision_id": page.get("lastrevid"),
                "url": page.get("fullurl"),
                "missing": bool(page.get("missing")),
                "categories": [],
                "flagged_categories": [],
            })
            existing["categories"] = sorted(set(existing["categories"] + categories))
            existing["flagged_categories"] = category_flags(existing["categories"])
        continuation = payload.get("continue")
        if not continuation:
            break
        params.update(continuation)
    return result


def load_candidates(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def audit_candidates(candidates: list[dict], fetcher=fetch_json, pause_seconds: float = 0.1) -> list[dict]:
    page_records: dict[str, dict] = {}
    for candidate in candidates:
        for page in candidate.get("source_pages") or []:
            title = page.get("title")
            if title:
                page_records.setdefault(normalize_title(title), {"title": title, "kind": "source"})
        for person in candidate.get("persons") or []:
            title = person.get("author_page")
            if title:
                page_records.setdefault(normalize_title(title), {"title": title, "kind": "author_profile"})

    titles = [record["title"] for record in page_records.values()]
    live_pages: dict[str, dict] = {}
    failures = []
    batches = list(chunks(titles))
    for index, batch in enumerate(batches):
        try:
            live_pages.update(fetch_batch(batch, fetcher=fetcher))
        except Exception as exc:  # keep a complete failure record; never imply success
            failures.append({"batch": index + 1, "titles": batch, "error": str(exc)})
        if pause_seconds and index + 1 < len(batches):
            time.sleep(pause_seconds)

    audited_at = datetime.now(timezone.utc).isoformat()
    reports = []
    for candidate in candidates:
        pages = []
        for page in candidate.get("source_pages") or []:
            title = page.get("title") or ""
            live = live_pages.get(normalize_title(title))
            if not live:
                pages.append({
                    "title": title,
                    "source_revision_id": page.get("revision_id"),
                    "source_revision_timestamp": page.get("revision_timestamp"),
                    "lookup_status": "not_returned",
                    "categories_snapshot": "current",
                    "categories": [],
                    "flagged_categories": [],
                })
                continue
            source_revision = page.get("revision_id")
            current_revision = live.get("current_revision_id")
            pages.append({
                "title": title,
                "url": page.get("url"),
                "source_revision_id": source_revision,
                "source_revision_timestamp": page.get("revision_timestamp"),
                "current_revision_id": current_revision,
                "revision_matches_pinned_source": (
                    str(source_revision) == str(current_revision)
                    if source_revision is not None and current_revision is not None
                    else None
                ),
                "lookup_status": "missing" if live.get("missing") else "found",
                "categories_snapshot": "current",
                "categories": live.get("categories") or [],
                "flagged_categories": live.get("flagged_categories") or [],
            })
        author_pages = []
        for person in candidate.get("persons") or []:
            title = person.get("author_page")
            if not title:
                continue
            live = live_pages.get(normalize_title(title))
            author_pages.append({
                "person": person.get("name"),
                "role": person.get("role"),
                "title": title,
                "lookup_status": "not_returned" if not live else ("missing" if live.get("missing") else "found"),
                "categories_snapshot": "current",
                "categories": [] if not live else (live.get("categories") or []),
                "flagged_categories": [] if not live else (live.get("flagged_categories") or []),
            })
        missing_count = sum(page["lookup_status"] != "found" for page in pages)
        missing_author_page_count = sum(page["lookup_status"] != "found" for page in author_pages)
        flagged_pages = [
            {"title": page["title"], "categories": page["flagged_categories"]}
            for page in pages if page["flagged_categories"]
        ]
        revision_drift_pages = [
            {"title": page["title"], "source_revision_id": page["source_revision_id"], "current_revision_id": page["current_revision_id"]}
            for page in pages if page.get("revision_matches_pinned_source") is False
        ]
        reports.append({
            "id": candidate.get("id"),
            "title": candidate.get("title"),
            "audit_timestamp": audited_at,
            "categories_snapshot": "current_live_wikisource_categories",
            "source_page_count": len(pages),
            "audited_page_count": len(pages) - missing_count,
            "missing_or_unreturned_page_count": missing_count,
            "missing_author_page_count": missing_author_page_count,
            "flagged_page_count": len(flagged_pages),
            "flagged_pages": flagged_pages,
            "revision_drift_page_count": len(revision_drift_pages),
            "revision_drift_pages": revision_drift_pages,
            "page_audit_status": "complete" if missing_count == 0 and missing_author_page_count == 0 and not failures else "incomplete",
            "source_pages": pages,
            "author_pages": author_pages,
            "batch_failures": failures,
        })
    return reports


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("candidate_report", nargs="?", default="wikisource-candidate-report.jsonl")
    parser.add_argument("--output", default="wikisource-page-category-report.jsonl")
    args = parser.parse_args()

    candidates = load_candidates(args.candidate_report)
    reports = audit_candidates(candidates)
    with open(args.output, "w", encoding="utf-8") as handle:
        for report in reports:
            handle.write(json.dumps(report, ensure_ascii=False, separators=(",", ":")) + "\n")

    total_pages = sum(report["source_page_count"] for report in reports)
    incomplete = sum(report["page_audit_status"] != "complete" for report in reports)
    flagged = sum(report["flagged_page_count"] for report in reports)
    print(f"PAGE_CATEGORY_AUDIT_CANDIDATES={len(reports)}")
    print(f"PAGE_CATEGORY_AUDIT_SOURCE_PAGES={total_pages}")
    print(f"PAGE_CATEGORY_AUDIT_FLAGGED_PAGES={flagged}")
    print(f"PAGE_CATEGORY_AUDIT_INCOMPLETE_BOOKS={incomplete}")
    print(f"PAGE_CATEGORY_AUDIT_REPORT={args.output}")
    return 0 if incomplete == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
