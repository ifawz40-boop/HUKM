import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sliders,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Share2,
  Type,
  Sun,
  Moon,
  Coffee,
  Check,
  RotateCcw,
} from 'lucide-react';
import { BookProject, BookChapter } from '../types/hukm';
import { UserProfile } from '../types/auth';
import { calculateReadingTimeMinutes, calculateWordsCount } from '../utils/hukmEngine';
import {
  recordChapterOpened,
  toggleChapterReadStatus,
  isChapterCompleted,
  saveChapterScrollPosition,
  getChapterScrollPosition,
} from '../utils/readingTracker';
import {
  saveReadingProgressToFirestore,
  formatReadingProgressId,
} from '../firebase/firestoreService';

interface BookReaderViewProps {
  book: BookProject;
  initialChapterId?: string;
  isOwner?: boolean;
  isBookmarked?: boolean;
  currentUser?: UserProfile | null;
  onBack: () => void;
  onOpenOverview?: () => void;
  onOpenWriter?: (bookId: string) => void;
  onChapterViewed?: (chapterId: string) => void;
  onToggleBookmark?: () => void;
  onShowToast?: (message: string) => void;
}

export const BookReaderView: React.FC<BookReaderViewProps> = ({
  book,
  initialChapterId,
  isOwner = false,
  isBookmarked = false,
  currentUser = null,
  onBack,
  onOpenOverview,
  onOpenWriter,
  onChapterViewed,
  onToggleBookmark,
  onShowToast,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    initialChapterId || book.chapters[0]?.id || ''
  );

  // Typography & Reader Preferences (stored in localStorage)
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('hukm_reader_fontsize');
      if (saved) return parseInt(saved);
    } catch {}
    return 20;
  });

  const [fontFamily, setFontFamily] = useState<'amiri' | 'cairo' | 'tajawal' | 'readex'>(() => {
    try {
      const saved = localStorage.getItem('hukm_reader_font') as any;
      if (saved) return saved;
    } catch {}
    return 'amiri';
  });

  const [theme, setTheme] = useState<'dark' | 'sepia' | 'light' | 'black'>(() => {
    try {
      const saved = localStorage.getItem('hukm_reader_theme') as any;
      if (saved) return saved;
    } catch {}
    return 'dark';
  });

  const [contentWidth, setContentWidth] = useState<'normal' | 'wide' | 'compact'>('normal');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  // Sync index
  const currentChapterIndex = book.chapters.findIndex((c) => c.id === selectedChapterId);
  const currentChapter = book.chapters[currentChapterIndex] || book.chapters[0];

  const prevChapter = currentChapterIndex > 0 ? book.chapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < book.chapters.length - 1
      ? book.chapters[currentChapterIndex + 1]
      : null;

  // Refs for debouncing and preventing repeated scroll restoration jumps
  const scrollDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredChapterRef = useRef<Record<string, boolean>>({});
  const lastRecordedProgressRef = useRef<number>(0);

  // Helper to persist current scroll progress
  const persistProgress = (progressPercent: number) => {
    if (!currentChapter?.id) return;
    const clamped = Math.min(100, Math.max(0, progressPercent));
    lastRecordedProgressRef.current = clamped;

    // Save locally in user-partitioned tracker
    saveChapterScrollPosition(book.id, currentChapter.id, clamped, currentUser?.id);

    // Save to Firestore if authenticated user
    if (currentUser?.id) {
      saveReadingProgressToFirestore({
        id: formatReadingProgressId(currentUser.id, book.id, currentChapter.id),
        userId: currentUser.id,
        bookId: book.id,
        chapterId: currentChapter.id,
        chapterIndex: currentChapterIndex >= 0 ? currentChapterIndex : 0,
        scrollPercent: clamped,
        lastReadAt: new Date().toISOString(),
        completed: clamped >= 90,
      }).catch(() => {});
    }
  };

  // Reading progress scroll listener with 500ms debounce
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const progress = (window.scrollY / totalScroll) * 100;
        const clamped = Math.min(100, Math.max(0, progress));
        setScrollProgress(clamped);

        if (scrollDebounceTimerRef.current) {
          clearTimeout(scrollDebounceTimerRef.current);
        }
        scrollDebounceTimerRef.current = setTimeout(() => {
          persistProgress(clamped);
        }, 500);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollDebounceTimerRef.current) {
        clearTimeout(scrollDebounceTimerRef.current);
      }
    };
  }, [currentChapter?.id, currentUser?.id, book.id, currentChapterIndex]);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem('hukm_reader_fontsize', fontSize.toString());
      localStorage.setItem('hukm_reader_font', fontFamily);
      localStorage.setItem('hukm_reader_theme', theme);
    } catch {}
  }, [fontSize, fontFamily, theme]);

  // Track chapter view and restore position smoothly
  useEffect(() => {
    if (!currentChapter?.id) return;

    onChapterViewed?.(currentChapter.id);
    recordChapterOpened(book.id, currentChapter.id, currentUser?.id);

    const chapterId = currentChapter.id;
    // Check if position was already restored for this chapter session
    if (!hasRestoredChapterRef.current[chapterId]) {
      hasRestoredChapterRef.current[chapterId] = true;
      const savedPosition = getChapterScrollPosition(book.id, chapterId, currentUser?.id);

      if (savedPosition > 2) {
        // Give the DOM 150ms to render paragraphs and images before measuring scroll height
        const timer = setTimeout(() => {
          const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (totalScroll > 50) {
            const targetY = (totalScroll * savedPosition) / 100;
            window.scrollTo({ top: targetY, behavior: 'smooth' });
            setShowRestoredNotice(true);
            setTimeout(() => setShowRestoredNotice(false), 3000);
          }
        }, 150);
        return () => clearTimeout(timer);
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [currentChapter?.id, book.id, currentUser?.id]);

  // Flush scroll progress immediately on unmount
  useEffect(() => {
    return () => {
      if (scrollDebounceTimerRef.current) {
        clearTimeout(scrollDebounceTimerRef.current);
      }
      if (currentChapter?.id && lastRecordedProgressRef.current > 0) {
        persistProgress(lastRecordedProgressRef.current);
      }
    };
  }, [currentChapter?.id]);

  // Keyboard navigation: Left = Prev, Right = Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft' && prevChapter) {
        setSelectedChapterId(prevChapter.id);
      } else if (e.key === 'ArrowRight' && nextChapter) {
        setSelectedChapterId(nextChapter.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevChapter, nextChapter]);

  // Handle chapter change
  const navigateToChapter = (chapterId: string) => {
    // Flush current chapter progress before switching
    if (currentChapter?.id && scrollProgress > 0) {
      persistProgress(scrollProgress);
    }
    setSelectedChapterId(chapterId);
  };

  const handleToggleRead = () => {
    if (!currentChapter) return;
    toggleChapterReadStatus(book.id, currentChapter.id, currentUser?.id);
    onShowToast?.('تم تحديث حالة قراءة الفصل ✓');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  // Theme styling definitions
  const themeClasses = {
    dark: {
      bg: 'bg-[#070d1e]',
      text: 'text-[#ece7de]',
      navBg: 'bg-[#0a1226]/90 border-[#c59b27]/20',
      cardBg: 'bg-[#0b1329] border-white/10',
      pillBg: 'bg-white/5 text-[#94a3b8]',
      accent: 'text-[#f0cb69]',
    },
    sepia: {
      bg: 'bg-[#f7efe1]',
      text: 'text-[#3c3124]',
      navBg: 'bg-[#eedfc8]/95 border-[#c8b293]',
      cardBg: 'bg-[#f0e3ce] border-[#dfcdb5]',
      pillBg: 'bg-[#e4d3bc] text-[#5c4c38]',
      accent: 'text-[#8b5e28]',
    },
    light: {
      bg: 'bg-[#fafafa]',
      text: 'text-[#1e293b]',
      navBg: 'bg-white/95 border-slate-200 shadow-sm',
      cardBg: 'bg-white border-slate-200',
      pillBg: 'bg-slate-100 text-slate-600',
      accent: 'text-amber-700',
    },
    black: {
      bg: 'bg-[#000000]',
      text: 'text-[#e5e5e5]',
      navBg: 'bg-[#0a0a0a]/95 border-neutral-800',
      cardBg: 'bg-[#111111] border-neutral-800',
      pillBg: 'bg-neutral-900 text-neutral-400',
      accent: 'text-amber-400',
    },
  }[theme];

  const fontClasses = {
    amiri: 'font-amiri',
    cairo: 'font-cairo',
    tajawal: 'font-tajawal',
    readex: 'font-readex',
  }[fontFamily];

  const widthClasses = {
    compact: 'max-w-2xl',
    normal: 'max-w-4xl',
    wide: 'max-w-6xl',
  }[contentWidth];

  const wordsCount = currentChapter ? calculateWordsCount(currentChapter.content) : 0;
  const readTime = calculateReadingTimeMinutes(wordsCount);
  const isCompleted = currentChapter ? isChapterCompleted(book.id, currentChapter.id) : false;

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} transition-colors duration-300 pb-28`} dir="rtl">
      {/* Top Fixed Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-black/20">
        <div
          className="h-full bg-gradient-to-r from-[#d4af37] to-[#f0cb69] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Restored Position Floating Notice */}
      {showRestoredNotice && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 rounded-full bg-emerald-600/95 text-white px-4 py-1.5 text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-1.5 transition-all border border-emerald-400/40">
          <Check className="h-3.5 w-3.5 text-white" />
          <span>تمت استعادة موضع القراءة السابق بنجاح ✓</span>
        </div>
      )}

      {/* Reader Sticky Header */}
      <header
        className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors px-4 sm:px-6 py-3 ${themeClasses.navBg}`}
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
          {/* Back & Novel Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenOverview || onBack}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors hover:opacity-80"
              title="العودة لصفحة تفاصيل الرواية"
            >
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline">تفاصيل الرواية</span>
            </button>

            <div className="border-r border-current/20 pr-3">
              <h2 className="text-xs sm:text-sm font-black font-cairo truncate max-w-[180px] sm:max-w-xs">
                {book.title}
              </h2>
              <span className="text-[11px] opacity-75 truncate block">
                {currentChapter?.title || 'الفصل'}
              </span>
            </div>
          </div>

          {/* Center: Fast Chapters Selector Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedChapterId}
              onChange={(e) => navigateToChapter(e.target.value)}
              className="rounded-xl border border-current/20 bg-transparent px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[220px] truncate"
              title="الانتقال السريع لأي فصل"
            >
              {book.chapters.map((ch) => (
                <option
                  key={ch.id}
                  value={ch.id}
                  className="bg-[#0b1329] text-white py-1"
                >
                  الفصل {ch.chapterNumber}: {ch.title}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Settings & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className="p-2 rounded-xl transition-colors hover:bg-black/10"
                title={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-[#d4af37]" />
                ) : (
                  <Bookmark className="h-4 w-4 opacity-75" />
                )}
              </button>
            )}

            <button
              onClick={handleShare}
              className="p-2 rounded-xl transition-colors hover:bg-black/10"
              title="مشاركة رابط الفصل"
            >
              {copiedShare ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4 opacity-75" />}
            </button>

            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold border border-current/20 transition-all ${
                isSettingsOpen ? 'bg-[#c59b27] text-[#070d1e] border-transparent' : 'hover:bg-black/10'
              }`}
              title="تخصيص الخط والخلفية للقراءة"
            >
              <Type className="h-3.5 w-3.5" />
              <span className="hidden md:inline">الخط والمظهر</span>
            </button>

            {isOwner && onOpenWriter && (
              <button
                onClick={() => onOpenWriter(book.id)}
                className="rounded-xl bg-[#c59b27]/20 border border-[#c59b27]/40 px-2.5 py-1.5 text-xs font-bold text-[#f0cb69] hover:bg-[#c59b27]/30 transition-colors"
                title="تعديل هذا الفصل في الاستوديو"
              >
                تعديل ✏️
              </button>
            )}
          </div>
        </div>

        {/* Reader Customization Settings Drawer */}
        {isSettingsOpen && (
          <div className="mx-auto max-w-4xl mt-3 pt-3 border-t border-current/15 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* 1. Theme Mode */}
            <div className="space-y-1.5">
              <span className="font-bold opacity-75 block">نمط الإضاءة والخلفية:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border ${
                    theme === 'dark' ? 'bg-[#c59b27] text-[#070d1e] border-[#c59b27]' : 'border-current/20'
                  }`}
                >
                  <Moon className="h-3 w-3" />
                  <span>داكن</span>
                </button>
                <button
                  onClick={() => setTheme('sepia')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border ${
                    theme === 'sepia' ? 'bg-[#8b5e28] text-white border-[#8b5e28]' : 'border-current/20'
                  }`}
                >
                  <Coffee className="h-3 w-3" />
                  <span>هادئ (Sepia)</span>
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border ${
                    theme === 'light' ? 'bg-slate-800 text-white border-slate-800' : 'border-current/20'
                  }`}
                >
                  <Sun className="h-3 w-3" />
                  <span>فاتح</span>
                </button>
                <button
                  onClick={() => setTheme('black')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border ${
                    theme === 'black' ? 'bg-white text-black border-white' : 'border-current/20'
                  }`}
                >
                  <span>AMOLED</span>
                </button>
              </div>
            </div>

            {/* 2. Font Size (A- / A+) */}
            <div className="space-y-1.5">
              <span className="font-bold opacity-75 block">حجم الخط ({fontSize}px):</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontSize((s) => Math.max(15, s - 1))}
                  className="rounded-lg border border-current/20 px-3 py-1 font-bold hover:bg-black/10"
                >
                  A -
                </button>
                <input
                  type="range"
                  min={15}
                  max={32}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full cursor-pointer accent-[#c59b27]"
                />
                <button
                  onClick={() => setFontSize((s) => Math.min(32, s + 1))}
                  className="rounded-lg border border-current/20 px-3 py-1 font-bold hover:bg-black/10"
                >
                  A +
                </button>
              </div>
            </div>

            {/* 3. Font Family */}
            <div className="space-y-1.5">
              <span className="font-bold opacity-75 block">نوع الخط العربي:</span>
              <div className="flex items-center gap-1">
                {(['amiri', 'cairo', 'tajawal', 'readex'] as const).map((font) => (
                  <button
                    key={font}
                    onClick={() => setFontFamily(font)}
                    className={`rounded-lg px-2 py-1 text-xs font-bold border capitalize ${
                      fontFamily === font ? 'bg-[#c59b27] text-[#070d1e] border-[#c59b27]' : 'border-current/20'
                    }`}
                  >
                    {font === 'amiri' ? 'أميري' : font === 'cairo' ? 'كايرو' : font === 'tajawal' ? 'تجوال' : 'ريدكس'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Chapter Reading Area */}
      <main className={`mx-auto ${widthClasses} px-5 sm:px-8 py-10 space-y-8`}>
        {/* Chapter Header Card */}
        <div className={`rounded-2xl p-6 sm:p-8 border ${themeClasses.cardBg} text-center space-y-3`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-current/20 px-3 py-1 text-xs font-bold">
            <span>{book.title}</span>
            <span>•</span>
            <span className={themeClasses.accent}>الفصل {currentChapter?.chapterNumber}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-cairo leading-snug">
            {currentChapter?.title}
          </h1>

          {currentChapter?.subtitle && (
            <p className="text-sm opacity-80 font-medium">
              {currentChapter.subtitle}
            </p>
          )}

          <div className="flex items-center justify-center gap-4 text-xs opacity-75 pt-2 border-t border-current/10">
            <span>{wordsCount} كلمة</span>
            <span>•</span>
            <span>~{readTime} دقائق قراءة</span>
            <span>•</span>
            <span>المؤلف: {book.author || 'Dr/ Islam Mohamed'}</span>
          </div>
        </div>

        {/* Chapter Body Content */}
        <article
          className={`space-y-6 ${fontClasses} leading-loose`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {currentChapter ? (
            currentChapter.content.map((paragraph, idx) => (
              <p
                key={idx}
                className="text-justify leading-[2.1] tracking-wide"
              >
                {paragraph}
              </p>
            ))
          ) : (
            <div className="text-center py-12 text-sm opacity-75">
              لا يتوفر محتوى لهذا الفصل حالياً.
            </div>
          )}
        </article>

        {/* Bottom Chapter Completion & Status */}
        <div className={`rounded-2xl p-5 border ${themeClasses.cardBg} flex flex-col sm:flex-row items-center justify-between gap-4 mt-12`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-5 w-5 ${isCompleted ? 'text-emerald-500' : 'opacity-40'}`} />
            <span className="text-xs font-bold">
              {isCompleted ? 'تم إكمال قراءة هذا الفصل' : 'انتهيت من القراءة؟'}
            </span>
          </div>

          <button
            onClick={handleToggleRead}
            className="rounded-xl border border-current/20 px-4 py-2 text-xs font-bold hover:bg-black/10 transition-colors"
          >
            {isCompleted ? 'تعليم كـ «غير مقروء»' : '✓ تعليم الفصل كـ «مكتمل»'}
          </button>
        </div>

        {/* BOTTOM NAVIGATION: PREVIOUS CHAPTER / INDEX / NEXT CHAPTER (مثل truthnovel.top تماماً) */}
        <div className="pt-6 border-t border-current/15">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Prev Chapter */}
            {prevChapter ? (
              <button
                onClick={() => navigateToChapter(prevChapter.id)}
                className={`flex items-center justify-between rounded-2xl border p-4 transition-all hover:scale-102 ${themeClasses.cardBg} hover:border-[#c59b27]`}
              >
                <div className="text-right">
                  <span className="text-[10px] opacity-75 block">« الفصل السابق</span>
                  <span className="text-xs font-bold truncate block max-w-[150px]">
                    الفصل {prevChapter.chapterNumber}: {prevChapter.title}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 opacity-75" />
              </button>
            ) : (
              <div className={`rounded-2xl border p-4 opacity-40 text-center text-xs font-bold ${themeClasses.cardBg}`}>
                بداية الرواية (لا يوجد فصل سابق)
              </div>
            )}

            {/* Chapters Index / Back to Overview */}
            <button
              onClick={onOpenOverview || onBack}
              className={`flex items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-black transition-all hover:scale-102 ${themeClasses.cardBg} hover:border-[#c59b27]`}
            >
              <BookOpen className="h-4 w-4" />
              <span>فهرس وتفاصيل العمل</span>
            </button>

            {/* Next Chapter */}
            {nextChapter ? (
              <button
                onClick={() => navigateToChapter(nextChapter.id)}
                className="flex items-center justify-between rounded-2xl bg-gradient-to-l from-[#d4af37] to-[#c59b27] p-4 text-[#070d1e] font-bold shadow-lg transition-all hover:scale-102"
              >
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <span className="text-[10px] opacity-90 block">الفصل التالي »</span>
                  <span className="text-xs font-black truncate block max-w-[150px]">
                    الفصل {nextChapter.chapterNumber}: {nextChapter.title}
                  </span>
                </div>
              </button>
            ) : (
              <div className={`rounded-2xl border p-4 opacity-75 text-center text-xs font-bold ${themeClasses.cardBg}`}>
                {book.status === 'completed'
                  ? 'تم الوصول لنهاية الرواية المكتملة ✓'
                  : 'أنت في أحدث فصل متوفر حالياً! ترقب الفصول القادمة.'}
              </div>
            )}
          </div>

          <p className="text-center text-[11px] opacity-60 mt-4">
            💡 يمكنك أيضاً استخدام الأسهم في لوحة المفاتيح: (السهم الأيمن للفصل التالي، والسهم الأيسر للسابق).
          </p>
        </div>
      </main>
    </div>
  );
};
