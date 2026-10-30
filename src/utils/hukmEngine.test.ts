import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWordsCount,
  calculateReadingTimeMinutes,
  calculateBookStats,
  incrementBookViews,
  addCategory,
  deleteCategory,
  getCategoryName,
  filterBooks,
  generateExportText,
} from './hukmEngine';
import { BookProject, BookChapter, CategoryItem } from '../types/hukm';

test('calculateWordsCount: counts words in string and string arrays', () => {
  assert.equal(calculateWordsCount(''), 0);
  assert.equal(calculateWordsCount('حُكم | HUKM MEDIA'), 4);
  assert.equal(
    calculateWordsCount(['العلوم والتكنولوجيا', 'التاريخ والفلسفة نقتفي أثر الأسئلة']),
    7
  );
});

test('calculateReadingTimeMinutes: calculates reading time accurately', () => {
  assert.equal(calculateReadingTimeMinutes(0), 1);
  assert.equal(calculateReadingTimeMinutes(160, 160), 1);
  assert.equal(calculateReadingTimeMinutes(320, 160), 2);
  assert.equal(calculateReadingTimeMinutes(480, 160), 3);
});

test('calculateBookStats: calculates progress percentage and total words', () => {
  const chapters: BookChapter[] = [
    {
      id: 'c1',
      bookId: 'b1',
      chapterNumber: 1,
      title: 'الفصل الأول',
      content: ['الفقرة الأولى', 'الفقرة الثانية'],
      references: [],
      status: 'ready',
      wordCount: 160,
      readingTimeMinutes: 1,
      viewsCount: 2400,
      updatedAt: '2026-10-27',
    },
    {
      id: 'c2',
      bookId: 'b1',
      chapterNumber: 2,
      title: 'الفصل الثاني',
      content: ['مسودة قيد الكتابة'],
      references: [],
      status: 'draft',
      wordCount: 160,
      readingTimeMinutes: 1,
      viewsCount: 1100,
      updatedAt: '2026-10-27',
    },
  ];

  const stats = calculateBookStats(chapters);
  assert.equal(stats.chaptersCount, 2);
  assert.equal(stats.readyChapters, 1);
  assert.equal(stats.progressPercentage, 50);
  assert.equal(stats.totalWords, 320);
  assert.equal(stats.totalViews, 3500);
});

test('incrementBookViews: increments starting from custom baseline views', () => {
  const book: BookProject = {
    id: 'b1',
    title: 'وعشان الموضوع مش زي ما إنت فاكر',
    subtitle: 'تفكيك الخرافات',
    category: 'investigations',
    coverImage: '/cover.jpg',
    status: 'published',
    summary: 'بحث',
    viewsCount: 5000,
    socialLinks: {},
    chapters: [
      {
        id: 'c1',
        bookId: 'b1',
        chapterNumber: 1,
        title: 'كذبة العصور المظلمة',
        content: ['الفقرة الأولى'],
        references: [],
        status: 'ready',
        wordCount: 200,
        readingTimeMinutes: 2,
        viewsCount: 5000, // Custom baseline set by creator!
        updatedAt: '2026-10-27',
      },
    ],
    sources: [],
    quotes: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  // Reader views the chapter
  const updated = incrementBookViews(book, 'c1');
  assert.equal(updated.chapters[0].viewsCount, 5001);
  assert.equal(updated.viewsCount, 5001);

  // Another reader views
  const secondUpdate = incrementBookViews(updated, 'c1');
  assert.equal(secondUpdate.chapters[0].viewsCount, 5002);
});

test('Dynamic Categories: addCategory, deleteCategory and getCategoryName', () => {
  const initialCats: CategoryItem[] = [
    { id: 'cat-1', name: 'العلوم والتكنولوجيا' },
    { id: 'cat-2', name: 'التاريخ' },
  ];

  // Add category
  const added = addCategory(initialCats, { name: 'علم النفس السلوكي', description: 'دراسة الدوافع' });
  assert.equal(added.length, 3);
  assert.equal(added[2].name, 'علم النفس السلوكي');

  // Get name
  assert.equal(getCategoryName(added, 'cat-1'), 'العلوم والتكنولوجيا');

  // Delete category
  const remaining = deleteCategory(added, 'cat-2');
  assert.equal(remaining.length, 2);
  assert.equal(remaining.some((c) => c.id === 'cat-2'), false);
});
