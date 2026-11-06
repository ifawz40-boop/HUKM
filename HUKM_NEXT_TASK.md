# HUKM MEDIA — Exact Next Task

**Current branch:** `main`  
**Current main HEAD at task creation:** `1951fcbf5f7726e5282fd4b29dc3f666951d2bfa`  
**Last stable code merge:** `92b1251dd3dece8323cb32f9997e7817c5bc826d`  
**Latest CI on code merge:** run #42188045609 — SUCCESS  
**Latest pinned candidate audit:** run #42188045492 — SUCCESS  
**Google AI Studio sync:** not independently verified.

## Phase A — verify latest docs checkpoint
1. Re-fetch `main` and confirm the current HEAD.
2. Verify CI for the documentation-only HEAD `1951fcb...`; do not treat a prior successful code commit as proof for a later commit.
3. Confirm the current candidate report is present and links to the latest successful audit run.

## Phase B — complete manual review of the 38 Arabic Wikisource candidates
Read `docs/library/WIKISOURCE_CANDIDATES_2026-11-06.md` and download artifact `wikisource-candidate-report` from run #42188045492 (artifact ID `13487204922`, expiry 2026-11-20).

Verified facts:
- 38 candidates from 40,782 rows; 11 filter tests passed.
- All 38 are marked original works; 40 author credit records have Wikidata IDs and death-year evidence.
- All source pages in the report have URLs, revision IDs and timestamps.
- 18 candidates carry the category `نصوص مجهولة المصدر`; 2 carry `صفحات بوصلة غير موجودة`.
- 16 candidates exceed the current `maximumWordsPerBook=120000`.
- Only one candidate has scan proofreading signals: `لسان غصن لبنان في انتقاد العربية العصرية` (80 scan pages: 72 level 3 and 8 level 4).
- All candidate rows report zero footnotes. 37/38 lack `publication_year`; 33/38 lack `first_publication_year`.
- The source schema has no explicit `is_incomplete` field. A missing field is not proof of completeness.
- All records list author credits only; unnamed contributors/editors may be absent.

### Provisional shortlist for manual source-text review (not an import allowlist)
1. `لسان غصن لبنان في انتقاد العربية العصرية` — 17,568 words, 11 sections, the only candidate with scan-proofreading metadata.
2. `فقه اللغة وسر العربية` — 43,183 words, 31 sections, high diacritization ratio (0.450175); current automatic genre is wrong (fiqh rather than language).
3. `مقدمة ابن خلدون` — 73,202 words, 40 sections.
4. `عيون الأنباء في طبقات الأطباء` — 56,551 words, 45 sections.
5. `كتاب الاعتبار` — 41,071 words, 14 sections.
6. `رقائق الحقائق في حساب الدرج والدقائق` — 17,324 words, 13 sections.

For each, verify the exact Wikisource edition, page/revision history, completeness, unclosed markup, text against source pages, attribution, author and contributor roles, death-year evidence, source provenance, and whether modern editorial material is included. The dataset's rights screen is not a legal guarantee. Do not rely only on the original author's death date.

Defer or reject candidates with unresolved source/edition provenance, missing content, modern editorial material without rights evidence, or text-quality issues. Do not assume all candidates are suitable just because the automated filter accepted them.

## Phase C — separate CC BY-SA 4.0 rights model (only after allowlist)
Inspect and then extend:
- `src/types/hukm.ts` (`BookRights`, `BookSourcePage`)
- `scripts/sync-public-library.mjs`
- `scripts/assert-library-ready.mjs`
- `tests/staticLibrary.test.ts`
- `src/data/library/NOTICE.md`
- `src/components/BookOverviewView.tsx`
- `src/components/BookReaderView.tsx`

Add a distinct rights tier such as `cc-by-sa-4-transcription`, never alias it to CC BY 4.0 or public domain. Require:
- CC BY-SA 4.0 license URL and exact source licence statement.
- Attribution to Arabic Wikisource contributors and dataset citation.
- Every source page URL, revision ID and revision timestamp.
- Source text hash and pinned dataset revision.
- Original work public-domain evidence as a separate property.
- All named rights-relevant contributors, roles, Wikidata evidence and death years; fail closed for unknown relevant credits.
- Description of adaptations, normalization, omissions and any editorial changes.
- ShareAlike redistribution notice and compatible derivative licensing.
- A deployment gate that rejects missing attribution, incomplete source-page provenance, invalid hashes, and wrong license combinations.

Do not modify the current Hindawi CC BY 4.0/public-domain rights paths except to add regression protection. Do not import any candidate until a human-reviewed allowlist exists.

## Phase D — multi-source reader provenance UI
A confirmed issue exists:
- `BookReaderView.tsx` hardcodes “مؤسسة هنداوي” in the rights footer.
- `BookOverviewView.tsx` labels the source URL as a publisher page even when the source may be Wikisource.
- The source-page disclosure shows at most the first 12 pages without clearly stating that the list is partial.

Make source labels dynamic using the book's rights metadata, change the generic source link label to “صفحة المصدر”, and clearly state when only a sample of source pages is displayed while linking to the complete source/history. Add tests for both Hindawi and Wikisource examples.

## Phase E — resume full repository audit
After the library rights/provenance work:
- Review all Firebase Auth, Firestore rules, Storage rules and server API paths.
- Verify owner/admin/writer/reader access enforcement server-side.
- Inspect reader progress/bookmarks/annotations isolation and pending cloud sync.
- Review the orphaned Writer Studio route and static publishing model.
- Fix the confirmed rate-limit limitations only with a justified shared provider; do not misrepresent process-local rate limits.
- Continue accessibility, responsive UI, performance, and production deployment readiness review.

## Safety and merge rules
- `main` is the Google AI Studio target branch. Re-fetch before every write.
- Keep `deploy/vercel-preparation` separate; it was 71 ahead / 146 behind and must not be merged wholesale.
- Use a focused branch/PR for code changes, run focused tests, full CI, independent diff review, and the candidate audit workflow where applicable.
- Merge only after successful checks. Do not force-push.
- Vercel currently reports a free-plan daily deployment quota error (`api-deployments-free-per-day`, more than 100 deployments/day); this is not proof of a code build failure. No production deployment or AI Studio sync has been verified.
- Never import protected books or weaken the rights gate to make deployment pass.

## HUKM_CHECKPOINT
- LAST_COMPLETED_MILESTONE: Repository intelligence + Wikisource candidate discovery + full provenance report pipeline
- LAST_COMPLETED_TASK: Merge PR #9; verify full CI and pinned candidate audit; publish full candidate artifact; document metadata quality findings
- CURRENT_BRANCH: main
- LAST_STABLE_COMMIT: 92b1251dd3dece8323cb32f9997e7817c5bc826d (CI + candidate audit passed)
- CURRENT_MAIN_HEAD: 1951fcbf5f7726e5282fd4b29dc3f666951d2bfa (documentation checkpoint; CI pending)
- TEST_STATUS: Full tests, TypeScript and build passed on merge commit; latest docs-head CI pending
- MAIN_SYNC_STATUS: GitHub main confirmed; Google AI Studio sync unverified
- PENDING_TASKS: Verify docs-head CI; human-review shortlist; implement CC BY-SA rights tier after allowlist; fix generic source attribution UI; continue full repository audit
- NEXT_ACTION: Verify CI for current main HEAD, then review the six provisional candidate texts and their complete source/edition provenance; no ingestion yet
- KNOWN_ISSUES: Vercel daily deployment quota; branch divergence; no verified live deployment or AI Studio sync; candidate content still needs human review.
