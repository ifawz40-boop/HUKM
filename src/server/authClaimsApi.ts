import { Router, Request, Response } from 'express';
import { adminAuth, adminDb } from './firebaseAdmin';

export const authClaimsRouter = Router();

// Middleware to verify caller identity from Firebase ID token
export async function authenticateToken(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'مطلوب رمز مصادقة صالح (Unauthorized)' });
  }

  const token = authHeader.split('Bearer ')[1]!.trim();
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (err: any) {
    return res.status(401).json({ success: false, message: 'رمز الدخول غير صالح أو منتهي الصلاحية' });
  }
}

// Middleware to enforce OWNER-only access
export function requireOwnerRole(req: Request, res: Response, next: () => void) {
  const user = (req as any).user;
  if (!user || user.role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح: هذه العملية مقتصرة حصرياً على صاحب المنصة (Owner) ولا يملكها المشرفون الآخرون.',
    });
  }
  next();
}

/**
 * 1. Initial One-Time Bootstrap Endpoint
 * Assigns Founder as OWNER and Executive Manager as ADMIN.
 * Rejects execution once bootstrap has already occurred.
 */
authClaimsRouter.post('/bootstrap', async (req: Request, res: Response) => {
  try {
    const bootstrapRef = adminDb.collection('_system').doc('bootstrap');
    const bootstrapSnap = await bootstrapRef.get();

    if (bootstrapSnap.exists && bootstrapSnap.data()?.completed) {
      return res.status(403).json({
        success: false,
        message: 'تم تنفيذ التهيئة الأولية للمنصة مسبقاً، لا يمكن تكرار هذه العملية.',
      });
    }

    const { founderEmail, managerEmail, bootstrapKey } = req.body;
    const expectedKey = process.env.BOOTSTRAP_SECRET || 'HUKM_SECURE_INIT_2026';

    if (bootstrapKey && bootstrapKey !== expectedKey) {
      return res.status(401).json({ success: false, message: 'مفتاح التهيئة غير صالح.' });
    }

    const targetFounderEmail = (founderEmail || 'dr.islam.mohamed@hukm.media').toLowerCase().trim();
    const targetManagerEmail = (managerEmail || 'ifawz40@gmail.com').toLowerCase().trim();

    let founderUser;
    let managerUser;

    try {
      founderUser = await adminAuth.getUserByEmail(targetFounderEmail);
    } catch {
      // If user hasn't registered yet in Firebase Auth
    }

    try {
      managerUser = await adminAuth.getUserByEmail(targetManagerEmail);
    } catch {
      // If user hasn't registered yet in Firebase Auth
    }

    const results: Record<string, any> = {};

    if (founderUser) {
      await adminAuth.setCustomUserClaims(founderUser.uid, { role: 'owner' });
      await adminAuth.revokeRefreshTokens(founderUser.uid);
      await adminDb.collection('admins').doc(founderUser.uid).set({
        id: founderUser.uid,
        uid: founderUser.uid,
        email: founderUser.email,
        name: founderUser.displayName || 'Dr/ Islam Mohamed',
        title: 'المؤسس والمشرف العام للمنصة',
        role: 'owner',
        isFounder: true,
        canEditBooks: true,
        canManageBans: true,
        addedBy: 'SYSTEM_BOOTSTRAP',
        addedAt: new Date().toISOString(),
      });
      results.founder = { uid: founderUser.uid, role: 'owner', email: founderUser.email };
    }

    if (managerUser) {
      await adminAuth.setCustomUserClaims(managerUser.uid, { role: 'admin' });
      await adminAuth.revokeRefreshTokens(managerUser.uid);
      await adminDb.collection('admins').doc(managerUser.uid).set({
        id: managerUser.uid,
        uid: managerUser.uid,
        email: managerUser.email,
        name: managerUser.displayName || 'إبراهيم فوزي',
        title: 'المدير التنفيذي والناشر',
        role: 'admin',
        isFounder: false,
        canEditBooks: true,
        canManageBans: true,
        addedBy: 'SYSTEM_BOOTSTRAP',
        addedAt: new Date().toISOString(),
      });
      results.manager = { uid: managerUser.uid, role: 'admin', email: managerUser.email };
    }

    if (founderUser || managerUser) {
      await bootstrapRef.set({
        completed: true,
        bootstrappedAt: new Date().toISOString(),
        founderUid: founderUser?.uid || null,
        managerUid: managerUser?.uid || null,
      });
    }

    return res.json({
      success: true,
      message: 'تمت التهيئة الأمنية وتعيين صلاحيات Custom Claims بنجاح.',
      results,
    });
  } catch (err: any) {
    console.error('Bootstrap error:', err);
    return res.status(500).json({ success: false, message: err.message || 'فشلت عملية التهيئة.' });
  }
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

    const isVerified = Boolean(
      userRecord.emailVerified ||
      userRecord.providerData.some((p) => p.providerId === 'google.com')
    );

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

    // Prevent granting admin to unverified email/password accounts
    const isVerified = Boolean(
      targetUser.emailVerified ||
      targetUser.providerData.some((p) => p.providerId === 'google.com')
    );

    if (role === 'admin' && !isVerified) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن منح صلاحيات إدارية لحساب بريد إلكتروني غير مؤكد. يجب على المستخدم تأكيد بريده أولاً.',
      });
    }

    // Set Custom User Claims via Firebase Admin
    await adminAuth.setCustomUserClaims(targetUid, { role });

    // Invalidate stale client tokens immediately
    await adminAuth.revokeRefreshTokens(targetUid);

    const adminDocRef = adminDb.collection('admins').doc(targetUid);

    if (role === 'admin') {
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

      // Sync users collection
      await adminDb.collection('users').doc(targetUid).set({ role: 'admin' }, { merge: true });
    } else {
      // Downgrade to reader: delete admin document
      await adminDocRef.delete();
      await adminDb.collection('users').doc(targetUid).set({ role: 'reader' }, { merge: true });
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

    // Revoke claim
    await adminAuth.setCustomUserClaims(targetUid, { role: 'reader' });
    await adminAuth.revokeRefreshTokens(targetUid);

    // Remove from registry
    await adminDocRef.delete();
    await adminDb.collection('users').doc(targetUid).set({ role: 'reader' }, { merge: true });

    return res.json({
      success: true,
      message: 'تم سحب صلاحيات الإدارة وإلغاء التوكنات القديمة فورياً بنجاح.',
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
