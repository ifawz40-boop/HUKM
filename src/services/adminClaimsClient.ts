import { auth } from '../firebase/config';

/**
 * Client service to communicate with trusted backend Custom Claims API
 * All operations require valid Firebase ID token from the authenticated user.
 */

async function getAuthHeaders(): Promise<HeadersInit> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('يجب تسجيل الدخول أولاً لإجراء هذه العملية.');
  }
  const idToken = await currentUser.getIdToken(true);
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };
}

/**
 * Searches for an existing user account in Firebase Auth by email.
 * Returns verified UID and verification status. Strictly for OWNER.
 */
export async function lookupUserByEmail(email: string): Promise<{
  success: boolean;
  user?: {
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    currentRole: string;
    photoURL?: string | null;
  };
  message?: string;
}> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/auth/lookup-user', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'فشل الاتصال بالخادم للبحث عن المستخدم.' };
  }
}

/**
 * Assigns Custom Claim `role: 'admin'` to the target UID. Strictly for OWNER.
 */
export async function assignAdminRole(
  targetUid: string,
  title?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/auth/set-role', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUid, role: 'admin', title }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'فشل تعيين رتبة المدير.' };
  }
}

/**
 * Revokes Custom Claims from target UID and resets to reader. Strictly for OWNER.
 */
export async function revokeAdminRole(
  targetUid: string
): Promise<{ success: boolean; message: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/auth/revoke-role', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUid }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'فشل سحب صلاحية المدير.' };
  }
}




import type { AdminRequest } from '../types/auth';

export async function createAdminRequest(reason: string): Promise<{ success: boolean; request?: AdminRequest; message: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/auth/admin-requests', { method: 'POST', headers, body: JSON.stringify({ reason }) });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'تعذر إرسال طلب الإدارة.' };
  }
}

export async function getMyAdminRequest(): Promise<{ success: boolean; request: AdminRequest | null; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/auth/admin-requests/mine', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, request: null, message: err.message || 'تعذر تحميل حالة الطلب.' };
  }
}

export async function listPendingAdminRequests(): Promise<{ success: boolean; requests: AdminRequest[]; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/auth/admin-requests', { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, requests: [], message: err.message || 'تعذر تحميل طلبات الإدارة.' };
  }
}

export async function reviewAdminRequest(uid: string, action: 'approve' | 'reject'): Promise<{ success: boolean; message: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/auth/admin-requests/${encodeURIComponent(uid)}/review`, {
      method: 'POST', headers, body: JSON.stringify({ action }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'تعذرت مراجعة الطلب.' };
  }
}
