# HUKM MEDIA — Vercel pre-deployment guide

This repository is a Vite + React application with a separate Express API entrypoint at `api/index.ts`.
The production branch remains `main`. The preparation work is performed on `deploy/vercel-preparation`.

## Vercel project settings

- Git repository: `ifawz40-boop/HUKM`
- Production branch: `main` (do not change this during the preparation phase)
- Root directory: repository root
- Framework preset: Vite
- Install command: `bun install --frozen-lockfile` (or Vercel's Bun auto-detected install command)
- Build command: `bun run build`
- Output directory: `dist`
- Node.js runtime: use the current Vercel default supported Node.js runtime for the API function

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

### Current email sender

The current `src/server/emailApi.ts` implementation still uses Resend and therefore expects:

- `RESEND_API_KEY`
- `EMAIL_FROM` (must be a sender address verified by the Resend account)

A Gmail App Password is **not** a Resend API key and will not work in `RESEND_API_KEY`. Gmail SMTP migration is a separate code change and must be completed before expecting the site to send through `hukm.contact@gmail.com`.

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
