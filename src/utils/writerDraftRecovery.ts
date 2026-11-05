import type { WriterDraftSnapshot } from '../types/hukm';

export const MAX_WRITER_DRAFT_SNAPSHOTS = 12;
export const MAX_WRITER_DRAFT_CONTENT_CHARS = 350_000;
export const MAX_WRITER_DRAFT_TOTAL_CHARS = 2_000_000;

export function getWriterDraftStorageKey(userId: string): string {
  return `hukm_user_${userId}_writer_drafts_v1`;
}

export function getAllWriterDraftSnapshots(userId: string): WriterDraftSnapshot[] {
  try {
    if (!userId || typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(getWriterDraftStorageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is WriterDraftSnapshot =>
      Boolean(item) &&
      typeof item === 'object' &&
      (item as WriterDraftSnapshot).userId === userId &&
      typeof (item as WriterDraftSnapshot).bookId === 'string' &&
      typeof (item as WriterDraftSnapshot).id === 'string' &&
      typeof (item as WriterDraftSnapshot).title === 'string' &&
      typeof (item as WriterDraftSnapshot).content === 'string' &&
      ((item as WriterDraftSnapshot).chapterId === null || typeof (item as WriterDraftSnapshot).chapterId === 'string') &&
      Number.isInteger((item as WriterDraftSnapshot).chapterNumber) &&
      ['draft', 'ready'].includes((item as WriterDraftSnapshot).status)
    );
  } catch {
    return [];
  }
}

export function getWriterDraftSnapshot(
  userId: string,
  bookId: string,
  chapterId: string | null
): WriterDraftSnapshot | null {
  return getAllWriterDraftSnapshots(userId).find(
    (snapshot) => snapshot.bookId === bookId && snapshot.chapterId === chapterId
  ) || null;
}

export function saveWriterDraftSnapshot(snapshot: WriterDraftSnapshot): boolean {
  try {
    if (
      typeof localStorage === 'undefined' ||
      !snapshot.userId ||
      !snapshot.bookId ||
      snapshot.bookId.length > 128 ||
      (snapshot.chapterId !== null && (!snapshot.chapterId || snapshot.chapterId.length > 128)) ||
      !Number.isInteger(snapshot.chapterNumber) ||
      snapshot.chapterNumber <= 0 ||
      snapshot.title.length > 300 ||
      snapshot.content.length > MAX_WRITER_DRAFT_CONTENT_CHARS ||
      !['draft', 'ready'].includes(snapshot.status)
    ) return false;

    const all = getAllWriterDraftSnapshots(snapshot.userId);
    const ordered = [
      ...all.filter((item) => !(item.bookId === snapshot.bookId && item.chapterId === snapshot.chapterId)),
      snapshot,
    ].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));

    const next: WriterDraftSnapshot[] = [];
    let totalChars = 0;
    for (const item of ordered) {
      if (next.length >= MAX_WRITER_DRAFT_SNAPSHOTS) break;
      if (totalChars + item.content.length > MAX_WRITER_DRAFT_TOTAL_CHARS) continue;
      next.push(item);
      totalChars += item.content.length;
    }

    localStorage.setItem(getWriterDraftStorageKey(snapshot.userId), JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function removeWriterDraftSnapshot(
  userId: string,
  bookId: string,
  chapterId: string | null
): boolean {
  try {
    if (!userId || typeof localStorage === 'undefined') return false;
    const next = getAllWriterDraftSnapshots(userId).filter(
      (snapshot) => !(snapshot.bookId === bookId && snapshot.chapterId === chapterId)
    );
    localStorage.setItem(getWriterDraftStorageKey(userId), JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function removeWriterDraftSnapshotsForBook(userId: string, bookId: string): boolean {
  try {
    if (!userId || typeof localStorage === 'undefined') return false;
    const next = getAllWriterDraftSnapshots(userId).filter((snapshot) => snapshot.bookId !== bookId);
    localStorage.setItem(getWriterDraftStorageKey(userId), JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
