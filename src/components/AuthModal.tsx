import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  BookOpen,
  Sparkles,
  CheckCircle,
  Crown,
  BellRing,
  Shield,
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import {
  OWNER_USER,
  FOUNDER_USER,
  MANAGING_ADMIN_USER,
  DEMO_READER_USER,
  registerNewUser,
  addSubscriber,
  addEmailLog,
} from '../utils/authStorage';
import { getActiveBanDetails, formatRemainingTime } from '../utils/moderationTracker';
import { generateWelcomeEmailHtml } from '../utils/emailTemplateGenerator';
import { HUKM_LOGO } from '../data/hukmData';
import { loginWithFirebaseGoogle } from '../firebase/firestoreService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
}) => {
  const [tab, setTab] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const triggerOnboardingEmail = (userName: string, userEmail: string) => {
    // 1. Add to auto-subscribers
    addSubscriber(userEmail, userName, 'signup');

    // 2. Log Welcome Email in system
    addEmailLog({
      subject: 'أهلاً بك في منصة حُكم | HUKM MEDIA',
      recipientCount: 1,
      recipientEmail: userEmail,
      timestamp: 'الآن',
      type: 'welcome',
      previewHtml: generateWelcomeEmailHtml(userName, userEmail),
      delivered: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !email.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }

    if (tab === 'signup' && !name.trim()) {
      setErrorMsg('يرجى كتابة الاسم الكامل.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if account is banned
    const ban = getActiveBanDetails(cleanEmail);
    if (ban) {
      setErrorMsg(`تم تعليق هذا الحساب لمخالفة المعايير (${ban.banType === 'permanent' ? 'حظر دائم' : `متبقي: ${formatRemainingTime(ban.expiresAt)}`}). السبب: ${ban.reason}`);
      return;
    }

    if (cleanEmail === 'dr.islam.mohamed@hukm.media') {
      onLoginSuccess(FOUNDER_USER);
      onClose();
      return;
    }

    if (cleanEmail === 'ifawz40@gmail.com') {
      onLoginSuccess(MANAGING_ADMIN_USER);
      onClose();
      return;
    }

    // Register reader & trigger welcome email
    const finalName = name.trim() || 'قارئ حُكم';
    const user = registerNewUser(finalName, cleanEmail);
    triggerOnboardingEmail(finalName, cleanEmail);

    onLoginSuccess(user);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const googleResult = await loginWithFirebaseGoogle();
      const googleUserEmail =
        googleResult?.email ||
        (email && email.includes('@') ? email.trim().toLowerCase() : 'tariq.investigator@gmail.com');
      const googleUserName = googleResult?.name || name.trim() || 'قارئ Google حُكم';

      const ban = getActiveBanDetails(googleUserEmail);
      if (ban) {
        setIsLoading(false);
        setErrorMsg(`هذا الحساب محظور حالياً (${ban.banType === 'permanent' ? 'حظر دائم' : `متبقي: ${formatRemainingTime(ban.expiresAt)}`}). السبب: ${ban.reason}`);
        return;
      }

      if (googleUserEmail === 'dr.islam.mohamed@hukm.media') {
        onLoginSuccess(FOUNDER_USER);
        setIsLoading(false);
        onClose();
        return;
      }

      if (googleUserEmail === 'ifawz40@gmail.com') {
        onLoginSuccess(MANAGING_ADMIN_USER);
        setIsLoading(false);
        onClose();
        return;
      }

      const user = registerNewUser(googleUserName, googleUserEmail);
      addSubscriber(googleUserEmail, googleUserName, 'google');
      triggerOnboardingEmail(googleUserName, googleUserEmail);

      setIsLoading(false);
      onLoginSuccess(user);
      onClose();
    } catch {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      const appleUserEmail = 'apple.reader@icloud.com';
      const appleUserName = 'قارئ Apple حُكم';

      const user = registerNewUser(appleUserName, appleUserEmail);
      addSubscriber(appleUserEmail, appleUserName, 'apple');
      triggerOnboardingEmail(appleUserName, appleUserEmail);

      setIsLoading(false);
      onLoginSuccess(user);
      onClose();
    }, 400);
  };

  const handleQuickLoginAsFounder = () => {
    onLoginSuccess(FOUNDER_USER);
    onClose();
  };

  const handleQuickLoginAsOwner = () => {
    onLoginSuccess(MANAGING_ADMIN_USER);
    onClose();
  };

  const handleQuickLoginAsReader = () => {
    onLoginSuccess(DEMO_READER_USER);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#c59b27]/40 bg-[#0a1226] p-6 sm:p-7 shadow-2xl shadow-black/80 text-right max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 rounded-full p-1.5 text-[#94a3b8] hover:bg-white/10 hover:text-white transition-colors"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2 mb-5">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-[#c59b27]/50 bg-[#050a16] shadow-xl">
            <img src={HUKM_LOGO} alt="حُكم" className="h-full w-full object-cover scale-105" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-cairo">
            منصة <span className="gold-gradient-text">حُكم | HUKM</span>
          </h2>
          <p className="text-xs text-[#94a3b8] max-w-xs leading-relaxed">
            انضم لمجتمع القراء لتصلك فصول الكتب والتحقيقات الحصرية على بريدك فور نشرها.
          </p>
        </div>

        {/* Social Single Sign-On Buttons */}
        <div className="space-y-2 mb-5">
          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-white hover:bg-slate-100 py-2.5 px-4 text-xs font-bold text-slate-800 shadow transition-all hover:scale-101 cursor-pointer disabled:opacity-60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
              />
            </svg>
            <span>المتابعة باستخدام حساب Google</span>
          </button>

          {/* Apple Sign-in */}
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-black hover:bg-neutral-900 border border-white/20 py-2.5 px-4 text-xs font-bold text-white shadow transition-all hover:scale-101 cursor-pointer disabled:opacity-60"
          >
            <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.73-7.94-12.13-14.59-6.3-9.52-11.33-20.2-15.08-32.06-3.75-11.86-5.63-23.23-5.63-34.1 0-14.78 3.79-27.18 11.37-37.19 7.58-10.01 17.15-15.14 28.71-15.38 4.8 0 10.15 1.3 16.06 3.91 5.9 2.61 9.77 3.98 11.61 4.12 1.48-.14 5.61-1.61 12.39-4.41 6.78-2.8 12.44-4.05 16.98-3.75 12.74.87 22.84 5.66 30.29 14.37-11.09 6.73-16.52 16.03-16.29 27.9.23 9.4 3.86 17.26 10.88 23.59 7.02 6.33 15.42 10.03 25.21 11.11-2.14 6.74-4.8 13.57-7.98 20.48zM119.22 33.15c0-7.25 2.6-14.07 7.79-20.47 5.2-6.4 11.66-10.36 19.4-11.88.22 1.3.33 2.45.33 3.47 0 7.39-2.66 14.42-7.98 21.09-5.32 6.67-11.96 10.58-19.92 11.73-.22-1.3-.33-2.45-.33-3.47z" />
            </svg>
            <span>المتابعة باستخدام Apple</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-[#0a1226] px-3 text-[#64748b] font-bold">
              أو بالبريد الإلكتروني وكلمة المرور
            </span>
          </div>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex rounded-xl bg-[#070d1e] p-1 border border-white/5 mb-4">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg('');
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
              tab === 'login'
                ? 'bg-[#c59b27] text-[#070d1e] shadow'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMsg('');
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
              tab === 'signup'
                ? 'bg-[#c59b27] text-[#070d1e] shadow'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2 text-xs font-semibold text-rose-300 text-center">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                الاسم الكامل
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: محمد العمري"
                  className="w-full rounded-xl bg-[#070d1e] border border-white/10 px-3 py-2 pr-9 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                  required
                />
                <User className="absolute right-3 top-2.5 h-4 w-4 text-[#64748b]" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com (أو ifawz40@gmail.com)"
                className="w-full rounded-xl bg-[#070d1e] border border-white/10 px-3 py-2 pr-9 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                required
              />
              <Mail className="absolute right-3 top-2.5 h-4 w-4 text-[#64748b]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-[#070d1e] border border-white/10 px-3 py-2 pr-9 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
              />
              <Lock className="absolute right-3 top-2.5 h-4 w-4 text-[#64748b]" />
            </div>
          </div>

          {/* Automatic notifications notice */}
          <div className="rounded-xl bg-[#070d1e] border border-[#c59b27]/30 p-2.5 flex items-start gap-2 text-[11px] text-[#cbd5e1]">
            <BellRing className="h-4 w-4 text-[#f0cb69] shrink-0 mt-0.5" />
            <span>
              <strong>تفعيل تلقائي للإشعارات:</strong> بمجرد تسجيلك، ستصلك كل منشورات وفصول حُكم عبر البريد الإلكتروني الرسمي بهوية المنصة الملكية.
            </span>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c59b27] to-[#997314] hover:from-[#f0cb69] hover:to-[#b88c1b] py-2.5 text-xs font-black text-[#070d1e] shadow-lg shadow-[#c59b27]/25 transition-all hover:scale-101 cursor-pointer"
          >
            {tab === 'login' ? 'تسجيل الدخول ومتابعة التحديثات' : 'تأكيد التسجيل وتفعيل الإشعارات'}
          </button>
        </form>

        {/* Quick Direct Sign-in for Convenience */}
        <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
          <span className="block text-[11px] font-bold text-[#f0cb69]">⚡ وصول فوري تجريبي:</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleQuickLoginAsFounder}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27] px-2 py-1.5 text-[10px] font-bold text-[#f0cb69] transition-colors cursor-pointer"
              title="المؤسس والمشرف العام: Dr/ Islam Mohamed"
            >
              <Crown className="h-3 w-3 text-amber-400" />
              <span>المؤسس د. إسلام</span>
            </button>
            <button
              type="button"
              onClick={handleQuickLoginAsOwner}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#0e1935] hover:bg-[#162752] border border-blue-500/40 px-2 py-1.5 text-[10px] font-bold text-blue-300 transition-colors cursor-pointer"
              title="المدير التنفيذي: ifawz40@gmail.com"
            >
              <Shield className="h-3 w-3 text-blue-400" />
              <span>المدير إبراهيم</span>
            </button>
            <button
              type="button"
              onClick={handleQuickLoginAsReader}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#0e1935] hover:bg-[#162752] border border-white/10 px-2 py-1.5 text-[10px] font-semibold text-[#cbd5e1] hover:text-white transition-colors cursor-pointer"
            >
              <BookOpen className="h-3 w-3 text-[#d4af37]" />
              <span>قارئ تجريبي</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
