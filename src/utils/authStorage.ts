import { UserProfile, AppNotification, HukmSubscriber, HukmEmailLog } from '../types/auth';

const STORAGE_KEY_NOTIFICATIONS = 'hukm_notifications_v1';
const STORAGE_KEY_SUBSCRIBERS = 'hukm_subscribers_v1';
const STORAGE_KEY_EMAIL_LOGS = 'hukm_email_logs_v1';
const STORAGE_KEY_BOOKMARKS = 'hukm_bookmarks_v1';

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

// Note: All authorization checks must use permissionService.ts, strictly derived from Firebase Custom Claims.

/**
 * Bookmark toggle for user profile
 */
export function toggleUserBookmark(user: UserProfile, bookId: string): UserProfile {
  const currentBookmarks = user.bookmarks || [];
  const exists = currentBookmarks.includes(bookId);
  const updatedBookmarks = exists
    ? currentBookmarks.filter((id) => id !== bookId)
    : [...currentBookmarks, bookId];

  try {
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(updatedBookmarks));
  } catch {}

  return {
    ...user,
    bookmarks: updatedBookmarks,
  };
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
