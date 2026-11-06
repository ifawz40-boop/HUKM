# HUKM MEDIA — Exact Next Task

**Current branch:** `main`  
**Previous verified code/data HEAD:** `8368cf9825aeee8847ecc3113dbe9ef3ec39101b`  
**Documentation-only commits since that code/data HEAD:** `355957d0db6d6362555eb98d389eccd48d9897a6`, `feae1b40674f58b2117372ee47f68424c4de85ca`, `acdb59691ba4e6316da452c0561aa33367d889b3`  
**Start by re-fetching main. Do not assume either SHA is still HEAD.**

## Completed: initial Arabic Wikisource candidate discovery
- Workflow run #3 succeeded: 40,782 rows scanned; 38 eligible candidates after the automated filter and deduplication; 11 filter tests passed.
- Candidate list and limitations: `docs/library/WIKISOURCE_CANDIDATES_2026-11-06.md`.
- No book is approved for import. The script's summary only prints five source pages per work and omits the full person/credit arrays.
- Current CI run #484 passed 266 tests, TypeScript, and production build on `44e4001...`.

## Immediate task: full-record extraction and human review before any rights-model change

### Step 1 — Completed: inspect the actual audit run
- Run: https://github.com/ifawz40-boop/HUKM/actions/runs/42183574861
- Result: success; 11 filter tests passed.
- 40,782 rows scanned; 38 eligible before and after deduplication.
- Candidate summaries are preserved in `docs/library/WIKISOURCE_CANDIDATES_2026-11-06.md`.

### Step 2 — Full-record extraction and independent candidate review
- Workflow: `.github/workflows/audit-wikisource-candidates.yml`
- Script: `scripts/audit-wikisource-candidates.py`
- Tests: `tests/test_wikisource_audit.py`
- Dataset: `Bayanat-Labs/arabic-wikisource-pd`
- Config: `works-pd-core`
- Pinned revision: `7f7de3a3e95e3f4e0e29c72588fd73ad2a636ccd`
- Triggering source commits include `07285a3dea8c6dc9658e16f1ebd57aa112106386`, `9612dab17d40d87a30b0d484db18cbd8b5329f21`, `a3d6cfd3701468a768b61826e3049973d88abefe`, `d8e2770f5c4df7ab6d60b72e92db15730cdab056`, and `8368cf9825aeee8847ecc3113dbe9ef3ec39101b`.
- Full job logs were read. No artifact was uploaded; the report is available in the run log and GitHub step summary.
- Retrieve complete records from the pinned Parquet/JSONL source for all 38 candidates, including every `persons` entry, all `source_pages` and revision IDs, full text, completeness/quality indicators and hashes. Do not rely on the summary's first five source pages.
- If no run output is available, state that explicitly; do not invent candidate counts or titles.

### Step 3 — Independent candidate review
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

### Step 4 — Design, do not yet ingest, the separate rights model
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
- Latest confirmed CI: run #484 passed 266 tests, TypeScript and production build on commit `44e4001ca811b1ad3c2ae9b962b20371aa67842b`.
- Candidate audit: run #3 passed; 38 candidates from 40,782 scanned rows. The latest docs-only commit still needs its own CI result.
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
