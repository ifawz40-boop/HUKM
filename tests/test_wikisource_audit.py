import copy
import importlib.util
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "audit-wikisource-candidates.py"
SPEC = importlib.util.spec_from_file_location("audit_wikisource_candidates", MODULE_PATH)
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)

SOURCE_LICENSE = AUDIT.SOURCE_LICENSE
SOURCE_LICENSE_URL = AUDIT.SOURCE_LICENSE_URL
candidate_score = AUDIT.candidate_score
deduplicate_candidates = AUDIT.deduplicate_candidates
is_candidate = AUDIT.is_candidate


def valid_row():
    return {
        "id": "wikisource-1",
        "title": "كتاب حديث",
        "url": "https://ar.wikisource.org/wiki/كتاب_حديث",
        "history_url": "https://ar.wikisource.org/w/index.php?title=كتاب_حديث&action=history",
        "tier": "works-pd-core",
        "pd_rule": "all-died-by-1955",
        "latest_death_year": 1950,
        "author": "مؤلف قديم",
        "persons": [{"role": "author", "name": "مؤلف قديم", "death_year": 1900}],
        "genre": "hadith",
        "genre_source": "wikidata-P136",
        "words": 50000,
        "n_chapters": 3,
        "is_translation": False,
        "text_raw": "نص عربي سليم وكامل",
        "chapters": [
            {"order": 1, "title": "الأول", "text": "نص الفصل الأول"},
            {"order": 2, "title": "الثاني", "text": "نص الفصل الثاني"},
            {"order": 3, "title": "الثالث", "text": "نص الفصل الثالث"},
        ],
        "proofreading": {
            "scan_pages_transcluded": 0,
            "scan_pages_missing": 0,
            "quality_levels": {"0": 0, "1": 0, "2": 0, "3": 0, "4": 0},
            "unresolved_transclusions": 0,
        },
        "source_pages": [
            {"title": "صفحة 1", "url": "https://ar.wikisource.org/wiki/صفحة_1", "revision_id": 11},
            {"title": "صفحة 2", "url": "https://ar.wikisource.org/wiki/صفحة_2", "revision_id": 12},
            {"title": "صفحة 3", "url": "https://ar.wikisource.org/wiki/صفحة_3", "revision_id": 13},
        ],
        "n_source_pages": 3,
        "near_dup_group": None,
        "near_dup_size": 1,
        "source_license": SOURCE_LICENSE,
        "source_license_url": SOURCE_LICENSE_URL,
        "categories": [],
    }


class WikisourceCandidateAuditTests(unittest.TestCase):
    def test_accepts_complete_public_domain_prose_with_cc_by_sa_text(self):
        self.assertTrue(is_candidate(valid_row()))

    def test_excludes_poetry_quran_and_scripture(self):
        for genre in ("poetry", "quran", "scripture"):
            row = valid_row()
            row["genre"] = genre
            self.assertFalse(is_candidate(row), genre)

    def test_excludes_life50_and_religious_primary_text_tiers(self):
        row = valid_row()
        row["tier"] = "works-life50"
        self.assertFalse(is_candidate(row))
        row = valid_row()
        row["pd_rule"] = "religious-primary-text"
        self.assertFalse(is_candidate(row))

    def test_requires_named_author_and_verified_death_dates(self):
        row = valid_row()
        row["author"] = ""
        self.assertFalse(is_candidate(row))
        row = valid_row()
        row["persons"][0]["death_year"] = None
        self.assertFalse(is_candidate(row))
        row = valid_row()
        row["persons"][0]["death_year"] = 1956
        self.assertFalse(is_candidate(row))

    def test_requires_named_translator_for_translations(self):
        row = valid_row()
        row["is_translation"] = True
        self.assertFalse(is_candidate(row))
        row["persons"].append({"role": "translator", "name": "مترجم", "death_year": 1900})
        self.assertTrue(is_candidate(row))

    def test_excludes_incomplete_and_malformed_text(self):
        row = valid_row()
        row["categories"] = ["أعمال غير مكتملة"]
        self.assertFalse(is_candidate(row))
        row = valid_row()
        row["text_raw"] = "نص {{ قالب غير مغلق"
        self.assertFalse(is_candidate(row))
        row = valid_row()
        row["text_raw"] = "نص [[ رابط غير مغلق"
        self.assertFalse(is_candidate(row))

    def test_excludes_missing_or_problematic_scan_pages(self):
        row = valid_row()
        row["proofreading"]["scan_pages_missing"] = 1
        self.assertFalse(is_candidate(row))
        row = valid_row()
        row["proofreading"]["unresolved_transclusions"] = 1
        self.assertFalse(is_candidate(row))
        row = valid_row()
        row["proofreading"]["quality_levels"]["1"] = 1
        self.assertFalse(is_candidate(row))
        row = valid_row()
        row["proofreading"]["quality_levels"]["2"] = 1
        self.assertFalse(is_candidate(row))

    def test_excludes_short_or_incomplete_chapter_sets(self):
        row = valid_row()
        row["words"] = 7999
        self.assertFalse(is_candidate(row))
        row = valid_row()
        row["n_chapters"] = 4
        self.assertFalse(is_candidate(row))

    def test_requires_source_page_revision_links_and_cc_by_sa_notice(self):
        row = valid_row()
        row["source_pages"][0]["revision_id"] = None
        self.assertFalse(is_candidate(row))
        row = valid_row()
        row["source_license"] = "CC BY 4.0"
        self.assertFalse(is_candidate(row))
        row = valid_row()
        row["source_license_url"] = "https://creativecommons.org/licenses/by/4.0/"
        self.assertFalse(is_candidate(row))

    def test_deduplicates_near_duplicate_groups_but_keeps_ungrouped_works(self):
        first = valid_row()
        first["id"] = "first"
        first["near_dup_group"] = "group-a"
        second = valid_row()
        second["id"] = "second"
        second["genre_source"] = "category"
        second["near_dup_group"] = "group-a"
        third = valid_row()
        third["id"] = "third"
        third["near_dup_group"] = None
        selected = deduplicate_candidates([second, third, first])
        self.assertEqual([row["id"] for row in selected], ["third", "first"])

    def test_candidate_score_prefers_wikidata_genre_evidence(self):
        authoritative = valid_row()
        weak = valid_row()
        weak["genre_source"] = "category"
        self.assertGreater(candidate_score(authoritative), candidate_score(weak))


if __name__ == "__main__":
    unittest.main()
