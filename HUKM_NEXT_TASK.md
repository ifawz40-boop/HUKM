# HUKM MEDIA — Exact Continuation Checkpoint

Last refreshed: 2026-11-06
Repository: `ifawz40-boop/HUKM`
Default / Google AI Studio branch: `main`
Current documentation branch: `docs/checkpoint-curation-tests-merged`
Verified main HEAD: `bd99aac3e4cc47b4eb5b947961612f8312707dae`

## Verified merge and CI state

- PR #14 — Islamic library curation — merged at `175356b3632f1f054c6280e5c986761cf2d07059`.
- PR #15 — Vercel Git branch configuration — merged at `d9ffac968aac9f629c46b0a81f00fa7d877c2cd8`.
- PR #16 — owner-only read-only candidate dashboard — merged at `66a7f7cd5033aa9d92f3fc114dedfccd745a2d69`.
- PR #17 — documentation checkpoint after PR #16 — merged at `89dfb32b70c35d19acb9a309f56595fb3615f1cb`.
- PR #18 — focused dashboard invariants and filtering tests — merged at `bd99aac3e4cc47b4eb5b947961612f8312707dae`.
- PR #16 CI run #42232576073 succeeded; 286 tests passed, 1 skipped, TypeScript and production build passed.
- PR #16 post-merge CI run #42232831631 succeeded.
- PR #17 CI run #42233023231 and post-merge run #42233384294 succeeded.
- PR #18 CI run #42233338320 and post-merge push run #42233459070 succeeded on current main. Exact test totals: 292 tests, 291 passed, 0 failed, 1 skipped; TypeScript check and production build passed.
- The combined Vercel status on the current main commit remains `failure` with target `build-rate-limit`. Vercel's bot reports the free-plan limit (>100 deployments/day). This is a provider quota issue, not a failed GitHub test/build.
- No production deployment is confirmed for the latest main commit. Do not claim the site is live.
- The repo still has `git.deploymentEnabled: {"*": false, "main": true}`. PR #16/#18 produced Vercel quota-failure comments. Effective project behavior still needs verification in Vercel Project Settings; do not claim branch previews are disabled until checked.
- Google AI Studio synchronization is not independently verified.

## Public library state

- 24 legacy books are preserved in the archive and quarantined from public display.
- `src/data/library/curation.json` has zero approved IDs and 24 quarantined IDs.
- Public text catalogue and public PDF shelf remain empty.
- `src/data/library/candidates.json` contains 22 bibliographic candidates. All are `metadata-verified-content-review-pending`; none is approved.
- Allowed categories: `religious`, `self-development`, `travel`, `islamic-philosophy-critique`.
- Full-text, introduction, footnote, author-methodology, edition and rights review are still required for each candidate.
- Legacy Hindawi synchronization remains manual-only.

Editorial files to read before any candidate decision:
- `docs/library/EDITORIAL_POLICY.md`
- `docs/library/AUTHOR_EVIDENCE_2026-11-06.md`
- `docs/library/CURRENT_LIBRARY_REVIEW_2026-11-06.md`

## Reader state

- PDF.js reader is bundled with a local worker and lazy-loaded.
- PDF progress/bookmarks/notes remain local-only; no cloud sync is claimed.
- Arabic PDF text search is available only for extractable text PDFs. The scanned fixture has no OCR and `searchAvailable: false`.
- EPUB is not implemented. Continue only with a bounded Readium preprocessing prototype after the curated library workflow stabilizes.

## Completed curation dashboard and invariant tests

- PR #16 added `src/components/LibraryCurationPanel.tsx`, an owner-only read-only candidate panel with search, category/status filters, edition/page metadata, source links and review notes.
- The entry point is visible only when `isEffectiveOwner` is true; the App mounts the panel only when the existing effective `isOwner` gate is true. Ordinary admins, readers and owner preview mode do not receive it.
- No approve/reject/publish action or Firestore/API write exists in the panel.
- Candidate links are HTTPS-only and reject embedded URL credentials.
- PR #18 extracted pure helpers to `src/utils/libraryCuration.ts` and added tests in `src/utils/libraryCuration.test.ts` for safe URLs, Arabic search, combined filters and empty filters.
- `tests/staticLibrary.test.ts` now checks owner-only mounting, read-only behavior and safe link attributes.
- All code and regression tests are merged and passed post-merge CI.

## Immediate next actions

1. Continue the accessibility/mobile audit of the curation dialog: focus placement and containment, Escape close, background scroll restoration, long Arabic titles and narrow-screen filters.
2. Investigate Vercel Project Settings and confirm the effective Git deployment policy. Desired behavior: Git-triggered production deployments on `main` only, no preview deployments from development branches. Keep main production deployment enabled. Do not manually deploy or change settings without the required access/approval.
3. Begin private full-text review of the highest-priority candidates. Record source/edition, introduction, footnotes, author methodology and concrete findings. Do not approve based on title, metadata, or opening-page spot checks.
4. Design a durable review record and separate audited editorial-approval and rights-clearance transitions before adding any status-changing controls.
5. Continue reader smoke tests and the isolated EPUB Readium prototype only after the curation pipeline is stable.

## Safety and continuation rules

- Never edit `main` directly, force-push or rewrite history.
- Never expose candidate texts as public books or approve a candidate without full review.
- Never put unlicensed full texts or scans in the public repository.
- Never weaken the deployment gate to make a build pass.
- GitHub Actions success and Vercel status are separate; neither alone proves production is live.
- Re-fetch `main`, branches, PRs and current file SHAs before every new write.
