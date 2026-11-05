import { Router, type Request, type Response } from 'express';
import { adminAuth, adminDb } from './firebaseAdmin.ts';

export const authClaimsRouter = Router();

// Middleware to verify caller identity from Firebase ID token with strict token revocation checking
export async function authenticateToken(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'مطلوب رمز مصادقة صالح (Unauthorized)' });
  }

  const token = authHeader.split('Bearer ')[1]!.trim();
  try {
    // CRITICAL: checkRevoked = true ensures revoked tokens are immediately rejected by Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token, true);
    (req as any).user = decodedToken;
    next();
  } catch (err: any) {
    if (err.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'تم إلغاء صلاحية هذا التوكن نهائياً (Token Revoked). يرجى إعادة تسجيل الدخول.',
      });
    }
    return res.status(401).json({ success: false, message: 'رمز الدخول غير صالح أو منتهي الصلاحية' });
  }
}

// Middleware to enforce OWNER-only access strictly from Custom Claims and verified /admins/{uid} document
export async function requireOwnerRole(req: Request, res: Response, next: () => void) {
  const user = (req as any).user;
  if (!user || user.role !== 'owner' || !user.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح: هذه العملية مقتصرة حصرياً على صاحب المنصة (Owner) ولا يملكها المشرفون الآخرون.',
    });
  }

  try {
    const adminDoc = await adminDb.collection('admins').doc(user.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح: حساب المالك غير مسجل أو ملغى في سجل الإدارة الرسمي (/admins/{uid}).',
      });
    }
    next();
  } catch (err: any) {
    console.error('requireOwnerRole verification error:', err);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من السجل الإداري للمالك في قاعدة البيانات.',
    });
  }
}

/**
 * 1. Public /bootstrap endpoint is PERMANENTLY DISABLED
 * Initial OWNER assignment must strictly occur via the operator-controlled CLI script:
 *   npx tsx scripts/bootstrap-owner.ts
 */
authClaimsRouter.post('/bootstrap', (_req: Request, res: Response) => {
  return res.status(403).json({
    success: false,
    message: 'تم تعطيل نقطة التهيئة عبر HTTP لدواعي أمنية مشددة. التهيئة الأولية تتم حصرًا بواسطة المشغل عبر السكربت الميداني scripts/bootstrap-owner.ts.',
  });
});

/**
 * 2. Search User by Email (Strictly for OWNER)
 * Returns the verified Firebase UID and verification state so that privileges
 * are only assigned to existing, verified accounts.
 */
authClaimsRouter.post('/lookup-user', authenticateToken, requireOwnerRole, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'يرجى تزويد البريد الإلكتروني للبحث.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const userRecord = await adminAuth.getUserByEmail(cleanEmail);
    const customClaims = userRecord.customClaims || {};

    const isVerified = Boolean(userRecord.emailVerified);

    return res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || 'مستخدم مسجل',
        emailVerified: isVerified,
        currentRole: customClaims.role || 'reader',
        photoURL: userRecord.photoURL || null,
      },
    });
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على أي حساب مسجل بهذا البريد الإلكتروني في Firebase.',
      });
    }
    return res.status(500).json({ success: false, message: err.message || 'حدث خطأ أثناء البحث.' });
  }
});

/**
 * Direct role assignment is disabled. Admin privileges are granted only by
 * reviewing a previously submitted request through /admin-requests/:uid/review.
 */
authClaimsRouter.post('/set-role', authenticateToken, requireOwnerRole, (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message: 'تم إيقاف التعيين المباشر. يجب على المستخدم تقديم طلب ثم مراجعته من المالك.',
  });
});

authClaimsRouter.post('/admin-requests', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!user.email_verified) {
    return res.status(403).json({ success: false, message: 'يجب تأكيد بريدك الإلكتروني قبل تقديم طلب الإدارة.' });
  }
  if (!reason || reason.length > 500) {
    return res.status(400).json({ success: false, message: 'اكتب سبباً واضحاً للطلب بحد أقصى 500 حرف.' });
  }

  try {
    const account = await adminAuth.getUser(user.uid);
    if (!account.emailVerified || !account.email) {
      return res.status(403).json({ success: false, message: 'يجب أن يكون البريد الإلكتروني للحساب مؤكداً.' });
    }
    const claims = account.customClaims || {};
    if (claims.role === 'owner' || claims.role === 'admin') {
      return res.status(409).json({ success: false, message: 'حسابك يمتلك صلاحيات إدارية بالفعل.' });
    }

    const requestRef = adminDb.collection('adminRequests').doc(user.uid);
    const now = new Date().toISOString();
    const requestData = {
      uid: user.uid,
      email: account.email,
      displayName: account.displayName || 'مستخدم حُكم',
      reason,
      status: 'pending',
      submittedAt: now,
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null,
    };

    const result = await adminDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(requestRef);
      const status = existing.exists ? existing.data()?.status : null;
      if (status === 'pending' || status === 'processing' || status === 'approved') {
        return { accepted: false, status };
      }
      transaction.set(requestRef, requestData);
      return { accepted: true, status: 'pending' };
    });

    if (!result.accepted) {
      return res.status(409).json({
        success: false,
        message: result.status === 'approved'
          ? 'تمت الموافقة على طلبك بالفعل.'
          : 'لديك طلب إدارة قيد المراجعة بالفعل.',
      });
    }
    return res.status(201).json({ success: true, request: requestData, message: 'تم إرسال طلبك إلى صاحب المنصة للمراجعة.' });
  } catch (err: any) {
    console.error('Create admin request error:', err);
    return res.status(500).json({ success: false, message: 'تعذر إرسال الطلب حالياً. حاول مرة أخرى لاحقاً.' });
  }
});

authClaimsRouter.get('/admin-requests/mine', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const snap = await adminDb.collection('adminRequests').doc(user.uid).get();
    return res.json({ success: true, request: snap.exists ? snap.data() : null });
  } catch (err: any) {
    console.error('Read own admin request error:', err);
    return res.status(500).json({ success: false, message: 'تعذر تحميل حالة طلبك حالياً.' });
  }
});

authClaimsRouter.get('/admin-requests', authenticateToken, requireOwnerRole, async (_req: Request, res: Response) => {
  try {
    const snapshot = await adminDb.collection('adminRequests').where('status', 'in', ['pending', 'processing']).get();
    const requests = snapshot.docs
      .map((doc) => doc.data())
      .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
    return res.json({ success: true, requests });
  } catch (err: any) {
    console.error('List admin requests error:', err);
    return res.status(500).json({ success: false, message: 'تعذر تحميل طلبات الإدارة حالياً.' });
  }
});

authClaimsRouter.post('/admin-requests/:uid/review', authenticateToken, requireOwnerRole, async (req: Request, res: Response) => {
  const reviewer = (req as any).user;
  const targetUid = req.params.uid;
  const action = req.body?.action;
  const reviewNote = typeof req.body?.reviewNote === 'string' ? req.body.reviewNote.trim().slice(0, 500) : '';

  if (!targetUid || targetUid === reviewer.uid || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'بيانات مراجعة الطلب غير صالحة.' });
  }

  const requestRef = adminDb.collection('adminRequests').doc(targetUid);
  const now = new Date().toISOString();

  try {
    const lock = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(requestRef);
      if (!snap.exists) return { acquired: false, reason: 'NOT_FOUND' };
      const data = snap.data()!;
      const staleProcessing = data.status === 'processing' &&
        Number.isFinite(Date.parse(data.processingAt || '')) &&
        Date.parse(data.processingAt) < Date.now() - 5 * 60 * 1000;
      if (data.status !== 'pending' && !staleProcessing) {
        return { acquired: false, reason: data.status || 'INVALID_STATE' };
      }
      transaction.update(requestRef, {
        status: 'processing',
        processingAt: now,
        reviewedBy: reviewer.uid,
      });
      return { acquired: true, data };
    });

    if (!lock.acquired) {
      return res.status(lock.reason === 'NOT_FOUND' ? 404 : 409).json({
        success: false,
        message: lock.reason === 'NOT_FOUND' ? 'الطلب غير موجود.' : 'تمت معالجة هذا الطلب أو يجري التعامل معه بالفعل.',
      });
    }

    if (action === 'reject') {
      await requestRef.update({
        status: 'rejected',
        reviewedAt: now,
        reviewedBy: reviewer.uid,
        reviewNote,
        processingAt: null,
      });
      return res.json({ success: true, message: 'تم رفض الطلب. لم تُمنح أي صلاحيات إدارية.' });
    }

    let adminDocWritten = false;
    let claimsWritten = false;
    let existingClaims: Record<string, any> = {};
    try {
      const targetUser = await adminAuth.getUser(targetUid);
      existingClaims = (targetUser.customClaims || {}) as Record<string, any>;
      if (!targetUser.emailVerified || !targetUser.email) {
        throw new Error('لا يمكن قبول الطلب لأن البريد الإلكتروني للحساب غير مؤكد.');
      }
      if (existingClaims.role === 'owner' || existingClaims.role === 'admin') {
        throw new Error('الحساب يمتلك صلاحيات إدارية بالفعل.');
      }

      await adminDb.collection('admins').doc(targetUid).set({
        id: targetUid,
        uid: targetUid,
        email: targetUser.email,
        name: targetUser.displayName || 'مدير معتمد',
        title: 'مدير معتمد',
        role: 'admin',
        isFounder: false,
        canEditBooks: true,
        canManageBans: true,
        addedBy: reviewer.uid,
        addedAt: now,
      });
      adminDocWritten = true;

      await adminAuth.setCustomUserClaims(targetUid, {
        ...existingClaims,
        role: 'admin',
      });
      claimsWritten = true;
      await adminAuth.revokeRefreshTokens(targetUid);

      await requestRef.update({
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewer.uid,
        reviewNote,
        processingAt: null,
      });
      return res.json({ success: true, message: 'تمت الموافقة على الطلب ومنح صلاحيات المدير بنجاح. سيحتاج المستخدم إلى تحديث جلسة الدخول.' });
    } catch (approvalError: any) {
      let rollbackSucceeded = true;
      try {
        if (claimsWritten) await adminAuth.setCustomUserClaims(targetUid, existingClaims);
        if (adminDocWritten) await adminDb.collection('admins').doc(targetUid).delete();
        if (claimsWritten) await adminAuth.revokeRefreshTokens(targetUid);
      } catch (rollbackError) {
        rollbackSucceeded = false;
        console.error('Admin approval rollback failed:', rollbackError);
      }
      try {
        await requestRef.update({
          status: rollbackSucceeded ? 'pending' : 'needs_attention',
          processingAt: null,
          lastError: String(approvalError?.message || 'Approval failed').slice(0, 500),
        });
      } catch (stateError) {
        console.error('Admin request state recovery failed:', stateError);
      }
      return res.status(rollbackSucceeded ? 400 : 500).json({
        success: false,
        message: rollbackSucceeded
          ? (approvalError.message || 'تعذرت الموافقة على الطلب، وأُعيدت الحالة دون منح صلاحيات.')
          : 'حدث خلل أثناء التراجع الآمن. أوقفنا إعادة المحاولة التلقائية ويجب فحص الطلب من المالك.',
      });
    }
  } catch (err: any) {
    console.error('Review admin request error:', err);
    return res.status(500).json({ success: false, message: 'تعذرت مراجعة الطلب حالياً.' });
  }
});

/**
 * 6. Revoke Admin Role (Strictly for OWNER)
 * Completely strips administrative Custom Claims and deletes admins/{uid}.
 * Preserves other custom claims. Immediately deletes Firestore doc first for instant revocation.
 */
authClaimsRouter.post('/revoke-role', authenticateToken, requireOwnerRole, async (req: Request, res: Response) => {
  const { targetUid } = req.body;

  if (!targetUid || typeof targetUid !== 'string') {
    return res.status(400).json({ success: false, message: 'معرف المستخدم (UID) مطلوب.' });
  }

  try {
    const adminDocRef = adminDb.collection('admins').doc(targetUid);
    const adminSnap = await adminDocRef.get();

    if (adminSnap.exists && adminSnap.data()?.isFounder) {
      return res.status(403).json({ success: false, message: 'لا يمكن سحب صلاحيات المؤسس الرئيسي للمنصة.' });
    }

    const targetUser = await adminAuth.getUser(targetUid);
    const existingClaims = (targetUser.customClaims || {}) as Record<string, any>;

    // 1. Remove from admins registry FIRST (instantly revokes Firestore access via rule: exists(/admins/$(uid)))
    await adminDocRef.delete();

    // 2. Revoke administrative claim while preserving other custom claims
    await adminAuth.setCustomUserClaims(targetUid, {
      ...existingClaims,
      role: 'reader',
    });
    
    // 3. Revoke refresh tokens
    await adminAuth.revokeRefreshTokens(targetUid);

    return res.json({
      success: true,
      message: 'تم سحب صلاحيات الإدارة وإلغاء الجلسات والتصاريح فورياً بنجاح.',
    });
  } catch (err: any) {
    console.error('Revoke role error:', err);
    return res.status(500).json({ success: false, message: err.message || 'فشلت عملية سحب الصلاحيات.' });
  }
});

/**
 * 7. Current User Claims Info
 */
authClaimsRouter.get('/my-claims', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  return res.json({
    success: true,
    uid: user.uid,
    email: user.email,
    role: user.role || 'reader',
    emailVerified: Boolean(user.email_verified),
  });
});
