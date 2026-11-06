import { Router, type Request, type Response } from 'express';
import { adminAuth, adminDb } from './firebaseAdmin.ts';
import { isValidOwnerEmail } from './ownerBootstrapGuards.ts';

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
 * Only the original founder may appoint additional owners.
 * Other owners retain normal owner powers but cannot expand the owner group.
 */
export async function requireFounderOwner(req: Request, res: Response, next: () => void) {
  const user = (req as any).user;
  if (!user || user.role !== 'owner' || !user.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح: هذه العملية مقتصرة على المالك المؤسس الأساسي.',
    });
  }

  try {
    const founderDoc = await adminDb.collection('admins').doc(user.uid).get();
    if (!founderDoc.exists || founderDoc.data()?.role !== 'owner' || founderDoc.data()?.isFounder !== true) {
      return res.status(403).json({
        success: false,
        message: 'إضافة مالكين جدد مقتصرة حصريًا على المالك المؤسس الأساسي.',
      });
    }
    next();
  } catch (err: any) {
    console.error('requireFounderOwner verification error:', err);
    return res.status(500).json({
      success: false,
      message: 'تعذر التحقق من صفة المالك المؤسس في السجل الرسمي.',
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
    return res.status(500).json({ success: false, message: 'حدث خطأ داخلي أثناء البحث عن الحساب. يرجى المحاولة لاحقاً.' });
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
    const snapshot = await adminDb.collection('adminRequests').where('status', 'in', ['pending', 'processing', 'needs_attention']).get();
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
  let processingLockAcquired = false;

  try {
    const lock = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(requestRef);
      if (!snap.exists) return { acquired: false as const, reason: 'NOT_FOUND' };
      const data = snap.data()!;
      const staleProcessing = data.status === 'processing' &&
        Number.isFinite(Date.parse(data.processingAt || '')) &&
        Date.parse(data.processingAt) < Date.now() - 5 * 60 * 1000;
      if (data.status !== 'pending' && !staleProcessing) {
        return { acquired: false as const, reason: data.status || 'INVALID_STATE' };
      }
      transaction.update(requestRef, {
        status: 'processing',
        processingAt: now,
        reviewedBy: reviewer.uid,
      });
      return { acquired: true as const, data };
    });

    if (!lock.acquired) {
      return res.status(lock.reason === 'NOT_FOUND' ? 404 : 409).json({
        success: false,
        message: lock.reason === 'NOT_FOUND' ? 'الطلب غير موجود.' : 'تمت معالجة هذا الطلب أو يجري التعامل معه بالفعل.',
      });
    }

    processingLockAcquired = true;

    if (action === 'reject') {
      await requestRef.update({
        status: 'rejected',
        reviewedAt: now,
        reviewedBy: reviewer.uid,
        reviewNote,
        processingAt: null,
      });
      processingLockAcquired = false;
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
      processingLockAcquired = false;
      return res.json({ success: true, message: 'تمت الموافقة على الطلب ومنح صلاحيات المدير بنجاح. سيحتاج المستخدم إلى تحديث جلسة الدخول.' });
    } catch (approvalError: any) {
      let rollbackSucceeded = true;
      // Remove the registry document first so Firestore rules deny admin access immediately.
      if (adminDocWritten) {
        try {
          await adminDb.collection('admins').doc(targetUid).delete();
        } catch (rollbackError) {
          rollbackSucceeded = false;
          console.error('Admin document rollback failed:', rollbackError);
        }
      }
      if (claimsWritten) {
        try {
          await adminAuth.setCustomUserClaims(targetUid, existingClaims);
        } catch (rollbackError) {
          rollbackSucceeded = false;
          console.error('Admin claims rollback failed:', rollbackError);
        }
        try {
          await adminAuth.revokeRefreshTokens(targetUid);
        } catch (rollbackError) {
          rollbackSucceeded = false;
          console.error('Admin token rollback failed:', rollbackError);
        }
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
    if (processingLockAcquired) {
      try {
        await requestRef.update({ status: 'pending', processingAt: null, lastError: String(err?.message || 'Review failed').slice(0, 500) });
      } catch (recoveryError) {
        console.error('Admin request lock recovery failed:', recoveryError);
      }
    }
    console.error('Review admin request error:', err);
    return res.status(500).json({ success: false, message: 'تعذرت مراجعة الطلب حالياً.' });
  }
});

/**
 * Grant an additional OWNER role. Only the verified founder may call this.
 * Additional owners are explicitly non-founder and cannot appoint other owners.
 */
authClaimsRouter.post('/grant-owner', authenticateToken, requireFounderOwner, async (req: Request, res: Response) => {
  const actor = (req as any).user;
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  if (!isValidOwnerEmail(email)) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال بريد إلكتروني صحيح للحساب المراد ترقيته.' });
  }

  try {
    const targetUser = await adminAuth.getUserByEmail(email);
    if (targetUser.uid === actor.uid) {
      return res.status(400).json({ success: false, message: 'لا يمكن ترقية حساب المالك الحالي مرة أخرى.' });
    }
    if (!targetUser.emailVerified || !targetUser.email) {
      return res.status(403).json({ success: false, message: 'يجب أن يكون بريد الحساب المستهدف موثقًا في Firebase Authentication.' });
    }

    const previousClaims = (targetUser.customClaims || {}) as Record<string, any>;
    if (previousClaims.role !== undefined && previousClaims.role !== null && previousClaims.role !== 'reader') {
      return res.status(409).json({ success: false, message: 'الحساب يمتلك رتبة أو مطالبة صلاحيات غير متوقعة؛ لم يتم تغييرها.' });
    }

    const targetRef = adminDb.collection('admins').doc(targetUser.uid);
    const existing = await targetRef.get();
    if (existing.exists) {
      return res.status(409).json({ success: false, message: 'يوجد سجل إداري لهذا الحساب بالفعل؛ لم يتم استبداله.' });
    }

    const now = new Date().toISOString();
    let registryCreated = false;
    let claimsChangeAttempted = false;
    try {
      await targetRef.create({
        id: targetUser.uid,
        uid: targetUser.uid,
        email: targetUser.email,
        name: targetUser.displayName || 'مالك معتمد',
        title: 'مالك معتمد',
        role: 'owner',
        isFounder: false,
        canEditBooks: true,
        canManageBans: true,
        addedBy: actor.uid,
        addedAt: now,
      });
      registryCreated = true;

      claimsChangeAttempted = true;
      await adminAuth.setCustomUserClaims(targetUser.uid, {
        ...previousClaims,
        role: 'owner',
      });
      await adminAuth.revokeRefreshTokens(targetUser.uid);

      return res.status(200).json({
        success: true,
        message: 'تمت إضافة المالك الجديد بنجاح. يجب عليه تسجيل الدخول مجددًا لتحديث الجلسة.',
        owner: { uid: targetUser.uid, email: targetUser.email },
      });
    } catch (grantError: any) {
      let rollbackSucceeded = true;
      if (registryCreated) {
        try {
          await targetRef.delete();
        } catch (rollbackError) {
          rollbackSucceeded = false;
          console.error('Additional owner registry rollback failed:', rollbackError);
        }
      }
      if (claimsChangeAttempted) {
        try {
          await adminAuth.setCustomUserClaims(targetUser.uid, previousClaims);
          await adminAuth.revokeRefreshTokens(targetUser.uid);
        } catch (rollbackError) {
          rollbackSucceeded = false;
          console.error('Additional owner claims rollback failed:', rollbackError);
        }
      }
      console.error('Grant additional owner failed:', grantError);
      return res.status(rollbackSucceeded ? 400 : 500).json({
        success: false,
        message: rollbackSucceeded
          ? 'تعذرت إضافة المالك؛ أُعيدت التغييرات ولم تُمنح الصلاحية.'
          : 'فشل التراجع الكامل عن عملية الإضافة. يلزم فحص سجل الحساب قبل أي إعادة محاولة.',
      });
    }
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على الحساب في Firebase Authentication. يجب أن يسجل أولًا.' });
    }
    console.error('Grant additional owner error:', err);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء إضافة المالك. لم يتم تأكيد نجاح العملية.' });
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
    return res.status(500).json({ success: false, message: 'حدث خطأ داخلي أثناء سحب الصلاحيات. يرجى المحاولة لاحقاً.' });
  }
});

authClaimsRouter.get('/legacy-library-purge-status', authenticateToken, requireFounderOwner, async (_req: Request, res: Response) => {
  try {
    const snapshot = await adminDb.collection('_system').doc('legacyLibraryPurge').get();
    const data = snapshot.data() || {};
    return res.json({
      success: true,
      status: data.status || 'not_started',
      deleted: data.deleted || null,
      completedAt: data.completedAt || null,
    });
  } catch (error) {
    console.error('Read legacy library purge status failed:', error);
    return res.status(500).json({ success: false, message: 'تعذر قراءة حالة تنظيف المكتبة القديمة.' });
  }
});

/**
 * One-time legacy catalogue cleanup.
 * Only the original founder can invoke it, and the exact confirmation phrase is mandatory.
 * This deletes only top-level legacy book, draft-chapter and category documents.
 * User profiles, reading progress, bookmarks, annotations, notifications, subscribers,
 * admin records and bootstrap state are deliberately preserved.
 */
authClaimsRouter.post('/purge-legacy-library', authenticateToken, requireFounderOwner, async (req: Request, res: Response) => {
  const actor = (req as any).user;
  if (req.body?.confirmation !== 'DELETE_ALL_LEGACY_LIBRARY_DATA') {
    return res.status(400).json({
      success: false,
      message: 'يلزم تأكيد العملية بعبارة DELETE_ALL_LEGACY_LIBRARY_DATA حرفيًا.',
    });
  }

  const lockRef = adminDb.collection('_system').doc('legacyLibraryPurge');
  const startedAt = new Date().toISOString();
  const reservation = await adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(lockRef);
    const status = existing.data()?.status;
    if (status === 'completed') return { accepted: false, status: 'completed' };
    if (status === 'running') return { accepted: false, status: 'running' };
    transaction.set(lockRef, {
      status: 'running',
      startedAt,
      startedBy: actor.uid,
      scope: ['books', 'bookDraftChapters', 'categories'],
      attempt: Number(existing.data()?.attempt || 0) + 1,
    }, { merge: true });
    return { accepted: true, status: 'running' };
  });

  if (!reservation.accepted) {
    return res.status(409).json({
      success: false,
      code: 'LEGACY_LIBRARY_PURGE_' + reservation.status.toUpperCase(),
      message: reservation.status === 'completed'
        ? 'تم تنظيف بيانات المكتبة القديمة بالفعل. لن تُكرر العملية.'
        : 'عملية تنظيف المكتبة جارية بالفعل.',
    });
  }

  const deleted = { books: 0, bookDraftChapters: 0, categories: 0 };
  try {
    for (const collectionName of ['books', 'bookDraftChapters', 'categories'] as const) {
      while (true) {
        const snapshot = await adminDb.collection(collectionName).limit(400).get();
        if (snapshot.empty) break;
        const batch = adminDb.batch();
        snapshot.docs.forEach((document) => batch.delete(document.ref));
        await batch.commit();
        deleted[collectionName] += snapshot.size;
      }
    }

    const completedAt = new Date().toISOString();
    await lockRef.set({
      status: 'completed',
      completedAt,
      completedBy: actor.uid,
      deleted,
    }, { merge: true });

    return res.status(200).json({
      success: true,
      message: 'تم حذف سجلات المكتبة القديمة من Firestore بنجاح.',
      deleted,
      preserved: ['users', 'readingProgress', 'readerAnnotations', 'notifications', 'subscribers', 'admins', '_system/bootstrap'],
      completedAt,
    });
  } catch (error: any) {
    console.error('Legacy library purge failed:', error);
    await lockRef.set({
      status: 'failed',
      failedAt: new Date().toISOString(),
      failedBy: actor.uid,
      deleted,
      errorCode: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
    }, { merge: true }).catch((lockError) => {
      console.error('Could not persist legacy library purge failure state:', lockError);
    });
    return res.status(500).json({
      success: false,
      message: 'توقفت عملية التنظيف قبل اكتمالها. تم تسجيل ما حُذف ويمكن للمؤسس إعادة المحاولة بعد مراجعة الحالة.',
      deleted,
    });
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

/**
 * Check the authenticated user's own moderation status.
 * Bans are private in Firestore; the Admin SDK reads only the email asserted
 * by this caller's verified Firebase ID token and returns only that user's ban.
 */
authClaimsRouter.get('/account-status', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';

  if (!email) {
    return res.json({ success: true, banned: false, ban: null });
  }

  try {
    const snapshot = await adminDb.collection('bans').where('email', '==', email).get();
    const now = Date.now();
    const activeDocs = snapshot.docs
      .filter((document) => document.data()?.isActive === true)
      .filter((document) => {
        const data = document.data();
        if (data.banType !== 'temporary' || !data.expiresAt) return true;
        const expiresAt = Date.parse(String(data.expiresAt));
        // An invalid expiry timestamp does not silently lift a temporary ban.
        return !Number.isFinite(expiresAt) || expiresAt > now;
      })
      .sort((a, b) => String(b.data()?.bannedAt || '').localeCompare(String(a.data()?.bannedAt || '')));

    const document = activeDocs[0];
    if (!document) {
      return res.json({ success: true, banned: false, ban: null });
    }

    const data = document.data();
    return res.json({
      success: true,
      banned: true,
      ban: {
        id: document.id,
        email,
        name: typeof data.name === 'string' ? data.name : 'مستخدم مسجل',
        banType: data.banType === 'permanent' ? 'permanent' : 'temporary',
        reason: typeof data.reason === 'string' ? data.reason : 'مخالفة معايير المنصة.',
        bannedBy: typeof data.bannedBy === 'string' ? data.bannedBy : 'إدارة حُكم',
        bannedAt: typeof data.bannedAt === 'string' ? data.bannedAt : '',
        expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : undefined,
        isActive: true,
      },
    });
  } catch (error) {
    console.error('Read authenticated account moderation status failed:', error);
    return res.status(500).json({
      success: false,
      banned: false,
      ban: null,
      message: 'تعذر التحقق من حالة الحساب الآن. حاول تسجيل الدخول مجددًا لاحقًا.',
    });
  }
});
