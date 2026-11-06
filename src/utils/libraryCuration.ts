export interface LibraryCandidateSearchRecord {
  id: string;
  title: string;
  author: string;
  category: string;
  status: string;
  edition?: string;
  reason?: string;
}

export interface LibraryCandidateFilters {
  query?: string;
  category?: string;
  status?: string;
}

export function isSafeExternalUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export function filterLibraryCandidates<T extends LibraryCandidateSearchRecord>(
  candidates: readonly T[],
  filters: LibraryCandidateFilters = {},
): T[] {
  const normalizedQuery = (filters.query || '').trim().toLocaleLowerCase();
  const category = filters.category || 'all';
  const status = filters.status || 'all';

  return candidates.filter((book) => {
    const matchesCategory = category === 'all' || book.category === category;
    const matchesStatus = status === 'all' || book.status === status;
    const searchable = [book.title, book.author, book.edition || '', book.reason || '', book.id]
      .join(' ')
      .toLocaleLowerCase();
    return matchesCategory && matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}
