import { Router, type Request, type Response } from 'express';
import { authenticateToken, requireOwnerRole } from './authClaimsApi.ts';
import { adminDb } from './firebaseAdmin.ts';

export const emailApiRouter = Router();

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
 * Strictly requires verified OWNER or ADMIN identity.
 * Rejects simulation; fails honestly if email provider credentials are not set.
 */
emailApiRouter.post('/send', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || (user.role !== 'owner' && user.role !== 'admin') || !user.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح: صلاحية إرسال البريد مقتصرة على المشرفين والمالك المعتمدين فقط.',
    });
  }

  const { subject, htmlContent, recipientEmail, type, bookTitle } = req.body;

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ success: false, message: 'عنوان الرسالة مطلوب.' });
  }

  if (!htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim()) {
    return res.status(400).json({ success: false, message: 'محتوى الرسالة مطلوب.' });
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
    // 1. Determine recipients
    let recipients: string[] = [];
    if (recipientEmail && typeof recipientEmail === 'string') {
      recipients = [recipientEmail.trim().toLowerCase()];
    } else {
      // Broadcast to active subscribers in Firestore
      const subscribersSnap = await adminDb.collection('subscribers').where('active', '==', true).get();
      subscribersSnap.forEach((doc) => {
        const data = doc.data();
        if (data.email) recipients.push(data.email.toLowerCase().trim());
      });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'لا يوجد مشتركون نشطون لإرسال الرسالة إليهم.' });
    }

    // 2. Real dispatch through Resend REST API
    const fromAddress = process.env.EMAIL_FROM || 'HUKM MEDIA <updates@hukm.media>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients.slice(0, 50), // Batch up to 50
        subject: subject.trim(),
        html: htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Email provider error:', result);
      return res.status(502).json({
        success: false,
        delivered: false,
        message: `فشل الإرسال من مزود الخدمة: ${result.message || 'خطأ غير معروف في مزود البريد'}`,
      });
    }

    // 3. Record real verified log in Firestore
    const logId = `log-${Date.now()}`;
    await adminDb.collection('emailLogs').doc(logId).set({
      id: logId,
      subject: subject.trim(),
      recipientCount: recipients.length,
      recipientEmail: recipientEmail || null,
      timestamp: new Date().toISOString(),
      type: type || 'announcement',
      bookTitle: bookTitle || null,
      providerId: result.id,
      delivered: true,
      senderUid: user.uid,
    });

    return res.json({
      success: true,
      delivered: true,
      providerId: result.id,
      recipientCount: recipients.length,
      message: `تم إرسال البريد بنجاح وموثق برقم العملية: ${result.id}`,
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
