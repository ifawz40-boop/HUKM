import React, { useState } from 'react';
import {
  Compass,
  BookOpen,
  PenTool,
  ShieldCheck,
  Crown,
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowLeft,
  CheckCircle,
  Eye,
  Film,
  Layers,
  Flame,
  Globe,
  BellRing,
} from 'lucide-react';
import { HUKM_LOGO, HUKM_MOTTO, HUKM_DESCRIPTION } from '../data/hukmData';
import { UserProfile } from '../types/auth';
import {
  FOUNDER_USER,
  MANAGING_ADMIN_USER,
  DEMO_READER_USER,
  registerNewUser,
  addSubscriber,
  addEmailLog,
} from '../utils/authStorage';
import { getActiveBanDetails, formatRemainingTime } from '../utils/moderationTracker';
import { generateWelcomeEmailHtml } from '../utils/emailTemplateGenerator';
import { loginWithFirebaseGoogle } from '../firebase/firestoreService';

interface HukmLandingViewProps {
  currentUser: UserProfile;
  isOwner: boolean;
  onLoginSuccess: (user: UserProfile) => void;
  onEnterLibrary: () => void;
  onOpenWriter?: () => void;
  onShowToast: (msg: string) => void;
}

export const HukmLandingView: React.FC<HukmLandingViewProps> = ({
  currentUser,
  isOwner,
  onLoginSuccess,
  onEnterLibrary,
  onOpenWriter,
  onShowToast,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if account is banned
    const ban = getActiveBanDetails(cleanEmail);
    if (ban) {
      setErrorMsg(
        `تم تعليق هذا الحساب لمخالفة المعايير (${
          ban.banType === 'permanent' ? 'حظر دائم' : `متبقي: ${formatRemainingTime(ban.expiresAt)}`
        }). السبب: ${ban.reason}`
      );
      return;
    }

    if (cleanEmail === 'dr.islam.mohamed@hukm.media') {
      onLoginSuccess(FOUNDER_USER);
      onShowToast('مرحباً بك يا دكتور إسلام محمد! تم تسجيل الدخول كمؤسس ومشرف عام للمنصة.');
      return;
    }

    if (cleanEmail === 'ifawz40@gmail.com') {
      onLoginSuccess(MANAGING_ADMIN_USER);
      onShowToast('مرحباً بك يا إبراهيم فوزي! تم تسجيل الدخول كمدير تنفيذي للمنصة.');
      return;
    }

    const finalName = name.trim() || 'قارئ حُكم المعتمد';
    const user = registerNewUser(finalName, cleanEmail);

    // Automated notification email log
    addSubscriber(cleanEmail, finalName, 'signup');
    addEmailLog({
      subject: 'أهلاً بك في منصة حُكم | HUKM MEDIA',
      recipientCount: 1,
      recipientEmail: cleanEmail,
      timestamp: 'الآن',
      type: 'welcome',
      previewHtml: generateWelcomeEmailHtml(finalName, cleanEmail),
      delivered: true,
    });

    onLoginSuccess(user);
    onShowToast(`أهلاً بك يا ${user.name}! تم تسجيل الدخول وتفعيل اشتراكك التلقائي.`);
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
        setErrorMsg(
          `هذا الحساب محظور حالياً (${
            ban.banType === 'permanent' ? 'حظر دائم' : `متبقي: ${formatRemainingTime(ban.expiresAt)}`
          }). السبب: ${ban.reason}`
        );
        return;
      }

      if (googleUserEmail === 'dr.islam.mohamed@hukm.media') {
        onLoginSuccess(FOUNDER_USER);
        setIsLoading(false);
        onShowToast('مرحباً بك يا د. إسلام محمد!');
        return;
      }

      if (googleUserEmail === 'ifawz40@gmail.com') {
        onLoginSuccess(MANAGING_ADMIN_USER);
        setIsLoading(false);
        onShowToast('مرحباً بك يا إبراهيم فوزي!');
        return;
      }

      const user = registerNewUser(googleUserName, googleUserEmail);
      addSubscriber(googleUserEmail, googleUserName, 'google');
      setIsLoading(false);
      onLoginSuccess(user);
      onShowToast(`تم تسجيل الدخول بحساب Google بنجاح: ${user.name}`);
    } catch {
      setIsLoading(false);
    }
  };

  const isUserAuthenticated = currentUser && currentUser.id !== 'reader-demo-ahmed';

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

            {/* Leadership & Founders Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl border border-[#c59b27]/30 bg-[#0a1226]/80 p-3.5 flex items-center gap-3 shadow-lg">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 font-bold">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#94a3b8] block">المؤسس والمشرف العام:</span>
                  <span className="text-xs sm:text-sm font-black text-white">Dr/ Islam Mohamed</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0a1226]/80 p-3.5 flex items-center gap-3 shadow-lg">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#94a3b8] block">المدير التنفيذي والناشر:</span>
                  <span className="text-xs sm:text-sm font-black text-white">إبراهيم فوزي</span>
                </div>
              </div>
            </div>

            {/* If user is already logged in: give clear direct enter button */}
            {isUserAuthenticated && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-300 block">أنت مسجل حالياً كـ:</span>
                    <strong className="text-sm font-bold text-white">{currentUser.name}</strong>
                    <span className="text-[11px] text-slate-400 mr-2">({currentUser.email})</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onEnterLibrary}
                  className="flex items-center gap-2 rounded-xl gold-gradient-btn px-5 py-2.5 text-xs font-black text-[#070d1e] shadow-lg transition-transform hover:scale-102 cursor-pointer shrink-0"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>الدخول لمكتبة الكتب والمشاريع</span>
                </button>
              </div>
            )}
          </div>

          {/* ========================================================
              SECTION 2: CLEAR & PROMINENT SIGN-IN PORTAL (Col 8-12)
          ======================================================== */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-3xl border-2 border-[#c59b27]/40 bg-[#0a1226] p-6 sm:p-8 shadow-2xl shadow-black/80 text-right backdrop-blur-xl">
              <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#050a16] border border-[#c59b27]/50 shadow text-[#f0cb69]">
                    <Lock className="h-5 w-5 text-[#f0cb69]" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white font-cairo">
                      بوابة الدخول والانضمام
                    </h2>
                    <p className="text-[11px] text-[#94a3b8]">
                      اختر طريقة الدخول المفضلة لديك للبدء
                    </p>
                  </div>
                </div>

                <div className="flex rounded-xl bg-[#070d1e] p-1 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
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
                    onClick={() => setAuthMode('signup')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      authMode === 'signup'
                        ? 'bg-[#c59b27] text-[#070d1e]'
                        : 'text-[#cbd5e1] hover:text-white'
                    }`}
                  >
                    تسجيل جديد
                  </button>
                </div>
              </div>

              {/* PROMINENT GOOGLE SIGN-IN BUTTON */}
              <div className="mb-5 space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white hover:bg-slate-100 py-3.5 px-4 text-xs sm:text-sm font-bold text-slate-900 shadow-xl shadow-black/30 transition-all hover:scale-101 active:scale-98 cursor-pointer disabled:opacity-60 border border-slate-200"
                >
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
                  <span>متابعة تسجيل الدخول بحساب Google</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0a1226] px-3 text-[11px] text-[#94a3b8]">أو عبر البريد الإلكتروني</span>
                <div className="border-t border-white/10 w-full" />
              </div>

              {/* Error Notice */}
              {errorMsg && (
                <div className="mb-4 rounded-xl bg-red-950/40 border border-red-500/40 p-2.5 text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              {/* Email / Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                      الاسم الكامل
                    </label>
                    <div className="relative">
                      <User className="absolute right-3 top-2.5 h-4 w-4 text-[#64748b]" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="اسمك الكريم"
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

                <div>
                  <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-2.5 h-4 w-4 text-[#64748b]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-[#070d1e] border border-white/15 px-3 py-2 pr-9 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl gold-gradient-btn py-3 text-xs sm:text-sm font-black text-[#070d1e] shadow-lg shadow-[#c59b27]/25 transition-all hover:scale-101 cursor-pointer mt-2"
                >
                  {authMode === 'login' ? 'دخول فوري ومتابعة القراءة' : 'إنشاء حساب وتفعيل الإشعارات التلقائية'}
                </button>
              </form>

              {/* Quick One-Click Logins for Convenience */}
              <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
                <span className="block text-[11px] font-bold text-[#f0cb69]">
                  ⚡ وصول سريع مباشر:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onLoginSuccess(FOUNDER_USER);
                      onShowToast('تم تسجيل الدخول كـ Dr/ Islam Mohamed (المؤسس)');
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27] px-2.5 py-2 text-[11px] font-bold text-[#f0cb69] transition-all cursor-pointer shadow"
                    title="المؤسس والمشرف العام"
                  >
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    <span>حساب د. إسلام (المؤسس)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLoginSuccess(MANAGING_ADMIN_USER);
                      onShowToast('تم تسجيل الدخول كـ إبراهيم فوزي (المدير التنفيذي)');
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-blue-500/40 px-2.5 py-2 text-[11px] font-bold text-blue-300 transition-all cursor-pointer shadow"
                    title="المدير التنفيذي والناشر"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                    <span>حساب إبراهيم (المدير)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLoginSuccess(DEMO_READER_USER);
                      onEnterLibrary();
                    }}
                    className="sm:col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[#050a16] hover:bg-[#0c1630] border border-white/10 px-3 py-2 text-xs font-semibold text-[#cbd5e1] hover:text-white transition-all cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span>تصفح المنصة والمكتبة مباشرة كقارئ 📖</span>
                  </button>
                </div>
              </div>
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
