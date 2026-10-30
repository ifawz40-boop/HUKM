import React from 'react';
import { Play, BookOpen, Bookmark, Star, Sparkles, Compass, Eye, ShieldCheck } from 'lucide-react';
import { Novel } from '../types/novel';
import { formatArabicNumber } from '../utils/readingEngine';

interface HeroFeaturedProps {
  novel: Novel;
  onReadChapter: (chapterNumber: number) => void;
  onOpenDetails: () => void;
  onToggleBookmark: () => void;
  isBookmarked: boolean;
  lastReadChapter?: number;
}

export const HeroFeatured: React.FC<HeroFeaturedProps> = ({
  novel,
  onReadChapter,
  onOpenDetails,
  onToggleBookmark,
  isBookmarked,
  lastReadChapter,
}) => {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-900/30 bg-gradient-to-br from-[#241e19] via-[#1a1714] to-[#141210] p-6 sm:p-10 shadow-2xl">
      {/* Ambient background glow & atmospheric effect */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-orange-600/10 blur-3xl" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
        {/* Left / Text details */}
        <div className="flex-1 text-right space-y-4 sm:space-y-5 w-full">
          {/* Top badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              رواية الأسبوع المميزة · الأكثر قراءة
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              تحديث يومي
            </span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-[#b8afa3]">
              {novel.status === 'ONGOING' ? 'مستمرة' : 'مكتملة'}
            </span>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight font-cairo">
              {novel.title}
            </h1>
            <p className="mt-1 text-sm sm:text-base font-medium text-amber-400/80 tracking-wide font-sans">
              {novel.titleOriginal} · بقلم: {novel.author}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#b8afa3] border-y border-white/5 py-3">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-white">{novel.rating}</span>
              <span>({formatArabicNumber(novel.ratingCount)} تقييم)</span>
            </div>
            <div className="h-3.5 w-[1px] bg-white/10" />
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-amber-400" />
              <span className="font-semibold text-white">
                +{formatArabicNumber(novel.chaptersCount)} فصل
              </span>
            </div>
            <div className="h-3.5 w-[1px] bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-amber-400" />
              <span className="text-white">{formatArabicNumber(novel.views)} قراءة</span>
            </div>
          </div>

          {/* Synopsis */}
          <p className="text-sm sm:text-base leading-relaxed text-[#c7bfb3] line-clamp-3">
            {novel.synopsis}
          </p>

          {/* Genres Tags */}
          <div className="flex flex-wrap gap-1.5">
            {novel.genres.map((genre) => (
              <span
                key={genre}
                className="rounded-lg bg-[#241f1a] px-2.5 py-1 text-xs text-[#d6cec2] border border-amber-900/30"
              >
                #{genre}
              </span>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {lastReadChapter ? (
              <button
                onClick={() => onReadChapter(lastReadChapter)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-6 py-3 text-sm font-bold text-[#141210] shadow-lg shadow-amber-950/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>متابعة القراءة من الفصل {lastReadChapter}</span>
              </button>
            ) : (
              <button
                onClick={() => onReadChapter(1)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-6 py-3 text-sm font-bold text-[#141210] shadow-lg shadow-amber-950/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <BookOpen className="h-4 w-4" />
                <span>ابدأ القراءة الآن: الفصل 1</span>
              </button>
            )}

            <button
              onClick={onOpenDetails}
              className="flex items-center gap-2 rounded-xl bg-[#2a241e] hover:bg-[#362f27] border border-amber-900/40 px-5 py-3 text-sm font-semibold text-[#f5eedc] transition-all hover:border-amber-500/50"
            >
              <Compass className="h-4 w-4 text-amber-400" />
              <span>فهرس الفصول والتفاصيل</span>
            </button>

            <button
              onClick={onToggleBookmark}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                isBookmarked
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-[#1e1a16] border-white/10 text-[#c7bfb3] hover:text-white hover:bg-white/5'
              }`}
              title={isBookmarked ? 'محفوظة في مكتبتك' : 'إضافة إلى المفضلة'}
            >
              <Bookmark
                className={`h-4 w-4 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`}
              />
              <span>{isBookmarked ? 'في مكتبتي' : 'حفظ'}</span>
            </button>
          </div>
        </div>

        {/* Right / Cover Art with stylized frame */}
        <div className="relative group shrink-0">
          <div className="relative h-72 w-52 sm:h-80 sm:w-60 overflow-hidden rounded-2xl border-2 border-amber-500/30 shadow-2xl shadow-black/80 transition-all duration-300 group-hover:scale-102 group-hover:border-amber-400/60">
            <img
              src={novel.cover}
              alt={novel.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
            <div className="absolute bottom-3 right-3 left-3 text-right">
              <span className="rounded bg-amber-600/90 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                الفصل {novel.latestChapter.number}
              </span>
              <p className="mt-1 text-xs font-semibold text-white/90 truncate">
                {novel.latestChapter.title}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
