import React from 'react';
import { BookOpen, PenTool, Eye, Bookmark, BookmarkCheck, Play, User, FileText } from 'lucide-react';
import { BookProject, CategoryItem } from '../types/hukm';
import { calculateBookStats, getCategoryName } from '../utils/hukmEngine';
import { getBookReadingProgress } from '../utils/readingTracker';

interface BookCardProps {
  book: BookProject;
  categories: CategoryItem[];
  currentUserId?: string;
  isOwner?: boolean;
  isBookmarked?: boolean;
  onRead: () => void;
  onQuickResume?: (chapterId: string) => void;
  onEdit?: () => void;
  onToggleBookmark?: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  categories,
  currentUserId,
  isOwner = false,
  isBookmarked = false,
  onRead,
  onQuickResume,
  onEdit,
  onToggleBookmark,
}) => {
  const stats = calculateBookStats(book.chapters, book.viewsCount);
  const categoryLabel = getCategoryName(categories, book.category);
  const readingProgress = getBookReadingProgress(book.id, currentUserId);
  const lastChapter = readingProgress.lastChapterId
    ? book.chapters.find((c) => c.id === readingProgress.lastChapterId)
    : null;
  const completedCount = readingProgress.completedChapterIds?.length || 0;
  const percentCompleted = book.chapters.length > 0 ? Math.round((completedCount / book.chapters.length) * 100) : 0;

  return (
    <div
      onClick={onRead}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0a1329] p-4 text-right transition-all duration-300 hover:-translate-y-1 hover:border-[#c59b27]/60 hover:shadow-2xl hover:shadow-black/70 cursor-pointer"
    >
      <div>
        {/* Cover Poster (3:4 ratio like truthnovel.top) */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-[#050a16]">
          <img
            src={book.coverImage}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1329] via-transparent to-black/40 pointer-events-none" />

          {/* Status Badge (مستمرة / مكتملة) */}
          <div className="absolute top-2.5 right-2.5">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-black shadow-md ${
                book.status === 'draft' || book.status === 'in_progress'
                  ? 'bg-slate-600 text-white'
                  : book.status === 'completed'
                    ? 'bg-amber-500 text-[#070d1e]'
                    : 'bg-emerald-600 text-white'
              }`}
            >
              {book.status === 'draft' || book.status === 'in_progress'
                ? 'مسودة'
                : book.status === 'completed'
                  ? 'مكتملة'
                  : 'مستمرة'}
            </span>
          </div>

          {/* Category Pill */}
          <div className="absolute top-2.5 left-2.5">
            <span className="rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-[#f0cb69] border border-white/10">
              {categoryLabel}
            </span>
          </div>

          {/* Bottom Overlay on Cover: Chapter Count & Views */}
          <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-[11px] text-white/90">
            <span className="flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 font-bold">
              <FileText className="h-3 w-3 text-[#d4af37]" />
              <span>{book.chapters.length} فصول</span>
            </span>

            <span className="flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 font-bold text-[#f0cb69]">
              <Eye className="h-3 w-3" />
              <span>{stats.totalViews}</span>
            </span>
          </div>

          {/* Bookmark Button */}
          {onToggleBookmark && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark();
              }}
              className={`absolute bottom-10 right-2.5 flex h-7 w-7 items-center justify-center rounded-lg backdrop-blur-md transition-all ${
                isBookmarked
                  ? 'bg-[#c59b27] text-[#070d1e] shadow'
                  : 'bg-black/60 text-white/80 hover:text-white hover:bg-black/80 border border-white/10'
              }`}
              title={isBookmarked ? 'إزالة من المحفوظات' : 'حفظ في المفضلة'}
            >
              {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Title & Author */}
        <div className="mt-3.5 space-y-1">
          <h3 className="text-base font-black text-white font-cairo leading-snug group-hover:text-[#f0cb69] transition-colors line-clamp-2">
            {book.title}
          </h3>

          <p className="text-xs text-[#94a3b8] flex items-center gap-1">
            <User className="h-3 w-3 text-[#d4af37]" />
            <span>المؤلف: {book.author || 'حُكم | HUKM MEDIA'}</span>
          </p>

          <p className="text-xs text-[#cbd5e1]/70 line-clamp-2 leading-relaxed pt-1">
            {book.summary}
          </p>
        </div>

        {/* Reading progress indicator if reader made progress */}
        {completedCount > 0 && (
          <div className="pt-2.5">
            <div className="flex items-center justify-between text-[10px] text-[#94a3b8] mb-1">
              <span className="text-emerald-400 font-bold">قرأت {percentCompleted}%</span>
              <span>{completedCount} من {book.chapters.length} فصول</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                style={{ width: `${percentCompleted}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Card Actions Footer */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
        {lastChapter && onQuickResume ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickResume(lastChapter.id);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 py-2 text-xs font-bold text-white shadow transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>متابعة (فـ {lastChapter.chapterNumber})</span>
          </button>
        ) : (
          <button
            onClick={onRead}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] py-2 text-xs font-black text-[#070d1e] shadow transition-all"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>ابدأ القراءة</span>
          </button>
        )}

        {isOwner && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-white/10 px-2.5 py-2 text-xs font-bold text-[#f0cb69] transition-colors"
            title="تعديل في الاستوديو"
          >
            <PenTool className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
