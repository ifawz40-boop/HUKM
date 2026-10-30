import { Novel, Chapter } from '../types/novel';

/**
 * Calculates estimated reading time in minutes based on word count.
 * Average Arabic reading speed is ~160-200 words per minute.
 */
export function calculateReadingTimeMinutes(wordCount: number, wordsPerMinute = 180): number {
  if (wordCount <= 0) return 1;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(1, minutes);
}

/**
 * Formats numbers into clean Arabic readable metrics (e.g. 1.2 ألف, 450)
 */
export function formatArabicNumber(num: number): string {
  if (num >= 1000000) {
    const formatted = (num / 1000000).toFixed(1).replace(/\.0$/, '');
    return `${formatted} مليون`;
  }
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${formatted} ألف`;
  }
  return num.toLocaleString('ar-EG');
}

/**
 * Calculates reading progress percentage clamped between 0 and 100
 */
export function calculateProgress(currentChapterNum: number, totalChapters: number): number {
  if (totalChapters <= 0) return 0;
  if (currentChapterNum <= 0) return 0;
  const pct = Math.round((currentChapterNum / totalChapters) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Finds previous and next chapters safely from chapter lists
 */
export function getNextAndPrevChapter(
  currentChapterNumber: number,
  chapters: { chapterNumber: number; id: string; title: string }[]
): {
  prev: { chapterNumber: number; id: string; title: string } | null;
  next: { chapterNumber: number; id: string; title: string } | null;
} {
  const sorted = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  const currentIndex = sorted.findIndex((c) => c.chapterNumber === currentChapterNumber);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  const prev = currentIndex > 0 ? sorted[currentIndex - 1] : null;
  const next = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

  return { prev, next };
}

/**
 * Filters and sorts novels based on search query, genre, status and sort mode
 */
export function filterAndSortNovels(
  novels: Novel[],
  options: {
    query?: string;
    genre?: string;
    status?: string;
    sortBy?: 'trending' | 'latest' | 'rating' | 'chapters';
  }
): Novel[] {
  const { query, genre, status, sortBy = 'trending' } = options;

  let result = [...novels];

  if (query && query.trim().length > 0) {
    const cleanQuery = query.trim().toLowerCase();
    result = result.filter(
      (n) =>
        n.title.toLowerCase().includes(cleanQuery) ||
        (n.titleOriginal || n.titleEnglish || '').toLowerCase().includes(cleanQuery) ||
        n.author.toLowerCase().includes(cleanQuery) ||
        n.translator.toLowerCase().includes(cleanQuery) ||
        n.genres.some((g) => g.toLowerCase().includes(cleanQuery))
    );
  }

  if (genre && genre !== 'all' && genre !== 'الكل') {
    result = result.filter((n) => n.genres.includes(genre));
  }

  if (status && status !== 'all' && status !== 'الكل') {
    result = result.filter((n) => n.status === status);
  }

  // Sorting
  result.sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'latest':
        return b.latestChapter.number - a.latestChapter.number;
      case 'chapters':
        return b.chaptersCount - a.chaptersCount;
      case 'trending':
      default:
        return b.views - a.views;
    }
  });

  return result;
}

/**
 * Filter chapters by number or search string
 */
export function searchChapters(chapters: Chapter[], query: string): Chapter[] {
  if (!query || !query.trim()) return chapters;
  const q = query.trim().toLowerCase();
  const num = parseInt(q, 10);

  return chapters.filter((c) => {
    if (!isNaN(num) && c.chapterNumber === num) return true;
    return c.title.toLowerCase().includes(q) || `فصل ${c.chapterNumber}`.includes(q);
  });
}
