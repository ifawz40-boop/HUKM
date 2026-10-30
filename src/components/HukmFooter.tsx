import React from 'react';
import { Sparkles, Video, Mic, Twitter, Instagram, Heart } from 'lucide-react';
import { HUKM_LOGO, HUKM_MOTTO, HUKM_DESCRIPTION } from '../data/hukmData';
interface HukmFooterProps {
  onNavigate: (view: string, categoryId?: string) => void;
}

export const HukmFooter: React.FC<HukmFooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-20 border-t border-[#c59b27]/25 bg-[#050914] text-[#94a3b8]" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3 text-right">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl overflow-hidden border border-[#c59b27]/40 p-0.5 bg-[#0a1226]">
                <img
                  src={HUKM_LOGO}
                  alt="حُكم"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <span className="text-xl font-black text-white font-cairo">
                  حُكم | HUKM MEDIA
                </span>
                <p className="text-xs text-[#d4af37] font-bold">نبحث، نفكك، ونفهم.</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-[#cbd5e1] max-w-lg font-cairo">
              {HUKM_DESCRIPTION}
            </p>

            <p className="text-xs font-bold text-[#f0cb69] font-tajawal pt-1">
              {HUKM_MOTTO}
            </p>
          </div>

          {/* Pillars */}
          <div className="space-y-3 text-right">
            <h4 className="text-sm font-bold text-white font-cairo">المسارات المعرفية</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('category', 'investigations')}
                  className="hover:text-[#f0cb69] transition-colors"
                >
                  سلسلة «مش زي ما إنت فاكر»
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('category', 'science_tech')}
                  className="hover:text-[#f0cb69] transition-colors"
                >
                  العلوم والتكنولوجيا والذكاء الاصطناعي
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('category', 'history')}
                  className="hover:text-[#f0cb69] transition-colors"
                >
                  التاريخ والتحقيقات الوثائقية
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('category', 'philosophy')}
                  className="hover:text-[#f0cb69] transition-colors"
                >
                  الفلسفة والتفكير النقدي
                </button>
              </li>
            </ul>
          </div>

          {/* Social Platforms & Studio */}
          <div className="space-y-3 text-right">
            <h4 className="text-sm font-bold text-white font-cairo">منصات المحتوى</h4>
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex items-center gap-2 text-[#cbd5e1]">
                <Video className="h-3.5 w-3.5 text-rose-500" />
                <span>قناة اليوتيوب الوثائقية</span>
              </span>
              <span className="flex items-center gap-2 text-[#cbd5e1]">
                <Mic className="h-3.5 w-3.5 text-purple-400" />
                <span>بودكاست حُكم الصوتي</span>
              </span>
              <span className="flex items-center gap-2 text-[#cbd5e1]">
                <Twitter className="h-3.5 w-3.5 text-sky-400" />
                <span>ثريدات وبحوث على منصة X</span>
              </span>
              <span className="flex items-center gap-2 text-[#cbd5e1]">
                <Instagram className="h-3.5 w-3.5 text-pink-400" />
                <span>اقتباسات إنستغرام وتيك توك</span>
              </span>
            </div>
          </div>
        </div>

        {/* Copyright notice */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-6 text-xs text-[#64748b] gap-2">
          <p>جميع الحقوق الفكرية والمادية محفوظة © حُكم | HUKM MEDIA</p>
          <p className="flex items-center gap-1">
            صُنع لخدمة صناع المحتوى والباحثين في العالم العربي
          </p>
        </div>
      </div>
    </footer>
  );
};
