import React from 'react';
import { motion } from 'motion/react';
import { BookProject, CategoryItem } from '../types/hukm';
import { getCategoryName } from '../utils/hukmEngine';

interface BookSpineShelfProps {
  books: BookProject[];
  categories: CategoryItem[];
  onRead: (bookId: string) => void;
}

/**
 * Adapted from ShelfHaven's MIT-licensed BookSpine concept:
 * https://github.com/bohemtucsok/ShelfHaven
 * Copyright (c) 2026 bohemtucsok. See THIRD_PARTY_NOTICES.md.
 * Reworked for HUKM's BookProject model, Arabic RTL layout and gold/navy identity.
 */
const SPINE_PALETTE = [
  'linear-gradient(180deg, #263b62 0%, #101b34 100%)',
  'linear-gradient(180deg, #6a4b27 0%, #302016 100%)',
  'linear-gradient(180deg, #31544d 0%, #142c2a 100%)',
  'linear-gradient(180deg, #633b43 0%, #2c1722 100%)',
  'linear-gradient(180deg, #4c456b 0%, #211e3b 100%)',
  'linear-gradient(180deg, #76612c 0%, #352912 100%)',
];

export const BookSpineShelf: React.FC<BookSpineShelfProps> = ({
  books,
  categories,
  onRead,
}) => {
  if (books.length === 0) return null;

  return (
    <section
      dir="rtl"
      aria-label="رفوف كتب حُكم"
      className="relative overflow-hidden rounded-3xl border border-[#c59b27]/20 bg-gradient-to-b from-[#0d1830] to-[#080e1d] px-4 py-7 sm:px-7"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-[#f0cb69] font-cairo">مكتبة حُكم</h3>
          <p className="mt-1 text-[11px] text-[#94a3b8]">اختر كتابًا من الرف لفتح تفاصيله وبدء القراءة</p>
        </div>
        <span className="rounded-full border border-[#c59b27]/20 bg-black/20 px-3 py-1 text-[10px] font-bold text-[#cbd5e1]">
          {books.length} {books.length === 1 ? 'كتاب' : 'كتب'}
        </span>
      </div>

      <div className="relative flex min-h-[260px] flex-wrap items-end justify-center gap-x-2.5 gap-y-5 rounded-2xl border-b-[10px] border-[#604522] bg-gradient-to-b from-[#101c34]/30 to-[#050a14]/70 px-3 pb-3 pt-5 shadow-inner sm:gap-x-3">
        {books.map((book, index) => {
          const spineWidth = Math.max(48, Math.min(76, 38 + book.title.length * 1.35));
          const categoryName = getCategoryName(categories, book.category);

          return (
            <motion.button
              key={book.id}
              type="button"
              onClick={() => onRead(book.id)}
              aria-label={`فتح كتاب ${book.title}`}
              title={`${book.title} — ${book.author || 'حُكم | HUKM MEDIA'}`}
              whileHover={{ y: -12, rotateY: -9, scale: 1.035 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="group relative flex h-[218px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-white/15 text-white shadow-[0_9px_18px_rgba(0,0,0,0.38)] outline-none focus-visible:ring-2 focus-visible:ring-[#f0cb69] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1226]"
              style={{
                width: spineWidth,
                background: SPINE_PALETTE[index % SPINE_PALETTE.length],
                transformStyle: 'preserve-3d',
                boxShadow: 'inset 5px 0 8px rgba(255,255,255,.07), inset -5px 0 8px rgba(0,0,0,.28), 0 9px 18px rgba(0,0,0,.38)',
              }}
            >
              <span className="absolute inset-y-0 right-1.5 w-px bg-white/20" />
              <span className="absolute inset-y-0 left-1.5 w-px bg-black/30" />
              <span className="absolute inset-x-2 top-2 h-px bg-[#f0cb69]/50" />
              <span
                className="max-h-[174px] overflow-hidden px-1 text-center text-[12px] font-black leading-relaxed text-[#f7e7bd] [text-shadow:0_1px_3px_rgba(0,0,0,.7)]"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                {book.title}
              </span>
              <span className="absolute bottom-2 max-w-[90%] truncate rounded bg-black/30 px-1.5 py-0.5 text-[8px] font-bold text-[#f0cb69]">
                {categoryName}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
