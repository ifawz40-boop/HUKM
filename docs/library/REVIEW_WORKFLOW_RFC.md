# HUKM Library Review Workflow — Architecture RFC

**Status:** Design approved for staged implementation; no review write endpoint or status-changing UI is enabled yet.  
**Date:** 2026-11-06  
**Baseline:** `main` at `d2596bfbeb4ceff76f4b6459ebf0e446b7e978f3`

## 1. Non-negotiable editorial and publication boundary

The library has two independent review dimensions:

1. **Editorial review:** author/method, complete text, edition, content, citations, and category suitability.
2. **Rights clearance:** documented permission or a defensible public-domain determination for the exact digital asset/edition and intended use.

An editorial approval is not a rights approval. Rights clearance is not an editorial approval. Neither one alone makes a book public.

The public catalogue remains controlled by the versioned `src/data/library/curation.json` allowlist in Git. A Firestore review record must never publish a book, mutate `approvedBookIds`, change candidate JSON, or bypass the existing build/deployment gate.

A candidate is public-eligible only when:
- its current editorial state is `approved`;
- its current rights state is `cleared` or `public_domain_verified`;
- both review snapshots match the current candidate fingerprint and editorial policy version; and
- the candidate ID is explicitly added to `approvedBookIds` through a reviewed Git PR.

## 2. Durable data model

Use separate projections and one append-only event collection:

### `libraryEditorialStates/{candidateId}`
- `candidateId`
- `status`: `pending | in_review | changes_requested | approved | rejected`
- `version` (monotonically increasing integer)
- `candidateFingerprint` (SHA-256 of canonical candidate metadata)
- `policyVersion`
- `lastEventId`
- `lastReviewedBy` (Firebase UID from verified token)
- `lastReviewedAt` (Firestore server timestamp)

### `libraryRightsStates/{candidateId}`
- `candidateId`
- `status`: `unknown | permission_requested | cleared | public_domain_verified | restricted`
- `version`
- `candidateFingerprint`
- `policyVersion`
- `lastEventId`
- `lastReviewedBy`
- `lastReviewedAt`

### `libraryReviewEvents/{eventId}` (append-only)
- `candidateId`, `dimension` (`editorial | rights`)
- `fromStatus`, `toStatus`
- `note` (plain text, max 3,000 characters)
- `evidenceReferences` (0–10 HTTPS URLs; no embedded credentials)
- `reviewerUid` (from the verified ID token; never accepted from the request body)
- `reviewerRole` (server-derived)
- `candidateFingerprint`, `policyVersion`
- `createdAt` (Firestore server timestamp; never client supplied)
- `idempotencyKey` (unique per caller/candidate operation)

The event collection is the audit source of truth. State documents are rebuildable projections and must be updated in the same Firestore transaction as the event.

## 3. Authorization and privacy

- Initial write and read access is **verified owner only**, using the existing `authenticateToken` and `requireOwnerRole` middleware. Do not infer authority from email addresses or client UI flags.
- Existing ADMIN permission `canEditBooks` does not automatically grant editorial-review authority. Add a dedicated, server-verified library-review permission only in a separately reviewed change.
- All Firestore client reads and writes for these collections are denied. Access goes through the authenticated server API using Firebase Admin SDK.
- No public route exposes reviewer notes, evidence, or review history.
- Do not store reviewer email, private credentials, or full copyrighted text. Store the Firebase UID and source/evidence references only.
- Events are create-only from the API. There is no update/delete endpoint. Corrections are new events.

## 4. API contract (future implementation)

- `GET /api/library/reviews` — owner-only list of current editorial and rights projections.
- `GET /api/library/reviews/:candidateId` — owner-only projection and event history for one candidate.
- `POST /api/library/reviews/:candidateId/events` — owner-only append operation with `dimension`, `targetStatus`, `note`, `evidenceReferences`, `expectedVersion`, and an `Idempotency-Key` header.
- No client-supplied reviewer UID, role, timestamps, current status, candidate title, or policy version is trusted.
- Validate candidate ID against the current bundled `candidates.json`; reject unknown IDs.
- Compute candidate fingerprint and policy version on the server.
- Use a Firestore transaction: read current state, verify `expectedVersion`, validate the transition, create the immutable event, and update the dimension-specific projection atomically.
- Repeated idempotency keys return the original result and must not append duplicate events.
- No API route may update `curation.json`, candidate status, or public catalogue data.

## 5. State transitions

### Editorial
- `pending -> in_review`
- `in_review -> approved | rejected | changes_requested`
- `changes_requested -> in_review | rejected`
- `approved | rejected -> in_review` only as an explicit reopen with a substantial explanation and new evidence.

Any terminal editorial decision requires a meaningful note and at least one evidence reference. Reopening requires a reason.

### Rights
- `unknown -> permission_requested | cleared | public_domain_verified | restricted`
- `permission_requested -> unknown | cleared | restricted`
- `cleared | public_domain_verified -> permission_requested | restricted` only with an explanation and new evidence.
- `restricted -> permission_requested | cleared | public_domain_verified` only with new evidence and an explanation.

A `cleared` or `public_domain_verified` decision must include evidence for the exact edition/asset and the intended distribution/use. A general statement about an author or a different copy is insufficient.

## 6. Staleness and policy changes

Compute a canonical SHA-256 fingerprint from bibliographic fields that materially identify the candidate: title, author, category, source URL, edition, publisher, publication year, printed/scan page counts, and review report URL.

If the fingerprint or policy version changes, the prior state is stale. Do not treat an earlier approval as current. Require a new review cycle and retain the old events for audit.

## 7. Firestore rules and transaction safety

- Add explicit deny rules for `libraryEditorialStates`, `libraryRightsStates`, and `libraryReviewEvents` (the existing default-deny catch-all remains).
- Firebase Admin SDK writes bypass Firestore rules; therefore API middleware and server validation are mandatory.
- Use server timestamps, optimistic version checks, and idempotency keys.
- Do not use client-side writes or localStorage as the authority for editorial decisions.
- Add emulator-backed security tests before enabling the API. If the emulator cannot run in CI, add a documented, reproducible test job before release.
- The manual browser/device plan for the existing read-only curation dialog is tracked separately in `docs/qa/curation-dialog-manual-accessibility.md`; static tests do not satisfy that manual QA gate.

## 8. Implementation stages and release gates

1. Pure transition/validation helpers and unit tests (this PR).
2. Server-side repository/API with dependency injection, owner-only middleware, transactions, idempotency, and failure-injection tests.
3. Firestore explicit-deny rules and emulator security tests.
4. Read-only owner UI showing both dimensions and immutable event history.
5. Separate owner actions for editorial decisions and rights decisions, with evidence and confirmation.
6. Manual review of actual candidate content and exact rights evidence.
7. A separate Git PR to add a fully reviewed and rights-cleared book ID to the public allowlist.

Until stages 2–6 are complete, the existing curation panel remains read-only and no status-changing control is added.
