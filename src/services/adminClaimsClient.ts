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

/**
 * Initial One-Time Bootstrap Call
 */
export async function bootstrapOwnerAccount(bootstrapKey?: string): Promise<{
  success: boolean;
  message: string;
  results?: any;
}> {
  try {
    const res = await fetch('/api/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bootstrapKey }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'فشلت عملية التهيئة الأولية.' };
  }
}
