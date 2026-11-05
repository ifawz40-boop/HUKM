import React, { useState, useEffect } from 'react';
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
  Layers,
  ChevronLeft,
  PenTool,
  Check,
  Search,
  ArrowUpDown,
  Sparkles,
  FileText,
  Quote,
  ExternalLink,
} from 'lucide-react';
import { BookProject, BookChapter, CategoryItem } from '../types/hukm';
import { calculateBookStats, getCategoryName } from '../utils/hukmEngine';
import { UserProfile } from '../types/auth';
import {
  getBookReadingProgress,
  recordChapterOpened,
  toggleChapterReadStatus,
  getChapterScrollPosition,
} from '../utils/readingTracker';
import { saveReadingProgressToFirestore } from '../firebase/firestoreService';

interface BookOverviewViewProps {
  book: BookProject;
  categories: CategoryItem[];
  currentUser?: UserProfile | null;
  isOwner?: boolean;
  isBookmarked?: boolean;
  onBack: () => void;
  onSelectChapter: (chapterId: string) => void;
  onOpenWriter?: (bookId: string) => void;
  onToggleBookmark?: () => void;
  onShowToast: (msg: string) => void;
}

type ResearchRecord = Record<string, unknown>;

const isResearchRecord = (value: unknown): value is ResearchRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const researchText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

const safeResearchUrl = (value: unknown): string => {
  const raw = researchText(value);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? raw : '';
  } catch {
    return '';
  }
};

export const BookOverviewView: React.FC<BookOverviewViewProps> = ({
  book,
  categories,
  currentUser = null,
  isOwner = false,
  isBookmarked = false,
  onBack,
  onSelectChapter,
  onOpenWriter,
  onToggleBookmark,
  onShowToast,
}) => {
  const [progress, setProgress] = useState(() => getBookReadingProgress(book.id, currentUser?.id));
  const [copiedShare, setCopiedShare] = useState(false);
  const [chapterSearch, setChapterSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Keep progress in sync if user changes
  useEffect(() => {
    setProgress(getBookReadingProgress(book.id, currentUser?.id));
  }, [book.id, currentUser?.id]);

  const stats = calculateBookStats(book.chapters, book.viewsCount);
  const categoryLabel = getCategoryName(categories, book.category);
  const publicSources = Array.isArray(book.sources)
    ? book.sources.filter((item) => isResearchRecord(item) && item.managedBy === 'hukm-research-panel' && item.visibility === 'public')
    : [];
  const publicQuotes = Array.isArray(book.quotes)
    ? book.quotes.filter((item) => isResearchRecord(item) && item.managedBy === 'hukm-research-panel' && item.visibility === 'public')
    : [];
  const authorName = book.author || 'حُكم | HUKM MEDIA';

  const completedCount = progress.completedChapterIds.length;
  const totalChapters = book.chapters.length;
  const percentCompleted = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  // Determine resume chapter
  const hasHistory = progress.lastChapterId && book.chapters.some((c) => c.id === progress.lastChapterId);
  const resumeChapter = hasHistory
    ? book.chapters.find((c) => c.id === progress.lastChapterId)
    : book.chapters[0];

  const handleStartReading = () => {
    if (book.chapters.length > 0) {
      recordChapterOpened(book.id, book.chapters[0].id, currentUser?.id);
      onSelectChapter(book.chapters[0].id);
    } else {
      onShowToast('لم تتم إضافة فصول بعد لهذه الرواية.');
    }
  };

  const handleResumeReading = () => {
    if (resumeChapter) {
      recordChapterOpened(book.id, resumeChapter.id, currentUser?.id);
      onSelectChapter(resumeChapter.id);
    } else {
      handleStartReading();
    }
  };

  const handleChapterClick = (chapterId: string) => {
    recordChapterOpened(book.id, chapterId, currentUser?.id);
    setProgress(getBookReadingProgress(book.id, currentUser?.id));
    onSelectChapter(chapterId);
  };

  const handleToggleChapterStatus = async (e: React.MouseEvent, chapterId: string) => {
    e.stopPropagation();
    const updated = toggleChapterReadStatus(book.id, chapterId, currentUser?.id);
    setProgress(updated);
    const isNowRead = updated.completedChapterIds.includes(chapterId);

    if (currentUser?.id) {
      const saved = await saveReadingProgressToFirestore({
        id: '',
        userId: currentUser.id,
        bookId: book.id,
        chapterId,
        chapterIndex: Math.max(0, book.chapters.findIndex((chapter) => chapter.id === chapterId)),
        scrollPercent: getChapterScrollPosition(book.id, chapterId, currentUser.id),
        lastReadAt: new Date().toISOString(),
        completed: isNowRead,
      });
      onShowToast(saved
        ? (isNowRead ? 'تم تعليم الفصل كمقروء ومزامنته مع حسابك ✓' : 'تم إلغاء علامة القراءة ومزامنتها مع حسابك.')
        : 'تم تحديث الحالة على هذا الجهاز، لكن تعذرت مزامنتها سحابياً.');
      return;
    }

    onShowToast(isNowRead ? 'تم تعليم الفصل كـ «مقروء» ✓' : 'تمت إزالة علامة القراءة عن الفصل.');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    onShowToast('تم نسخ رابط الرواية بنجاح!');
    setTimeout(() => setCopiedShare(false), 2000);
  };

  // Filter & Sort Chapters
  let displayChapters = [...book.chapters];
  if (chapterSearch.trim()) {
    const q = chapterSearch.trim().toLowerCase();
    displayChapters = displayChapters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.chapterNumber.toString().includes(q)
    );
  }

  displayChapters.sort((a, b) => {
    return sortOrder === 'asc'
      ? a.chapterNumber - b.chapterNumber
      : b.chapterNumber - a.chapterNumber;
  });

  return (
    <div className="min-h-screen bg-[#070d1e] text-[#f4efe6] pb-24" dir="rtl">
      {/* Top Navigation Bar */}
      <div className="border-b border-white/10 bg-[#0a1226]/80 backdrop-blur-md sticky top-20 z-30 px-4 sm:px-8 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة لكافة الأعمال</span>
          </button>

          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors"
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 text-[#d4af37]" />
                    <span className="text-[#f0cb69]">في المفضلة</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4" />
                    <span>حفظ في المفضلة</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors"
            >
              {copiedShare ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
              <span>مشاركة</span>
            </button>

            {isOwner && onOpenWriter && (
              <button
                onClick={() => onOpenWriter(book.id)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-3.5 py-1.5 text-xs font-bold text-[#070d1e] shadow hover:scale-102 transition-all cursor-pointer"
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>استوديو التحرير ✏️</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Novel Hero Card (like truthnovel.top) */}
        <div className="relative overflow-hidden rounded-3xl border border-[#c59b27]/30 bg-gradient-to-br from-[#0a142c] via-[#091124] to-[#050a16] p-6 sm:p-10 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Book Poster Cover */}
            <div className="relative h-64 sm:h-80 w-48 sm:w-60 shrink-0 overflow-hidden rounded-2xl border-2 border-[#c59b27]/40 shadow-2xl bg-[#050a16]">
              {book.coverImage ? (
                <img src={book.coverImage} alt={book.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-gradient-to-br from-[#1b2b49] via-[#0b152b] to-[#3b2b13] p-5 text-center">
                  <BookOpen className="h-14 w-14 text-[#d4af37]" />
                  <span className="text-xl font-black leading-relaxed text-[#f4e6c3]">{book.title}</span>
                  <span className="text-[10px] font-bold tracking-widest text-[#d4af37]">حُكم • مكتبة التراث</span>
                </div>
              )}
              <span
                className={`absolute top-2.5 right-2.5 rounded-lg px-2.5 py-1 text-[11px] font-black shadow-md ${
                  book.status === 'completed'
                    ? 'bg-amber-500 text-[#070d1e]'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {book.status === 'completed' ? 'رواية مكتملة ✓' : 'رواية مستمرة ⚡'}
              </span>
            </div>

            {/* Book Details */}
            <div className="flex-1 space-y-4 text-center md:text-right">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="rounded-full bg-[#c59b27]/20 border border-[#c59b27]/40 px-3 py-1 text-xs font-bold text-[#f0cb69]">
                  {categoryLabel}
                </span>
                <span className="text-xs text-[#94a3b8] flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>المؤلف: </span>
                  <strong className="text-white">{authorName}</strong>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white font-cairo leading-snug">
                {book.title}
              </h1>

              {book.subtitle && (
                <p className="text-sm sm:text-base text-[#d4af37] font-medium font-amiri">
                  {book.subtitle}
                </p>
              )}

              {/* Statistics Row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs text-[#94a3b8]">
                <div className="flex items-center gap-1.5 bg-[#050a16] px-3 py-1.5 rounded-xl border border-white/5">
                  <BookOpen className="h-4 w-4 text-[#d4af37]" />
                  <span className="text-white font-bold">{book.chapters.length}</span>
                  <span>فصول</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#050a16] px-3 py-1.5 rounded-xl border border-white/5">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-white font-bold">{stats.totalWords.toLocaleString('ar-EG')}</span>
                  <span>كلمة</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#050a16] px-3 py-1.5 rounded-xl border border-white/5">
                  <Eye className="h-4 w-4 text-emerald-400" />
                  <span className="text-white font-bold">{stats.totalViews}</span>
                  <span>مشاهدة</span>
                </div>
              </div>

              {/* Action Buttons Row (Start / Resume / Studio) */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
                {hasHistory && resumeChapter ? (
                  <button
                    onClick={handleResumeReading}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-6 py-3 text-sm font-bold text-white shadow-xl transition-transform hover:scale-102 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>متابعة القراءة من الفصل {resumeChapter.chapterNumber}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartReading}
                    disabled={book.chapters.length === 0}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c59b27] to-[#a37c18] hover:from-[#f0cb69] hover:to-[#b88c1b] px-6 py-3 text-sm font-black text-[#070d1e] shadow-xl transition-transform hover:scale-102 disabled:opacity-50 cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>ابدأ قراءة الفصل الأول</span>
                  </button>
                )}

                {hasHistory && book.chapters.length > 0 && (
                  <button
                    onClick={handleStartReading}
                    className="rounded-xl bg-[#050a16] hover:bg-white/5 border border-white/10 px-4 py-3 text-xs font-bold text-[#cbd5e1] transition-colors"
                  >
                    البدء من الفصل 1
                  </button>
                )}

                {isOwner && onOpenWriter && (
                  <button
                    onClick={() => onOpenWriter(book.id)}
                    className="flex items-center gap-1.5 rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/40 px-4 py-3 text-xs font-bold text-[#f0cb69] transition-colors"
                  >
                    <PenTool className="h-4 w-4" />
                    <span>+ إضافة فصول جديدة</span>
                  </button>
                )}
              </div>

              {/* Reading Progress Indicator */}
              {totalChapters > 0 && completedCount > 0 && (
                <div className="pt-2 max-w-md">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1">
                    <span>تقدمك في القراءة:</span>
                    <span className="font-bold text-[#f0cb69]">
                      {completedCount} من {totalChapters} فصول ({percentCompleted}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#d4af37] to-emerald-400 rounded-full"
                      style={{ width: `${percentCompleted}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Synopsis / Story Section */}
        <section className="rounded-2xl border border-white/10 bg-[#0a1329] p-6 sm:p-8 space-y-3">
          <h2 className="text-lg font-black text-white font-cairo flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#d4af37]" />
            <span>نبذة عن العمل والرواية</span>
          </h2>
          <p className="text-sm sm:text-base text-[#cbd5e1] font-amiri leading-loose text-justify">
            {book.summary || 'لا توجد نبذة مدخلة حالياً لهذا العمل.'}
          </p>
        </section>

        {/* Published bibliography and quotations */}
        {(publicSources.length > 0 || publicQuotes.length > 0) && (
          <section className="rounded-2xl border border-[#c59b27]/20 bg-[#0a1329] p-6 sm:p-8 space-y-6">
            <h2 className="flex items-center gap-2 text-lg font-black text-white font-cairo">
              <FileText className="h-5 w-5 text-[#d4af37]" />
              المراجع والاقتباسات الموثقة
            </h2>

            {publicSources.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#f0cb69]">المصادر</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {publicSources.map((item, index) => {
                    const record = isResearchRecord(item) ? item : {};
                    const title = researchText(record.title) || researchText(record.name) || (typeof item === 'string' ? item : `مرجع ${index + 1}`);
                    const author = researchText(record.author);
                    const publisher = researchText(record.publisher);
                    const year = researchText(record.year);
                    const note = researchText(record.note);
                    const url = safeResearchUrl(record.url);
                    const id = researchText(record.id);
                    return (
                      <div key={id || `source-${index}`} className="rounded-xl border border-white/10 bg-[#070d1e] p-4 space-y-1.5">
                        <p className="text-sm font-bold text-white">{title}</p>
                        <p className="text-[11px] text-[#94a3b8]">{[author, publisher, year].filter(Boolean).join(' • ')}</p>
                        {note && <p className="text-xs leading-relaxed text-[#cbd5e1]">{note}</p>}
                        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#f0cb69] hover:underline"><ExternalLink className="h-3 w-3" />فتح المصدر</a>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {publicQuotes.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#f0cb69]"><Quote className="h-4 w-4" />اقتباسات مختارة</h3>
                <div className="space-y-3">
                  {publicQuotes.map((item, index) => {
                    const record = isResearchRecord(item) ? item : {};
                    const quote = researchText(record.text) || researchText(record.quote) || (typeof item === 'string' ? item : 'اقتباس موثق');
                    const sourceId = researchText(record.sourceId);
                    const source = publicSources.find((sourceItem) => isResearchRecord(sourceItem) && sourceItem.id === sourceId);
                    const sourceName = source && isResearchRecord(source) ? researchText(source.title) || researchText(source.name) : '';
                    const page = researchText(record.page);
                    const note = researchText(record.note);
                    const id = researchText(record.id);
                    return (
                      <div key={id || `quote-${index}`} className="rounded-xl border border-white/10 bg-[#070d1e] p-4 space-y-2">
                        <blockquote className="whitespace-pre-wrap text-sm leading-loose text-[#e2e8f0]">«{quote}»</blockquote>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#94a3b8]">
                          {sourceName && <span>المصدر: {sourceName}</span>}
                          {page && <span>الصفحة: {page}</span>}
                        </div>
                        {note && <p className="border-t border-white/5 pt-2 text-xs text-[#cbd5e1]">{note}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Chapters Index & Catalog (فهرس الفصول) */}
        <section className="rounded-2xl border border-white/10 bg-[#0a1329] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white font-cairo flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#d4af37]" />
                <span>فهرس الفصول ({book.chapters.length})</span>
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                اضغط على أي فصل للبدء في القراءة مباشرة
              </p>
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-[#94a3b8]" />
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder="ابحث برقم أو عنوان الفصل..."
                  className="w-full rounded-xl bg-[#050a16] border border-white/10 pr-8 pl-3 py-1.5 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                />
              </div>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1 rounded-xl bg-[#050a16] hover:bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold text-[#f0cb69] transition-colors shrink-0"
                title="تغيير اتجاه ترتيب الفصول"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>{sortOrder === 'asc' ? 'من البداية' : 'الأحدث أولاً'}</span>
              </button>
            </div>
          </div>

          {/* Chapters Grid List */}
          {displayChapters.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#94a3b8] space-y-3">
              <p>لم يتم العثور على فصول مطابقة للبحث أو لم تُضف فصول بعد.</p>
              {isOwner && onOpenWriter && (
                <button
                  onClick={() => onOpenWriter(book.id)}
                  className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-4 py-2 text-xs font-bold text-[#070d1e]"
                >
                  + كتابة أول فصل في الاستوديو
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayChapters.map((chapter) => {
                const isRead = progress.completedChapterIds.includes(chapter.id);
                const isLastRead = progress.lastChapterId === chapter.id;

                return (
                  <div
                    key={chapter.id}
                    onClick={() => handleChapterClick(chapter.id)}
                    className={`group flex items-center justify-between rounded-xl border p-3.5 transition-all duration-200 cursor-pointer ${
                      isLastRead
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
                        : isRead
                        ? 'bg-[#050a16]/60 border-emerald-500/30 hover:border-emerald-500/60'
                        : 'bg-[#050a16] border-white/5 hover:border-[#c59b27]/50 hover:bg-[#081024]'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span
                        className={`h-7 w-7 rounded-lg border flex items-center justify-center text-xs font-black shrink-0 ${
                          isLastRead
                            ? 'bg-amber-500 text-[#070d1e] border-amber-400'
                            : isRead
                            ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                            : 'bg-white/5 text-[#d4af37] border-white/10'
                        }`}
                      >
                        {chapter.chapterNumber}
                      </span>

                      <div className="truncate">
                        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#f0cb69] transition-colors truncate">
                          {chapter.title}
                        </h3>
                        <span className="text-[10px] text-[#94a3b8] block">
                          {chapter.wordCount} كلمة • ~{chapter.readingTimeMinutes} دقيقة
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 mr-2">
                      {isLastRead && (
                        <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-[#f0cb69]">
                          آخر ما قرأت
                        </span>
                      )}

                      <button
                        onClick={(e) => handleToggleChapterStatus(e, chapter.id)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title={isRead ? 'تعليم كغير مقروء' : 'تعليم كمقروء'}
                      >
                        {isRead ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-[#64748b]" />
                        )}
                      </button>

                      <ChevronLeft className="h-4 w-4 text-[#64748b] group-hover:text-white transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
