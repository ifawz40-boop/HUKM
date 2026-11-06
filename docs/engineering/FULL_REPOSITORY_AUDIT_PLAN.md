# HUKM — Full Repository Audit and Completion Plan

**Repository:** `ifawz40-boop/HUKM`  
**Production branch:** `main`  
**Audit started:** 2026-11-06  
**Working rule:** Every substantial phase is committed directly to `main` only after two independent checks. Never force-push, rewrite history, or merge a branch wholesale without reviewing its actual file diff.

## Audit principles

1. Treat `main` as the only production source of truth. Re-fetch its head before every write.
2. Read the whole repository tree and inspect source/config/test/docs files by subsystem. Binary assets are inventoried by type/size and inspected only when they affect UI or runtime.
3. Reuse proven patterns from mature open-source projects only after checking license, maintenance, architecture fit, and security. Do not copy a whole application or introduce unnecessary dependencies.
4. The public book catalogue and all public book text must be static repository assets. No book or chapter content should be fetched from or written to Firebase at runtime.
5. Keep user-owned data separate: Auth, bookmarks, reading progress, notes, and account state may use Firebase; local guest data must remain partitioned and must never leak across signed-in accounts.
6. A UI success message must only appear after the underlying operation actually succeeds.
7. For every phase: (a) inspect, (b) implement, (c) run focused tests, (d) run full CI/typecheck/build, (e) independently review the diff and rerun the relevant check, (f) commit to `main`, (g) verify the resulting commit and Actions status, (h) update this checkpoint.
8. Do not claim a production Firebase or Vercel change from a GitHub code commit alone.

## Repository inventory and branch review

At the first inventory, recursive Git tree returned 155 entries with no truncation. It includes React/Vite app, Express API, Firebase client/server, security rules, 15+ UI components, test suite, static-library source pipeline, deployment workflows and AI Studio artifacts.

Branches reviewed against `main`:
- Backups: `backup/main-after-deployment-gate-2026-11-06`, `backup/pre-vercel-2026-11-06`.
- Source investigation: `debug/snd-source-access`.
- Deployment work: `deploy/vercel-preparation`, `deploy/verified-stage-1`.
- Docs: `docs/deployment-checkpoint`, `docs/vercel-gate`.
- Fixes: `fix/deployment-library-gate`, `fix/library-sync-notice`, `fix/phase-1-critical-integrity`, `fix/pinned-library-source-main`.
- Tests: `test/actual-library-gate`, `test/deployment-gate-execution`.

The large deployment branch has many commits ahead but its inspected key files (`src/App.tsx`, email API/provider, Firebase Admin, moderation tracker and `vercel.json`) match `main`; do not merge it wholesale. The pinned-library branch contains the earlier malformed absolute URL implementation and must not replace the current fix. The deployment-gate branch has an older gate and a less robust test harness; main is newer. The SND investigation branch contains a source-access workflow only. It successfully verified a public mirror of the 1,745-book Arabic E-Book Corpus, but that corpus metadata alone does not establish each book's redistribution rights; do not substitute it for the per-book rights-screened Hindawi source.

## Findings confirmed so far

### P0 — Public static book library is not yet populated
- `src/data/library/catalog.json` is currently `[]`.
- `src/data/library/books/` contains only `.gitkeep`; there are no full-text book JSON files.
- The Vercel build command deliberately runs `scripts/assert-library-ready.mjs`, which refuses to deploy until at least the manifest minimum of complete, rights-screened books is present.
- Previous library sync failed because the source-revision preflight passed a full Hugging Face URL to a helper that always prepended the Dataset Viewer host. This produced an invalid URL/404.
- Fixed URL construction in `scripts/sync-public-library.mjs` using explicit absolute-URL handling and added a regression test in `tests/staticLibrary.test.ts`.
- CI run `42170693668` for commit `b551c04c85d04d82679e180adaf1ed7a5ee7d6a0` passed. A new source sync run `42170669881` was still in progress at the last check; inspect its result before assuming the fix worked end-to-end.

### P1 — Announcement UI reports a broadcast that never leaves the browser
- `SendAnnouncementModal.tsx` calls `onSendNotification` synchronously.
- `App.tsx:handleSendAnnouncement` only inserts the notification into local React state and shows “sent to all readers”.
- `authStorage.ts` persists all notifications under one global localStorage key, not a per-user read-state key.
- No Firestore fetch/write is wired for announcements, although Firestore rules contain a public-notification read path.
- This is a confirmed false-success and multi-user isolation defect. Phase 2 must persist announcements to the shared notifications collection (or a verified server API), fetch only public announcements with a query matching the Firestore rule, and keep read/unread state partitioned per user/device. Modal must await success and retain form content on failure.

### P1 — Bookmark cloud-write failures are not recoverable across reload
- The current toggle now waits for Firestore and reports local-only success accurately when cloud sync fails.
- However, the auth bootstrap merges guest bookmarks with cloud bookmarks and overwrites the per-user local cache; it does not yet preserve a pending per-user desired bookmark set. A failed write can therefore be lost after reload/sign-in.
- Phase 4 must add an explicit per-user pending-sync record, replay it before replacing local cache, and clear it only after confirmed cloud persistence.

### P1 — Writer Studio is present but not reachable
- `src/components/BookWriterStudio.tsx`, `BookResearchPanel.tsx`, `NewBookModal.tsx`, and `ManageCategoriesModal.tsx` exist.
- `src/App.tsx` does not import or render `BookWriterStudio`; there is no writer-view branch. The footer maps writer navigation back to home.
- Do not silently reconnect it to Firebase book CRUD. Decide and implement a publishing model compatible with static book files (e.g. validated JSON export/repository publishing workflow) or clearly retire the orphaned path. Keep public books out of Firebase.

### P1 — Client Firebase service still contains legacy book/category CRUD
- `src/firebase/firestoreService.ts` still exposes `fetchBooksFromFirestore`, `saveBookToFirestore`, `deleteBookFromFirestore`, and category CRUD even though the main App now uses `src/data/library`.
- Firestore rules still allow reads/writes on legacy `/books` and category writes. Audit all call sites and tests before removing or denying those paths. The founder-only Admin SDK purge is separate; do not delete production data without the owner-confirmed purge flow.

### P2 — Serverless rate limiting is process-local
- `src/server/requestProtection.ts` uses in-memory per-process counters. It is a useful per-instance safety net, not a globally consistent limiter across Vercel serverless instances. Review practical abuse protection and use an appropriate shared provider/edge control only if justified; avoid claiming global rate limits.

### Existing good foundations to preserve
- Auth roles require verified email, Firebase custom claims and a matching active `admins/{uid}` registry record.
- Owner bootstrap is local/Admin-SDK-only with project/database pins and a read-only verifier.
- Reader progress/bookmarks/annotations have dedicated isolation tests and local recovery.
- API security headers, rate limiting, bounded request handling, email recipient validation, subscriber workflows and draft isolation already have tests.
- Full-text books are designed as separate lazy-loaded JSON modules; catalogue is metadata-only.
- CI runs frozen Bun install, test suite, TypeScript check and Vite production build.

## Phased execution plan

### Phase 1 — Static Arabic library, source integrity and publishing gate
1. Fix and prove the Hugging Face absolute revision preflight request.
2. Run the pinned source sync; inspect metadata row counts, accepted/rejected books and exact failure reasons.
3. Validate per-book rights. Explicit CC BY 4.0 translations may be included only when the book's own colophon covers the Arabic translation and original-text status is supported. A public-domain screen must fail closed for unknown/incomplete rights-relevant credits; never infer a translation's rights from a dataset-level license.
4. Replace automatic “largest books first” selection with a curated, balanced, value-oriented manifest after inspecting actual titles, authors, translators, categories and source dates. Prefer substantial complete works with clear value and provenance; include both original Arabic and properly licensed translations.
5. Generate one complete text JSON per book, metadata-only catalogue, and per-book attribution/rights notice. Remove stale generated files.
6. Validate catalog/file parity, author/title, sections, word count, footnotes, source hashes, attribution, license evidence, duplicate IDs and JSON validity.
7. Confirm full text is lazy-loaded and measure initial JS plus book chunk sizes. No runtime book content requests to Firebase/Hugging Face.
8. Run focused source/gate tests, full CI, independent content audit and CI again; commit generated library and code to main only after passing.
9. Vercel must fail closed until the complete minimum library is committed. Do not weaken the gate to make an empty library deploy.

### Phase 2 — Real multi-user notifications and state isolation
<badge>Implemented in repository; live Firebase behavior still requires production rules deployment and two-account verification.</badge>
1. Public announcements now use Firestore documents, owner-only validated immutable writes, and a real-time listener constrained to `targetRole == 'all'`.
2. Per-user and guest read state is stored under separate local keys; the old global fake welcome/pseudo-broadcast cache is removed.
3. The announcement modal awaits the Firestore write and preserves the draft on failure; success is shown only after a confirmed write.
4. Bookmark toggles now await cloud sync and no longer claim success before Firestore confirms it; pending retry persistence remains Phase 4.
5. Tests cover notification storage isolation, removal of fake defaults, public-read query shape, owner-only immutable publishing, and no shared `read` field.
6. CI run `42172633996` for commit `edfae2b89600abc2aa249c211114a2ff60797e1f` passed the full test suite, TypeScript check and Vite production build. Live Firestore deployment/emulator verification is not yet complete.

### Phase 3 — Complete or retire orphaned publishing/editor features
1. Inventory all routes, buttons and component imports; find every route with no render branch.
2. Review Writer Studio, research panel, chapter draft recovery and category manager.
3. Implement a static publishing workflow compatible with repository-owned JSON and attribution, or remove dead UI safely with documentation.
4. Preserve draft recovery and never reintroduce public book text into Firestore.
5. Test owner/admin/reader visibility and actual action outcomes.

### Phase 4 — Reader experience and user data integrity
1. Audit book open/load races, direct links, chapter navigation, reading-position restore, font/theme settings, search, bookmarks, notes/highlights, progress merge and cross-device sync.
2. Fix stale async load races and missing/invalid deep-link behavior.
3. Verify account switch/logout cannot show another user's bookmarks, notes, reading progress or private moderation details.
4. Test offline/slow network and storage quota failures; preserve local data when cloud sync fails.

### Phase 5 — Admin, auth, email, moderation and API
1. Review every server route, auth middleware, founder/owner/admin checks, request validation, rate limits, and error handling.
2. Verify that all UI buttons correspond to a real backend action; inspect email sender configuration/status, subscribers, logs, announcements, moderation and admin requests.
3. Review Firestore rules against actual client queries and writes; do not make production rules claims without Firebase deployment evidence.
4. Add integration tests for failure cases and multiple roles.

### Phase 6 — UI, accessibility, mobile, performance and deployment
1. Inspect responsive layout, keyboard navigation, focus management, RTL, empty/loading/error states, semantic labels, contrast and screen-reader behavior.
2. Review large components and lazy-loading boundaries; avoid unnecessary dependencies.
3. Validate production build and Vercel deployment gate; inspect Vercel project/deployment status separately from GitHub Actions.
4. Validate Firebase project/database configuration and owner bootstrap separately from code CI.
5. Publish a final verified feature matrix and known limitations.

## Current resume point

- Latest `main` at the beginning of this plan: `b551c04c85d04d82679e180adaf1ed7a5ee7d6a0`.
- CI: https://github.com/ifawz40-boop/HUKM/actions/runs/42170693668 — SUCCESS.
- Static library sync: https://github.com/ifawz40-boop/HUKM/actions/runs/42170669881 — inspect current status; it was still running at last check.
- First next action: inspect sync result/logs, then correct the next exact source/API/schema issue without weakening rights checks.
- Notification implementation commits: `dc420681`, `c7a80420`, `e334a2ec`, `d5e9562a`, `07a1df5d`, `f9d72fcd`, `673ca23f`, `928fe524`, `091baba2`, `168ad837`, `331de1b0`, `695f9202`, `a8c9a3dd`, `edfae2b8`. Latest CI on `edfae2b8`: https://github.com/ifawz40-boop/HUKM/actions/runs/42172633996 — SUCCESS.


## Continuation update — 2026-11-06 07:12 UTC

- The earlier chapter sync failure is confirmed in run `42173326152`: Dataset Viewer chapter requests repeatedly returned HTTP 500 / timeout, leaving 0 books against the minimum 15.
- Main now routes selected-book chapter extraction through the pinned Hugging Face Datasets Parquet stream (`datasets==5.1.0`) and verifies exact section counts plus contiguous indexes. The previous per-book Dataset Viewer chapter `/filter` calls have been removed.
- The streaming extractor stops after all selected books have their expected section counts. The sync workflow installs Python 3.12 before invoking the Node sync script.
- The public catalogue is still empty. The implementation is committed, but latest GitHub Actions tests/typecheck/build and the new sync run are not yet independently verified through the currently available GitHub run interface. Vercel reports a daily deployment API quota failure; no production deployment is confirmed.
- A separate UI reliability batch now prevents false clipboard success, makes book-card reading actions keyboard-accessible, and displays the library word count.
- **Resume first:** verify CI for `d120b8d4e8769c59aaa8bc7f0fbc31ed8a11840f`; inspect the streaming sync run triggered by `9073cbad9297b644ef6baf884f30cbf4c6250eda`; only then curate generated books and continue visual/library work. Full details and exact next actions are in `docs/engineering/WORK_SESSION_CHECKPOINT.md`.
