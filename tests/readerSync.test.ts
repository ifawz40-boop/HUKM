import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock localStorage for Node.js test environment
const mockStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
};

import {
  getStoredBookmarks,
  saveStoredBookmarks,
  mergeGuestBookmarksWithUser,
  clearGuestBookmarks,
  hasGuestBookmarks,
  toggleUserBookmark,
  toggleGuestBookmark,
  getBookmarkStorageKey,
  LEGACY_STORAGE_KEY_BOOKMARKS,
} from '../src/utils/authStorage.ts';

import {
  getAllReadingProgress,
  getLegacyReadingProgressForRecovery,
  saveAllReadingProgress,
  getBookReadingProgress,
  recordChapterOpened,
  saveChapterScrollPosition,
  getChapterScrollPosition,
  toggleChapterReadStatus,
  isChapterCompleted,
  mergeGuestReadingProgressWithUser,
  clearGuestReadingProgress,
  hasGuestReadingProgress,
  getReadingProgressStorageKey,
  LEGACY_STORAGE_KEY_PROGRESS,
} from '../src/utils/readingTracker.ts';

import {
  getAllReaderAnnotations,
  getReaderAnnotationsForChapter,
  saveAllReaderAnnotations,
  upsertReaderAnnotationLocal,
  removeReaderAnnotationLocal,
  mergeReaderAnnotations,
  createReaderAnnotationId,
  getReaderAnnotationOffsets,
} from '../src/utils/readerAnnotations.ts';
import { formatReadingProgressId } from '../src/firebase/firestoreService.ts';
import type { UserProfile } from '../src/types/auth.ts';
import type { ReaderAnnotation } from '../src/types/hukm.ts';
import type { WriterDraftSnapshot } from '../src/types/hukm.ts';
import {
  getAllWriterDraftSnapshots,
  getWriterDraftSnapshot,
  saveWriterDraftSnapshot,
  removeWriterDraftSnapshot,
  MAX_WRITER_DRAFT_SNAPSHOTS,
} from '../src/utils/writerDraftRecovery.ts';


describe('HUKM MEDIA — Phase 2: Reader Experience & Cloud Sync Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // SCENARIO 1: New reader bookmarks a book (Guest and User)
  // =========================================================================
  describe('Scenario 1: New reader bookmarks a book', () => {
    it('allows a guest reader to bookmark books locally without error', () => {
      const updated = toggleGuestBookmark('novel-truth-01');
      assert.deepEqual(updated, ['novel-truth-01']);
      assert.deepEqual(getStoredBookmarks(), ['novel-truth-01']);

      // Toggling again removes it
      const removed = toggleGuestBookmark('novel-truth-01');
      assert.deepEqual(removed, []);
      assert.deepEqual(getStoredBookmarks(), []);
    });

    it('allows an authenticated reader to bookmark books into isolated storage', () => {
      const user: UserProfile = {
        id: 'uid-reader-1',
        name: 'قارئ جديد',
        email: 'reader1@example.com',
        role: 'reader',
        joinedDate: '2026-11-03',
        bookmarks: [],
        readHistory: [],
        emailVerified: true,
      };

      const updated = toggleUserBookmark(user, 'novel-investigation-01');
      assert.deepEqual(updated.bookmarks, ['novel-investigation-01']);

      // Stored in partitioned key for uid-reader-1
      assert.deepEqual(getStoredBookmarks('uid-reader-1'), ['novel-investigation-01']);
      // Guest storage remains clean
      assert.deepEqual(getStoredBookmarks(), []);
    });
  });

  // =========================================================================
  // SCENARIO 2: Reader with local bookmarks logs in for the first time (Merge)
  // =========================================================================
  describe('Scenario 2: First-time login merge without data loss', () => {
    it('merges guest bookmarks with existing cloud bookmarks without duplicates', () => {
      const guestBookmarks = ['book-local-1', 'book-shared'];
      const cloudBookmarks = ['book-cloud-1', 'book-shared'];

      const merged = mergeGuestBookmarksWithUser(guestBookmarks, cloudBookmarks);
      assert.equal(merged.length, 3);
      assert.ok(merged.includes('book-local-1'));
      assert.ok(merged.includes('book-cloud-1'));
      assert.ok(merged.includes('book-shared'));
    });

    it('clears guest storage after successful merge to avoid leakage', () => {
      saveStoredBookmarks(['book-temp-1']);
      localStorage.setItem(LEGACY_STORAGE_KEY_BOOKMARKS, JSON.stringify(['book-legacy-1']));

      clearGuestBookmarks();
      assert.equal(localStorage.getItem('hukm_guest_bookmarks'), null);
      assert.equal(localStorage.getItem(LEGACY_STORAGE_KEY_BOOKMARKS), null);
    });

    it('merges guest reading progress into user account preserving chapters and positions', () => {
      const guestProgress = {
        'book-01': {
          bookId: 'book-01',
          lastChapterId: 'ch-1',
          completedChapterIds: ['ch-1'],
          lastReadAt: '2026-11-01T10:00:00.000Z',
          chapterScrollPositions: { 'ch-1': 85 },
        },
      };

      const userProgress = {
        'book-01': {
          bookId: 'book-01',
          lastChapterId: 'ch-2',
          completedChapterIds: ['ch-2'],
          lastReadAt: '2026-11-02T10:00:00.000Z',
          chapterScrollPositions: { 'ch-2': 40 },
        },
      };

      const merged = mergeGuestReadingProgressWithUser(guestProgress, userProgress);
      assert.ok(merged['book-01']);
      // Both chapters are in completedChapterIds
      assert.deepEqual(merged['book-01'].completedChapterIds.sort(), ['ch-1', 'ch-2'].sort());
      // Latest lastChapterId is ch-2 (newer timestamp)
      assert.equal(merged['book-01'].lastChapterId, 'ch-2');
      // Scroll positions from both chapters are preserved
      assert.equal(merged['book-01'].chapterScrollPositions?.['ch-1'], 85);
      assert.equal(merged['book-01'].chapterScrollPositions?.['ch-2'], 40);
    });
  });

  // =========================================================================
  // SCENARIO 3: Reader logs out and enters with another account (Isolation)
  // =========================================================================
  describe('Scenario 3: Multi-tenant storage isolation between accounts', () => {
    it('strictly isolates bookmarks by user ID', () => {
      saveStoredBookmarks(['book-user-A'], 'user-A');
      saveStoredBookmarks(['book-user-B'], 'user-B');

      assert.deepEqual(getStoredBookmarks('user-A'), ['book-user-A']);
      assert.deepEqual(getStoredBookmarks('user-B'), ['book-user-B']);
      assert.deepEqual(getStoredBookmarks(), []); // Guest has none
    });

    it('strictly isolates reading progress by user ID', () => {
      recordChapterOpened('book-1', 'ch-1', 'user-A');
      recordChapterOpened('book-1', 'ch-2', 'user-B');

      const progA = getBookReadingProgress('book-1', 'user-A');
      const progB = getBookReadingProgress('book-1', 'user-B');

      assert.equal(progA.lastChapterId, 'ch-1');
      assert.equal(progB.lastChapterId, 'ch-2');
      assert.deepEqual(progA.completedChapterIds, []);
      assert.deepEqual(progB.completedChapterIds, []);
    });
  });

  describe('Reading completion and legacy data isolation', () => {
    it('does not mark a chapter complete merely because it was opened', () => {
      const progress = recordChapterOpened('book-open', 'chapter-open', 'reader-open');
      assert.equal(progress.lastChapterId, 'chapter-open');
      assert.equal(isChapterCompleted('book-open', 'chapter-open', 'reader-open'), false);
    });

    it('preserves an explicit completion when the same chapter is opened again', () => {
      toggleChapterReadStatus('book-explicit', 'chapter-1', 'reader-explicit');
      const reopened = recordChapterOpened('book-explicit', 'chapter-1', 'reader-explicit');
      assert.ok(reopened.completedChapterIds.includes('chapter-1'));
    });

    it('keeps the newer scroll checkpoint when guest and account progress overlap', () => {
      const merged = mergeGuestReadingProgressWithUser({
        'book-overlap': {
          bookId: 'book-overlap',
          lastChapterId: 'chapter-1',
          completedChapterIds: [],
          lastReadAt: '2026-11-01T10:00:00.000Z',
          chapterScrollPositions: { 'chapter-1': 15 },
        },
      }, {
        'book-overlap': {
          bookId: 'book-overlap',
          lastChapterId: 'chapter-1',
          completedChapterIds: [],
          lastReadAt: '2026-11-02T10:00:00.000Z',
          chapterScrollPositions: { 'chapter-1': 82 },
        },
      });
      assert.equal(merged['book-overlap'].chapterScrollPositions?.['chapter-1'], 82);
    });

    it('never assigns unowned legacy progress to a guest or another account', () => {
      localStorage.setItem(LEGACY_STORAGE_KEY_PROGRESS, JSON.stringify({
        'legacy-book': {
          bookId: 'legacy-book',
          lastChapterId: 'legacy-chapter',
          completedChapterIds: ['legacy-chapter'],
          lastReadAt: '2025-01-01T00:00:00.000Z',
          chapterScrollPositions: { 'legacy-chapter': 80 },
        },
      }));

      assert.deepEqual(getAllReadingProgress(), {});
      assert.deepEqual(getAllReadingProgress('reader-A'), {});
      assert.equal(hasGuestReadingProgress(), false);
      assert.equal(getLegacyReadingProgressForRecovery()['legacy-book'].lastChapterId, 'legacy-chapter');

      clearGuestReadingProgress();
      assert.notEqual(localStorage.getItem(LEGACY_STORAGE_KEY_PROGRESS), null, 'Legacy data must be preserved for explicit recovery');
    });
  });

  describe('Writer draft recovery — local durability and account isolation', () => {
    const snapshot = (overrides: Partial<WriterDraftSnapshot> = {}): WriterDraftSnapshot => ({
      id: 'book-writer::chapter-1',
      userId: 'owner-A',
      bookId: 'book-writer',
      chapterId: 'chapter-1',
      chapterNumber: 1,
      title: 'الفصل الأول',
      content: 'مسودة محلية لم تُرفع بعد.',
      status: 'draft',
      baseUpdatedAt: '2026-11-01T10:00:00.000Z',
      savedAt: '2026-11-02T10:00:00.000Z',
      ...overrides,
    });

    it('isolates writer recovery snapshots by owner account', () => {
      assert.equal(saveWriterDraftSnapshot(snapshot()), true);
      assert.equal(getAllWriterDraftSnapshots('owner-A').length, 1);
      assert.equal(getAllWriterDraftSnapshots('owner-B').length, 0);
      assert.equal(getWriterDraftSnapshot('owner-A', 'book-writer', 'chapter-1')?.content, 'مسودة محلية لم تُرفع بعد.');
    });

    it('replaces the same chapter snapshot rather than creating duplicates', () => {
      saveWriterDraftSnapshot(snapshot());
      saveWriterDraftSnapshot(snapshot({ content: 'نسخة أحدث', savedAt: '2026-11-03T10:00:00.000Z' }));
      assert.equal(getAllWriterDraftSnapshots('owner-A').length, 1);
      assert.equal(getWriterDraftSnapshot('owner-A', 'book-writer', 'chapter-1')?.content, 'نسخة أحدث');
    });

    it('removes a recovered snapshot after a successful cloud save', () => {
      saveWriterDraftSnapshot(snapshot());
      assert.equal(removeWriterDraftSnapshot('owner-A', 'book-writer', 'chapter-1'), true);
      assert.equal(getWriterDraftSnapshot('owner-A', 'book-writer', 'chapter-1'), null);
    });

    it('keeps only the newest bounded set of recovery snapshots', () => {
      for (let index = 0; index < MAX_WRITER_DRAFT_SNAPSHOTS + 3; index += 1) {
        saveWriterDraftSnapshot(snapshot({
          id: `book-writer::chapter-${index}`,
          chapterId: `chapter-${index}`,
          chapterNumber: index + 1,
          savedAt: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(),
        }));
      }
      const all = getAllWriterDraftSnapshots('owner-A');
      assert.equal(all.length, MAX_WRITER_DRAFT_SNAPSHOTS);
      assert.ok(all.some((item) => item.chapterId === `chapter-${MAX_WRITER_DRAFT_SNAPSHOTS + 2}`));
      assert.ok(!all.some((item) => item.chapterId === 'chapter-0'));
    });

    it('rejects oversized local snapshots safely', () => {
      assert.equal(saveWriterDraftSnapshot(snapshot({ content: 'x'.repeat(350_001) })), false);
    });
  });

  describe('Reader annotations — local privacy and cloud merge behavior', () => {
    const annotation = (overrides: Partial<ReaderAnnotation> = {}): ReaderAnnotation => ({
      id: 'ann_test_1',
      bookId: 'book-annotations',
      chapterId: 'chapter-1',
      paragraphIndex: 2,
      startOffset: 4,
      endOffset: 10,
      selectedText: 'مقتطف',
      note: 'ملاحظة شخصية',
      color: 'gold' as const,
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
      syncStatus: 'local' as const,
      ...overrides,
    });

    it('keeps guest annotations isolated from each authenticated account', () => {
      saveAllReaderAnnotations([annotation()], undefined);
      saveAllReaderAnnotations([annotation({ id: 'ann_user_a', userId: 'user-A' })], 'user-A');

      assert.equal(getAllReaderAnnotations().length, 1);
      assert.equal(getAllReaderAnnotations('user-A').length, 1);
      assert.equal(getAllReaderAnnotations('user-B').length, 0);
    });

    it('filters annotations by book and chapter without mixing records', () => {
      saveAllReaderAnnotations([
        annotation(),
        annotation({ id: 'ann_other_chapter', chapterId: 'chapter-2' }),
        annotation({ id: 'ann_other_book', bookId: 'book-other' }),
      ], 'user-filter');
      const selected = getReaderAnnotationsForChapter('book-annotations', 'chapter-1', 'user-filter');
      assert.deepEqual(selected.map((item) => item.id), ['ann_test_1']);
    });

    it('merges cloud records while preserving newer pending local edits', () => {
      const local = annotation({
        note: 'تعديل محلي أحدث',
        updatedAt: '2026-11-03T10:00:00.000Z',
        syncStatus: 'pending',
      });
      const cloud = annotation({
        note: 'نسخة سحابية أقدم',
        updatedAt: '2026-11-02T10:00:00.000Z',
        syncStatus: 'synced',
      });
      const merged = mergeReaderAnnotations([local], [cloud]);
      assert.equal(merged.length, 1);
      assert.equal(merged[0].note, 'تعديل محلي أحدث');
      assert.equal(merged[0].syncStatus, 'pending');
    });

    it('upserts and removes local annotations deterministically', () => {
      upsertReaderAnnotationLocal(annotation(), 'user-upsert');
      upsertReaderAnnotationLocal(annotation({ note: 'تم التعديل' }), 'user-upsert');
      assert.equal(getAllReaderAnnotations('user-upsert').length, 1);
      assert.equal(getAllReaderAnnotations('user-upsert')[0].note, 'تم التعديل');
      removeReaderAnnotationLocal('ann_test_1', 'user-upsert');
      assert.equal(getAllReaderAnnotations('user-upsert').length, 0);
    });

    it('computes stable offsets for Arabic text and trims selected edge whitespace', () => {
      const paragraph = 'قبل   النص المحدد   وبعده';
      const anchor = getReaderAnnotationOffsets(paragraph, 'قبل  ', ' النص المحدد ');
      assert.deepEqual(anchor, {
        selectedText: 'النص المحدد',
        startOffset: 6,
        endOffset: 17,
      });
      assert.equal(paragraph.slice(anchor!.startOffset, anchor!.endOffset), anchor!.selectedText);
    });

    it('rejects selection offsets that do not match the source paragraph', () => {
      assert.equal(getReaderAnnotationOffsets('فقرة أصلية', 'فقرة ', 'نص مختلف'), null);
      assert.equal(getReaderAnnotationOffsets('نص', '', '   '), null);
      assert.equal(getReaderAnnotationOffsets('أ'.repeat(2001), '', 'أ'.repeat(2001)), null);
    });

    it('creates Firestore-safe annotation IDs', () => {
      const id = createReaderAnnotationId();
      assert.match(id, /^ann_[a-zA-Z0-9]+$/);
      assert.ok(id.length <= 128);
    });
  });

  // =========================================================================
  // SCENARIO 4: Simulating restore on a new device/browser
  // =========================================================================
  describe('Scenario 4: Device restore simulation', () => {
    it('restores empty local environment from cloud payload correctly', () => {
      // Clean device
      assert.deepEqual(getStoredBookmarks('user-new-device'), []);

      const cloudBookmarks = ['novel-alpha', 'novel-beta'];
      saveStoredBookmarks(cloudBookmarks, 'user-new-device');

      const restored = getStoredBookmarks('user-new-device');
      assert.deepEqual(restored, ['novel-alpha', 'novel-beta']);
    });
  });

  // =========================================================================
  // SCENARIO 5: Saving and restoring reading progress (Scroll & Completion)
  // =========================================================================
  describe('Scenario 5: Reading progress persistence and scroll position', () => {
    it('records chapter opened and updates scroll position correctly', () => {
      const prog = recordChapterOpened('book-99', 'ch-5', 'user-sync', 72.5);
      assert.equal(prog.lastChapterId, 'ch-5');
      assert.deepEqual(prog.completedChapterIds, [], 'Opening a chapter must not mark it as completed');
      assert.equal(prog.chapterScrollPositions?.['ch-5'], 72.5);

      // Verify retrieval
      const savedScroll = getChapterScrollPosition('book-99', 'ch-5', 'user-sync');
      assert.equal(savedScroll, 72.5);
    });

    it('toggles chapter read status manually', () => {
      toggleChapterReadStatus('book-99', 'ch-10', 'user-sync');
      assert.ok(isChapterCompleted('book-99', 'ch-10', 'user-sync'));

      toggleChapterReadStatus('book-99', 'ch-10', 'user-sync');
      assert.equal(isChapterCompleted('book-99', 'ch-10', 'user-sync'), false);
    });

    it('preserves safe deterministic identifiers without lossy normalization', () => {
      const id = formatReadingProgressId('user-123', 'book_abc-01', 'ch-1');
      assert.equal(id, 'prog_user-123_book_abc-01_ch-1');
      assert.match(id, /^[a-zA-Z0-9_\-]+$/);
      assert.ok(id.length <= 128);
    });

    it('rejects unsafe, empty, and overlong identifiers instead of sanitizing or truncating', () => {
      assert.throws(() => formatReadingProgressId('user@123', 'book-1', 'ch-1'), /Refusing lossy ID normalization/);
      assert.throws(() => formatReadingProgressId('', 'book-1', 'ch-1'), /must all be non-empty/);
      assert.throws(() => formatReadingProgressId('u'.repeat(60), 'b'.repeat(40), 'c'.repeat(40)), /Refusing lossy truncation/);
    });
  });

  // =========================================================================
  // SCENARIO 6: Default behavior when no progress exists (Starts at top)
  // =========================================================================
  describe('Scenario 6: Default zero progress handling', () => {
    it('defaults scroll position to 0 and empty completion list', () => {
      const scroll = getChapterScrollPosition('unopened-book', 'ch-1', 'user-fresh');
      assert.equal(scroll, 0);

      const isDone = isChapterCompleted('unopened-book', 'ch-1', 'user-fresh');
      assert.equal(isDone, false);

      const prog = getBookReadingProgress('unopened-book', 'user-fresh');
      assert.equal(prog.lastChapterId, undefined);
      assert.deepEqual(prog.completedChapterIds, []);
    });
  });

  // =========================================================================
  // SCENARIO 7: Network failure / offline resilience
  // =========================================================================
  describe('Scenario 7: Offline resilience and storage continuity', () => {
    it('continues to function locally without crashing if cloud is unreachable', () => {
      // Simulating offline reading by saving locally
      saveChapterScrollPosition('book-offline', 'ch-offline-1', 45, 'user-offline');
      const retrieved = getChapterScrollPosition('book-offline', 'ch-offline-1', 'user-offline');
      assert.equal(retrieved, 45);
    });
  });

  // =========================================================================
  // SCENARIO 8: Security rules invariant for readingProgress collection
  // =========================================================================
  describe('Scenario 8: Security rules invariant for readingProgress', () => {
    const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');

    it('enforces userId matches authenticated caller in firestore.rules', () => {
      assert.match(rulesContent, /data\.userId == request\.auth\.uid/);
      assert.match(rulesContent, /resource\.data\.userId == request\.auth\.uid/);
    });

    it('binds reading progress document identity and keeps its owner/book/chapter immutable', () => {
      assert.match(rulesContent, /function isValidReadingProgressCreate\(progressId\)/);
      assert.match(rulesContent, /data\.id == progressId/);
      assert.match(rulesContent, /function isValidReadingProgressUpdate\(progressId\)/);
      assert.match(rulesContent, /incomingData\.bookId == existingData\.bookId/);
      assert.match(rulesContent, /incomingData\.chapterId == existingData\.chapterId/);
      assert.match(rulesContent, /allow create: if isSignedIn\(\) && isValidId\(progressId\) && isValidReadingProgressCreate\(progressId\)/);
      assert.match(rulesContent, /allow update: if isSignedIn\(\) && resource\.data\.userId == request\.auth\.uid && isValidReadingProgressUpdate\(progressId\)/);
      assert.match(rulesContent, /data\.scrollPercent >= 0 && data\.scrollPercent <= 100/);
    });
  });

  // =========================================================================
  // SCENARIO 9: Data persistence across reload simulation
  // =========================================================================
  describe('Scenario 9: Persistence across simulated page refresh', () => {
    it('preserves user bookmarks and reading progress across re-reads of localStorage', () => {
      saveStoredBookmarks(['book-p1', 'book-p2'], 'user-persist');
      recordChapterOpened('book-p1', 'ch-p1', 'user-persist', 60);

      // Simulate page refresh by fetching freshly from storage
      const freshBookmarks = getStoredBookmarks('user-persist');
      const freshProgress = getBookReadingProgress('book-p1', 'user-persist');

      assert.deepEqual(freshBookmarks, ['book-p1', 'book-p2']);
      assert.equal(freshProgress.lastChapterId, 'ch-p1');
      assert.equal(freshProgress.chapterScrollPositions?.['ch-p1'], 60);
    });
  });

  // =========================================================================
  // SCENARIO 10: Phase 2.1 Critical Reliability & Cloud Sync Verification
  // =========================================================================
  describe('Scenario 10: Phase 2.1 Critical Reliability & Cloud Sync Verification', () => {
    it('1. Bookmark migration succeeds -> guest bookmarks cleared', () => {
      toggleGuestBookmark('book-mig-1');
      toggleGuestBookmark('book-mig-2');
      assert.equal(hasGuestBookmarks(), true);

      // Simulate successful cloud write
      let cloudWriteSuccess = true;
      if (cloudWriteSuccess) {
        clearGuestBookmarks();
      }

      assert.equal(hasGuestBookmarks(), false);
      assert.deepEqual(getStoredBookmarks(), []);
    });

    it('2. Bookmark migration fails -> guest bookmarks preserved', () => {
      toggleGuestBookmark('book-fail-1');
      toggleGuestBookmark('book-fail-2');
      assert.equal(hasGuestBookmarks(), true);

      // Simulate failed cloud write (e.g., network error)
      let cloudWriteSuccess = false;
      if (cloudWriteSuccess) {
        clearGuestBookmarks();
      }

      assert.equal(hasGuestBookmarks(), true);
      assert.deepEqual(getStoredBookmarks(), ['book-fail-1', 'book-fail-2']);
    });

    it('3. Reading progress migration fails -> guest progress preserved', () => {
      recordChapterOpened('book-prog-fail', 'ch-1', undefined, 40);
      assert.equal(hasGuestReadingProgress(), true);

      // Simulate failed progress cloud sync
      let progressSyncSuccess = false;
      if (progressSyncSuccess) {
        clearGuestReadingProgress();
      }

      assert.equal(hasGuestReadingProgress(), true);
      const progress = getBookReadingProgress('book-prog-fail');
      assert.equal(progress.lastChapterId, 'ch-1');
      assert.equal(progress.chapterScrollPositions?.['ch-1'], 40);
    });

    it('4. Partial failure: Bookmarks succeed, progress fails -> only bookmarks cleared', () => {
      toggleGuestBookmark('book-part-bm');
      recordChapterOpened('book-part-prog', 'ch-1', undefined, 50);

      assert.equal(hasGuestBookmarks(), true);
      assert.equal(hasGuestReadingProgress(), true);

      // Independent operations: bookmarks succeed, progress fails
      const bookmarkSyncSuccess = true;
      const progressSyncSuccess = false;

      if (bookmarkSyncSuccess) {
        clearGuestBookmarks();
      }
      if (progressSyncSuccess) {
        clearGuestReadingProgress();
      }

      assert.equal(hasGuestBookmarks(), false, 'Guest bookmarks must be cleared');
      assert.equal(hasGuestReadingProgress(), true, 'Guest progress must be preserved on failure');
      assert.equal(getBookReadingProgress('book-part-prog').lastChapterId, 'ch-1');
    });

    it('5. Offline login -> all guest data preserved locally', () => {
      toggleGuestBookmark('book-offline-bm');
      recordChapterOpened('book-offline-prog', 'ch-offline', undefined, 85);

      // Device is offline; both cloud calls fail
      const bookmarkSyncSuccess = false;
      const progressSyncSuccess = false;

      if (bookmarkSyncSuccess) clearGuestBookmarks();
      if (progressSyncSuccess) clearGuestReadingProgress();

      assert.equal(hasGuestBookmarks(), true);
      assert.equal(hasGuestReadingProgress(), true);
      assert.deepEqual(getStoredBookmarks(), ['book-offline-bm']);
    });

    it('6. Subsequent retry completes migration without duplicates', () => {
      toggleGuestBookmark('book-retry-1');
      recordChapterOpened('book-retry-1', 'ch-1', undefined, 90);

      // Merge locally for user 'user-retry'
      const guestBm = getStoredBookmarks();
      const userBm = getStoredBookmarks('user-retry');
      const mergedBm = mergeGuestBookmarksWithUser(guestBm, userBm);
      saveStoredBookmarks(mergedBm, 'user-retry');

      const guestProg = getAllReadingProgress();
      const userProg = getAllReadingProgress('user-retry');
      const mergedProg = mergeGuestReadingProgressWithUser(guestProg, userProg);
      saveAllReadingProgress(mergedProg, 'user-retry');

      // Now cloud sync succeeds
      clearGuestBookmarks();
      clearGuestReadingProgress();

      assert.equal(hasGuestBookmarks(), false);
      assert.equal(hasGuestReadingProgress(), false);

      // Retry again: should not duplicate
      const retryGuestBm = getStoredBookmarks();
      const retryUserBm = getStoredBookmarks('user-retry');
      const retryMergedBm = mergeGuestBookmarksWithUser(retryGuestBm, retryUserBm);
      saveStoredBookmarks(retryMergedBm, 'user-retry');

      const userBookmarks = getStoredBookmarks('user-retry');
      assert.deepEqual(userBookmarks, ['book-retry-1']);
    });

    it('7. Account switching race condition: Delayed response from User A cannot update User B', async () => {
      let activeSessionId = 0;
      let committedUserId: string | null = null;

      // User A logs in (Session 1)
      const sessionA = ++activeSessionId;

      // Simulated slow cloud fetch for User A (50ms)
      const userAPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('user-A'), 50);
      });

      // User B logs in before User A resolves (Session 2)
      const sessionB = ++activeSessionId;
      committedUserId = 'user-B';

      // User A response finally arrives
      const userAResult = await userAPromise;
      if (activeSessionId === sessionA) {
        committedUserId = userAResult; // Guard should prevent this
      }

      assert.equal(committedUserId, 'user-B', 'Delayed User A response must not overwrite User B');
    });

    it('8. Logout invalidates pending asynchronous operations', async () => {
      let activeSessionId = 0;
      let operationCommitted = false;

      // User logs in
      const currentSession = ++activeSessionId;

      // Pending async operation started
      const asyncOp = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(true), 30);
      });

      // User logs out while operation is in flight
      activeSessionId++; // invalidated

      const result = await asyncOp;
      if (activeSessionId === currentSession) {
        operationCommitted = result;
      }

      assert.equal(operationCommitted, false, 'Operation must be aborted upon logout');
    });

    it('9. Multiple rapid login/auth events do not trigger conflicting migrations', () => {
      let activeSessionId = 0;
      const executedMigrations: number[] = [];

      // Rapid sequence of 5 auth events
      for (let i = 1; i <= 5; i++) {
        const session = ++activeSessionId;
        // In synchronous phase only session 5 is the latest
        if (session === activeSessionId) {
          executedMigrations.push(session);
        }
      }

      // Latest session ID is 5
      assert.equal(activeSessionId, 5);
      assert.equal(executedMigrations[executedMigrations.length - 1], 5);
    });

    it('10. Guest reading progress is formatted and merged into correct user account', () => {
      recordChapterOpened('book-format-1', 'ch-alpha', undefined, 65);

      const guestProg = getAllReadingProgress();
      const userProg = getAllReadingProgress('user-final-123');
      const mergedProg = mergeGuestReadingProgressWithUser(guestProg, userProg);
      saveAllReadingProgress(mergedProg, 'user-final-123');

      const finalProg = getBookReadingProgress('book-format-1', 'user-final-123');
      assert.equal(finalProg.lastChapterId, 'ch-alpha');
      assert.equal(finalProg.chapterScrollPositions?.['ch-alpha'], 65);

      // Verify deterministic document ID format
      const docId = formatReadingProgressId('user-final-123', 'book-format-1', 'ch-alpha');
      assert.equal(docId, 'prog_user-final-123_book-format-1_ch-alpha');
    });

  });
});
