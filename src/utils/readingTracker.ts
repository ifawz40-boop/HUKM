import { ReadingProgress } from '../types/hukm';

export const LEGACY_STORAGE_KEY_PROGRESS = 'hukm_reading_tracker_v1';

export function getReadingProgressStorageKey(userId?: string): string {
  if (userId) return `hukm_user_${userId}_reading_tracker`;
  return 'hukm_guest_reading_tracker';
}

/**
 * Retrieve all reading progress records for a user or guest.
 * Transparently checks legacy storage if partitioned storage is empty.
 */
export function getAllReadingProgress(userId?: string): Record<string, ReadingProgress> {
  try {
    if (typeof localStorage === 'undefined') return {};

    const key = getReadingProgressStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }

    // Check legacy storage fallback to prevent data loss
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY_PROGRESS);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (legacyParsed && typeof legacyParsed === 'object') {
        return legacyParsed;
      }
    }
  } catch {}
  return {};
}

export function saveAllReadingProgress(
  data: Record<string, ReadingProgress>,
  userId?: string
): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const key = getReadingProgressStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export function getBookReadingProgress(bookId: string, userId?: string): ReadingProgress {
  const all = getAllReadingProgress(userId);
  return (
    all[bookId] || {
      bookId,
      lastChapterId: undefined,
      completedChapterIds: [],
      lastReadAt: new Date().toISOString(),
      chapterScrollPositions: {},
    }
  );
}

/**
 * Record that a reader opened/read a specific chapter (sets as lastReadChapter and marks as completed)
 */
export function recordChapterOpened(
  bookId: string,
  chapterId: string,
  userId?: string,
  scrollPercent?: number
): ReadingProgress {
  const all = getAllReadingProgress(userId);
  const current = all[bookId] || {
    bookId,
    lastChapterId: chapterId,
    completedChapterIds: [],
    lastReadAt: new Date().toISOString(),
    chapterScrollPositions: {},
  };

  const completedSet = new Set(current.completedChapterIds || []);
  completedSet.add(chapterId);

  const scrollPositions = { ...(current.chapterScrollPositions || {}) };
  if (typeof scrollPercent === 'number') {
    scrollPositions[chapterId] = Math.min(100, Math.max(0, Math.round(scrollPercent * 10) / 10));
  }

  const updated: ReadingProgress = {
    ...current,
    lastChapterId: chapterId,
    completedChapterIds: Array.from(completedSet),
    lastReadAt: new Date().toISOString(),
    chapterScrollPositions: scrollPositions,
  };

  all[bookId] = updated;
  saveAllReadingProgress(all, userId);
  return updated;
}

/**
 * Save exact scroll position (0 to 100) for a chapter
 */
export function saveChapterScrollPosition(
  bookId: string,
  chapterId: string,
  scrollPercent: number,
  userId?: string
): ReadingProgress {
  const all = getAllReadingProgress(userId);
  const current = all[bookId] || {
    bookId,
    lastChapterId: chapterId,
    completedChapterIds: [],
    lastReadAt: new Date().toISOString(),
    chapterScrollPositions: {},
  };

  const scrollPositions = { ...(current.chapterScrollPositions || {}) };
  scrollPositions[chapterId] = Math.min(100, Math.max(0, Math.round(scrollPercent * 10) / 10));

  const updated: ReadingProgress = {
    ...current,
    lastChapterId: chapterId,
    chapterScrollPositions: scrollPositions,
    lastReadAt: new Date().toISOString(),
  };

  all[bookId] = updated;
  saveAllReadingProgress(all, userId);
  return updated;
}

/**
 * Get saved scroll position for a chapter (defaults to 0)
 */
export function getChapterScrollPosition(
  bookId: string,
  chapterId: string,
  userId?: string
): number {
  const progress = getBookReadingProgress(bookId, userId);
  return progress.chapterScrollPositions?.[chapterId] || 0;
}

/**
 * Manually toggle whether a chapter is marked as read or unread
 */
export function toggleChapterReadStatus(
  bookId: string,
  chapterId: string,
  userId?: string
): ReadingProgress {
  const all = getAllReadingProgress(userId);
  const current = all[bookId] || {
    bookId,
    lastChapterId: chapterId,
    completedChapterIds: [],
    lastReadAt: new Date().toISOString(),
    chapterScrollPositions: {},
  };

  const completedSet = new Set(current.completedChapterIds || []);
  if (completedSet.has(chapterId)) {
    completedSet.delete(chapterId);
  } else {
    completedSet.add(chapterId);
  }

  const updated: ReadingProgress = {
    ...current,
    completedChapterIds: Array.from(completedSet),
    lastReadAt: new Date().toISOString(),
  };

  all[bookId] = updated;
  saveAllReadingProgress(all, userId);
  return updated;
}

export function isChapterCompleted(bookId: string, chapterId: string, userId?: string): boolean {
  const progress = getBookReadingProgress(bookId, userId);
  return progress.completedChapterIds.includes(chapterId);
}

/**
 * Merge guest reading progress into user account
 */
export function mergeGuestReadingProgressWithUser(
  guestData: Record<string, ReadingProgress>,
  userData: Record<string, ReadingProgress>
): Record<string, ReadingProgress> {
  const merged: Record<string, ReadingProgress> = { ...userData };

  for (const [bookId, guestProg] of Object.entries(guestData || {})) {
    const existing = merged[bookId];
    if (!existing) {
      merged[bookId] = guestProg;
    } else {
      const combinedCompleted = Array.from(
        new Set([...(existing.completedChapterIds || []), ...(guestProg.completedChapterIds || [])])
      );
      const guestDate = new Date(guestProg.lastReadAt || 0).getTime();
      const existingDate = new Date(existing.lastReadAt || 0).getTime();
      const latestLastChapter =
        guestDate > existingDate ? guestProg.lastChapterId || existing.lastChapterId : existing.lastChapterId || guestProg.lastChapterId;

      merged[bookId] = {
        bookId,
        lastChapterId: latestLastChapter,
        completedChapterIds: combinedCompleted,
        lastReadAt: guestDate > existingDate ? guestProg.lastReadAt : existing.lastReadAt,
        chapterScrollPositions: {
          ...(existing.chapterScrollPositions || {}),
          ...(guestProg.chapterScrollPositions || {}),
        },
      };
    }
  }

  return merged;
}

/**
 * Clear guest reading progress after merging
 */
export function clearGuestReadingProgress(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('hukm_guest_reading_tracker');
    localStorage.removeItem(LEGACY_STORAGE_KEY_PROGRESS);
  } catch {}
}

/**
 * Check if unauthenticated guest reading progress exists in storage
 */
export function hasGuestReadingProgress(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const guestRaw = localStorage.getItem('hukm_guest_reading_tracker');
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return true;
    }
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY_PROGRESS);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return true;
    }
  } catch {}
  return false;
}
