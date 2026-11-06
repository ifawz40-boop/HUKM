# HUKM MEDIA — Development Log

## Current verified checkpoint
- Date: 2026-11-06
- Repository: `ifawz40-boop/HUKM`
- Google AI Studio target branch (user-provided): `main`
- Last verified code/data HEAD: `8368cf9825aeee8847ecc3113dbe9ef3ec39101b` (subsequent commits in this session are documentation-only).
- Verification method: GitHub commit search plus `compare_commits(8368cf9... , main)` returned `identical` before this session's documentation-only commits; the docs-only commits were separately verified on `main`.
- Repository permissions on connected account: Admin / Push.
- Default branch: `main`.
- Latest known PR: #8, merged. PRs #1–#8 are closed and merged.
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

## Work completed in this session
1. Verified repository metadata, default branch, visibility and write permissions.
2. Enumerated branches (14 total from the connector's paginated search) and reviewed recent PR history (#1–#8).
3. Confirmed code/data HEAD `8368cf9...`; later documentation-only checkpoint commits were verified on `main`.
4. Inspected `package.json`, `vercel.json`, CI workflow, library sync workflow, Wikisource audit workflow, deployment gate, manifest, catalogue, one full-text book, deployment guide and the existing engineering checkpoint.
5. Confirmed the old deployment checkpoint is stale: it still describes an empty library and must not be used as current state.
6. Compared `main` with `deploy/vercel-preparation`; found severe divergence and explicitly deferred merging.
7. Created this durable project-level log and a precise next-task file; marked the earlier deployment checkpoint as historical.
8. Retrieved and inspected the completed candidate audit workflow logs and the exact current CI run/job steps.
9. Recorded all 38 candidate summaries and explicit no-import/rights-review caveats in `docs/library/WIKISOURCE_CANDIDATES_2026-11-06.md`.

## HUKM_CHECKPOINT
- LAST_COMPLETED_MILESTONE: Repository intelligence, initial Wikisource candidate discovery, and full candidate provenance-report pipeline (partial; not a full file-by-file source audit)
- LAST_COMPLETED_TASK: Merge PR #9; verify CI run #42188045609 and audit run #42188045492; publish full provenance artifact and update candidate review report
- CURRENT_BRANCH: main
- LAST_STABLE_COMMIT: 92b1251dd3dece8323cb32f9997e7817c5bc826d (merge commit; CI and candidate audit both passed)
- TEST_STATUS: Full tests, TypeScript and production build passed in CI run #42188045609; candidate audit tests and full pinned scan passed in run #42188045492
- MAIN_SYNC_STATUS: main is current GitHub default branch; Google AI Studio sync itself unverified
- PENDING_TASKS: Complete manual review of the provisional candidate shortlist; decide a human-approved allowlist; design and test a separate CC BY-SA 4.0 rights tier; make source labels/provenance UI generic; full application/security/UI audit remains pending
- NEXT_ACTION: Re-fetch current main, verify CI for docs HEAD `1317bc9...`, then manually review the six provisional candidates against source-page texts and edition provenance. Do not import until a per-book allowlist and rights evidence are complete.
- KNOWN_ISSUES: Vercel daily deployment quota (>100/day); main/preparation branch divergence; no independently confirmed live deployment or Google AI Studio sync; current docs-only HEAD CI pending; candidate text quality/provenance still needs human review.
