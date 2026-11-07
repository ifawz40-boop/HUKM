# HUKM MEDIA — Production Readiness Audit

Date: 2026-11-06  
Repository: `ifawz40-boop/HUKM`  
Baseline `main`: `fae1ff976a4f3b941ba3f8eb04b435b8f63cb9ed`  
Audit branch: `release/production-readiness-audit`  
Audit scope: repository-backed source review and changes in this PR. This is not a live production certification.

## Changes in this audit

1. Keep all four editorial category paths visible even while the approved public catalogue is empty. Previously the app derived visible categories from existing public books, so zero approved books also hid the categories and left the authoring default without an allowed category.
2. Replace the zero-valued hero counters with a clear editorial-curation notice while there are no approved books.
3. Align the landing, sign-in and HTML metadata copy with HUKM's knowledge/research identity instead of the retired novel-platform wording.
4. Remove client-local ban caches as a sign-in authority. A local cache can be stale and user-editable.
5. Make account authentication fail closed when the server-side `/api/auth/account-status` check is unavailable, malformed or unsuccessful: the app does not commit the user profile, invalidates the session, attempts sign-out and leaves guest browsing available.
6. Remove direct `setCurrentUser` updates from sign-in success callbacks. The auth-state listener now commits the authenticated profile only after the server moderation check completes.
7. Add regression assertions for empty-catalogue category presentation, HUKM copy and fail-closed moderation verification.

## Verified repository facts at audit start

- `main` HEAD: `fae1ff976a4f3b941ba3f8eb04b435b8f63cb9ed`.
- Latest main GitHub Actions run #42254352828 passed: test suite, Firestore review-rules emulator tests, TypeScript and production build.
- Vercel status on that exact main SHA is `failure` with target `build-rate-limit`; no production deployment is confirmed.
- `vercel.json` retains `git.deploymentEnabled: {"*": false, "main": true}`.
- Public text catalogue `src/data/library/catalog.json` is empty; `approvedBookIds` is empty; no static PDF items are approved.
- `scripts/assert-library-ready.mjs` currently permits the explicitly configured empty-curation mode (`allowEmptyDuringCuration: true`). A Vercel build may therefore publish an empty library once the provider quota allows it; the visible UI must be honest about this state.
- `BookWriterStudio.tsx` exists as a component but is not imported or mounted by `src/App.tsx`; do not assume a production authoring route is available.
- `api/index.ts` mounts auth, email and health routes. The editorial review API remains intentionally unmounted.
- Firebase production rules deployment, first-owner bootstrap, Vercel environment values, Firebase authorized domains/Google OAuth, Gmail delivery and Google AI Studio synchronization cannot be verified from repository source alone.

## Production blockers — not marked complete

### Content and editorial readiness
- 0 approved public books and 0 approved PDF scans.
- Do not publish any of the 28 candidate records without full-text, author/methodology, edition, context and rights review.
- The public catalogue currently explains that editorial selection is in progress; this is transparent but is not a complete reading-library launch.

### Deployment and operations
- Vercel latest-main check: `build-rate-limit`; no production deployment is confirmed.
- Verify the Vercel project settings and server-side environment variables independently. Required backend configuration includes `FIREBASE_SERVICE_ACCOUNT_JSON`; Gmail delivery requires both `GMAIL_USER` and `GMAIL_APP_PASSWORD` (or a fully configured Resend fallback).
- Verify the deployed hostname is authorized in Firebase Authentication and Google OAuth.
- Confirm Firestore rules are deployed to the exact named database configured in `firebase.json`, not the default database.
- Verify the founder owner bootstrap state using the read-only owner verifier before relying on owner-only functions.
- Confirm Google AI Studio is connected to `main`.

### Live QA required
- Public landing, direct SPA routes, responsive layouts and empty-library behavior on mobile/tablet/desktop.
- Guest browsing and search with an empty catalogue.
- Email/password registration, verification, sign-in, reset and sign-out.
- Google popup and redirect sign-in on the production hostname.
- Server moderation API availability and fail-closed behavior during API errors.
- Owner/admin authorization, admin request workflow and unauthorized API denial.
- Reader progress, bookmarks, notes and cross-device sync once approved content exists.
- PDF reader with a real, rights-cleared PDF fixture; current public PDF catalogue is empty.
- Email status and one controlled real delivery to an address owned by the operator; no broadcast test.
- Keyboard, screen-reader and touch QA for dialogs, navigation and reader controls.
- Vercel function logs and `/api/health` on the actual deployment.

## Release rule

Do not describe HUKM as fully ready or production-deployed until the content decision, Vercel deployment, Firebase/owner setup and live smoke tests above are verified. Do not manually deploy, alter Vercel project settings, deploy Firestore rules or run owner bootstrap as part of this code PR.

## Next actions

1. Run exact-head GitHub CI for this PR; inspect tests, TypeScript and production build.
2. Re-review the complete diff and correct any failures before merge.
3. Independently resolve the Vercel deployment quota; verify the production alias only after an actual deployment exists.
4. Complete Firebase/owner/environment setup using the operator-controlled runbooks, without sharing secrets in chat.
5. Decide whether production must be gated on at least one fully approved book or whether a deliberately empty public shell is acceptable for a soft launch.
6. Continue full-text editorial review of existing candidates; do not lower the book policy to increase count.
