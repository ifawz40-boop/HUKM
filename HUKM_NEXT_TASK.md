# HUKM MEDIA — Exact Continuation Checkpoint

Last refreshed: 2026-11-06 — PR #33 and PR #34 merged
Repository: `ifawz40-boop/HUKM`
Default / Google AI Studio branch: `main`
Current documentation branch: `docs/checkpoint-a11y-pr33-pr34` (checkpoint PR pending)
Verified application/data HEAD after PR #30: `1f5c98a918eb491db721270f14a6473dff50c39d`
Documentation-only checkpoint PR #26 merge commit: `e1226e146401ad371d0f6280d0e095d1bd8bacfd`
Latest main HEAD after PR #34: `d2596bfbeb4ceff76f4b6459ebf0e446b7e978f3`.
At the start of every continuation, re-fetch the live `main` HEAD; later documentation-only merges may advance it without changing application code.

## Verified merge and CI state

- PR #14 — Islamic library curation — merged at `175356b3632f1f054c6280e5c986761cf2d07059`.
- PR #15 — Vercel Git branch configuration — merged at `d9ffac968aac9f629c46b0a81f00fa7d877c2cd8`.
- PR #16 — owner-only read-only candidate dashboard — merged at `66a7f7cd5033aa9d92f3fc114dedfccd745a2d69`.
- PR #17 — dashboard checkpoint — merged at `89dfb32b70c35d19acb9a309f56595fb3615f1cb`.
- PR #18 — curation helpers and regression tests — merged at `bd99aac3e4cc47b4eb5b947961612f8312707dae`.
- PR #19 — checkpoint after regression tests — merged at `c4787c00969dd6b88f3a089da9d48ebd8aac9b64`.
- PR #20 — preliminary source audit for *Fasl fi Tazkiyat al-Nafs* — merged at `3c1257557abc683cc5f257864ab9b317955255d8`.
- PR #21 — source-audit checkpoint — merged at `567f5e6fb21e09ee55be4687e92c44d55235663b`.
- PR #22 — historical author evidence for Ibn Taymiyyah — merged at `413d77eb11eb97490e22a1bce63a7e7cb1f53ff2`.
- PR #23 — keyboard accessibility for the curation dialog — merged at `9f7ac3679062326f07543f2caaa95427527b096f`.
- PR #24 — checkpoint after keyboard accessibility — merged at `943c80f80ecf5652d29ea40465bdd1b90ab4447e`.
- PR #25 — latest development checkpoint — merged at `306bbc0bf9cd57e10d30f84bd5c6a79cc27d7709`.
- PR #29 — curation-dialog focus restoration checkpoint — merged at `a53324a7bce17a65eff65bef96ea3aaa8b0d0af4`.
- PR #30 — *Mukhtasar Minhaj al-Qasidin* candidate research — merged at `1f5c98a918eb491db721270f14a6473dff50c39d`.
- PR #31 — 23-candidate library checkpoint — merged at `24ceb26f9a2869f01c1a1c1bd2e85a2c334f2218`.
- PR #33 — manual curation-dialog accessibility QA plan and continuation update — merged at `f0f60f409512ec5194b654e7e50f00b1c52f9e30`; PR and post-merge CI run #42238983555 passed.
- PR #34 — regression assertions for dialog role/modal semantics/accessible labels — merged at `d2596bfbeb4ceff76f4b6459ebf0e446b7e978f3`; PR and post-merge CI run #42239193028 passed.
- PR #23 CI run #42235061723 and post-merge run #42235175548 succeeded.
- PR #24 CI run #42235339268 succeeded.
- PR #25 CI run #42235610950 and post-merge main run #42235696201 succeeded.
- Exact current main push run #42235696201 completed successfully on `306bbc0bf9cd57e10d30f84bd5c6a79cc27d7709`: 294 tests, 293 passed, 0 failed, 1 skipped; TypeScript check and production build passed.
- The combined Vercel status on the current main commit remains `failure` with target `build-rate-limit`. Vercel's bot reports the free-plan limit (>100 deployments/day). This is a provider quota issue, not a failed GitHub test/build.
- No production deployment is confirmed for the latest main commit. Do not claim the site is live.
- `vercel.json` contains `git.deploymentEnabled: {"*": false, "main": true}`. Vercel documents that this setting controls branch-triggered deployments, supports minimatch patterns, and that if a branch matches multiple rules at least one `true` causes deployment. The configuration intentionally allows `main` and disables other branches. Project-level behavior still needs dashboard verification.
- Google AI Studio synchronization remains unverified.

## Public library state

- 24 legacy books are preserved in the archive and quarantined from public display.
- `src/data/library/curation.json` has zero approved IDs and 24 quarantined IDs.
- Public text catalogue and public PDF shelf remain empty.
- `src/data/library/candidates.json` contains 23 bibliographic candidates; none is approved.
- Allowed categories: `religious`, `self-development`, `travel`, `islamic-philosophy-critique`.
- Full-text, introduction, footnote, author-methodology, edition and rights review remain mandatory before approval.
- Legacy Hindawi synchronization remains manual-only.

## Candidate review: فصل في تزكية النفس

Report: `docs/library/CANDIDATE_REVIEWS/ibn-taymiyyah-fasl-fi-tazkiyat-al-nafs.md`

- Candidate status remains `metadata-verified-content-review-pending`; it is not approved.
- Bibliographic metadata: Ahmad ibn Abd al-Halim Ibn Taymiyyah (661–728 AH); prepared by Fawaz Muhammad al-Awḍi; Maktabat al-Nahj al-Wadih, Kuwait; first edition 1439 AH / 2018.
- Page-count distinction: 63 printed pages per the text-edition record versus 68 pages in the Waqfeya PDF scan.
- The older excerpt in *Majmuʿ al-Fatawa* 10/625 is not a safe substitute for the complete edition; the edition description reports that a substantial part of the latter half was omitted from the earlier printing.
- The editor's modern introduction is distinct from Ibn Taymiyyah's authored text and includes contemporary group criticism; it is flagged for separate editorial review.
- Historical author evidence was added: testimony attributed to al-Dhahabi, Ibn al-Qayyim, Ibn Daqiq al-Eid, Ibn Sayyid al-Nas and Ibn Rajab. The report distinguishes scholarly praise from a claim of universal consensus or certainty about inward piety.
- Full page-by-page review, scan/transcription collation, footnote and hadith/athar verification, editor/source review and digital rights clearance are incomplete.

## Curation dashboard

- Owner-only read-only dashboard: `src/components/LibraryCurationPanel.tsx`.
- Entry point and mount use the existing effective verified-owner gate; ordinary admins, readers and owner preview mode do not receive it.
- Shows candidate metadata, source links, review notes, search, category/status filters and candidate-specific review-report links.
- Candidate source links are HTTPS-only and reject embedded URL credentials.
- No approval/rejection/publication action or Firestore/API write exists.
- Pure helpers are in `src/utils/libraryCuration.ts`; unit tests cover URL safety, Arabic search, combined filters and empty filters.
- Static regression tests cover owner-only mounting, read-only behavior, candidate metadata/report link and Vercel main-only deployment policy.
- Keyboard accessibility: close button receives initial focus; Escape closes; Tab/Shift+Tab are contained within the dialog; scroll chaining is contained inside modal content.
- PR #23 and all post-merge CI passed. A manual browser/screen-reader audit has not yet been performed.

## Reader state

- PDF.js reader is bundled with a local worker and lazy-loaded.
- PDF progress/bookmarks/notes remain local-only; no cloud sync is claimed.
- Arabic PDF text search is enabled only for extractable text PDFs. The scanned fixture has no OCR and `searchAvailable: false`.
- EPUB is not implemented. Continue only with a bounded Readium preprocessing prototype after the curated library workflow stabilizes.

## Latest merged feature — PR #28 curation dialog focus restoration

- PR #28 merged by squash: https://github.com/ifawz40-boop/HUKM/pull/28
- Merge commit / verified main HEAD: `320b73c099932cecbea818db6c8002f5d449d8ad`.
- PR CI run #42237516574 passed on code/test head `7a0e0f12eb91063e403e2bc64f784ffe5b4776ed`.
- Post-merge main CI run #42237608247 passed on the exact merge commit: tests, TypeScript and production build.
- Focus now moves to the dialog close control, remains contained at document level, and returns to the opener after close when possible. Background scrolling is locked/restored. Existing candidate metadata, report links and overscroll containment are retained.
- Regression assertions cover focus restoration, keyboard listener cleanup, Escape and body overflow restoration.
- No editorial approval, database, API, authentication or deployment behavior changed.

## Latest merged library research — PR #30

- PR #30 merged by squash: https://github.com/ifawz40-boop/HUKM/pull/30
- Merge commit / verified main HEAD: `1f5c98a918eb491db721270f14a6473dff50c39d`.
- PR CI #42238280875 and post-merge main CI #42238372655 passed (tests, TypeScript and production build).
- Added *مختصر منهاج القاصدين* as candidate `ibn-qudama-mukhtasar-minhaj-al-qasidin`; 23 candidates total, zero approved.
- Author is Najm al-Din Abu al-Abbas Ahmad ibn Abd al-Rahman ibn Qudama al-Maqdisi (d. 689 AH), not Muwaffaq al-Din Abdullah ibn Ahmad ibn Qudama (d. 620 AH), author of *al-Mughni*.
- The candidate remains `metadata-verified-content-review-pending`; full text, hadith/athar, marginalia, methodology and rights remain unreviewed/unresolved.
- Report: `docs/library/CANDIDATE_REVIEWS/mukhtasar-minhaj-al-qasidin.md`.
- No full text or scan was copied, and the candidate is not in the public allowlist.

## Immediate next actions

1. Obtain a complete, authorized copy of the 2018 edition (or written permission for private review) before attempting a page-by-page content and collation review. Do not place the full text or scan in the public repository.
2. Review all 63 printed pages and the 68-page scan, distinguish the editor's introduction from the author's text, collate every marked omission/addition, and verify hadith/athar references and footnotes. Keep the candidate pending until this is complete.
3. Obtain an authorized complete copy of the 1978 edition of *Mukhtasar Minhaj al-Qasidin* or written permission for private review. Review all 408 pages, distinguish the author's text from the editorial preface and notes, trace the abridgement chain, and verify hadith/athar and transmitted narratives. Keep it pending until complete.
4. Perform a real browser/mobile accessibility audit of the curation dialog, including keyboard navigation, focus restoration, screen-reader labels, 320px layout, long Arabic titles and touch scrolling. The code-level focus restoration and background scroll lock are implemented in merged PR #28; do not mark the manual audit complete.
5. Verify Vercel Project Settings and confirm the effective Git deployment policy. Desired behavior: Git-triggered deployments on `main` only, no preview deployments from development branches. Keep main production deployment enabled; do not manually deploy or change settings without required access/approval.
6. Continue with the next candidate only after the first review workflow is documented and repeatable.
7. Design durable reviewer records and separate audited editorial approval and rights-clearance transitions before adding any status-changing controls.

## Safety and continuation rules

- Never edit `main` directly, force-push or rewrite history.
- Never expose candidate texts as public books or approve a candidate without full review.
- Never put unlicensed full texts or scans in the public repository.
- Never weaken the deployment gate to make a build pass.
- GitHub Actions success and Vercel status are separate; neither alone proves production is live.
- Re-fetch `main`, branches, PRs and current file SHAs before every new write.
