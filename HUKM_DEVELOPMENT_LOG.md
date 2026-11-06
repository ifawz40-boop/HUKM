# HUKM MEDIA — Development Log

## Current verified checkpoint — supersedes all earlier library counts below

- Date: 2026-11-06
- Repository: ifawz40-boop/HUKM
- Latest feature merge: PR #14 — Islamic editorial curation, merge commit 175356b3632f1f054c6280e5c986761cf2d07059.
- Latest library code/data checkpoint (candidate metadata): 4ae7b4ad6aba58a658f82c2cdcb7c576377bbd36. Subsequent main commits are documentation-only checkpoints.
- Main CI run #42219582761 passed 286 tests (1 skipped), TypeScript and production build on the PR #14 merge commit.
- Main CI run #42219696273 passed 286 tests (1 skipped), TypeScript and production build on the workflow-guard HEAD.
- Legacy automatic Hindawi sync run #42219582591 failed safely at dataset revision preflight (manifest.datasetRevision is intentionally absent); it did not reach the commit step and did not repopulate the catalogue.
- Sync workflow is now manual-only; push events skip the legacy sync job.
- Vercel check on the latest main HEAD reports FAILURE: build-rate-limit (free-plan deployment quota). No new production deployment is confirmed. Google AI Studio sync remains unverified.
- 24 legacy text books moved intact to src/data/library/archive/books/; their old catalogue and notice are preserved under archive/.
- Public text catalogue is intentionally empty. curation.json has 0 approved IDs and 24 quarantined IDs.
- Public PDF shelf is empty; the old linguistic scan fixture metadata is preserved in archive/pdfCatalog.json.
- Four public categories are enforced: religious, self-development, travel, islamic-philosophy-critique.
- Deployment gate permits only an explicitly empty curation state or a complete 15+ book collection passing editorial, integrity and rights checks.
- 22 sourced Waqfeya candidates are recorded in src/data/library/candidates.json. All remain metadata-verified/content-review-pending; none is approved.
- PR #14 CI run #42219445177 passed 286 tests (1 skipped), TypeScript and production build before merge.
- Latest docs/candidate metadata CI run #42220339226 was pending at the time of this checkpoint; the last code-changing main run #42219696273 passed. No code changed in the later candidate and documentation commits.

## Current curation policy and candidate set
- Policy: docs/library/EDITORIAL_POLICY.md.
- Author evidence register: docs/library/AUTHOR_EVIDENCE_2026-11-06.md.
- Legacy review: docs/library/CURRENT_LIBRARY_REVIEW_2026-11-06.md.
- Candidate metadata and bibliographic sources: src/data/library/candidates.json.
- The 24-title review is explicitly preliminary; it used titles, indexes and targeted passages, not a full human line-by-line reading. The conservative action was to quarantine all titles rather than imply they had passed.
- No new full-text material was copied from Waqfeya. Rights are a separate pre-publication workstream; do not publish copyrighted scans/transcriptions without permission.
- For religious titles, verify the author's biography, creed/method and scholarly standing from reliable biographical sources. Do not claim certainty about personal piety; document the evidence and uncertainty.

## Previous checkpoint record (historical)
- Date: 2026-11-06
- Repository: `ifawz40-boop/HUKM`
- Google AI Studio target branch (user-provided): `main`
- Last verified code/data HEAD: `efe2847232762dfde37970223324573d06f65897` (PR #13 merge; exact-main CI run #42192746029 passed).
- Verification method: PR #13 CI run `42192670662` passed 284 tests, TypeScript and build on the exact PR tree; push CI run `42192746029` passed on the exact merge commit; `main` was verified identical to the merge commit.
- Repository permissions on connected account: Admin / Push.
- Default branch: `main`.
- Latest verified PR: #13, merged. PRs #1–#13 are merged/closed as of this checkpoint.
- Last docs-only CI-tested HEAD before the latest documentation refresh: `28907a39b891ab3a86e4e10a8131f07c4f2f35b9`; push CI run #42190987662 passed tests, TypeScript and production build. Latest code merge and CI are recorded below.
- Repository branch inventory returned 14 branches across two pages. Relevant branches include `main`, `deploy/vercel-preparation`, `backup/main-after-deployment-gate-2026-11-06`, `fix/pinned-library-source-main`, and historical fix/test/docs branches.

## Architecture facts confirmed
- React 19 + TypeScript + Vite frontend, Express API entrypoint, Firebase client/Admin SDK, Firestore, Tailwind CSS v4.
- Bun lockfile and CI use `bun install --frozen-lockfile`.
- `package.json` scripts include full test suite, TypeScript check (`lint`), Vite build, and owner bootstrap/verify commands.
- Vercel routes `/api/*` to `api/index.ts`, then SPA routes to `index.html`.
- Vercel build command is intentionally guarded by `node scripts/assert-library-ready.mjs && bun run build`.
- CI workflow runs tests, TypeScript check and production build on pushes to `main` and `deploy/**`, and pull requests targeting `main`.
- Static book texts are separate JSON assets loaded lazily; do not turn them back into large JavaScript module chunks.

## Library state confirmed on main
- `src/data/library/manifest.json` targets 24 books, requires at least 15, at least 3 chapters per book, at least 8,000 words per book, and caps total words at 1.5 million.
- `src/data/library/catalog.json` currently contains 24 records across 10 categories.
- The previously recorded independent audit for the 24-book Hindawi batch: 529 sections, 1,144,156 words, 2,283 footnotes, approximately 12.57 MiB of static JSON; all 24 selected books passed the recorded structural and rights-evidence checks.
- The real-library gate requires catalogue/full-text parity, complete chapter data, consistent word counts, duplicate provenance fields, rights tier, source/history/licence URLs, source hash, licence quote and attribution.
- A sample full-text JSON file was fetched and confirmed to contain chapter text, not merely metadata.
- The existing batch has a category gap for Islamic/religious genres; do not mislabel existing works to fill it.
- Cover art is absent from the inspected first catalogue record. Do not reuse publisher artwork without separate rights clearance.

## New source-research work already present
- `scripts/audit-wikisource-candidates.py` and `tests/test_wikisource_audit.py` exist on main.
- A dedicated workflow `.github/workflows/audit-wikisource-candidates.yml` tests the candidate filters and audits a pinned Arabic Wikisource dataset.
- Dataset: `Bayanat-Labs/arabic-wikisource-pd`, config `works-pd-core`, pinned revision `7f7de3a3e95e3f4e0e29c72588fd73ad2a636ccd`.
- Candidate audit is metadata-only and must not automatically import books.
- Its transcribed text is treated as CC BY-SA 4.0; metadata/statistics are CC BY 4.0. Any selected text needs a distinct CC BY-SA 4.0 rights path, contributor attribution, source-page/revision provenance, and ShareAlike handling. Never merge it into the existing Hindawi CC BY 4.0/public-domain rights tier.
- Candidate filter intentionally excludes incomplete/malformed works, poetry, scripture/Quran entries, and the `works-life50` tier.

## Branch reconciliation
- `main` and `deploy/vercel-preparation` are heavily diverged: preparation branch is 71 commits ahead and 146 behind main (compare status: diverged; merge base `36a560c7edde878f66b15d40987c19b17150d811`).
- Do not merge this branch wholesale. Review each remaining feature against current main, especially Firebase Admin, auth claims, email provider, moderation, library sync, and deployment gate. Use isolated PRs only after current-main compatibility and CI checks.
- Never force-push or rewrite history.

## Verification and deployment status
- The recorded CI run for the populated 24-book checkpoint (`7ce0581fdd54758d708ee8c0ff0595386af78df4`) passed 266 tests, TypeScript, production build, and the real-library gate.
- Current main HEAD `8368cf9...` includes later Wikisource audit and regression-test commits. A successful CI run for this exact HEAD has NOT yet been verified in this session.
- Current combined commit status for `8368cf9...` reports Vercel `failure` with target indicating `build-rate-limit`. This is not proof of a code-build failure and not a successful deployment.
- No Vercel production deployment, Firebase rules deployment, owner bootstrap, or Google AI Studio sync was independently confirmed here.
- Never request or commit service-account JSON, Gmail App Passwords, or other secrets.

## Wikisource candidate audit — verified result
- Workflow run #3: https://github.com/ifawz40-boop/HUKM/actions/runs/42183574861 — SUCCESS on code/data commit `8368cf9825aeee8847ecc3113dbe9ef3ec39101b`.
- Candidate-filter suite: 11 tests passed. Dataset scan: 40,782 rows; 38 eligible before and after near-duplicate deduplication.
- Full 38-row title/author/genre/word/chapter/source summary is preserved in `docs/library/WIKISOURCE_CANDIDATES_2026-11-06.md`.
- No candidate is approved for import. The script's public report truncates source pages to five and omits the full `persons` credits; complete source-page revision lineage and full contributor credits must be extracted from the pinned source before any import.
- Dataset publisher states the transcribed text is CC BY-SA 4.0, and the release QA is automated rather than human text review; it also reports 36 incomplete-marked works and 29 works with unclosed markup in the release. See https://www.bayanatlabs.com/open/arabic-wikisource-pd.
- Candidate classifications need editorial review: e.g. `إحياء علوم الدين` was surfaced under `science`. Several candidates exceed current `manifest.maximumWordsPerBook=120000`; do not raise limits without review.

## Current CI verification
- CI run #484 for commit `44e4001ca811b1ad3c2ae9b962b20371aa67842b`: SUCCESS. Job steps confirm full tests, TypeScript check, and production Vite build succeeded; test log reports 266/266 passing.
- The later candidate audit workflow #3 also passed its 11 dedicated filter tests and full pinned scan.
- Vercel combined status remains `failure` with target `build-rate-limit`; this is a provider quota/rate-limit indicator, not evidence of a source build failure and not a successful deployment.

## Latest continuation — 2026-11-06

- PR #9, `Improve Arabic Wikisource candidate audit provenance`, was merged by squash: https://github.com/ifawz40-boop/HUKM/pull/9
- Merge commit: `92b1251dd3dece8323cb32f9997e7817c5bc826d`; verified `main` was identical to that commit immediately after merge.
- CI run #42188045609 on the merge commit passed the full test suite, TypeScript check, and production build: https://github.com/ifawz40-boop/HUKM/actions/runs/42188045609
- Candidate audit run #42188045492 on the merge commit succeeded, including the candidate filter tests, full pinned scan, and upload-artifact step: https://github.com/ifawz40-boop/HUKM/actions/runs/42188045492
- Artifact `wikisource-candidate-report` ID `13487204922` was uploaded; it expires 2026-11-20. It contains 38 complete candidate metadata records, all source pages/revisions, persons, CC BY-SA attribution, source schema inventory, publication metadata, text-quality indicators, and a bounded preview. No book text was imported into the repository.
- Candidate review details and metadata-quality findings were added to `docs/library/WIKISOURCE_CANDIDATES_2026-11-06.md`.
- Independent artifact analysis: 38 candidates; all are original works; 40 author-credit records, all with Wikidata QIDs and death-year evidence; all source-page URLs/revision IDs/timestamps present; 18 records tagged `نصوص مجهولة المصدر`; 2 have missing Wikisource backlink categories; 16 exceed the current 120,000-word per-book cap; only one work has scan proofreading evidence (80 pages, 72 level-3 and 8 level-4); all candidate records have zero footnotes in dataset metadata; 37/38 lack publication_year and 33/38 lack first_publication_year; no explicit `is_incomplete` field exists in the source schema.
- A provisional review shortlist is recorded in the candidate report; it is not an approved import allowlist.
- UI issue found for future multi-source library support: `BookReaderView.tsx` hardcodes “مؤسسة هنداوي”; `BookOverviewView.tsx` labels the source link as publisher-only and shows at most the first 12 source pages without clearly stating that the list is partial. Fix these before importing Wikisource texts.
- Vercel status still reports `api-deployments-free-per-day` / more than 100 deployments per day; this is a platform quota issue, not a CI failure. No production deployment was verified.
- Google AI Studio synchronization remains unverified.
- Main's current HEAD after the report documentation update: `1317bc9dc1ffb9751e9933c5d9f96f57728204e1` (documentation-only commit after the successful code merge CI; its own CI result is pending).

## Latest continuation — page-level provenance audit (2026-11-06)

- PR #10, `Audit Wikisource categories across every source page`, merged by squash: https://github.com/ifawz40-boop/HUKM/pull/10
- Merge commit: `a6280120dc152c3c42fc04e018e66c21754581e0`; verified `main` was identical immediately after merge.
- PR CI run #42189138400 passed full tests, TypeScript and production build. PR audit run #42189138412 completed successfully, including both Python test suites, the pinned 40,782-row candidate scan, and the live page-category audit.
- Live page-level audit: 2,253/2,253 source pages and all author pages found; 0 API batch failures; 0 missing pages; 0 revision drift; all 38 candidate reports marked complete.
- The page-category audit flagged 1,380 pages across 28 books for `نصوص مجهولة المصدر`, plus one page (`معجم البلدان/الجزء الثالث`) tagged `أعمال غير مكتملة`. This exposed an important limitation in the earlier book-level-only category check.
- Full page-category artifact: https://github.com/ifawz40-boop/HUKM/actions/runs/42189138412/artifacts/13489445638 (14-day retention).
- A first GET-based API attempt failed with HTTP 414 (URI Too Long) for long Arabic title batches. The audit now uses POST requests; the final full page audit succeeded.
- Candidate report updated with the 2,253-page findings and a revised three-book shortlist: `لسان غصن لبنان`, `مقدمة ابن خلدون` (author-page Gregorian conversion discrepancy), and `سنن النسائي` (no scan-proofreading signal; low diacritization ratio). No book is approved for import.
- 28 books have at least one page tagged unknown-source. Examples: `كتاب الأحكام الشرعية الكبرى` 844/847 pages, `إحياء علوم الدين` 105/105, `فقه اللغة وسر العربية` 31/32, `عيون الأنباء` 8/54, `كتاب الاعتبار` 14/15.
- Post-merge CI run #42189392670 on code merge `a628012...` passed; post-merge full candidate + page-category audit run #42189392657 also passed. Latest documentation-only main HEAD before this log refresh was `6c1be44352e20c31ecfecf7ac9bf0a2739f251cb`; CI run #42189485397 passed tests, TypeScript and build on that exact HEAD.
- The current Vercel status remains a free-plan daily deployment quota failure; no production deployment or Google AI Studio synchronization has been independently confirmed.

## Reader and legal test-fixture research — 2026-11-06

- Current repository inspection confirms `BookReaderView.tsx` has no PDF or EPUB rendering path and `package.json` has no PDF/EPUB reader dependency.
- PDF.js: `pdfjs-dist@6.5.438`, Apache-2.0, zero runtime dependencies; latest npm version at research time. Official getting-started guidance recommends building/re-skinning a custom viewer rather than embedding the generic viewer unchanged.
- EPUB.js: `epubjs@0.3.93`, BSD-2-Clause, nine dependencies. Latest version has no direct vulnerabilities reported in the reviewed security source, but maintenance cadence is weak/inactive; do not install without a dependency and RTL spike.
- foliate-js: MIT, modular and small, but explicitly warns its API is unstable; consider only with exact commit pinning and a compatibility/security spike.
- Readium TS toolkit: BSD-3-Clause and standards-oriented, but heavier Web Publication Manifest/streaming requirements.
- Readest: AGPL-3.0; do not copy/bundle its code unless HUKM deliberately adopts compatible licensing.
- Preliminary choice: PDF.js for PDF; keep EPUB library undecided pending RTL/CSP/annotation/bundle-size tests.
- Legal PDF fixture identified: Wikimedia Commons scan of `لسان غصن لبنان في انتقاد العربية العصرية`, original 1891, 79 pages, about 2.35 MB, marked public domain. The separate Wikisource transcription is CC BY-SA 4.0; keep the scan and transcription rights paths separate.
- Exact source file page: https://commons.wikimedia.org/wiki/File:كتاب_لسان_غصن_لبنان_في_انتقاد_العربية_العصرية.pdf
- Latest docs-only main HEAD before this log refresh was `66c96380d6ce9bcf6460553f7bec11aafa08ab7a`; CI run #42190056518 passed tests, TypeScript and production build on that exact HEAD. This log refresh is documentation-only; re-fetch main before further writes.
- Latest combined status on the last verified docs HEAD still shows Vercel `build-rate-limit`; no production deployment or Google AI Studio sync was verified.

## Work completed in this session
1. Verified repository metadata, default branch, visibility and write permissions.
2. Enumerated branches (14 total from the connector's paginated search) and reviewed recent PR history (#1–#8).
3. Confirmed code/data HEAD `205211a...`; later documentation-only checkpoint commits were verified on `main`.
4. Inspected `package.json`, `vercel.json`, CI workflow, library sync workflow, Wikisource audit workflow, deployment gate, manifest, catalogue, one full-text book, deployment guide and the existing engineering checkpoint.
5. Confirmed the old deployment checkpoint is stale: it still describes an empty library and must not be used as current state.
6. Compared `main` with `deploy/vercel-preparation`; found severe divergence and explicitly deferred merging.
7. Created this durable project-level log and a precise next-task file; marked the earlier deployment checkpoint as historical.
9. Merged PR #11 for multi-source source attribution UI; verified full CI run `42190539425`.
8. Retrieved and inspected the completed candidate audit workflow logs and the exact current CI run/job steps.
9. Recorded all 38 candidate summaries and explicit no-import/rights-review caveats in `docs/library/WIKISOURCE_CANDIDATES_2026-11-06.md`.

## HUKM_CHECKPOINT
- LAST_COMPLETED_MILESTONE: Repository intelligence + pinned candidate discovery + full provenance report + live page-level category audit (partial; not a full file-by-file source audit)
- LAST_COMPLETED_TASK: Merge PR #10; verify PR CI/audit; scan all 2,253 Wikisource source pages; publish page-category artifact and update candidate review report
- CURRENT_BRANCH: main
- LAST_STABLE_COMMIT: a6280120dc152c3c42fc04e018e66c21754581e0 (PR #10 merge; PR CI and full page-category audit passed)
- TEST_STATUS: Full tests, TypeScript and production build passed on exact docs HEAD `66c963...` in run #42190056518; main page-category audit run #42189392657 passed with 2,253 pages, 0 missing, 0 API failures and 0 revision drift
- MAIN_SYNC_STATUS: main is current GitHub default branch; Google AI Studio sync itself unverified
- PENDING_TASKS: Manually review the revised three-book shortlist and source text/edition; design and test a separate CC BY-SA 4.0 rights tier only after human allowlist; make source labels/provenance UI generic; full application/security/UI audit remains pending
- NEXT_ACTION: Re-fetch main; manually review the three remaining candidates against source-page texts, edition provenance and contributor records. Then implement the PDF.js reader spike and compare EPUB.js/Foliate/Readium for Arabic RTL, CSP, progress and annotation. Do not import until a per-book allowlist and rights evidence are complete.
- KNOWN_ISSUES: Vercel daily deployment quota (>100/day); main/preparation branch divergence; no independently confirmed live deployment or Google AI Studio sync; current docs-only HEAD CI pending; candidate text quality/provenance still needs human review.


## Multi-source library attribution UI — 2026-11-06

- PR #11 merged: https://github.com/ifawz40-boop/HUKM/pull/11
- Merge commit: `205211ab6238fdbf6835884bb5f3936d488e8a0b`.
- Verified `main` is identical to the merge commit after merge.
- PR CI run #42190539425 passed the full test suite, TypeScript check and production build on exact PR head `5e2fb0b2bab4e17da8b6ac9348e44673ae80b1f9`.
- Added `src/utils/bookProvenance.ts` and tests `src/utils/bookProvenance.test.ts`; full test script includes the new test file.
- Added optional `BookRights.sourceNameAr` for explicit Arabic source labels.
- Book overview now identifies Hindawi, Wikisource, Wikimedia Commons, Internet Archive and Open Library sources without mislabeling all sources as a publisher.
- Reader footer now resolves source name from rights metadata/host instead of hardcoding Hindawi.
- Source-page disclosure now explicitly states when it displays only the first 12 of a larger source-page list.
- No dependencies, book content, rights tiers, source hashes, or deployment-gate rules were changed.
- Independent diff review: six files changed; no changes outside the typed provenance helper, tests, source attribution UI, and test script.
- Current Vercel combined status remains a free-plan daily deployment quota failure; not a CI/code failure. Google AI Studio synchronization and production deployment remain unverified.

## Manual review — first candidate scan/source — 2026-11-06

- Wikimedia Commons file page for `كتاب لسان غصن لبنان في انتقاد العربية العصرية.pdf` identifies an 1891 Arabic edition, publisher `المطبعة العثمانية في بعبدا`, author Shakir Shuqayr (1850–1896), 79 pages, approximately 2.35 MB.
- Commons marks the mechanical scan of the public-domain original as Public Domain / Public Domain Mark 1.0. This evidence applies to the scan/original, not automatically to a separate Wikisource transcription.
- Wikisource index identifies the same 1891 edition and says all pages are corrected, but some are not proofread; it reports full transclusion. The work text includes editorial/paratext material (for example, a note that chapter headings are not in the original) and the title page contains the historical statement "حق الطبع محفوظ". These require collation against the scan before import.
- Wikisource text is a separate CC BY-SA 4.0 rights path; do not confuse the transcription licence with the Commons scan's public-domain status.
- The scan is approved as a reader test fixture only, not yet imported into the library. No text/transcription import is approved.
- Sources reviewed: Commons file page https://commons.wikimedia.org/wiki/File:كتاب_لسان_غصن_لبنان_في_انتقاد_العربية_العصرية.pdf ; Wikisource index https://ar.wikisource.org/wiki/فهرس:كتاب_لسان_غصن_لبنان_في_انتقاد_العربية_العصرية.pdf ; Wikisource work https://ar.wikisource.org/wiki/لسان_غصن_لبنان_في_انتقاد_العربية_العصرية .

## HUKM_CHECKPOINT
- LAST_COMPLETED_MILESTONE: Multi-source library provenance UI and independent CI verification
- LAST_COMPLETED_TASK: Merge PR #11; verify full tests, TypeScript and production build; replace hardcoded source attribution; clarify partial source-page disclosure
- CURRENT_BRANCH: main
- LAST_STABLE_COMMIT: 205211ab6238fdbf6835884bb5f3936d488e8a0b
- LATEST_VERIFIED_CI_HEAD: 28907a39b891ab3a86e4e10a8131f07c4f2f35b9 (docs-only; exact-head CI #42190987662 passed)
- TEST_STATUS: PR CI run #42190539425 passed on exact PR head; documentation-only `main` HEAD `28907a39...` also passed exact-head push CI run #42190987662 (tests, TypeScript, production build). Vercel status remains quota-limited, not code CI.
- MAIN_SYNC_STATUS: GitHub main confirmed; Google AI Studio sync unverified
- PENDING_TASKS: Design and test a distinct CC BY-SA 4.0 transcription rights tier only after human-approved allowlist; continue PDF.js integration spike; EPUB engine still unselected; full application/security/UI audit remains pending
- NEXT_ACTION: Review the exact Wikisource scan against the transcription page by page for additions/omissions, then implement a PDF.js-based reader route for legally cleared PDF files using a locally pinned worker. Do not add a package until the lockfile can be regenerated and CI validates it. Keep existing text reader intact.
- KNOWN_ISSUES: Vercel daily deployment quota; no verified production deployment or Google AI Studio sync; Wikisource text needs collation and CC BY-SA rights workflow before import; PDF/EPUB reader paths are not implemented.


## PDF.js reader, scan fixture, bookmarks and notes — 2026-11-06

### PDF.js reader
- PR #12 merged: https://github.com/ifawz40-boop/HUKM/pull/12
- Merge commit: `ab754d8048312dbcca17fa81054a00089fe1bda7`; `main` verified identical immediately after merge.
- Push CI run #42192349189 passed on the exact merge commit: full tests, TypeScript and production build.
- Added exact dependency `pdfjs-dist@6.5.438` with a regenerated Bun v2 lockfile.
- Added `src/components/PdfReaderView.tsx`, a lazy-loaded reader route and a separate scanned-PDF shelf. Existing structured-text reader and 24-book text catalogue were not changed.
- Features: one-page-at-a-time canvas rendering, page navigation, fit-width, bounded zoom, and local resume progress per document/user.
- Vite output: PDF.js vendor chunk 443.06 KB (133.32 KB gzip), reader chunk 9.53 KB (3.51 KB gzip), worker 1,271.91 KB, loaded only with the reader route.
- CORS smoke run #42192077727 confirmed Wikimedia PDF returns HTTP 206 for a byte range, `Access-Control-Allow-Origin: *`, and exposes `Content-Range`.
- Test fixture: `لسان غصن لبنان في انتقاد العربية العصرية`, 1891 scan, 79 pages, 2,459,452 bytes; Commons source page pinned to revision `1186958260`; Commons marks the mechanical scan Public Domain / PDM 1.0. The separate Wikisource transcription is not bundled or imported.

### PDF bookmarks, notes and search
- PR #13 merged: https://github.com/ifawz40-boop/HUKM/pull/13
- Merge commit: `efe2847232762dfde37970223324573d06f65897`; `main` verified identical immediately after merge.
- Push CI run #42192746029 passed on the exact merge commit: 284 tests, 0 failures, TypeScript and production build.
- Added per-page bookmarks and notes, with 5,000-character note cap.
- Progress, bookmarks and notes are stored locally, scoped by document and account/guest. No cloud sync is implemented or claimed.
- Added sequential full-document search for PDFs marked as having an extractable text layer; Arabic normalization handles common alef/ya variants and tashkeel, search progress is visible and the scan can be cancelled.
- The current image-only Commons scan correctly remains `searchAvailable: false`; no OCR is claimed.

### EPUB engine research decision
- `@readium/navigator` 2.14.0 is actively published and BSD-3-Clause, with a maintained TypeScript toolkit.
- Readium Web is not a drop-in raw-EPUB browser component: its TS toolkit consumes Readium Web Publication Manifests/resources; the Go toolkit converts packaged EPUBs into web publications and serves their resources. A static pre-processing pipeline at ingestion time is the preferred architecture candidate for HUKM, avoiding a permanent Go server on Vercel.
- `epubjs` 0.3.93 remains widely downloaded but the npm version history shows the stable release is about five years old.
- `foliate-js` supports EPUB but its own README describes the API as unstable and the demo as incomplete.
- No EPUB dependency has been added. Prototype Readium preprocessing with a legally cleared sample before choosing the runtime.

### Current deployment state
- Vercel combined status on the PDF reader merge still reports `build-rate-limit` (free-plan quota), not a code-build failure.
- GitHub Actions passed; production deployment and Google AI Studio synchronization remain unverified.

## HUKM_CHECKPOINT
- LAST_COMPLETED_MILESTONE: PDF.js reader v1, local bookmarks/notes, Arabic text search, and source-rights fixture
- LAST_COMPLETED_TASK: Merge PR #12 and PR #13; verify exact merge CI runs #42192349189 and #42192746029
- CURRENT_BRANCH: main
- LAST_STABLE_COMMIT: efe2847232762dfde37970223324573d06f65897
- TEST_STATUS: 284 tests passed, 0 failed; TypeScript and production build passed on exact main merge commit in run #42192746029
- MAIN_SYNC_STATUS: GitHub main confirmed; Google AI Studio sync unverified
- PENDING_TASKS: browser runtime smoke test when Vercel deployment quota permits; EPUB Readium preprocessing prototype; optional Firestore sync for PDF progress after rules review; OCR feasibility for scanned works; continue security/accessibility/mobile audit
- NEXT_ACTION: Prototype a Readium Go-toolkit EPUB-to-WebPub ingestion step in an isolated feature branch using a public-domain EPUB fixture. Generate a manifest and static resources, test the TS navigator with Arabic RTL/TOC/CFI, measure bundle and storage size, and do not import the EPUB into the public library until its source and redistribution rights are documented.
- KNOWN_ISSUES: Vercel daily build quota; no verified production deployment or Google AI Studio sync; PDF progress/bookmarks/notes are local-only; current scanned PDF has no OCR/search; EPUB reader not implemented.


## Owner-only library curation dashboard — 2026-11-06

- Re-fetched repository metadata and confirmed `main` HEAD: `d9ffac968aac9f629c46b0a81f00fa7d877c2cd8`.
- Verified PR #14 is merged at `175356b3632f1f054c6280e5c986761cf2d07059`; the library curation work is already on main and was not repeated.
- Verified PR #15 is merged at `d9ffac968aac9f629c46b0a81f00fa7d877c2cd8`; `vercel.json` retains `{"*": false, "main": true}` for Git-triggered deployments.
- Queried GitHub Actions for the exact main HEAD: push workflow #42231218981 completed with conclusion `success`. The combined Vercel status on that commit also reports `success`.
- PR #15's Vercel bot comment reports a Ready **Preview** deployment for the feature branch. This is not recorded as a production deployment. Google AI Studio synchronization remains unverified.
- Re-read `curation.json`, `candidates.json`, `manifest.json`, editorial policy and author evidence. Confirmed 24 quarantined legacy IDs, zero approved IDs and 22 candidate records (all pending full-text review). The previous next-task file's count of 18 was stale.
- Inspected `App.tsx`, `HukmNavbar.tsx`, the owner/admin permission service and existing library data flow before adding a new owner-only workflow.
- Created branch `feat/owner-library-curation-dashboard` from the exact main HEAD.
- In progress: a read-only owner-only candidate review panel with category/status/search filters and source links. It deliberately has no approval/publishing controls and performs no database writes.
- Files changed on the feature branch: `src/components/LibraryCurationPanel.tsx`, `src/components/HukmNavbar.tsx`, `src/App.tsx`.
- Verification status for this feature: pending PR CI and independent diff review. Do not mark complete until the exact PR head passes tests, TypeScript and production build.
- Next: review branch diff, open PR, verify CI, fix issues if found, then update this checkpoint with exact results. After merge, design a separately audited review-record workflow; do not approve candidates based on metadata or spot checks.


## Owner-only library curation dashboard — merged and verified (2026-11-06)

- PR #16 merged by squash: https://github.com/ifawz40-boop/HUKM/pull/16
- Merge commit / current main HEAD at this checkpoint: `66a7f7cd5033aa9d92f3fc114dedfccd745a2d69`.
- Feature branch: `feat/owner-library-curation-dashboard`; exact PR head: `962ca4763e081f0b9946ae3462004a021bc3b4c0`.
- PR CI run #42232576073 completed successfully: 286 tests passed, 1 skipped, TypeScript check passed and production build passed.
- Post-merge push CI run #42232831631 completed successfully on the exact merge commit: 286 tests passed, 1 skipped, TypeScript check passed and production build passed.
- Added `src/components/LibraryCurationPanel.tsx` and owner-only navigation/mounting in `src/components/HukmNavbar.tsx` and `src/App.tsx`.
- The panel reads the existing 22 metadata-only candidates, supports search and category/status filtering, shows source/edition/review metadata, and rejects non-HTTPS external links.
- Independent diff review confirmed the panel has no approval/rejection/publication controls and performs no database/API writes. Both the navbar entry and App mount use the existing effective-owner gate, so normal admins/readers and owner preview mode do not see it.
- Public library policy and allowlist are unchanged: 24 legacy records quarantined, zero approved IDs, 22 pending candidates.
- Vercel combined status on the merge commit reports `build-rate-limit`; Vercel's bot explains the free-plan limit (>100 deployments/day). This is not a code CI failure and no production deployment is confirmed.
- Vercel also posted a quota-failure comment on PR #16 despite the repository's `git.deploymentEnabled: {"*": false, "main": true}`. Official docs describe this property as branch deployment control with minimatch support. Effective project behavior must be checked in Vercel Project Settings before claiming branch previews are disabled.
- Google AI Studio synchronization remains unverified.
- Next: add focused regression tests for panel access/filtering/HTTPS/read-only invariants; investigate Vercel project settings without disabling main; continue the private full-text editorial review process.


## Curation dashboard regression tests — merged and verified (2026-11-06)

- PR #18 merged by squash: https://github.com/ifawz40-boop/HUKM/pull/18
- Merge commit / current main HEAD at checkpoint: `bd99aac3e4cc47b4eb5b947961612f8312707dae`.
- Extracted `filterLibraryCandidates` and `isSafeExternalUrl` into `src/utils/libraryCuration.ts`; the UI now uses the tested pure helpers.
- Added `src/utils/libraryCuration.test.ts` to the full test command. Coverage includes HTTPS-only source URLs, rejection of embedded credentials, Arabic search over title/author/edition/reason, combined category/status filters and empty filters.
- Added static regression assertions in `tests/staticLibrary.test.ts` for owner-only navigation/mounting, read-only behavior and safe external links.
- PR CI #42233338320 and post-merge push CI #42233459070 both completed successfully.
- Post-merge exact test totals: 292 tests, 291 passed, 0 failed, 1 skipped. TypeScript check and production build passed.
- Vercel status remains quota-limited (>100 deployments/day); no latest production deployment is confirmed. Effective branch deployment behavior remains to be checked in Vercel Project Settings.
- Current public library still has 22 candidates, zero approved IDs and 24 quarantined legacy records.
- Next: accessibility/mobile audit of the dialog; verify Vercel project-level branch settings; continue private full-text editorial review.


## Preliminary source audit — فصل في تزكية النفس (2026-11-06)

- PR #20 merged by squash: https://github.com/ifawz40-boop/HUKM/pull/20
- Merge commit / main HEAD at this checkpoint: `3c1257557abc683cc5f257864ab9b317955255d8`.
- Added `docs/library/CANDIDATE_REVIEWS/ibn-taymiyyah-fasl-fi-tazkiyat-al-nafs.md` with a preliminary source/edition audit.
- Corrected the candidate's bibliographic metadata: 63 printed pages in the text edition record vs 68 pages in the Waqfeya PDF scan; recorded Maktabat al-Nahj al-Wadih, Kuwait, first edition 1439 AH / 2018, and the attribution "اعتنى به فواز محمد العوضي".
- Added the report link to the owner-only dashboard and displayed print pages, scan pages, publisher and publication year separately.
- Added regression coverage to `tests/staticLibrary.test.ts` for the candidate's corrected metadata and review-report link.
- The report distinguishes the editor's modern introduction from Ibn Taymiyyah's text and records the claim that the older *Majmuʿ al-Fatawa* excerpt omits a substantial part of the latter half. It does not treat this as proof of the full edition's accuracy.
- The candidate remains `metadata-verified-content-review-pending`; no approval ID was added. Full-text collation, all footnotes, hadith/athar verification, author/editor evidence and rights clearance remain incomplete.
- Post-merge CI run #42234324080 succeeded on the exact merge commit: 293 tests, 292 passed, 0 failed, 1 skipped; TypeScript and production build passed.
- Vercel still reports the free-plan deployment rate limit; no production deployment is confirmed.
- Next: obtain an authorized complete edition for private page-by-page review, continue the dashboard accessibility audit, and verify Vercel project-level branch settings.


## Curation dialog keyboard accessibility — merged and verified (2026-11-06)

- PR #23 merged by squash: https://github.com/ifawz40-boop/HUKM/pull/23
- Merge commit / current main HEAD at checkpoint: `9f7ac3679062326f07543f2caaa95427527b096f`.
- Added initial focus to the close control, Escape-to-close, Tab/Shift+Tab focus containment, accessible description wiring and scroll containment inside the dialog.
- Added static regression assertions for keyboard operation and focus containment.
- Added a static assertion for the Vercel Git deployment policy: wildcard false and main true.
- PR CI run #42235061723 completed successfully: 294 tests, 293 passed, 0 failed, 1 skipped; TypeScript and production build passed.
- Post-merge push CI run #42235175548 completed successfully on the exact merge commit.
- Vercel status remains `build-rate-limit` due the free-plan deployment quota; no production deployment is confirmed.
- Current library remains 22 candidates, zero approved, 24 legacy records quarantined.
- The *Fasl fi Tazkiyat al-Nafs* report now includes historical author evidence and caveats about scholarly disagreement; full-text review remains incomplete.
- Next: authorized full-text review, manual browser/screen-reader audit, and Vercel project settings verification.


## Checkpoint after keyboard-accessibility work — 2026-11-06

- PR #24 merged by squash: https://github.com/ifawz40-boop/HUKM/pull/24
- Merge commit / current main HEAD: `943c80f80ecf5652d29ea40465bdd1b90ab4447e`.
- Exact main push CI run #42235430190 completed successfully: 294 tests, 293 passed, 0 failed, 1 skipped; TypeScript and production build passed.
- The curation panel is owner-only and read-only, with HTTPS-validated source links, tested candidate filtering, and keyboard focus containment / Escape close.
- PR #22's historical author evidence for Ibn Taymiyyah is merged into the preliminary review report. The treatise remains pending full-text review and is not approved.
- The library still has 22 candidates, zero approved IDs and 24 quarantined legacy records.
- Vercel's current main status remains `build-rate-limit` due the free-plan deployment quota. No production deployment is confirmed.
- The Vercel branch configuration is covered by a regression assertion; actual project-level behavior still needs dashboard verification.
- Google AI Studio synchronization remains unverified.
- Next: obtain an authorized complete edition for private review, perform manual browser/screen-reader audit, and verify Vercel Project Settings.


## Final checkpoint after PR #25 — 2026-11-06

- PR #25 merged by squash: https://github.com/ifawz40-boop/HUKM/pull/25
- Merge commit / current main HEAD: `306bbc0bf9cd57e10d30f84bd5c6a79cc27d7709`.
- PR CI #42235610950 and post-merge main CI #42235696201 completed successfully.
- Exact post-merge test totals: 294 tests, 293 passed, 0 failed, 1 skipped; TypeScript and production build passed.
- Vercel status remains `build-rate-limit` due the free-plan deployment quota. No production deployment is confirmed.
- The owner-only curation dashboard, tested candidate filters/HTTPS links, source-review report, historical author evidence and keyboard-accessible dialog are merged.
- Candidate set remains 22; approved IDs remain zero; 24 legacy books remain quarantined.
- *Fasl fi Tazkiyat al-Nafs* remains pending full-text review and rights clearance.
- Main-only Git deployment policy is present and statically tested; effective Vercel project settings still need verification.
- Google AI Studio synchronization remains unverified.
- Next: obtain an authorized complete edition for private review, perform manual browser/screen-reader audit, and verify Vercel Project Settings.


## Checkpoint HEAD semantics — 2026-11-06

- Clarified that `306bbc0bf9cd57e10d30f84bd5c6a79cc27d7709` is the verified application-code HEAD before the documentation-only PR #26 checkpoint.
- PR #26's documentation-only merge commit is `e1226e146401ad371d0f6280d0e095d1bd8bacfd`.
- The checkpoint now explicitly instructs the next session to re-fetch the live `main` HEAD rather than treating the recorded code HEAD as the current repository tip.


## Curation dialog focus restoration and background scroll lock — PR #28 (2026-11-06)

- PR #28: https://github.com/ifawz40-boop/HUKM/pull/28
- Development branch: `fix/curation-dialog-focus-restoration`.
- Code/test commit: `37d1effbf9db79238e45c16f79060b75f8b0eb81`.
- CI run #42237351405 completed successfully on that exact code/test commit: full test suite, TypeScript check and production build all passed.
- Added a document-level keyboard listener while the owner-only curation dialog is open; Escape closes the dialog and Tab/Shift+Tab remain contained even if focus is moved outside the dialog.
- Focus moves to the close control on open and returns to the invoking element on close when it is still connected to the document.
- Background body scrolling is locked while the dialog is open and the previous inline overflow value is restored during cleanup.
- Preserved the existing `overscroll-contain`, candidate publisher/edition/scan-page metadata and candidate-specific review-report links. The older unmerged accessibility branch was not merged because it removed some of those current-main details.
- Added static regression assertions for listener registration/removal, focus restoration, Escape handling, body scroll locking and retained scroll containment.
- Scope is limited to `src/components/LibraryCurationPanel.tsx` and `tests/staticLibrary.test.ts`; no curation status, allowlist, Firestore/API, publication or deployment behavior changed.
- PR #28 was subsequently merged after final-head CI and independent diff review; the exact merge and post-merge verification are recorded in the following checkpoint section.
- Current live `main` HEAD at PR creation: `39f1ec926b15c228936575ace7c73c464e72bfbe`.
- Vercel still reports `build-rate-limit`; no production deployment is confirmed.


## Curation dialog focus restoration — merged and verified (2026-11-06)

- PR #28 merged by squash: https://github.com/ifawz40-boop/HUKM/pull/28
- Merge commit and verified live `main` HEAD: `320b73c099932cecbea818db6c8002f5d449d8ad`.
- PR head `7a0e0f12eb91063e403e2bc64f784ffe5b4776ed` passed CI run #42237516574: full test suite, TypeScript check and production build.
- Post-merge main CI run #42237608247 passed on the exact merge commit `320b73c099932cecbea818db6c8002f5d449d8ad`.
- The owner-only curation dialog now moves focus to its close control on open, contains Tab/Shift+Tab at document level, closes on Escape, restores focus to the invoking element when it remains connected, and locks background scrolling while open.
- Existing candidate metadata (publisher, publication year, printed/scan page counts), candidate-specific review-report links and `overscroll-contain` were preserved.
- Added regression assertions for focus restoration, keyboard listener registration/removal, Escape handling, background scroll lock/restore and overscroll containment.
- Changed application files: `src/components/LibraryCurationPanel.tsx`, `tests/staticLibrary.test.ts`; documentation checkpoint was included in PR #28.
- No book approval, allowlist, Firestore/API, authentication, publication or Vercel deployment behavior changed.
- Main-only Git deployment policy remains `{"*": false, "main": true}`; the existing Vite build command, API function duration and API/SPA rewrites remain intact.
- Combined Vercel status on the merge commit still reports `build-rate-limit`; no production deployment is confirmed. Google AI Studio synchronization remains unverified.
- Next: manual browser/mobile/screen-reader accessibility audit; verify effective Vercel Project Settings; obtain an authorized complete edition before full-text review of *Fasl fi Tazkiyat al-Nafs*. Do not mark any of these complete without evidence.


## Continuation update — PR #29 and PR #30 merged (2026-11-06)

- Re-fetched repository state before this checkpoint. Current `main` HEAD: `1f5c98a918eb491db721270f14a6473dff50c39d`.
- PR #29 (documentation checkpoint for PR #28) merged at `a53324a7bce17a65eff65bef96ea3aaa8b0d0af4`; its CI run #42237951013 passed.
- PR #30 (sourced candidate review for *Mukhtasar Minhaj al-Qasidin*) merged at `1f5c98a918eb491db721270f14a6473dff50c39d`; post-merge main CI run #42238372655 passed on this exact main HEAD.
- Exact main check run: `Tests, typecheck and production build` — completed successfully on `1f5c98a918eb491db721270f14a6473dff50c39d`.
- Candidate inventory is now 23. `src/data/library/curation.json` still has zero approved IDs and 24 quarantined legacy IDs. Public text and PDF catalogues remain empty.
- PR #30 adds `docs/library/CANDIDATE_REVIEWS/mukhtasar-minhaj-al-qasidin.md`, metadata for candidate `ibn-qudama-mukhtasar-minhaj-al-qasidin`, and regression assertions. It carefully distinguishes Nجم الدين أحمد بن عبد الرحمن بن قدامة (d. 689 AH) from موفق الدين عبد الله بن أحمد بن قدامة (d. 620 AH), صاحب `المغني`.
- The candidate remains `metadata-verified-content-review-pending`; the 408-page edition, notes, inherited material from `إحياء علوم الدين`, hadith/athar, author-methodology and digital rights have not been fully reviewed. It is not approved and must not appear publicly.
- PR #14 is confirmed merged at `175356b3632f1f054c6280e5c986761cf2d07059`; the 24 legacy titles remain quarantined rather than deleted.
- Vercel Git deployment policy in `vercel.json` remains `{"*": false, "main": true}`. This file-level setting is verified; effective Vercel Project Settings and a production deployment are not verified. Earlier Vercel status reported `build-rate-limit`; do not claim production is deployed.
- Google AI Studio synchronization remains unverified.
- A new documentation-only continuation branch `docs/checkpoint-main-1f5c98a` was created from this exact main HEAD to refresh stale continuation records. No direct main write was made.

