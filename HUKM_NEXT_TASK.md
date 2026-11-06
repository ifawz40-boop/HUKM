# HUKM MEDIA — Exact Continuation Checkpoint

Last refreshed: 2026-11-06 — PR #39 review repository/API core merged
Repository: `ifawz40-boop/HUKM`
Default / Google AI Studio branch: `main`
Current development branch: `chore/remove-noncompliant-legacy-library-v5` (PR #42 ready to merge)
Verified application/data HEAD on main after PR #41: `d9fb9119d517f582d1986bb4ce7c6ef410ea3f92`
Documentation-only checkpoint PR #26 merge commit: `e1226e146401ad371d0f6280d0e095d1bd8bacfd`
Latest main HEAD after PR #41: `d9fb9119d517f582d1986bb4ce7c6ef410ea3f92`.
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
- PR #35 — checkpoint for PRs #33/#34 — merged at `c50822f4e71aa52597e126ffce00c14f8dcf020d`; post-merge CI run #42239379696 passed.
- PR #37 — pure editorial/rights review workflow core and RFC — merged at `dfbe36e57b1804e3c9007adb1ffce50975c9d106`; PR CI run #42239633204 and post-merge main CI run #42239741378 passed.
- PR #38 — checkpoint for PR #37 — merged at `b8b6f2fb5de1bd1d418ef94d8b1d1d4028c7f798`; post-merge CI run #42240089917 passed.
- PR #39 — inert owner-only review repository/API core — merged at `e619ab711ea2682479c1789b4e720aa4512fd044`; PR CI run #42240951392 and post-merge main CI run #42241115451 passed.
- PR #23 CI run #42235061723 and post-merge run #42235175548 succeeded.
- PR #24 CI run #42235339268 succeeded.
- PR #25 CI run #42235610950 and post-merge main run #42235696201 succeeded.
- Exact current main push run #42235696201 completed successfully on `306bbc0bf9cd57e10d30f84bd5c6a79cc27d7709`: 294 tests, 293 passed, 0 failed, 1 skipped; TypeScript check and production build passed.
- The combined Vercel status on the current main commit remains `failure` with target `build-rate-limit`. Vercel's bot reports the free-plan limit (>100 deployments/day). This is a provider quota issue, not a failed GitHub test/build.
- No production deployment is confirmed for the latest main commit. Do not claim the site is live.
- `vercel.json` contains `git.deploymentEnabled: {"*": false, "main": true}`. Vercel documents that this setting controls branch-triggered deployments, supports minimatch patterns, and that if a branch matches multiple rules at least one `true` causes deployment. The configuration intentionally allows `main` and disables other branches. Project-level behavior still needs dashboard verification.
- Google AI Studio synchronization remains unverified.

## Public library state

- All 24 rejected legacy full-text JSON files and archive indexes were deleted from the current repository tree; there is no archive or quarantine catalogue.
- `src/data/library/curation.json` has zero approved IDs and no quarantine registry.
- Public text catalogue and public PDF shelf remain empty.
- `src/data/library/candidates.json` contains 23 bibliographic candidates; none is approved.
- Allowed categories: `religious`, `self-development`, `travel`, `islamic-philosophy-critique`.
- Full-text, introduction, footnote, author-methodology, edition and rights review remain mandatory before approval.
- Legacy dataset sync is disabled by default (`syncEnabled: false`); exact source IDs must be editorially approved in a reviewed PR, and manual workflow dispatch is blocked on `main`.

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
7. Implement RFC Stage 3: add explicit deny rules for `libraryEditorialStates`, `libraryRightsStates`, and `libraryReviewEvents`, then configure Firestore Emulator tests proving that unauthenticated users, readers, admins and owners cannot access these collections directly. The existing default-deny catch-all remains in place. Keep the review API factory unmounted and writes disabled until the emulator-backed security suite passes. In parallel, verify the production repository adapter against Firebase Admin Firestore transaction types and inject the real verified-owner middleware/server timestamp only in a separate, still-unmounted composition module. Do not add status-changing UI.

## Safety and continuation rules

- Never edit `main` directly, force-push or rewrite history.
- Never expose candidate texts as public books or approve a candidate without full review.
- Never put unlicensed full texts or scans in the public repository.
- Never weaken the deployment gate to make a build pass.
- GitHub Actions success and Vercel status are separate; neither alone proves production is live.
- Re-fetch `main`, branches, PRs and current file SHAs before every new write.


## Owner-directed legacy library deletion — current working branch

- Base main SHA: `d9fb9119d517f582d1986bb4ce7c6ef410ea3f92` (after PR #39 and PR #41).
- Branch: `chore/remove-noncompliant-legacy-library-v5`; PR #42.
- Removed 24 legacy book text JSON files, the archive catalogue, PDF archive catalogue and archive notice (27 deletions). The current branch tree has no `src/data/library/archive/` entries.
- Cleared all quarantined IDs and removed the quarantine registry. Public catalogue remains empty; approved IDs remain zero.
- The review report retains only titles/reasons for audit; no book content is retained there.
- Disabled automatic corpus ingestion by default and added an explicit source-ID editorial allowlist guard. Workflow dispatch cannot run from `main`.
- Added tests for deletion, no quarantine, and fail-closed sync behavior. Final CI head `320c1c92e9df0d6d9b9c4b30c08cd0450f9dc2b1` passed tests, TypeScript and production build; documentation correction requires a fresh CI run.
- Git history remains immutable; no history rewrite or force-push was performed.
- Next: merge only after fresh CI passes on the exact final PR head; then audit the 23 pending candidates against author methodology and complete text before deciding which remain candidates and which are deleted. Keep all unapproved books hidden.


## Owner-directed legacy library deletion — verified on main

- PR #42 merged at `db17f43c0a42ec9fa543ea0072053ed46957ee6e`; post-merge main CI run #42242488156 passed.
- The 24 rejected full-text files, archive catalogues and archive notice are absent from the current main tree. Public catalogue remains empty; approved IDs are zero; there is no quarantine registry.
- Sync is disabled by default and requires a reviewed explicit source-ID allowlist; manual sync is blocked on `main`.
- The review report retains title/reason only for audit. Git history was not rewritten; no force-push was used.

## Firestore review rules — current working branch

- Original PR #43 head `2f44f2e36622023c079d149c7b542e3629b4d1c2` passed run #42243164732, including emulator rules tests, TypeScript and build.
- Rebased the six-file PR #43 diff on exact current main `db17f43c0a42ec9fa543ea0072053ed46957ee6e` as branch `feat/firestore-review-rules-emulator-v2`.
- Explicitly deny client reads/writes to `libraryEditorialStates`, `libraryRightsStates`, and `libraryReviewEvents` for all roles, including owner. Emulator tests cover unauthenticated, reader, admin and owner contexts.
- Current rebased branch must pass fresh CI before merge. Keep API routes unmounted and write operations disabled until the real Firebase Admin adapter and verified-owner middleware are separately reviewed.
- Next: finish the emulator rules PR, then type-check the production repository adapter; continue candidate full-text reviews only from verified editions and keep every unapproved book hidden.


## PR #44 — verified merge state
- PR #44 merged at `d6523ab6841f88720e8a48166af3eec79c78d5fa`; pre-merge CI run #42243550198 passed tests, emulator rules, TypeScript and build.
- Post-merge main CI is still queued/running; verify exact merge SHA before marking complete.
- Client Firestore access to review state and event collections is denied for all roles; server API remains unmounted.
- Vercel status remains `build-rate-limit`; no deployment has been confirmed or manually triggered.

## Current library research task
- Branch: `docs/review-mirat-al-haramayn-v2`.
- Added a preliminary source review for `مرآة الحرمين` by Ibrahim Rifaat. The source record supports its travel/geography category and edition metadata; complete text review and rights clearance remain pending.
- The candidate remains hidden and unapproved. No book content has been copied into the repository.
- Next: merge the report only after CI; continue candidate reviews from full verified editions, and delete any candidate that fails the owner's requirements rather than archiving it.


## PR #45 — preliminary review of مرآة الحرمين
- PR #45 merged at `2556b9fc266398b210ad856775300338dda5d613`; post-merge CI run #42244112706 passed.
- Candidate record links to `docs/library/CANDIDATE_REVIEWS/ibrahim-rifaat-mirat-al-haramayn.md`.
- It remains hidden and unapproved: metadata is verified, but the complete text, political content and digital rights are not yet fully reviewed.
- Spot checks show historical/travel description, not proof of full compliance. The index calls the alleged graves of Eve and Fatima `المزعوم`; descriptions of caves are not automatically endorsements of worship.
- A separate 2026 edition from Dar al-Kutub wa al-Watha'iq al-Qawmiyya exists; its new introduction and edition rights must be cleared separately.
- Next: obtain/inspect the complete two volumes under lawful access, review all text and images against HUKM's policy, then either approve with rights clearance or delete the candidate entirely if it fails. Do not publish based on the preliminary samples.


## PR #46 — verified merge
- PR #46 merged at `9a0653dd242adae2cbd8601ab72715eb4813b86f`; post-merge main CI #42244683279 passed.
- Mirat al-Haramayn remains hidden/unapproved pending full-text and rights review.

## Current editorial review — رحلة ابن جبير
- Branch: `docs/review-ibn-jubayr-tabarruk`.
- The author personally describes touching the Prophet's chamber, minbar and an attributed piece of the palm trunk, and praises completing this act. He also describes people kissing and rubbing faces on the relic.
- This is a disputed tabarruk practice, not automatically shirk; Azhar and other Sunni authorities differ in the exact ruling. The report carefully distinguishes it from invoking or worshipping the object.
- Keep the candidate hidden. Owner decision is needed on whether HUKM excludes books that positively endorse this type of tabarruk, even where it is disputed among Sunni scholars. If excluded, delete the candidate and report entirely from the current tree; do not archive.
- Next: finish the 23-candidate author/content audit and proceed only with full-text sources; never publish an unapproved candidate.


## PR #47 — verified merge
- PR #47 merged at `f8f5724e6198a950dde40843e31187ce582c9598`; post-merge main CI run #42245165847 passed.
- Ibn Jubayr candidate remains hidden/unapproved; review report records the disputed tabarruk passage and the need for the owner's policy decision.
- No public book content or PDF was added.

## Owner policy decision pending
- Does HUKM exclude any book that positively endorses touching the Prophet's chamber/minbar or seeking blessing from attributed relics, even where this is disputed among Sunni scholars, or allow such material in historical travelogues provided it does not invoke or worship the object?
- Until the owner decides, keep `رحلة ابن جبير` hidden and unapproved. If excluded, delete the candidate and report entirely from the current tree.
- Next: continue the author/content audit of remaining candidates, starting with the concise spiritual-ethics work `مختصر منهاج القاصدين`, and keep all candidates unapproved until full-text review and rights clearance.


## PR #48 — verified merge
- PR #48 merged at `e4012233561af487d0d42bc6fae3605835dc7120`; post-merge CI run #42245635972 passed.
- Ibn Jubayr remains hidden/unapproved pending owner policy clarification on positive endorsement of disputed tabarruk.

## Current candidate: تفسير السعدي
- Branch: `docs/review-tafsir-al-sadi`.
- The candidate edition is Dar al-Salam, edited by Abd al-Rahman ibn Mualla al-Luwaihiq. The author is a recognized Sunni scholar; Ibn Uthaymeen praised the work.
- Avoid the criticized Muhammad Zuhri al-Najjar edition with unmarked additions/changes; compare the exact candidate edition against a verified manuscript-based print.
- The work remains hidden and unapproved until full text comparison and digital rights clearance. Do not publish or copy PDFs based only on free online access.
- Next: finish CI for the source review report, then obtain lawful access to the exact edition for full review; continue other candidate audits while preserving zero approved IDs until verified.


## PR #49 — verified merge
- PR #49 merged at `e1ff807d267e6199cd852a50dae705149d556645`; post-merge CI run #42246136834 passed.
- Tafsir al-Sa'di is a strong hidden candidate with author/edition review documented; full text comparison and digital rights are still pending.

## Current candidate addition — عمدة الأحكام
- Branch: `docs/add-umdat-al-ahkam-candidate`; candidate inventory 24.
- Author: Abd al-Ghani al-Maqdisi (541–600هـ), a Hanbali hadith scholar.
- Work: legal hadith selected from Sahih al-Bukhari and Sahih Muslim; candidate edition reviewed/takhrij by Saeed al-Qahtani.
- Report: `docs/library/CANDIDATE_REVIEWS/abd-al-ghani-al-maqdisi-umdat-al-ahkam.md`.
- Remains hidden and unapproved pending full text, exact edition and rights review. No PDF is copied.
- Next: CI and merge the candidate report; continue author/content audits. Keep approved IDs at zero until a complete review and rights clearance.


---

# CURRENT VERIFIED CHECKPOINT — 2026-11-06 (after PR #50)

Repository: `ifawz40-boop/HUKM`  
Default / Google AI Studio branch: `main`  
Last verified main HEAD at checkpoint creation: `342ac0bad42c7610099fdc5383f401ec91f32adb`  
Working branch for next reviewed change: `docs/review-al-sharh-al-mumti-candidate`  
Latest merged PR at checkpoint creation: #50 (`342ac0bad42c7610099fdc5383f401ec91f32adb`)

## Live state

- All PRs #1–#50 are closed; no open PR was returned by the live repository query.
- 65 remote branches were enumerated (one page; page 2 empty). Branches include historical feature branches, backups and research branches; do not assume they are current or safe to merge.
- PR #14 is merged at `175356b3632f1f054c6280e5c986761cf2d07059`; its source branch `feat/islamic-library-curation` still exists at `5a3e0eb9da0920c54494abbfab2cef61e54bc2ba` and is historical, not an unmerged change.
- PR #50 merged at `342ac0bad42c7610099fdc5383f401ec91f32adb`. Exact PR head `e26e49ea758673ebb5b86651742379cb4ffa604d` passed the test/typecheck/build workflow; post-merge main workflow #42246576624 passed on the exact merge SHA.
- The main commit's Vercel status is still `failure` with `build-rate-limit`. Do not claim production deployment success. No manual deploy was requested or performed.
- `vercel.json` still contains `git.deploymentEnabled: {"*": false, "main": true}`.
- Google AI Studio synchronization and effective Vercel dashboard project settings remain unverified.

## Library state

- Candidate inventory before this branch: 24 entries, all `metadata-verified-content-review-pending`; none approved.
- `src/data/library/curation.json` has `approvedBookIds: []`.
- Public text book directory contains only `.gitkeep`; no archive or quarantine registry exists.
- Legacy source sync is disabled by default and requires an explicit source-ID allowlist.
- Non-compliant books confirmed by editorial review must be deleted from the current tree, including full text, scans, candidate metadata and reports; retain only a title/reason audit record where required. Never move them into an archive or quarantine.
- Do not infer non-compliance from a title or isolated mention of a false belief in a critical/historical context. Review the author's actual stance and surrounding context.
- Do not approve any candidate based on metadata, snippets, or an initial spot check.

## New candidate research — الشرح الممتع على زاد المستقنع

- Added metadata-only candidate `ibn-uthaymeen-al-sharh-al-mumti` (inventory 25) on branch `docs/review-al-sharh-al-mumti-candidate`.
- The candidate targets the latest 10-volume edition marketed by مؤسسة الشيخ محمد بن صالح العثيمين الخيرية.
- The report separately records the official digital library's 15-volume record and the older Waqfeya/Dar Ibn al-Jawzi 15-volume edition; do not merge their pagination or edition metadata.
- Report: `docs/library/CANDIDATE_REVIEWS/ibn-uthaymeen-al-sharh-al-mumti.md`.
- The author biography and publication metadata are sourced, but the complete text, editorial layers, detailed methodology and digital rights remain pending.
- No PDF or full text was copied. The candidate remains hidden and unapproved.

## Exact next actions

1. Re-fetch live `main` and confirm it is still `342ac0bad42c7610099fdc5383f401ec91f32adb` before any further write. If it moved, rebase the work by recreating the branch from the new main and reapply only this small change.
2. Finish the candidate metadata/report PR; inspect the exact diff and run CI on the exact PR head. Do not merge without successful tests, TypeScript and production build.
3. Continue the candidate-by-candidate audit from a lawful complete edition. Start with works whose full editions and reliable source records can be obtained. Keep all unreviewed books hidden.
4. Resolve the Ibn Jubayr travelogue only from its full text and the owner's published editorial standard; its recorded passage positively describes a disputed tabarruk practice, not an invocation of the relic. Do not label it shirk without evidence. If the complete work fails the owner's standard, delete its candidate record and report from the current tree (no archive).
5. Complete the manual keyboard/mobile/screen-reader accessibility audit of the curation dialog; code-level focus management is implemented, but manual QA remains outstanding.
6. Verify Vercel dashboard Git deployment settings and the build-rate quota separately. Do not change settings or manually deploy without explicit authorization.
7. Keep the Firestore review API unmounted and write paths disabled until a production Admin adapter and verified-owner middleware are separately implemented and reviewed.

## Files to inspect on continuation

- `src/data/library/candidates.json`
- `src/data/library/curation.json`
- `docs/library/CANDIDATE_REVIEWS/ibn-uthaymeen-al-sharh-al-mumti.md`
- `docs/library/CANDIDATE_REVIEWS/ibn-jubayr-rihla.md`
- `docs/library/CANDIDATE_REVIEWS/ibrahim-rifaat-mirat-al-haramayn.md`
- `HUKM_DEVELOPMENT_LOG.md`
- `HUKM_NEXT_TASK.md`
- `vercel.json`
- `firestore.rules`

## Validation record for this checkpoint

- This checkpoint records repository/API evidence only. The new candidate change must still pass CI on its exact PR head.
- Last verified main GitHub Actions run: #42246576624, success on `342ac0bad42c7610099fdc5383f401ec91f32adb`.
- Vercel status: `build-rate-limit`, failure; deployment not confirmed.
- No production deployment, Google AI Studio sync, or dashboard setting change was performed.


---

# CURRENT VERIFIED CHECKPOINT — 2026-11-06 (after PR #51 merge)

Repository: `ifawz40-boop/HUKM`  
Default / Google AI Studio branch: `main`  
Main HEAD at checkpoint creation: `fbcdf057c54baaddeb39f0784720e4ef1df1023a`  
Current working branch: `docs/review-aqeedat-ahl-al-sunnah-candidate`  
Latest merged PR: #51, squash merge SHA `fbcdf057c54baaddeb39f0784720e4ef1df1023a`

## Verified state

- PR #51 exact head `146aab796f1bdee164640828fe8633ae19cea86d` passed run #42250694790: test suite, Firestore Emulator rules tests, TypeScript and production build.
- PR #51 is merged. The exact main merge SHA is `fbcdf057c54baaddeb39f0784720e4ef1df1023a`.
- Post-merge main run #42250859548 was still running when this checkpoint was written; re-check its exact SHA and final conclusion before marking post-merge CI complete.
- Vercel combined status remains `build-rate-limit`; production deployment is not confirmed.
- `vercel.json` still has `git.deploymentEnabled: {"*": false, "main": true}`.
- Candidate inventory is 25 before the current branch; `approvedBookIds: []`; public book directory remains empty except `.gitkeep`; no archive/quarantine exists.

## New candidate — شرح عقيدة أهل السنة والجماعة

- Branch: `docs/review-aqeedat-ahl-al-sunnah-candidate`, based on `fbcdf057c54baaddeb39f0784720e4ef1df1023a`.
- Candidate ID: `ibn-uthaymeen-sharh-aqeedat-ahl-al-sunnah` (inventory 26).
- Official publisher page identifies the work as a commentary/report on the author's own book `عقيدة أهل السنة والجماعة`, based on his lessons in Unaizah; the broadest first recording is from 1416 AH.
- Edition: first edition 1437 AH, one volume, 549 pages.
- Report: `docs/library/CANDIDATE_REVIEWS/ibn-uthaymeen-sharh-aqeedat-ahl-al-sunnah.md`.
- Full text, comparison against recordings, editorial layers and digital redistribution rights remain pending. Candidate is hidden and unapproved; no PDF/full text was copied.

## Next actions

1. Re-check post-merge CI run #42250859548 on exact SHA `fbcdf057c54baaddeb39f0784720e4ef1df1023a`. If failed, investigate before proceeding.
2. Review PR for the new creed candidate on its exact head; require tests, Firestore Emulator rules, TypeScript and production build to pass before merge.
3. Keep all candidates hidden until complete author/methodology/text/edition/rights review.
4. Revisit Ibn Jubayr only after applying the owner's actual policy to the full text. The current report records positive endorsement of disputed tabarruk but does not establish invocation or major shirk. If rejected, delete the candidate and report from the current tree, never archive them.
5. Continue source-based reviews from official publishers and lawful complete editions. Do not add protected full text or PDFs.
6. Manual keyboard/mobile/screen-reader QA of the curation dialog remains outstanding.
7. Vercel dashboard project settings and quota remain unverified; do not manually deploy or alter settings without explicit authorization.
8. Keep review API routes unmounted and writes disabled until a production Firebase Admin adapter and verified-owner middleware are separately implemented and reviewed.

## Files to inspect

- `src/data/library/candidates.json`
- `src/data/library/curation.json`
- `docs/library/CANDIDATE_REVIEWS/ibn-uthaymeen-sharh-aqeedat-ahl-al-sunnah.md`
- `docs/library/CANDIDATE_REVIEWS/ibn-jubayr-rihla.md`
- `HUKM_DEVELOPMENT_LOG.md`
- `HUKM_NEXT_TASK.md`
- `vercel.json`
- `firestore.rules`

## Validation truth

- PR #51 head CI: PASS.
- PR #51 post-merge main CI: pending at checkpoint creation.
- Vercel: `build-rate-limit`, failure; deployment not confirmed.
- Google AI Studio synchronization: unverified.


## PR #51 post-merge CI result — verified

- Main workflow run #42250859548 completed successfully on exact merge SHA `fbcdf057c54baaddeb39f0784720e4ef1df1023a`.
- Test suite, Firestore Emulator rules tests, TypeScript and production build all passed after merge.
- Vercel still reports `build-rate-limit`; no deployment is confirmed.


---

# CURRENT VERIFIED CHECKPOINT — 2026-11-06 (after PR #52 merge)

Repository: `ifawz40-boop/HUKM`  
Default / Google AI Studio branch: `main`  
Main HEAD: `fa14de236437d59d8b6df52b9de20bfef475d96e`  
Checkpoint branch: `docs/checkpoint-after-pr52`  
Latest merged PR: #52, squash merge `fa14de236437d59d8b6df52b9de20bfef475d96e`  
Open PRs at checkpoint creation: none

## Verified repository state

- PR #51 merged at `fbcdf057c54baaddeb39f0784720e4ef1df1023a`; exact PR-head CI and post-merge main CI both passed.
- PR #52 merged at `fa14de236437d59d8b6df52b9de20bfef475d96e`; exact PR-head CI run #42251096269 passed, and post-merge main CI run #42251276651 passed.
- Both successful workflows ran tests, Firestore Emulator security-rules tests, TypeScript and production build.
- PR #14 remains merged at `175356b3632f1f054c6280e5c986761cf2d07059`. Its source branch `feat/islamic-library-curation` still points to the historical PR head `5a3e0eb9da0920c54494abbfab2cef61e54bc2ba`; do not re-merge it.
- The historical PR #14 merge triggered `sync-library` and that workflow failed because the old manifest omitted `datasetRevision`. This was the pre-guard workflow version. Current main has a manual-dispatch/non-main guard and sync is disabled in the manifest.
- Current manifest: `syncEnabled: false`, `editoriallyApprovedSourceIds: []`, no dataset revision. Current script fails closed before external requests when sync is disabled. Do not enable or pin a source without editorial review and rights checks.
- Current `vercel.json`: Git deployments disabled for all branches except `main`. Vercel still reports `build-rate-limit`; no successful production deployment is confirmed.
- Google AI Studio synchronization and actual Vercel dashboard project settings remain unverified.

## Library state

- Candidate inventory: 26.
- Approved public IDs: 0 (`src/data/library/curation.json`).
- New candidate #25: `ibn-uthaymeen-al-sharh-al-mumti` — hidden; metadata-only; exact edition distinctions documented; full text/methodology/rights pending.
- New candidate #26: `ibn-uthaymeen-sharh-aqeedat-ahl-al-sunnah` — hidden; publisher metadata verified (first edition 1437 AH, 1 volume, 549 pages); full text/audio comparison/rights pending.
- No full texts or PDFs for these candidates were copied.
- No archive or quarantine exists. Confirmed non-compliant books must be deleted from the current tree; never retain their full files in an isolated archive.
- Do not approve a candidate from metadata, title or isolated snippets. Read the complete selected edition and distinguish the author's own words from editor/translator additions.
- Do not treat historical mention/criticism of a false belief as promotion. Assess context and author stance.

## PR #14 sync failure — interpretation

The old PR #14 merge workflow failed because the historical manifest did not pin a Hugging Face dataset revision. The current workflow prevents push-to-main sync and the current manifest disables ingestion. This is a deliberate fail-closed state, not a reason to turn ingestion on. Future sync requires:
1. exact source IDs explicitly approved after full HUKM editorial review;
2. rights and edition checks for every selected source;
3. a verified dataset commit SHA in the manifest;
4. test coverage for the disabled path and the enabled, allowlisted path;
5. generated data committed through a development branch and reviewed PR, never written directly to main.

## Exact next tasks

1. Continue source-based research and candidate reviews using official publishers and complete, lawful editions.
2. Review the 26 candidates in priority order; keep all unreviewed candidates hidden.
3. Resolve the Ibn Jubayr travelogue using the owner's actual standard for affirmative endorsement of disputed tabarruk. The current report does not establish invocation or major shirk. If the work fails the standard, delete its candidate record and report from the current tree; do not archive.
4. Review the complete text and editorial layers of `الشرح الممتع` and `شرح عقيدة أهل السنة والجماعة`; verify edition consistency and rights before any approval.
5. Complete manual keyboard, mobile and screen-reader QA for the curation panel.
6. Keep Firestore review writes disabled and API unmounted until a production Admin adapter and verified-owner middleware are implemented and reviewed.
7. Verify Vercel dashboard Git settings and resolve the build-rate quota separately; no manual deployment or dashboard changes without explicit authorization.
8. Confirm Google AI Studio remains connected to `main` before relying on sync.

## Files to inspect on continuation

- `src/data/library/candidates.json`
- `src/data/library/curation.json`
- `src/data/library/manifest.json`
- `src/data/library/NOTICE.md`
- `docs/library/CANDIDATE_REVIEWS/ibn-uthaymeen-al-sharh-al-mumti.md`
- `docs/library/CANDIDATE_REVIEWS/ibn-uthaymeen-sharh-aqeedat-ahl-al-sunnah.md`
- `docs/library/CANDIDATE_REVIEWS/ibn-jubayr-rihla.md`
- `HUKM_DEVELOPMENT_LOG.md`
- `HUKM_NEXT_TASK.md`
- `scripts/sync-public-library.mjs`
- `.github/workflows/sync-public-library.yml`
- `vercel.json`
- `firestore.rules`

## Validation record

- PR #51 exact-head CI: PASS; post-merge main CI: PASS.
- PR #52 exact-head CI: PASS; post-merge main CI: PASS on `fa14de236437d59d8b6df52b9de20bfef475d96e`.
- Historical PR #14 sync-library: FAIL (missing pinned datasetRevision in the then-current manifest); current ingestion path is disabled and guarded.
- Vercel: `build-rate-limit`, deployment not confirmed.
- No production deployment or source ingestion performed.


---

# CURRENT VERIFIED CHECKPOINT — 2026-11-06 (after PR #53 merge)

Repository: `ifawz40-boop/HUKM`  
Default / Google AI Studio branch: `main`  
Main HEAD at checkpoint creation: `66e458bb28811a9bd8203050966227de907cd17a`  
Current development branch: `docs/review-al-batnuni-rihla-hijaziyya`  
Latest merged PR: #53 at `66e458bb28811a9bd8203050966227de907cd17a`  
Open PRs at checkpoint creation: none

## CI and merge state

- PR #51 exact-head and post-merge CI passed.
- PR #52 exact-head and post-merge CI passed.
- PR #53 exact-head run #42251615082 passed; post-merge main run #42251791852 passed on exact SHA `66e458bb28811a9bd8203050966227de907cd17a`.
- All three workflows ran tests, Firestore Emulator security-rules tests, TypeScript and production build.
- Vercel still reports `build-rate-limit`; no production deployment is confirmed.
- `vercel.json` continues to restrict Git-triggered deployments to `main`.
- Google AI Studio synchronization and actual Vercel dashboard settings remain unverified.

## Library state

- Candidate inventory: 26 before the current development branch; approved public IDs: 0.
- Categories before the current branch: religious 15, self-development 6, Islamic-philosophy critique 3, travel 2.
- Existing new candidates #25 and #26 are hidden and unapproved:
  - `الشرح الممتع على زاد المستقنع`: full text, editorial layers, detailed methodology and rights pending.
  - `شرح عقيدة أهل السنة والجماعة`: full text, recording comparison, editorial layers and rights pending.
- New candidate #27 in this branch: `الرحلة الحجازية لولي النعم الحاج عباس حلمي باشا الثاني خديو مصر`, by Muhammad Labib al-Batnuni, travel category. NYU records a 1329 AH [1911] edition; other catalogues record differing 1909/1910 editions and page counts. The full text was not retrieved; content review is pending.
- The travel candidate is not approved. Its review must focus on political praise of the Khedive, shrine descriptions, local religious practices and historical/political passages.
- No full text/PDF was copied. `approvedBookIds` remains empty. No archive/quarantine is introduced.

## PR #14 sync diagnosis

- PR #14 remains merged at `175356b3632f1f054c6280e5c986761cf2d07059`; source branch `feat/islamic-library-curation` remains at historical head `5a3e0eb9da0920c54494abbfab2cef61e54bc2ba`.
- Its old post-merge sync job failed because the historical manifest lacked `datasetRevision`. Current main has a job guard restricting sync to manual dispatch on a non-main branch, and current manifest has `syncEnabled: false` with an empty source allowlist. Current script fails closed before external requests.
- Do not add a dataset revision or enable sync to turn the historical failure green. Future ingestion requires complete editorial approval, rights screening, a pinned revision and a reviewed PR.

## Security and curation status

- `api/index.ts` currently mounts only auth, email and health endpoints; library review router is not mounted.
- Firestore rules explicitly deny all client reads/writes to review state/event collections; default deny remains.
- Review API and repository are scaffolding only. Do not describe the review workflow as a live feature.
- The curation panel implements a code-level focus trap, Escape close and focus restoration. Manual QA on keyboard, mobile and screen readers remains outstanding.

## Exact next actions

1. Continue reviewing candidate books in priority order using complete, lawful editions.
2. Obtain and inspect the full 1911 NYU edition or another precisely identified edition of `الرحلة الحجازية`. Do not infer content from catalog metadata.
3. If the travelogue fails HUKM's editorial policy, delete its candidate record and report from the current tree; do not archive it.
4. Resolve the Ibn Jubayr travelogue only after applying the owner's actual standard to the complete context of its tabarruk passage.
5. Review complete texts and editorial layers of `الشرح الممتع` and `شرح عقيدة أهل السنة والجماعة`; do not approve from metadata alone.
6. Complete manual keyboard/mobile/screen-reader QA of the curation panel.
7. Keep Firestore review writes disabled and API unmounted until a production Admin adapter and verified-owner middleware are implemented and reviewed.
8. Verify Vercel dashboard Git settings and resolve build-rate quota separately; do not manually deploy or alter settings without authorization.
9. Confirm Google AI Studio remains connected to `main`.

## Files to inspect

- `src/data/library/candidates.json`
- `src/data/library/curation.json`
- `docs/library/CANDIDATE_REVIEWS/al-batnuni-al-rihla-al-hijaziyya.md`
- `docs/library/CANDIDATE_REVIEWS/ibn-jubayr-rihla.md`
- `docs/library/CANDIDATE_REVIEWS/ibn-uthaymeen-al-sharh-al-mumti.md`
- `docs/library/CANDIDATE_REVIEWS/ibn-uthaymeen-sharh-aqeedat-ahl-al-sunnah.md`
- `api/index.ts`
- `src/server/libraryReviewApi.ts`
- `firestore.rules`
- `HUKM_DEVELOPMENT_LOG.md`
- `HUKM_NEXT_TASK.md`
- `vercel.json`

## Validation truth

- PR #53 exact-head CI: PASS; post-merge main CI: PASS on `66e458bb28811a9bd8203050966227de907cd17a`.
- Current candidate PR must pass exact-head tests, Firestore Emulator, TypeScript and production build before merge.
- Vercel: `build-rate-limit`, deployment not confirmed.
- No production deployment or source ingestion performed.


---

# CURRENT VERIFIED CHECKPOINT — 2026-11-06 (after PR #54 merge)

Repository: `ifawz40-boop/HUKM`  
Default / Google AI Studio branch: `main`  
Main HEAD: `ef93ba00db72604c4e473209c7d9183209b80c1e`  
Checkpoint branch: `docs/checkpoint-after-pr54`  
Latest merged PR: #54 at `ef93ba00db72604c4e473209c7d9183209b80c1e`  
Open PRs at checkpoint creation: none

## Verified CI and deployment state

- PR #51 exact-head and post-merge main CI: PASS.
- PR #52 exact-head and post-merge main CI: PASS.
- PR #53 exact-head and post-merge main CI: PASS.
- PR #54 exact-head run #42252218512: PASS; post-merge main run #42252368802: PASS on exact SHA `ef93ba00db72604c4e473209c7d9183209b80c1e`.
- All runs passed tests, Firestore Emulator security-rules tests, TypeScript and production build.
- Vercel status remains `build-rate-limit`; no production deployment is confirmed.
- `vercel.json` keeps Git deployments disabled for all branches except `main`.
- Google AI Studio sync and Vercel dashboard settings remain unverified.

## Library inventory

- 27 hidden candidates; 0 approved public IDs (`approvedBookIds: []`).
- Category counts: religious 15, self-development 6, Islamic-philosophy critique 3, travel 3.
- Candidate #25 `الشرح الممتع على زاد المستقنع`: complete text, detailed methodology, editorial layers and rights pending.
- Candidate #26 `شرح عقيدة أهل السنة والجماعة`: complete text, recording comparison, editorial layers and rights pending.
- Candidate #27 `الرحلة الحجازية`: NYU record for 1329 AH [1911]; other catalogues list different 1909/1910 editions and page counts. Full text was not retrieved; review of Khedive praise, shrines, local religious practices and historical/political content remains pending.
- No PDF/full text copied. No archive/quarantine created. Confirmed non-compliant books must be deleted from the current tree, not isolated.

## PR #14 historical sync failure

- PR #14 is merged at `175356b3632f1f054c6280e5c986761cf2d07059`; its old source branch remains at historical SHA `5a3e0eb9da0920c54494abbfab2cef61e54bc2ba`.
- Its historical `sync-library` run failed because the old manifest did not pin `datasetRevision`.
- Current main is fail-closed: manual-dispatch/non-main workflow guard, `syncEnabled: false`, empty `editoriallyApprovedSourceIds`, and script aborts before external requests when sync is disabled.
- Do not enable ingestion or add a revision just to turn the old failed check green. Future ingestion requires exact approved source IDs, full editorial review, rights screening, pinned dataset revision and a PR-based flow.

## Security and UI

- `api/index.ts` mounts only auth, email and health; library review router is not mounted.
- Firestore rules explicitly deny client access to `libraryEditorialStates`, `libraryRightsStates` and `libraryReviewEvents`, plus default deny.
- Review API/repository remain scaffolding, not a live production feature.
- Curation panel has code-level focus trap, Escape handling and focus restoration. Manual keyboard/mobile/screen-reader QA remains outstanding.

## Exact next tasks

1. Obtain a complete, precisely identified copy of the 1911 NYU edition or another chosen edition of `الرحلة الحجازية`; review the full text before deciding whether it passes HUKM's standards.
2. If the travelogue fails the policy, delete its candidate record and report from the current tree; do not archive it.
3. Resolve the Ibn Jubayr travelogue from its full context and the owner's actual standard for the disputed tabarruk passage; do not label it shirk without evidence.
4. Complete full-text and editorial review of candidates #25 and #26, including edition consistency and rights.
5. Continue research in the underrepresented philosophy-critique category only when the author, content and edition can be sourced reliably; avoid adding books merely to increase the count.
6. Complete manual keyboard, mobile and screen-reader QA of the curation panel.
7. Keep Firestore review writes disabled and API unmounted until a production Admin adapter and verified-owner middleware are implemented and reviewed.
8. Verify Vercel dashboard settings and resolve build-rate quota separately; do not manually deploy or alter settings without authorization.
9. Confirm Google AI Studio remains connected to `main`.

## Files to inspect

- `src/data/library/candidates.json`
- `src/data/library/curation.json`
- `docs/library/CANDIDATE_REVIEWS/al-batnuni-al-rihla-al-hijaziyya.md`
- `docs/library/CANDIDATE_REVIEWS/ibn-jubayr-rihla.md`
- `docs/library/CANDIDATE_REVIEWS/ibn-uthaymeen-al-sharh-al-mumti.md`
- `docs/library/CANDIDATE_REVIEWS/ibn-uthaymeen-sharh-aqeedat-ahl-al-sunnah.md`
- `api/index.ts`
- `src/server/libraryReviewApi.ts`
- `firestore.rules`
- `scripts/sync-public-library.mjs`
- `.github/workflows/sync-public-library.yml`
- `HUKM_DEVELOPMENT_LOG.md`
- `HUKM_NEXT_TASK.md`
- `vercel.json`

## Validation truth

- PR #54 exact-head CI: PASS; post-merge main CI: PASS on `ef93ba00db72604c4e473209c7d9183209b80c1e`.
- Historical PR #14 sync-library: FAIL (missing pinned dataset revision in the old manifest); current ingestion path is disabled and guarded.
- Vercel: `build-rate-limit`, production deployment not confirmed.
- No manual deployment, source ingestion, or copyrighted full-text upload performed.
