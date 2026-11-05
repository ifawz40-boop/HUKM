import type { ReaderAnnotation } from '../types/hukm';

export const MAX_READER_ANNOTATIONS_PER_CHAPTER = 100;

export function notifyReaderAnnotationsChanged(userId?: string): void {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent('hukm:reader-annotations-updated', {
    detail: { userId: userId || null },
  }));
}

export function getReaderAnnotationStorageKey(userId?: string): string {
  return userId
    ? `hukm_user_${userId}_reader_annotations_v1`
    : 'hukm_guest_reader_annotations_v1';
}

export interface ReaderAnnotationOffsets {
  selectedText: string;
  startOffset: number;
  endOffset: number;
}

/** Convert a DOM Range prefix and raw selection into a verifiable paragraph anchor. */
export function getReaderAnnotationOffsets(
  paragraphText: string,
  prefixText: string,
  rawSelectedText: string
): ReaderAnnotationOffsets | null {
  const selectedText = rawSelectedText.trim();
  if (!selectedText || selectedText.length > 2000) return null;

  const leadingTrim = rawSelectedText.length - rawSelectedText.trimStart().length;
  const startOffset = prefixText.length + leadingTrim;
  const endOffset = startOffset + selectedText.length;

  if (
    startOffset < 0 ||
    endOffset > paragraphText.length ||
    paragraphText.slice(startOffset, endOffset) !== selectedText
  ) return null;

  return { selectedText, startOffset, endOffset };
}

export function createReaderAnnotationId(): string {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
  return `ann_${randomPart}`;
}

/** Read only the annotation partition owned by this user or the guest session. */
export function getAllReaderAnnotations(userId?: string): ReaderAnnotation[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(getReaderAnnotationStorageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ReaderAnnotation =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as ReaderAnnotation).id === 'string' &&
      typeof (item as ReaderAnnotation).bookId === 'string' &&
      typeof (item as ReaderAnnotation).chapterId === 'string' &&
      typeof (item as ReaderAnnotation).selectedText === 'string'
    );
  } catch {
    return [];
  }
}

export function saveAllReaderAnnotations(
  annotations: ReaderAnnotation[],
  userId?: string
): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(getReaderAnnotationStorageKey(userId), JSON.stringify(annotations));
    return true;
  } catch {
    return false;
  }
}

export function getReaderAnnotationsForChapter(
  bookId: string,
  chapterId: string,
  userId?: string
): ReaderAnnotation[] {
  return getAllReaderAnnotations(userId).filter(
    (annotation) => annotation.bookId === bookId && annotation.chapterId === chapterId
  );
}

export function upsertReaderAnnotationLocal(
  annotation: ReaderAnnotation,
  userId?: string
): ReaderAnnotation[] {
  const all = getAllReaderAnnotations(userId);
  const next = [...all.filter((item) => item.id !== annotation.id), annotation];
  if (saveAllReaderAnnotations(next, userId)) notifyReaderAnnotationsChanged(userId);
  return next;
}

export function removeReaderAnnotationLocal(
  annotationId: string,
  userId?: string
): ReaderAnnotation[] {
  const next = getAllReaderAnnotations(userId).filter((item) => item.id !== annotationId);
  if (saveAllReaderAnnotations(next, userId)) notifyReaderAnnotationsChanged(userId);
  return next;
}

/**
 * Merge local-first records with the cloud snapshot. Pending local edits win when
 * newer; cloud records are marked synced. The caller keeps unrelated chapters.
 */
export function mergeReaderAnnotations(
  localAnnotations: ReaderAnnotation[],
  cloudAnnotations: ReaderAnnotation[]
): ReaderAnnotation[] {
  const merged = new Map<string, ReaderAnnotation>();

  for (const cloud of cloudAnnotations) {
    merged.set(cloud.id, { ...cloud, syncStatus: 'synced' });
  }

  for (const local of localAnnotations) {
    const cloud = merged.get(local.id);
    const localTime = Date.parse(local.updatedAt || local.createdAt || '') || 0;
    const cloudTime = cloud ? (Date.parse(cloud.updatedAt || cloud.createdAt || '') || 0) : -1;

    if (!cloud || local.syncStatus === 'pending' || localTime > cloudTime) {
      merged.set(local.id, local);
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    String(a.createdAt).localeCompare(String(b.createdAt))
  );
}
