export type NovelStatus = 'ONGOING' | 'COMPLETED';

export interface LoreSequence {
  sequenceNumber: number;
  name: string;
  potionIngredients?: string;
  description: string;
}

export interface LorePath {
  pathName: string;
  description: string;
  sequences: LoreSequence[];
}

export interface Novel {
  id: string;
  title: string;
  titleOriginal: string;
  titleEnglish?: string;
  cover: string;
  author: string;
  translator: string;
  status: NovelStatus;
  rating: number;
  ratingCount: number;
  views: number;
  bookmarksCount: number;
  genres: string[];
  synopsis: string;
  year: number;
  latestChapter: {
    number: number;
    title: string;
    releaseDate: string;
  };
  chaptersCount: number;
  lore?: {
    overview: string;
    paths: LorePath[];
  };
}

export interface Chapter {
  id: string;
  novelId: string;
  chapterNumber: number;
  title: string;
  releaseDate: string;
  wordCount: number;
  content: string[];
  views: number;
  likes: number;
}

export interface Comment {
  id: string;
  novelId: string;
  chapterId?: string;
  authorName: string;
  avatar: string;
  date: string;
  content: string;
  likes: number;
  isSpoiler?: boolean;
}

export type ReaderTheme = 'dark' | 'light' | 'sepia' | 'amoled';
export type ReaderFont = 'cairo' | 'amiri' | 'readex' | 'tajawal';
export type ReaderWidth = 'tight' | 'medium' | 'wide';

export interface ReadingSettings {
  theme: ReaderTheme;
  fontFamily: ReaderFont;
  fontSize: number;
  lineHeight: number;
  maxWidth: ReaderWidth;
  textAlign: 'right' | 'justify';
  autoScrollSpeed: number;
}

export type LibraryCategory = 'reading' | 'favorites' | 'completed' | 'plan_to_read';

export interface LibraryEntry {
  novelId: string;
  category: LibraryCategory;
  lastReadChapterNumber: number;
  lastReadChapterId: string;
  lastReadAt: string;
  progressPercentage: number;
}
