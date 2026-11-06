const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.5;

export interface PdfReaderProgress {
  page: number;
  zoom: number;
  fitToWidth: boolean;
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

export function parsePdfReaderProgress(raw: string | null, totalPages: number): PdfReaderProgress {
  if (!raw) return { page: 1, zoom: 1, fitToWidth: true };
  try {
    const value = JSON.parse(raw) as Partial<PdfReaderProgress>;
    return {
      page: clampPdfPage(Number(value.page), totalPages),
      zoom: clampPdfZoom(Number(value.zoom)),
      fitToWidth: typeof value.fitToWidth === 'boolean' ? value.fitToWidth : true,
    };
  } catch {
    return { page: 1, zoom: 1, fitToWidth: true };
  }
}

export function serializePdfReaderProgress(page: number, zoom: number, fitToWidth = true): string {
  return JSON.stringify({
    page: Math.max(1, Math.trunc(Number.isFinite(page) ? page : 1)),
    zoom: clampPdfZoom(zoom),
    fitToWidth,
  });
}
