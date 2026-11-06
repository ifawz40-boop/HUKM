# HUKM MEDIA — Exact Continuation Checkpoint

Last refreshed: 2026-11-06
Repository: `ifawz40-boop/HUKM`
Default / Google AI Studio branch: `main`
Current documentation branch: `docs/checkpoint-tazkiya-source-audit`
Verified main HEAD: `3c1257557abc683cc5f257864ab9b317955255d8`

## Verified merge and CI state

- PR #14 — Islamic library curation — merged at `175356b3632f1f054c6280e5c986761cf2d07059`.
- PR #15 — Vercel Git branch configuration — merged at `d9ffac968aac9f629c46b0a81f00fa7d877c2cd8`.
- PR #16 — owner-only read-only candidate dashboard — merged at `66a7f7cd5033aa9d92f3fc114dedfccd745a2d69`.
- PR #17 — checkpoint after the dashboard — merged at `89dfb32b70c35d19acb9a309f56595fb3615f1cb`.
- PR #18 — dashboard helper and regression tests — merged at `bd99aac3e4cc47b4eb5b947961612f8312707dae`.
- PR #19 — checkpoint after regression tests — merged at `c4787c00969dd6b88f3a089da9d48ebd8aac9b64`.
- PR #20 — preliminary source audit for *Fasl fi Tazkiyat al-Nafs* — merged at `3c1257557abc683cc5f257864ab9b317955255d8`.
- PR #20 post-merge GitHub Actions run #42234324080 completed successfully on the exact main HEAD: 293 tests, 292 passed, 0 failed, 1 skipped; TypeScript and production build passed.
- Earlier dashboard and regression milestones also passed their PR and post-merge runs; see `HUKM_DEVELOPMENT_LOG.md`.
- The combined Vercel status on the current main commit remains `failure` with target `build-rate-limit`. Vercel's bot reports the free-plan limit (>100 deployments/day). This is a provider quota issue, not a failed GitHub test/build.
- No production deployment is confirmed for the latest main commit. Do not claim the site is live.
- `vercel.json` still contains `git.deploymentEnabled: {"*": false, "main": true}`. The Vercel quota-failure comments on feature PRs do not establish whether project settings have actually suppressed previews. Verify effective behavior in Vercel Project Settings before claiming branch previews are disabled.
- Google AI Studio synchronization remains unverified.

## Public library state

- 24 legacy books are preserved in the archive and quarantined from public display.
- `src/data/library/curation.json` has zero approved IDs and 24 quarantined IDs.
- Public text catalogue and public PDF shelf remain empty.
- `src/data/library/candidates.json` contains 22 bibliographic candidates; none is approved.
- Allowed categories: `religious`, `self-development`, `travel`, `islamic-philosophy-critique`.
- Full-text, introduction, footnote, author-methodology, edition and rights review remain mandatory before approval.
- Legacy Hindawi synchronization remains manual-only.

## Candidate source audit: فصل في تزكية النفس

Report: `docs/library/CANDIDATE_REVIEWS/ibn-taymiyyah-fasl-fi-tazkiyat-al-nafs.md`

- PR #20 corrected the candidate metadata and added the report link to the owner dashboard.
- Author attributed: Ahmad ibn Abd al-Halim Ibn Taymiyyah (661–728 AH).
- Edition prepared by Fawaz Muhammad al-Awḍi; Maktabat al-Nahj al-Wadih, Kuwait; first edition 1439 AH / 2018.
- Corrected bibliographic distinction: 63 printed pages according to the text-edition record versus a 68-page PDF scan listed by Waqfeya.
- The older excerpt within *Majmuʿ al-Fatawa* 10/625 is not a safe substitute for the complete edition; the edition description says a substantial part of the latter half was omitted from the earlier printing.
- The editor's modern introduction is distinct from Ibn Taymiyyah's authored text and contains contemporary group criticism; review it separately.
- Candidate status remains `metadata-verified-content-review-pending`. It is not approved.
- Full page-by-page review, scan/transcription collation, footnote and hadith/athar verification, editor/source review and digital rights clearance are incomplete.

## Curation dashboard and tests

- Owner-only read-only dashboard is in `src/components/LibraryCurationPanel.tsx`.
- The entry point and mount use the existing effective verified-owner gate; ordinary admins, readers and owner preview mode do not receive it.
- The dashboard shows candidate metadata, source links, review notes, search, category/status filters and candidate-specific review-report links.
- Candidate source links are HTTPS-only and reject embedded URL credentials.
- No approval/rejection/publication action or Firestore/API write exists.
- Pure helpers are in `src/utils/libraryCuration.ts`; tests in `src/utils/libraryCuration.test.ts` cover URL safety, Arabic search and filters.
- `tests/staticLibrary.test.ts` checks owner-only mounting, read-only behavior and candidate review metadata.
- All of this is merged and passed post-merge CI.

## Reader state

- PDF.js reader is bundled with a local worker and lazy-loaded.
- PDF progress/bookmarks/notes remain local-only; no cloud sync is claimed.
- Arabic PDF text search is enabled only for extractable text PDFs. The scanned fixture has no OCR and `searchAvailable: false`.
- EPUB is not implemented. Continue only with a bounded Readium preprocessing prototype after the curated library workflow stabilizes.

## Immediate next actions

1. Obtain a complete, authorized copy of the 2018 edition (or written permission for private review) before attempting a page-by-page content and collation review. Do not place the full text or scan in the public repository.
2. Review all 63 printed pages and the 68-page scan, distinguish the editor's introduction from the author's text, collate every marked omission/addition, and verify hadith/athar references and footnotes. Keep the candidate pending until this is complete.
3. Continue the curation modal accessibility/mobile audit: focus placement/containment, Escape close, background scroll restoration, long Arabic titles and narrow-screen filters.
4. Verify Vercel Project Settings for main-only Git deployments. Keep main production deployment enabled; no manual deployment or setting changes without required access/approval.
5. Continue with the next candidate only after the first review workflow is documented and repeatable.
6. Design durable reviewer records and separate audited editorial approval and rights-clearance transitions before adding any status-changing controls.

## Safety and continuation rules

- Never edit `main` directly, force-push or rewrite history.
- Never expose candidate texts as public books or approve a candidate without full review.
- Never put unlicensed full texts or scans in the public repository.
- Never weaken the deployment gate to make a build pass.
- GitHub Actions success and Vercel status are separate; neither alone proves production is live.
- Re-fetch `main`, branches, PRs and current file SHAs before every new write.
