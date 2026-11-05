import { Router, type Request, type Response } from 'express';
import { authenticateToken } from './authClaimsApi.ts';
import { adminDb } from './firebaseAdmin.ts';
import { createRateLimiter } from './requestProtection.ts';
import { isValidEmailAddress, resolveEmailRecipientTarget } from './emailRecipients.ts';

export const emailApiRouter = Router();

const sendEmailRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  message: 'تم تجاوز عدد عمليات إرسال البريد المسموح بها. يرجى الانتظار دقيقة قبل المحاولة مجدداً.',
});

/**
 * Check whether email provider credentials are configured on the server
 */
emailApiRouter.get('/status', authenticateToken, async (_req: Request, res: Response) => {
  const apiKey = process.env.RESEND_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey.trim().length > 0);

  return res.json({
    success: true,
    configured: isConfigured,
    provider: isConfigured ? 'Resend API' : null,
    message: isConfigured
      ? 'مزود البريد الإلكتروني مهيأ وجاهز للإرسال الفعلي.'
      : 'مزود البريد غير مهيأ. يجب ضبط متغير البيئة RESEND_API_KEY على الخادم لتفعيل الإرسال الحقيقي.',
  });
});

/**
 * Send Broadcast or Individual Email
 * Strictly requires verified OWNER or ADMIN identity with an ACTIVE record in /admins/{uid}.
 * Rejects simulation; fails honestly if email provider credentials are not set.
 * Chunks broadcast recipients into batches of 50 to ensure no subscribers are dropped.
 * Accurately logs and returns the exact number of recipients dispatched.
 */
emailApiRouter.post('/send', sendEmailRateLimit, authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'owner' && user.role !== 'admin') || !user.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح: صلاحية إرسال البريد مقتصرة على المشرفين والمالك المعتمدين فقط.',
    });
  }

  // 1. Strict verification of active administrative record in Firestore (/admins/{uid})
  try {
    const adminDoc = await adminDb.collection('admins').doc(user.uid).get();
    if (!adminDoc.exists) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح: لا يوجد سجل إداري فعال لحسابك في سجل الإدارة (/admins/{uid}). تم حظر الوصول فورياً.',
      });
    }

    const adminData = adminDoc.data();
    const adminRole = adminData?.role;
    if (adminRole !== 'owner' && adminRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح: تم إلغاء أو تخفيض رتبتك الإدارية في قاعدة البيانات.',
      });
    }
  } catch (authErr: any) {
    console.error('Error verifying admin doc for email dispatch:', authErr);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من السجل الإداري للمرسل.',
    });
  }

  const payload = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const { subject, htmlContent, type, bookTitle } = payload;

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ success: false, message: 'عنوان الرسالة مطلوب.' });
  }

  if (!htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim()) {
    return res.status(400).json({ success: false, message: 'محتوى الرسالة مطلوب.' });
  }

  // An omitted recipientEmail explicitly means broadcast. A supplied but empty,
  // malformed, or non-string value must never fall through to a mass email.
  const recipientTarget = resolveEmailRecipientTarget(payload);
  if (recipientTarget.kind === 'invalid') {
    return res.status(400).json({
      success: false,
      message: 'عنوان البريد الفردي غير صالح. اترك الحقل غير موجود فقط عند اختيار الإرسال الجماعي.',
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return res.status(503).json({
      success: false,
      delivered: false,
      configured: false,
      message:
        'خدمة البريد الإلكتروني غير مهيأة على الخادم. لم يتم العثور على مفتاح RESEND_API_KEY في متغيرات البيئة. لم يتم إرسال أي بريد تجنباً للادعاءات الوهمية.',
    });
  }

  try {
    // 2. Determine recipients list. Normalize and deduplicate broadcast addresses.
    let recipients: string[] = [];
    if (recipientTarget.kind === 'individual') {
      recipients = [recipientTarget.email];
    } else {
      const uniqueRecipients = new Set<string>();
      const subscribersSnap = await adminDb.collection('subscribers').where('active', '==', true).get();
      subscribersSnap.forEach((doc) => {
        const email = doc.data().email;
        if (typeof email === 'string') {
          const normalized = email.trim().toLowerCase();
          if (isValidEmailAddress(normalized)) uniqueRecipients.add(normalized);
        }
      });
      recipients = Array.from(uniqueRecipients);
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'لا يوجد مشتركون نشطون لإرسال الرسالة إليهم.' });
    }

    // 3. Dispatch in batches of 50 to support unlimited subscribers without dropping any
    const fromAddress = process.env.EMAIL_FROM || 'HUKM MEDIA <updates@hukm.media>';
    const BATCH_SIZE = 50;
    let actualDispatchedCount = 0;
    const providerIds: string[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: batch,
          subject: subject.trim(),
          html: htmlContent,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(`Email provider batch failure at index ${i}:`, result);
        if (actualDispatchedCount === 0) {
          return res.status(502).json({
            success: false,
            delivered: false,
            message: `فشل الإرسال من مزود الخدمة: ${result.message || 'خطأ غير معروف في مزود البريد'}`,
          });
        }
        // Partial dispatch: stop further batches, log accurately what was sent
        break;
      }

      actualDispatchedCount += batch.length;
      if (result.id) {
        providerIds.push(result.id);
      }
    }

    // 4. Record real verified log in Firestore reflecting actual dispatched count
    const logId = `log-${Date.now()}`;
    await adminDb.collection('emailLogs').doc(logId).set({
      id: logId,
      subject: subject.trim(),
      recipientCount: actualDispatchedCount,
      totalRequested: recipients.length,
      recipientEmail: recipientTarget.kind === 'individual' ? recipientTarget.email : null,
      timestamp: new Date().toISOString(),
      type: type || 'announcement',
      bookTitle: bookTitle || null,
      providerId: providerIds.join(',') || 'unknown',
      delivered: actualDispatchedCount > 0,
      senderUid: user.uid,
    });

    return res.json({
      success: true,
      delivered: actualDispatchedCount > 0,
      providerId: providerIds[0] || null,
      providerIds,
      recipientCount: actualDispatchedCount,
      totalSubscribers: recipients.length,
      message: `تم إرسال البريد بنجاح إلى ${actualDispatchedCount} مستلم وموثق برقم العملية: ${providerIds[0] || 'تم'}`,
    });
  } catch (err: any) {
    console.error('Email sending exception:', err);
    return res.status(500).json({
      success: false,
      delivered: false,
      message: err.message || 'حدث خطأ غير متوقع أثناء إرسال البريد.',
    });
  }
});

/**
 * Retrieve Real Cloud Subscribers from Firestore
 * Strictly requires verified OWNER or ADMIN identity with an ACTIVE record in /admins/{uid}.
 * Ordinary readers, guests, or unverified accounts are rejected with 403 Forbidden.
 * Protects subscriber email privacy on the server.
 */
emailApiRouter.get('/subscribers', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'owner' && user.role !== 'admin') || !user.email_verified) {
    return res.status(403).json({
      success: false,
      subscribers: [],
      message: 'غير مصرح: صلاحية استرجاع بيانات المشتركين مقتصرة على المشرفين والمالك المعتمدين فقط.',
    });
  }

  try {
    const adminDoc = await adminDb.collection('admins').doc(user.uid).get();
    if (!adminDoc.exists) {
      return res.status(403).json({
        success: false,
        subscribers: [],
        message: 'غير مصرح: لا يوجد سجل إداري فعال لحسابك في سجل الإدارة (/admins/{uid}). تم حظر الوصول فورياً.',
      });
    }

    const adminData = adminDoc.data();
    const adminRole = adminData?.role;
    if (adminRole !== 'owner' && adminRole !== 'admin') {
      return res.status(403).json({
        success: false,
        subscribers: [],
        message: 'غير مصرح: تم إلغاء أو تخفيض رتبتك الإدارية في قاعدة البيانات.',
      });
    }

    const requestedLimit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const cursor = typeof req.query.cursor === 'string' && req.query.cursor.trim() ? req.query.cursor.trim() : null;

    let query = adminDb.collection('subscribers')
      .orderBy('subscribedAt', 'desc')
      .orderBy('__name__', 'desc');

    if (cursor) {
      const cursorDoc = await adminDb.collection('subscribers').doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    // Fetch requestedLimit + 1 to reliably determine if more records exist without extra round-trip
    const snap = await query.limit(requestedLimit + 1).get();
    const hasMore = snap.docs.length > requestedLimit;
    const resultDocs = hasMore ? snap.docs.slice(0, requestedLimit) : snap.docs;

    const subscribers: any[] = [];
    resultDocs.forEach((doc) => {
      const data = doc.data();
      subscribers.push({
        id: doc.id,
        email: data.email || '',
        name: data.name || 'مشترك في المنصة',
        source: data.source || 'signup',
        subscribedAt: data.subscribedAt || '',
        active: data.active !== false,
        receiveAllReleases: data.receiveAllReleases !== false,
      });
    });

    const nextCursor = hasMore && resultDocs.length > 0 ? resultDocs[resultDocs.length - 1].id : null;

    return res.json({
      success: true,
      count: subscribers.length,
      hasMore,
      nextCursor,
      subscribers,
    });
  } catch (err: any) {
    console.error('Error fetching subscribers from Firestore:', err);
    return res.status(500).json({
      success: false,
      subscribers: [],
      message: 'حدث خطأ في الخادم أثناء جلب سجلات المشتركين من قاعدة البيانات.',
    });
  }
});

/**
 * Toggle Subscriber Active Status in Firestore
 * Strictly requires verified OWNER or ADMIN identity with active admin document.
 */
emailApiRouter.post('/subscribers/:id/toggle', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'owner' && user.role !== 'admin') || !user.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح: صلاحية تعديل حالة المشتركين مقتصرة على المشرفين فقط.',
    });
  }

  try {
    const adminDoc = await adminDb.collection('admins').doc(user.uid).get();
    if (!adminDoc.exists || (adminDoc.data()?.role !== 'owner' && adminDoc.data()?.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح: السجل الإداري غير فعال.',
      });
    }

    const subId = req.params.id;
    const { active } = req.body;

    const subRef = adminDb.collection('subscribers').doc(subId);
    const subDoc = await subRef.get();
    if (!subDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'المشترك المطلوب غير موجود في قاعدة البيانات.',
      });
    }

    const newActiveState = typeof active === 'boolean' ? active : !subDoc.data()?.active;
    await subRef.update({
      active: newActiveState,
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      active: newActiveState,
      message: `تم ${newActiveState ? 'تفعيل' : 'تعطيل'} اشتراك المستخدم بنجاح.`,
    });
  } catch (err: any) {
    console.error('Error toggling subscriber active status:', err);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث حالة المشترك في قاعدة البيانات.',
    });
  }
});

