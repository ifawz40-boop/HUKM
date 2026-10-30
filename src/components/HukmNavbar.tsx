import React, { useState } from 'react';
import {
  Compass,
  PenTool,
  Search,
  PlusCircle,
  Menu,
  X,
  Layers,
  ShieldCheck,
  User,
  Crown,
  BookOpen,
  Bookmark,
  RefreshCw,
  LogIn,
  Mail,
} from 'lucide-react';
import { HUKM_LOGO } from '../data/hukmData';
import { CategoryItem } from '../types/hukm';
import { UserProfile, AppNotification } from '../types/auth';
import { NotificationDropdown } from './NotificationDropdown';
import { OWNER_USER, DEMO_READER_USER, isAuthorizedOwnerEmail } from '../utils/authStorage';

interface HukmNavbarProps {
  currentView: string;
  currentUser: UserProfile;
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
  onOpenProfileModal: () => void;
  onSwitchUser: (user: UserProfile) => void;
  onSelectNotification: (notif: AppNotification) => void;
  onMarkAllNotificationsAsRead: () => void;
  onOpenSendAnnouncement: () => void;
  onOpenEmailModal?: () => void;
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
  onSwitchUser,
  onSelectNotification,
  onMarkAllNotificationsAsRead,
  onOpenSendAnnouncement,
  onOpenEmailModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Strict Security Check: ONLY ifawz40@gmail.com has owner rights and access to the switcher
  const isActualOwnerUser = isAuthorizedOwnerEmail(currentUser.email);
  const isOwner = isActualOwnerUser && !isReaderPreviewMode;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#c59b27]/20 bg-[#070d1e]/90 backdrop-blur-md transition-colors" dir="rtl">
      {/* Top micro-bar: ONLY visible to ifawz40@gmail.com exclusively */}
      {isActualOwnerUser && (
        <div className="bg-[#050a17] border-b border-[#c59b27]/30 py-1 px-4 text-xs">
          <div className="mx-auto flex max-w-7xl items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-[#94a3b8]">خاص بصاحب المنصة ({currentUser.email}):</span>
              {isOwner ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 font-black text-[#f0cb69] border border-amber-500/30">
                  <Crown className="h-3 w-3 text-amber-400" />
                  واجهة صاحب المنصة والناشر الرسمي (تحكم كامل)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 font-bold text-blue-300 border border-blue-500/30">
                  <BookOpen className="h-3 w-3 text-blue-400" />
                  وضع المعاينة: تتصفح حالياً كما يرى القارئ العادي
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onOpenEmailModal && (
                <button
                  onClick={onOpenEmailModal}
                  className="flex items-center gap-1 rounded-lg bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/40 px-2 py-0.5 text-[11px] font-bold text-[#f0cb69] transition-all hover:scale-102"
                  title="مركز وهوية رسائل البريد الإلكتروني للمشتركين"
                >
                  <Mail className="h-3 w-3 text-[#d4af37]" />
                  <span>هوية البريد التلقائي ✉️</span>
                </button>
              )}

              <span className="hidden sm:inline text-[#64748b]">ميزة التبديل الحصرية لبريدك:</span>
              <button
                onClick={onToggleReaderPreview}
                className="flex items-center gap-1.5 rounded-lg bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#f0cb69] transition-all hover:scale-102"
                title="التبديل بين واجهة القارئ وواجهة صاحب الموقع (حصري لبريدك)"
              >
                <RefreshCw className="h-3 w-3 text-[#d4af37]" />
                <span>{isOwner ? 'معاينة كقارئ 👁️' : 'العودة لواجهة صاحب الموقع 👑'}</span>
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3.5 text-right group cursor-pointer focus:outline-none"
            aria-label="الرئيسية - حُكم HUKM MEDIA"
          >
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl border border-[#c59b27]/40 p-0.5 shadow-lg shadow-black/60 bg-[#0a1226] transition-transform group-hover:scale-105">
              <img
                src={HUKM_LOGO}
                alt="حُكم | HUKM MEDIA"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-[#f0cb69] transition-colors font-cairo">
                  حُكم
                </span>
                <span className="text-xs font-bold tracking-widest text-[#d4af37] border-r border-[#c59b27]/30 pr-2">
                  HUKM MEDIA
                </span>
              </div>
              <p className="text-[11px] text-[#b3bed9] font-medium tracking-wide">
                نبحث، نفكك، ونفهم
              </p>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden xl:flex items-center gap-1.5 mr-4" aria-label="روابط الموقع">
            <button
              onClick={() => onNavigate('home')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                currentView === 'home' && selectedCategoryId === 'all'
                  ? 'bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 shadow-sm'
                  : 'text-[#cbd5e1] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Compass className="h-4 w-4 text-[#d4af37]" />
              <span>المشاريع</span>
            </button>

            {/* Owner ONLY: Book Authoring Studio */}
            {isOwner && (
              <button
                onClick={() => onNavigate('writer')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  currentView === 'writer'
                    ? 'bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 shadow-sm'
                    : 'text-[#cbd5e1] hover:bg-white/5 hover:text-white'
                }`}
              >
                <PenTool className="h-4 w-4 text-[#d4af37]" />
                <span>استوديو التأليف</span>
                <span className="rounded-full bg-[#c59b27] px-1.5 py-0.2 text-[10px] font-bold text-[#070d1e]">
                  إدارة المحتوى
                </span>
              </button>
            )}

            {/* Dynamic Categories */}
            <div className="flex items-center gap-1 pr-1 border-r border-white/10 mr-1">
              {categories.slice(0, 3).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onNavigate('category', cat.id)}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all truncate max-w-[150px] ${
                    selectedCategoryId === cat.id && currentView === 'home'
                      ? 'bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40'
                      : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                  }`}
                  title={cat.name}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Owner ONLY: Manage Categories */}
            {isOwner && (
              <button
                onClick={onOpenManageCategories}
                className="flex items-center gap-1.5 rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/30 px-2.5 py-1.5 text-[11px] font-bold text-[#d4af37] transition-colors"
                title="إضافة أو حذف أقسام الكتب"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>إدارة الأقسام</span>
              </button>
            )}
          </nav>
        </div>

        {/* Action Controls & User Center */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Notifications Center */}
          <NotificationDropdown
            notifications={notifications}
            isOwner={isOwner}
            onSelectNotification={onSelectNotification}
            onMarkAllAsRead={onMarkAllNotificationsAsRead}
            onOpenSendAnnouncement={onOpenSendAnnouncement}
          />

          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 rounded-xl bg-[#0e1935] hover:bg-[#132247] border border-[#c59b27]/30 px-2.5 sm:px-3 py-2 text-xs text-[#a5b4d4] hover:text-white transition-all shadow-inner"
            aria-label="البحث"
          >
            <Search className="h-4 w-4 text-[#d4af37]" />
            <span className="hidden md:inline">ابحث...</span>
          </button>

          {/* Owner ONLY: Email Center CTA */}
          {isOwner && onOpenEmailModal && (
            <button
              onClick={onOpenEmailModal}
              className="hidden lg:flex items-center gap-1.5 rounded-xl bg-[#0e1935] hover:bg-[#132247] border border-[#c59b27]/30 px-3 py-2 text-xs font-semibold text-[#f0cb69] transition-all cursor-pointer"
              title="مركز وهوية رسائل البريد التلقائي للمشتركين"
            >
              <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>هوية البريد ✉️</span>
            </button>
          )}

          {/* Owner ONLY: New Book Authoring CTA */}
          {isOwner && (
            <button
              onClick={onOpenNewBook}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c59b27] to-[#997314] hover:from-[#f0cb69] hover:to-[#b88c1b] px-3.5 sm:px-4 py-2 text-xs font-bold text-[#070d1e] shadow-lg shadow-[#c59b27]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="رفع كتاب جديد"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">رفع كتاب جديد</span>
            </button>
          )}

          {/* Reader / User Profile Button */}
          <button
            onClick={onOpenProfileModal}
            className={`flex items-center gap-2 rounded-xl border p-1.5 sm:px-3 sm:py-1.5 text-right transition-all cursor-pointer ${
              isOwner
                ? 'bg-[#0a1226] border-[#c59b27]/40 hover:border-[#f0cb69]'
                : 'bg-[#0e1935] border-white/10 hover:border-[#c59b27]/40'
            }`}
            title="الملف الشخصي والمحفوظات"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c59b27]/20 text-[#f0cb69] font-black text-xs">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden lg:block text-right">
              <span className="text-[11px] font-bold text-white block leading-tight">
                {currentUser.name}
              </span>
              <span
                className={`text-[9px] font-semibold block ${
                  isOwner ? 'text-[#f0cb69]' : 'text-blue-300'
                }`}
              >
                {isOwner ? 'صاحب المنصة 👑' : 'قارئ معتمد 📖'}
              </span>
            </div>
          </button>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex xl:hidden items-center justify-center rounded-xl p-2 text-[#cbd5e1] hover:bg-white/5 hover:text-white border border-white/5"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-[#c59b27]/20 bg-[#0a1226] px-4 py-3 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#070d1e] border border-white/10 text-xs">
            <span className="text-white font-bold">{currentUser.name}</span>
            <span className="text-[#f0cb69] font-semibold">
              {isOwner ? 'صاحب المنصة (الناشر)' : 'قارئ'}
            </span>
          </div>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('home');
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#e2e8f0] hover:bg-white/5"
          >
            <Compass className="h-4 w-4 text-[#d4af37]" />
            <span>المشاريع والمعرض</span>
          </button>

          {isOwner && (
            <>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('writer');
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#e2e8f0] hover:bg-white/5"
              >
                <PenTool className="h-4 w-4 text-[#d4af37]" />
                <span>استوديو تأليف الكتب</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenManageCategories();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#f0cb69] bg-[#c59b27]/10"
              >
                <Layers className="h-4 w-4" />
                <span>إدارة وتعديل الأقسام</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenProfileModal();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#cbd5e1] hover:bg-white/5"
          >
            <Bookmark className="h-4 w-4 text-[#d4af37]" />
            <span>محفوظاتي والكتب المفضلة</span>
          </button>

          <div className="pt-2 border-t border-white/5">
            <span className="text-[11px] text-[#64748b] block mb-1">الأقسام:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('category', c.id);
                  }}
                  className="rounded-lg bg-[#070d1e] p-2 text-xs font-semibold text-[#cbd5e1] text-right truncate"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
