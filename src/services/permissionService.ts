import { UserProfile, UserRole } from '../types/auth';

/**
 * Centralized Role and Permission Service for HUKM MEDIA
 * 
 * Rules:
 * 1. Elevated Custom Claims must match the active `/admins/{uid}` registry role.
 * 2. No role assignment or permission check is ever based on an email address.
 * 3. Administrative privileges require verified accounts (`user.emailVerified === true`).
 * 4. OWNER and ADMIN roles have strictly segregated permissions:
 *    - OWNER controls the Writer Studio, category management, and administrator roles.
 *    - ADMIN can use approved moderation and administrative workflows, but cannot use owner-only publishing tools.
 * 5. Client-side checks are for UI visibility only; Firestore Security Rules enforce actual access.
 */

export interface UserPermissions {
  isOwner: boolean;
  isAdmin: boolean;
  isReader: boolean;
  canManageAdmins: boolean;
  canEditBooks: boolean;
  canManageCategories: boolean;
  canModerate: boolean;
  canBroadcastAnnouncement: boolean;
  canAccessWriterStudio: boolean;
  canSwitchViewMode: boolean;
}

/**
 * Resolve an elevated UI role only when the verified token claim matches the
 * active Firestore admin registry. A missing, mismatched, or unverified record
 * always fails closed to the ordinary reader role.
 */
export function resolveVerifiedUserRole(
  roleClaim: unknown,
  emailVerified: boolean,
  registryRole: unknown
): UserRole {
  if (!emailVerified) return 'reader';
  if (roleClaim === 'owner' && registryRole === 'owner') return 'owner';
  if (roleClaim === 'admin' && registryRole === 'admin') return 'admin';
  return 'reader';
}

/**
 * Check if the user has the authoritative OWNER role with verified email
 */
export function isOwner(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'owner' && Boolean(user.emailVerified);
}

/**
 * Owner-only UI access after applying the optional reader-preview restriction.
 * Admin status is deliberately insufficient for owner-only publishing controls.
 */
export function isEffectiveOwner(
  user: UserProfile | null | undefined,
  isReaderPreviewMode = false
): boolean {
  return isOwner(user) && !isReaderPreviewMode;
}

/**
 * Check if the user has either OWNER or ADMIN role with verified email
 */
export function isAdmin(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (!user.emailVerified) return false;
  return user.role === 'owner' || user.role === 'admin';
}

/**
 * Check if user is a standard reader (or guest)
 */
export function isReader(user: UserProfile | null | undefined): boolean {
  if (!user) return true;
  return user.role === 'reader' || !user.emailVerified;
}

/**
 * Strictly OWNER-only: Grant, revoke, or view administrator identities
 */
export function canManageAdmins(user: UserProfile | null | undefined): boolean {
  return isOwner(user);
}

/**
 * ADMIN & OWNER: Write, edit, or publish books and chapters
 */
export function canEditBooks(user: UserProfile | null | undefined): boolean {
  return isAdmin(user);
}

/**
 * ADMIN & OWNER: Create or delete book categories
 */
export function canManageCategories(user: UserProfile | null | undefined): boolean {
  return isOwner(user);
}

/**
 * ADMIN & OWNER: Manage user moderation and temporary/permanent bans
 */
export function canModerate(user: UserProfile | null | undefined): boolean {
  return isAdmin(user);
}

/**
 * ADMIN & OWNER: Dispatch announcements to readers
 */
export function canBroadcastAnnouncement(user: UserProfile | null | undefined): boolean {
  return isAdmin(user);
}

/**
 * ADMIN & OWNER: Open writer studio
 */
export function canAccessWriterStudio(user: UserProfile | null | undefined): boolean {
  return isOwner(user);
}

/**
 * ADMIN & OWNER: Toggle reader preview mode
 */
export function canSwitchViewMode(user: UserProfile | null | undefined): boolean {
  return isAdmin(user);
}

/**
 * Compute all permission flags for the given user profile
 */
export function getUserPermissions(user: UserProfile | null | undefined): UserPermissions {
  return {
    isOwner: isOwner(user),
    isAdmin: isAdmin(user),
    isReader: isReader(user),
    canManageAdmins: canManageAdmins(user),
    canEditBooks: canEditBooks(user),
    canManageCategories: canManageCategories(user),
    canModerate: canModerate(user),
    canBroadcastAnnouncement: canBroadcastAnnouncement(user),
    canAccessWriterStudio: canAccessWriterStudio(user),
    canSwitchViewMode: canSwitchViewMode(user),
  };
}
