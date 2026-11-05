export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export type NovelStatus = 'ongoing' | 'completed';
export type PublishingStatus = 'published' | 'in_progress' | 'draft' | 'ongoing' | 'completed';

export interface BookChapter {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  subtitle?: string;
  content: string[];
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
  chapters: BookChapter[];
  createdAt: string;
  updatedAt: string;
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

