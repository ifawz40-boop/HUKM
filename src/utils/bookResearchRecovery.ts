export interface BookResearchDraftSnapshot {
  bookId: string;
  sources: unknown[];
  quotes: unknown[];
  savedAt: string;
}

export const MAX_RESEARCH_DRAFT_SOURCES = 50;
export const MAX_RESEARCH_DRAFT_QUOTES = 100;
export const MAX_RESEARCH_DRAFT_CHARS = 1_500_000;

export function getBookResearchDraftStorageKey(bookId: string): string {
  return `hukm_book_${bookId}_research_draft_v1`;
}

export function getBookResearchDraft(bookId: string): BookResearchDraftSnapshot | null {
  try {
    if (!bookId || bookId.length > 128 || typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(getBookResearchDraftStorageKey(bookId));
    if (!raw || raw.length > MAX_RESEARCH_DRAFT_CHARS * 2) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const draft = parsed as BookResearchDraftSnapshot;
    if (
      draft.bookId !== bookId ||
      !Array.isArray(draft.sources) ||
      draft.sources.length > MAX_RESEARCH_DRAFT_SOURCES ||
      !Array.isArray(draft.quotes) ||
      draft.quotes.length > MAX_RESEARCH_DRAFT_QUOTES ||
      typeof draft.savedAt !== 'string' ||
      !Number.isFinite(Date.parse(draft.savedAt))
    ) return null;
    const serialized = JSON.stringify(draft);
    if (serialized.length > MAX_RESEARCH_DRAFT_CHARS) return null;
    return draft;
  } catch {
    return null;
  }
}

export function saveBookResearchDraft(draft: BookResearchDraftSnapshot): boolean {
  try {
    if (
      typeof localStorage === 'undefined' ||
      !draft.bookId ||
      draft.bookId.length > 128 ||
      !Array.isArray(draft.sources) ||
      draft.sources.length > MAX_RESEARCH_DRAFT_SOURCES ||
      !Array.isArray(draft.quotes) ||
      draft.quotes.length > MAX_RESEARCH_DRAFT_QUOTES ||
      typeof draft.savedAt !== 'string' ||
      !Number.isFinite(Date.parse(draft.savedAt))
    ) return false;
    const serialized = JSON.stringify(draft);
    if (serialized.length > MAX_RESEARCH_DRAFT_CHARS) return false;
    localStorage.setItem(getBookResearchDraftStorageKey(draft.bookId), serialized);
    return true;
  } catch {
    return false;
  }
}

export function removeBookResearchDraft(bookId: string): boolean {
  try {
    if (!bookId || typeof localStorage === 'undefined') return false;
    localStorage.removeItem(getBookResearchDraftStorageKey(bookId));
    return true;
  } catch {
    return false;
  }
}
