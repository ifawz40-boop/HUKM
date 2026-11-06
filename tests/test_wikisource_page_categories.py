import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "audit-wikisource-page-categories.py"
SPEC = importlib.util.spec_from_file_location("wikisource_page_categories", SCRIPT)
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


class PageCategoryAuditTests(unittest.TestCase):
    def test_normalize_title_handles_underscores_and_whitespace(self):
        self.assertEqual(AUDIT.normalize_title(" فقه_اللغة   وسر العربية "), "فقه اللغة وسر العربية")

    def test_category_flags_detects_unknown_source_and_incomplete(self):
        flags = AUDIT.category_flags([
            "تصنيف:نصوص مجهولة المصدر",
            "تصنيف:صفحات تحوي قالب ترويسة",
            "تصنيف:أعمال غير مكتملة",
        ])
        self.assertIn("تصنيف:نصوص مجهولة المصدر", flags)
        self.assertIn("تصنيف:أعمال غير مكتملة", flags)
        self.assertEqual(len(flags), 2)

    def test_fetch_batch_handles_category_continuation(self):
        calls = []

        def fake_fetcher(params):
            calls.append(dict(params))
            if len(calls) == 1:
                return {
                    "query": {
                        "pages": [{
                            "title": "كتاب",
                            "pageid": 1,
                            "lastrevid": 10,
                            "fullurl": "https://ar.wikisource.org/wiki/كتاب",
                            "categories": [{"title": "تصنيف:كتب"}],
                        }]
                    },
                    "continue": {"clcontinue": "next", "continue": "||"},
                }
            return {
                "query": {
                    "pages": [{
                        "title": "كتاب",
                        "pageid": 1,
                        "lastrevid": 10,
                        "fullurl": "https://ar.wikisource.org/wiki/كتاب",
                        "categories": [{"title": "تصنيف:نصوص مصححة"}],
                    }]
                }
            }

        result = AUDIT.fetch_batch(["كتاب"], fetcher=fake_fetcher)
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1]["clcontinue"], "next")
        self.assertEqual(result["كتاب"]["categories"], ["تصنيف:كتب", "تصنيف:نصوص مصححة"])

    def test_audit_candidates_flags_page_level_category_and_revision_drift(self):
        candidate = {
            "id": "book-1",
            "title": "فقه اللغة وسر العربية",
            "source_pages": [
                {
                    "title": "فقه اللغة وسر العربية",
                    "url": "https://ar.wikisource.org/wiki/فقه_اللغة_وسر_العربية",
                    "revision_id": 105726,
                    "revision_timestamp": "2009-11-03T20:36:09Z",
                },
                {
                    "title": "فقه اللغة وسر العربية/مقدمة",
                    "url": "https://ar.wikisource.org/wiki/فقه_اللغة_وسر_العربية/مقدمة",
                    "revision_id": 478577,
                    "revision_timestamp": "2023-07-24T06:19:00Z",
                },
            ],
            "persons": [{
                "name": "الثعالبي",
                "role": "author",
                "author_page": "مؤلف:الثعالبي",
            }],
        }

        def fake_fetcher(params):
            titles = params["titles"].split("|")
            pages = []
            for title in titles:
                if title == "فقه اللغة وسر العربية":
                    pages.append({
                        "title": title,
                        "pageid": 1,
                        "lastrevid": 105726,
                        "fullurl": "https://ar.wikisource.org/wiki/فقه_اللغة_وسر_العربية",
                        "categories": [{"title": "تصنيف:فقه اللغة"}],
                    })
                elif title == "فقه اللغة وسر العربية/مقدمة":
                    pages.append({
                        "title": title,
                        "pageid": 2,
                        "lastrevid": 478577,
                        "fullurl": "https://ar.wikisource.org/wiki/فقه_اللغة_وسر_العربية/مقدمة",
                        "categories": [{"title": "تصنيف:نصوص مجهولة المصدر"}],
                    })
                else:
                    pages.append({
                        "title": title,
                        "pageid": 3,
                        "lastrevid": 900,
                        "fullurl": "https://ar.wikisource.org/wiki/مؤلف:الثعالبي",
                        "categories": [{"title": "تصنيف:مؤلفون"}],
                    })
            return {"query": {"pages": pages}}

        report = AUDIT.audit_candidates([candidate], fetcher=fake_fetcher, pause_seconds=0)[0]
        self.assertEqual(report["page_audit_status"], "complete")
        self.assertEqual(report["flagged_page_count"], 1)
        self.assertEqual(report["flagged_pages"][0]["title"], "فقه اللغة وسر العربية/مقدمة")
        self.assertTrue(report["source_pages"][0]["revision_matches_pinned_source"])
        self.assertTrue(report["source_pages"][1]["revision_matches_pinned_source"])
        self.assertEqual(report["author_pages"][0]["lookup_status"], "found")

    def test_audit_candidates_marks_missing_pages_incomplete(self):
        candidate = {
            "id": "book-2",
            "title": "كتاب",
            "source_pages": [{
                "title": "صفحة مفقودة",
                "revision_id": 1,
                "revision_timestamp": "2020-01-01T00:00:00Z",
            }],
            "persons": [],
        }

        def fake_fetcher(params):
            return {"query": {"pages": [{
                "title": "صفحة مفقودة",
                "missing": True,
                "categories": [],
            }]}}

        report = AUDIT.audit_candidates([candidate], fetcher=fake_fetcher, pause_seconds=0)[0]
        self.assertEqual(report["page_audit_status"], "incomplete")
        self.assertEqual(report["missing_or_unreturned_page_count"], 1)


if __name__ == "__main__":
    unittest.main()
