import type { BookProject, CategoryItem } from '../../types/hukm';

export const PUBLIC_LIBRARY_CATEGORIES: CategoryItem[] = [
  { id: 'history', name: 'التاريخ', description: 'كتب التاريخ والحضارات' },
  { id: 'literature', name: 'الأدب', description: 'الأدب والنصوص والآثار' },
  { id: 'detective.fiction', name: 'الأدب البوليسي', description: 'الألغاز والتحقيقات' },
  { id: 'novels', name: 'الروايات', description: 'الرواية والأدب القصصي' },
  { id: 'biographies', name: 'السير والتراجم', description: 'السير الذاتية والتراجم' },
  { id: 'children.stories', name: 'قصص الأطفال', description: 'القصص الموجهة للأطفال والناشئة' },
  { id: 'science', name: 'العلوم', description: 'العلوم والمعرفة' },
  { id: 'philosophy', name: 'الفلسفة', description: 'الفكر والفلسفة' },
  { id: 'travel', name: 'الرحلات', description: 'أدب الرحلات والأسفار' },
  { id: 'social_sciences', name: 'العلوم الاجتماعية', description: 'المجتمع والإنسان' },
  { id: 'religion', name: 'الدراسات الدينية', description: 'الدراسات والموضوعات الدينية' },
  { id: 'other', name: 'متنوع', description: 'موضوعات متنوعة' },
];

const catalogModules = import.meta.glob('./catalog.json', {
  eager: true,
  import: 'default',
}) as Record<string, BookProject[]>;

export const PUBLIC_LIBRARY_BOOKS: BookProject[] = (
  catalogModules['./catalog.json'] || []
).filter((book) => book && book.id && book.title && Array.isArray(book.chapters));

const bookLoaders = import.meta.glob('./books/*.json') as Record<
  string,
  () => Promise<{ default: BookProject }>
>;

export async function loadPublicLibraryBook(bookId: string): Promise<BookProject> {
  const loader = bookLoaders[`./books/${bookId}.json`];
  if (!loader) {
    throw new Error(`The bundled book "${bookId}" is not present in the static library.`);
  }
  const module = await loader();
  const book = module.default;
  if (!book || book.id !== bookId || !Array.isArray(book.chapters) || book.chapters.length === 0) {
    throw new Error(`The bundled book "${bookId}" failed its content integrity check.`);
  }
  return book;
}

export const PUBLIC_LIBRARY_SOURCE = {
  name: 'Bayanat Labs — Open Arabic Books',
  version: '0.1.0',
  datasetUrl: 'https://huggingface.co/datasets/Bayanat-Labs/open-arabic-books',
  license: 'Per-book rights: CC BY 4.0 Arabic translation or public-domain original (see each book metadata)',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
} as const;
