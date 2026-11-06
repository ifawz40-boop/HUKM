export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export type NovelStatus = 'ongoing' | 'completed';
export type PublishingStatus = 'published' | 'in_progress' | 'draft' | 'ongoing' | 'completed';

export interface BookFootnote {
  marker: string;
  text: string;
  offset: number | null;
}

export interface BookChapter {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  subtitle?: string;
  content: string[];
  exactDuplicateGroup?: string | null;
  nearDuplicateGroup?: string | null;
  footnotes?: BookFootnote[];
  omittedMedia?: { images: number; svgs: number; tables: number };
  notes?: string;
  references?: string[];
  status: 'draft' | 'ready';
  wordCount: number;
  readingTimeMinutes: number;
  viewsCount: number;
  updatedAt: string;
}

export interface BookDraftChapter extends BookChapter {
  bookId: string;
}

export type MediaType = 'image' | 'gif' | 'video';

export interface ChapterMedia {
  id?: string;
  type?: MediaType;
  url?: string;
  title?: string;
  caption?: string;
  durationSeconds?: number;
  aspectRatio?: string;
  placement?: string;
  loop?: boolean;
  autoplay?: boolean;
  badgeText?: string;
}

export interface BookSourcePage {
  title: string;
  url: string;
  revisionId?: number | null;
  revisionTimestamp?: string | null;
}

export interface BookRights {
  license: string;
  licenseUrl: string;
  attribution: string;
  datasetName: string;
  datasetVersion: string;
  datasetUrl: string;
  dumpDate: string;
  tier: string;
  publicDomainRule?: string;
  authorDeathYear?: number | null;
  latestDeathYear?: number | null;
  sourceUrl: string;
  historyUrl?: string;
  sourcePages: BookSourcePage[];
  sourceLicense: string;
  sourceLicenseUrl: string;
  datasetCitation: string;
  licenseQuote?: string;
  publisher?: string;
  originalTextStatus?: string;
  translationCovered?: boolean;
  credits?: Array<{ role: string; name: string; deathYear: number | null }>;
  translators?: string[];
  editors?: string[];
  sourceHash?: string;
  sourceFile?: string;
  omissions?: { images: number; svgs: number; tables: number };
  nearDuplicateGroup?: string | null;
  bookId?: string;
  hindawiId?: string;
  bookUrl?: string;
  corpusSource?: string;
}

export interface BookProject {
  id: string;
  title: string;
  subtitle?: string;
  author?: string; // Optional author attribution; omitted when not provided
  category: string; // Dynamic Category ID
  coverImage: string;
  coverMediaType?: MediaType;
  status: PublishingStatus;
  summary: string;
  rating?: number;
  motto?: string;
  viewsCount: number;
  wordCount?: number;
  chapterCount?: number;
  chapters: BookChapter[];
  createdAt: string;
  updatedAt: string;
  rights?: BookRights;
  // Optional legacy compatibility
  sources?: any[];
  quotes?: any[];
  socialLinks?: Record<string, string>;
  standaloneEpisode?: any;
}

export interface ReadingProgress {
  bookId: string;
  lastChapterId?: string;
  completedChapterIds: string[];
  lastReadAt: string;
  chapterScrollPositions?: Record<string, number>; // chapterId -> scrollPercent (0 to 100)
}

export interface WriterDraftSnapshot {
  id: string;
  userId: string;
  bookId: string;
  chapterId: string | null;
  chapterNumber: number;
  title: string;
  content: string;
  status: 'draft' | 'ready';
  baseUpdatedAt: string | null;
  savedAt: string;
}

export type ReaderAnnotationColor = 'gold' | 'green' | 'blue' | 'rose';
export type ReaderAnnotationSyncStatus = 'local' | 'pending' | 'synced';

export interface ReaderAnnotation {
  id: string;
  userId?: string;
  bookId: string;
  chapterId: string;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  note: string;
  color: ReaderAnnotationColor;
  createdAt: string;
  updatedAt: string;
  /** Client-only state; never sent to Firestore. */
  syncStatus?: ReaderAnnotationSyncStatus;
}

export interface ReadingProgressRecord {
  id: string; // Matches isValidId in firestore.rules
  userId: string;
  bookId: string;
  chapterId: string;
  chapterIndex?: number;
  scrollPercent?: number; // 0 to 100
  lastReadAt: string;
  completed?: boolean;
  updatedAt?: any;
}

