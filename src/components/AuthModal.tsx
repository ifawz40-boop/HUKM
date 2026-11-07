import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  BookOpen,
  Sparkles,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Compass,
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import {
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  formatAuthError,
} from '../firebase/authService';
import { HUKM_LOGO } from '../data/hukmData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  onBrowseAsGuest?: () => void;
  initialMode?: 'login' | 'signup' | 'reset';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onBrowseAsGuest,
  initialMode = 'login',
}) => {
  const [tab, setTab] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }

    setIsLoading(true);

    try {
      if (tab === 'reset') {
        await resetPassword(email.trim());
        setSuccessMsg('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح!');
        setIsLoading(false);
        return;
      }

      if (tab === 'signup') {
        if (!name.trim()) {
          setErrorMsg('يرجى كتابة الاسم الكامل.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('كلمة المرور يجب أن لا تقل عن 6 أحرف.');
          setIsLoading(false);
          return;
        }

        const { user } = await registerWithEmail(email.trim(), password, name.trim());
        onLoginSuccess(user);
        onClose();
      } else {
        // Login
        if (!password) {
          setErrorMsg('يرجى إدخال كلمة المرور.');
          setIsLoading(false);
          return;
        }
        const user = await loginWithEmail(email.trim(), password);
        onLoginSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border border-[#c59b27]/40 bg-[#0a1226] p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 overflow-hidden rounded-2xl border-2 border-[#c59b27]/50 bg-[#050a16] shadow-xl p-1">
            <img src={HUKM_LOGO} alt="حُكم" className="h-full w-full object-cover" />
          </div>
          <h2 className="text-xl font-black text-white font-cairo">
            {tab === 'login' && 'تسجيل الدخول إلى حُكم'}
            {tab === 'signup' && 'إنشاء حساب قارئ جديد'}
            {tab === 'reset' && 'استعادة كلمة المرور'}
          </h2>
          <p className="text-xs text-[#94a3b8]">
            منصة حُكم للبحث والقراءة والمعرفة
          </p>
        </div>

        {/* Auth Mode Tabs */}
        {tab !== 'reset' && (
          <div className="flex rounded-xl bg-[#050a16] p-1 border border-white/5 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                tab === 'login'
                  ? 'bg-gradient-to-r from-[#d4af37] to-[#c59b27] text-[#070d1e] shadow'
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
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                tab === 'signup'
                  ? 'bg-gradient-to-r from-[#d4af37] to-[#c59b27] text-[#070d1e] shadow'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              إنشاء حساب جديد
            </button>
          </div>
        )}

        {/* Feedback messages */}
        {errorMsg && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-bold text-rose-300 text-center">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-300 text-center">
            {successMsg}
          </div>
        )}

        {/* Real Google Sign In */}
        {tab !== 'reset' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 py-3 px-4 font-bold text-xs shadow transition-all hover:scale-102 cursor-pointer disabled:opacity-50"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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
              <span>المتابعة باستخدام حساب Google</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#0a1226] px-3 text-[11px] text-[#64748b] shrink-0 font-medium">
                أو بالبريد الإلكتروني
              </span>
              <div className="border-t border-white/10 w-full" />
            </div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-[#cbd5e1] mb-1">الاسم الكامل:</label>
              <div className="relative">
                <User className="absolute right-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: د. محمد العلي"
                  className="w-full rounded-xl bg-[#050a16] border border-white/15 pr-9 pl-3 py-2 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#cbd5e1] mb-1">البريد الإلكتروني:</label>
            <div className="relative">
              <Mail className="absolute right-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl bg-[#050a16] border border-white/15 pr-9 pl-3 py-2 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
              />
            </div>
          </div>

          {tab !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#cbd5e1]">كلمة المرور:</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('reset');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] text-[#d4af37] hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-[#050a16] border border-white/15 pr-9 pl-9 py-2 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-2.5 text-[#64748b] hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] py-2.5 text-xs font-black text-[#070d1e] shadow-lg transition-transform hover:scale-102 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? 'جاري التحقق...' : tab === 'login' ? 'دخول' : tab === 'signup' ? 'إنشاء حساب جديد' : 'إرسال رابط الاستعادة'}
          </button>
        </form>

        {/* Reset Password Back link */}
        {tab === 'reset' && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-xs text-[#d4af37] font-bold hover:underline"
            >
              ← العودة لتسجيل الدخول
            </button>
          </div>
        )}

        {/* Guest Mode Option */}
        <div className="pt-3 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={() => {
              if (onBrowseAsGuest) onBrowseAsGuest();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#94a3b8] hover:text-[#f0cb69] transition-colors cursor-pointer"
          >
            <Compass className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>تصفح المكتبة كضيف دون إنشاء حساب الآن ←</span>
          </button>
        </div>
      </div>
    </div>
  );
};
