# HUKM MEDIA — Exact Continuation Task

**Repository:** `ifawz40-boop/HUKM`  
**Target branch:** `main` (Google AI Studio is connected to this branch)  
**Last stable code commit:** `efe2847232762dfde37970223324573d06f65897`  
**Exact-main CI:** run `42192746029` — SUCCESS (284 tests, TypeScript, production build).  
**Always re-fetch `main` before the next write; this file is a checkpoint, not a substitute for checking the live branch.**

## Verified current capabilities

1. The text library contains 24 full-text books with its existing rights/deployment gate.
2. Book-source attribution is metadata-driven; Hindawi is no longer hardcoded as the only publisher/source.
3. A separate scanned-PDF shelf and lazy PDF.js reader exist.
4. PDF reader supports page navigation, fit-width, zoom, local resume position, per-page bookmarks and per-page notes.
5. Text-based PDFs marked `searchAvailable: true` can be searched sequentially with Arabic normalization and cancellable progress.
6. The 1891 Commons scan fixture is pinned to source revision `1186958260`; its scan is marked Public Domain / PDM 1.0. The separate Wikisource transcription is not included.
7. PDF bookmarks/notes/progress are local-only. No Firestore synchronization exists yet.

## Current constraints — do not misreport

- The current scan is image-based; `searchAvailable: false`; no OCR has been implemented.
- Only one PDF scan fixture is in the separate scanned-PDF shelf. It is a reader test fixture, not a new text-catalogue import.
- PDF progress, bookmarks and notes are localStorage only; do not claim cloud sync.
- EPUB reader is not implemented.
- Vercel currently reports `build-rate-limit` on the free plan. GitHub CI is green; this is not proof of production deployment.
- Google AI Studio synchronization has not been independently verified.

## Next milestone — EPUB ingestion and Readium prototype

### Research decision
- Candidate runtime: Readium TypeScript toolkit, especially `@readium/navigator` (BSD-3-Clause; current package 2.14.0 at the time of research).
- Readium TS navigator consumes a Readium Web Publication Manifest and resources; it does not directly parse arbitrary raw EPUB packages.
- Readium Go toolkit can transform packaged EPUBs into Web Publications and serve their resources. Prefer running this during ingestion/build time and publishing a static manifest/resource tree, rather than requiring a permanent Go service on Vercel.
- Do not select `epubjs@0.3.93` as the default without a strong reason: its stable release is old despite continued downloads.
- Do not select `foliate-js` as a production dependency yet: its README explicitly describes the API as unstable and its demo as incomplete.

### Implementation sequence
1. Re-fetch current `main`, inspect the latest package lock, CI workflow, Vercel routes and static asset conventions.
2. Create an isolated branch for the EPUB prototype.
3. Use a public-domain EPUB fixture from a trustworthy source; keep it as a test fixture, not a public-library addition.
4. Run the Readium Go toolkit in CI/ingestion to generate a Web Publication Manifest and its static resources.
5. Load that manifest through the Readium TS navigator in a small isolated React route.
6. Test Arabic RTL, mixed Arabic/English, TOC, CFI navigation, font/line-height preferences, keyboard/touch navigation, and safe handling of untrusted EPUB HTML/resources.
7. Measure generated asset size and bundle impact. Do not commit large book binaries to Git; decide whether Vercel static hosting or an external storage provider is appropriate.
8. Add tests for malformed manifests, unsafe external links, missing resources, and rights metadata.
9. Only merge after tests, TypeScript, production build, and independent review pass.
10. Do not ingest actual books until source, edition, author/contributor rights and redistribution licence are documented.

## Following milestone — PDF progress cloud sync
After the EPUB prototype, inspect existing Firestore service functions and security rules. If implemented, use a user-owned document path, verify ownership server/rule-side, validate document IDs/page bounds/note lengths, and add rules tests. Never trust a client-supplied UID. Preserve local progress as an offline fallback.

## Later tasks
- Evaluate OCR for scanned PDFs only after checking text quality, language accuracy and licensing.
- Browser runtime smoke test on Vercel when deployment quota clears: worker loading, real PDF render, mobile/tablet, resume state and CORS fallback.
- Continue security, accessibility, keyboard navigation and responsive UI audits.

## Safety
- No force-push, history rewrite, destructive production changes or credential changes.
- No public-domain assumption based solely on a dead author's date; verify edition and contributor rights.
- Keep CC BY-SA transcription rights separate from public-domain scan rights.
- Do not claim deployment or Google AI Studio sync without direct verification.
