import { AdminAccount, BannedAccount } from '../types/auth';
import {
  saveAdminToFirestore,
  deleteAdminFromFirestore,
  saveBanToFirestore,
} from '../firebase/firestoreService';

const STORAGE_KEY_ADMINS = 'hukm_admins_v1';
const STORAGE_KEY_BANS = 'hukm_banned_users_v1';

// No demo administrators or bans are seeded in production or local storage.
// Authoritative administrator and moderation records are loaded from Firestore.
export const INITIAL_ADMINS: AdminAccount[] = [];
export const INITIAL_BANS: BannedAccount[] = [];

// ----------------------------------------------------
// ADMINS MANAGEMENT
// ----------------------------------------------------

export function getStoredAdmins(): AdminAccount[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_ADMINS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {
    console.error('Failed reading admins', e);
  }
  return INITIAL_ADMINS;
}

export function saveStoredAdmins(admins: AdminAccount[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ADMINS, JSON.stringify(admins));
    }
  } catch (e) {
    console.error('Failed saving admins', e);
  }
}

/**
 * NOTE: Email-based authorization has been permanently removed in Phase 1.1.
 * All authorization must go through Firebase Custom Claims via `permissionService.ts`.
 */

/**
 * NOTE: Admin creation and revocation with mock UIDs is strictly forbidden.
 * All administrative identity management MUST go through the trusted backend API
 * (/api/auth/lookup-user, /api/auth/set-role, /api/auth/revoke-role) which sets
 * authoritative Firebase Custom Claims and records verified Firebase UIDs.
 */

// ----------------------------------------------------
// BANS & MODERATION MANAGEMENT
// ----------------------------------------------------

export function getStoredBans(): BannedAccount[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_BANS);
      if (raw) {
        const parsed: BannedAccount[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Check expiration for temporary bans
          const now = new Date().getTime();
          let changed = false;
          const validated = parsed.map((ban) => {
            if (ban.isActive && ban.banType === 'temporary' && ban.expiresAt) {
              const expireTime = new Date(ban.expiresAt).getTime();
              if (expireTime <= now) {
                changed = true;
                return { ...ban, isActive: false };
              }
            }
            return ban;
          });
          if (changed) {
            saveStoredBans(validated);
          }
          return validated;
        }
      }
    }
  } catch (e) {
    console.error('Failed reading bans', e);
  }
  return INITIAL_BANS;
}

export function saveStoredBans(bans: BannedAccount[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_BANS, JSON.stringify(bans));
    }
  } catch (e) {
    console.error('Failed saving bans', e);
  }
}

export function getActiveBanDetails(email?: string | null): BannedAccount | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const bans = getStoredBans();
  const activeBan = bans.find(
    (b) => b.isActive && b.email.trim().toLowerCase() === normalized
  );

  if (!activeBan) return null;

  // Double check expiry
  if (activeBan.banType === 'temporary' && activeBan.expiresAt) {
    if (new Date(activeBan.expiresAt).getTime() <= Date.now()) {
      unbanUser(activeBan.id);
      return null;
    }
  }

  return activeBan;
}

export function isUserBanned(email?: string | null): boolean {
  return getActiveBanDetails(email) !== null;
}

export function banUser(params: {
  email: string;
  name?: string;
  banType: 'temporary' | 'permanent';
  durationDays?: number; // e.g. 1 (24h), 7, 30
  reason: string;
  bannedBy: string;
}): { success: boolean; message: string; ban?: BannedAccount } {
  const normalizedEmail = params.email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { success: false, message: 'يرجى إدخال بريد إلكتروني صحيح للحظر.' };
  }

  // Prevent banning Founder or protected admins
  if (normalizedEmail === 'ifawz40@gmail.com') {
    return { success: false, message: 'لا يمكن حظر حساب المؤسس أو المدير التنفيذي!' };
  }

  const bans = getStoredBans();
  
  let expiresAt: string | undefined = undefined;
  if (params.banType === 'temporary') {
    const days = params.durationDays && params.durationDays > 0 ? params.durationDays : 7;
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + days);
    expiresAt = expDate.toISOString();
  }

  const newBan: BannedAccount = {
    id: `ban-${Date.now()}`,
    email: normalizedEmail,
    name: params.name?.trim() || 'مستخدم مسجل',
    banType: params.banType,
    reason: params.reason.trim() || 'مخالفة معايير وضوابط منصة حُكم.',
    bannedBy: params.bannedBy,
    bannedAt: new Date().toISOString(),
    expiresAt,
    isActive: true,
  };

  // Replace any existing ban for this email
  const updated = [newBan, ...bans.filter((b) => b.email.trim().toLowerCase() !== normalizedEmail)];
  saveStoredBans(updated);
  saveBanToFirestore(newBan);

  const durationText =
    params.banType === 'permanent'
      ? 'حظر دائم'
      : `حظر مؤقت لمدة ${params.durationDays || 7} أيام`;

  return {
    success: true,
    message: `تم حظر الحساب (${normalizedEmail}) بنجاح بمستوى: ${durationText}.`,
    ban: newBan,
  };
}

export function unbanUser(banId: string): { success: boolean; message: string } {
  const bans = getStoredBans();
  const target = bans.find((b) => b.id === banId);
  if (!target) {
    return { success: false, message: 'سجل الحظر غير موجود.' };
  }

  const unbannedItem = { ...target, isActive: false };
  const updated = bans.map((b) => (b.id === banId ? unbannedItem : b));
  saveStoredBans(updated);
  saveBanToFirestore(unbannedItem);
  return { success: true, message: `تم رفع الحظر بنجاح عن الحساب (${target.email}).` };
}

export function formatRemainingTime(expiresAt?: string): string {
  if (!expiresAt) return 'حظر دائم';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'منتهي';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    return `${days} يوم و ${remainingHours} ساعة متبقية`;
  }
  return `${hours} ساعة متبقية`;
}
