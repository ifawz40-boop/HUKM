# HUKM MEDIA — Exact Next Task

**Current branch:** `main`  
**Last verified code merge:** `92b1251dd3dece8323cb32f9997e7817c5bc826d` (docs have advanced since; always re-fetch `main` before writing)  
**Last stable code merge:** `92b1251dd3dece8323cb32f9997e7817c5bc826d`  
**Latest CI on code merge:** run #42188045609 — SUCCESS  
**Latest pinned + live page-category audit:** run #42189138412 — SUCCESS  
**Google AI Studio sync:** not independently verified.

## Phase A — verify latest docs checkpoint
1. Re-fetch `main` and confirm the current HEAD.
2. Verify CI for the documentation-only HEAD `1951fcb...`; do not treat a prior successful code commit as proof for a later commit.
3. Confirm the current candidate report is present and links to the latest successful audit run.

## Phase B — complete manual review of the 38 Arabic Wikisource candidates
Read `docs/library/WIKISOURCE_CANDIDATES_2026-11-06.md` and download artifact `wikisource-candidate-report` from run #42188045492 (artifact ID `13487204922`, expiry 2026-11-20).

Verified facts:
- 38 candidates from 40,782 rows; 11 filter tests passed.
- All 38 are marked original works; 40 author credit records have Wikidata IDs and death-year evidence.
- All source pages in the report have URLs, revision IDs and timestamps.
- Live page-category audit run #42189138412 checked 2,253/2,253 source pages plus author pages: zero missing pages, zero failed API batches, zero revision drift; all 38 book reports were complete.
- The live audit found 1,380 pages across 28 books tagged `نصوص مجهولة المصدر`, plus one page (`معجم البلدان/الجزء الثالث`) tagged `أعمال غير مكتملة`.
- Full report artifact: https://github.com/ifawz40-boop/HUKM/actions/runs/42189138412/artifacts/13489445638 (expires 2026-11-20).
- 18 candidates carry the category `نصوص مجهولة المصدر`; 2 carry `صفحات بوصلة غير موجودة`.
- 16 candidates exceed the current `maximumWordsPerBook=120000`.
- Only one candidate has scan proofreading signals: `لسان غصن لبنان في انتقاد العربية العصرية` (80 scan pages: 72 level 3 and 8 level 4).
- All candidate rows report zero footnotes. 37/38 lack `publication_year`; 33/38 lack `first_publication_year`.
- The source schema has no explicit `is_incomplete` field. A missing field is not proof of completeness.
- All records list author credits only; unnamed contributors/editors may be absent.

### Revised shortlist after all-page category audit (not an import allowlist)
1. `لسان غصن لبنان في انتقاد العربية العصرية` — 17,568 words, 11 sections; no flagged categories across 91 source pages; strongest candidate because its Wikisource work page shows 1891, marks the text corrected, the author page gives 1850–1896, and the dataset reports 80 scan pages (72 level 3, 8 level 4).
2. `مقدمة ابن خلدون` — 73,202 words, 40 source pages; no flagged categories across its 40 pages and within the word cap. The Wikisource author page displays 732–808 AH but incorrectly converts these to 973–1057 CE; independent sources confirm 1332–1406 CE. Correct/annotate this discrepancy and review all six volumes before import.
3. `سنن النسائي` — 40,784 words, 11 sections; no flagged categories across 15 source pages and within the word cap. However, it has no scan-proofreading signal and a very low diacritization ratio (0.000013); requires specialist hadith/text review before any import.

### Explicit holds from page-level category evidence
- `فقه اللغة وسر العربية`: 31/32 source pages carry `نصوص مجهولة المصدر`; defer.
- `عيون الأنباء في طبقات الأطباء`: 8/54 pages carry `نصوص مجهولة المصدر`; despite consistent author dates, defer until source edition and page provenance are resolved.
- `كتاب الاعتبار`: 14/15 pages carry `نصوص مجهولة المصدر`; defer.
- `رقائق الحقائق في حساب الدرج والدقائق`: 12/13 pages carry `نصوص مجهولة المصدر`; defer.
- `تفسير القرآن الحكيم`: 14/15 pages carry `نصوص مجهولة المصدر`; defer.
- `إحياء علوم الدين`: all 105 pages carry `نصوص مجهولة المصدر`; defer.
- `كتاب الأحكام الشرعية الكبرى`: 844/847 pages carry `نصوص مجهولة المصدر`; defer.
- `معجم البلدان/الجزء الثالث` is tagged `أعمال غير مكتملة` and `نصوص مجهولة المصدر`; reject from the current batch unless a complete, separately sourced edition is found.

For every shortlisted or held candidate, verify the exact Wikisource edition, page/revision history, page-level categories for every source page, completeness, unclosed markup, text against scans/source pages, attribution, author/contributor roles, death-year evidence, and whether modern editorial material is included. The dataset's rights screen is not a legal guarantee. Do not rely only on the original author's death date.

Defer or reject candidates with unresolved source/edition provenance, missing content, modern editorial material without rights evidence, or text-quality issues. Do not assume all candidates are suitable just because the automated filter accepted them.

### Required audit enhancement before rights-model implementation
- The current candidate audit checks `row.categories` for the book record only. `source_pages` contains all page titles/revision IDs but no category arrays. Add a separate page-level category audit for all 2,253 source pages (or at minimum the shortlisted candidates) using the Wikisource API, batching requests and recording API revision IDs, categories, and failures.
- Fail closed for import if page-level category checks are incomplete; explicitly flag `نصوص مجهولة المصدر`, `غير مكتمل`, `غير مصحح`, and related categories for human review.
- Add regression tests for the page-category parser and retry/error handling. Preserve the pinned dataset audit separately from the live page-category enrichment.

## Phase C — separate CC BY-SA 4.0 rights model (only after allowlist)
Inspect and then extend:
- `src/types/hukm.ts` (`BookRights`, `BookSourcePage`)
- `scripts/sync-public-library.mjs`
- `scripts/assert-library-ready.mjs`
- `tests/staticLibrary.test.ts`
- `src/data/library/NOTICE.md`
- `src/components/BookOverviewView.tsx`
- `src/components/BookReaderView.tsx`

Add a distinct rights tier such as `cc-by-sa-4-transcription`, never alias it to CC BY 4.0 or public domain. Require:
- CC BY-SA 4.0 license URL and exact source licence statement.
- Attribution to Arabic Wikisource contributors and dataset citation.
- Every source page URL, revision ID and revision timestamp.
- Source text hash and pinned dataset revision.
- Original work public-domain evidence as a separate property.
- All named rights-relevant contributors, roles, Wikidata evidence and death years; fail closed for unknown relevant credits.
- Description of adaptations, normalization, omissions and any editorial changes.
- ShareAlike redistribution notice and compatible derivative licensing.
- A deployment gate that rejects missing attribution, incomplete source-page provenance, invalid hashes, and wrong license combinations.

Do not modify the current Hindawi CC BY 4.0/public-domain rights paths except to add regression protection. Do not import any candidate until a human-reviewed allowlist exists.

## Phase D — multi-source reader provenance UI
A confirmed issue exists:
- `BookReaderView.tsx` hardcodes “مؤسسة هنداوي” in the rights footer.
- `BookOverviewView.tsx` labels the source URL as a publisher page even when the source may be Wikisource.
- The source-page disclosure shows at most the first 12 pages without clearly stating that the list is partial.

Make source labels dynamic using the book's rights metadata, change the generic source link label to “صفحة المصدر”, and clearly state when only a sample of source pages is displayed while linking to the complete source/history. Add tests for both Hindawi and Wikisource examples.

## Phase E — resume full repository audit
After the library rights/provenance work:
- Review all Firebase Auth, Firestore rules, Storage rules and server API paths.
- Verify owner/admin/writer/reader access enforcement server-side.
- Inspect reader progress/bookmarks/annotations isolation and pending cloud sync.
- Review the orphaned Writer Studio route and static publishing model.
- Fix the confirmed rate-limit limitations only with a justified shared provider; do not misrepresent process-local rate limits.
- Continue accessibility, responsive UI, performance, and production deployment readiness review.

## Safety and merge rules
- `main` is the Google AI Studio target branch. Re-fetch before every write.
- Keep `deploy/vercel-preparation` separate; it was 71 ahead / 146 behind and must not be merged wholesale.
- Use a focused branch/PR for code changes, run focused tests, full CI, independent diff review, and the candidate audit workflow where applicable.
- Merge only after successful checks. Do not force-push.
- Vercel currently reports a free-plan daily deployment quota error (`api-deployments-free-per-day`, more than 100 deployments/day); this is not proof of a code build failure. No production deployment or AI Studio sync has been verified.
- Never import protected books or weaken the rights gate to make deployment pass.

## HUKM_CHECKPOINT
- LAST_COMPLETED_MILESTONE: Repository intelligence + pinned candidate discovery + full provenance report + all-page live category audit
- LAST_COMPLETED_TASK: Merge PR #9; verify full CI and pinned candidate audit on main; publish full provenance artifact; spot-check Wikisource work, chapter and author pages; identify page-level category gap and Ibn Khaldun author-page date error
- CURRENT_BRANCH: main
- LAST_STABLE_COMMIT: a6280120dc152c3c42fc04e018e66c21754581e0 (PR #10 merge; PR CI and full live page-category audit passed)
- CURRENT_MAIN_HEAD: 1951fcbf5f7726e5282fd4b29dc3f666951d2bfa (documentation checkpoint; CI pending)
- TEST_STATUS: Full tests, TypeScript and build passed on exact main docs HEAD `6c1be44352e20c31ecfecf7ac9bf0a2739f251cb` in run #42189485397; main candidate + page-category audit run #42189392657 passed with 2,253 pages, zero missing, zero API errors, zero revision drift
- MAIN_SYNC_STATUS: GitHub main confirmed; Google AI Studio sync unverified
- PENDING_TASKS: Human-review three-book shortlist; implement CC BY-SA rights tier after allowlist; fix generic source attribution UI; continue full repository audit
- NEXT_ACTION: Re-fetch current main, then manually review the three remaining candidates against exact source text/edition and contributor records; no ingestion yet
- KNOWN_ISSUES: Vercel daily deployment quota; branch divergence; no verified live deployment or AI Studio sync; candidate content still needs human review.
