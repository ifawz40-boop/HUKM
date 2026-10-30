import React, { useState } from 'react';
import { Search, Filter, ArrowUpDown, BookOpen, Sparkles } from 'lucide-react';
import { Novel, LibraryCategory } from '../types/novel';
import { GENRE_LIST } from '../data/novelsData';
import { filterAndSortNovels } from '../utils/readingEngine';
import { NovelCard } from './NovelCard';

interface ExploreViewProps {
  novels: Novel[];
  onSelectNovel: (novelId: string) => void;
  onReadChapter: (novelId: string, chapterNumber: number) => void;
  bookmarkedNovelIds: string[];
  onToggleBookmark: (novelId: string) => void;
  initialGenre?: string;
  initialSort?: 'trending' | 'latest' | 'rating' | 'chapters';
  initialStatus?: string;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  novels,
  onSelectNovel,
  onReadChapter,
  bookmarkedNovelIds,
  onToggleBookmark,
  initialGenre = 'الكل',
  initialSort = 'trending',
  initialStatus = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [sortBy, setSortBy] = useState<'trending' | 'latest' | 'rating' | 'chapters'>(initialSort);

  const filteredNovels = filterAndSortNovels(novels, {
    query: searchQuery,
    genre: selectedGenre,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    sortBy: sortBy,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8" dir="rtl">
      {/* Page Header */}
      <div className="text-right space-y-2 border-b border-amber-900/20 pb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-cairo">
            استكشف مكتبة الروايات
          </h1>
        </div>
        <p className="text-sm text-[#a89f91]">
          تصفح مئات الروايات المترجمة والمؤلفة بالعربية، مصنفة بدقة حسب التصنيف وحالة الترجمة
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4 rounded-2xl border border-amber-900/25 bg-[#1b1714] p-5 shadow-lg">
        {/* Top: Search Input + Status + Sort */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8f8577]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الرواية، المؤلف، أو المترجم..."
              className="w-full rounded-xl bg-[#241e19] pr-10 pl-4 py-2.5 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status pills */}
            <div className="flex rounded-xl bg-[#241e19] p-1 border border-white/5 text-xs">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'ONGOING', label: 'مستمرة' },
                { id: 'COMPLETED', label: 'مكتملة' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStatus(s.id)}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${
                    selectedStatus === s.id
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-[#9c9182] hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 rounded-xl bg-[#241e19] px-3 py-2 border border-white/5 text-xs text-[#c7bfb3]">
              <ArrowUpDown className="h-3.5 w-3.5 text-amber-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-semibold focus:outline-none cursor-pointer"
              >
                <option value="trending" className="bg-[#1e1a16] text-white">
                  الأكثر قراءة
                </option>
                <option value="latest" className="bg-[#1e1a16] text-white">
                  أحدث الفصول
                </option>
                <option value="rating" className="bg-[#1e1a16] text-white">
                  الأعلى تقييماً
                </option>
                <option value="chapters" className="bg-[#1e1a16] text-white">
                  أكثر الفصول
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom: Genres Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-white/5">
          <span className="text-xs font-bold text-[#8f8577] shrink-0 pl-1">التصنيف:</span>
          {GENRE_LIST.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                selectedGenre === genre
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-[#241e19] text-[#9c9182] hover:text-white border border-transparent'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count Bar */}
      <div className="flex items-center justify-between text-xs text-[#8f8577]">
        <span>
          تم العثور على <strong className="text-amber-400">{filteredNovels.length}</strong> رواية
        </span>
        {(searchQuery || selectedGenre !== 'الكل' || selectedStatus !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedGenre('الكل');
              setSelectedStatus('all');
            }}
            className="text-amber-400 hover:underline"
          >
            إعادة ضبط الفلاتر
          </button>
        )}
      </div>

      {/* Novels Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
        {filteredNovels.map((novel) => (
          <NovelCard
            key={novel.id}
            novel={novel}
            onClick={() => onSelectNovel(novel.id)}
            onReadLatest={(e) => {
              e.stopPropagation();
              onReadChapter(novel.id, novel.latestChapter.number);
            }}
            onToggleBookmark={(e) => {
              e.stopPropagation();
              onToggleBookmark(novel.id);
            }}
            isBookmarked={bookmarkedNovelIds.includes(novel.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredNovels.length === 0 && (
        <div className="rounded-3xl border border-dashed border-amber-900/30 bg-[#1a1613] p-12 text-center space-y-3">
          <BookOpen className="mx-auto h-12 w-12 text-[#6e6355]" />
          <h3 className="text-lg font-bold text-white font-cairo">لا توجد نتائج مطابقة</h3>
          <p className="text-xs text-[#8f8577]">
            جرّب تغيير كلمات البحث أو اختر تصنيفاً آخر.
          </p>
        </div>
      )}
    </div>
  );
};
