import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Bookmark,
  Compass,
  Menu,
  X,
  PlusCircle,
  TrendingUp,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { Novel } from '../types/novel';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, novelId?: string) => void;
  onOpenSearch: () => void;
  onOpenAddNovel: () => void;
  libraryCount: number;
  featuredNovelId: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenSearch,
  onOpenAddNovel,
  libraryCount,
  featuredNovelId,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: BookOpen },
    { id: 'explore', label: 'استكشف الروايات', icon: Compass },
    { id: 'featured', label: 'لورد الحقيقة', icon: Sparkles, novelId: featuredNovelId },
    { id: 'popular', label: 'الأكثر قراءة', icon: TrendingUp },
    { id: 'completed', label: 'مكتملة', icon: CheckCircle },
    { id: 'library', label: 'مكتبتي', icon: Bookmark, badge: libraryCount },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-amber-900/20 bg-[#161412]/90 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-right group cursor-pointer focus:outline-none"
            aria-label="الصفحة الرئيسية لـ TruthNovel"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-900/30 ring-1 ring-amber-400/30 transition-transform group-hover:scale-105">
              <span className="text-xl font-black text-[#141210]">T</span>
              <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#161412] bg-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  TruthNovel
                </span>
                <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                  عربي
                </span>
              </div>
              <p className="text-[11px] text-[#a89f91] -mt-0.5">منصة الروايات المترجمة والمؤلفة</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="روابط الموقع الرئيسية">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.id === 'featured'
                  ? currentView === 'novel-detail' && item.novelId === featuredNovelId
                  : currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.novelId) {
                      onNavigate('novel-detail', item.novelId);
                    } else {
                      onNavigate(item.id);
                    }
                  }}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                      : 'text-[#c7bfb3] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1 text-[11px] font-bold text-white shadow">
                      {item.badge}
                    </span>
                  )}
                  {item.id === 'featured' && (
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 rounded-xl bg-[#221f1b] hover:bg-[#2b2722] border border-amber-900/30 px-3.5 py-2 text-sm text-[#a89f91] hover:text-white transition-all shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            aria-label="البحث في الروايات"
          >
            <Search className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">ابحث عن رواية أو فصل...</span>
            <kbd className="hidden lg:inline-flex items-center gap-1 rounded bg-[#161412] px-1.5 py-0.5 text-[10px] text-[#7d7365] border border-white/5">
              ⌘K
            </kbd>
          </button>

          {/* Add / Submit Novel button */}
          <button
            onClick={onOpenAddNovel}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-amber-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            aria-label="إضافة أو اقتراح رواية"
          >
            <PlusCircle className="h-4 w-4" />
            <span>اقتراح رواية</span>
          </button>

          {/* Mobile menu hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden items-center justify-center rounded-lg p-2 text-[#c7bfb3] hover:bg-white/5 hover:text-white"
            aria-label="تبديل القائمة المتنقلة"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-amber-900/20 bg-[#1a1714] px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (item.novelId) {
                    onNavigate('novel-detail', item.novelId);
                  } else {
                    onNavigate(item.id);
                  }
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 font-semibold'
                    : 'text-[#d6cec2] hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-amber-500" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAddNovel();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white shadow"
            >
              <PlusCircle className="h-4 w-4" />
              <span>اقتراح رواية جديدة</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
