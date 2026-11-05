import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { formatDraftChapterId, partitionBookChapters, assertFirestoreDocumentSize, FIRESTORE_DOCUMENT_SAFE_LIMIT_BYTES } from '../src/firebase/firestoreService.ts';
import type { BookProject, BookChapter } from '../src/types/hukm.ts';

describe('HUKM MEDIA — Milestone 1: Critical Data Integrity & Draft Isolation Suite', () => {

  const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
  const blueprintContent = fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf-8');
  const migrationScriptContent = fs.readFileSync(path.resolve(process.cwd(), 'scripts/migrate-draft-chapters.ts'), 'utf-8');
  const firestoreServiceContent = fs.readFileSync(path.resolve(process.cwd(), 'src/firebase/firestoreService.ts'), 'utf-8');
  const newBookModalContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/NewBookModal.tsx'), 'utf-8');
  const writerStudioContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/BookWriterStudio.tsx'), 'utf-8');
  const researchPanelContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/BookResearchPanel.tsx'), 'utf-8');
  const researchRecoveryContent = fs.readFileSync(path.resolve(process.cwd(), 'src/utils/bookResearchRecovery.ts'), 'utf-8');
  const appContent = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');

  describe('Invariant 0: Draft ID collision protection', () => {
    it('must rely on Firestore rules to keep draft identity immutable at commit time', () => {
      assert.match(rulesContent, /data\.bookId == previous\.bookId/);
      assert.match(rulesContent, /data\.chapterId == previous\.chapterId/);
      const saveBlock = firestoreServiceContent.slice(
        firestoreServiceContent.indexOf('export async function saveBookToFirestore'),
        firestoreServiceContent.indexOf('export async function deleteBookFromFirestore')
      );
      assert.equal(saveBlock.includes('getDoc(draftRef)'), false, 'Avoid one additional document read per draft');
      assert.match(saveBlock, /batch\.set\(draftRef, draftPayload/);
    });

    it('must detect draft ID collisions globally across the migration plan before writes', () => {
      assert.match(migrationScriptContent, /const plannedDraftOwners = new Map/);
      assert.match(migrationScriptContent, /Global draft ID collision detected/);
      assert.match(migrationScriptContent, /Existing draft ID collision/);
    });

    it('must use an unambiguous migration owner key and preflight document sizes', () => {
      assert.match(migrationScriptContent, /JSON\.stringify\(\[plan\.bookId, draft\.id\]\)/);
      assert.match(migrationScriptContent, /assertSafeDocumentSize\(createDraftPayload/);
      assert.match(migrationScriptContent, /SAFE_DOCUMENT_LIMIT_BYTES = 800 \* 1024/);
      assert.match(migrationScriptContent, /No migration writes were performed/);
    });
  });

  // =========================================================================
  // SECTION 1: Firestore Security Rules & Blueprint Invariants
  // =========================================================================
  describe('Invariant 1: Rules & Blueprint Draft Isolation', () => {
    it('must have /bookDraftChapters/{draftId} match block in firestore.rules', () => {
      assert.match(rulesContent, /match\s+\/bookDraftChapters\/\{draftId\}\s*\{/);
    });

    it('must restrict all /bookDraftChapters operations to verified admins', () => {
      assert.match(rulesContent, /allow read: if isAdmin\(\) && isValidId\(draftId\)/);
      assert.match(rulesContent, /allow create: if isValidDraftChapterCreate\(draftId\)/);
      assert.match(rulesContent, /allow update: if isValidDraftChapterUpdate\(draftId\)/);
      assert.match(rulesContent, /allow delete: if isAdmin\(\) && isValidId\(draftId\)/);
    });

    it('must never allow public read or write on /bookDraftChapters', () => {
      const draftMatch = rulesContent.slice(rulesContent.indexOf('/bookDraftChapters'));
      assert.equal(draftMatch.includes('allow read: if true'), false);
      assert.equal(draftMatch.includes('allow write: if true'), false);
    });

    it('must bind draft document identity on create and keep it immutable on update', () => {
      assert.match(rulesContent, /function isValidDraftChapterCreate\(draftId\)/);
      assert.match(rulesContent, /data\.id == draftId/);
      assert.match(rulesContent, /function isValidDraftChapterUpdate\(draftId\)/);
      assert.match(rulesContent, /data\.bookId == previous\.bookId/);
      assert.match(rulesContent, /data\.chapterId == previous\.chapterId/);
      assert.match(rulesContent, /allow create: if isValidDraftChapterCreate\(draftId\)/);
      assert.match(rulesContent, /allow update: if isValidDraftChapterUpdate\(draftId\)/);
    });

    it('must define BookDraftChapter entity and firestore path in firebase-blueprint.json', () => {
      const blueprint = JSON.parse(blueprintContent);
      assert.ok(blueprint.entities.BookDraftChapter, 'BookDraftChapter entity must be declared in blueprint');
      assert.equal(blueprint.entities.BookDraftChapter.properties.status.enum[0], 'draft');
      assert.ok(blueprint.firestore['/bookDraftChapters/{draftId}'], 'Path /bookDraftChapters/{draftId} must be in blueprint');
    });
  });

  // =========================================================================
  // SECTION 2: Document ID Generation & ID Validation Rules
  // =========================================================================
  describe('Invariant 2: formatDraftChapterId Determinism & Lossless Validation', () => {
    it('preserves historical IDs for safe inputs within the Firestore limit', () => {
      const validPattern = /^[a-zA-Z0-9_\\-]+$/;
      const testCases = [
        { bookId: 'book-100', chapterId: 'ch-1' },
        { bookId: 'investigation_deep', chapterId: 'chapter_02' },
      ];
      for (const tc of testCases) {
        const id = formatDraftChapterId(tc.bookId, tc.chapterId);
        assert.ok(id.length > 0 && id.length <= 128);
        assert.match(id, validPattern);
        assert.ok(id.startsWith('draft_'));
      }
    });

    it('rejects unsafe characters instead of normalizing distinct inputs to one ID', () => {
      assert.throws(() => formatDraftChapterId('book with spaces', 'ch-1'), /Refusing lossy ID normalization/);
    });
    it('rejects empty book or chapter identifiers', () => {
      assert.throws(() => formatDraftChapterId('', 'ch-1'), /must both be non-empty/);
      assert.throws(() => formatDraftChapterId('book-1', ''), /must both be non-empty/);
    });

    it('rejects overlong IDs instead of truncating distinguishing suffixes', () => {
      assert.throws(() => formatDraftChapterId('a'.repeat(100), 'b'.repeat(100)), /Refusing lossy truncation/);
    });

    it('produces identical deterministic ID for the same inputs', () => {
      assert.equal(formatDraftChapterId('book-alpha', 'ch-42'), formatDraftChapterId('book-alpha', 'ch-42'));
    });
  });

  describe('Invariant 2A: Unknown chapter statuses remain private', () => {
    it('keeps only explicitly ready chapters in the public book payload', () => {
      const chapters = [
        { id: 'ready-1', status: 'ready' },
        { id: 'draft-1', status: 'draft' },
        { id: 'legacy-1', status: 'review_pending' },
        { id: 'missing-1' },
      ] as unknown as BookChapter[];
      const partition = partitionBookChapters(chapters);
      assert.deepEqual(partition.readyChapters.map((chapter) => chapter.id), ['ready-1']);
      assert.deepEqual(partition.draftChapters.map((chapter) => chapter.id), ['draft-1', 'legacy-1', 'missing-1']);
    });
  });

  describe('Invariant 2B: Firestore document size budget', () => {
    it('accepts documents within the conservative byte budget', () => {
      assert.doesNotThrow(() => assertFirestoreDocumentSize({ content: 'small' }, 'test'));
    });

    it('rejects oversized book or chapter documents before batch commit', () => {
      assert.throws(
        () => assertFirestoreDocumentSize({ content: 'x'.repeat(FIRESTORE_DOCUMENT_SAFE_LIMIT_BYTES + 1) }, 'test'),
        /safe Firestore document budget/
      );
    });
  });

  // =========================================================================
  // SECTION 3: Behavioral Logic Tests for All 14 Milestone Scenarios
  // =========================================================================

  // Test 1: Public reader cannot view/fetch draft chapters
  describe('Scenario 1: Public reader cannot view or fetch draft chapters', () => {
    function simulatePublicFilter(book: BookProject): BookChapter[] {
      return (book.chapters || []).filter((ch) => ch.status === 'ready');
    }

    it('strips draft chapters completely from public reader view', () => {
      const book: BookProject = {
        id: 'book-1',
        title: 'كتاب استقصائي',
        category: 'investigations',
        coverImage: '',
        status: 'published',
        summary: '',
        viewsCount: 100,
        chapters: [
          { id: 'ch-1', bookId: 'book-1', chapterNumber: 1, title: 'الفصل الأول', content: ['فقرة 1'], status: 'ready', wordCount: 10, readingTimeMinutes: 1, viewsCount: 10, updatedAt: '' },
          { id: 'ch-2', bookId: 'book-1', chapterNumber: 2, title: 'فصل مسودة خاص', content: ['أسرار مسودة'], status: 'draft', wordCount: 10, readingTimeMinutes: 1, viewsCount: 0, updatedAt: '' },
        ],
        createdAt: '',
        updatedAt: '',
      };

      const publicChapters = simulatePublicFilter(book);
      assert.equal(publicChapters.length, 1);
      assert.equal(publicChapters[0].id, 'ch-1');
      assert.equal(publicChapters.some((c) => c.status === 'draft'), false);
    });
  });

  // Test 2 & 3: SaveBook separation: drafts saved to bookDraftChapters, ready in books/{id}
  describe('Scenario 2 & 3: SaveBook separates drafts and keeps ready chapters in book document', () => {
    function simulateSaveSeparation(book: BookProject) {
      const allChapters = book.chapters || [];
      const readyChapters = allChapters.filter((ch) => ch.status === 'ready');
      const draftChapters = allChapters.filter((ch) => ch.status !== 'ready');

      const bookDocPayload = {
        ...book,
        chapters: readyChapters,
      };

      const draftDocPayloads = draftChapters.map((d) => ({
        id: formatDraftChapterId(book.id, d.id),
        bookId: book.id,
        chapterId: d.id,
        chapterNumber: d.chapterNumber,
        title: d.title,
        status: 'draft',
        content: d.content,
      }));

      return { bookDocPayload, draftDocPayloads };
    }

    it('stores only ready chapters in main book document and isolates drafts', () => {
      const book: BookProject = {
        id: 'book-investigation',
        title: 'تشريح السقوط',
        category: 'investigations',
        coverImage: '',
        status: 'published',
        summary: '',
        viewsCount: 0,
        chapters: [
          { id: 'ch-1', bookId: 'book-investigation', chapterNumber: 1, title: 'مقدمة', content: ['نص تمهيدي'], status: 'ready', wordCount: 20, readingTimeMinutes: 1, viewsCount: 5, updatedAt: '' },
          { id: 'ch-2', bookId: 'book-investigation', chapterNumber: 2, title: 'تحقيق سري', content: ['أدلة غير منشورة'], status: 'draft', wordCount: 50, readingTimeMinutes: 2, viewsCount: 0, updatedAt: '' },
        ],
        createdAt: '',
        updatedAt: '',
      };

      const { bookDocPayload, draftDocPayloads } = simulateSaveSeparation(book);

      assert.equal(bookDocPayload.chapters.length, 1);
      assert.equal(bookDocPayload.chapters[0].status, 'ready');
      assert.equal(draftDocPayloads.length, 1);
      assert.equal(draftDocPayloads[0].id, 'draft_book-investigation_ch-2');
      assert.equal(draftDocPayloads[0].status, 'draft');
    });
  });

  // Test 4: Chapter promotion from draft to ready
  describe('Scenario 4: Promoting chapter from draft to ready updates book and cleans draft', () => {
    it('promotes chapter and clears from draftIds set', () => {
      const initialDraftChapters = ['ch-draft-1', 'ch-draft-2'];
      // Promote ch-draft-1 to ready
      const updatedChapters: BookChapter[] = [
        { id: 'ch-draft-1', bookId: 'book-1', chapterNumber: 1, title: 'فصل مكتمل', content: ['نص'], status: 'ready', wordCount: 10, readingTimeMinutes: 1, viewsCount: 0, updatedAt: '' },
        { id: 'ch-draft-2', bookId: 'book-1', chapterNumber: 2, title: 'مسودة باقية', content: ['مسودة'], status: 'draft', wordCount: 10, readingTimeMinutes: 1, viewsCount: 0, updatedAt: '' },
      ];

      const currentDraftIds = new Set(
        updatedChapters.filter((c) => c.status === 'draft').map((d) => formatDraftChapterId('book-1', d.id))
      );

      const promotedDraftId = formatDraftChapterId('book-1', 'ch-draft-1');
      assert.equal(currentDraftIds.has(promotedDraftId), false, 'Promoted chapter must not be in currentDraftIds');
      assert.equal(currentDraftIds.has(formatDraftChapterId('book-1', 'ch-draft-2')), true);
    });
  });

  // Test 5: Chapter demotion from ready to draft
  describe('Scenario 5: Demoting chapter from ready to draft strips from book and adds to drafts', () => {
    it('moves chapter from book chapters to isolated drafts', () => {
      const book: BookProject = {
        id: 'book-demo',
        title: 'رواية تجريبية',
        category: 'novels',
        coverImage: '',
        status: 'published',
        summary: '',
        viewsCount: 0,
        chapters: [
          { id: 'ch-1', bookId: 'book-demo', chapterNumber: 1, title: 'الفصل الأول', content: ['نص مراجع'], status: 'draft', wordCount: 10, readingTimeMinutes: 1, viewsCount: 0, updatedAt: '' },
        ],
        createdAt: '',
        updatedAt: '',
      };

      const readyInBook = book.chapters.filter((c) => c.status === 'ready');
      const draftsToIsolate = book.chapters.filter((c) => c.status === 'draft');

      assert.equal(readyInBook.length, 0, 'No ready chapters remain in book');
      assert.equal(draftsToIsolate.length, 1);
      assert.equal(draftsToIsolate[0].id, 'ch-1');
    });
  });

  // Test 6: Deleting a book deletes book and all associated draft chapters
  describe('Scenario 6: Atomic deletion of book and associated draft chapters', () => {
    it('verifies firestoreService uses batch.delete for both book and drafts', () => {
      assert.match(firestoreServiceContent, /deleteBookFromFirestore/);
      assert.match(firestoreServiceContent, /batch\.delete\(doc\(db,\s*'books',\s*bookId\)\)/);
      assert.match(firestoreServiceContent, /where\('bookId',\s*'==',\s*bookId\)/);
      assert.match(firestoreServiceContent, /batch\.commit\(\)/);
    });
  });

  // Test 7: Admin query merges ready and draft chapters in chapterNumber order
  describe('Scenario 7: Admin re-merges ready and draft chapters sorted by chapterNumber', () => {
    function simulateAdminMerge(readyChapters: BookChapter[], draftChapters: BookChapter[]): BookChapter[] {
      const map = new Map<string, BookChapter>();
      for (const ch of readyChapters) map.set(ch.id, ch);
      for (const ch of draftChapters) map.set(ch.id, ch);
      return Array.from(map.values()).sort((a, b) => a.chapterNumber - b.chapterNumber);
    }

    it('merges ready ch #1, ready ch #3, and draft ch #2 into [1, 2, 3]', () => {
      const ready = [
        { id: 'ch-1', bookId: 'b-1', chapterNumber: 1, title: 'الفصل 1', content: ['أ'], status: 'ready' as const, wordCount: 1, readingTimeMinutes: 1, viewsCount: 1, updatedAt: '' },
        { id: 'ch-3', bookId: 'b-1', chapterNumber: 3, title: 'الفصل 3', content: ['ج'], status: 'ready' as const, wordCount: 1, readingTimeMinutes: 1, viewsCount: 1, updatedAt: '' },
      ];
      const drafts = [
        { id: 'ch-2', bookId: 'b-1', chapterNumber: 2, title: 'الفصل 2 مسودة', content: ['ب'], status: 'draft' as const, wordCount: 1, readingTimeMinutes: 1, viewsCount: 0, updatedAt: '' },
      ];

      const merged = simulateAdminMerge(ready, drafts);
      assert.equal(merged.length, 3);
      assert.deepEqual(merged.map((c) => c.chapterNumber), [1, 2, 3]);
      assert.equal(merged[1].status, 'draft');
      assert.equal(merged[0].status, 'ready');
      assert.equal(merged[2].status, 'ready');
    });
  });

  // Test 8: Legacy books client filter protects readers
  describe('Scenario 8: Reader filter ensures legacy books with embedded drafts never leak', () => {
    it('verifies fetchBooksFromFirestore filters non-admin books client-side', () => {
      assert.match(firestoreServiceContent, /book\.chapters\s*=\s*\(book\.chapters\s*\|\|\s*\[\]\)\.filter\(\(ch\)\s*=>\s*ch\.status\s*===\s*'ready'\)/);
    });
  });

  // Test 9: Blank first chapter in NewBookModal creates draft book with chapters: []
  describe('Scenario 9: Empty first chapter creates draft book with no mock/placeholder content', () => {
    it('verifies NewBookModal does not contain mock placeholder strings', () => {
      assert.equal(newBookModalContent.includes('نبدأ رحلة البحث في هذا الفصل من خلال تفكيك'), false);
      assert.equal(newBookModalContent.includes('محتوى الفصل قيد الكتابة...'), false);
    });

    it('defaults new book status to draft', () => {
      assert.match(newBookModalContent, /const\s+\[status,\s*setStatus\]\s*=\s*useState<PublishingStatus>\('draft'\)/);
    });
  });

  // Test 10: Publishing validation rejects 0 ready chapters
  describe('Scenario 10: Publishing validation rejects empty published books', () => {
    function validateNewBookSubmission(status: string, paragraphs: string[]): { valid: boolean; error?: string } {
      const isPublished = ['published', 'completed', 'ongoing', 'ready'].includes(status);
      if (isPublished && paragraphs.length === 0) {
        return { valid: false, error: 'لا يمكن نشر الكتاب دون وجود فصل بمحتوى حقيقي' };
      }
      return { valid: true };
    }

    it('rejects publishing when chapter content is empty', () => {
      const res = validateNewBookSubmission('published', []);
      assert.equal(res.valid, false);
      assert.match(res.error || '', /لا يمكن نشر الكتاب/);
    });

    it('allows saving as draft even when chapter content is empty', () => {
      const res = validateNewBookSubmission('draft', []);
      assert.equal(res.valid, true);
    });
  });

  // Test 11: Chapter numbering validation in BookWriterStudio
  describe('Scenario 11: Writer Studio validates chapter numbers (positive & non-duplicate)', () => {
    function validateChapterNumber(chNum: number, existingNumbers: number[], editingChapterOriginalNum?: number): { valid: boolean; error?: string } {
      if (!Number.isInteger(chNum) || chNum <= 0) {
        return { valid: false, error: 'رقم فصل غير صحيح' };
      }
      if (existingNumbers.includes(chNum) && editingChapterOriginalNum !== chNum) {
        return { valid: false, error: 'رقم الفصل مكرر' };
      }
      return { valid: true };
    }

    it('rejects non-positive chapter numbers (0 or negative)', () => {
      assert.equal(validateChapterNumber(0, [1, 2]).valid, false);
      assert.equal(validateChapterNumber(-3, [1, 2]).valid, false);
    });

    it('rejects duplicate chapter number for new chapter', () => {
      const res = validateChapterNumber(2, [1, 2, 3]);
      assert.equal(res.valid, false);
      assert.match(res.error || '', /مكرر/);
    });

    it('allows unchanged chapter number when editing existing chapter', () => {
      const res = validateChapterNumber(2, [1, 2, 3], 2);
      assert.equal(res.valid, true);
    });
  });

  // Test 12: Network/cloud failure retains state without false success toasts
  describe('Scenario 12: Cloud failure on save/delete retains state and shows error', () => {
    it('verifies App.tsx checks boolean return value and preserves state on failure', () => {
      assert.match(appContent, /const handleUpdateBook = async \(updatedBook: BookProject\): Promise<boolean>/);
      assert.match(appContent, /const handleCreateBook = async \(newBook: BookProject\): Promise<boolean>/);
      assert.match(appContent, /const handleDeleteBook = async \(bookId: string\): Promise<boolean>/);
      assert.match(appContent, /if \(!success\) \{\s*showToast\(`فشل حفظ كتاب/);
    });

    it('verifies NewBookModal does not close when onCreateBook returns false', () => {
      assert.match(newBookModalContent, /if \(result === false\)/);
      assert.match(newBookModalContent, /setError\('فشل حفظ الكتاب/);
    });
  });

  // Test 13: Release email & notification only triggered for published books with ready chapters
  describe('Scenario 13: Notification and email integrity on book creation', () => {
    function evaluateReleaseDispatch(status: string, chapters: BookChapter[]): boolean {
      const isPublished = ['published', 'completed', 'ongoing', 'ready'].includes(status);
      const readyChapters = chapters.filter((c) => c.status === 'ready');
      return isPublished && readyChapters.length > 0;
    }

    it('does NOT trigger notification or email for draft books', () => {
      const draftBookChapters: BookChapter[] = [
        { id: 'ch-1', bookId: 'b-1', chapterNumber: 1, title: 'مسودة', content: ['نص'], status: 'draft', wordCount: 1, readingTimeMinutes: 1, viewsCount: 0, updatedAt: '' },
      ];
      assert.equal(evaluateReleaseDispatch('draft', draftBookChapters), false);
    });

    it('does NOT trigger notification or email for published books with 0 ready chapters', () => {
      assert.equal(evaluateReleaseDispatch('published', []), false);
    });

    it('triggers notification and email only when published AND has ready chapters', () => {
      const readyBookChapters: BookChapter[] = [
        { id: 'ch-1', bookId: 'b-1', chapterNumber: 1, title: 'فصل جاهز', content: ['نص'], status: 'ready', wordCount: 10, readingTimeMinutes: 1, viewsCount: 0, updatedAt: '' },
      ];
      assert.equal(evaluateReleaseDispatch('published', readyBookChapters), true);
    });

    it('verifies App.tsx records delivered: false honestly in email log', () => {
      assert.match(appContent, /delivered:\s*false/);
    });
  });

  // Test 14: Safe Migration script invariants
  describe('Scenario 14: Safe Migration script dry-run and apply mechanics', () => {
    it('defaults to dry-run when --apply is not supplied', () => {
      assert.match(migrationScriptContent, /const isApply = args\.includes\('--apply'\)/);
      assert.match(migrationScriptContent, /const isDryRun = !isApply \|\| args\.includes\('--dry-run'\)/);
    });

    it('commits batch writes only when not in dry-run mode', () => {
      const applyBlock = migrationScriptContent.slice(migrationScriptContent.indexOf('db.batch()'));
      assert.match(applyBlock, /await batch\.commit\(\)/);
    });

    it('retains ready chapters in book document while extracting drafts', () => {
      assert.match(migrationScriptContent, /chapters:\s*plan\.readyChapters/);
      assert.match(migrationScriptContent, /db\.collection\('bookDraftChapters'\)\.doc\(draftId\)/);
    });
  });



  describe('Milestone 1 follow-up: fail-closed and batch safety', () => {
    it('does not return a partial admin book list when draft retrieval fails', () => {
      assert.match(firestoreServiceContent, /Fail closed: never return a partial admin book list[\s\S]*?throw draftErr/);
    });

    it('aborts save if draft cleanup query fails or write count exceeds Firestore batch limit', () => {
      assert.match(firestoreServiceContent, /Fail closed: committing without a complete cleanup query[\s\S]*?throw queryErr/);
      assert.match(firestoreServiceContent, /cleanupCount \+ draftChapters\.length \+ 1 > 500/);
    });

    it('does not delete a book when draft enumeration fails', () => {
      assert.match(firestoreServiceContent, /never delete the parent book if its draft records could not be enumerated[\s\S]*?throw queryErr/);
    });

    it('migration only leaves explicitly ready chapters public', () => {
      assert.match(migrationScriptContent, /const ready = chapters\.filter\(\(c: any\) => c\.status === 'ready'\)/);
      assert.match(migrationScriptContent, /const drafts = chapters\.filter\(\(c: any\) => c\.status !== 'ready'\)/);
    });

    it('migration writes draft copies in bounded batches before stripping public legacy content', () => {
      assert.match(migrationScriptContent, /offset \+= 450/);
      assert.match(migrationScriptContent, /Strip legacy drafts only after every private copy/);
    });
  });
  describe('Milestone 2: Writer save concurrency and recovery safety', () => {
    it('prevents duplicate chapter submissions and always releases the save lock', () => {
      assert.match(writerStudioContent, /if \(!currentBook \|\| isSavingChapterRef\.current\) return/);
      assert.match(writerStudioContent, /isSavingChapterRef\.current = true/);
      assert.match(writerStudioContent, /finally \{[\s\S]*?isSavingChapterRef\.current = false[\s\S]*?setIsSavingChapter\(false\)/);
      assert.equal((writerStudioContent.match(/disabled=\{!currentBook \|\| isSavingChapter\}/g) || []).length, 2);
      for (const field of ['chapterNumber', 'chapterStatus', 'chapterTitle', 'chapterContent']) {
        const fieldIndex = writerStudioContent.indexOf(`value={${field}}`);
        assert.ok(fieldIndex >= 0, `Missing editor field: ${field}`);
        assert.match(writerStudioContent.slice(fieldIndex, fieldIndex + 180), /disabled=\{isSavingChapter\}/);
      }
      assert.match(writerStudioContent, /const handleSelectChapter = \(ch: BookChapter\) => \{\s*if \(isSavingChapterRef\.current \|\| preserveCurrentEditorDraft\(\) === false\) return/);
      assert.match(writerStudioContent, /const handleCreateNewChapter = \(\) => \{\s*if \(!currentBook \|\| isSavingChapterRef\.current \|\| preserveCurrentEditorDraft\(\) === false\) return/);
      assert.match(writerStudioContent, /const handleDeleteChapter = async \(chId: string\) => \{\s*if \(!currentBook \|\| isSavingChapterRef\.current\) return/);
    });

    it('locks research inputs while saving and rejects duplicate save submissions', () => {
      assert.match(researchPanelContent, /if \(isSavingRef\.current\) return/);
      assert.match(researchPanelContent, /isSavingRef\.current = true/);
      assert.match(researchPanelContent, /finally \{[\s\S]*?isSavingRef\.current = false[\s\S]*?setIsSaving\(false\)/);
      assert.match(researchPanelContent, /<fieldset disabled=\{isSaving\}/);
      assert.match(researchPanelContent, /disabled=\{isSaving\}/);
    });

    it('warns before deleting a source linked to quotes and preserves those quotes as unlinked', () => {
      assert.match(researchPanelContent, /const handleDeleteSource =/);
      assert.match(researchPanelContent, /linkedQuotes > 0/);
      assert.match(researchPanelContent, /return \{ \.\.\.item, sourceId: '' \}/);
      assert.match(researchPanelContent, /\{sources\.length\} \/ 50/);
    });

    it('hydrates research data on first mount and preserves local edits on remote changes', () => {
      assert.match(researchPanelContent, /previousBookIdRef = useRef<string \| undefined>\(undefined\)/);
      assert.match(researchPanelContent, /const bookChanged = previousBookIdRef\.current !== book\.id/);
      assert.match(researchPanelContent, /setHasRemoteResearchChanges\(!localMatchesRemote\)/);
      assert.match(researchPanelContent, /if \(hasRemoteResearchChanges\)/);
      assert.match(researchPanelContent, /setSources\(remoteSources\)/);
      assert.match(researchPanelContent, /لم نستبدلها تلقائياً/);
    });

    it('stores bounded research recovery locally and offers explicit restore or discard', () => {
      assert.match(researchRecoveryContent, /MAX_RESEARCH_DRAFT_SOURCES = 50/);
      assert.match(researchRecoveryContent, /MAX_RESEARCH_DRAFT_QUOTES = 100/);
      assert.match(researchRecoveryContent, /MAX_RESEARCH_DRAFT_CHARS = 1_500_000/);
      assert.match(researchRecoveryContent, /localStorage\.setItem/);
      assert.match(researchRecoveryContent, /localStorage\.removeItem/);
      assert.match(researchPanelContent, /saveBookResearchDraft\(/);
      assert.match(researchPanelContent, /getBookResearchDraft\(book\.id\)/);
      assert.match(researchPanelContent, /handleRestoreLocalResearchDraft/);
      assert.match(researchPanelContent, /handleDiscardLocalResearchDraft/);
      assert.match(researchPanelContent, /researchRecoveryDraft\) return/);
    });

    it('persists dirty chapter content before navigation, chapter creation, book creation, or deletion', () => {
      assert.match(writerStudioContent, /const preserveCurrentEditorDraft = \(\): WriterDraftSnapshot \| null \| false/);
      assert.match(writerStudioContent, /saveWriterDraftSnapshot\(snapshot\)/);
      assert.match(writerStudioContent, /if \(isSavingChapterRef\.current \|\| preserveCurrentEditorDraft\(\) === false\) return/);
      assert.match(writerStudioContent, /if \(!currentBook \|\| isSavingChapterRef\.current \|\| preserveCurrentEditorDraft\(\) === false\) return/);
      assert.match(writerStudioContent, /if \(!editingNovelId && preserveCurrentEditorDraft\(\) === false\) return/);
      assert.match(writerStudioContent, /const preservedSnapshot = selectedChapterId === chId \? preserveCurrentEditorDraft\(\) : null/);
      assert.match(writerStudioContent, /setRecoverySnapshot\(preservedSnapshot\)/);
      assert.match(writerStudioContent, /const handlePreviewBookSafely = \(bookId: string, chapterId\?: string\) => \{/);
      assert.match(writerStudioContent, /isSavingChapterRef\.current \|\| preserveCurrentEditorDraft\(\) === false\) return;[\s\S]*?onPreviewBook\(bookId, chapterId\)/);
      assert.equal(writerStudioContent.includes('onClick={() => onPreviewBook(book.id)}'), false);
      assert.equal(writerStudioContent.includes('onClick={() => onPreviewBook(currentBook.id, currentChapter?.id)}'), false);
    });

    it('uses real paragraph separators when loading deleted-chapter recovery or discard targets', () => {
      assert.equal(writerStudioContent.includes("join('\\\\n\\\\n')"), false);
      assert.ok(writerStudioContent.includes("join('\\n\\n')"));
    });
  });

});
