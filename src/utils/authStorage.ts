import { UserProfile, AppNotification, UserRole } from '../types/auth';

export const OWNER_USER: UserProfile = {
  id: 'owner-ibrahim-fawzy',
  name: 'إبراهيم فوزي',
  email: 'ifawz40@gmail.com',
  role: 'owner',
  bio: 'صاحب المنصة والمؤلف الرئيسي لسلسلة «وعشان الموضوع مش زي ما إنت فاكر… تعالى نعرف» ومؤسس حُكم MEDIA.',
  joinedDate: '2024-01-01',
  bookmarks: ['investigation-01', 'economy-02'],
  readHistory: [],
};

export const DEMO_READER_USER: UserProfile = {
  id: 'reader-demo-ahmed',
  name: 'أحمد المنصور',
  email: 'reader@hukm.media',
  role: 'reader',
  bio: 'قارئ شغوف بالوثائقيات والكتب الاستقصائية والأبحاث التاريخية والسياسية.',
  joinedDate: '2024-03-15',
  bookmarks: ['investigation-01'],
  readHistory: ['ch-01-01'],
};

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'فصل جديد متاح الآن! 📖',
    message: 'تم نشر الفصل الرابع: «الوثائق المسربة وحقيقة التقارير السرية» في كتاب وعشان الموضوع مش زي ما إنت فاكر.',
    type: 'new_chapter',
    timestamp: 'منذ ساعتين',
    read: false,
    bookId: 'investigation-01',
    chapterId: 'ch-01-04',
  },
  {
    id: 'notif-2',
    title: 'كتاب جديد في الأرشيف الاستقصائي 🏛️',
    message: 'أضافت منصة حُكم كتاباً استقصائياً جديداً: «أسرار الإمبراطوريات المالية الخفية».',
    type: 'new_book',
    timestamp: 'منذ يوم',
    read: false,
    bookId: 'economy-02',
  },
  {
    id: 'notif-3',
    title: 'رسالة من الناشر الرسمي إبراهيم فوزي 👑',
    message: 'أهلاً بكم في منصة حُكم! يتم تحديث الفصول أسبوعياً تزامناً مع الحلقات المنشورة على وسائل التواصل.',
    type: 'announcement',
    timestamp: 'منذ يومين',
    read: true,
  },
];

const STORAGE_KEY_USER = 'hukm_current_user_v2';
const STORAGE_KEY_USERS_DB = 'hukm_users_registry_v2';
const STORAGE_KEY_NOTIFICATIONS = 'hukm_notifications_v2';

export function getStoredCurrentUser(): UserProfile {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_USER);
      if (raw) return JSON.parse(raw);
    }
  } catch (err) {
    // ignore
  }
  return OWNER_USER;
}

export function saveStoredCurrentUser(user: UserProfile): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }
  } catch (err) {
    // ignore
  }
}

export function getStoredNotifications(): AppNotification[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (raw) return JSON.parse(raw);
    }
  } catch (err) {
    // ignore
  }
  return INITIAL_NOTIFICATIONS;
}

export function saveStoredNotifications(notifs: AppNotification[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifs));
    }
  } catch (err) {
    // ignore
  }
}

export function getAllRegisteredUsers(): UserProfile[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_USERS_DB);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}
  return [OWNER_USER, DEMO_READER_USER];
}

export function registerNewUser(name: string, email: string): UserProfile {
  const users = getAllRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  
  // If email is owner email, grant owner role automatically
  const isOwnerEmail = normalizedEmail === 'ifawz40@gmail.com';
  const role: UserRole = isOwnerEmail ? 'owner' : 'reader';
  
  const newUser: UserProfile = {
    id: `user-${Date.now()}`,
    name: name.trim() || (isOwnerEmail ? 'إبراهيم فوزي' : 'قارئ حُكم الجديد'),
    email: normalizedEmail,
    role,
    bio: isOwnerEmail ? OWNER_USER.bio : 'قارئ جديد مسجل في منصة حُكم.',
    joinedDate: new Date().toISOString().split('T')[0],
    bookmarks: [],
    readHistory: [],
  };

  const updatedUsers = [...users.filter((u) => u.email !== normalizedEmail), newUser];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USERS_DB, JSON.stringify(updatedUsers));
    }
  } catch {}
  
  saveStoredCurrentUser(newUser);

  // Automatically subscribe every newly registered user to receive all releases
  addSubscriber(normalizedEmail, newUser.name, 'signup');

  return newUser;
}

export function toggleUserBookmark(user: UserProfile, bookId: string): UserProfile {
  const hasBookmarked = user.bookmarks.includes(bookId);
  const updatedBookmarks = hasBookmarked
    ? user.bookmarks.filter((id) => id !== bookId)
    : [...user.bookmarks, bookId];

  const updatedUser: UserProfile = {
    ...user,
    bookmarks: updatedBookmarks,
  };
  saveStoredCurrentUser(updatedUser);
  return updatedUser;
}

export const OWNER_EMAIL = 'ifawz40@gmail.com';

export function isAuthorizedOwnerEmail(email?: string): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL;
}

export function canSwitchViewMode(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return isAuthorizedOwnerEmail(user.email);
}

export function isOwner(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return isAuthorizedOwnerEmail(user.email);
}

// ----------------------------------------------------
// SUBSCRIBERS & EMAIL NOTIFICATION LOG STORAGE
// ----------------------------------------------------

export const INITIAL_SUBSCRIBERS: import('../types/auth').HukmSubscriber[] = [
  {
    id: 'sub-owner-1',
    email: 'ifawz40@gmail.com',
    name: 'إبراهيم فوزي (المؤسس والناشر)',
    subscribedAt: '2024-01-01',
    source: 'signup',
    active: true,
    receiveAllReleases: true,
  },
  {
    id: 'sub-reader-2',
    email: 'reader@hukm.media',
    name: 'أحمد المنصور',
    subscribedAt: '2024-03-15',
    source: 'signup',
    active: true,
    receiveAllReleases: true,
  },
  {
    id: 'sub-reader-3',
    email: 'tariq.investigator@gmail.com',
    name: 'طارق الدوسري',
    subscribedAt: '2024-04-10',
    source: 'google',
    active: true,
    receiveAllReleases: true,
  },
  {
    id: 'sub-reader-4',
    email: 'mona.culture@outlook.com',
    name: 'منى الشريف',
    subscribedAt: '2024-04-18',
    source: 'google',
    active: true,
    receiveAllReleases: true,
  },
];

const STORAGE_KEY_SUBSCRIBERS = 'hukm_subscribers_v1';
const STORAGE_KEY_EMAIL_LOGS = 'hukm_email_logs_v1';

export function getStoredSubscribers(): import('../types/auth').HukmSubscriber[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIBERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}
  return INITIAL_SUBSCRIBERS;
}

export function saveStoredSubscribers(subs: import('../types/auth').HukmSubscriber[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SUBSCRIBERS, JSON.stringify(subs));
    }
  } catch {}
}

export function addSubscriber(
  email: string,
  name: string,
  source: 'signup' | 'google' | 'apple' | 'manual' = 'signup'
): import('../types/auth').HukmSubscriber {
  const subscribers = getStoredSubscribers();
  const cleanEmail = email.trim().toLowerCase();
  const existing = subscribers.find((s) => s.email.toLowerCase() === cleanEmail);

  if (existing) {
    if (!existing.active) {
      existing.active = true;
      saveStoredSubscribers(subscribers);
    }
    return existing;
  }

  const newSub: import('../types/auth').HukmSubscriber = {
    id: `sub-${Date.now()}`,
    email: cleanEmail,
    name: name.trim() || 'قارئ حُكم الجديد',
    subscribedAt: new Date().toISOString().split('T')[0],
    source,
    active: true,
    receiveAllReleases: true,
  };

  const updated = [newSub, ...subscribers];
  saveStoredSubscribers(updated);
  return newSub;
}

export function toggleSubscriberActive(subscriberId: string): import('../types/auth').HukmSubscriber[] {
  const subscribers = getStoredSubscribers();
  const updated = subscribers.map((sub) => {
    if (sub.id === subscriberId) {
      return { ...sub, active: !sub.active };
    }
    return sub;
  });
  saveStoredSubscribers(updated);
  return updated;
}

export function getStoredEmailLogs(): import('../types/auth').EmailLogEntry[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_EMAIL_LOGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

export function saveStoredEmailLogs(logs: import('../types/auth').EmailLogEntry[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_EMAIL_LOGS, JSON.stringify(logs));
    }
  } catch {}
}

export function addEmailLog(entry: Omit<import('../types/auth').EmailLogEntry, 'id'>): import('../types/auth').EmailLogEntry {
  const logs = getStoredEmailLogs();
  const newEntry: import('../types/auth').EmailLogEntry = {
    ...entry,
    id: `email-log-${Date.now()}`,
  };
  const updated = [newEntry, ...logs].slice(0, 50); // keep recent 50
  saveStoredEmailLogs(updated);
  return newEntry;
}
