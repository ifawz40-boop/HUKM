import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, Star, Sparkles, ChevronLeft } from 'lucide-react';
import { Novel } from '../types/novel';
import { filterAndSortNovels } from '../utils/readingEngine';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  novels: Novel[];
  onSelectNovel: (novelId: string) => void;
  onReadChapter: (novelId: string, chapterNumber: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  novels,
  onSelectNovel,
  onReadChapter,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard escape & shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const results = filterAndSortNovels(novels, { query });

  const popularTags = ['لورد الحقيقة', 'فانتازيا', 'تناسخ', 'غموض', 'ستيمبانك', 'أكشن'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 pt-16 sm:pt-24" dir="rtl">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-900/40 bg-[#1c1815] shadow-2xl transition-all">
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-white/10 px-4 py-3.5">
          <Search className="h-5 w-5 text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الرواية، الكاتب، أو المترجم..."
            className="w-full bg-transparent pr-3 pl-10 text-base text-white placeholder-[#7d7365] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="absolute left-4 rounded-lg p-1 text-[#8f8577] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Suggestion Tags */}
        {!query && (
          <div className="p-4 border-b border-white/5 bg-[#171411]">
            <span className="text-xs font-bold text-[#8f8577] block mb-2">الأكثر بحثاً:</span>
            <div className="flex flex-wrap gap-1.5">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setQuery(tag)}
                  className="rounded-lg bg-[#25201a] hover:bg-amber-600/20 hover:text-amber-300 px-3 py-1 text-xs text-[#c7bfb3] border border-white/5 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="max-h-[60vh] overflow-y-auto p-3 divide-y divide-white/5">
          {results.map((novel) => (
            <div
              key={novel.id}
              onClick={() => {
                onSelectNovel(novel.id);
                onClose();
              }}
              className="group flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-[#25201a] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={novel.cover}
                  alt={novel.title}
                  className="h-14 w-11 rounded-lg object-cover border border-white/10 shrink-0"
                />
                <div className="text-right min-w-0">
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-400 truncate font-cairo">
                    {novel.title}
                  </h4>
                  <p className="text-xs text-[#8f8577] truncate">
                    {novel.author} · {novel.translator}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-0.5 text-[11px] text-amber-400">
                      <Star className="h-3 w-3 fill-current" />
                      {novel.rating}
                    </span>
                    <span className="text-[11px] text-[#7d7365]">
                      {novel.chaptersCount} فصل
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReadChapter(novel.id, novel.latestChapter.number);
                  onClose();
                }}
                className="flex items-center gap-1 rounded-lg bg-amber-600/20 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-white transition-all shrink-0"
              >
                <span>فصل {novel.latestChapter.number}</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {results.length === 0 && (
            <div className="py-8 text-center text-xs text-[#8f8577]">
              لا توجد نتائج لرواية تبدأ بـ "{query}"
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between bg-[#141210] px-4 py-2 text-[11px] text-[#7d7365] border-t border-white/5">
          <span>اضغط ESC للإغلاق</span>
          <span>نتائج مباشرة من مكتبة TruthNovel</span>
        </div>
      </div>
    </div>
  );
};
