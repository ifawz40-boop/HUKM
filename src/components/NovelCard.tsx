import React from 'react';
import { Star, BookOpen, Bookmark, Eye } from 'lucide-react';
import { Novel } from '../types/novel';
import { formatArabicNumber } from '../utils/readingEngine';

interface NovelCardProps {
  novel: Novel;
  onClick: () => void;
  onReadLatest: (e: React.MouseEvent) => void;
  onToggleBookmark?: (e: React.MouseEvent) => void;
  isBookmarked?: boolean;
}

export const NovelCard: React.FC<NovelCardProps> = ({
  novel,
  onClick,
  onReadLatest,
  onToggleBookmark,
  isBookmarked,
}) => {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-amber-900/20 bg-[#1c1815] transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-950/20 cursor-pointer"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#241f1a]">
        <img
          src={novel.cover}
          alt={novel.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1815] via-transparent to-black/30" />

        {/* Status Badge */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold backdrop-blur-md shadow ${
              novel.status === 'COMPLETED'
                ? 'bg-emerald-600/90 text-white'
                : 'bg-amber-600/90 text-white'
            }`}
          >
            {novel.status === 'COMPLETED' ? 'مكتملة' : 'مستمرة'}
          </span>
        </div>

        {/* Rating Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-amber-300 backdrop-blur-md">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>{novel.rating}</span>
        </div>

        {/* Bookmark quick button */}
        {onToggleBookmark && (
          <button
            onClick={onToggleBookmark}
            aria-label={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
            className="absolute bottom-2.5 left-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 text-white transition-all hover:bg-amber-600 hover:scale-110 active:scale-90"
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        )}

        {/* Latest chapter overlay pill */}
        <button
          onClick={onReadLatest}
          aria-label={`قراءة الفصل ${novel.latestChapter.number}`}
          className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-amber-500/90 hover:bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-[#141210] shadow transition-colors"
        >
          <BookOpen className="h-3 w-3" />
          <span>فصل {novel.latestChapter.number}</span>
        </button>
      </div>

      {/* Content Details */}
      <div className="flex flex-1 flex-col justify-between p-3.5 text-right">
        <div>
          {/* Main Title */}
          <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors line-clamp-1 font-cairo">
            {novel.title}
          </h3>

          {/* Subtitle / Author */}
          <p className="mt-0.5 text-xs text-[#a89f91] truncate font-sans">
            {novel.author} · {novel.translator}
          </p>

          {/* Genres Chips */}
          <div className="mt-2.5 flex flex-wrap gap-1">
            {novel.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="rounded bg-[#28221c] px-1.5 py-0.5 text-[10px] text-[#c7bfb3] border border-white/5"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        {/* Footer info (Views & Total Chapters) */}
        <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-[#948a7b]">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-amber-500/80" />
            <span>{formatArabicNumber(novel.views)}</span>
          </div>
          <span className="font-medium text-amber-400/90">
            {novel.chaptersCount} فصل
          </span>
        </div>
      </div>
    </div>
  );
};
