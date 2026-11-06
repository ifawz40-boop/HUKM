const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.5;
const MAX_NOTE_LENGTH = 5_000;

export interface PdfReaderProgress {
  page: number;
  zoom: number;
  fitToWidth: boolean;
  bookmarks: number[];
  notes: Record<string, string>;
}

export function getPdfReaderProgressKey(documentId: string, userId?: string | null): string {
  const owner = userId?.trim() || 'guest';
  return `hukm:pdf-reader:v1:${encodeURIComponent(documentId)}:${encodeURIComponent(owner)}`;
}

export function clampPdfPage(value: number, totalPages: number): number {
  const maxPage = Number.isFinite(totalPages) && totalPages > 0
    ? Math.floor(totalPages)
    : 1;
  const page = Number.isFinite(value) ? Math.trunc(value) : 1;
  return Math.min(Math.max(page, 1), maxPage);
}

export function clampPdfZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

export function normalizePdfBookmarks(value: unknown, totalPages: number): number[] {
  if (!Array.isArray(value)) return [];
  const maxPage = Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 1;
  return [...new Set(value
    .map(Number)
    .filter((page) => Number.isInteger(page) && page >= 1 && page <= maxPage))]
    .sort((a, b) => a - b);
}

export function normalizePdfNotes(value: unknown, totalPages: number): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const maxPage = Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 1;
  const notes: Record<string, string> = {};

  for (const [key, rawNote] of Object.entries(value)) {
    const page = Number(key);
    if (!Number.isInteger(page) || page < 1 || page > maxPage || typeof rawNote !== 'string') continue;
    const note = rawNote.trim().slice(0, MAX_NOTE_LENGTH);
    if (note) notes[String(page)] = note;
  }

  return notes;
}

export function parsePdfReaderProgress(raw: string | null, totalPages: number): PdfReaderProgress {
  if (!raw) return { page: 1, zoom: 1, fitToWidth: true, bookmarks: [], notes: {} };
  try {
    const value = JSON.parse(raw) as Partial<PdfReaderProgress>;
    return {
      page: clampPdfPage(Number(value.page), totalPages),
      zoom: clampPdfZoom(Number(value.zoom)),
      fitToWidth: typeof value.fitToWidth === 'boolean' ? value.fitToWidth : true,
      bookmarks: normalizePdfBookmarks(value.bookmarks, totalPages),
      notes: normalizePdfNotes(value.notes, totalPages),
    };
  } catch {
    return { page: 1, zoom: 1, fitToWidth: true, bookmarks: [], notes: {} };
  }
}

export function serializePdfReaderProgress(
  page: number,
  zoom: number,
  fitToWidth = true,
  bookmarks: readonly number[] = [],
  notes: Record<string, string> = {}
): string {
  return JSON.stringify({
    page: Math.max(1, Math.trunc(Number.isFinite(page) ? page : 1)),
    zoom: clampPdfZoom(zoom),
    fitToWidth,
    bookmarks: normalizePdfBookmarks(bookmarks, Number.MAX_SAFE_INTEGER),
    notes: normalizePdfNotes(notes, Number.MAX_SAFE_INTEGER),
  });
}

export function normalizePdfSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ar');
}

export async function searchPdfPages(
  totalPages: number,
  query: string,
  getPageText: (pageNumber: number) => Promise<string>,
  onProgress?: (completed: number, total: number) => void,
  signal?: AbortSignal
): Promise<number[]> {
  const normalizedQuery = normalizePdfSearchText(query);
  if (!normalizedQuery) return [];

  const results: number[] = [];
  const pageCount = Number.isFinite(totalPages) && totalPages > 0
    ? Math.floor(totalPages)
    : 0;

  for (let page = 1; page <= pageCount; page += 1) {
    if (signal?.aborted) throw new DOMException('Search aborted', 'AbortError');
    const text = await getPageText(page);
    if (normalizePdfSearchText(text).includes(normalizedQuery)) results.push(page);
    onProgress?.(page, pageCount);
  }

  return results;
}
