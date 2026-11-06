export type LibrarySelectionRow = Record<string, unknown> & {
  book_id: string;
  title: string;
  n_words: number;
  n_chapters: number;
  category_main: string;
};

export type LibrarySelectionManifest = {
  syncEnabled?: boolean;
  editoriallyApprovedSourceIds?: string[];
  targetBooks: number;
  minimumBooks: number;
  minimumWords: number;
  maximumWordsPerBook: number;
  minimumChapters: number;
  maximumTotalWords: number;
  targetWordsPerBook?: number;
  categories: Array<{ id: string; quota: number }>;
  fallbackCategories?: string[];
};

export function selectBooks(
  metadata: LibrarySelectionRow[],
  manifest: LibrarySelectionManifest
): LibrarySelectionRow[];
