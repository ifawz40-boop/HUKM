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
 * 3. Assign Role (Strictly for OWNER)
 * Grants Custom Claim `role: 'admin' | 'reader'`. ADMINS CANNOT CALL THIS.
 * Prevents unverified email accounts from obtaining administrative roles.
 * Preserves existing custom claims and ensures atomic synchronization ordering.
 */
authClaimsRouter.post('/set-role', authenticateToken, requireOwnerRole, async (req: Request, res: Response) => {
  const caller = (req as any).user;
  const { targetUid, role, title } = req.body;

  if (!targetUid || typeof targetUid !== 'string') {
    return res.status(400).json({ success: false, message: 'معرف المستخدم (UID) مطلوب.' });
  }

  if (role !== 'admin' && role !== 'reader') {
    return res.status(400).json({ success: false, message: 'الدور المطلوب غير مدعوم (يجب أن يكون admin أو reader).' });
  }

  try {
    const targetUser = await adminAuth.getUser(targetUid);
    const existingClaims = (targetUser.customClaims || {}) as Record<string, any>;

    // Prevent granting admin to unverified accounts (strictly check targetUser.emailVerified)
    const isVerified = Boolean(targetUser.emailVerified);

    if (role === 'admin' && !isVerified) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن منح صلاحيات إدارية لحساب بريد إلكتروني غير مؤكد. يجب على المستخدم تأكيد بريده أولاً.',
      });
    }

    const adminDocRef = adminDb.collection('admins').doc(targetUid);

    if (role === 'admin') {
      // 1. Establish the Firestore admin record first so that when claims are granted, /admins/{uid} exists
      await adminDocRef.set({
        id: targetUid,
        uid: targetUid,
        email: targetUser.email,
        name: targetUser.displayName || 'مدير معتمد',
        title: title || 'مدير تحرير معتمد',
        role: 'admin',
        isFounder: false,
        canEditBooks: true,
        canManageBans: true,
        addedBy: caller.uid,
        addedAt: new Date().toISOString(),
      });

      // 2. Grant Custom Claims while preserving other existing custom claims
      await adminAuth.setCustomUserClaims(targetUid, {
        ...existingClaims,
        role: 'admin',
      });

      // 3. Invalidate stale client tokens immediately
      await adminAuth.revokeRefreshTokens(targetUid);
    } else {
      // Downgrade to reader:
      // 1. Delete admin document FIRST (immediately cuts off Firestore access via rules check exists(/admins/{uid}))
      await adminDocRef.delete();

      // 2. Demote Custom Claims while preserving other existing custom claims
      await adminAuth.setCustomUserClaims(targetUid, {
        ...existingClaims,
        role: 'reader',
      });

      // 3. Invalidate stale client tokens immediately
      await adminAuth.revokeRefreshTokens(targetUid);
    }

    return res.json({
      success: true,
      message: `تم تحديث رتبة وصلاحيات الحساب إلى (${role === 'admin' ? 'مدير' : 'قارئ'}) وتطبيق Custom Claims بنجاح.`,
    });
  } catch (err: any) {
    console.error('Set role error:', err);
    return res.status(500).json({ success: false, message: err.message || 'فشلت عملية تحديث الصلاحية.' });
  }
});

/**
 * 4. Revoke Admin Role (Strictly for OWNER)
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
 * 5. Current User Claims Info
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
