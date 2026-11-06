export const HUKM_ALLOWED_BOOK_CATEGORIES = ['religious', 'self-development', 'travel', 'islamic-philosophy-critique'] as const;
export type HukmAllowedBookCategory = typeof HUKM_ALLOWED_BOOK_CATEGORIES[number];
export interface CuratableBook { id: string; category: string; }
export function selectCuratedPublicBooks<T extends CuratableBook>(books: readonly T[], approvedBookIds: ReadonlySet<string>): T[] {
  const allowed = new Set<string>(HUKM_ALLOWED_BOOK_CATEGORIES);
  return books.filter((book) => Boolean(book?.id) && approvedBookIds.has(book.id) && allowed.has(book.category));
}
