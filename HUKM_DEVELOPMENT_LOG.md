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

## Work completed in this session
1. Verified repository metadata, default branch, visibility and write permissions.
2. Enumerated branches (14 total from the connector's paginated search) and reviewed recent PR history (#1–#8).
3. Confirmed code/data HEAD `8368cf9...`; later documentation-only checkpoint commits were verified on `main`.
4. Inspected `package.json`, `vercel.json`, CI workflow, library sync workflow, Wikisource audit workflow, deployment gate, manifest, catalogue, one full-text book, deployment guide and the existing engineering checkpoint.
5. Confirmed the old deployment checkpoint is stale: it still describes an empty library and must not be used as current state.
6. Compared `main` with `deploy/vercel-preparation`; found severe divergence and explicitly deferred merging.
7. Created this durable project-level log and a precise next-task file; marked the earlier deployment checkpoint as historical.

## HUKM_CHECKPOINT
- LAST_COMPLETED_MILESTONE: Repository intelligence / current-state verification (partial; not a full file-by-file source audit)
- LAST_COMPLETED_TASK: Verify main HEAD, inspect core build/library/audit files, reconcile branch state, document current facts
- CURRENT_BRANCH: main
- LAST_STABLE_COMMIT: 8368cf9825aeee8847ecc3113dbe9ef3ec39101b (repository head verified; exact-head CI not yet verified)
- TEST_STATUS: 266 tests + typecheck + production build passed at prior 7ce0581 checkpoint; exact current HEAD status pending
- MAIN_SYNC_STATUS: main is current GitHub default branch; Google AI Studio sync itself unverified
- PENDING_TASKS: Obtain candidate audit workflow output; review candidate list and rights; run/verify CI on current main; full application/security/UI audit remains pending
- NEXT_ACTION: Read HUKM_NEXT_TASK.md and inspect the actual Wikisource audit output before any book ingestion
- KNOWN_ISSUES: Vercel build-rate-limit status; main/preparation branch divergence; no independently confirmed live deployment; exact-head CI still pending.
