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
  { id: 'travel.literature', name: 'الرحلات', description: 'أدب الرحلات والأسفار' },
  { id: 'social.sciences', name: 'العلوم الاجتماعية', description: 'المجتمع والإنسان' },
  { id: 'religions', name: 'الدراسات الدينية', description: 'الدراسات والموضوعات الدينية' },
  { id: 'other', name: 'متنوع', description: 'موضوعات متنوعة' },
];

const catalogModules = import.meta.glob('./catalog.json', {
  eager: true,
  import: 'default',
}) as Record<string, BookProject[]>;

export const PUBLIC_LIBRARY_BOOKS: BookProject[] = (
  catalogModules['./catalog.json'] || []
).filter((book) => book && book.id && book.title && Array.isArray(book.chapters));

const bookAssetUrls = import.meta.glob('./books/*.json', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const loadedBooks = new Map<string, BookProject>();
const pendingBookLoads = new Map<string, Promise<BookProject>>();

export async function loadPublicLibraryBook(bookId: string): Promise<BookProject> {
  const cachedBook = loadedBooks.get(bookId);
  if (cachedBook) return cachedBook;

  const pendingRequest = pendingBookLoads.get(bookId);
  if (pendingRequest) return pendingRequest;

  const assetUrl = bookAssetUrls[`./books/${bookId}.json`];
  if (!assetUrl) {
    throw new Error(`The static book asset "${bookId}" is not present in the library.`);
  }

  const request = (async () => {
    const response = await fetch(assetUrl);
    if (!response.ok) {
      throw new Error(`The static book asset "${bookId}" could not be loaded (HTTP ${response.status}).`);
    }

    const book = await response.json() as BookProject;
    if (!book || book.id !== bookId || !Array.isArray(book.chapters) || book.chapters.length === 0) {
      throw new Error(`The static book asset "${bookId}" failed its content integrity check.`);
    }

    loadedBooks.set(bookId, book);
    return book;
  })();

  pendingBookLoads.set(bookId, request);
  try {
    return await request;
  } finally {
    if (pendingBookLoads.get(bookId) === request) {
      pendingBookLoads.delete(bookId);
    }
  }
}

export const PUBLIC_LIBRARY_SOURCE = {
  name: 'Bayanat Labs — Open Arabic Books',
  version: '0.1.0',
  datasetUrl: 'https://huggingface.co/datasets/Bayanat-Labs/open-arabic-books',
  license: 'Dataset metadata: CC BY 4.0; book texts follow per-book rights metadata',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
} as const;
