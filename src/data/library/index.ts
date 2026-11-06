import type { BookProject, CategoryItem } from '../../types/hukm';
import { selectCuratedPublicBooks } from './curation';

export const PUBLIC_LIBRARY_CATEGORIES: CategoryItem[] = [
  { id: 'religious', name: 'الكتب الشرعية', description: 'العقيدة والقرآن والحديث والفقه والسيرة والعبادات' },
  { id: 'self-development', name: 'تزكية النفس وتطويرها', description: 'الأخلاق والتربية والانضباط وآداب طلب العلم' },
  { id: 'travel', name: 'الرحلات', description: 'رحلات موثقة نافعة بعد فحص محتواها' },
  { id: 'islamic-philosophy-critique', name: 'نقد الفلسفة إسلاميًا', description: 'نقد الفلسفة والمنطق والمذاهب الفكرية من منظور إسلامي' },
];

const catalogModules = import.meta.glob('./catalog.json', { eager: true, import: 'default' }) as Record<string, BookProject[]>;
const curationModules = import.meta.glob('./curation.json', { eager: true, import: 'default' }) as Record<string, { approvedBookIds?: string[] }>;
const approvedBookIds = new Set(curationModules['./curation.json']?.approvedBookIds || []);

export const PUBLIC_LIBRARY_BOOKS: BookProject[] = selectCuratedPublicBooks(catalogModules['./catalog.json'] || [], approvedBookIds);

const bookAssetUrls = import.meta.glob('./books/*.json', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const loadedBooks = new Map<string, BookProject>();
const pendingBookLoads = new Map<string, Promise<BookProject>>();

export async function loadPublicLibraryBook(bookId: string): Promise<BookProject> {
  const cachedBook = loadedBooks.get(bookId);
  if (cachedBook) return cachedBook;
  const pendingRequest = pendingBookLoads.get(bookId);
  if (pendingRequest) return pendingRequest;
  if (!approvedBookIds.has(bookId)) throw new Error('This book has not passed HUKM editorial approval.');
  const assetUrl = bookAssetUrls[`./books/${bookId}.json`];
  if (!assetUrl) throw new Error('The static book asset is not present in the curated library.');
  const request = (async () => {
    const response = await fetch(assetUrl);
    if (!response.ok) throw new Error(`The static book asset could not be loaded (HTTP ${response.status}).`);
    const book = await response.json() as BookProject;
    if (!book || book.id !== bookId || !Array.isArray(book.chapters) || book.chapters.length === 0) {
      throw new Error('The static book asset failed its content integrity check.');
    }
    const visibleBook = selectCuratedPublicBooks([book], approvedBookIds)[0];
    if (!visibleBook) throw new Error('The book does not match HUKM approved editorial categories.');
    loadedBooks.set(bookId, visibleBook);
    return visibleBook;
  })();
  pendingBookLoads.set(bookId, request);
  try { return await request; }
  finally { if (pendingBookLoads.get(bookId) === request) pendingBookLoads.delete(bookId); }
}

export const PUBLIC_LIBRARY_SOURCE = {
  name: 'حُكم — المكتبة المنتقاة',
  version: '1.0.0',
  datasetUrl: '',
  license: 'تُسجَّل بيانات المصدر والترخيص لكل كتاب بعد اعتماده',
  licenseUrl: '',
} as const;
