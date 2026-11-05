import { auth } from '../firebase/config';
import type { HukmSubscriber } from '../types/auth';

async function getAuthHeaders(): Promise<HeadersInit> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('يجب تسجيل الدخول لإجراء هذه العملية.');
  }
  const idToken = await currentUser.getIdToken(true);
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };
}

export interface EmailServiceStatus {
  success: boolean;
  configured: boolean;
  provider: string | null;
  message: string;
}

export interface SendEmailResponse {
  success: boolean;
  delivered: boolean;
  acceptedByProvider?: boolean;
  partial?: boolean;
  logSaved?: boolean;
  totalRequested?: number;
  message: string;
  providerId?: string;
  recipientCount?: number;
}

export interface SubscribersApiResponse {
  success: boolean;
  count?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
  subscribers: HukmSubscriber[];
  message?: string;
}


/**
 * Checks if real email provider credentials exist on the server
 */
export async function getEmailServiceStatus(): Promise<EmailServiceStatus> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/status', {
      method: 'GET',
      headers,
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      configured: false,
      provider: null,
      message: err.message || 'تعذر الاتصال بخدمة البريد.',
    };
  }
}

/**
 * Dispatches real broadcast or individual email via server backend
 */
export async function dispatchRealEmail(params: {
  subject: string;
  htmlContent: string;
  recipientEmail?: string;
  type?: 'welcome' | 'new_release' | 'announcement';
  bookTitle?: string;
}): Promise<SendEmailResponse> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      delivered: false,
      message: err.message || 'فشل الاتصال بالخادم لإرسال البريد.',
    };
  }
}

/**
 * Retrieves real cloud subscribers from protected backend endpoint with cursor-based pagination
 */
export async function fetchSubscribersApi(
  limit: number = 20,
  cursor?: string | null
): Promise<SubscribersApiResponse> {
  try {
    const headers = await getAuthHeaders();
    let url = `/api/email/subscribers?limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }
    const res = await fetch(url, {
      method: 'GET',
      headers,
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      subscribers: [],
      hasMore: false,
      nextCursor: null,
      message: err.message || 'تعذر الاتصال بالخادم لجلب بيانات المشتركين.',
    };
  }
}


/**
 * Toggles a subscriber active state via protected backend endpoint
 */
export async function toggleSubscriberApi(
  subscriberId: string,
  active?: boolean
): Promise<{ success: boolean; active?: boolean; message?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/email/subscribers/${encodeURIComponent(subscriberId)}/toggle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ active }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'تعذر تحديث حالة المشترك.',
    };
  }
}

