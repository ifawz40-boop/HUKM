# HUKM MEDIA — Vercel pre-deployment guide

This repository is a Vite + React application with a separate Express API entrypoint at `api/index.ts`.
The production branch remains `main`. The preparation work is performed on `deploy/vercel-preparation`.

## Vercel project settings

- Git repository: `ifawz40-boop/HUKM`
- Production branch: `main` (do not change this during the preparation phase)
- The preparation branch `deploy/vercel-preparation` is isolated from Google AI Studio's `main`; use it for a Preview deployment before any merge to Production
- Root directory: repository root
- Framework preset: Vite
- Install command: `bun install --frozen-lockfile` (or Vercel's Bun auto-detected install command)
- Build command: `bun run build`
- Output directory: `dist`
- Node.js runtime: use the current Vercel default supported Node.js runtime for the API function
- API function max duration: 60 seconds (already pinned in `vercel.json`) to allow the awaited SMTP send path to finish

The existing `vercel.json` routes `/api/*` to `api/index.ts` and sends the remaining application routes to `index.html`. Keep API routing ahead of the SPA fallback.

## Environment variables

Add secrets only in **Vercel → Project → Settings → Environment Variables**. Apply backend secrets to both Preview and Production only when those environments are intended to access the same Firebase project.

### Required for Firebase Admin API routes

`FIREBASE_SERVICE_ACCOUNT_JSON`

- Value: the complete JSON document for a Google Cloud service account.
- Project must be exactly `gen-lang-client-0492732633`.
- The account needs only the IAM permissions required by the server routes: Firebase Authentication user/claims operations and read/write access to the HUKM Firestore database.
- Keep this value server-side. Never prefix it with `VITE_`, commit it, paste it into source files, or send it in chat.
- The application also pins Firestore database ID `ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96`; do not substitute the default database.

The server uses Application Default Credentials in AI Studio/Cloud Run, and this variable on Vercel. If Vercel is missing the variable or the JSON targets another project, Admin SDK initialization fails closed rather than silently using another Firebase project.

### Email sender — Gmail SMTP first, Resend fallback

The server now supports Gmail SMTP through Nodemailer and keeps Resend as an optional fallback.

**Preferred Gmail settings:**

- `GMAIL_USER`: the sending Gmail address (for this project, `hukm.contact@gmail.com`).
- `GMAIL_APP_PASSWORD`: the Google App Password generated for that account. Enter it only in Vercel's encrypted Environment Variables. The code removes display spaces automatically.
- The visible sender name is `HUKM MEDIA`; replies are directed to the Gmail account.

When either Gmail variable is present, Gmail is treated as the intended provider. A partial Gmail configuration fails closed and does not silently fall back to Resend.

**Optional Resend fallback** (used only when Gmail variables are absent):

- `RESEND_API_KEY`
- `EMAIL_FROM` (must be a sender address verified by the Resend account)

Never put an App Password in `RESEND_API_KEY`, GitHub, source code, or a `VITE_` variable. Do not send it in chat.

Vercel permits outbound SMTP connections except port 25, although its guidance recommends a specialist email API for reliability and scale. Gmail SMTP uses port 465 here. A personal Gmail account is suitable only for low-volume early testing; it is not a bulk newsletter service and may impose sending limits or spam protections. Keep batches small and verify real delivery before enabling broadcasts.

**Firebase Authentication emails are separate.** Account verification and password-reset messages are sent by Firebase Authentication through `sendEmailVerification` and `sendPasswordResetEmail`; this Gmail SMTP integration changes the site's own email/broadcast API only. If those Firebase Auth messages must also use a branded sender, configure Firebase Authentication's email templates / a supported custom SMTP integration separately.

### Client Firebase configuration

The browser Firebase configuration is read from `firebase-applet-config.json`. Its API key is a Firebase client identifier, not an Admin service-account credential. Firebase Authentication still requires the final Vercel hostname to be added to the Firebase Authentication authorized domains, and Google OAuth settings may also need the same hostname.

## Firebase production operations are separate

Deploying the website does not deploy Firestore security rules or provision the first owner.

The repository is pinned to the named database above. Before any production rules deployment, verify the Firebase project and confirm the CLI output names this exact database—not `(default)`. Follow `docs/security/OWNER_BOOTSTRAP_RUNBOOK.md`. The owner bootstrap is a separate, explicit, one-time operation; do not run it as part of a Vercel build or deployment.

The owner-only legacy-library cleanup is also a separate post-deployment operation. It must not be executed automatically by Vercel.

## Pre-production smoke tests

After a Preview deployment is available:

1. Open `/api/health` and confirm a JSON `status: ok` response.
2. Confirm the home page and a nested SPA route load directly.
3. Test Firebase sign-in and sign-out using the Preview hostname.
4. Test a harmless authenticated API read.
5. Confirm unauthorized users cannot access owner/admin endpoints.
6. Confirm the email status endpoint accurately reports whether the configured provider is ready.
7. Review Vercel function logs for missing environment variables or Firebase credential errors.

Do not promote a Preview deployment to Production until the live Firebase hostname configuration, server credentials, admin authorization, and email provider have been verified.
