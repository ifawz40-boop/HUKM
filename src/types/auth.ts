export type UserRole = 'owner' | 'reader';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  joinedDate: string;
  bookmarks: string[]; // Book IDs
  readHistory: string[]; // Chapter IDs
}

export type NotificationType = 'new_chapter' | 'new_book' | 'announcement' | 'milestone';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  bookId?: string;
  chapterId?: string;
  targetRole?: 'all' | 'reader' | 'owner';
}

export interface HukmSubscriber {
  id: string;
  email: string;
  name: string;
  subscribedAt: string;
  source: 'signup' | 'google' | 'apple' | 'manual';
  active: boolean;
  receiveAllReleases: boolean;
}

export interface EmailLogEntry {
  id: string;
  subject: string;
  recipientCount: number;
  recipientEmail?: string;
  timestamp: string;
  type: 'welcome' | 'new_release' | 'announcement';
  bookTitle?: string;
  previewHtml: string;
  delivered: boolean;
}
