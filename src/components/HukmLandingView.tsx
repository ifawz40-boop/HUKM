import React, { useState } from 'react';
import {
  BookOpen,
  PenTool,
  ShieldCheck,
  Crown,
  Sparkles,
  Lock,
  Mail,
  User,
  CheckCircle,
  AlertTriangle,
  Film,
  Layers,
  Flame,
  Globe,
  Loader2,
  KeyRound,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { HUKM_LOGO, HUKM_MOTTO, HUKM_DESCRIPTION } from '../data/hukmData';
import { UserProfile } from '../types/auth';
import { getActiveBanDetails, formatRemainingTime } from '../utils/moderationTracker';
import {
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  formatAuthError,
  logoutUser,
} from '../firebase/authService';

interface HukmLandingViewProps {
  currentUser: UserProfile | null;
  isOwner: boolean;
  onLoginSuccess: (user: UserProfile) => void;
  onEnterLibrary: () => void;
  onOpenWriter?: () => void;
  onShowToast: (msg: string) => void;
  onLogout?: () => void;
}

export const HukmLandingView: React.FC<HukmLandingViewProps> = ({
  currentUser,
  isOwner,
  onLoginSuccess,
  onEnterLibrary,
  onOpenWriter,
  onShowToast,
  onLogout,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Real Email/Password Authentication & Password Reset
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check moderation bans locally before sending request
    const ban = getActiveBanDetails(cleanEmail);
    if (ban) {
      setErrorMsg(
        `تم تعليق هذا الحساب لمخالفة المعايير (${
          ban.banType === 'permanent' ? 'حظر دائم' : `متبقي: ${formatRemainingTime(ban.expiresAt)}`
        }). السبب: ${ban.reason}`
      );
      return;
    }

    setIsLoading(true);

    try {
      if (authMode === 'reset') {
        await resetPassword(cleanEmail);
        setIsLoading(false);
        setSuccessMsg('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح.');
        onShowToast('تم إرسال رابط استعادة كلمة المرور.');
        return;
      }

      if (authMode === 'login') {
        if (!password) {
          setErrorMsg('يرجى إدخال كلمة المرور.');
          setIsLoading(false);
          return;
        }

        const user = await loginWithEmail(cleanEmail, password);
        setIsLoading(false);
        onLoginSuccess(user);
        onShowToast(`أهلاً بك يا ${user.name}! تم تسجيل الدخول بنجاح.`);
        onEnterLibrary();
      } else {
        // Sign-up
        if (!password || password.length < 6) {
          setErrorMsg('يجب ألا تقل كلمة المرور عن 6 أحرف.');
          setIsLoading(false);
          return;
        }

        const { user, verificationEmailSent } = await registerWithEmail(cleanEmail, password, name.trim());
        setIsLoading(false);
        onLoginSuccess(user);
        if (verificationEmailSent) {
          setSuccessMsg(`تم إنشاء حسابك بنجاح يا ${user.name}! تم إرسال رابط تأكيد الحساب إلى بريدك الإلكتروني. يرجى الضغط عليه لتأكيد حسابك.`);
          onShowToast(`تم إنشاء الحساب وإرسال رابط التأكيد.`);
        } else {
          setSuccessMsg(`تم إنشاء حسابك بنجاح يا ${user.name}!`);
          onShowToast(`تم إنشاء الحساب.`);
        }
        onEnterLibrary();
      }
    } catch (err: unknown) {
      setIsLoading(false);
      setErrorMsg(formatAuthError(err));
    }
  };

  // Real Google Sign-In with popup + redirect fallback
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const user = await signInWithGoogle();
      setIsLoading(false);

      // Verify active ban on signed in email
      const ban = getActiveBanDetails(user.email);
      if (ban) {
        await logoutUser();
        setErrorMsg(
          `هذا الحساب معلق لمخالفة المعايير (${
            ban.banType === 'permanent' ? 'حظر دائم' : `متبقي: ${formatRemainingTime(ban.expiresAt)}`
          }). السبب: ${ban.reason}`
        );
        return;
      }

      onLoginSuccess(user);
      onShowToast(`تم تسجيل الدخول بحساب Google بنجاح: ${user.name}`);
      onEnterLibrary();
    } catch (err: unknown) {
      setIsLoading(false);
      setErrorMsg(formatAuthError(err));
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070d1e] text-[#f4efe6] overflow-x-hidden font-cairo" dir="rtl">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-[#c59b27]/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 -z-10 h-80 w-80 rounded-full bg-blue-900/15 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
        {/* ========================================================
            SECTION 1: HERO & PLATFORM DEFINITION
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Brand Presentation (Col 1-7) */}
          <div className="lg:col-span-7 space-y-6 text-right">
            {/* Crest badge */}
            <div className="inline-flex items-center gap-3 rounded-2xl bg-[#0a142c] border border-[#c59b27]/40 px-3.5 py-1.5 shadow-xl">
              <div className="h-9 w-9 overflow-hidden rounded-xl border border-[#c59b27]/60 bg-[#050a16]">
                <img src={HUKM_LOGO} alt="حُكم" className="h-full w-full object-cover scale-105" />
              </div>
              <span className="text-xs font-bold text-[#f0cb69]">
                استوديو النشر والتوثيق المعرفي الرسمي
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
              منصة <span className="gold-gradient-text">حُكم | HUKM MEDIA</span>
            </h1>

            <p className="text-base sm:text-xl font-bold text-[#f0cb69] font-amiri leading-relaxed">
              {HUKM_MOTTO}
            </p>

            <p className="text-sm sm:text-base text-[#cbd5e1] leading-relaxed max-w-2xl font-normal">
              {HUKM_DESCRIPTION}
            </p>

            {/* Leadership & Platform Architecture */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl border border-[#c59b27]/30 bg-[#0a1226]/80 p-3.5 flex items-center gap-3 shadow-lg">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 font-bold">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#94a3b8] block">الهوية التحريرية:</span>
                  <span className="text-xs sm:text-sm font-black text-white">حُكم | HUKM MEDIA</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0a1226]/80 p-3.5 flex items-center gap-3 shadow-lg">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#94a3b8] block">جهة النشر:</span>
                  <span className="text-xs sm:text-sm font-black text-white">حُكم | HUKM MEDIA</span>
                </div>
              </div>
            </div>

            {/* Direct Guest Explore Button on the Left */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onEnterLibrary}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0e1935] hover:bg-[#15254d] border border-[#c59b27]/50 px-5 py-3 text-xs sm:text-sm font-bold text-[#f0cb69] shadow-lg transition-all hover:scale-102 cursor-pointer"
              >
                <BookOpen className="h-4 w-4" />
                <span>تصفح كتب ومشاريع حُكم كقارئ زائر</span>
              </button>
            </div>
          </div>

          {/* ========================================================
              SECTION 2: AUTHENTICATION PORTAL (Col 8-12)
          ======================================================== */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-3xl border-2 border-[#c59b27]/40 bg-[#0a1226] p-6 sm:p-8 shadow-2xl shadow-black/80 text-right backdrop-blur-xl">
              {/* IF LOGGED IN ALREADY */}
              {currentUser ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c59b27]/20 border border-[#c59b27]/40 text-[#f0cb69] font-black text-lg">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div>
                      <span className="text-[11px] text-[#94a3b8] block">أنت مسجل حالياً:</span>
                      <h3 className="text-base sm:text-lg font-black text-white">{currentUser.name}</h3>
                      <p className="text-xs text-[#cbd5e1]">{currentUser.email}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#070d1e] border border-white/10 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">نوع الحساب:</span>
                      <span className={`font-bold ${
                        currentUser.role === 'owner'
                          ? 'text-[#f0cb69]'
                          : currentUser.role === 'admin'
                          ? 'text-blue-400'
                          : 'text-emerald-400'
                      }`}>
                        {currentUser.role === 'owner'
                          ? 'المؤسس والمشرف العام 👑'
                          : currentUser.role === 'admin'
                          ? 'المدير التنفيذي والناشر 🛡️'
                          : 'قارئ معتمد 📖'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">حالة تأكيد البريد:</span>
                      {currentUser.emailVerified ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          مؤكد وموثق
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          غير مؤكد (تحتاج لتأكيد الرابط)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={onEnterLibrary}
                      className="w-full flex items-center justify-center gap-2 rounded-xl gold-gradient-btn py-3 text-xs sm:text-sm font-black text-[#070d1e] shadow-xl hover:scale-101 transition-all cursor-pointer"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>الدخول إلى المكتبة والمشاريع</span>
                    </button>

                    {isOwner && onOpenWriter && (
                      <button
                        type="button"
                        onClick={onOpenWriter}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0e1935] hover:bg-[#15254d] border border-[#c59b27]/40 py-3 text-xs sm:text-sm font-bold text-[#f0cb69] transition-all cursor-pointer"
                      >
                        <PenTool className="h-4 w-4" />
                        <span>فتح استوديو التأليف والنشر</span>
                      </button>
                    )}

                    {onLogout && (
                      <button
                        type="button"
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-rose-950/40 border border-white/10 hover:border-rose-500/40 py-2.5 text-xs font-bold text-rose-300 transition-all cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>تسجيل الخروج من الحساب</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* IF NOT LOGGED IN */
                <>
                  <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#050a16] border border-[#c59b27]/50 shadow text-[#f0cb69]">
                        <Lock className="h-5 w-5 text-[#f0cb69]" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-white font-cairo">
                          {authMode === 'login'
                            ? 'بوابة تسجيل الدخول'
                            : authMode === 'signup'
                            ? 'إنشاء حساب جديد'
                            : 'استعادة كلمة المرور'}
                        </h2>
                        <p className="text-[11px] text-[#94a3b8]">
                          {authMode === 'login'
                            ? 'ادخل بحسابك المعتمد لمتابعة القراءة والحفظ'
                            : authMode === 'signup'
                            ? 'انضم إلى مجتمع قراء وباحثي حُكم'
                            : 'أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين'}
                        </p>
                      </div>
                    </div>

                    <div className="flex rounded-xl bg-[#070d1e] p-1 border border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          authMode === 'login'
                            ? 'bg-[#c59b27] text-[#070d1e]'
                            : 'text-[#cbd5e1] hover:text-white'
                        }`}
                      >
                        دخول
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          authMode === 'signup'
                            ? 'bg-[#c59b27] text-[#070d1e]'
                            : 'text-[#cbd5e1] hover:text-white'
                        }`}
                      >
                        تسجيل
                      </button>
                    </div>
                  </div>

                  {/* PROMINENT GOOGLE SIGN-IN BUTTON */}
                  {authMode !== 'reset' && (
                    <div className="mb-5 space-y-2">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white hover:bg-slate-100 py-3.5 px-4 text-xs sm:text-sm font-bold text-slate-900 shadow-xl shadow-black/30 transition-all hover:scale-101 active:scale-98 cursor-pointer disabled:opacity-60 border border-slate-200"
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
                        ) : (
                          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                        )}
                        <span>تسجيل الدخول السريع بحساب Google</span>
                      </button>

                      {/* Divider */}
                      <div className="relative flex items-center justify-center my-4">
                        <div className="border-t border-white/10 w-full" />
                        <span className="bg-[#0a1226] px-3 text-[11px] text-[#94a3b8]">أو عبر البريد الإلكتروني</span>
                        <div className="border-t border-white/10 w-full" />
                      </div>
                    </div>
                  )}

                  {/* Feedback Notices */}
                  {errorMsg && (
                    <div className="mb-4 rounded-xl bg-red-950/40 border border-red-500/40 p-2.5 text-xs text-red-300">
                      {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div className="mb-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-2.5 text-xs text-emerald-300">
                      {successMsg}
                    </div>
                  )}

                  {/* Email / Password Form */}
                  <form onSubmit={handleEmailAuth} className="space-y-3.5">
                    {authMode === 'signup' && (
                      <div>
                        <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                          الاسم الكريم
                        </label>
                        <div className="relative">
                          <User className="absolute right-3 top-2.5 h-4 w-4 text-[#64748b]" />
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="اسمك الكامل"
                            className="w-full rounded-xl bg-[#070d1e] border border-white/15 px-3 py-2 pr-9 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                        البريد الإلكتروني
                      </label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-2.5 h-4 w-4 text-[#64748b]" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@domain.com"
                          className="w-full rounded-xl bg-[#070d1e] border border-white/15 px-3 py-2 pr-9 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                        />
                      </div>
                    </div>

                    {authMode !== 'reset' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-[#cbd5e1]">
                            كلمة المرور
                          </label>
                          {authMode === 'login' && (
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode('reset');
                                setErrorMsg('');
                                setSuccessMsg('');
                              }}
                              className="text-[10px] text-[#f0cb69] hover:underline cursor-pointer"
                            >
                              نسيت كلمة المرور؟
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="absolute right-3 top-2.5 h-4 w-4 text-[#64748b]" />
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-xl bg-[#070d1e] border border-white/15 px-3 py-2 pr-9 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full rounded-xl gold-gradient-btn py-3 text-xs sm:text-sm font-black text-[#070d1e] shadow-lg shadow-[#c59b27]/25 transition-all hover:scale-101 cursor-pointer mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>جاري التحقق...</span>
                        </>
                      ) : (
                        <span>
                          {authMode === 'login'
                            ? 'تسجيل الدخول والبدء'
                            : authMode === 'signup'
                            ? 'إنشاء الحساب وتفعيله'
                            : 'إرسال رابط الاستعادة'}
                        </span>
                      )}
                    </button>
                  </form>

                  {/* Return from Reset Mode */}
                  {authMode === 'reset' && (
                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#f0cb69] cursor-pointer"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>العودة لصفحة تسجيل الدخول</span>
                      </button>
                    </div>
                  )}

                  {/* Seamless Guest Entry Trigger (No Mock User) */}
                  <div className="mt-6 pt-4 border-t border-white/10 text-center">
                    <button
                      type="button"
                      onClick={onEnterLibrary}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#050a16] hover:bg-[#0e1935] border border-white/10 hover:border-[#c59b27]/40 px-3 py-2.5 text-xs font-bold text-[#cbd5e1] hover:text-[#f0cb69] transition-all cursor-pointer"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-[#d4af37]" />
                      <span>تصفح وقراءة الكتب مباشرة كزائر (بدون تسجيل) 📖</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION 3: KNOWLEDGE PILLARS OF HUKM
        ======================================================== */}
        <div className="space-y-6 pt-6 border-t border-[#c59b27]/20 text-right">
          <div className="space-y-1">
            <span className="rounded-full bg-[#c59b27]/15 border border-[#c59b27]/30 px-3 py-1 text-xs font-bold text-[#f0cb69]">
              المسارات والأعمدة المعرفية
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-cairo">
              ماذا نقدم في <span className="gold-gradient-text">حُكم MEDIA</span>؟
            </h2>
            <p className="text-xs sm:text-sm text-[#94a3b8] max-w-xl">
              أربعة مسارات رئيسية لتفكيك الأسئلة الكبرى وتقديم محتوى رصين مدعوم بالوثائق والمصادر.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Pillar 1 */}
            <div className="rounded-2xl border border-white/10 bg-[#0a1226] p-5 space-y-3 hover:border-[#c59b27]/50 transition-colors shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-[#f0cb69] border border-amber-500/30">
                <Flame className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white font-cairo">
                تحقيقات «مش زي ما إنت فاكر»
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                تفكيك الخرافات الشائعة، قراءة التاريخ بعيداً عن الروايات الشعبوية، واستخراج الحقيقة من أصل الوثيقة.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-2xl border border-white/10 bg-[#0a1226] p-5 space-y-3 hover:border-[#c59b27]/50 transition-colors shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white font-cairo">
                العلوم والذكاء الاصطناعي
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                فيزياء الكون، خوارزميات التفكير والذكاء الاصطناعي، وحدود العقل البشري في ضوء أحدث أوراق البحث.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-2xl border border-white/10 bg-[#0a1226] p-5 space-y-3 hover:border-[#c59b27]/50 transition-colors shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Film className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white font-cairo">
                التاريخ والوثائقيات
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                صعود وسقوط الحضارات، الوثائق السرية المسربة، وتشريح الصراعات الجيوسياسية الكبرى.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="rounded-2xl border border-white/10 bg-[#0a1226] p-5 space-y-3 hover:border-[#c59b27]/50 transition-colors shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white font-cairo">
                الفلسفة والتفكير النقدي
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                كشف المغالطات المنطقية، فلسفة الحُكم والعدالة، وأدوات الحصانة الفكرية ضد التضليل الرقمي.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================
            SECTION 4: CALL TO ACTION FOR AUTHORING OR READING
        ======================================================== */}
        <div className="rounded-3xl border border-[#c59b27]/30 bg-gradient-to-r from-[#0d1730] to-[#070d1e] p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-right">
            <span className="text-xs font-bold text-[#f0cb69] flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span>جاهز للاطلاع على الأبحاث أو بدء التأليف؟</span>
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white font-cairo">
              انطلق الآن في رحلة تفكيك وفهم المعرفة
            </h3>
            <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-xl">
              تصفح الأقسام والكتب فور نشرها، أو ابدأ بنشر كتابك وبحثك الاستقصائي الأول إذا كنت من فريق إدارة المنصة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onEnterLibrary}
              className="flex items-center gap-2 rounded-xl gold-gradient-btn px-5 py-3 text-xs sm:text-sm font-black text-[#070d1e] shadow-xl hover:scale-102 transition-transform cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              <span>تصفح المكتبة</span>
            </button>

            {isOwner && onOpenWriter && (
              <button
                type="button"
                onClick={onOpenWriter}
                className="flex items-center gap-2 rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/40 px-5 py-3 text-xs sm:text-sm font-bold text-[#f0cb69] hover:text-white transition-all cursor-pointer"
              >
                <PenTool className="h-4 w-4" />
                <span>فتح استوديو التأليف والنشر</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
