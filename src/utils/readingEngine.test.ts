import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateReadingTimeMinutes,
  formatArabicNumber,
  calculateProgress,
  getNextAndPrevChapter,
  filterAndSortNovels,
  searchChapters,
} from './readingEngine';
import { Novel, Chapter } from '../types/novel';

test('calculateReadingTimeMinutes: calculates time correctly based on word count', () => {
  assert.equal(calculateReadingTimeMinutes(0), 1);
  assert.equal(calculateReadingTimeMinutes(150), 1);
  assert.equal(calculateReadingTimeMinutes(360, 180), 2);
  assert.equal(calculateReadingTimeMinutes(540, 180), 3);
});

test('formatArabicNumber: formats small and large metrics into Arabic readable text', () => {
  assert.equal(formatArabicNumber(450), (450).toLocaleString('ar-EG'));
  assert.equal(formatArabicNumber(1500), '1.5 ألف');
  assert.equal(formatArabicNumber(20000), '20 ألف');
  assert.equal(formatArabicNumber(2500000), '2.5 مليون');
});

test('calculateProgress: calculates clamped progress percentage', () => {
  assert.equal(calculateProgress(0, 100), 0);
  assert.equal(calculateProgress(25, 100), 25);
  assert.equal(calculateProgress(50, 200), 25);
  assert.equal(calculateProgress(120, 100), 100);
});

test('getNextAndPrevChapter: correctly determines previous and next chapters', () => {
  const chapters = [
    { chapterNumber: 1, id: 'ch-1', title: 'البداية' },
    { chapterNumber: 2, id: 'ch-2', title: 'الدفتر القديم' },
    { chapterNumber: 3, id: 'ch-3', title: 'جرعة الساحر' },
  ];

  // At chapter 1: no previous, next is 2
  const ch1Nav = getNextAndPrevChapter(1, chapters);
  assert.equal(ch1Nav.prev, null);
  assert.equal(ch1Nav.next?.chapterNumber, 2);

  // At chapter 2: prev is 1, next is 3
  const ch2Nav = getNextAndPrevChapter(2, chapters);
  assert.equal(ch2Nav.prev?.chapterNumber, 1);
  assert.equal(ch2Nav.next?.chapterNumber, 3);

  // At chapter 3: prev is 2, next is null
  const ch3Nav = getNextAndPrevChapter(3, chapters);
  assert.equal(ch3Nav.prev?.chapterNumber, 2);
  assert.equal(ch3Nav.next, null);

  // Non-existent chapter
  const unknownNav = getNextAndPrevChapter(999, chapters);
  assert.equal(unknownNav.prev, null);
  assert.equal(unknownNav.next, null);
});

test('filterAndSortNovels: filters by search, genre and status', () => {
  const mockNovels: Novel[] = [
    {
      id: 'lord-of-truth',
      title: 'لورد الحقيقة',
      titleOriginal: 'Lord of Truth',
      cover: '/covers/lot.jpg',
      author: 'حبار لا يغوص',
      translator: 'فريق الحقيقة',
      status: 'ONGOING',
      rating: 4.9,
      ratingCount: 1540,
      views: 95000,
      bookmarksCount: 8200,
      genres: ['فانتازيا', 'غموض', 'تناسخ'],
      synopsis: 'قصة كلاين موريتي في عالم البخار والسحر.',
      year: 2021,
      latestChapter: { number: 2450, title: 'الفصل 2450', releaseDate: '2026-10-27' },
      chaptersCount: 2450,
    },
    {
      id: 'shadow-chaos',
      title: 'ظل الفوضى',
      titleOriginal: 'Shadow of Chaos',
      cover: '/covers/chaos.jpg',
      author: 'كاتب الظل',
      translator: 'مترجم الفجر',
      status: 'COMPLETED',
      rating: 4.7,
      ratingCount: 820,
      views: 42000,
      bookmarksCount: 3100,
      genres: ['أكشن', 'خيال علمي'],
      synopsis: 'معارك الفضاء والمستقبل.',
      year: 2023,
      latestChapter: { number: 450, title: 'الفصل الأخير', releaseDate: '2025-01-10' },
      chaptersCount: 450,
    },
  ];

  // Search by title
  const searchResults = filterAndSortNovels(mockNovels, { query: 'الحقيقة' });
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, 'lord-of-truth');

  // Filter by genre
  const genreResults = filterAndSortNovels(mockNovels, { genre: 'أكشن' });
  assert.equal(genreResults.length, 1);
  assert.equal(genreResults[0].id, 'shadow-chaos');

  // Filter by status
  const completedResults = filterAndSortNovels(mockNovels, { status: 'COMPLETED' });
  assert.equal(completedResults.length, 1);
  assert.equal(completedResults[0].id, 'shadow-chaos');
});

test('searchChapters: searches by chapter number or title keyword', () => {
  const mockChapters: Chapter[] = [
    {
      id: 'c1',
      novelId: 'n1',
      chapterNumber: 1,
      title: 'الاستيقاظ في الضباب',
      releaseDate: '2026-01-01',
      wordCount: 1200,
      content: ['الفقرة الأولى'],
      views: 120,
      likes: 10,
    },
    {
      id: 'c2',
      novelId: 'n1',
      chapterNumber: 2,
      title: 'جرعة العرّاف',
      releaseDate: '2026-01-02',
      wordCount: 1400,
      content: ['الفقرة الثانية'],
      views: 95,
      likes: 8,
    },
  ];

  // Search by number '2'
  assert.equal(searchChapters(mockChapters, '2').length, 1);
  assert.equal(searchChapters(mockChapters, '2')[0].chapterNumber, 2);

  // Search by title 'الضباب'
  assert.equal(searchChapters(mockChapters, 'الضباب').length, 1);
  assert.equal(searchChapters(mockChapters, 'الضباب')[0].chapterNumber, 1);
});
