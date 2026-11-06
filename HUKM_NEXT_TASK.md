# HUKM MEDIA — Exact Continuation Task

Repository: ifawz40-boop/HUKM
Target branch: main (connected to Google AI Studio)
Latest library code/data checkpoint: 4ae7b4ad6aba58a658f82c2cdcb7c576377bbd36 (later commits update documentation only)
Latest main CI: run 42219696273 — SUCCESS (286 tests, 1 skipped; TypeScript and production build).
Vercel check: FAILURE — build-rate-limit (free-plan quota). No new production deployment is confirmed.
Google AI Studio synchronization: not independently verified.
Re-fetch main before every write.

## Current library state

1. All 24 legacy books are moved intact into src/data/library/archive/books/.
2. Their previous catalogue and notice are preserved in src/data/library/archive/.
3. The public text catalogue is empty. No book has passed the new editorial review yet.
4. The public PDF shelf is empty; the former language-critique scan fixture is archived.
5. The four allowed public categories are religious, self-development, travel, islamic-philosophy-critique.
6. A book is visible only if its ID is explicitly listed in src/data/library/curation.json approvedBookIds and its category is in the allowed set.
7. The deployment gate permits an explicitly empty catalogue during editorial curation. A populated catalogue must contain at least 15 complete books and pass all editorial category, integrity and rights metadata checks.
8. Eighteen candidate books and their Waqfeya bibliographic links are recorded in src/data/library/candidates.json. All are pending full-text review; none is approved.
9. Legacy Hindawi sync is manual-only while the library is rebuilt. Never restore automatic sync of the old dataset.

## Editorial policy

Read docs/library/EDITORIAL_POLICY.md and docs/library/AUTHOR_EVIDENCE_2026-11-06.md before approving any book.

The library may contain only:
- Sunni Islamic books by authors whose scholarly standing and methodology are verifiably consistent with the owner's stated preference.
- Tazkiyah, ethics, discipline and self-development grounded in Islam.
- Clean, useful travel writing after full-text screening.
- Islamic critique of philosophy, logic and ideologies.

Do not claim to know an author's inner piety. Record biographical evidence, scholarly assessments, methodology and uncertainty. For travel writing, distinguish neutral historical description from endorsement; still screen all content against the owner's stated standard.

## Immediate next milestone — expand and verify the candidate set

First review the author evidence file. Distinguish widely attested scholarly status from a claim of universal consensus or certainty about personal piety. Al-Albani and any disputed contemporary author must remain conditional until the owner confirms that the evidence fits his intended standard.

1. Search Waqfeya and reputable Sunni sources for additional books in aqeedah, tafsir, hadith, fiqh, seerah, tazkiyah and Islamic critique of philosophy.
2. Prioritize works by clearly documented Sunni scholars such as Ibn Taymiyyah, Ibn al-Qayyim, Ibn Rajab, al-Sa'di, Ibn Baz, Ibn Uthaymeen and al-Albani, but verify each work and edition rather than approving by author name alone.
3. Add bibliographic records only, with exact verified source URLs, author, editor, publisher, edition, page count and candidate status.
4. Build an author-evidence record: biographical source, creed/method assessment, scholarly assessments and confidence level.
5. Obtain full text for private review where access is legitimate. Do not put unlicensed full texts or scans into the public repository/site. The owner will contact publishers/rights holders before publication; record permission status separately.
6. Run automated scans over the complete text and footnotes for themes requiring human review, including shirk/polytheism, myths/gods, explicit content, alcohol/gambling, sexual content, sectarian apologetics, praise of practices the policy rejects, and ideological framing. A keyword hit is a review signal, not an automatic verdict.
7. Human-review the full work, including introductions, notes and footnotes. Only then may a book be marked approved.
8. Add approved full texts into src/data/library/books/, update catalogue/manifest/curation allowlist, and keep the minimum 15-book deployment gate for populated catalogues.

## Current candidate priority

- فصل في تزكية النفس — ابن تيمية.
- الداء والدواء — ابن القيم.
- الوابل الصيب — ابن القيم.
- عدة الصابرين وذخيرة الشاكرين — ابن القيم.
- إغاثة اللهفان — ابن القيم.
- جامع العلوم والحكم — ابن رجب.
- حلية طالب العلم — بكر أبو زيد.
- زاد المعاد — ابن القيم.
- الرد على المنطقيين — ابن تيمية.
- الانتصار لأهل الأثر (المطبوع باسم نقض المنطق) — ابن تيمية.
- بغية المرتاد — ابن تيمية.
- رحلتا ابن جبير ومرآة الحرمين: لا تعتمد أيًا منهما قبل مراجعة النص كاملًا، خصوصًا وصف الممارسات الدينية والعادات.

## Technical follow-ups

- Add automated editorial metadata validation to the deployment gate.
- Add a review dashboard for candidates with statuses: candidate, metadata-verified/content-review-pending, editorial-review, approved, rejected, rights-pending.
- Keep PDF.js reader code, but do not show a PDF unless its subject passes editorial approval.
- Continue EPUB Readium prototype only after the curated text library pipeline is stable.
- Keep PDF progress/bookmarks/notes local until Firestore sync rules are reviewed and tested.
- Verify production URL after Vercel deployment becomes available; do not infer production deployment solely from a green status.
- Confirm Google AI Studio sees the latest main revision before claiming synchronization.

## Safety and workflow

- Never force-push or rewrite history.
- Never re-enable automatic legacy Hindawi sync without a new, reviewed dataset manifest.
- Never mark a book approved because its title, author or download page looks suitable.
- Never copy full copyrighted books into the public repository before permission.
- Preserve all rejected/quarantined source material in archive unless the owner explicitly requests permanent deletion.
