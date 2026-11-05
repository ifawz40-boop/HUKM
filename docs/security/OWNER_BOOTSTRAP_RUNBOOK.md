# HUKM — First Owner Provisioning Runbook

## Purpose and authority

The first owner is provisioned only by the local operator CLI at `scripts/bootstrap-owner.ts`.
The public HTTP `/api/auth/bootstrap` endpoint remains disabled. Browser-side email matching is never an authorization mechanism.

The first owner is the founder account. The founder record is protected from the normal revoke-owner workflow. Additional owners may be granted later only by the original founder (`isFounder: true`) through the owner-only management panel and the server-side `POST /api/auth/grant-owner` route. Other owners cannot appoint further owners.

## Preconditions

1. The target account already exists in Firebase Authentication.
2. Its Firebase Auth `emailVerified` flag is true.
3. The operator is working from the repository's current `main` branch.
4. The operator has a local Firebase Admin credential with access to the configured Firebase project and named Firestore database.
5. The operator has independently checked the project and database IDs printed by the script.

The script deliberately refuses to:
- run against a different project/database;
- replace an existing `_system/bootstrap` state it does not recognize;
- take over a pending reservation created for another UID;
- overwrite an existing `admins/{uid}` document;
- proceed if any owner registry record already exists during first-owner setup;
- promote an account that already has an admin/owner or unknown role claim, except the same UID during a valid pending recovery.

## Deploy the hardened Firestore rules

The committed `firestore.rules` now denies all browser/client writes to `/admins/{uid}`. Role registry mutations must go through the trusted Firebase Admin SDK API or the local first-owner bootstrap. This prevents an additional owner from changing their own `isFounder` field.

**Important database-target correction:** the server, bootstrap CLI and verifier all use the named Firestore database `ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96`, not `(default)`. The root `firebase.json` now explicitly binds `firestore.rules` to that exact database ID. Do not remove the `database` property or deploy these rules against `(default)` by assumption.

After pulling the latest `main`, deploy the configured Firestore database rules separately (Vercel deployment does not deploy Firestore rules):

```powershell
firebase deploy --only firestore --project gen-lang-client-0492732633
```

Run this from the repository root with the Firebase CLI installed and an authorized Firebase account selected. Before confirming, check the CLI output names the database `ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96`. If it names `(default)`, stop; do not proceed. Confirm the release in Firebase Console / Google Cloud Firestore rules for the same named database. Do not assume the repository change is active in production until deployment succeeds.

## Local execution (Windows PowerShell)

Open a terminal in the repository root after pulling the latest `main`.

Use a Firebase Admin service-account credential file stored outside the repository. Do not upload it to GitHub, Google AI Studio, Vercel, or this chat.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure\firebase-admin.json"
$env:OWNER_EMAIL = "the-verified-account@example.com"
$env:BOOTSTRAP_CONFIRMATION = "HUKM_INITIAL_OWNER"

bun install --frozen-lockfile
bun run owner:bootstrap
bun run owner:verify
```

If dependencies are already installed from the lockfile, the install step may be skipped. The credential must belong to the intended Firebase project and have only the IAM permissions required to read/update Firebase Authentication users and read/write the HUKM Firestore database. Do not grant broad project Owner access just for this script.

The script uses the project and database IDs in the source configuration. Optional `FIREBASE_PROJECT_ID` or `FIREBASE_DATABASE_ID` overrides are accepted only when they exactly match those configured IDs.

## Expected success

The script prints a success confirmation only after all of these have completed:
- verified Firebase Auth user lookup;
- atomic reservation of the initial bootstrap lock;
- assignment of the `role: owner` custom claim;
- refresh-token revocation;
- atomic creation of `admins/{uid}` and transition of `_system/bootstrap` to `completed`.

Then run the read-only verifier above. It checks Firebase Auth custom claims and the exact Firestore bootstrap/owner registry fields without changing data.

After the verifier reports all checks as PASS:
1. Sign out of HUKM in the browser.
2. Sign back in using the same verified Google account.
3. Confirm the owner-only management panel appears.
4. Confirm `/api/auth/my-claims` reports `role: owner` for the freshly authenticated session.
5. Confirm the matching `admins/{uid}` document has `role: owner` and `isFounder: true`, and `_system/bootstrap` is `completed`.

Do not mark provisioning complete based on a UI screenshot alone; the claim and Firestore registry must agree.

## Failure and recovery

- If the account is missing, register/sign in first, verify the email, then rerun.
- If the email is not verified, verify it in Firebase Authentication before rerunning.
- If the script reports a pending reservation for the same UID, rerun with the same verified account and same project/database after correcting the credential/network issue.
- If it reports a different UID, an existing owner/admin record, an unknown lock state, or a completed bootstrap, stop. Do not delete Firestore documents or edit custom claims manually to bypass the guard.
- If the script reports that automatic rollback failed, stop and inspect both Firebase Authentication custom claims and the Firestore `admins` / `_system/bootstrap` records before any retry.
- The read-only verifier returns a non-zero exit code if any of the required Auth/Firestore facts disagree. Do not manually edit production records just to make the verifier pass.

## Adding another owner later

Only the verified founder account can use the owner management panel's **إضافة مالك آخر للمنصة** form. The backend independently checks the caller's `admins/{uid}.isFounder === true` record; an additional owner receives HTTP 403. The backend resolves the target by email, requires an existing verified Firebase Auth account, rejects self-promotion and already-privileged accounts, creates a non-founder owner registry record, grants the custom claim, and revokes refresh tokens. On a failure it attempts to roll back both the registry and claims.

Only the founder record (`isFounder: true`) is protected from the ordinary owner-revocation endpoint. Additional owners are explicitly non-founder and can be removed by an authorized owner, but cannot appoint replacements.

## Explicitly out of scope

This runbook does not store credentials, execute a production bootstrap, alter Firebase production data from GitHub, or prove Vercel deployment / Google AI Studio synchronization. Those require separate observable confirmation.


## Legacy library cleanup after static catalogue migration

The public-domain book catalogue is now intended to be bundled from repository files and must not be fetched from Firestore. After the updated application is deployed, sign in using the original founder account and open the library page.

1. The founder-only control **تنظيف بيانات المكتبة القديمة** appears while the one-time cleanup marker is not completed.
2. Review the listed collections carefully.
3. Type exactly `DELETE_ALL_LEGACY_LIBRARY_DATA` and submit.
4. The server independently verifies the Firebase ID token, verified owner role, and `admins/{uid}.isFounder === true` before deleting anything.
5. The server deletes only top-level documents in `books`, `bookDraftChapters`, and `categories`, in bounded batches. It writes an audit marker to `_system/legacyLibraryPurge` and reports exact deletion counts.
6. The operation is one-time and idempotent. A completed marker blocks a second run. A failed run records partial counts and can be retried by the founder after checking the response.

**Preserved deliberately:** user profiles, Firebase Auth accounts, admin/founder registry, bootstrap state, user bookmarks, reading progress, reader annotations, notifications, subscriber records and email logs. Old bookmark/progress references to removed book IDs may no longer resolve; the static catalogue does not migrate or erase user reading history.

This cleanup endpoint is an Admin SDK server action and is unaffected by client Firestore rules. Do not run a manual collection delete or delete the `_system/legacyLibraryPurge` marker.

## Static Arabic library source and licensing

The static catalogue is built from [Bayanat Labs — Open Arabic Books](https://huggingface.co/datasets/Bayanat-Labs/open-arabic-books), version 0.1.0, pinned to revision `39876c0e7f28c2d16887c7c139800e0df9f87263`. The dataset contains 1,545 complete Arabic books from Hindawi Foundation, with separate metadata and chapter records, footnotes, source hashes and per-book colophon statements.

HUKM's initial selection is intentionally narrower than the upstream corpus. It accepts one of two per-book rights paths: (1) the Arabic translation is explicitly covered by CC BY 4.0 in the exact colophon and the original is public domain; or (2) the original is marked public domain and the available contributor death-year evidence passes a conservative life-plus-70 screen (death by 1955 for the 2026 snapshot). The second path is a screening heuristic, not a legal opinion; unknown or incomplete contributor records must fail closed. Both paths also require source URL, attribution, SHA-256, minimum word count and chapter count, and extracted chapter text meeting the configured completeness threshold.

The full text is stored in one JSON file per book under `src/data/library/books/`. The lightweight `catalog.json` contains metadata only. Vite lazy-loads each full-text file only when a reader opens that book. The deployed site does not fetch book text from Firebase, Hugging Face or another external API at runtime.

Each book file retains its author/translator/editor credits, publisher URL, source hash, exact colophon quotation, attribution statement, source dataset revision and omitted-image/SVG/table counts. The reader displays the per-book license and attribution and preserves footnotes. The dataset omits some non-text images/SVGs; this is disclosed and counted, so the app must not claim that visual elements were reproduced.

The upstream dataset explains that its 1,212 public-domain-original books often have CC BY 4.0 only on the design, not on the text, while 332 translations explicitly license the Arabic translation; 169 public-domain books were retained after an author-death-year check, and many authors remain unmatched. HUKM therefore records the rights path on every book and does not treat the dataset-level CC BY 4.0 as a blanket license for all text. Copyright terms differ by jurisdiction. The conservative life+70 path is only a triage rule; have counsel review any commercial redistribution or uncertain case. Exclude records with ambiguous or reserved rights.

To refresh the curated corpus, edit `src/data/library/manifest.json` and push to `main`. The workflow `.github/workflows/sync-public-library.yml` pages through metadata, chooses a balanced category subset, fetches complete chapter rows, validates the text and rights, and commits both the metadata catalogue and individual full-text JSON files. Inspect the workflow log, generated `NOTICE.md`, source hashes and inventory before treating the sync as successful. The workflow requires repository Actions permission to push with `GITHUB_TOKEN`.
