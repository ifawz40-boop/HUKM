import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, ChevronLeft, Sparkles } from 'lucide-react';
import { BookProject } from '../types/hukm';
import { filterBooks, getCategoryLabel } from '../utils/hukmEngine';

interface HukmSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookProject[];
  onSelectBook: (bookId: string) => void;
  onSelectChapter: (bookId: string, chapterId: string) => void;
}

export const HukmSearchModal: React.FC<HukmSearchModalProps> = ({
  isOpen,
  onClose,
  books,
  onSelectBook,
  onSelectChapter,
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

  const results = filterBooks(books, { query });

  const popularTags = [
    'مش زي ما إنت فاكر',
    'الذكاء الاصطناعي',
    'سقوط روما',
    'الأهرامات',
    'العصور المظلمة',
    'المغالطات المنطقية',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 pt-16 sm:pt-24" dir="rtl">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[#c59b27]/40 bg-[#0a1226] shadow-2xl transition-all">
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-white/10 px-4 py-3.5">
          <Search className="h-5 w-5 text-[#d4af37] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في كتب وأبحاث وفصول حُكم..."
            className="w-full bg-transparent pr-3 pl-10 text-base text-white placeholder-[#64748b] focus:outline-none font-cairo"
          />
          <button
            onClick={onClose}
            className="absolute left-4 rounded-lg p-1 text-[#64748b] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Suggestion tags */}
        {!query && (
          <div className="p-4 border-b border-white/5 bg-[#070d1e]">
            <span className="text-xs font-bold text-[#94a3b8] block mb-2">المواضيع الشائعة:</span>
            <div className="flex flex-wrap gap-1.5">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setQuery(tag)}
                  className="rounded-lg bg-[#0e1935] hover:bg-[#c59b27]/20 hover:text-[#f0cb69] px-3 py-1 text-xs text-[#cbd5e1] border border-white/5 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 divide-y divide-white/5">
          {results.map((book) => (
            <div
              key={book.id}
              onClick={() => {
                onSelectBook(book.id);
                onClose();
              }}
              className="group flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-[#0e1935] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="h-14 w-12 rounded-lg object-cover border border-white/10 shrink-0"
                />
                <div className="text-right min-w-0">
                  <h4 className="text-sm font-bold text-white group-hover:text-[#f0cb69] truncate font-cairo">
                    {book.title}
                  </h4>
                  <p className="text-xs text-[#94a3b8] truncate">{book.subtitle}</p>
                  <span className="text-[10px] text-[#d4af37] mt-0.5 block">
                    {getCategoryLabel(book.category)} · {book.chapters.length} فصول
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-[#c59b27]/20 group-hover:bg-[#c59b27] px-3 py-1.5 text-xs font-bold text-[#f0cb69] group-hover:text-[#070d1e] transition-colors shrink-0">
                <span>تصفح</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </div>
            </div>
          ))}

          {results.length === 0 && (
            <div className="py-8 text-center text-xs text-[#64748b]">
              لم يتم العثور على نتائج مطابقة لـ "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
