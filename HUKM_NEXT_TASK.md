# HUKM MEDIA — Exact Continuation Checkpoint

Last refreshed: 2026-11-06
Repository: `ifawz40-boop/HUKM`
Default / Google AI Studio branch: `main`
Current development branch: `feat/owner-library-curation-dashboard`
Verified main HEAD at checkpoint: `d9ffac968aac9f629c46b0a81f00fa7d877c2cd8`

## Verified repository and merge state

- PR #14 (Islamic library curation) is **merged**. Merge commit: `175356b3632f1f054c6280e5c986761cf2d07059`.
- PR #15 (Vercel Git deployments from main only) is **merged**. Merge commit and current main HEAD: `d9ffac968aac9f629c46b0a81f00fa7d877c2cd8`.
- PR #15 preserves Vite, Bun install, API function duration, API rewrite and SPA fallback configuration.
- `vercel.json` contains `git.deploymentEnabled: {"*": false, "main": true}`.
- GitHub Actions push workflow #42231218981 completed successfully on the exact main HEAD `d9ffac9...`.
- The combined commit status for that exact main HEAD reports Vercel `success`.
- Vercel's bot posted a **Ready Preview** for PR #15 at `https://hukm-git-fix-vercel-main-only-deployments-ifawz40-boop.vercel.app`. This is a branch preview, not proof of a production deployment.
- Production deployment and Google AI Studio synchronization have not been independently verified. Do not claim either.

## Current public-library state

1. All 24 legacy full-text books remain archived under `src/data/library/archive/books/`; the former catalogue and PDF fixture metadata are also archived.
2. The public text catalogue and public PDF shelf are empty.
3. `src/data/library/curation.json` has an empty `approvedBookIds` allowlist and 24 quarantined legacy IDs.
4. The only allowed categories are `religious`, `self-development`, `travel`, and `islamic-philosophy-critique`.
5. `src/data/library/candidates.json` currently contains **22** bibliographic candidates. Every candidate remains `metadata-verified-content-review-pending`; none is approved.
6. The candidate set is bibliographic metadata, not permission to publish full text. Full-text, footnote, author-methodology and edition review remain required.
7. The deployment gate permits the explicit empty-curation state. A populated public catalogue still requires at least 15 complete books and all editorial, integrity and rights checks.
8. Legacy Hindawi synchronization remains manual-only. Never restore the old automatic sync.

Read before changing candidate status:
- `docs/library/EDITORIAL_POLICY.md`
- `docs/library/AUTHOR_EVIDENCE_2026-11-06.md`
- `docs/library/CURRENT_LIBRARY_REVIEW_2026-11-06.md`

## Reader state

- PDF.js reader is implemented with a locally bundled worker and lazy-loaded route.
- PDF page progress, bookmarks and notes are local-only; no cloud sync is implemented or claimed.
- Arabic text search is enabled only for PDFs marked as having an extractable text layer.
- The current scanned PDF fixture is image-only and correctly has `searchAvailable: false`; no OCR is claimed.
- EPUB reader is not implemented. Readium preprocessing remains the preferred prototype direction; do not add an EPUB runtime dependency before an Arabic RTL, CSP, navigation and bundle-size spike.

## Current in-progress change

Branch: `feat/owner-library-curation-dashboard`

- Adds an owner-only candidate review panel opened from the admin micro-navigation.
- Shows the 22 candidate records, editorial category, bibliographic edition/page count, current review status, initial spot-check note and source links.
- Adds search and category/status filtering.
- The panel is intentionally read-only: it has no approve, reject, publish or database-write action. Candidate status remains controlled by reviewed repository data and the editorial process.
- Files changed: `src/components/LibraryCurationPanel.tsx`, `src/components/HukmNavbar.tsx`, `src/App.tsx`.
- CI and production build for this feature branch are pending until its PR workflow completes.

## Immediate next actions

1. Review the exact feature-branch diff and ensure the curation entry point is visible only to the verified effective owner (not ordinary admins, readers or owner preview mode).
2. Run the full test suite, TypeScript check and production build through PR CI. Fix any failures without weakening existing security or library gates.
3. Confirm the dashboard reads the exact 22 candidate records and that all links are safe external links. Confirm it has no approval or publishing mutation path.
4. Merge only after CI succeeds and the diff is independently reviewed. Re-fetch `main` after merge and verify the merge commit and push workflow.
5. Next editorial milestone: obtain and review complete source texts for candidates in a controlled/private workflow; record author evidence, edition, introductions, footnotes and review findings per book. Do not approve from title, source page or opening-page spot checks.
6. Next engineering milestone after the read-only panel: design a durable review-record format and reviewer workflow before implementing any status-changing action. Keep approval and publication as separate, explicitly audited transitions.
7. Continue the independent accessibility, mobile, security and reader smoke-test audit.

## Safety and continuation rules

- Never edit `main` directly, force-push or rewrite history.
- Never expose candidate texts as public books or mark any candidate approved without full review.
- Never put unlicensed full texts or scans in the public repository.
- Never weaken the deployment gate to make a build pass.
- A successful GitHub Actions run or Vercel status does not by itself prove production deployment.
- Re-fetch `main`, branches, PRs and current file SHAs before every new write.
