import React from 'react';
import { BookOpen, Sparkles, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string, novelId?: string) => void;
  featuredNovelId: string;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, featuredNovelId }) => {
  return (
    <footer className="mt-20 border-t border-amber-900/20 bg-[#12100e] text-[#a89f91]" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3 text-right">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-[#141210] font-black shadow-md">
                T
              </div>
              <span className="text-xl font-black text-white font-cairo">TruthNovel</span>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                تروث نوفل
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#8f8577] max-w-md">
              منصة عربية متطورة لقراءة الروايات المترجمة والمؤلفة، بتجربة قراءة مخصصة هادئة،
              أرشيف متكامل لرواية "لورد الحقيقة" وفصول محدثة يومياً، ومجتمع نقاش حيّ للقرّاء.
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-3 text-right">
            <h4 className="text-sm font-bold text-white font-cairo">استكشف الروايات</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('explore')}
                  className="hover:text-amber-400 transition-colors"
                >
                  كل الروايات المتاحة
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('popular')}
                  className="hover:text-amber-400 transition-colors"
                >
                  الروايات الأكثر قراءة
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('completed')}
                  className="hover:text-amber-400 transition-colors"
                >
                  روايات مكتملة الترجمة
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('novel-detail', featuredNovelId)}
                  className="hover:text-amber-400 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>رواية لورد الحقيقة</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Account & Library */}
          <div className="space-y-3 text-right">
            <h4 className="text-sm font-bold text-white font-cairo">المكتبة والمجتمع</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('library')}
                  className="hover:text-amber-400 transition-colors"
                >
                  مكتبتي وسجل القراءة
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('explore')}
                  className="hover:text-amber-400 transition-colors"
                >
                  أحدث الفصول اليومية
                </button>
              </li>
              <li>
                <span className="text-[#696053]">وضع القراءة السريع</span>
              </li>
              <li>
                <span className="text-[#696053]">سياسة حقوق النشر</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright notice */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-6 text-xs text-[#6e6355] text-center gap-2">
          <p>جميع الحقوق محفوظة لأصحابها والمؤلفين الأصليين · TruthNovel Platform</p>
          <p className="flex items-center gap-1">
            صُنع بحب <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> لمجتمع عشاق الروايات العربية
          </p>
        </div>
      </div>
    </footer>
  );
};
