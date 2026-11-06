import type { BookRights, BookSourcePage } from '../types/hukm';

type BookSourceDescriptor = Pick<BookRights, 'sourceUrl' | 'publisher'> & {
  sourceNameAr?: string;
};

const SOURCE_HOST_LABELS: Record<string, string> = {
  'ar.wikisource.org': 'ويكي مصدر',
  'commons.wikimedia.org': 'ويكيميديا كومنز',
  'archive.org': 'Internet Archive',
  'openlibrary.org': 'Open Library',
};

const normalizedLabel = (value?: string | null): string =>
  typeof value === 'string' ? value.trim() : '';

export function getBookSourceName(source: BookSourceDescriptor): string {
  const explicitArabicName = normalizedLabel(source.sourceNameAr);
  if (explicitArabicName) return explicitArabicName;

  const publisher = normalizedLabel(source.publisher);
  if (publisher) {
    return publisher.toLowerCase() === 'hindawi foundation' ? 'مؤسسة هنداوي' : publisher;
  }

  try {
    const hostname = new URL(source.sourceUrl).hostname.toLowerCase();
    return SOURCE_HOST_LABELS[hostname] || hostname.replace(/^www\./, '');
  } catch {
    return 'المصدر الأصلي';
  }
}

export function getBookSourceLinkLabel(source: BookSourceDescriptor): string {
  const explicitArabicName = normalizedLabel(source.sourceNameAr);
  const publisher = normalizedLabel(source.publisher);

  if (explicitArabicName || publisher) {
    return `صفحة الكتاب لدى ${getBookSourceName(source)}`;
  }

  try {
    const hostname = new URL(source.sourceUrl).hostname.toLowerCase();
    if (hostname === 'ar.wikisource.org') return 'صفحة العمل في ويكي مصدر';
    if (hostname === 'commons.wikimedia.org') return 'ملف المصدر على ويكيميديا كومنز';
    if (hostname === 'archive.org') return 'صفحة المصدر في Internet Archive';
    if (hostname === 'openlibrary.org') return 'صفحة الكتاب في Open Library';
  } catch {
    // Invalid or absent URLs use a neutral label.
  }

  return 'صفحة المصدر';
}

export interface SourcePageDisclosure<T extends BookSourcePage = BookSourcePage> {
  visiblePages: T[];
  totalCount: number;
  visibleCount: number;
  isPartial: boolean;
}

export function getSourcePageDisclosure<T extends BookSourcePage>(
  pages: readonly T[] | null | undefined,
  requestedLimit = 12
): SourcePageDisclosure<T> {
  const sourcePages = Array.isArray(pages) ? [...pages] : [];
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.floor(requestedLimit)
    : 12;
  const visiblePages = sourcePages.slice(0, limit);

  return {
    visiblePages,
    totalCount: sourcePages.length,
    visibleCount: visiblePages.length,
    isPartial: visiblePages.length < sourcePages.length,
  };
}
