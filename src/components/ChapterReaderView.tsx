import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Sliders,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ThumbsUp,
  MessageSquare,
  Clock,
  Type,
  Share2,
  CheckCircle,
  Play,
  Pause,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { Novel, Chapter, ReadingSettings, Comment } from '../types/novel';
import {
  calculateReadingTimeMinutes,
  getNextAndPrevChapter,
  formatArabicNumber,
} from '../utils/readingEngine';

interface ChapterReaderViewProps {
  novel: Novel;
  chapter: Chapter;
  allChapters: Chapter[];
  onSelectChapter: (chapterNumber: number) => void;
  onBackToNovel: () => void;
  comments: Comment[];
  onAddComment: (comment: { content: string; isSpoiler: boolean }) => void;
  onLikeComment: (commentId: string) => void;
  onRecordProgress: (chapterNumber: number, chapterId: string) => void;
}

export const ChapterReaderView: React.FC<ChapterReaderViewProps> = ({
  novel,
  chapter,
  allChapters,
  onSelectChapter,
  onBackToNovel,
  comments,
  onAddComment,
  onLikeComment,
  onRecordProgress,
}) => {
  // Reading settings state (persisted in localStorage)
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    try {
      const saved = localStorage.getItem('truthnovel_reader_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      theme: 'dark',
      fontFamily: 'cairo',
      fontSize: 19,
      lineHeight: 1.9,
      maxWidth: 'medium',
      textAlign: 'right',
      autoScrollSpeed: 0,
    };
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chapterSelectorOpen, setChapterSelectorOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [chapterLiked, setChapterLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(chapter.likes || 120);

  // Auto-scroll state
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Comments inside chapter
  const [newCommentText, setNewCommentText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  // Save settings when changed
  useEffect(() => {
    try {
      localStorage.setItem('truthnovel_reader_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Record reading progress on mount or chapter change
  useEffect(() => {
    onRecordProgress(chapter.chapterNumber, chapter.id);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setChapterLiked(false);
    setLikesCount(chapter.likes || 120);
  }, [chapter.id]);

  // Scroll listener for reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const current = window.scrollY;
        const pct = Math.min(100, Math.max(0, Math.round((current / totalHeight) * 100)));
        setReadingProgress(pct);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll loop
  useEffect(() => {
    if (isAutoScrolling && settings.autoScrollSpeed > 0) {
      autoScrollIntervalRef.current = setInterval(() => {
        window.scrollBy({ top: settings.autoScrollSpeed, behavior: 'smooth' });
      }, 50);
    } else {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    }
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [isAutoScrolling, settings.autoScrollSpeed]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Navigations
  const chaptersList = allChapters.map((c) => ({
    chapterNumber: c.chapterNumber,
    id: c.id,
    title: c.title,
  }));
  const { prev, next } = getNextAndPrevChapter(chapter.chapterNumber, chaptersList);

  const readingTime = calculateReadingTimeMinutes(chapter.wordCount || 1500);

  // Theme container classes
  const themeClasses = {
    dark: 'bg-[#141210] text-[#e5ded3]',
    amoled: 'bg-[#000000] text-[#d6d6d6]',
    sepia: 'bg-[#f4ebd9] text-[#2c2217]',
    light: 'bg-[#faf8f5] text-[#1c1917]',
  }[settings.theme];

  const themeNavClasses = {
    dark: 'bg-[#1a1714]/95 border-amber-900/30 text-white',
    amoled: 'bg-black/95 border-neutral-800 text-white',
    sepia: 'bg-[#eaddc5]/95 border-[#c8b79b] text-[#2c2217]',
    light: 'bg-white/95 border-neutral-200 text-neutral-900',
  }[settings.theme];

  // Font family class
  const fontClass = {
    cairo: 'font-cairo',
    amiri: 'font-amiri',
    readex: 'font-readex',
    tajawal: 'font-tajawal',
  }[settings.fontFamily];

  // Max width class
  const widthClass = {
    tight: 'max-w-2xl',
    medium: 'max-w-3xl',
    wide: 'max-w-5xl',
  }[settings.maxWidth];

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment({ content: newCommentText.trim(), isSpoiler });
    setNewCommentText('');
    setIsSpoiler(false);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${themeClasses}`} dir="rtl">
      {/* Top Sticky Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${themeNavClasses}`}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* Back & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBackToNovel}
              className="flex items-center gap-1.5 rounded-lg p-1.5 hover:bg-black/10 transition-colors"
              aria-label="الرجوع لصفحة الرواية"
            >
              <ArrowRight className="h-5 w-5" />
              <span className="hidden sm:inline text-xs font-semibold">فهرس الرواية</span>
            </button>

            <div className="min-w-0">
              <span className="block text-xs opacity-70 truncate">{novel.title}</span>
              <button
                onClick={() => setChapterSelectorOpen(true)}
                className="flex items-center gap-1 text-sm font-bold hover:text-amber-500 transition-colors truncate"
              >
                <span>فصل {chapter.chapterNumber}</span>
                <span className="opacity-40 text-xs">▼</span>
              </button>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Auto scroll toggle */}
            <button
              onClick={() => {
                if (settings.autoScrollSpeed === 0) {
                  setSettings((s) => ({ ...s, autoScrollSpeed: 2 }));
                  setIsAutoScrolling(true);
                } else {
                  setIsAutoScrolling(!isAutoScrolling);
                }
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isAutoScrolling
                  ? 'bg-amber-600 text-white font-bold'
                  : 'hover:bg-black/10'
              }`}
              title="التمرير التلقائي السلس"
            >
              {isAutoScrolling ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span className="hidden md:inline">تمرير تلقائي</span>
            </button>

            {/* Reading Settings Drawer Toggle */}
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`rounded-lg p-2 transition-colors ${
                settingsOpen ? 'bg-amber-600 text-white' : 'hover:bg-black/10'
              }`}
              aria-label="إعدادات القراءة والخط"
            >
              <Sliders className="h-4 w-4" />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="rounded-lg p-2 hover:bg-black/10 transition-colors"
              aria-label="ملء الشاشة"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Reading Progress Bar Indicator */}
        <div className="h-1 w-full bg-black/10">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-150"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      </header>

      {/* Settings Drawer / Panel */}
      {settingsOpen && (
        <div className="border-b border-amber-900/20 bg-[#1e1a16] text-[#e5ded3] px-4 py-5 shadow-xl transition-all">
          <div className="mx-auto max-w-3xl space-y-5">
            {/* Theme switcher */}
            <div>
              <label className="block text-xs font-bold text-amber-400 mb-2">سمة القراءة (اللون)</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'dark', label: 'داكن مريح', bg: '#1c1815', text: '#e5ded3' },
                  { id: 'sepia', label: 'سيبيا كلاسيكي', bg: '#f4ebd9', text: '#2c2217' },
                  { id: 'amoled', label: 'أسود مطلق', bg: '#000000', text: '#d6d6d6' },
                  { id: 'light', label: 'فاتح ناصع', bg: '#faf8f5', text: '#1c1917' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSettings({ ...settings, theme: t.id as any })}
                    style={{ backgroundColor: t.bg, color: t.text }}
                    className={`flex items-center justify-center rounded-xl p-2.5 text-xs font-bold border transition-all ${
                      settings.theme === t.id
                        ? 'border-amber-500 ring-2 ring-amber-500/50 scale-102'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-xs font-bold text-amber-400 mb-2">نوع الخط العربي</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cairo', label: 'خط القاهرة', font: 'font-cairo' },
                  { id: 'amiri', label: 'خط النسخ (أميري)', font: 'font-amiri' },
                  { id: 'readex', label: 'ريدكس برو', font: 'font-readex' },
                  { id: 'tajawal', label: 'خط تجوال', font: 'font-tajawal' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSettings({ ...settings, fontFamily: f.id as any })}
                    className={`rounded-xl border p-2 text-sm transition-all ${f.font} ${
                      settings.fontFamily === f.id
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold'
                        : 'border-white/10 bg-[#25201a] text-[#c7bfb3] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size & Line Spacing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1.5">
                  <span>حجم الخط: {settings.fontSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSettings((s) => ({ ...s, fontSize: Math.max(14, s.fontSize - 1) }))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25201a] border border-white/10 hover:bg-amber-600 font-bold"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={15}
                    max={32}
                    value={settings.fontSize}
                    onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <button
                    onClick={() => setSettings((s) => ({ ...s, fontSize: Math.min(34, s.fontSize + 1) }))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25201a] border border-white/10 hover:bg-amber-600 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1.5">
                  تباعد الأسطر: {settings.lineHeight}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'متقارب', value: 1.6 },
                    { label: 'قياسي', value: 1.9 },
                    { label: 'واسع', value: 2.3 },
                  ].map((lh) => (
                    <button
                      key={lh.label}
                      onClick={() => setSettings({ ...settings, lineHeight: lh.value })}
                      className={`rounded-lg border p-1.5 text-xs font-semibold ${
                        settings.lineHeight === lh.value
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-white/10 bg-[#25201a]'
                      }`}
                    >
                      {lh.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reading Container Width & Auto scroll speed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-white/5">
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1.5">عرض صفحة القراءة</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'tight', label: 'ضيق (مركّز)' },
                    { id: 'medium', label: 'متوسط (مثالي)' },
                    { id: 'wide', label: 'عريض (شامل)' },
                  ].map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setSettings({ ...settings, maxWidth: w.id as any })}
                      className={`rounded-lg border p-1.5 text-xs font-semibold ${
                        settings.maxWidth === w.id
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-white/10 bg-[#25201a]'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1.5">
                  <span>سرعة التمرير التلقائي: {settings.autoScrollSpeed}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  value={settings.autoScrollSpeed}
                  onChange={(e) => {
                    const speed = Number(e.target.value);
                    setSettings({ ...settings, autoScrollSpeed: speed });
                    setIsAutoScrolling(speed > 0);
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Selection Modal */}
      {chapterSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-amber-900/40 bg-[#1e1a16] p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-lg font-cairo">فهرس فصول الرواية</h3>
              <button
                onClick={() => setChapterSelectorOpen(false)}
                className="rounded-lg p-1 text-[#a89f91] hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
              {allChapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    onSelectChapter(ch.chapterNumber);
                    setChapterSelectorOpen(false);
                  }}
                  className={`flex w-full items-center justify-between py-2.5 px-3 text-right text-sm transition-colors rounded-lg ${
                    ch.chapterNumber === chapter.chapterNumber
                      ? 'bg-amber-600/20 text-amber-400 font-bold'
                      : 'hover:bg-white/5 text-[#d6cec2]'
                  }`}
                >
                  <span className="truncate">{ch.title}</span>
                  <span className="text-xs opacity-50 shrink-0">فصل {ch.chapterNumber}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Chapter Content Container */}
      <main className={`mx-auto ${widthClass} px-5 sm:px-8 py-8 sm:py-12`}>
        {/* Chapter Header */}
        <div className="border-b border-amber-900/20 pb-6 text-center space-y-3">
          <span className="inline-block rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-500 border border-amber-500/20">
            {novel.title}
          </span>
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-black leading-snug ${fontClass}`}>
            {chapter.title}
          </h1>

          <div className="flex items-center justify-center gap-4 text-xs opacity-75 pt-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              قراءة ~ {readingTime} دقائق
            </span>
            <span>·</span>
            <span>{chapter.wordCount} كلمة</span>
            <span>·</span>
            <span>المترجم: {novel.translator}</span>
          </div>
        </div>

        {/* Story Text Paragraphs */}
        <article
          className={`mt-8 space-y-6 ${fontClass}`}
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            textAlign: settings.textAlign,
          }}
        >
          {chapter.content.map((paragraph, index) => {
            // Check for mystical or system speech (indicated by quotes or brackets)
            const isCallout =
              paragraph.startsWith('«') ||
              paragraph.startsWith('(') ||
              paragraph.includes('مسار') ||
              paragraph.includes('التسلسل');

            return (
              <p
                key={index}
                className={`transition-colors ${
                  isCallout
                    ? 'rounded-xl border-r-4 border-amber-500 bg-amber-500/5 p-4 font-semibold text-amber-300/90'
                    : ''
                }`}
              >
                {paragraph}
              </p>
            );
          })}
        </article>

        {/* End of Chapter Feedback Card */}
        <div className="mt-14 rounded-2xl border border-amber-900/30 bg-[#201c18]/80 p-6 sm:p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
            <CheckCircle className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-xl font-bold font-cairo text-white">
              أحسنت! أتممت قراءة الفصل {chapter.chapterNumber}
            </h3>
            <p className="text-sm text-[#a89f91] mt-1">
              شارك برأيك في أحداث هذا الفصل وادعم المترجم بالإعجاب!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (!chapterLiked) {
                  setChapterLiked(true);
                  setLikesCount(likesCount + 1);
                } else {
                  setChapterLiked(false);
                  setLikesCount(likesCount - 1);
                }
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                chapterLiked
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-[#2b251f] text-[#c7bfb3] hover:text-white border border-white/5'
              }`}
            >
              <ThumbsUp className={`h-4 w-4 ${chapterLiked ? 'fill-current' : ''}`} />
              <span>أعجبني ({likesCount})</span>
            </button>

            {next && (
              <button
                onClick={() => onSelectChapter(next.chapterNumber)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-6 py-2.5 text-sm font-bold text-[#141210] shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <span>الانتقال للفصل التالي ({next.chapterNumber})</span>
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Chapter Navigation Bar */}
        <div className="mt-8 flex items-center justify-between gap-3 border-y border-amber-900/20 py-4">
          {prev ? (
            <button
              onClick={() => onSelectChapter(prev.chapterNumber)}
              className="flex items-center gap-2 rounded-xl bg-[#26201a] hover:bg-amber-600 hover:text-[#141210] px-4 py-2.5 text-sm font-semibold transition-all"
            >
              <ChevronRight className="h-4 w-4" />
              <span>الفصل السابق ({prev.chapterNumber})</span>
            </button>
          ) : (
            <div className="text-xs text-stone-500">بداية الرواية</div>
          )}

          <button
            onClick={() => setChapterSelectorOpen(true)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-400 hover:underline"
          >
            <BookOpen className="h-4 w-4" />
            <span>قائمة الفصول</span>
          </button>

          {next ? (
            <button
              onClick={() => onSelectChapter(next.chapterNumber)}
              className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 text-sm transition-all shadow-md"
            >
              <span>الفصل التالي ({next.chapterNumber})</span>
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="text-xs text-amber-500 font-semibold">أحدث فصل متاح حالياً!</div>
          )}
        </div>

        {/* Chapter Discussions / Comments Section */}
        <section className="mt-12 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-400" />
              <h2 className="text-xl font-bold font-cairo text-white">
                نقاشات القرّاء حول الفصل ({comments.length})
              </h2>
            </div>
          </div>

          {/* New Comment Input */}
          <form onSubmit={handleCommentSubmit} className="rounded-2xl bg-[#1e1a16] p-4 border border-amber-900/30 space-y-3">
            <textarea
              rows={3}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="اكتب تعليقك أو نظريتك حول أحداث هذا الفصل..."
              className="w-full rounded-xl bg-[#141210] p-3 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-[#a89f91] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSpoiler}
                  onChange={(e) => setIsSpoiler(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  يحتوي على حرق للأحداث (Spoiler)
                </span>
              </label>

              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="rounded-xl bg-amber-600 disabled:opacity-40 hover:bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow transition-all"
              >
                نشر التعليق
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-3">
            {comments.map((comm) => {
              const isHidden = comm.isSpoiler && !revealedSpoilers[comm.id];

              return (
                <div
                  key={comm.id}
                  className="rounded-xl border border-white/5 bg-[#1b1714] p-4 text-right space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={comm.avatar}
                        alt={comm.authorName}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-amber-500/30"
                      />
                      <div>
                        <span className="text-xs font-bold text-white">{comm.authorName}</span>
                        <p className="text-[10px] text-[#7d7365]">قارئ معتمد</p>
                      </div>
                    </div>

                    <button
                      onClick={() => onLikeComment(comm.id)}
                      className="flex items-center gap-1 text-xs text-[#9c9182] hover:text-amber-400 transition-colors"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      <span>{comm.likes}</span>
                    </button>
                  </div>

                  {isHidden ? (
                    <div className="rounded-lg bg-black/40 p-3 text-center border border-amber-500/20">
                      <p className="text-xs text-amber-400">⚠️ هذا التعليق يحتوي على حرق للأحداث</p>
                      <button
                        onClick={() =>
                          setRevealedSpoilers((prev) => ({ ...prev, [comm.id]: true }))
                        }
                        className="mt-1.5 text-xs font-bold text-white underline hover:text-amber-300"
                      >
                        إظهار المحتوى على مسؤوليتي
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-[#d6cec2] leading-relaxed">{comm.content}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
