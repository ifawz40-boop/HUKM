export type UserRole = 'owner' | 'admin' | 'reader';

export interface UserProfile {
  id: string; // Firebase UID
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  joinedDate: string;
  bookmarks: string[]; // Book IDs
  readHistory: string[]; // Chapter IDs
  emailVerified: boolean;
  customClaims?: Record<string, any>;
}

export type AdminRequestStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'needs_attention';

export interface AdminRequest {
  uid: string;
  email: string;
  displayName: string;
  reason: string;
  status: AdminRequestStatus;
  submittedAt: string;
  processingAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
}

export interface AdminAccount {
  id: string; // Firebase UID
  uid: string; // Explicit Firebase UID
  email: string;
  name: string;
  title: string; // e.g. "مدير تحرير", "مشرف محتوى", "مؤسس المنصة"
  role: 'owner' | 'admin';
  addedBy: string;
  addedAt: string;
  canEditBooks: boolean;
  canManageBans: boolean;
  isFounder?: boolean;
}

export interface BannedAccount {
  id: string;
  email: string;
  name?: string;
  banType: 'temporary' | 'permanent';
  reason: string;
  bannedBy: string; // email or name of the moderator
  bannedAt: string;
  expiresAt?: string; // ISO string for temporary bans
  isActive: boolean; // true if ban is currently active
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
  acceptedByProvider?: boolean;
  partial?: boolean;
  totalRequested?: number;
}

export type HukmEmailLog = EmailLogEntry;
