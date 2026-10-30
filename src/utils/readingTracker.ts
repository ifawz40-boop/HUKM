import { ReadingProgress } from '../types/hukm';

const STORAGE_KEY_PROGRESS = 'hukm_reading_tracker_v1';

export function getAllReadingProgress(): Record<string, ReadingProgress> {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return {};
}

export function saveAllReadingProgress(data: Record<string, ReadingProgress>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(data));
    }
  } catch {}
}

export function getBookReadingProgress(bookId: string): ReadingProgress {
  const all = getAllReadingProgress();
  return (
    all[bookId] || {
      bookId,
      lastChapterId: undefined,
      completedChapterIds: [],
      lastReadAt: new Date().toISOString(),
    }
  );
}

/**
 * Record that a reader opened/read a specific chapter (sets as lastReadChapter and marks as completed)
 */
export function recordChapterOpened(bookId: string, chapterId: string): ReadingProgress {
  const all = getAllReadingProgress();
  const current = all[bookId] || {
    bookId,
    lastChapterId: chapterId,
    completedChapterIds: [],
    lastReadAt: new Date().toISOString(),
  };

  const completedSet = new Set(current.completedChapterIds || []);
  completedSet.add(chapterId);

  const updated: ReadingProgress = {
    ...current,
    lastChapterId: chapterId,
    completedChapterIds: Array.from(completedSet),
    lastReadAt: new Date().toISOString(),
  };

  all[bookId] = updated;
  saveAllReadingProgress(all);
  return updated;
}

/**
 * Manually toggle whether a chapter is marked as read or unread
 */
export function toggleChapterReadStatus(bookId: string, chapterId: string): ReadingProgress {
  const all = getAllReadingProgress();
  const current = all[bookId] || {
    bookId,
    lastChapterId: chapterId,
    completedChapterIds: [],
    lastReadAt: new Date().toISOString(),
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
  saveAllReadingProgress(all);
  return updated;
}

export function isChapterCompleted(bookId: string, chapterId: string): boolean {
  const progress = getBookReadingProgress(bookId);
  return progress.completedChapterIds.includes(chapterId);
}
