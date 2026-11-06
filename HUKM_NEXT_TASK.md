# HUKM MEDIA — Exact Continuation Checkpoint

Last refreshed: 2026-11-06
Repository: `ifawz40-boop/HUKM`
Default / Google AI Studio branch: `main`
Current documentation branch: `docs/checkpoint-curation-dashboard-merged`
Verified main HEAD at checkpoint: `66a7f7cd5033aa9d92f3fc114dedfccd745a2d69`

## Verified repository and merge state

- PR #14 (Islamic library curation) is merged at `175356b3632f1f054c6280e5c986761cf2d07059`.
- PR #15 (Vercel Git deployment branch configuration) is merged at `d9ffac968aac9f629c46b0a81f00fa7d877c2cd8`.
- PR #16 (owner-only read-only library curation dashboard) is merged at `66a7f7cd5033aa9d92f3fc114dedfccd745a2d69`.
- GitHub Actions push workflow #42232831631 completed successfully on the exact current main HEAD: 286 tests passed, 1 skipped, TypeScript check passed, and production build passed.
- The combined Vercel status on the current main HEAD reports `failure` with the target `build-rate-limit`. Vercel's bot reports the free-plan limit of more than 100 deployments/day. This is a provider quota limitation, not a GitHub Actions test/build failure.
- Vercel did not confirm a new production deployment for this merge. Do not claim the site is live from this CI result.
- Important unresolved deployment check: PR #16 received a Vercel bot failure comment for the same deployment quota while the repo's `vercel.json` contains `git.deploymentEnabled: {"*": false, "main": true}`. Official Vercel documentation says this property controls which branches trigger deployments and supports minimatch patterns. The effective Vercel project behavior still needs confirmation in Project Settings; do not assume the JSON rule has been enforced until verified.
- Google AI Studio synchronization remains unverified.

## Current public-library state

1. All 24 legacy full-text books remain archived under `src/data/library/archive/books/`; their old catalogue and PDF fixture metadata are preserved in the archive.
2. The public text catalogue and public PDF shelf are empty.
3. `src/data/library/curation.json` has an empty `approvedBookIds` allowlist and 24 quarantined legacy IDs.
4. The only allowed categories are `religious`, `self-development`, `travel`, and `islamic-philosophy-critique`.
5. `src/data/library/candidates.json` contains 22 bibliographic candidates. All remain `metadata-verified-content-review-pending`; none is approved.
6. Candidate metadata and opening-page spot checks are not full-text approval. Full text, footnotes, introductions, author methodology, editor and edition must be reviewed before a decision.
7. The deployment gate allows the explicit empty-curation state. A populated public catalogue still requires at least 15 complete books and all editorial, integrity and rights checks.
8. Legacy Hindawi synchronization remains manual-only.

Read before changing candidate status:
- `docs/library/EDITORIAL_POLICY.md`
- `docs/library/AUTHOR_EVIDENCE_2026-11-06.md`
- `docs/library/CURRENT_LIBRARY_REVIEW_2026-11-06.md`

## Reader state

- PDF.js reader is implemented with a locally bundled worker and lazy-loaded route.
- PDF progress, bookmarks and notes are local-only; no cloud sync is implemented or claimed.
- Arabic PDF text search is enabled only for files marked as having an extractable text layer.
- The current scanned PDF fixture is image-only and correctly has `searchAvailable: false`; no OCR is claimed.
- EPUB reader is not implemented. Readium preprocessing remains the preferred prototype direction; test Arabic RTL, TOC/CFI navigation, CSP and bundle size before selecting a runtime.

## Completed latest milestone — owner-only curation dashboard

- PR #16: https://github.com/ifawz40-boop/HUKM/pull/16
- Merge commit: `66a7f7cd5033aa9d92f3fc114dedfccd745a2d69`.
- Added `src/components/LibraryCurationPanel.tsx`.
- Added an owner-only entry point to the admin micro-navigation in `HukmNavbar.tsx` and mounted the panel in `App.tsx`.
- The panel lists the 22 candidates with category, edition/page metadata, status, reason, initial spot-check note and source links.
- Search and category/status filters are available.
- External source links are accepted only when HTTPS.
- The panel is deliberately read-only. It has no approve/reject/publish action and performs no Firestore/API write.
- Access is gated by the existing effective verified-owner check; ordinary admins, readers and owner preview mode do not receive the entry point or mounted panel.
- Exact PR CI run #42232576073 succeeded on PR head `962ca4763e081f0b9946ae3462004a021bc3b4c0`: 286 tests passed, 1 skipped, TypeScript and production build passed.
- Exact post-merge push CI run #42232831631 succeeded on main merge commit `66a7f7cd5033aa9d92f3fc114dedfccd745a2d69`.

## Immediate next actions

1. Add focused regression coverage for the new curation panel: owner-only navigation gate, read-only behavior, candidate filtering, and HTTPS-only source links. Keep the test independent of Firebase and do not add approval mutations.
2. Re-check the Vercel project Git settings to confirm the effective branch deployment rule. The desired behavior is Git-triggered deployments on `main` only; do not disable main production deployments. The current Vercel check is quota-limited and does not prove the rule works.
3. Continue the independent accessibility/mobile audit of the curation modal: keyboard focus, Escape close, scroll containment, readable long Arabic titles and responsive filters.
4. Begin private full-text review of the highest-priority candidates. Record review evidence per book; do not approve based on metadata or a title/preview alone.
5. Design a durable reviewer record and separate audited transitions for editorial approval and rights clearance before adding any state-changing controls to the panel.
6. Continue reader smoke tests and the EPUB Readium preprocessing prototype only after the curated text workflow is stable.

## Safety and continuation rules

- Never edit `main` directly, force-push or rewrite history.
- Never expose candidate texts as public books or mark any candidate approved without full review.
- Never put unlicensed full texts or scans in the public repository.
- Never weaken the deployment gate to make a build pass.
- A successful GitHub Actions run or Vercel status does not by itself prove production deployment.
- Re-fetch `main`, branches, PRs and current file SHAs before every new write.
