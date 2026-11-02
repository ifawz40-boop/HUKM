import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './config';
import { UserProfile, UserRole } from '../types/auth';

/**
 * Maps Firebase Auth error codes to user-friendly Arabic error messages
 */
export function formatAuthError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'حدث خطأ غير متوقع أثناء المصادقة.';
  const code = (error as { code?: string }).code || '';

  switch (code) {
    case 'auth/user-not-found':
      return 'لم يتم العثور على حساب مسجل بهذا البريد الإلكتروني.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.';
    case 'auth/email-already-in-use':
      return 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بحسابك.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة، يجب أن تحتوي على 6 خانات على الأقل.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني المدخل غير صالحة.';
    case 'auth/too-many-requests':
      return 'تم تعليق المحاولات مؤقتاً لحماية حسابك بسبب تكرار المحاولات. يرجى الانتظار قليلاً.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
    case 'auth/popup-blocked':
      return 'المتصفح حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة للموقع أو استخدام التحويل المباشر.';
    case 'auth/unauthorized-domain':
      return 'نطاق التطبيق غير مصرح به في Firebase Authentication. يرجى إضافته في Authorized Domains.';
    default:
      return (error as { message?: string }).message || 'تعذر إتمام عملية الدخول، يرجى المحاولة لاحقاً.';
  }
}

/**
 * Determine verified role STRICTLY from Firebase Custom Claims.
 * No email address matching is ever used for authorization decisions.
 */
export async function determineUserRole(firebaseUser: FirebaseUser): Promise<UserRole> {
  try {
    // Read authoritative token claims
    const tokenResult = await firebaseUser.getIdTokenResult();
    const roleClaim = tokenResult.claims.role as string | undefined;

    // CRITICAL: Strictly check emailVerified without any provider shortcuts
    const isVerified = Boolean(firebaseUser.emailVerified);

    // Administrative roles require verified identity and EXCLUSIVE Custom Claims
    if (roleClaim === 'owner' && isVerified) {
      return 'owner';
    }
    if (roleClaim === 'admin' && isVerified) {
      return 'admin';
    }
  } catch (err) {
    console.warn('Could not read custom token claims:', err);
  }

  return 'reader';
}

/**
 * Syncs and retrieves the user profile from Firestore users/{uid}
 */
export async function syncUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const role = await determineUserRole(firebaseUser);
  const tokenResult = await firebaseUser.getIdTokenResult();
  const userRef = doc(db, 'users', firebaseUser.uid);

  let existingData: Partial<UserProfile> = {};
  try {
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      existingData = snapshot.data() as Partial<UserProfile>;
    }
  } catch (err) {
    console.warn('Could not fetch existing user document:', err);
  }

  const isVerified = Boolean(firebaseUser.emailVerified);

  const profile: UserProfile = {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || existingData.name || 'قارئ حُكم',
    email: firebaseUser.email || '',
    role,
    avatar: firebaseUser.photoURL || existingData.avatar || undefined,
    bio: existingData.bio || (
      role === 'owner' 
        ? 'المؤسس والمشرف العام | HUKM MEDIA' 
        : role === 'admin' 
        ? 'المدير التنفيذي والناشر' 
        : 'قارئ معتمد في منصة حُكم'
    ),
    joinedDate: existingData.joinedDate || new Date().toISOString().split('T')[0],
    bookmarks: existingData.bookmarks || [],
    readHistory: existingData.readHistory || [],
    emailVerified: isVerified,
    customClaims: tokenResult.claims,
  };

  // Upsert user profile: CRITICAL SECURITY: Never write role or administrative metadata from frontend
  try {
    await setDoc(
      userRef,
      {
        uid: firebaseUser.uid,
        displayName: profile.name,
        name: profile.name,
        email: profile.email,
        photoURL: profile.avatar || null,
        avatar: profile.avatar || null,
        bio: profile.bio || '',
        joinedDate: profile.joinedDate,
        bookmarks: profile.bookmarks || [],
        readHistory: profile.readHistory || [],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not upsert user document to Firestore:', err);
  }

  return profile;
}

/**
 * Google Sign In with fallback to redirect. Google accounts are inherently email_verified.
 */
export async function signInWithGoogle(): Promise<UserProfile> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await syncUserProfile(result.user);
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      console.warn('Popup blocked/closed, attempting redirect flow...');
      await signInWithRedirect(auth, googleProvider);
      throw new Error('جاري تحويلك إلى صفحة تسجيل الدخول...');
    }
    throw error;
  }
}

/**
 * Check for pending redirect result on app startup
 */
export async function checkRedirectResult(): Promise<UserProfile | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return await syncUserProfile(result.user);
    }
  } catch (err) {
    console.warn('Redirect sign-in error:', err);
  }
  return null;
}

/**
 * Email & Password Registration.
 * Dispatches verification email and does NOT falsely mark the account verified.
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: UserProfile; verificationEmailSent: boolean }> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);

  if (displayName.trim()) {
    try {
      await updateProfile(result.user, { displayName: displayName.trim() });
    } catch {}
  }

  let verificationEmailSent = false;
  try {
    await sendEmailVerification(result.user);
    verificationEmailSent = true;
  } catch (err) {
    console.warn('Failed to send verification email during registration:', err);
  }

  const profile = await syncUserProfile(result.user);
  return { user: profile, verificationEmailSent };
}

/**
 * Email & Password Sign In
 */
export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return await syncUserProfile(result.user);
}

/**
 * Resends verification email to the currently authenticated user
 */
export async function resendVerificationEmail(): Promise<{ success: boolean; message: string }> {
  if (!auth.currentUser) {
    return { success: false, message: 'لا يوجد مستخدم مسجل حالياً لإرسال رابط التأكيد.' };
  }
  if (auth.currentUser.emailVerified) {
    return { success: true, message: 'هذا الحساب موثق ومؤكد بالفعل.' };
  }
  try {
    await sendEmailVerification(auth.currentUser);
    return { success: true, message: 'تم إرسال رابط تأكيد الحساب إلى بريدك الإلكتروني.' };
  } catch (err: unknown) {
    return { success: false, message: formatAuthError(err) };
  }
}

/**
 * Reloads the current user session from Firebase Auth to refresh verification status and claims
 */
export async function reloadCurrentUserSession(): Promise<UserProfile | null> {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return await syncUserProfile(auth.currentUser);
}

/**
 * Send Password Reset Email
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Sign Out
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Global Real-time Auth State Listener
 */
export function subscribeToAuthState(
  onUserChanged: (user: UserProfile | null) => void,
  onLoadingState: (loading: boolean) => void
): () => void {
  onLoadingState(true);

  // Check redirect result first
  checkRedirectResult().catch(() => {});

  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const profile = await syncUserProfile(firebaseUser);
        onUserChanged(profile);
      } catch (err) {
        console.error('Failed to sync authenticated user profile:', err);
        onUserChanged(null);
      }
    } else {
      onUserChanged(null);
    }
    onLoadingState(false);
  });

  return unsubscribe;
}
