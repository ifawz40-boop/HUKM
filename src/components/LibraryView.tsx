import React, { useState } from 'react';
import { Bookmark, BookOpen, Clock, Trash2, Play, Sparkles, CheckCircle2 } from 'lucide-react';
import { Novel, LibraryEntry, LibraryCategory } from '../types/novel';

interface LibraryViewProps {
  novels: Novel[];
  libraryEntries: LibraryEntry[];
  onOpenNovel: (novelId: string) => void;
  onResumeReading: (novelId: string, chapterNumber: number) => void;
  onRemoveFromLibrary: (novelId: string) => void;
  onNavigateToExplore: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  novels,
  libraryEntries,
  onOpenNovel,
  onResumeReading,
  onRemoveFromLibrary,
  onNavigateToExplore,
}) => {
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>('reading');

  const categoryTabs: { id: LibraryCategory; label: string }[] = [
    { id: 'reading', label: 'أقرأها حالياً' },
    { id: 'favorites', label: 'المفضلة' },
    { id: 'plan_to_read', label: 'أرغب بقراءتها' },
    { id: 'completed', label: 'أنهيتها' },
  ];

  // Filter entries
  const currentEntries = libraryEntries.filter((entry) => entry.category === activeCategory);

  // Stats calculation
  const totalReadCount = libraryEntries.length;
  const inProgressCount = libraryEntries.filter((e) => e.category === 'reading').length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-900/20 pb-6 text-right">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Bookmark className="h-4 w-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-cairo">
              مكتبتي الشخصية
            </h1>
          </div>
          <p className="text-sm text-[#9c9182] mt-1">
            تابع تقدمك في القراءة، واستأنف فصولك المحفوظة بنقرة واحدة من أي جهاز
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-3 rounded-2xl bg-[#1e1a16] border border-amber-900/30 px-4 py-2.5 text-xs text-[#b8afa3]">
          <div>
            <span className="font-bold text-amber-400 text-sm">{inProgressCount}</span> قيد القراءة
          </div>
          <div className="h-3 w-[1px] bg-white/10" />
          <div>
            <span className="font-bold text-white text-sm">{totalReadCount}</span> رواية محفوظة
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto no-scrollbar">
        {categoryTabs.map((tab) => {
          const count = libraryEntries.filter((e) => e.category === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all shrink-0 ${
                activeCategory === tab.id
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-[#1e1a16] text-[#9c9182] hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[11px] ${
                  activeCategory === tab.id ? 'bg-black/30 text-white' : 'bg-white/5 text-[#8f8577]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Entries List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentEntries.map((entry) => {
          const novel = novels.find((n) => n.id === entry.novelId);
          if (!novel) return null;

          return (
            <div
              key={entry.novelId}
              className="flex flex-col justify-between rounded-2xl border border-amber-900/20 bg-[#1b1714] p-4 text-right transition-all hover:border-amber-500/40 hover:shadow-lg"
            >
              <div className="flex gap-4">
                {/* Cover thumbnail */}
                <button
                  onClick={() => onOpenNovel(novel.id)}
                  className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#25201a]"
                >
                  <img
                    src={novel.cover}
                    alt={novel.title}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onOpenNovel(novel.id)}
                    className="block text-base font-bold text-white hover:text-amber-400 transition-colors truncate font-cairo"
                  >
                    {novel.title}
                  </button>
                  <p className="text-xs text-[#8f8577] mt-0.5 truncate">{novel.author}</p>

                  {/* Reading Status Pill */}
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#27211b] px-2.5 py-1 text-xs text-amber-300">
                    <BookOpen className="h-3 w-3 text-amber-400" />
                    <span>آخر فصل: {entry.lastReadChapterNumber || 1}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#7d7365]">
                      <span>التقدم</span>
                      <span className="font-bold text-amber-400">
                        {entry.progressPercentage || 1}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.max(2, entry.progressPercentage || 1)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <button
                  onClick={() => onRemoveFromLibrary(novel.id)}
                  className="flex items-center gap-1 text-xs text-[#7d7365] hover:text-rose-400 transition-colors p-1"
                  title="إزالة من المكتبة"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>إزالة</span>
                </button>

                <button
                  onClick={() => onResumeReading(novel.id, entry.lastReadChapterNumber || 1)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>متابعة القراءة</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {currentEntries.length === 0 && (
        <div className="rounded-3xl border border-dashed border-amber-900/30 bg-[#191512] p-12 text-center space-y-4">
          <Bookmark className="mx-auto h-12 w-12 text-[#64594c]" />
          <div>
            <h3 className="text-lg font-bold text-white font-cairo">
              لا توجد روايات في قائمة "{categoryTabs.find((t) => t.id === activeCategory)?.label}"
            </h3>
            <p className="text-xs text-[#8f8577] mt-1">
              استكشف الروايات الرائجة واحفظ فصولك المفضلة لتصل إليها بسهولة.
            </p>
          </div>
          <button
            onClick={onNavigateToExplore}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all"
          >
            <BookOpen className="h-4 w-4" />
            <span>تصفح كل الروايات الآن</span>
          </button>
        </div>
      )}
    </div>
  );
};
