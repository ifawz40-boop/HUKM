# HUKM MEDIA Engineering Session Checkpoint

- Repository: `ifawz40-boop/HUKM`
- Working branch: `main` only
- Checkpoint date: 2026-11-05
- Last verified code commit: `6017efde43d885663878c5c9789220928ec1ac0d`
- Last verified code commit URL: https://github.com/ifawz40-boop/HUKM/commit/6017efde43d885663878c5c9789220928ec1ac0d
- Google AI Studio source branch: `main`
- Vercel deployment model: GitHub integration; do not claim production deployment without deployment evidence.

## Completed in this session

1. Re-verified that `main` was at `e517aa0d64a72f6696a3e93c94d76d4036654d61` before changes.
2. Enumerated the full recursive repository tree: 109 blob files and 21 tree entries/directories; tree response was not truncated.
3. Reviewed the CI workflow, Vercel routing, both Express entry points, key Firestore rules, auth role resolution, permission service, API error handling, rate limiting, email recipient validation, and selected regression tests.
4. Identified that `package.json` test script omitted five existing test files:
   - `tests/apiErrorHandler.test.ts`
   - `tests/emailRecipients.test.ts`
   - `tests/requestProtection.test.ts`
   - `src/utils/authStorage.test.ts`
   - `src/utils/hukmEngine.test.ts`
5. Added all five to the existing `test` script without changing dependencies or lockfiles.
6. GitHub Actions run #127 completed successfully for commit `923cda8dff45a74ddce8122c7e1ec18f3e9cb81e`: locked dependency installation, complete test script, TypeScript check, and production build all passed.
   - Run: https://github.com/ifawz40-boop/HUKM/actions/runs/42085306830

## Additional completed batch — Vercel proxy-aware rate limiting

1. Confirmed from official Vercel documentation that Vercel overwrites `X-Forwarded-For` with the public client IP at its edge.
2. Confirmed Express defaults `trust proxy` to false, which means `req.ip` ignores forwarded client identity unless configured.
3. Added conditional `app.set('trust proxy', 1)` to both `api/index.ts` and `server.ts` only when `VERCEL === '1'`. This keeps local execution from trusting forwarded headers while allowing Vercel's single trusted proxy hop to populate visitor-specific `req.ip` for the in-memory rate limiters.
4. Added a regression assertion to `tests/requestProtection.test.ts` that both entry points keep the exact one-hop configuration conditional on Vercel.
5. CI run #130 passed all tests, TypeScript check, and production build for commit `6017efde43d885663878c5c9789220928ec1ac0d`.
   - Run: https://github.com/ifawz40-boop/HUKM/actions/runs/42085756446

## Files changed

- `package.json`: expanded the CI test command to execute every currently tracked test file identified in the repository inventory.
- `api/index.ts`: conditionally trusts the Vercel edge proxy hop so rate limiting keys on the visitor IP.
- `server.ts`: keeps the same conditional proxy configuration for entrypoint parity; local execution remains untrusted.
- `tests/requestProtection.test.ts`: guards the Vercel proxy configuration and existing API protection wiring.
- `docs/engineering/WORK_SESSION_CHECKPOINT.md`: this durable session record.

## Findings / risks to carry forward

- `vercel.json` routes `/api/*` to `api/index.ts`; `server.ts` is the separate local/standalone Express entry point. Security middleware must remain aligned across both.
- Current rate limiting uses an in-memory Map per process. It is useful as a per-instance abuse guard but is not a globally shared quota across independent Vercel serverless instances. Do not represent it as distributed/global protection.
- Role resolution in the client requires verified Firebase email, matching Custom Claim, and matching active `/admins/{uid}` registry role; failures fall back to reader.
- Firestore rules begin with default deny and explicitly constrain users, admins, books, annotations, subscribers, and reading progress. Complete rule-by-rule audit remains pending.
- External reference candidates: `mbret/prose-reader` is MIT-licensed and could be evaluated as an optional future EPUB/PDF reading engine; `Oghamark/homebranch-web` is AGPL-3.0, so do not copy/adapt code without a deliberate license review. HUKM's current custom chapter/content model may not need a full EPUB engine.
- No verified Vercel Production deployment status or Google AI Studio synchronization status was established in this session.
- The proxy-aware rate-limit fix is based on documented Vercel/Express header behavior; it is covered by CI regression checks but has not yet been confirmed against a live Vercel request's observed `req.ip`.

## Next work — resume in this order

1. Re-fetch latest `main` and confirm no concurrent changes.
2. Finish a complete Firestore rules audit, including every collection and nested match, field validation, ownership, privilege escalation, and delete/update edge cases.
3. Audit all backend routes and Firebase Admin operations; verify authentication, authorization, input validation, error behavior, and rate-limit placement.
4. Audit frontend auth state, admin/owner UI gating, email workflows, drafts, reading progress, annotations, and recovery paths against backend/rules enforcement.
5. Review all remaining tracked source/config/test files; record findings with exact paths and severity.
6. Inspect relevant open-source projects and licenses; extract design patterns only where they fit HUKM and its Vercel/Firebase constraints.
7. Add targeted regression tests for verified findings; run full tests, TypeScript check, and production build.
8. Save each verified batch directly to `main`, update this checkpoint, and report exact commit SHA and CI run.
9. Verify Vercel deployment and Google AI Studio sync separately when accessible; never infer either from a GitHub commit or CI success.

## Safety rules

- Never switch away from `main`, force-push, rewrite history, or overwrite concurrent work.
- Re-fetch the current branch head before every write batch.
- Do not expose secrets or copy environment values into reports.
- Do not perform production data migrations or manual deployments without explicit authorization.
- Keep checkpoint claims evidence-based and distinguish completed, pending, and blocked work.

## Owner provisioning hardening — 2026-11-05

### Completed on main
- Added `src/server/ownerBootstrapGuards.ts` and `tests/ownerBootstrapGuards.test.ts` with fail-closed checks for unknown/completed locks, UID takeover, pre-existing founder/admin records, and safe same-UID pending recovery.
- Reworked `scripts/bootstrap-owner.ts` as a local-only, project/database-pinned first-owner bootstrap. It requires an explicit confirmation value, checks verified Firebase Auth identity, refuses unknown/existing admin state, reserves the bootstrap lock transactionally, preserves unrelated claims, and rolls back ambiguous claim/finalization failures.
- Added `owner:bootstrap` and included the new guard tests in the full test script in `package.json`.
- Added `docs/security/OWNER_BOOTSTRAP_RUNBOOK.md` with Windows PowerShell setup, credential handling, expected verification, and recovery guidance.
- Added owner-only `POST /api/auth/grant-owner` with verified target email, no self-promotion, no overwriting an existing admin record, non-founder owner records, claim assignment, token revocation, and rollback handling.
- Added `grantOwnerRole` client action and an owner-only management-panel form. Additional owners can be revoked by an owner; the founder record remains protected.
- Added `scripts/verify-owner.ts` and `owner:verify`, a read-only Firebase Auth + Firestore consistency check; its test asserts that it performs no writes.
- The initial public HTTP bootstrap endpoint remains disabled. No email-based or client-side role assignment was introduced.

### Latest owner-provisioning code commits
- Guard helper: `5c28e925941b96cf5efe194ece09c1ba2b7b1948`
- Initial-owner script hardening: `83264091bd538f1f4b49cc3e253a4da28f0f16a7`
- Owner grant API: `6c937ceaf71d6e9253eb6fbf6ca5e85d5eaf6426`
- Owner management UI: `90c313e9bd1dd206634633f0a8559ba35daafdff`
- Runbook: `7d07230faba7aee103629f4267c350d450b99f05`
- Full test inclusion and CLI script: `84080a14ce8d277bc9600650e85dd5ff80420d0b`
- Integration guard tests: `f5f9ea51d9df4817131f1d3745ea9fa47c8c80bc`
- Latest rollback hardening: `cae7633f4493b755e5c580b1279c0800fbd6a906` and `36335b01ace8ea5980f415b602fef92691a78989`
- Read-only verification CLI: `6a973f893752b05a32f762596faf766d08c096c1`
- Verification runbook and test updates: `e6a0f1285920f6ac553315cb9ca4dc700f832d0b` and `0a12d43237a6171889d2bb54d5839ccf183dc2e8`
- Latest claim/founder-state rechecks: `d6e72cacf5f720a29d55f06d8af010229fe73414` and `7d3d01c62db238fc3845804566d19843f7540804`
- Script command documentation alignment: `619d473b605b279399d162e7d1db0124958a4076`

### Verification state and next resume marker
- Source files and the new test/runbook files were committed directly to `main`; latest code commit at checkpoint preparation: `619d473b605b279399d162e7d1db0124958a4076`.
- A combined GitHub commit-status query returned a Vercel status of `failure` pointing to the Vercel build-rate-limit/upgrade page. This is not evidence of a successful Vercel deployment.
- GitHub Actions test/typecheck/build result for the owner-provisioning batch has not yet been independently confirmed. Do not claim the tests or production build passed until the Actions run is inspected.
- Firebase production bootstrap has NOT been executed. No Firebase Auth custom claim or Firestore admin/bootstrap document has been changed by this work.
- Google AI Studio synchronization has not been independently confirmed.

**RESUME HERE:** First inspect latest `main` and the CI run for the latest owner-provisioning commit (currently `619d473b605b279399d162e7d1db0124958a4076`). Fix any failing tests/type errors and save the fix plus an updated checkpoint to `main`. Then provide the operator with the local runbook steps (`bun run owner:bootstrap`, followed by `bun run owner:verify`); wait for the non-secret verifier output and confirm that Firebase Auth `role: owner`, `admins/{uid}` (`isFounder: true`), and `_system/bootstrap.status=completed` agree. Never ask for or accept the service-account key in chat.

## Owner provisioning continuation — 2026-11-05 19:06 UTC

### Additional issues found and corrected on main
- Corrected the owner email validation path. The earlier inline regex had an escaping defect in the new HTTP grant endpoint and read-only verifier. Added one shared `isValidOwnerEmail()` helper in `src/server/ownerBootstrapGuards.ts`; the initial bootstrap CLI, verifier, and API grant route now use it. Added tests for valid and malformed email input.
- Enforced the user's selected ownership model: one original founder may appoint additional owners; additional owners cannot appoint further owners. Added server middleware `requireFounderOwner`, which requires a verified `role: owner` token AND the caller's official `admins/{uid}` record with `role: owner` and `isFounder: true`. The `POST /api/auth/grant-owner` route now uses this middleware.
- Updated the admin management UI to show the add-owner form only when the current UID appears in the loaded admin registry with `isFounder: true`. Other owners see a clear explanation and the server independently denies their attempts.
- Closed a Firestore privilege-escalation path: `firestore.rules` now denies all client-side create/update/delete operations on `/admins/{uid}`. Reads remain available to verified admins/owners. Role registry mutations are restricted to trusted Firebase Admin SDK server operations and the local bootstrap CLI, preventing additional owners from editing their own `isFounder` flag.
- Added a static security regression test in `tests/security.test.ts` asserting that client writes to the admin registry remain denied.
- Updated `docs/security/OWNER_BOOTSTRAP_RUNBOOK.md` with the separate Firestore rules deployment command. A GitHub/Vercel source deployment does NOT deploy Firestore rules.

### Relevant commits in this continuation
- Founder-only server authorization: `8c5dfc191ec046653330041982cb8ad00a95abbc`
- Shared email validation helper and adoption: `901f40920b3e5835c9ae9d2cacffea7d16037182`, `b433ce79ec7196690ed01dce6c44d8d6cea48cb1`, `e557485f99f5879bd87745ac09f502d48e1978ce`, `62cfb7fe8058524a15280fc483b8c2bf34dfb209`
- Founder-only UI and regression tests: `991ef285e43794423879457cd52e32e8d97815ee`, `c57ca622dad31369a6ef12d24ed5f54a52f973c8`, `2fb8e54caef068b77f8d89f2bbabb16215cc3d6e`
- Firestore admin-registry write lockdown: `2f604643cd690534e05904028ee293972af8e9d1`
- Firestore rules regression test: `68dbeef29ce9a6ed27bbfedb87ea6a752d7db754`
- Runbook rules-deployment instructions: `fe207ba2a11efa4f40b2e1ef521c6bd1d204fdf4`
- Duplicate import cleanup and final documentation alignment: `d4a40c6d13a911fc3be424d1ae0fb2673dde31e3`, `11a95dfc37dde00708e4189f44ad68e8d8a9c84b`, `e70f536eaaee3f07e9a8f493ed0d74f8873500ce`, `25cbdf6741cba635c2168838748440d901e25705`

### Current verification state
- Latest reviewed source commit before this checkpoint: `fe207ba2a11efa4f40b2e1ef521c6bd1d204fdf4`.
- GitHub combined commit status reports Vercel `failure` for that commit. The status target is a Vercel deployment page; no successful production deployment is confirmed.
- The repository CI workflow `.github/workflows/ci.yml` runs tests, TypeScript check, and production build on pushes to `main`. The available GitHub connector's commit-workflow wrapper only returns pull-request-triggered runs; it returned no run for this push commit. Therefore the Actions test/typecheck/build result remains unverified. Do not state that tests passed.
- Firebase production bootstrap has NOT been executed. No Auth custom claim, `admins/{uid}`, or `_system/bootstrap` production data has been changed.
- The updated Firestore rules have NOT been deployed to Firebase. The rule change is only committed in GitHub until the operator runs the documented Firebase CLI command and confirms success.
- Google AI Studio synchronization has not been independently confirmed.

### Exact next actions
1. Inspect GitHub Actions for the latest `main` push and fix any test, typecheck, or build failures before proceeding.
2. From the repository root, deploy the committed Firestore rules using:
   `firebase deploy --only firestore:rules --project gen-lang-client-0492732633`
   Confirm deployment success in CLI output or Firebase Console. Do not assume Vercel deploys these rules.
3. With the Firebase Admin credential stored locally outside the repository, run:
   `bun run owner:bootstrap`
   then `bun run owner:verify`.
4. Only mark the founder owner active when the verifier reports all PASS for verified Auth email, `role: owner` claim, `admins/{uid}` with `isFounder: true`, and completed/locked `_system/bootstrap`.
5. Sign out and sign back in, confirm the owner management panel, and verify only the founder sees the additional-owner appointment form.
6. Never request or accept Firebase service-account credentials in chat.

**RESUME MARKER:** Start at latest `main`, inspect GitHub Actions (push-triggered run not exposed by current connector wrapper), then verify/deploy Firestore rules, then local Firebase bootstrap. Latest checkpoint must be advanced after any further code change.

### Final audit follow-up — 2026-11-05 19:07 UTC
- Updated the grant-owner API documentation to explicitly state that only the verified founder can appoint additional owners: `a95a64233d106eac092a578094ea4f27f20a1d6b`.
- Final source review confirmed the shared email validator is used by the bootstrap CLI, verifier, and grant-owner API; the grant-owner route is founder-gated; the founder-only UI condition is present; Firestore rules deny client writes to `/admins/{uid}`; and regression tests are included in the package test script.
- The repository's CI workflow is push-triggered. The currently available commit workflow retrieval wrapper returns PR-triggered runs only, so no assertion about the push CI result is made. The latest combined status still reports a Vercel failure associated with the build-rate-limit page.
- Firebase Emulator tests have not been run. The static security regression tests are committed but remain unverified until CI or a local test run completes.

**LATEST CODE COMMIT:** `a95a64233d106eac092a578094ea4f27f20a1d6b`.


## CI recovery and source verification — 2026-11-05 19:24 UTC

### Findings fixed on main
- Fixed owner-email validation to reject malformed/backslash-containing addresses and enforce a bounded email shape in `src/server/ownerBootstrapGuards.ts`.
- Replaced obsolete manager-bootstrap source assertions in `tests/security.test.ts` with tests for the current single-founder bootstrap design and its claim rollback path.
- Fixed malformed JSX around the founder-only additional-owner form in `src/components/AdminManagementModal.tsx`.
- Fixed a TypeScript control-flow issue by returning the reservation decision directly from the Firestore transaction in `scripts/bootstrap-owner.ts`.
- Moved the founder-state derivation below the `adminsList` state initialization to remove use-before-declaration errors.

### Verified commits
- Email validation fix: `1f3881e34add5c61cc714a296512c510053409ab`
- Bootstrap test alignment: `bb377735e55e03a04337d87196232e4770143462`
- Reservation guard test correction: `2045a27b2d96d6677665e25503606fbb9aae3e12`
- Founder UI JSX fix: `221ce99e805fda89aaf19d03b5d02dfbcd7686c9`
- Bootstrap transaction return fix: `608a6ca2e88fe8418e8584685723a58542be489f`
- Founder-state initialization fix: `5cb8023bd1d3559a74aa80b88955255b6669d310`

### CI evidence
- GitHub Actions run: https://github.com/ifawz40-boop/HUKM/actions/runs/42093380355
- Commit: `5cb8023bd1d3559a74aa80b88955255b6669d310`
- Result: SUCCESS — locked dependency install, full test suite, TypeScript check, and Vite production build all completed successfully.
- The full test suite passed after updating stale assertions; TypeScript and production build both passed after the two source-level fixes.

### Still blocked / not verified
- GitHub combined status for the code commit continues to show Vercel `failure`, with the target URL indicating a Vercel build-rate-limit/upgrade page. No successful production deployment is confirmed.
- Firestore rules are committed but have NOT been deployed to Firebase. No live rules compiler/emulator or production rule evaluation has been run in this session.
- Firebase Auth custom claims and Firestore `admins/{uid}` / `_system/bootstrap` production documents have NOT been modified. First-owner bootstrap and read-only verifier have NOT been executed.
- Google AI Studio synchronization remains unconfirmed.

### Exact resume point
1. Start from latest `main`; do not use a local checkout assumption.
2. The current code commit is `5cb8023bd1d3559a74aa80b88955255b6669d310`; this checkpoint update will be a documentation-only commit after it.
3. Before owner provisioning, the operator must deploy Firestore rules using the runbook command and confirm success:
   `firebase deploy --only firestore:rules --project gen-lang-client-0492732633`
4. Then run the local-only `bun run owner:bootstrap` and `bun run owner:verify` with credentials kept outside the repository and never shared in chat.
5. Confirm the verifier reports all PASS, then sign out/in and verify founder-only owner management UI.
6. Revisit Vercel build-rate-limit failure and independently confirm Google AI Studio sync.

**LATEST VERIFIED CODE COMMIT:** `5cb8023bd1d3559a74aa80b88955255b6669d310`.


## Static Arabic public-domain library replacement — 2026-11-05

### User request
Remove every existing book and all default/demo library data from HUKM. Research a real, publishable Arabic book collection and bundle full book texts inside repository source files so the public catalogue does not read/write Firebase. Continue without waiting for repeated user confirmations. Save checkpoints and resume instructions.

### Repository state at task start
- Repository: `ifawz40-boop/HUKM`
- Branch: `main`
- Starting HEAD: `c39985a419a157cffbc7cd3fbee266ec567fc40b`
- Google AI Studio is expected to connect to `main`, but synchronization has not been independently verified.

### Source research and rights decision
- Primary candidate corpus: Bayanat Labs, **Arabic Wikisource Public-Domain Works**, dataset v0.1.0, built from the official Arabic Wikisource dump dated 2026-10-01.
- Dataset card: https://huggingface.co/datasets/Bayanat-Labs/arabic-wikisource-pd
- Dataset description: https://www.bayanatlabs.com/open/arabic-wikisource-pd
- It contains whole works with chapters, authors/translators/editors and death dates, source pages and revision history. Core tier contains 40,782 works / 66,352,748 words; most records are poems, so do NOT import the entire dataset indiscriminately.
- Text transcription license: CC BY-SA 4.0; attribution must credit Arabic Wikisource contributors and the dataset, link source pages/history, and keep redistributed text under CC BY-SA 4.0. Dataset tables are CC BY 4.0; builder code Apache-2.0.
- Use only `works-pd-core` tier. Do not use `works-life50` or uncertain/late-copyright records.
- Dataset limitations: 36 released works are marked incomplete; 29 have unclosed markup; many texts derive from modern editions with unnamed editors. The selected works must be filtered for text length, chapters, non-poetry genre, completeness flags/categories and source-page metadata; do not claim scholarly critical-edition verification.
- Confirmed Wikisource examples/pages: `البيان والتبيين`, `الكامل في اللغة`, `تهافت الفلاسفة (الغزالي)`, `المنقذ من الضلال`, `مقدمة ابن خلدون/القسم الأول من المقدمة`, `رسالة الغفران/الجزء الأول`. Some known pages are explicitly incomplete (e.g. `مروج الذهب ومعادن الجوهر`, `العقد الفريد` 1953 introductory text) and must not be included as complete books without separate verification.
- Hugging Face Dataset Viewer supports exact-title filtering via `https://datasets-server.huggingface.co/filter` with dataset/config/split/where/offset/length. Build-time retrieval only; the deployed app must not call this API.

### Current defects found in HUKM
- `src/App.tsx` fetches books from Firestore and can restore stale localStorage caches (`hukm_books_v1/v2/v3`).
- It fetches Firestore categories and seeds `INITIAL_CATEGORIES` when absent.
- Book create/update/delete and chapter views write to Firestore.
- Existing writer/new-book/category management UI creates new cloud book data.
- Current `INITIAL_BOOKS` is empty, but old Firestore/localStorage content can still reappear.
- Book reader progress, bookmarks, annotations and notifications are separate user data; preserve them unless they point to removed book IDs. Do not wipe unrelated user data.
- The server has Firebase Admin SDK and founder verification middleware `requireFounderOwner` in `src/server/authClaimsApi.ts`; server routes are mounted under `/api/auth`.

### Planned architecture
1. Static, version-controlled book files in `src/data/library/books/*.json`, imported eagerly by Vite; no runtime Firebase reads/writes for book catalogue/content.
2. Static category definitions in source; remove category seeding and category Firestore reads/writes.
3. Build-time one-off GitHub Actions sync script to fetch only explicitly curated complete works from Hugging Face Dataset Viewer, validate tier/license/length/chapters/non-poetry/completeness, and commit full chapters as static JSON. No Hugging Face request at site runtime.
4. Include source URL, revision/history URL, author/editor/translator metadata, dataset version, CC BY-SA 4.0 notice and per-book attribution.
5. Replace stock/fake cover imagery with a local typographic cover fallback; do not invent cover images or metadata.
6. Remove legacy book caches on client and stop restoring them.
7. Remove or disable cloud book authoring/editing/deletion and default category management for this static public-domain catalogue. Preserve user-specific reading progress/bookmarks where valid.
8. Add founder-only, confirmation-gated server cleanup for legacy Firestore `books`, `bookDraftChapters`, and `categories` documents; preserve `users`, `readingProgress`, `annotations`, auth, admin, notifications and subscriber records. Production deletion is NOT complete until the founder-triggered endpoint succeeds.
9. Add tests for static data validation, no catalogue Firestore access, licensing metadata and cleanup endpoint guards.
10. Run GitHub Actions tests, typecheck and production build; verify Vercel status separately. Do not claim successful deployment if Vercel rate-limit persists.

### Exact resume instructions
- Always re-fetch latest `main` before writing.
- Continue on `main` only; no PR or feature branch.
- First implement the manifest + build-time sync script + workflow; inspect the generated rows and only keep complete, sufficiently long non-poetry works.
- Then wire the static catalogue into App, remove old cache/Firestore catalogue paths and authoring controls, add rights attribution UI.
- Then add founder-only purge endpoint and a clear confirmation UI/runbook. Do not invoke production deletion without explicit confirmation string from the founder UI; do not delete unrelated user data.
- After every substantial phase, update this checkpoint with current commit, changed files, test status, generated-book counts/size, purge status, and next exact action.
- Never claim that legacy Firestore data has been deleted until a successful production response reports counts.


### Research update — preferred corpus changed (2026-11-05)
A stronger primary source was found after the first Wikisource sync attempt:
- Bayanat Labs **Open Arabic Books**, v0.1.0: https://huggingface.co/datasets/Bayanat-Labs/open-arabic-books
- Dataset card: https://www.bayanatlabs.com/open/open-arabic-books
- 1,545 complete Arabic books from Hindawi Foundation, 27,544 chapter/section rows, 54,204,272 words; books config is one whole book per row and chapters config contains section text/footnotes.
- Per-book colophons were read. 332 works have Arabic translation and book design explicitly CC BY 4.0 with original text public domain; 1,212 original Arabic texts are public domain with design CC BY 4.0; one is original CC BY 3.0. 200 corpus books were excluded for missing translation-license evidence/reserved rights/contradictory statements.
- Important jurisdiction warning: publisher's public-domain statement is not legal advice; copyright terms vary. The initial production selection should therefore use only records with `translation_covered === true`, `original_text_status === 'public-domain'`, and a matching CC BY 4.0 colophon. This makes the Arabic translation itself explicitly licensed, while the underlying work is marked public domain.
- Dataset revision: `39876c0e7f28c2d16887c7c139800e0df9f87263`; source corpus: Andreas Hallberg, The Arabic E-Book Corpus v1, DOI https://doi.org/10.5878/7rbh-gy93.
- The dataset's 100-book reading sample had correct chapter boundaries; 0 source-hash or license-quote mismatches were found in the full release check. This is not a full proofreading guarantee. Images/SVGs are omitted and must be disclosed.
- Preferred approach: replace the Wikisource-only candidate list with this better complete-book dataset; select a balanced subset by category and length from the 332 translation-covered works. Retain exact attribution and colophon quote per book.

### Revised static bundle performance design
- Do NOT eagerly import all full-text books into the initial JavaScript bundle.
- Generate `src/data/library/catalog.json` with lightweight metadata only.
- Generate one full text JSON file per book under `src/data/library/books/<book_id>.json`.
- `src/data/library/index.ts` should use lazy `import.meta.glob('./books/*.json')` loaders and export `loadPublicLibraryBook(id)`; the app should load the full text only when a reader opens that book. These are static chunks from the deployed site, not runtime Firebase/API calls.
- Extend `BookChapter` to preserve footnotes and omitted-media/table counts; render footnotes in the reader.
- Extend `BookProject` metadata with `wordCount` and `chapterCount` so catalogue cards/metrics do not need full text loaded.

### Current execution status at checkpoint update
- Static catalogue migration already committed to main; active Firestore book/category reads and writes were removed from App.tsx.
- Old localStorage book/category cache keys are removed on app load; old `INITIAL_BOOKS`, `INITIAL_CATEGORIES`, and `HUKM_PRESET_MEDIA` seeds were removed from `src/data/hukmData.ts`.
- Writer/new-book/category publishing controls and the fake "investigation" spotlight were removed from active UI.
- Founder-only, exact-confirmation API `POST /api/auth/purge-legacy-library` and UI modal are implemented. It deletes only `books`, `bookDraftChapters`, `categories` and preserves user accounts/progress/bookmarks/annotations/notifications/subscribers/admin records. Production deletion has NOT yet been executed.
- Initial Wikisource sync workflow encountered Hugging Face Dataset Viewer HTTP 500 transient auth-check failures. A retry was added; run `42095906072` may still be in progress from its earlier workflow snapshot. It may commit Wikisource files; the revised Open Arabic Books sync should replace the generated output and remove stale JSON files.
- The static-library regression tests were added to `package.json` test script. Older tests were revised to reflect no cloud publishing UI.
- Latest verified code state must be re-fetched from main; this checkpoint is being updated while work continues.

### Exact resume instructions (revised)
1. Re-fetch latest `main`.
2. Replace `src/data/library/manifest.json` with Open Arabic Books dataset selection criteria (metadata config + chapters config), target 20–28 complete works, balanced by category, minimum ~8,000 words and at least 3 sections, maximum per-book size and total-word budget.
3. Rewrite `scripts/sync-public-library.mjs` to page through metadata rows, accept only `translation_covered === true` + `original_text_status === 'public-domain'` + CC BY 4.0 colophon, select a balanced category mix, then fetch chapter rows by `book_id` with pagination and validate summed text words against metadata.
4. Generate `catalog.json` metadata and lazy per-book JSON files. Include exact per-book attribution, license quote, publisher URL, source hash, dataset revision, and omitted images/SVG/tables counts. Include footnotes as structured data.
5. Update `index.ts` to lazy-load book JSON modules. Update App handlers to load full books on demand. Update cards/hero metrics to use metadata `wordCount` and `chapterCount`. Update reader to display footnotes and omissions.
6. Verify generated titles, credits, chapters, rights and content sizes in CI logs and NOTICE. Do not call a title "complete" unless chapter and word-count validation passes.
7. Run CI tests/typecheck/build. Fix failures and checkpoint. Then address Vercel build-rate-limit.
8. After deployment, the founder must execute the confirmation-gated legacy purge from the owner-only control. Production Firestore cleanup is not complete until endpoint returns exact deletion counts and the status marker is completed.


## Static library implementation checkpoint — 2026-11-05 20:00 UTC

### Current main
- Latest main at checkpoint: `21611192cbf4c0f22be5adc87d7981cebfd50091` (`docs: document Open Arabic Books rights filter and lazy static loading`).
- Branch: `main` only.

### Source decision
- Primary corpus now: Bayanat Labs **Open Arabic Books** v0.1.0, pinned dataset revision `39876c0e7f28c2d16887c7c139800e0df9f87263`.
- Source dataset has 1,545 whole Arabic books and 27,544 chapter/section rows. Initial HUKM filter is deliberately stricter: only `translation_covered=true`, `original_text_status=public-domain`, explicit CC BY 4.0 colophon for Arabic translation, source URL, attribution, source SHA-256, minimum word count and chapter count.
- Target 24 books, minimum 15; 8,000–120,000 words per book, at least 3 sections, max 1.5m total words. Category quotas provide history, literature, detective fiction, novels, biographies, children, science and philosophy; remaining slots fill from other categories.
- This avoids treating the dataset's CC BY 4.0 table license as automatic permission for every text. Exact per-book colophon quote and attribution are retained.

### Implemented on main
- `src/App.tsx`: no Firestore book/category reads or writes; static catalogue metadata only; full book loaded from bundled JSON when opened; legacy localStorage book/category caches are removed; progress/bookmarks/notes and user data remain separate.
- `src/data/hukmData.ts`: removed empty/default book/category seeds and fictional preset media.
- Active UI: removed cloud writer/new-book/category publishing controls and fake investigation spotlight; updated library wording and generic typographic covers.
- `src/data/library/index.ts`: static categories, lightweight metadata import and lazy `import.meta.glob('./books/*.json')` loaders.
- `src/data/library/catalog.json`: initialized empty; sync workflow will populate metadata.
- `src/data/library/manifest.json`: rights-screened Open Arabic Books selection criteria.
- `scripts/sync-public-library.mjs`: downloads metadata pages, screens rights, selects a category-balanced subset, fetches chapter rows by book ID, checks chapter/word completeness, preserves footnotes and omitted-media counts, writes one JSON file per book plus a metadata-only catalogue and attribution notice.
- `.github/workflows/sync-public-library.yml`: runs the source sync on manifest/script changes and commits generated files to main; generated full text is not fetched by the live website.
- `src/types/hukm.ts`: book rights, credits, footnotes, omitted media, word/chapter counts.
- UI: BookCard, BookOverviewView, BookReaderView, BookSpineShelf, HukmHero, HukmNavbar, HukmLandingView and UserProfileModal updated for static metadata/lazy text, per-book attribution, license quote, footnotes and omitted media.
- `src/server/authClaimsApi.ts`: founder-only status endpoint and confirmation-gated `POST /api/auth/purge-legacy-library`; deletes only Firestore `books`, `bookDraftChapters`, `categories`, with bounded batches and one-time audit marker.
- `src/components/LegacyLibraryPurgeModal.tsx` and `src/App.tsx`: owner-facing confirmation UI. It requires exact phrase `DELETE_ALL_LEGACY_LIBRARY_DATA`; backend independently checks founder registry.
- `tests/staticLibrary.test.ts` added to package test command; older draft/navigation tests revised for the static library.
- `docs/security/OWNER_BOOTSTRAP_RUNBOOK.md` documents data purge, rights selection and lazy static source.

### Verification
- GitHub Actions run `42098611658` at commit `f0598095c34559922b92cf83bcadcab66abbd00` (see run URL below) completed SUCCESS: full tests, TypeScript check and Vite production build.
  - Run URL: https://github.com/ifawz40-boop/HUKM/actions/runs/42098611658
- A second CI run for commit `d738953c2be6c43bc58ba6043f2549948453d798` is running/queued after the source-hash and author validation tightening; re-check before claiming latest verification.
- Static library sync run `42098611748` is in progress using the initial Open Arabic Books script; run `42098663598` is queued for the tightened script. Inspect both before changing anything. Old Wikisource sync run `42097845305` may still be active from an earlier snapshot; if it commits old corpus files, the new sync script must replace them and remove stale JSON.
- Vercel combined status remains failure due the external build-rate-limit/upgrade target. No successful Vercel deployment is confirmed.
- Production Firestore cleanup has NOT run; the founder must execute the UI confirmation after a successful deployment. Do not claim old Firestore documents are deleted until API success returns exact counts and `_system/legacyLibraryPurge.status=completed`.
- Google AI Studio sync remains unconfirmed.

### Exact next actions
1. Re-fetch latest main and Actions runs.
2. Wait for the Open Arabic Books sync workflow. Inspect its logs for metadata row count, eligible rights-cleared works, each accepted title/author/word count/chapter count, rejected reasons, total words and total JSON MiB.
3. If it fails, inspect the exact HF Dataset Viewer response/schema. Fix only the mismatched field/API query; do not weaken rights checks or completeness thresholds to force a pass.
4. If it succeeds, verify generated `catalog.json` count equals JSON file count; inspect representative books for author/translator, exact colophon, source hash, text, footnotes and omitted-media counts. Confirm stale Wikisource JSON files are gone.
5. Run/inspect CI on the generated data commit. It must pass tests, TypeScript and production build; the generated-book test must run (not skip).
6. Review initial bundle size and confirm book JSON files are lazy-loaded chunks, not eager imports.
7. Verify Vercel deployment separately; rate-limit is external and may persist.
8. After deployment, the founder uses the owner-only cleanup control once. Confirm exact deleted counts and the completed marker. User profiles, auth, bookmarks, progress, notes, notifications, subscribers and admin records must remain intact.


## Combined static-library + Firebase owner activation continuation — 2026-11-05 20:09 UTC

### Latest repository state
- Latest `main` checkpoint commit: `aa641dc189e79a83aaa7eeabf6724d78356234ac` (`test: validate actual per-book license labels`).
- Repository remains `ifawz40-boop/HUKM`, branch `main` only.
- Latest full CI before the last test-only commit passed at `b2843a484ecdc3d35f0ee97e0275c08c2b8271fb`: https://github.com/ifawz40-boop/HUKM/actions/runs/42100408974
- CI for `aa641dc189e79a83aaa7eeabf6724d78356234ac` is queued at checkpoint time: https://github.com/ifawz40-boop/HUKM/actions/runs/42100523861
- The static library sync run `42099576786` is still in progress; its job has been running the source download/validation step since 20:03 UTC and no logs are available until the step completes. It was launched from commit `f343a93c642cb7e51a57b49b00ea6373e12713b3`. Do not assume generated books exist yet. Run: https://github.com/ifawz40-boop/HUKM/actions/runs/42099576786
- Vercel commit status remains failure with external target `https://vercel.com/ifawz40-boop?upgradeToPro=build-rate-limit`; this is a build-rate-limit condition, not a code test failure and not a successful deployment.

### Critical Firebase named-database target correction — committed
- Confirmed `src/server/firebaseAdmin.ts`, `scripts/bootstrap-owner.ts`, and `scripts/verify-owner.ts` all target project `gen-lang-client-0492732633` and named Firestore database `ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96`.
- Previous `firebase.json` had only `firestore.rules` and omitted the database ID, which could target the default database instead of the app's named database.
- Updated root `firebase.json` to include that exact `firestore.database` value.
- Updated runbook command to `firebase deploy --only firestore --project gen-lang-client-0492732633`; operator must confirm CLI output explicitly names the same custom database and stop if it says `(default)`.
- Added regression test requiring `firebase.json`, bootstrap CLI, verifier, and server Admin SDK to agree on the same named database.
- Official Firebase documentation confirms named database rule sources must be associated with their database in `firebase.json`, and CLI deployment uses configured database targets:
  - https://firebase.google.com/docs/cli
  - https://firebase.google.com/docs/rules/manage-deploy
  - https://firebase.google.com/docs/firestore/manage-databases
- Do not claim the rules are deployed. No Firebase production write has occurred.

### Owner activation status
- Bootstrap CLI remains local Admin SDK only, with explicit `OWNER_EMAIL`, `BOOTSTRAP_CONFIRMATION=HUKM_INITIAL_OWNER`, exact project/database pinning, verified Auth email requirement, transactional reservation and fail-closed checks.
- Read-only `owner:verify` checks Auth email verification, owner custom claim, bootstrap lock/completion, UID match, owner registry, and founder flag.
- Firestore rules deny browser/client writes to `admins/{uid}`; trusted Admin SDK only.
- Neither Firestore rules deployment nor initial owner bootstrap/verifier has been executed against production. No Auth claims or Firestore admin/bootstrap documents have been changed.
- Plugin discovery found Firebase and Vercel integrations, both uninstalled at time of check; connection suggestions were presented. After the user connects them, inspect available actions and permissions before use. Do not ask for service-account JSON or private keys.
- User's previously confirmed founder email in project discussion: `ifawz40@gmail.com`. Only use it as `OWNER_EMAIL` after Firebase confirms that exact Auth user exists and is verified.

### Public-library source research update
- Current primary candidate: Bayanat Labs Open Arabic Books v0.1.0, pinned revision `39876c0e7f28c2d16887c7c139800e0df9f87263`, 1,545 Hindawi books / 27,544 sections. It distinguishes 332 translations with CC BY 4.0 covering the Arabic translation from 1,212 works whose colophon puts the original text in the public domain while CC BY applies to design; those are not blanket text CC BY rights. Source: https://www.bayanatlabs.com/open/open-arabic-books
- Script screens for explicit CC BY translation + public-domain original, or a stricter life+70 metadata screen. The second is only a triage heuristic and must remain clearly labelled, not legal advice. Unknown/incomplete credit rows fail closed. Runbook now documents both rights paths.
- A second potentially useful corpus was found: Bayanat Labs Arabic Wikisource Public-Domain Works v0.1.0, with 40,782 `works-pd-core` works and CC BY-SA 4.0 transcribed text, authors/translators/editors and death-date evidence. However 40,732 are poetry (mostly single poems), so it should be a separate classical/poetry collection rather than falsely marketed as 40k complete books. It could supplement, not replace, the Hindawi book catalogue. Source: https://www.bayanatlabs.com/open/arabic-wikisource-pd
- The older Wikisource sync workflow run `42097845305` and previous sync attempts were cancelled/stale. Inspect for stale generated JSON after the current Open Arabic Books run completes.
- Static library architecture remains: metadata-only catalogue + one lazy-loaded JSON per book; no runtime Firebase/Hugging Face book fetches; user progress/bookmarks/notes remain separate and preserved.

### Exact continuation instructions
1. Fetch latest `main`, latest Actions runs, and verify `aa641dc...` CI result.
2. Poll sync run `42099576786`. Once complete, inspect its job log. If failed, fix the exact dataset-viewer schema/API issue; do not relax rights or completeness filters.
3. If successful, verify `catalog.json` count equals generated JSON files; inspect representative titles, author/translator credits, per-book rights tier, colophon, attribution, source hash, footnotes, omissions, word and section totals, and ensure stale old corpus files are gone.
4. Update sync script's startup and NOTICE text so it describes both rights paths accurately (currently some old strings still say only explicit CC BY). Correct the rights regex/metadata handling only after inspecting actual generated rows and source schema. Re-run CI; ensure the generated-book test does not skip.
5. Consider a separate optional Wikisource classical-poetry collection only after inspecting schema, sample quality, duplicate/incomplete status, chapter structures and CC BY-SA attribution. Do not combine it with modern book category counts.
6. Verify lazy chunks and production bundle size.
7. Check Vercel again. It remains blocked by build-rate-limit; use Vercel integration once connected to inspect project/build details and avoid claiming deployment.
8. For owner activation, use Firebase integration only after connection. Read actual project/database IDs and current Firestore rule release, verify Auth user `ifawz40@gmail.com`, then deploy only to the named database after confirming target. Execute bootstrap once only if all preconditions pass, then run read-only verifier. Preserve all user and subscriber data.
9. If Firebase/Vercel integrations remain unconnected, report the precise blocker and preserve this checkpoint; never claim production rules or owner state changed.


## Final continuation marker — 2026-11-05 20:10 UTC

- Confirmed latest main at `6980573a35841f2d21e79aa52ab07f2afffe1d5b`; its GitHub verification run `42100644935` completed SUCCESS at 20:09:16 UTC (tests, typecheck, production build).
- Last additional test assertion was corrected to accept both valid book license labels: explicit CC BY 4.0 translation or the declared public-domain life+70 screen.
- Named database configuration is committed and included in successful CI. This verifies repository consistency only; it does not prove the production rules release was updated.
- Open Arabic Books sync run `42099576786` remains in progress/stale since 20:03:05 UTC. Do not claim it succeeded; check whether it times out or finishes before deciding to cancel/re-run.
- Vercel remains failed due the external build-rate-limit status.
- Firebase and Vercel plugins were suggested but are not confirmed connected. Production Firestore rules deployment and owner bootstrap remain pending live Firebase access.
- Current resume point: poll `42099576786`; inspect generated corpus and fix the remaining sync-script/NOTICE rights-description mismatch only after seeing its output; then check CI and Vercel. Next, use connected Firebase/Vercel integrations if available to inspect and complete the live operations safely.


## Full repository audit session — 2026-11-06

- Full audit plan saved at `docs/engineering/FULL_REPOSITORY_AUDIT_PLAN.md`.
- Repository tree at audit start: 155 entries, recursive listing not truncated.
- Branches reviewed: backups, deployment branches, SND source investigation, library gate/pinning/notice fixes and test branches. The inspected key files on `deploy/vercel-preparation` matched main; the older pinned-source branch has the previous broken absolute-URL preflight and must not overwrite main.
- Confirmed P1 findings: announcement UI currently reports success after local-only state update; notifications are stored in one global localStorage key (not per-user); Writer Studio exists but is not imported/rendered by App and no writer view branch exists; legacy Firebase book/category CRUD functions remain in firestoreService although App uses static library; serverless rate limiter is per-process only.
- Confirmed library blocker: catalog empty and no full-text JSON book files. Vercel gate correctly blocks publication until the manifest minimum is satisfied.
- Corrected Hugging Face revision preflight URL construction in `scripts/sync-public-library.mjs`; added regression coverage in `tests/staticLibrary.test.ts`.
- CI run `42170693668` on `b551c04c85d04d82679e180adaf1ed7a5ee7d6a0` passed.
- Sync run `42170669881` was still running when last checked; inspect logs/status. It began on `f958877b480a6eb72213a590781110d2c60c2550` before the final test-only commit.
- Next: finish static library source sync and curation first, then implement true multi-user notifications, then decide safe static publishing/editor model, then reader/user isolation and admin/backend/UI audits. Follow the two-check + main-commit rule in the audit plan.
- Never claim books are bundled until generated JSON files and matching catalogue are committed and the deployment gate passes. Never claim notifications are broadcast until a second account can fetch the persisted announcement. Never claim Firebase/Vercel production changes from GitHub CI alone.


## Phase 2 — Multi-user announcement integrity — 2026-11-06

### Implemented on main
- `src/utils/authStorage.ts`: notification read-state keys are partitioned by authenticated UID or guest; old global `hukm_notifications_v1` pseudo-broadcast/default cache is removed; there is no fabricated welcome notification.
- `src/utils/authStorage.test.ts`: verifies empty default, account A vs account B vs guest isolation, and legacy global key removal.
- `src/firebase/firestoreService.ts`: added public announcement fetch/subscribe and validated owner-authenticated create service. Reads are constrained by `where('targetRole', '==', 'all')`; shared documents do not persist `read`.
- `firestore.rules`: public announcements remain readable, but creation requires the verified founder/owner and strict field/length/type validation; updates/deletes are denied so published broadcasts are immutable.
- `src/App.tsx`: listens for announcements in real time; merges each account's own read-state; account switch/logout switches to a separate partition; announcement send now awaits the real Firestore write.
- `src/components/SendAnnouncementModal.tsx`: pending/error/success behavior; keeps the draft if persistence fails and only closes after success.
- `src/components/NotificationDropdown.tsx`: displays ISO/server timestamps in readable Arabic relative time.
- Bookmark toggle now waits for the Firestore result and accurately reports local-only status on failure rather than claiming cloud sync prematurely.

### Verification
- Full GitHub Actions CI for `edfae2b89600abc2aa249c211114a2ff60797e1f` passed: https://github.com/ifawz40-boop/HUKM/actions/runs/42172633996
  - Test suite: PASS
  - TypeScript: PASS
  - Vite production build: PASS
- Firestore production rules are not yet deployed; the live two-account broadcast test is still pending. This is a code/CI verification, not a production database claim.
- Follow-up identified: a failed per-user bookmark cloud write is not yet replayed after reload because auth bootstrap still merges guest + cloud state and overwrites the per-user cache. Add a pending per-user desired bookmark record and clear only after confirmed upload in Phase 4.

### Current static-library sync
- The sync run `42171611705` was still running for several minutes against the old 18-attempt timeout policy. A newer bounded-retry script commit `e8d9a04518b8ceb564f204d7d9a06493bd895d13` reduced attempts to 5 and per-request timeout to 20 seconds; its workflow run `42172530466` is queued/in progress behind the older run. Check both. Do not treat the older run's generated data as current if it commits; re-run with the latest script.
- Latest code commit at this checkpoint update is documentation-only `e3356e9f4fa0e5f3456a8027d775dcaa96811490`; run the latest CI and re-fetch main before more edits.
