# HUKM MEDIA — Exact Next Task

**Current branch:** `main`  
**Latest verified docs-only CI HEAD:** `28907a39b891ab3a86e4e10a8131f07c4f2f35b9` — push CI #42190987662 SUCCESS; re-fetch `main` before writing  
**Last verified code merge:** `205211ab6238fdbf6835884bb5f3936d488e8a0b` (PR #11; re-fetch `main` before every write)  
**Last stable code merge:** `205211ab6238fdbf6835884bb5f3936d488e8a0b`  
**Latest CI on provenance UI PR:** run #42190539425 — SUCCESS (tests, TypeScript, build)  
**Latest pinned + live page-category audit:** run #42189138412 — SUCCESS  
**Google AI Studio sync:** not independently verified.

## Phase A — completed on 2026-11-06
- PR #11 merged as `205211ab6238fdbf6835884bb5f3936d488e8a0b`; `main` confirmed identical.
- PR CI run #42190539425 passed full tests, TypeScript and production build.
- Multi-source attribution helpers and regression tests are in `src/utils/bookProvenance.ts` and `src/utils/bookProvenance.test.ts`.
- Reader source footer is dynamic; overview labels source links correctly and discloses the 12-page preview.
- Latest docs-only CI HEAD `28907a39b891ab3a86e4e10a8131f07c4f2f35b9` passed exact-head push CI run #42190987662 (tests, TypeScript, production build).

## Phase A — exact-head verification complete
- `main` was confirmed at `28907a39b891ab3a86e4e10a8131f07c4f2f35b9` before this documentation-only checkpoint refresh.
- Push CI #42190987662 succeeded on this exact HEAD: test suite, TypeScript and production build.
- Both checkpoint files are present and readable on `main`.

## Phase B — manual review status
- First candidate scan reviewed: Commons identifies 1891 edition, author 1850–1896, 79-page/2.35 MB scan, and marks the mechanical scan public domain.
- Wikisource index says all pages corrected but some not proofread; full transclusion. The text includes editorial/paratext notes and historical copyright wording.
- Commons scan rights and Wikisource transcription CC BY-SA 4.0 are separate. Scan is reader fixture only; no transcription import is approved.

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

## Reader technology research for the next reading milestone

Confirmed current state:
- `package.json` has no PDF.js, epub.js, or EPUB/PDF reader dependencies.
- `BookReaderView.tsx` currently renders the existing structured text-book format; there is no PDF or EPUB rendering path yet.

Open-source candidates reviewed:
- **PDF.js / `pdfjs-dist`** — Mozilla's browser PDF renderer, Apache-2.0. npm latest at review: 6.5.438, published 2026-11-01, zero runtime dependencies; Snyk reported no direct vulnerabilities for this version. Use the package and locally pinned worker; build a HUKM-styled custom reader rather than copying the full generic viewer. Official project: https://github.com/mozilla/pdf.js
- **epub.js** — BSD-2-Clause browser EPUB renderer. npm latest stable at review: 0.3.93 with 9 dependencies; security review shows no direct vulnerability for latest, but maintenance is inactive/low cadence and the last stable release is old. Do not install without reviewing dependency health and testing RTL behavior. Project: https://github.com/futurepress/epub.js
- **foliate-js** — MIT, small modular browser e-book library with EPUB support and experimental PDF support through PDF.js; no hard dependencies and does not load the whole file into memory. However, its README explicitly says the library API is unstable and may change; pin an exact commit and vendor with license if selected. Project: https://github.com/johnfactotum/foliate-js
- **Readium TS toolkit** — BSD-3-Clause, standards-oriented and actively developed, but the web path is EPUB-focused and expects Web Publication Manifest/streaming infrastructure. Keep as a future option if HUKM later adds a publication service. Project: https://github.com/readium/ts-toolkit
- **Readest** — active modern EPUB/PDF reader but AGPL-3.0; inspect its UI ideas only, do not copy or bundle code unless HUKM intentionally adopts AGPL compatibility. Project: https://github.com/readest/readest

Preliminary implementation decision:
1. PDF: proceed with `pdfjs-dist@6.5.438` after lockfile update and local-worker integration. Build page virtualization, zoom, page navigation, fit-width, and persistent page position/bookmarks.
2. EPUB: do not lock the choice yet. Run a focused spike comparing epub.js 0.3.93 (maintenance/dependency risk), foliate-js (unstable API), and Readium (more complex publication infrastructure). Choose only after Arabic RTL, CSP, annotation, CFI/progress, and bundle-size tests.
3. Keep EPUB scripted content disabled. Enforce CSP/sandboxing and test hostile EPUB fixtures; never enable scripted content by default.
4. Do not promise text search in scanned/image-only PDFs without OCR. Avoid OCR dependencies until there is a justified need and performance review.
5. Test with an Arabic RTL EPUB plus the legal PDF fixture before accepting the feature.

Legal PDF fixture for the PDF reader:
- `لسان غصن لبنان في انتقاد العربية العصرية` has an original 1891 scan on Wikimedia Commons: https://commons.wikimedia.org/wiki/File:كتاب_لسان_غصن_لبنان_في_انتقاد_العربية_العصرية.pdf
- The Commons file page marks the scan as public domain (mechanical scan of a public-domain work), with 79 pages and about 2.35 MB; author Shaker Shuqair died in 1896. The separate Wikisource transcription is CC BY-SA 4.0. Keep these two rights paths distinct.
- The PDF fixture is for reader validation only; it is not yet imported into HUKM.

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
- LAST_STABLE_COMMIT: 205211ab6238fdbf6835884bb5f3936d488e8a0b (PR #11 merge; PR CI passed)
- LATEST_VERIFIED_CI_HEAD: 28907a39b891ab3a86e4e10a8131f07c4f2f35b9 (docs-only; CI #42190987662 passed)
- TEST_STATUS: Full tests, TypeScript and build passed on exact PR #11 head in run #42190539425 and on exact docs-only main HEAD `7a561596...` in run #42190859034; page-category audit run #42189392657 passed with 2,253 pages, zero missing, zero API errors, zero revision drift
- MAIN_SYNC_STATUS: GitHub main confirmed; Google AI Studio sync unverified
- PENDING_TASKS: Human-review three-book shortlist; implement CC BY-SA rights tier after allowlist; fix generic source attribution UI; continue full repository audit
- NEXT_ACTION: Complete scan-to-transcription collation for the first candidate; then implement a PDF.js-based custom reader route for legally cleared PDF files using a locally pinned worker. Do not add the dependency until Bun lockfile regeneration and CI can validate it; keep the current structured-text reader intact.
- KNOWN_ISSUES: Vercel daily deployment quota; branch divergence; no verified live deployment or AI Studio sync; candidate transcription still needs scan collation and CC BY-SA rights review; PDF/EPUB paths are not implemented.
