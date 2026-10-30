import React from 'react';
import { BookOpen, PenTool, Eye, Video, Bookmark, BookmarkCheck } from 'lucide-react';
import { BookProject, CategoryItem } from '../types/hukm';
import { calculateBookStats, getCategoryName } from '../utils/hukmEngine';

interface BookCardProps {
  book: BookProject;
  categories: CategoryItem[];
  isOwner?: boolean;
  isBookmarked?: boolean;
  onRead: () => void;
  onEdit?: () => void;
  onToggleBookmark?: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  categories,
  isOwner = false,
  isBookmarked = false,
  onRead,
  onEdit,
  onToggleBookmark,
}) => {
  const stats = calculateBookStats(book.chapters, book.viewsCount);
  const categoryLabel = getCategoryName(categories, book.category);

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#c59b27]/25 bg-[#0a1226] p-4 text-right transition-all duration-300 hover:-translate-y-1 hover:border-[#c59b27]/60 hover:shadow-xl hover:shadow-black/60">
      <div>
        {/* Cover thumbnail & Category badge */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/5 bg-[#070d1e]">
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1226] via-transparent to-black/30 pointer-events-none" />

          {/* Dynamic Category Pill */}
          <div className="absolute top-2.5 right-2.5">
            <span className="rounded-lg bg-[#070d1e]/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-[#f0cb69] border border-[#c59b27]/30 max-w-[180px] truncate block">
              {categoryLabel}
            </span>
          </div>


          {/* Views count badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-[#f0cb69] backdrop-blur-md border border-white/10">
            <Eye className="h-3 w-3 text-[#d4af37]" />
            <span>{stats.totalViews.toLocaleString('ar-EG')}</span>
          </div>

          {/* Bookmark Button for Reader */}
          {onToggleBookmark && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark();
              }}
              className={`absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-lg backdrop-blur-md transition-all ${
                isBookmarked
                  ? 'bg-[#c59b27] text-[#070d1e] shadow'
                  : 'bg-black/60 text-white/80 hover:text-white hover:bg-black/80 border border-white/10'
              }`}
              title={isBookmarked ? 'إزالة من المحفوظات' : 'حفظ في المفضلة'}
            >
              {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </button>
          )}

          {/* Standalone episode badge or video indicator */}
          {book.standaloneEpisode?.hasStandaloneEpisode ? (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-gradient-to-r from-rose-700 to-amber-600 px-2 py-0.5 text-[10px] font-black text-white shadow-md border border-white/20">
              <Video className="h-3 w-3" />
              <span>{book.standaloneEpisode.badgeLabel || 'حلقة مفرقة 🎬'}</span>
            </div>
          ) : book.socialLinks?.youtubeUrl ? (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-rose-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              <Video className="h-3 w-3" />
              <span>حلقة مرافقة</span>
            </div>
          ) : null}
        </div>

        {/* Title & Author & Subtitle */}
        <div className="mt-3.5 space-y-1">
          <h3 className="font-bold text-base text-white group-hover:text-[#f0cb69] transition-colors font-cairo line-clamp-1">
            {book.title}
          </h3>

          {/* Prominent Author Name */}
          <div className="flex items-center gap-1.5 text-xs text-[#d4af37]">
            <span className="text-[11px] text-[#94a3b8]">الكاتب:</span>
            <span className="font-bold">{book.author || 'إبراهيم فوزي'}</span>
          </div>

          <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">
            {book.subtitle}
          </p>
        </div>

        {/* Stats & Progress */}
        <div className="mt-3.5 space-y-1.5 border-t border-white/5 pt-2.5">
          <div className="flex items-center justify-between text-[11px] text-[#64748b]">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3 text-[#d4af37]" />
              {stats.chaptersCount} فصول ({stats.totalWords.toLocaleString('ar-EG')} كلمة)
            </span>
            <span className="text-[#f0cb69] font-bold">
              {stats.progressPercentage}% مكتمل
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#070d1e] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#c59b27] to-[#f0cb69] rounded-full transition-all"
              style={{ width: `${Math.max(5, stats.progressPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons based on Role */}
      <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
        <button
          onClick={onRead}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] py-2.5 text-xs font-black text-[#070d1e] shadow transition-transform hover:scale-102 active:scale-98 cursor-pointer"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>استعراض الكتاب والفصول</span>
        </button>

        {/* Owner ONLY Edit CTA */}
        {isOwner && onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-1 rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/30 px-3 py-2 text-xs font-semibold text-[#cbd5e1] hover:text-white transition-colors"
            title="فتح في استوديو الكتابة"
          >
            <PenTool className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>تعديل</span>
          </button>
        )}
      </div>
    </div>
  );
};
