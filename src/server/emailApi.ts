import { Router, type Request, type Response } from 'express';
import { authenticateToken } from './authClaimsApi.ts';
import { adminDb } from './firebaseAdmin.ts';
import { createRateLimiter } from './requestProtection.ts';
import { isValidEmailAddress, resolveEmailRecipientTarget } from './emailRecipients.ts';
import { createGmailTransporter, resolveEmailProviderConfig } from './emailProvider.ts';

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
  const providerConfig = resolveEmailProviderConfig(process.env);
  const configured = Boolean(providerConfig && providerConfig.kind !== 'misconfigured');
  const providerName = providerConfig?.kind === 'gmail'
    ? 'Gmail SMTP'
    : providerConfig?.kind === 'resend'
      ? 'Resend API'
      : null;

  return res.json({
    success: true,
    configured,
    provider: providerName,
    message: configured
      ? `تم ضبط مزود البريد (${providerName}). لم يتم التحقق من بيانات الدخول أو قبول الرسائل إلا بعد إرسال فعلي.`
      : providerConfig?.kind === 'misconfigured'
        ? providerConfig.message
        : 'لم يتم إعداد مزود بريد. اضبط GMAIL_USER و GMAIL_APP_PASSWORD لاستخدام Gmail، أو RESEND_API_KEY و EMAIL_FROM لاستخدام Resend.',
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
    if (adminRole !== user.role) {
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

  const providerConfig = resolveEmailProviderConfig(process.env);
  if (!providerConfig || providerConfig.kind === 'misconfigured') {
    return res.status(503).json({
      success: false,
      delivered: false,
      configured: false,
      message: providerConfig?.kind === 'misconfigured'
        ? providerConfig.message
        : 'لم يتم إعداد مزود بريد. اضبط GMAIL_USER و GMAIL_APP_PASSWORD أو RESEND_API_KEY و EMAIL_FROM.',
    });
  }

  let recipients: string[] = [];
  let actualDispatchedCount = 0;
  const providerIds: string[] = [];
  let partialDispatch = false;
  let gmailTransporter: ReturnType<typeof createGmailTransporter> | null = null;

  try {
    // 2. Determine recipients list. Normalize and deduplicate broadcast addresses.
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
      return res.status(400).json({ success: false, message: 'لا يوجد مشتركون نشطون صالحون لإرسال الرسالة إليهم.' });
    }

    // 3. Dispatch in private batches of 50. Broadcast recipients are BCC'd so
    // subscribers never receive one another's email addresses.
    // Once a batch is accepted, never report a later provider/network failure as if nothing was sent.
    const fromAddress = providerConfig.from;
    const BATCH_SIZE = 50;
    if (providerConfig.kind === 'gmail') {
      gmailTransporter = createGmailTransporter(providerConfig);
    }

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      if (providerConfig.kind === 'gmail') {
        if (!gmailTransporter) throw new Error('Gmail SMTP transporter was not initialized.');
        let acceptedCount = 0;
        let messageId = '';
        try {
          const info = await gmailTransporter.sendMail({
            from: providerConfig.from,
            to: recipientTarget.kind === 'individual' ? batch : providerConfig.user,
            bcc: recipientTarget.kind === 'individual' ? undefined : batch,
            replyTo: providerConfig.user,
            subject: subject.trim(),
            html: htmlContent,
          });
          // Broadcasts include one sender copy in the visible To field plus BCC recipients.
          acceptedCount = Math.min(batch.length, Array.isArray(info.accepted) ? info.accepted.length : batch.length);
          messageId = info.messageId || '';
        } catch (providerError) {
          console.error(`Gmail SMTP failure at batch index ${i}.`, providerError);
          if (actualDispatchedCount === 0) throw providerError;
          partialDispatch = true;
          break;
        }

        actualDispatchedCount += acceptedCount;
        if (messageId) providerIds.push(messageId);
        if (acceptedCount !== batch.length || (Array.isArray(info.rejected) && info.rejected.length > 0)) {
          partialDispatch = true;
          break;
        }
        continue;
      }

      let response: Awaited<ReturnType<typeof fetch>>;

      try {
        response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${providerConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: recipientTarget.kind === 'individual' ? batch : [fromAddress],
            bcc: recipientTarget.kind === 'individual' ? undefined : batch,
            subject: subject.trim(),
            html: htmlContent,
          }),
        });
      } catch (providerError) {
        console.error(`Email provider network failure at batch index ${i}:`, providerError);
        if (actualDispatchedCount === 0) throw providerError;
        partialDispatch = true;
        break;
      }

      let result: { id?: string; message?: string } = {};
      try {
        result = await response.json();
      } catch {
        // A successful HTTP response still means the provider accepted the batch;
        // a missing response body only prevents us from recording its provider ID.
      }

      if (!response.ok) {
        console.error(`Email provider rejected batch at index ${i}.`);
        if (actualDispatchedCount === 0) {
          return res.status(502).json({
            success: false,
            delivered: false,
            acceptedByProvider: false,
            message: 'رفض مزود البريد أول دفعة. لم يتم قبول أي مستلم للإرسال.',
          });
        }
        partialDispatch = true;
        break;
      }

      actualDispatchedCount += batch.length;
      if (result.id) providerIds.push(result.id);
    }

    const isComplete = !partialDispatch && actualDispatchedCount === recipients.length;
    const logId = `log-${Date.now()}`;
    let logSaved = true;

    // 4. Persist the provider-accepted count separately. A log failure must not
    // erase the fact that the provider already accepted the email request.
    try {
      await adminDb.collection('emailLogs').doc(logId).set({
        id: logId,
        subject: subject.trim(),
        recipientCount: actualDispatchedCount,
        totalRequested: recipients.length,
        recipientEmail: recipientTarget.kind === 'individual' ? recipientTarget.email : null,
        timestamp: new Date().toISOString(),
        type: typeof type === 'string' ? type : 'announcement',
        bookTitle: typeof bookTitle === 'string' ? bookTitle : null,
        providerId: providerIds.join(',') || 'unknown',
        delivered: actualDispatchedCount > 0,
        acceptedByProvider: actualDispatchedCount > 0,
        partial: !isComplete,
        senderUid: user.uid,
        provider: providerConfig.kind,
      });
    } catch (logError) {
      logSaved = false;
      console.error('Email provider accepted the request, but the Firestore email log could not be saved:', logError);
    }

    const message = isComplete
      ? `قبل مزود البريد الإرسال إلى ${actualDispatchedCount} مستلم.`
      : `إرسال جزئي: قبل مزود البريد ${actualDispatchedCount} من أصل ${recipients.length} مستلم فقط. أوقفنا الدفعات المتبقية لتجنب إعادة الإرسال المكرر.`;
    const logWarning = logSaved
      ? ''
      : ' تعذر حفظ سجل العملية في قاعدة البيانات، لكن مزود البريد قبل الإرسال بالفعل؛ لا تعاود الإرسال قبل مراجعة سجل المزود.';

    return res.status(isComplete ? 200 : 207).json({
      success: isComplete && logSaved,
      delivered: actualDispatchedCount > 0,
      acceptedByProvider: actualDispatchedCount > 0,
      partial: !isComplete,
      logSaved,
      providerId: providerIds[0] || null,
      providerIds,
      recipientCount: actualDispatchedCount,
      totalSubscribers: recipients.length,
      totalRequested: recipients.length,
      message: message + logWarning,
    });
  } catch (err: any) {
    console.error('Email sending exception:', err);
    if (actualDispatchedCount > 0) {
      return res.status(200).json({
        success: false,
        delivered: true,
        acceptedByProvider: true,
        partial: true,
        logSaved: false,
        recipientCount: actualDispatchedCount,
        totalRequested: recipients.length,
        message: `تم قبول الإرسال إلى ${actualDispatchedCount} من أصل ${recipients.length} مستلم، ثم حدث خطأ قبل اكتمال العملية. لا تعاود الإرسال قبل مراجعة سجل مزود البريد.`,
      });
    }
    return res.status(500).json({
      success: false,
      delivered: false,
      acceptedByProvider: false,
      message: 'حدث خطأ داخلي أثناء إرسال البريد. لم يتم تأكيد قبول أي رسالة.',
    });
  } finally {
    gmailTransporter?.close();
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
    if (adminRole !== user.role) {
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
    if (!adminDoc.exists || adminDoc.data()?.role !== user.role) {
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

