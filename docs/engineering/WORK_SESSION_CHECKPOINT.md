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
