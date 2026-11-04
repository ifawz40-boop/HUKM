import { UserProfile, AppNotification, HukmSubscriber, HukmEmailLog } from '../types/auth';

const STORAGE_KEY_NOTIFICATIONS = 'hukm_notifications_v1';
const STORAGE_KEY_SUBSCRIBERS = 'hukm_subscribers_v1';
const STORAGE_KEY_EMAIL_LOGS = 'hukm_email_logs_v1';
export const LEGACY_STORAGE_KEY_BOOKMARKS = 'hukm_bookmarks_v1';

/**
 * Security Lockdown: Always returns null if no authenticated Firebase session exists.
 * Does NOT return a mock founder or owner.
 */
export function getStoredCurrentUser(): UserProfile | null {
  return null;
}

export function saveStoredCurrentUser(user: UserProfile | null): void {
  // No-op for security: Firebase Auth is the single source of truth for identity and role
}

export function getBookmarkStorageKey(userId?: string): string {
  if (userId) return `hukm_user_${userId}_bookmarks`;
  return 'hukm_guest_bookmarks';
}

/**
 * Retrieve bookmarks for a specific user ID or guest.
 * Transparently migrates legacy unpartitioned bookmarks to prevent data loss.
 */
export function getStoredBookmarks(userId?: string): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];

    const key = getBookmarkStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }

    // Check legacy storage if partitioned key is empty
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY_BOOKMARKS);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
        return legacyParsed;
      }
    }
  } catch {}
  return [];
}

/**
 * Save bookmarks to partitioned storage
 */
export function saveStoredBookmarks(bookmarks: string[], userId?: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const key = getBookmarkStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(bookmarks));
  } catch {}
}

/**
 * Merge guest bookmarks with user's cloud bookmarks.
 * Performs a Set union to guarantee no books are dropped.
 */
export function mergeGuestBookmarksWithUser(
  guestBookmarks: string[],
  userBookmarks: string[]
): string[] {
  const mergedSet = new Set<string>();
  (userBookmarks || []).forEach((id) => id && mergedSet.add(id));
  (guestBookmarks || []).forEach((id) => id && mergedSet.add(id));
  return Array.from(mergedSet);
}

/**
 * Clear guest bookmarks after successful cloud merge to prevent leakage to other accounts
 */
export function clearGuestBookmarks(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('hukm_guest_bookmarks');
    localStorage.removeItem(LEGACY_STORAGE_KEY_BOOKMARKS);
  } catch {}
}

/**
 * Check if unauthenticated guest bookmarks exist in storage
 */
export function hasGuestBookmarks(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const guestRaw = localStorage.getItem('hukm_guest_bookmarks');
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return true;
    }
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY_BOOKMARKS);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return true;
    }
  } catch {}
  return false;
}

/**
 * Bookmark toggle for user profile with isolated storage
 */
export function toggleUserBookmark(user: UserProfile, bookId: string): UserProfile {
  const currentBookmarks = user.bookmarks || [];
  const exists = currentBookmarks.includes(bookId);
  const updatedBookmarks = exists
    ? currentBookmarks.filter((id) => id !== bookId)
    : [...currentBookmarks, bookId];

  saveStoredBookmarks(updatedBookmarks, user.id);

  return {
    ...user,
    bookmarks: updatedBookmarks,
  };
}

/**
 * Bookmark toggle for guest reader
 */
export function toggleGuestBookmark(bookId: string): string[] {
  const current = getStoredBookmarks();
  const exists = current.includes(bookId);
  const updated = exists ? current.filter((id) => id !== bookId) : [...current, bookId];
  saveStoredBookmarks(updated);
  return updated;
}

/**
 * In-app dynamic notifications
 */
export function getStoredNotifications(): AppNotification[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return [
    {
      id: 'notif-welcome',
      title: 'أهلاً بك في منصة حُكم المعرفية 🏛️',
      message: 'نبحث، نفكك، ونفهم. تابع أحدث التحقيقات الموثقة وشارك في نشر الوعي.',
      type: 'announcement',
      timestamp: 'الآن',
      read: false,
      targetRole: 'all',
    },
  ];
}

export function saveStoredNotifications(notifications: AppNotification[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
    }
  } catch {}
}

/**
 * Subscribers management
 */
export function getStoredSubscribers(): HukmSubscriber[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIBERS);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function addSubscriber(
  email: string,
  name: string,
  source: 'signup' | 'google' | 'apple' | 'manual' | string = 'signup'
): void {
  const subs = getStoredSubscribers();
  if (subs.some((s) => s.email.toLowerCase() === email.toLowerCase())) return;

  const validSource = ['signup', 'google', 'apple', 'manual'].includes(source)
    ? (source as 'signup' | 'google' | 'apple' | 'manual')
    : 'signup';

  const newSub: HukmSubscriber = {
    id: `sub-${Date.now()}`,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    source: validSource,
    subscribedAt: new Date().toISOString(),
    active: true,
    receiveAllReleases: true,
  };

  try {
    localStorage.setItem(STORAGE_KEY_SUBSCRIBERS, JSON.stringify([newSub, ...subs]));
  } catch {}
}

export function toggleSubscriberActive(subscriberId: string): HukmSubscriber[] {
  const subs = getStoredSubscribers();
  const updated = subs.map((s) =>
    s.id === subscriberId ? { ...s, active: !s.active } : s
  );
  try {
    localStorage.setItem(STORAGE_KEY_SUBSCRIBERS, JSON.stringify(updated));
  } catch {}
  return updated;
}

/**
 * Email logs
 */
export function getStoredEmailLogs(): HukmEmailLog[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_EMAIL_LOGS);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function addEmailLog(log: Omit<HukmEmailLog, 'id'>): void {
  const logs = getStoredEmailLogs();
  const newLog: HukmEmailLog = {
    ...log,
    id: `log-${Date.now()}`,
  };
  try {
    localStorage.setItem(STORAGE_KEY_EMAIL_LOGS, JSON.stringify([newLog, ...logs]));
  } catch {}
}
