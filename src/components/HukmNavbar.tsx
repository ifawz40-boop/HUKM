import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  PenTool,
  Search,
  PlusCircle,
  Menu,
  X,
  Layers,
  ShieldCheck,
  Crown,
  BookOpen,
  Bookmark,
  RefreshCw,
  LogIn,
  Mail,
  User,
  AlertTriangle,
  RotateCw,
  ChevronDown,
  Check,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { HUKM_LOGO } from '../data/hukmData';
import { CategoryItem } from '../types/hukm';
import { UserProfile, AppNotification } from '../types/auth';
import { NotificationDropdown } from './NotificationDropdown';
import {
  isOwner as checkIsOwner,
  isAdmin as checkIsAdmin,
  canManageAdmins,
} from '../services/permissionService';
import { resendVerificationEmail, reloadCurrentUserSession } from '../firebase/authService';

interface HukmNavbarProps {
  currentView: string;
  currentUser: UserProfile | null;
  notifications: AppNotification[];
  categories: CategoryItem[];
  selectedCategoryId: string;
  isReaderPreviewMode?: boolean;
  onToggleReaderPreview?: () => void;
  onNavigate: (view: string, categoryId?: string) => void;
  onOpenNewBook: () => void;
  onOpenSearch: () => void;
  onOpenManageCategories: () => void;
  onOpenAuthModal: (mode?: 'login' | 'signup') => void;
  onOpenProfileModal: (tab?: 'profile' | 'bookmarks') => void;
  onSelectNotification: (notif: AppNotification) => void;
  onMarkAllNotificationsAsRead: () => void;
  onOpenSendAnnouncement: () => void;
  onOpenEmailModal?: () => void;
  onOpenAdminManagement?: () => void;
  onLogout?: () => void;
  onUserRefreshed?: (user: UserProfile) => void;
  onShowToast?: (msg: string) => void;
}

export const HukmNavbar: React.FC<HukmNavbarProps> = ({
  currentView,
  currentUser,
  notifications,
  categories,
  selectedCategoryId,
  isReaderPreviewMode = false,
  onToggleReaderPreview,
  onNavigate,
  onOpenNewBook,
  onOpenSearch,
  onOpenManageCategories,
  onOpenAuthModal,
  onOpenProfileModal,
  onSelectNotification,
  onMarkAllNotificationsAsRead,
  onOpenSendAnnouncement,
  onOpenEmailModal,
  onOpenAdminManagement,
  onLogout,
  onUserRefreshed,
  onShowToast,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const categoriesDropdownRef = useRef<HTMLDivElement>(null);

  // Authoritative Custom Claims role & verification checks
  const isUserOwner = checkIsOwner(currentUser);
  const isUserAdmin = checkIsAdmin(currentUser);
  const isActualAdminOrOwner = isUserAdmin;
  const isEffectiveAdmin = isActualAdminOrOwner && !isReaderPreviewMode;
  const isEffectiveOwner = isUserOwner && !isReaderPreviewMode;
  const canManagePlatformAdmins = canManageAdmins(currentUser);

  // Role grouping for clean navigation
  const isGuest = currentUser === null;
  const isReader = currentUser !== null && !isEffectiveAdmin;

  // Bookmarks count for quick badge
  const bookmarksCount = currentUser?.bookmarks?.length || 0;

  // Name of selected category if specific
  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);
  const categoriesDropdownLabel =
    selectedCategoryId !== 'all' && selectedCategoryObj
      ? selectedCategoryObj.name
      : 'كل الأقسام';

  // Close categories dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoriesDropdownRef.current &&
        !categoriesDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoriesDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleResend = async () => {
    setIsResending(true);
    const res = await resendVerificationEmail();
    setIsResending(false);
    onShowToast?.(res.message);
  };

  const handleReload = async () => {
    setIsReloading(true);
    const refreshed = await reloadCurrentUserSession();
    setIsReloading(false);
    if (refreshed) {
      onUserRefreshed?.(refreshed);
      if (refreshed.emailVerified) {
        onShowToast?.('تم تأكيد بريدك الإلكتروني بنجاح!');
      } else {
        onShowToast?.('لم يتم تأكيد البريد بعد. يرجى الضغط على الرابط في رسالة التأكيد.');
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#c59b27]/20 bg-[#070d1e]/95 backdrop-blur-md transition-colors selection:bg-[#c59b27]" dir="rtl">
      {/* 1. Email Verification Alert Banner (Only for unverified accounts) */}
      {currentUser && !currentUser.emailVerified && (
        <div className="bg-gradient-to-r from-amber-950/95 via-amber-900/90 to-amber-950/95 border-b border-amber-500/40 py-2 px-4 text-xs text-amber-200 shadow-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2 truncate">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="truncate">
                بريدك الإلكتروني <strong className="text-white">({currentUser.email})</strong> غير مؤكد بعد. يرجى تأكيد البريد لحماية حسابك وتفعيل الصلاحيات.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="underline hover:text-white cursor-pointer font-bold disabled:opacity-50"
              >
                {isResending ? 'جاري الإرسال...' : 'إعادة إرسال الرابط'}
              </button>
              <button
                type="button"
                onClick={handleReload}
                disabled={isReloading}
                className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-0.5 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 cursor-pointer font-bold"
              >
                <RotateCw className={`h-3 w-3 ${isReloading ? 'animate-spin' : ''}`} />
                <span>تحقق الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Micro-Bar: Responsive, Clean & Non-crowded (Admin & Owner ONLY) */}
      {isActualAdminOrOwner && currentUser && (
        <div className="bg-[#050a16] border-b border-[#c59b27]/30 py-1.5 px-3 sm:px-6 text-xs shadow-inner">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 text-[11px]">
            {/* Identity & Role Badge */}
            <div className="flex items-center gap-2 truncate">
              {isEffectiveAdmin ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-black border text-[11px] shrink-0 ${
                    isUserOwner
                      ? 'bg-amber-500/20 text-[#f0cb69] border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  }`}
                >
                  {isUserOwner ? (
                    <Crown className="h-3 w-3 text-amber-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="h-3 w-3 text-blue-400 shrink-0" />
                  )}
                  <span>
                    {isUserOwner
                      ? 'المؤسس والمشرف العام'
                      : 'المدير التنفيذي والناشر'}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/20 px-2 py-0.5 font-bold text-blue-300 border border-blue-500/40 text-[11px] shrink-0">
                  <BookOpen className="h-3 w-3 text-blue-400 shrink-0" />
                  <span>معاينة كقارئ عادي 👁️</span>
                </span>
              )}

              {/* Email: displayed cleanly, hidden on extra small screens to prevent line wrapping */}
              <span className="hidden sm:inline text-[#94a3b8] truncate max-w-[220px]">
                ({currentUser.email})
              </span>
            </div>

            {/* Admin Management & Preview Mode Toggles */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {isEffectiveOwner && onOpenEmailModal && (
                <button
                  type="button"
                  onClick={onOpenEmailModal}
                  className="hidden md:flex items-center gap-1 rounded-lg bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/40 px-2 py-0.5 text-[11px] font-bold text-[#f0cb69] transition-all cursor-pointer"
                  title="هوية وقوالب رسائل البريد للمشتركين"
                >
                  <Mail className="h-3 w-3 text-[#d4af37]" />
                  <span>هوية البريد ✉️</span>
                </button>
              )}

              {onOpenAdminManagement && (
                <button
                  type="button"
                  onClick={onOpenAdminManagement}
                  className="flex items-center gap-1 rounded-lg bg-[#0e1935] hover:bg-[#162752] border border-blue-500/40 px-2.5 py-0.5 text-[11px] font-bold text-blue-300 transition-all cursor-pointer"
                  title={canManagePlatformAdmins ? 'إدارة المدراء وتعيين الصلاحيات وحظر الحسابات' : 'مركز الحظر والرقابة'}
                >
                  <ShieldCheck className="h-3 w-3 text-blue-400" />
                  <span className="hidden xs:inline">
                    {canManagePlatformAdmins ? 'إدارة المدراء 🛡️' : 'الرقابة 🛡️'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onToggleReaderPreview}
                className="flex items-center gap-1 rounded-lg bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#f0cb69] transition-all cursor-pointer"
                title="التبديل بين واجهة الإدارة ومعاينة تجربة القارئ"
              >
                <RefreshCw className="h-3 w-3 text-[#d4af37]" />
                <span className="hidden xs:inline">
                  {isEffectiveAdmin ? 'معاينة كقارئ 👁️' : 'واجهة الإدارة 👑'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Header Bar: Responsive Breakpoint at lg: (1024px) */}
      <div className="mx-auto flex h-18 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        {/* Right Section: Brand Logo & Editorial Identity */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate(isGuest ? 'landing' : 'home')}
            className="flex items-center gap-3 text-right group cursor-pointer focus:outline-none"
            aria-label="الرئيسية - حُكم HUKM MEDIA"
          >
            <div className="relative h-11 w-11 sm:h-13 sm:w-13 shrink-0 overflow-hidden rounded-xl border border-[#c59b27]/50 shadow-lg shadow-black/70 bg-[#050a16] group-hover:border-[#f0cb69] transition-colors">
              <img
                src={HUKM_LOGO}
                alt="حُكم"
                className="h-full w-full object-cover scale-105 transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-[#f0cb69] transition-colors font-cairo">
                  حُكم
                </span>
                <span className="text-[10px] sm:text-xs font-bold tracking-widest text-[#d4af37] border-r border-[#c59b27]/30 pr-1.5 sm:pr-2">
                  HUKM MEDIA
                </span>
              </div>
              <p className="hidden sm:block text-[10px] sm:text-[11px] text-[#b3bed9] font-medium tracking-wide">
                نبحث، نفكك، ونفهم
              </p>
            </div>
          </button>

          {/* Desktop Navigation Links: Visible on lg: and up (>=1024px) */}
          <nav className="hidden lg:flex items-center gap-1.5 mr-2" aria-label="روابط الموقع الرئيسية">
            {/* --- GUEST NAVIGATION --- */}
            {isGuest && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('landing')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'landing'
                      ? 'bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 shadow-sm'
                      : 'text-[#cbd5e1] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Crown className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>الرؤية والمنهج</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'home' && selectedCategoryId === 'all'
                      ? 'bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 shadow-sm'
                      : 'text-[#cbd5e1] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Compass className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>المكتبة الاستقصائية</span>
                </button>
              </>
            )}

            {/* --- READER NAVIGATION --- */}
            {isReader && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'home' && selectedCategoryId === 'all'
                      ? 'bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 shadow-sm'
                      : 'text-[#cbd5e1] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Compass className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>المكتبة والمشاريع</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenProfileModal('bookmarks')}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#cbd5e1] hover:bg-white/5 hover:text-white transition-all cursor-pointer"
                  title="الكتب المحفوظة في مكتبتي الخاصة"
                >
                  <Bookmark className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>محفوظاتي</span>
                  {bookmarksCount > 0 && (
                    <span className="rounded-full bg-[#c59b27]/30 border border-[#c59b27]/50 px-1.5 py-0.2 text-[10px] font-black text-[#f0cb69]">
                      {bookmarksCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('landing')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'landing'
                      ? 'bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 shadow-sm'
                      : 'text-[#cbd5e1] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>عن حُكم</span>
                </button>
              </>
            )}

            {/* --- ADMIN & OWNER NAVIGATION --- */}
            {isEffectiveAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'home' && selectedCategoryId === 'all'
                      ? 'bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 shadow-sm'
                      : 'text-[#cbd5e1] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Compass className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>المكتبة والمشاريع</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('writer')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'writer'
                      ? 'bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 shadow-sm'
                      : 'text-[#cbd5e1] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <PenTool className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>استوديو التأليف</span>
                  <span className="rounded-full bg-[#c59b27] px-1.5 py-0.2 text-[10px] font-black text-[#070d1e]">
                    إدارة
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onOpenManageCategories}
                  className="flex items-center gap-1.5 rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/30 px-2.5 py-1.5 text-[11px] font-bold text-[#f0cb69] transition-colors cursor-pointer"
                  title="إضافة أو حذف أقسام الكتب"
                >
                  <Layers className="h-3 w-3 text-[#d4af37]" />
                  <span>إدارة الأقسام</span>
                </button>
              </>
            )}

            {/* --- UNIFIED "كل الأقسام" DROPDOWN (No 3-item truncation) --- */}
            <div className="relative pr-1" ref={categoriesDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCategoriesDropdownOpen(!isCategoriesDropdownOpen)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition-all cursor-pointer ${
                  selectedCategoryId !== 'all'
                    ? 'bg-[#c59b27]/20 text-[#f0cb69] border-[#c59b27]/40 shadow-sm'
                    : 'bg-[#0a1226] text-[#cbd5e1] border-white/10 hover:border-[#c59b27]/40 hover:text-white'
                }`}
                aria-expanded={isCategoriesDropdownOpen}
                aria-label="قائمة كل الأقسام"
              >
                <Layers className="h-3.5 w-3.5 text-[#d4af37]" />
                <span className="truncate max-w-[130px]">{categoriesDropdownLabel}</span>
                <ChevronDown
                  className={`h-3 w-3 text-[#d4af37] transition-transform duration-200 ${
                    isCategoriesDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isCategoriesDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl border border-[#c59b27]/40 bg-[#0a1226]/98 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-right">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] border-b border-white/10">
                    تصنيفات ومسارات حُكم
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 py-1 no-scrollbar">
                    {/* All Categories Option */}
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('category', 'all');
                        setIsCategoriesDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        selectedCategoryId === 'all'
                          ? 'bg-[#c59b27] text-[#070d1e]'
                          : 'text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Compass className="h-3.5 w-3.5" />
                        <span>كافة المشاريع والكتب</span>
                      </div>
                      {selectedCategoryId === 'all' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>

                    {/* Dynamic Categories List */}
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            onNavigate('category', cat.id);
                            setIsCategoriesDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#c59b27] text-[#070d1e] font-bold'
                              : 'text-[#cbd5e1] hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="truncate pr-1 text-right">
                            <span className="block truncate">{cat.name}</span>
                            {cat.description && (
                              <span
                                className={`text-[10px] block truncate ${
                                  isSelected ? 'text-[#070d1e]/80' : 'text-[#64748b]'
                                }`}
                              >
                                {cat.description}
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Left Section: Action Controls & User Center */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Notifications Center (All users) */}
          <NotificationDropdown
            notifications={notifications}
            isOwner={isEffectiveAdmin}
            onSelectNotification={onSelectNotification}
            onMarkAllAsRead={onMarkAllNotificationsAsRead}
            onOpenSendAnnouncement={onOpenSendAnnouncement}
          />

          {/* Quick Search Button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 rounded-xl bg-[#0e1935] hover:bg-[#132247] border border-[#c59b27]/30 px-2.5 sm:px-3 py-2 text-xs text-[#a5b4d4] hover:text-white transition-all shadow-inner cursor-pointer"
            aria-label="البحث في الكتب والفصول"
          >
            <Search className="h-4 w-4 text-[#d4af37]" />
            <span className="hidden md:inline text-xs">ابحث...</span>
          </button>

          {/* Admin & Owner: Quick Publish Book CTA */}
          {isEffectiveAdmin && (
            <button
              type="button"
              onClick={onOpenNewBook}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c59b27] to-[#997314] hover:from-[#f0cb69] hover:to-[#b88c1b] px-3 sm:px-3.5 py-2 text-xs font-bold text-[#070d1e] shadow-lg shadow-[#c59b27]/20 transition-all hover:scale-102 active:scale-95 cursor-pointer"
              aria-label="رفع كتاب جديد"
            >
              <PlusCircle className="h-4 w-4" />
              <span>كتاب جديد</span>
            </button>
          )}

          {/* User Profile or Guest Login CTA */}
          {currentUser ? (
            <button
              type="button"
              onClick={() => onOpenProfileModal('profile')}
              className={`flex items-center gap-2 rounded-xl border p-1.5 sm:px-3 sm:py-1.5 text-right transition-all cursor-pointer ${
                isUserOwner
                  ? 'bg-[#0a1226] border-[#c59b27]/50 hover:border-[#f0cb69]'
                  : isUserAdmin
                  ? 'bg-[#0a1226] border-blue-500/40 hover:border-blue-400'
                  : 'bg-[#0e1935] border-white/10 hover:border-[#c59b27]/40'
              }`}
              title="الملف الشخصي والمحفوظات"
              aria-label="الملف الشخصي"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c59b27]/20 text-[#f0cb69] font-black text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden xl:block text-right">
                <span className="text-[11px] font-bold text-white block leading-tight truncate max-w-[100px]">
                  {currentUser.name}
                </span>
                <span
                  className={`text-[9px] font-semibold block ${
                    currentUser.role === 'owner'
                      ? 'text-[#f0cb69]'
                      : currentUser.role === 'admin'
                      ? 'text-blue-300'
                      : 'text-emerald-300'
                  }`}
                >
                  {currentUser.role === 'owner'
                    ? 'المؤسس 👑'
                    : currentUser.role === 'admin'
                    ? 'المدير 🛡️'
                    : 'قارئ معتمد 📖'}
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuthModal('login')}
              className="flex items-center gap-1.5 rounded-xl gold-gradient-btn px-3 sm:px-4 py-2 text-xs font-bold text-[#070d1e] shadow-md hover:scale-102 transition-transform cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>دخول / تسجيل</span>
            </button>
          )}

          {/* Mobile Hamburger Button: Triggers at lg: breakpoint (<1024px) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex lg:hidden items-center justify-center rounded-xl p-2 text-[#cbd5e1] hover:bg-white/5 hover:text-white border border-white/10 cursor-pointer"
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 4. Mobile Menu Drawer with Backdrop Overlay (lg:hidden) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Blur Overlay: clicking closes menu */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-[#0a1226] border-l border-[#c59b27]/30 shadow-2xl p-5 overflow-y-auto flex flex-col justify-between z-50 animate-in slide-in-from-right duration-250 text-right">
            <div className="space-y-5">
              {/* Drawer Header with Close Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg overflow-hidden border border-[#c59b27]/40 bg-[#050a16]">
                    <img src={HUKM_LOGO} alt="حُكم" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <span className="text-base font-black text-white font-cairo block leading-tight">
                      حُكم MEDIA
                    </span>
                    <span className="text-[10px] text-[#d4af37] font-bold">
                      نبحث، نفكك، ونفهم
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl p-1.5 text-[#94a3b8] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="إغلاق القائمة"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Identity or Guest Login Card */}
              {currentUser ? (
                <div className="rounded-2xl bg-[#070d1e] border border-white/10 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">{currentUser.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        currentUser.role === 'owner'
                          ? 'bg-amber-500/20 text-[#f0cb69] border-amber-500/30'
                          : currentUser.role === 'admin'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {currentUser.role === 'owner'
                        ? 'المؤسس 👑'
                        : currentUser.role === 'admin'
                        ? 'المدير 🛡️'
                        : 'قارئ معتمد 📖'}
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] truncate">{currentUser.email}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuthModal('login');
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl gold-gradient-btn py-3 text-xs font-black text-[#070d1e] shadow-md cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  <span>تسجيل الدخول أو الانضمام للقراء</span>
                </button>
              )}

              {/* Navigation Links based on role */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block mb-1">
                  روابط المنصة
                </span>

                {isGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('landing');
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#f0cb69] bg-[#c59b27]/10 border border-[#c59b27]/20 cursor-pointer"
                  >
                    <Crown className="h-4 w-4 text-[#d4af37]" />
                    <span>الرؤية والمنهج</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('home');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#e2e8f0] hover:bg-white/5 cursor-pointer"
                >
                  <Compass className="h-4 w-4 text-[#d4af37]" />
                  <span>المكتبة والمشاريع</span>
                </button>

                {/* Saved Bookmarks for Readers and logged in users */}
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenProfileModal('bookmarks');
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-[#cbd5e1] hover:bg-white/5 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Bookmark className="h-4 w-4 text-[#d4af37]" />
                      <span>محفوظاتي والكتب المفضلة</span>
                    </div>
                    {bookmarksCount > 0 && (
                      <span className="rounded-full bg-[#c59b27]/20 border border-[#c59b27]/40 px-2 py-0.5 text-xs font-black text-[#f0cb69]">
                        {bookmarksCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Admin & Owner Authoring Tools */}
                {isEffectiveAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigate('writer');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#e2e8f0] hover:bg-white/5 cursor-pointer"
                    >
                      <PenTool className="h-4 w-4 text-[#d4af37]" />
                      <span>استوديو تأليف الكتب</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenNewBook();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#f0cb69] bg-[#c59b27]/10 border border-[#c59b27]/20 cursor-pointer"
                    >
                      <PlusCircle className="h-4 w-4 text-[#d4af37]" />
                      <span>رفع كتاب جديد</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenManageCategories();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#cbd5e1] hover:bg-white/5 cursor-pointer"
                    >
                      <Layers className="h-4 w-4 text-[#d4af37]" />
                      <span>إدارة وتعديل الأقسام</span>
                    </button>

                    {onOpenAdminManagement && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenAdminManagement();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-300 hover:bg-white/5 cursor-pointer"
                      >
                        <ShieldCheck className="h-4 w-4 text-blue-400" />
                        <span>{canManagePlatformAdmins ? 'إدارة المدراء والصلاحيات' : 'مركز الرقابة والحظر'}</span>
                      </button>
                    )}

                    {onOpenEmailModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenEmailModal();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#f0cb69] hover:bg-white/5 cursor-pointer"
                      >
                        <Mail className="h-4 w-4 text-[#d4af37]" />
                        <span>هوية البريد والمشتركين ✉️</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* All Categories Section (Full list, organized) */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                    الأقسام والتصنيفات
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('category', 'all');
                    }}
                    className={`text-[11px] font-bold ${
                      selectedCategoryId === 'all' ? 'text-[#f0cb69]' : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    عرض الكل
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {categories.map((c) => {
                    const isSelected = selectedCategoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onNavigate('category', c.id);
                        }}
                        className={`flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold text-right transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#c59b27] text-[#070d1e] font-bold'
                            : 'bg-[#070d1e] text-[#cbd5e1] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions: Profile & Logout */}
            {currentUser && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenProfileModal('profile');
                  }}
                  className="flex w-full items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 p-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  <User className="h-4 w-4 text-[#d4af37]" />
                  <span>تعديل الملف الشخصي</span>
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 p-2.5 text-xs font-bold text-rose-300 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج من الحساب</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
