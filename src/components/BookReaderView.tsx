import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  Printer,
  Share2,
  Video,
  Mic,
  Twitter,
  Instagram,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Quote,
  ShieldCheck,
  Sliders,
  Eye,
  Film,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Maximize2,
  X,
  Play,
  Pause,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { BookProject, BookChapter, ChapterMedia } from '../types/hukm';
import { calculateReadingTimeMinutes, calculateWordsCount } from '../utils/hukmEngine';
import {
  recordChapterOpened,
  toggleChapterReadStatus,
  isChapterCompleted,
} from '../utils/readingTracker';

interface BookReaderViewProps {
  book: BookProject;
  initialChapterId?: string;
  isOwner?: boolean;
  isBookmarked?: boolean;
  onBack: () => void;
  onOpenOverview?: () => void;
  onOpenWriter?: (bookId: string) => void;
  onChapterViewed?: (chapterId: string) => void;
  onToggleBookmark?: () => void;
}

export const BookReaderView: React.FC<BookReaderViewProps> = ({
  book,
  initialChapterId,
  isOwner = false,
  isBookmarked = false,
  onBack,
  onOpenOverview,
  onOpenWriter,
  onChapterViewed,
  onToggleBookmark,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    initialChapterId || book.chapters[0]?.id || ''
  );
  const [fontSize, setFontSize] = useState<number>(19);
  const [fontFamily, setFontFamily] = useState<'cairo' | 'amiri' | 'tajawal'>('cairo');
  const [copiedShare, setCopiedShare] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<ChapterMedia | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [readVersion, setReadVersion] = useState(0);

  const currentChapterIndex = book.chapters.findIndex((c) => c.id === selectedChapterId);
  const currentChapter = book.chapters[currentChapterIndex] || book.chapters[0];

  // Trigger real-time view increment and record chapter opened
  useEffect(() => {
    if (currentChapter?.id) {
      onChapterViewed?.(currentChapter.id);
      recordChapterOpened(book.id, currentChapter.id);
      setReadVersion((v: number) => v + 1);
    }
  }, [currentChapter?.id]);

  const isCurrentRead = currentChapter ? isChapterCompleted(book.id, currentChapter.id) : false;

  const handleToggleRead = () => {
    if (currentChapter) {
      toggleChapterReadStatus(book.id, currentChapter.id);
      setReadVersion((v: number) => v + 1);
    }
  };

  const prevChapter = currentChapterIndex > 0 ? book.chapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex < book.chapters.length - 1 ? book.chapters[currentChapterIndex + 1] : null;

  const fontClass = {
    cairo: 'font-cairo',
    amiri: 'font-amiri',
    tajawal: 'font-tajawal',
  }[fontFamily];

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  if (!currentChapter) {
    return (
      <div className="p-12 text-center text-white" dir="rtl">
        <p>لا توجد فصول متوفرة في هذا الكتاب حالياً.</p>
        <button onClick={onBack} className="mt-4 text-[#d4af37] underline">
          العودة
        </button>
      </div>
    );
  }

  const wordCount = currentChapter.wordCount || calculateWordsCount(currentChapter.content);
  const readTime = calculateReadingTimeMinutes(wordCount);

  return (
    <div className="min-h-screen bg-[#070d1e] text-[#f4efe6] pb-16 printable-book" dir="rtl">
      {/* Sticky Reader Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#c59b27]/25 bg-[#070d1e]/95 backdrop-blur-md no-print">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Back & Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-lg p-1.5 text-[#cbd5e1] hover:text-white hover:bg-white/5 transition-colors"
              aria-label="الرجوع للرئيسية"
            >
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-bold">الرئيسية</span>
            </button>

            {onOpenOverview && (
              <button
                onClick={onOpenOverview}
                className="flex items-center gap-1 rounded-lg bg-[#0a1226] hover:bg-[#162752] border border-[#c59b27]/30 px-2 py-1 text-xs font-bold text-[#f0cb69] transition-colors"
                title="الرجوع لصفحة تفاصيل وفهرس فصول الكتاب"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>فهرس الفصول</span>
              </button>
            )}

            <div className="min-w-0 pr-1">
              <span className="block text-[11px] text-[#94a3b8] truncate font-cairo">
                {book.title} · <strong className="text-[#d4af37]">{book.author || 'إبراهيم فوزي'}</strong>
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-[#f0cb69] truncate">
                فصل {currentChapter.chapterNumber}: {currentChapter.title}
              </h2>
            </div>
          </div>

          {/* Quick Reader Controls */}
          <div className="flex items-center gap-2">
            {/* Mark as read toggle */}
            <button
              onClick={handleToggleRead}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                isCurrentRead
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-[#0a1226] border-white/10 text-[#cbd5e1] hover:text-white hover:border-[#c59b27]/40'
              }`}
              title={isCurrentRead ? 'تمت القراءة (انقر للإلغاء)' : 'تعليم الفصل كمقروء'}
            >
              <CheckCircle2 className={`h-3.5 w-3.5 ${isCurrentRead ? 'text-emerald-400' : 'text-[#64748b]'}`} />
              <span>{isCurrentRead ? 'مقروء ✓' : 'تحديد كمقروء'}</span>
            </button>
            {/* Font selector */}
            <div className="hidden sm:flex items-center gap-1 rounded-xl bg-[#0a1226] border border-white/10 p-1 text-xs">
              <button
                onClick={() => setFontFamily('cairo')}
                className={`rounded-lg px-2 py-1 ${
                  fontFamily === 'cairo' ? 'bg-[#c59b27] text-[#070d1e] font-bold' : 'text-[#cbd5e1]'
                }`}
              >
                القاهرة
              </button>
              <button
                onClick={() => setFontFamily('amiri')}
                className={`rounded-lg px-2 py-1 ${
                  fontFamily === 'amiri' ? 'bg-[#c59b27] text-[#070d1e] font-bold' : 'text-[#cbd5e1]'
                }`}
              >
                النسخ (أميري)
              </button>
            </div>

            {/* Font size adjustments */}
            <div className="flex items-center gap-1 rounded-xl bg-[#0a1226] border border-white/10 p-1 text-xs">
              <button
                onClick={() => setFontSize((s) => Math.max(15, s - 1))}
                className="h-7 w-7 rounded-lg hover:bg-white/10 font-bold"
                title="تصغير الخط"
              >
                -A
              </button>
              <button
                onClick={() => setFontSize((s) => Math.min(28, s + 1))}
                className="h-7 w-7 rounded-lg hover:bg-white/10 font-bold"
                title="تكبير الخط"
              >
                +A
              </button>
            </div>

            {/* Bookmark button */}
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                  isBookmarked
                    ? 'bg-[#c59b27] text-[#070d1e] border-[#c59b27]'
                    : 'bg-[#0a1226] border-white/10 text-[#cbd5e1] hover:text-white hover:border-[#c59b27]/40'
                }`}
                title={isBookmarked ? 'إزالة من المحفوظات' : 'حفظ في المفضلة'}
              >
                <span>{isBookmarked ? 'محفوظ' : 'حفظ'}</span>
              </button>
            )}

            {/* Print / PDF */}
            <button
              onClick={handlePrint}
              className="rounded-xl bg-[#0a1226] border border-white/10 p-2 text-[#cbd5e1] hover:text-white"
              title="طباعة / تصدير PDF"
            >
              <Printer className="h-4 w-4" />
            </button>

            {/* Owner ONLY: Edit in Studio button */}
            {isOwner && onOpenWriter && (
              <button
                onClick={() => onOpenWriter(book.id)}
                className="rounded-xl bg-[#c59b27]/20 border border-[#c59b27]/40 px-3 py-1.5 text-xs font-bold text-[#f0cb69] hover:bg-[#c59b27] hover:text-[#070d1e] transition-colors"
              >
                تعديل في الاستوديو
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Chapter Reader Container */}
      <main className="mx-auto max-w-3xl px-5 sm:px-8 py-8 sm:py-12">
        {/* Chapter Header */}
        <div className="border-b border-[#c59b27]/20 pb-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#c59b27]/15 border border-[#c59b27]/30 px-3.5 py-1 text-xs font-bold text-[#f0cb69]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>حُكم | HUKM MEDIA</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white font-cairo leading-snug">
            {currentChapter.title}
          </h1>

          {currentChapter.subtitle && (
            <p className="text-sm sm:text-base text-[#d4af37] font-medium font-tajawal">
              {currentChapter.subtitle}
            </p>
          )}

          <div className="flex items-center justify-center gap-4 text-xs text-[#94a3b8] pt-2">
            <span className="flex items-center gap-1 text-[#f0cb69] font-bold">
              <Eye className="h-3.5 w-3.5 text-[#d4af37]" />
              {(currentChapter.viewsCount !== undefined ? currentChapter.viewsCount : 1500).toLocaleString('ar-EG')} مشاهدة
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-[#d4af37]" />
              قراءة ~ {readTime} دقائق
            </span>
            <span>·</span>
            <span>{wordCount} كلمة</span>
            <span>·</span>
            <span className="text-[#f0cb69]">بحث موثق</span>
          </div>
        </div>

        {/* Standalone Episode Card (If owner enabled dedicated episode) */}
        {book.standaloneEpisode?.hasStandaloneEpisode && (
          <div className="my-6 rounded-2xl bg-gradient-to-r from-[#170a1a] via-[#0a1226] to-[#070d1e] border border-rose-500/40 p-4 sm:p-5 no-print shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/40 shadow">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white shadow">
                      {book.standaloneEpisode.badgeLabel || 'حلقة مفرقة 🎬'}
                    </span>
                    <h3 className="text-sm font-bold text-white font-cairo">
                      {book.standaloneEpisode.title || book.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#cbd5e1] mt-0.5">
                    {book.standaloneEpisode.description || 'تم تخصيص حلقة وثائقية مستقلة ومفرقة تغطي كواليس وحقائق هذا الموضوع.'}
                  </p>
                </div>
              </div>

              {book.standaloneEpisode.videoUrl && (
                <a
                  href={book.standaloneEpisode.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:scale-102 shrink-0"
                >
                  <Video className="h-4 w-4" />
                  <span>مشاهدة الحلقة المفرقة ▶️</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Social Media Companion Bar (YouTube, X, Instagram, Telegram - No official podcast yet) */}
        {(book.socialLinks?.youtubeUrl ||
          book.socialLinks?.xThreadUrl ||
          book.socialLinks?.instagramPostUrl ||
          book.socialLinks?.telegramUrl) && (
          <div className="my-6 rounded-2xl bg-[#0a1226] border border-[#c59b27]/30 p-4 no-print space-y-2">
            <span className="text-xs font-bold text-[#f0cb69] block">
              🎥 محتوى السوشيال ميديا المرافق لهذا المشروع:
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {book.socialLinks.youtubeUrl && (
                <a
                  href={book.socialLinks.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 font-semibold transition-colors"
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>شاهد الحلقة الوثائقية</span>
                </a>
              )}
              {book.socialLinks.xThreadUrl && (
                <a
                  href={book.socialLinks.xThreadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 px-3 py-1.5 text-xs text-sky-300 font-semibold transition-colors"
                >
                  <Twitter className="h-3.5 w-3.5" />
                  <span>قراءة الثريد على X</span>
                </a>
              )}
              {book.socialLinks.instagramPostUrl && (
                <a
                  href={book.socialLinks.instagramPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl bg-pink-950/40 hover:bg-pink-900/60 border border-pink-500/30 px-3 py-1.5 text-xs text-pink-300 font-semibold transition-colors"
                >
                  <Instagram className="h-3.5 w-3.5" />
                  <span>منشور إنستغرام</span>
                </a>
              )}
              {book.socialLinks.telegramUrl && (
                <a
                  href={book.socialLinks.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 px-3 py-1.5 text-xs text-blue-300 font-semibold transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>قناة تيليجرام</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Chapter Header Media: Short video, animated GIF, or archival image */}
        {(() => {
          const allMedia = currentChapter.media || [];
          const headerMedia = allMedia.find((m) => m.placement === 'header') || allMedia[0];
          if (!headerMedia) return null;

          return (
            <div className="my-6 overflow-hidden rounded-2xl border border-[#c59b27]/30 bg-[#0a1226] shadow-2xl transition-all ring-1 ring-[#c59b27]/20">
              <div className="relative aspect-video w-full bg-black overflow-hidden group">
                {headerMedia.type === 'video' ? (
                  <>
                    <video
                      src={headerMedia.url}
                      autoPlay
                      loop
                      muted={isAudioMuted}
                      playsInline
                      controls
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAudioMuted(!isAudioMuted)}
                        className="rounded-lg bg-black/80 hover:bg-black p-2 text-white border border-white/20 backdrop-blur-md transition-colors"
                        title={isAudioMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                      >
                        {isAudioMuted ? <VolumeX className="h-4 w-4 text-amber-300" /> : <Volume2 className="h-4 w-4 text-emerald-300" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLightboxMedia(headerMedia)}
                        className="rounded-lg bg-black/80 hover:bg-black p-2 text-white border border-white/20 backdrop-blur-md transition-colors"
                        title="تكبير ومعاينة سينمائية"
                      >
                        <Maximize2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </>
                ) : headerMedia.type === 'gif' ? (
                  <>
                    <img
                      src={headerMedia.url}
                      alt={headerMedia.title || 'صورة متحركة GIF'}
                      className="h-full w-full object-contain bg-black cursor-pointer"
                      onClick={() => setLightboxMedia(headerMedia)}
                    />
                    <button
                      type="button"
                      onClick={() => setLightboxMedia(headerMedia)}
                      className="absolute top-3 left-3 rounded-lg bg-black/80 hover:bg-black p-2 text-white border border-white/20 backdrop-blur-md transition-colors"
                      title="تكبير"
                    >
                      <Maximize2 className="h-4 w-4 text-white" />
                    </button>
                  </>
                ) : (
                  <>
                    <img
                      src={headerMedia.url}
                      alt={headerMedia.title || 'صورة توضيحية'}
                      className="h-full w-full object-cover cursor-pointer"
                      onClick={() => setLightboxMedia(headerMedia)}
                    />
                    <button
                      type="button"
                      onClick={() => setLightboxMedia(headerMedia)}
                      className="absolute top-3 left-3 rounded-lg bg-black/80 hover:bg-black p-2 text-white border border-white/20 backdrop-blur-md transition-colors"
                      title="تكبير"
                    >
                      <Maximize2 className="h-4 w-4 text-white" />
                    </button>
                  </>
                )}

                {/* Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-[#f0cb69] border border-[#c59b27]/40 shadow-lg">
                  {headerMedia.type === 'video' ? (
                    <Film className="h-3.5 w-3.5 text-rose-400" />
                  ) : headerMedia.type === 'gif' ? (
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  <span>
                    {headerMedia.badgeText ||
                      (headerMedia.type === 'video'
                        ? `فيديو استقصائي قصير (${headerMedia.durationSeconds || 6} ثوانٍ)`
                        : headerMedia.type === 'gif'
                        ? 'صورة متحركة GIF'
                        : 'وثيقة أرشيفية')}
                  </span>
                </div>
              </div>

              {/* Caption & Title */}
              {(headerMedia.title || headerMedia.caption) && (
                <div className="p-4 bg-[#070d1e] border-t border-white/10 space-y-1">
                  {headerMedia.title && (
                    <h5 className="text-xs sm:text-sm font-bold text-white font-cairo">
                      {headerMedia.title}
                    </h5>
                  )}
                  {headerMedia.caption && (
                    <p className="text-xs text-[#cbd5e1] leading-relaxed font-tajawal">
                      {headerMedia.caption}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Chapter Text Paragraphs & In-Content Media */}
        <article
          className={`mt-8 space-y-6 text-[#f4efe6] leading-relaxed ${fontClass}`}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.95 }}
        >
          {currentChapter.content.map((paragraph, idx) => {
            const isHukmConclusion =
              paragraph.includes('الحُكم') ||
              paragraph.includes('حُكم') ||
              paragraph.startsWith('«');

            const allMedia = currentChapter.media || [];
            // In-content media to inject after paragraph 1 or 2
            const inContentItem = allMedia.find(
              (m, mIdx) => m.placement === 'in_content' && (mIdx === idx || (idx === 1 && mIdx === 1))
            );

            return (
              <React.Fragment key={idx}>
                <p
                  className={
                    isHukmConclusion
                      ? 'rounded-2xl border-r-4 border-[#d4af37] bg-[#0c1630] p-4 text-[#fce8a6] font-semibold shadow-md'
                      : ''
                  }
                >
                  {paragraph}
                </p>

                {/* In-content Media Card */}
                {inContentItem && (
                  <div className="my-6 overflow-hidden rounded-2xl border border-white/10 bg-[#091124] shadow-xl">
                    <div className="relative aspect-video w-full bg-black">
                      {inContentItem.type === 'video' ? (
                        <video
                          src={inContentItem.url}
                          autoPlay
                          loop
                          muted={isAudioMuted}
                          playsInline
                          controls
                          className="h-full w-full object-cover"
                        />
                      ) : inContentItem.type === 'gif' ? (
                        <img
                          src={inContentItem.url}
                          alt={inContentItem.title}
                          className="h-full w-full object-contain bg-black cursor-pointer"
                          onClick={() => setLightboxMedia(inContentItem)}
                        />
                      ) : (
                        <img
                          src={inContentItem.url}
                          alt={inContentItem.title}
                          className="h-full w-full object-cover cursor-pointer"
                          onClick={() => setLightboxMedia(inContentItem)}
                        />
                      )}
                      <div className="absolute top-2.5 right-2.5 rounded-lg bg-black/80 px-2.5 py-0.5 text-[10px] font-bold text-[#f0cb69] border border-white/10">
                        {inContentItem.badgeText || (inContentItem.type === 'video' ? 'فيديو قصير' : inContentItem.type === 'gif' ? 'GIF' : 'صورة')}
                      </div>
                    </div>
                    {inContentItem.caption && (
                      <div className="p-3 bg-[#070d1e] border-t border-white/5 text-xs text-[#cbd5e1]">
                        <strong className="text-white ml-1">{inContentItem.title}:</strong>
                        <span>{inContentItem.caption}</span>
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </article>


        {/* References in this chapter */}
        {currentChapter.references && currentChapter.references.length > 0 && (
          <div className="mt-12 rounded-2xl border border-white/10 bg-[#091124] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#d4af37]">
              <ShieldCheck className="h-4 w-4" />
              <h4 className="text-xs font-bold font-cairo">مصادر وهوامش هذا الفصل:</h4>
            </div>
            <ul className="space-y-1.5 text-xs text-[#94a3b8] list-decimal list-inside font-mono">
              {currentChapter.references.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom Chapter Navigation */}
        <div className="mt-12 flex items-center justify-between border-t border-[#c59b27]/25 pt-6 no-print">
          {prevChapter ? (
            <button
              onClick={() => setSelectedChapterId(prevChapter.id)}
              className="flex items-center gap-2 rounded-xl bg-[#0a1226] hover:bg-[#132247] border border-white/10 px-4 py-2.5 text-xs font-bold text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-[#d4af37]" />
              <span>الفصل السابق: {prevChapter.chapterNumber}</span>
            </button>
          ) : (
            <div className="text-xs text-[#64748b]">بداية الكتاب</div>
          )}

          {nextChapter ? (
            <button
              onClick={() => {
                recordChapterOpened(book.id, currentChapter.id);
                recordChapterOpened(book.id, nextChapter.id);
                setSelectedChapterId(nextChapter.id);
                window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] px-5 py-2.5 text-xs font-bold text-[#070d1e] shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>الفصل التالي: {nextChapter.chapterNumber}</span>
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#f0cb69] font-bold">🎉 أتممت جميع فصول هذا الكتاب</span>
              {onOpenOverview && (
                <button
                  onClick={onOpenOverview}
                  className="rounded-lg bg-[#0a1226] border border-[#c59b27]/30 px-3 py-1.5 text-xs font-bold text-[#f0cb69]"
                >
                  العودة للفهرس
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Cinematic Media Lightbox Modal */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in duration-200"
          dir="rtl"
          onClick={() => setLightboxMedia(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-[#c59b27]/40 bg-[#070d1e] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setLightboxMedia(null)}
              className="absolute top-4 left-4 z-10 rounded-full bg-black/80 p-2 text-white hover:bg-black transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Media Content */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              {lightboxMedia.type === 'video' ? (
                <video
                  src={lightboxMedia.url}
                  autoPlay
                  loop
                  controls
                  className="h-full w-full object-contain"
                />
              ) : (
                <img
                  src={lightboxMedia.url}
                  alt={lightboxMedia.title || 'وسيط توضيحي'}
                  className="h-full w-full object-contain"
                />
              )}
            </div>

            {/* Caption & Metadata */}
            <div className="p-5 border-t border-white/10 bg-[#0a1226] space-y-1.5 text-right">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-[#c59b27]/20 border border-[#c59b27]/40 px-2.5 py-0.5 text-xs font-bold text-[#f0cb69]">
                  {lightboxMedia.type === 'video'
                    ? `🎬 فيديو توثيقي قصير (${lightboxMedia.durationSeconds || 6} ثوانٍ)`
                    : lightboxMedia.type === 'gif'
                    ? '🎞️ صورة متحركة GIF'
                    : '📸 وثيقة أرشيفية'}
                </span>
                <span className="text-xs text-[#94a3b8] font-mono">
                  {lightboxMedia.badgeText}
                </span>
              </div>

              {lightboxMedia.title && (
                <h4 className="text-base font-bold text-white font-cairo">
                  {lightboxMedia.title}
                </h4>
              )}

              {lightboxMedia.caption && (
                <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed font-tajawal">
                  {lightboxMedia.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

