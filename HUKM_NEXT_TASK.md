# HUKM MEDIA — Exact Next Task

**Current branch:** `main`  
**Previous verified code/data HEAD:** `8368cf9825aeee8847ecc3113dbe9ef3ec39101b`  
**Latest documentation checkpoint commit:** `355957d0db6d6362555eb98d389eccd48d9897a6`  
**Start by re-fetching main. Do not assume either SHA is still HEAD.**

## Immediate task: complete the Arabic Wikisource candidate audit safely

### Step 1 — Find and inspect the actual audit run
- Workflow: `.github/workflows/audit-wikisource-candidates.yml`
- Script: `scripts/audit-wikisource-candidates.py`
- Tests: `tests/test_wikisource_audit.py`
- Dataset: `Bayanat-Labs/arabic-wikisource-pd`
- Config: `works-pd-core`
- Pinned revision: `7f7de3a3e95e3f4e0e29c72588fd73ad2a636ccd`
- Triggering source commits include `07285a3dea8c6dc9658e16f1ebd57aa112106386`, `9612dab17d40d87a30b0d484db18cbd8b5329f21`, `a3d6cfd3701468a768b61826e3049973d88abefe`, `d8e2770f5c4df7ab6d60b72e92db15730cdab056`, and `8368cf9825aeee8847ecc3113dbe9ef3ec39101b`.
- Locate the workflow run for the current main push or dispatch it only if the appropriate GitHub Actions dispatch capability is available and authorized. Read the full job logs and candidate report.
- If no run output is available, state that explicitly; do not invent candidate counts or titles.

### Step 2 — Independent candidate review
For every candidate considered, record:
- Arabic title and author
- genre and why it is valuable for HUKM
- exact source URL and history/revision evidence
- author and all rights-relevant contributor death-year evidence
- word and chapter counts
- proofreading levels, missing scans, unresolved transclusions
- source page URLs/revision IDs
- near-duplicate group and deduplication decision
- licence evidence and required attribution

Exclude poetry, incomplete/malformed wikitext, Quran/scripture primary-text records, works outside the pinned PD-core tier, missing author evidence, and weak proofreading/source provenance. Do not assume a public-domain underlying work means the Wikisource transcription can be redistributed without complying with its CC BY-SA 4.0 terms.

### Step 3 — Design, do not yet ingest, the separate rights model
Inspect current `BookRights` types, catalogue/detail UI, `NOTICE.md` location and deployment gate before coding.
Propose a separate CC BY-SA 4.0 rights tier that:
- preserves source contributors and required attribution
- stores source page URLs and revision IDs
- includes licence URL and exact source licence statement
- discloses adaptations/normalization and omitted media
- enforces ShareAlike-compatible redistribution
- does not weaken the existing Hindawi rights checks

Do not import full texts until a human-reviewed allowlist is approved by evidence. Do not mislabel CC BY-SA content as CC BY 4.0 or public domain.

## Verification tasks
1. Inspect the current main head and exact-head GitHub Actions run.
2. Run/verify all candidate-audit unit tests.
3. Verify full project tests, TypeScript and production build for the exact current main commit.
4. Re-fetch and independently review any changed rights/gate code.
5. Verify the real library gate against all 24 current books.
6. Do not interpret the Vercel `build-rate-limit` status as a code failure or a successful deployment.

## Branch and release safety
- `deploy/vercel-preparation` is 71 commits ahead and 146 behind main at the last comparison. Do not merge it wholesale.
- Review any needed auth/email/Firebase/Admin changes individually against current main, with dedicated tests and a PR.
- Keep `main` as the Google AI Studio target branch.
- No force-push, history rewrite, bulk data deletion, or production credential changes.
- Never claim Google AI Studio synchronization, Firebase rules deployment, owner bootstrap, or Vercel production deployment without direct evidence.

## After this task
Once the candidate audit output is reviewed and a small curated list is supported by complete rights evidence:
1. Implement the separate CC BY-SA rights tier and attribution/NOTICE changes.
2. Add unit and deployment-gate regression tests.
3. Import only the manually approved selected works as separate lazy JSON assets.
4. Run the real-library gate, all tests, TypeScript and build.
5. Perform an independent review, fix any failures, and save a coherent checkpoint on main.
6. Then resume the full Firestore/auth/API/accessibility/mobile UI audit.

**Do not start a new large ingestion batch before the candidate report is actually inspected.**
