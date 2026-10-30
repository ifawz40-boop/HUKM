import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Eye,
  Clock,
  User,
  Share2,
  Bookmark,
  BookmarkCheck,
  Play,
  Film,
  Sparkles,
  Layers,
  ChevronLeft,
  Video,
  PenTool,
  Check,
} from 'lucide-react';
import { BookProject, BookChapter, CategoryItem } from '../types/hukm';
import { calculateBookStats, getCategoryName } from '../utils/hukmEngine';
import {
  getBookReadingProgress,
  recordChapterOpened,
  toggleChapterReadStatus,
} from '../utils/readingTracker';

interface BookOverviewViewProps {
  book: BookProject;
  categories: CategoryItem[];
  isOwner?: boolean;
  isBookmarked?: boolean;
  onBack: () => void;
  onSelectChapter: (chapterId: string) => void;
  onOpenWriter?: (bookId: string) => void;
  onToggleBookmark?: () => void;
  onShowToast: (msg: string) => void;
}

export const BookOverviewView: React.FC<BookOverviewViewProps> = ({
  book,
  categories,
  isOwner = false,
  isBookmarked = false,
  onBack,
  onSelectChapter,
  onOpenWriter,
  onToggleBookmark,
  onShowToast,
}) => {
  const [progress, setProgress] = useState(() => getBookReadingProgress(book.id));
  const [copiedShare, setCopiedShare] = useState(false);

  const stats = calculateBookStats(book.chapters, book.viewsCount);
  const categoryLabel = getCategoryName(categories, book.category);
  const authorName = book.author || 'إبراهيم فوزي';

  const completedCount = progress.completedChapterIds.length;
  const totalChapters = book.chapters.length;
  const percentCompleted = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  // Determine last read chapter or first chapter
  const lastReadChapter =
    book.chapters.find((c) => c.id === progress.lastChapterId) ||
    book.chapters.find((c) => progress.completedChapterIds.includes(c.id)) ||
    book.chapters[0];

  const handleStartOrResumeReading = () => {
    const targetChapter = lastReadChapter || book.chapters[0];
    if (targetChapter) {
      recordChapterOpened(book.id, targetChapter.id);
      onSelectChapter(targetChapter.id);
    }
  };

  const handleToggleChapterStatus = (e: React.MouseEvent, chapterId: string) => {
    e.stopPropagation();
    const updated = toggleChapterReadStatus(book.id, chapterId);
    setProgress(updated);
    const isNowRead = updated.completedChapterIds.includes(chapterId);
    onShowToast(isNowRead ? 'تم تعليم الفصل كـ «مقروء» ✓' : 'تمت إزالة علامة القراءة عن الفصل.');
  };

  const handleChapterClick = (chapterId: string) => {
    recordChapterOpened(book.id, chapterId);
    setProgress(getBookReadingProgress(book.id));
    onSelectChapter(chapterId);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    onShowToast('تم نسخ رابط الكتاب للمشاركة!');
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#070d1e] text-[#f4efe6] pb-20" dir="rtl">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#c59b27]/25 bg-[#070d1e]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl bg-[#0a1226] border border-white/10 hover:border-[#c59b27]/40 px-3 py-1.5 text-xs font-bold text-[#cbd5e1] hover:text-white transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للمكتبة الرئيسية</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-xl bg-[#0a1226] border border-white/10 hover:border-[#c59b27]/40 px-3 py-1.5 text-xs font-semibold text-[#cbd5e1] hover:text-white transition-colors"
              title="مشاركة الكتاب"
            >
              <Share2 className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="hidden sm:inline">{copiedShare ? 'تم النسخ!' : 'مشاركة'}</span>
            </button>

            {/* Bookmark */}
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                  isBookmarked
                    ? 'bg-[#c59b27] text-[#070d1e] border-[#c59b27]'
                    : 'bg-[#0a1226] border-white/10 text-[#cbd5e1] hover:text-white'
                }`}
              >
                {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                <span>{isBookmarked ? 'محفوظ في مكتبتك' : 'حفظ'}</span>
              </button>
            )}

            {/* Owner ONLY: Edit in Studio */}
            {isOwner && onOpenWriter && (
              <button
                onClick={() => onOpenWriter(book.id)}
                className="flex items-center gap-1.5 rounded-xl bg-[#c59b27]/20 border border-[#c59b27]/40 px-3 py-1.5 text-xs font-bold text-[#f0cb69] hover:bg-[#c59b27] hover:text-[#070d1e] transition-colors"
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>تعديل في الاستوديو</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 space-y-10">
        {/* Book Identity Showcase Card */}
        <section className="relative overflow-hidden rounded-3xl border border-[#c59b27]/35 bg-gradient-to-b from-[#0a142c] via-[#091124] to-[#070d1e] p-6 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Book Cover Visual (4 Cols) */}
            <div className="md:col-span-5 flex justify-center">
              <div className="relative aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-[#c59b27]/50 shadow-2xl shadow-black/90 group">
                {book.coverMediaType === 'video' || book.coverImage.endsWith('.mp4') ? (
                  <video
                    src={book.coverImage}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

                {/* Top badges */}
                <div className="absolute top-3 right-3">
                  <span className="rounded-lg bg-[#070d1e]/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-[#f0cb69] border border-[#c59b27]/30">
                    {categoryLabel}
                  </span>
                </div>

                <div className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold text-[#f0cb69] border border-white/10">
                  <Eye className="h-3 w-3 text-[#d4af37]" />
                  <span>{stats.totalViews.toLocaleString('ar-EG')}</span>
                </div>

                {/* Bottom Cover Author Label */}
                <div className="absolute bottom-3 right-3 left-3 text-center">
                  <div className="rounded-xl bg-black/80 backdrop-blur-md border border-[#c59b27]/30 py-1.5 px-3">
                    <span className="text-[10px] text-[#94a3b8] block">المؤلف والباحث:</span>
                    <span className="text-xs font-bold text-[#f0cb69]">{authorName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Book Information & Metadata (7 Cols) */}
            <div className="md:col-span-7 space-y-5 text-right">
              {/* Category & Verified seal */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c59b27]/15 border border-[#c59b27]/30 px-3 py-1 text-xs font-bold text-[#f0cb69]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>سلسلة حُكم التوثيقية</span>
                </span>
                <span className="text-xs text-[#94a3b8]">قسم: {categoryLabel}</span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h1 className="text-2xl sm:text-4xl font-black text-white font-cairo leading-snug">
                  {book.title}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-[#d4af37] font-medium leading-relaxed">
                  {book.subtitle}
                </p>
              </div>

              {/* Prominent Author Badge */}
              <div className="inline-flex items-center gap-2 rounded-xl bg-[#070d1e] border border-[#c59b27]/30 px-4 py-2 text-xs font-bold text-[#f4efe6]">
                <User className="h-4 w-4 text-[#d4af37]" />
                <span>الكاتب والباحث:</span>
                <span className="text-[#f0cb69] font-black">{authorName}</span>
              </div>

              {/* Summary */}
              <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed">
                {book.summary}
              </p>

              {/* Motto */}
              {book.motto && (
                <div className="border-r-2 border-[#c59b27] pr-3 py-1">
                  <p className="text-xs sm:text-sm text-[#f0cb69] font-amiri font-bold italic">
                    «{book.motto}»
                  </p>
                </div>
              )}

              {/* Standalone Episode Card if present */}
              {book.standaloneEpisode?.hasStandaloneEpisode && (
                <div className="rounded-2xl bg-[#070d1e] border border-rose-500/40 p-3.5 flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/40">
                      <Film className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="rounded bg-rose-600 text-white px-1.5 py-0.5 text-[9px] font-bold block w-fit mb-0.5">
                        {book.standaloneEpisode.badgeLabel || 'حلقة مفرقة 🎬'}
                      </span>
                      <h4 className="text-xs font-bold text-white font-cairo">
                        {book.standaloneEpisode.title || book.title}
                      </h4>
                    </div>
                  </div>

                  {book.standaloneEpisode.videoUrl && (
                    <a
                      href={book.standaloneEpisode.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-bold text-white shrink-0 shadow transition-colors"
                    >
                      مشاهدة الحلقة ▶️
                    </a>
                  )}
                </div>
              )}

              {/* Reading Progress Bar & Action CTA */}
              <div className="pt-2 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                    <span>تقدمك في القراءة:</span>
                    <span className="text-[#f0cb69] font-bold">
                      {completedCount} من {totalChapters} فصول مقروءة ({percentCompleted}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#070d1e] overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-[#c59b27] to-[#f0cb69] rounded-full transition-all duration-500"
                      style={{ width: `${percentCompleted}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    onClick={handleStartOrResumeReading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#c59b27] to-[#997314] hover:from-[#f0cb69] hover:to-[#b88c1b] py-3.5 px-6 text-sm font-black text-[#070d1e] shadow-xl shadow-[#c59b27]/25 transition-transform hover:scale-102 active:scale-98 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>
                      {progress.lastChapterId
                        ? `استئناف القراءة: فصل ${lastReadChapter?.chapterNumber || 1}`
                        : 'بدء قراءة الكتاب الآن 📖'}
                    </span>
                  </button>

                  {progress.lastChapterId && (
                    <button
                      onClick={() => {
                        if (book.chapters[0]) {
                          recordChapterOpened(book.id, book.chapters[0].id);
                          onSelectChapter(book.chapters[0].id);
                        }
                      }}
                      className="rounded-2xl bg-[#0a1226] hover:bg-[#132247] border border-white/10 px-4 py-3 text-xs font-semibold text-[#cbd5e1] hover:text-white transition-colors"
                    >
                      بدء من الفصل الأول
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chapters Index & Selection Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#d4af37]" />
                <h2 className="text-xl font-bold text-white font-cairo">
                  فهرس الفصول المتاحة للقراءة
                </h2>
              </div>
              <p className="text-xs text-[#94a3b8] mt-1">
                اختر الفصل الذي تود قراءته، أو حدد الفصول التي أتممتها يدوياً لتتبع تقدمك.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-xl bg-[#0a1226] border border-white/10 px-3 py-1.5 font-bold text-[#cbd5e1]">
                📚 {totalChapters} فصول
              </span>
              <span className="rounded-xl bg-[#0a1226] border border-white/10 px-3 py-1.5 font-bold text-[#f0cb69]">
                ⏱️ إجمالي ~ {stats.totalReadingTimeMinutes} دقيقة
              </span>
            </div>
          </div>

          {/* Chapters List Cards */}
          <div className="space-y-3">
            {book.chapters.map((ch, idx) => {
              const isRead = progress.completedChapterIds.includes(ch.id);
              const isLastRead = progress.lastChapterId === ch.id;

              return (
                <div
                  key={ch.id}
                  onClick={() => handleChapterClick(ch.id)}
                  className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer ${
                    isLastRead
                      ? 'bg-[#0f1d3d] border-[#c59b27] shadow-lg shadow-black/50 ring-1 ring-[#c59b27]/40'
                      : isRead
                      ? 'bg-[#0a1226]/80 border-emerald-500/30 hover:border-emerald-500/60'
                      : 'bg-[#0a1226] border-white/10 hover:border-[#c59b27]/50 hover:bg-[#0e1935]'
                  }`}
                >
                  {/* Left (RTL Right): Chapter info */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black text-sm transition-colors ${
                        isRead
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isLastRead
                          ? 'bg-[#c59b27] text-[#070d1e] shadow'
                          : 'bg-[#070d1e] text-[#f0cb69] border border-[#c59b27]/30'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#d4af37]">
                          الفصل {ch.chapterNumber}
                        </span>
                        {isLastRead && (
                          <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-black">
                            آخر موضع قراءة 📌
                          </span>
                        )}
                        {isRead && (
                          <span className="rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            مقروء
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[#f0cb69] transition-colors font-cairo">
                        {ch.title}
                      </h3>

                      {ch.subtitle && (
                        <p className="text-xs text-[#94a3b8] line-clamp-1">
                          {ch.subtitle}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-[#64748b] pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#d4af37]" />
                          ~ {ch.readingTimeMinutes || 3} دقائق قراءة
                        </span>
                        <span>·</span>
                        <span>{ch.wordCount || 100} كلمة</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-[#cbd5e1]">
                          <Eye className="h-3 w-3 text-[#d4af37]" />
                          {(ch.viewsCount !== undefined ? ch.viewsCount : 1500).toLocaleString('ar-EG')} مشاهدة
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Manual Mark Read Button + Read Button */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Manual Read status toggle button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleChapterStatus(e, ch.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        isRead
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/50'
                          : 'bg-[#070d1e] text-[#94a3b8] border border-white/10 hover:text-white hover:border-[#c59b27]/40'
                      }`}
                      title={isRead ? 'إلغاء علامة القراءة' : 'تحديد هذا الفصل كمقروء'}
                    >
                      {isRead ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>مقروء (إلغاء)</span>
                        </>
                      ) : (
                        <>
                          <Circle className="h-3.5 w-3.5 text-[#64748b]" />
                          <span>تحديد كمقروء</span>
                        </>
                      )}
                    </button>

                    {/* Open chapter button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChapterClick(ch.id);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] px-3.5 py-2 text-xs font-black text-[#070d1e] shadow transition-transform hover:scale-102"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>اقرأ الآن</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
