export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export type PublishingStatus = 'published' | 'in_progress' | 'draft';

export type MediaType = 'image' | 'gif' | 'video';

export interface ChapterMedia {
  id: string;
  type: MediaType;
  url: string;
  title?: string;
  caption?: string; // شرح توضيحي وتوثيق للوسيط
  durationSeconds?: number; // e.g., 5, 8, 12 seconds for short video loop
  aspectRatio?: '16:9' | '4:3' | 'square' | 'banner';
  placement?: 'header' | 'in_content' | 'footer';
  loop?: boolean;
  autoplay?: boolean;
  badgeText?: string;
}

export interface SourceReference {
  id: string;
  title: string;
  author: string;
  year?: string;
  url?: string;
  type: 'book' | 'paper' | 'archive' | 'documentary';
}

export interface SocialQuote {
  id: string;
  quoteText: string;
  context?: string;
  chapterNumber?: number;
}

export interface BookChapter {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  subtitle?: string;
  content: string[];
  notes?: string;
  references: string[];
  media?: ChapterMedia[]; // الوسائط: صور، صور متحركة GIF، فيديوهات قصيرة
  status: 'draft' | 'ready';
  wordCount: number;
  readingTimeMinutes: number;
  viewsCount: number;
  updatedAt: string;
}

export type PlatformType =
  | 'youtube'
  | 'x'
  | 'spotify'
  | 'apple_podcasts'
  | 'soundcloud'
  | 'instagram'
  | 'telegram'
  | 'custom';

export interface PlatformLinkConfig {
  id: string;
  platform: PlatformType;
  enabled: boolean;
  url: string;
  customLabel?: string;
}

export interface StandaloneEpisodeConfig {
  hasStandaloneEpisode: boolean;
  title?: string;
  episodeNumber?: string;
  videoUrl?: string;
  platformUrl?: string;
  durationMinutes?: number;
  badgeLabel?: string; // e.g. "حلقة مفرقة", "حلقة وثائقية مستقلة"
  description?: string;
}

export interface BookProject {
  id: string;
  title: string;
  subtitle: string;
  author?: string; // e.g. "إبراهيم فوزي"
  category: string; // Dynamic Category ID
  coverImage: string;
  coverMediaType?: MediaType;
  coverMedia?: ChapterMedia;
  status: PublishingStatus;
  summary: string;
  motto?: string;
  viewsCount: number;
  socialLinks: {
    youtubeUrl?: string;
    podcastUrl?: string;
    xThreadUrl?: string;
    instagramPostUrl?: string;
    telegramUrl?: string;
    soundcloudUrl?: string;
  };
  standaloneEpisode?: StandaloneEpisodeConfig;
  platformLinks?: PlatformLinkConfig[];
  hidePodcastBadge?: boolean; // HUKM does not have an official podcast yet
  chapters: BookChapter[];
  sources: SourceReference[];
  quotes: SocialQuote[];
  createdAt: string;
  updatedAt: string;
}

export interface ReadingProgress {
  bookId: string;
  lastChapterId?: string;
  completedChapterIds: string[];
  lastReadAt: string;
}

export interface CreatorAccount {
  name: string;
  email: string;
  channelName: string;
  role: 'official_publisher';
  isOfficialVerified: boolean;
}

