> [!WARNING]
> **Historical checkpoint — superseded on 2026-11-06.** This document records an earlier state around 05:00 UTC when the static catalogue was empty and the 15-book deployment gate was still blocking publication. That is no longer the current library state: `main` now contains 24 catalogue records and the previously audited 24-book full-text batch. Do not follow the old empty-library diagnosis or treat the historical workflow-run IDs below as current.
>
> **Read these current records first:** [HUKM_DEVELOPMENT_LOG.md](../../HUKM_DEVELOPMENT_LOG.md) and [HUKM_NEXT_TASK.md](../../HUKM_NEXT_TASK.md). At the latest verified checkpoint, `main` was at `feae1b40674f58b2117372ee47f68424c4de85ca`; the exact-head CI result remained unverified, and Vercel's status still pointed to a `build-rate-limit` failure. `deploy/vercel-preparation` was heavily diverged (71 ahead / 146 behind) and must not be merged wholesale.
>
> The material below is retained as historical context only.

# HUKM MEDIA — Continuation checkpoint

**Checkpoint date:** 2026-11-06  
**Repository:** `ifawz40-boop/HUKM`  
**Production / Google AI Studio branch:** `main`  
**Preparation branch:** `deploy/vercel-preparation`

This file is the hand-off point for the next development session. Read it before making further repository changes.

## Current verified main state

- Latest main commit at checkpoint: `10de8ac98f57f2d52403a8da47b0cbcf9314d382`.
- Latest main verification run: `42165447508` — **success**.
- The run completed the test suite, TypeScript check and Vite production build.
- Main contains the first deployment-preparation checkpoint, the static-library attribution URL fix, the Vercel deployment gate, executable gate tests and the updated deployment guide.
- A backup branch exists: `backup/main-after-deployment-gate-2026-11-06`.

## Critical publish blocker: static book library

The full-text library is **not ready yet**.

- `src/data/library/catalog.json` was still empty at the last inspection.
- `src/data/library/books/` contained only `.gitkeep`.
- The deployment manifest requires at least 15 complete books.
- Vercel's `buildCommand` now runs `node scripts/assert-library-ready.mjs && bun run build`.
- The gate checks the minimum count, catalogue/file parity, complete chapter content, per-book rights path, source URL, pinned history URL, source hash, licence quotation and attribution.
- Executable tests prove that an empty library fails the gate and a valid rights-screened fixture passes it.

Do not remove, bypass or weaken this gate to obtain a green deployment.

## Active GitHub Actions runs at checkpoint

These IDs are historical references; always refresh their status before acting.

| Run | Branch | Purpose | Last observed state |
|---|---|---|---|
| `42164904642` | `main` | Sync rights-cleared full Arabic books | In progress |
| `42162768199` | `deploy/vercel-preparation` | Sync rights-cleared full Arabic books | In progress |
| `42165539316` | `deploy/vercel-preparation` | Tests, typecheck and build | Failed intentionally: 0 full-text books, below the 15-book minimum |

The sync workflow commits generated files only after its own source, rights and completeness checks, and rebases the generated commit onto the latest triggering branch. After a sync commit, inspect the new CI run and require all tests, typecheck and build to pass.

## Preparation branch integration

The preparation branch contains additional improvements not yet merged to main, including:
- Gmail SMTP provider with Resend fallback and related tests.
- Server-side Firebase Admin credential handling and owner-claim hardening.
- Ban-state synchronization and moderation reliability changes.
- Pinned dataset-revision verification and stricter static-library checks.
- The library sync workflow and generated-book pipeline.

The preparation branch has been updated to include the latest main deployment gate, gate tests and deployment documentation. Before opening the final integration PR:
1. Recheck the current main and preparation branch heads.
2. Compare the actual contents of `vercel.json`, `tests/staticLibrary.test.ts`, `scripts/assert-library-ready.mjs` and `docs/deployment/VERCEL_PREDEPLOYMENT.md`; do not let the preparation branch remove or weaken the main deployment gate.
3. Confirm the generated book files exist on the preparation branch and the strict minimum-book test passes.
4. Require a green full CI run on the exact PR head before merging to main.

## Vercel and Firebase are not yet deployed

- The user stated that Google AI Studio is connected to `main`; no Vercel deployment has been performed in this workflow.
- The Vercel GitHub check has reported `build-rate-limit`; this is an external Vercel quota/status issue, not a failed GitHub build.
- The Vercel deployment guide documents the required settings and environment variables.
- Do not claim Firebase rules were deployed, the first owner was bootstrapped, Gmail SMTP was tested in production, or a Vercel Preview/Production deployment was completed. Those actions have not been verified.
- The user must add secrets directly in the target deployment environment; never request or commit the Gmail App Password or Firebase service-account JSON.

## Next actions

1. Refresh the two active library-sync runs. If one fails, inspect its completed job logs and fix the exact cause; do not guess.
2. Confirm at least 15 full books were generated and each passed the rights, source-hash, attribution, chapter and word-count checks.
3. Run the complete verification workflow on the generated-data commit.
4. Reconcile the preparation branch with current main, open the final PR and merge only after its exact head is green.
5. Confirm the latest main commit and its CI status, then re-run/verify the Vercel deployment gate against the real generated library.
6. Only after the repository is ready, proceed with the user's explicit deployment steps and production smoke tests.

**Stop condition:** if the library sync has not produced the minimum verified books, the project is not publish-ready. Keep the deployment gate enabled and leave the unfinished work on the preparation branch.
