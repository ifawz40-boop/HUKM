import React from 'react';
import {
  BookOpen,
  Sparkles,
  ArrowDown,
  PenTool,
  Bookmark,
  Layers,
} from 'lucide-react';
import { HUKM_LOGO, HUKM_MOTTO } from '../data/hukmData';

interface HukmHeroProps {
  onOpenWriter: () => void;
  onExploreBooks: () => void;
  totalBooksCount: number;
  totalChaptersCount: number;
  totalWordsCount: number;
  isOwner?: boolean;
}

export const HukmHero: React.FC<HukmHeroProps> = ({
  onOpenWriter,
  onExploreBooks,
  totalBooksCount,
  totalChaptersCount,
  totalWordsCount,
  isOwner = false,
}) => {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-[#c59b27]/30 bg-gradient-to-r from-[#0a142c] via-[#091124] to-[#070d1e] p-5 sm:p-7 shadow-xl"
      dir="rtl"
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#d4af37]/10 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Motto */}
        <div className="flex items-center gap-4 text-right">
          <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[#c59b27]/50 bg-[#050a16] shadow-xl shadow-black/80">
            <img
              src={HUKM_LOGO}
              alt="حُكم | HUKM MEDIA"
              className="h-full w-full object-cover scale-105"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#c59b27]/15 border border-[#c59b27]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#f0cb69]">
                مكتبة القراءة الرسمية
              </span>
              <span className="text-xs text-[#d4af37] font-semibold">المؤسس: Dr/ Islam Mohamed</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-cairo mt-1">
              مرحباً بك في منصة <span className="gold-gradient-text">حُكم | HUKM MEDIA</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#cbd5e1] font-medium font-amiri mt-0.5 text-[#f0cb69]">
              «وعشان الموضوع مش زي ما إنت فاكر… تعالى نعرف»
            </p>
          </div>
        </div>

        {/* Quick Highlights & Immediate Call to action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-[#070d1e]/80 border border-white/5 px-4 py-2 text-xs">
            <div>
              <span className="font-black text-[#f0cb69] block text-sm">{totalBooksCount}</span>
              <span className="text-[10px] text-[#94a3b8]">كتب ومشاريع</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="font-black text-white block text-sm">{totalChaptersCount}</span>
              <span className="text-[10px] text-[#94a3b8]">فصول جاهزة</span>
            </div>
          </div>

          {isOwner ? (
            <button
              onClick={onOpenWriter}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c59b27] to-[#997314] hover:from-[#f0cb69] hover:to-[#b88c1b] px-4 py-2.5 text-xs font-bold text-[#070d1e] shadow transition-transform hover:scale-102 cursor-pointer"
            >
              <PenTool className="h-4 w-4" />
              <span>استوديو التأليف</span>
            </button>
          ) : (
            <button
              onClick={onExploreBooks}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] px-4 py-2.5 text-xs font-black text-[#070d1e] shadow transition-transform hover:scale-102 cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              <span>تصفح الكتب أدناه</span>
              <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
