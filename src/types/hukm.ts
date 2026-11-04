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
  author?: string; // Dr/ Islam Mohamed or custom
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

export interface CreatorAccount {
  name: string;
  email: string;
  channelName: string;
  role: 'official_publisher';
  isOfficialVerified: boolean;
}
