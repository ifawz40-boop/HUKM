import { BookProject, BookChapter, CategoryItem, PublishingStatus } from '../types/hukm';

/**
 * Calculates words count from Arabic text array or string
 */
export function calculateWordsCount(text: string | string[]): number {
  if (Array.isArray(text)) {
    return text.reduce((acc, p) => acc + calculateWordsCount(p), 0);
  }
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Calculates estimated reading time (approx 160 words/min in Arabic)
 */
export function calculateReadingTimeMinutes(wordsCount: number, wpm = 160): number {
  if (wordsCount <= 0) return 1;
  return Math.max(1, Math.ceil(wordsCount / wpm));
}

/**
 * Calculates book completion statistics and views
 */
export function calculateBookStats(chapters: BookChapter[], fallbackBookViews = 0) {
  const totalWords = chapters.reduce((acc, c) => acc + (c.wordCount || calculateWordsCount(c.content)), 0);
  const totalTime = calculateReadingTimeMinutes(totalWords);
  const readyChapters = chapters.filter((c) => c.status === 'ready').length;
  const progressPercentage = chapters.length > 0 ? Math.round((readyChapters / chapters.length) * 100) : 0;
  const totalViews = chapters.reduce((acc, c) => acc + (c.viewsCount || 0), 0) || fallbackBookViews;

  return {
    chaptersCount: chapters.length,
    readyChapters,
    totalWords,
    totalReadingTimeMinutes: totalTime,
    progressPercentage,
    totalViews,
  };
}

/**
 * Increments chapter and book views starting from custom baseline
 */
export function incrementBookViews(book: BookProject, chapterId: string): BookProject {
  let updatedAny = false;
  const updatedChapters = book.chapters.map((ch) => {
    if (ch.id === chapterId) {
      updatedAny = true;
      const current = ch.viewsCount !== undefined ? ch.viewsCount : 1500;
      return {
        ...ch,
        viewsCount: current + 1,
      };
    }
    return ch;
  });

  const sumViews = updatedChapters.reduce((acc, c) => acc + (c.viewsCount || 0), 0);

  return {
    ...book,
    chapters: updatedChapters,
    viewsCount: sumViews > 0 ? sumViews : (book.viewsCount || 0) + 1,
  };
}

/**
 * Dynamic Categories Management
 */
export function addCategory(
  categories: CategoryItem[],
  newCat: { name: string; description?: string }
): CategoryItem[] {
  if (!newCat.name || !newCat.name.trim()) return categories;
  const id = `cat-${Date.now()}`;
  return [
    ...categories,
    {
      id,
      name: newCat.name.trim(),
      description: newCat.description?.trim() || '',
    },
  ];
}

export function deleteCategory(categories: CategoryItem[], categoryId: string): CategoryItem[] {
  return categories.filter((c) => c.id !== categoryId);
}

export function getCategoryName(categories: CategoryItem[], categoryId: string): string {
  const found = categories.find((c) => c.id === categoryId);
  if (found) return found.name;
  if (categoryId === 'all' || categoryId === 'الكل') return 'كافة المشاريع المعرفية';
  return categoryId;
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'investigations':
      return 'سلسلة «مش زي ما إنت فاكر»';
    case 'science_tech':
      return 'العلوم والتكنولوجيا';
    case 'history':
      return 'التاريخ والوثائقيات';
    case 'philosophy':
      return 'الفلسفة والتفكير النقدي';
    default:
      return category || 'كافة المشاريع المعرفية';
  }
}

/**
 * Filter and sort book projects
 */
export function filterBooks(
  books: BookProject[],
  options: {
    query?: string;
    category?: string;
    status?: PublishingStatus | string;
  }
): BookProject[] {
  const { query, category, status } = options;
  let result = [...books];

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    result = result.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.subtitle.toLowerCase().includes(q) ||
        b.summary.toLowerCase().includes(q) ||
        b.chapters.some((c) => c.title.toLowerCase().includes(q))
    );
  }

  if (category && category !== 'all' && category !== 'الكل') {
    result = result.filter((b) => b.category === category);
  }

  if (status && status !== 'all' && status !== 'الكل') {
    result = result.filter((b) => b.status === status);
  }

  return result;
}

/**
 * Generates clean formatted text/markdown for exporting a book or chapter
 */
export function generateExportText(book: BookProject, chapterId?: string): string {
  if (chapterId) {
    const chapter = book.chapters.find((c) => c.id === chapterId);
    if (!chapter) return '';
    return [
      `# ${book.title}`,
      `## ${chapter.title}`,
      chapter.subtitle ? `### ${chapter.subtitle}\n` : '',
      ...chapter.content,
      '',
      chapter.references && chapter.references.length > 0
        ? `\n### المراجع والمصادر:\n` + chapter.references.map((r, i) => `${i + 1}. ${r}`).join('\n')
        : '',
      `\n---\nحُكم | HUKM MEDIA - نبحث، نفكك، ونفهم.`,
    ].filter(Boolean).join('\n\n');
  }

  // Full book export
  const sections = [
    `# كتاب: ${book.title}`,
    `## ${book.subtitle}`,
    `> ${book.summary}`,
    `\n«${book.motto || 'وعشان الموضوع مش زي ما إنت فاكر… تعالى نعرف.'}»\n`,
    `---`,
  ];

  book.chapters.forEach((ch) => {
    sections.push(`\n## الفصل ${ch.chapterNumber}: ${ch.title}`);
    if (ch.subtitle) sections.push(`*${ch.subtitle}*`);
    sections.push(ch.content.join('\n\n'));
  });

  if (book.sources && book.sources.length > 0) {
    sections.push('\n## قائمة المراجع والمصادر المعتمدة:');
    book.sources.forEach((s, idx) => {
      sections.push(`${idx + 1}. **${s.title}** - ${s.author} (${s.year || 'وثيقة'})`);
    });
  }

  sections.push(`\n---\nجميع الحقوق محفوظة © حُكم | HUKM MEDIA`);
  return sections.join('\n\n');
}
