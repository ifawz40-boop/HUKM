import React from 'react';
import { Clock, BookOpen, ChevronLeft, Flame } from 'lucide-react';
import { Novel } from '../types/novel';

interface LatestChaptersFeedProps {
  novels: Novel[];
  onReadChapter: (novelId: string, chapterNumber: number) => void;
  onOpenNovel: (novelId: string) => void;
}

export const LatestChaptersFeed: React.FC<LatestChaptersFeedProps> = ({
  novels,
  onReadChapter,
  onOpenNovel,
}) => {
  // Generate realistic latest releases from novels
  const recentUpdates = novels.map((n, index) => {
    const times = ['منذ 18 دقيقة', 'منذ ساعة', 'منذ ساعتين', 'منذ 4 ساعات', 'اليوم', 'أمس'];
    return {
      novel: n,
      chapterNumber: n.latestChapter.number,
      chapterTitle: n.latestChapter.title,
      timeAgo: times[index % times.length],
      isNew: index < 2,
    };
  });

  return (
    <div className="rounded-2xl border border-amber-900/20 bg-[#1c1815] p-5">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-cairo">أحدث الفصول المُضافة</h2>
            <p className="text-xs text-[#9c9182]">فصول جديدة يتم تحديثها ونشرها يومياً</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
          مباشر
        </span>
      </div>

      <div className="space-y-3">
        {recentUpdates.map((item) => (
          <div
            key={`${item.novel.id}-${item.chapterNumber}`}
            className="group flex items-center justify-between gap-3 rounded-xl p-2.5 transition-all hover:bg-[#25201b] border border-transparent hover:border-amber-900/30"
          >
            {/* Novel Info & Thumbnail */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => onOpenNovel(item.novel.id)}
                className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-[#2a241e] border border-white/5 group-hover:border-amber-500/30"
              >
                <img
                  src={item.novel.cover}
                  alt={item.novel.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                />
              </button>

              <div className="text-right min-w-0">
                <button
                  onClick={() => onOpenNovel(item.novel.id)}
                  className="block text-sm font-bold text-white hover:text-amber-400 transition-colors truncate font-cairo"
                >
                  {item.novel.title}
                </button>
                <div className="flex items-center gap-2 text-xs text-[#8f8577] mt-0.5">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="h-3 w-3 text-amber-500/80" />
                    {item.timeAgo}
                  </span>
                  <span>·</span>
                  <span className="truncate">{item.novel.translator}</span>
                </div>
              </div>
            </div>

            {/* Read Chapter CTA */}
            <button
              onClick={() => onReadChapter(item.novel.id, item.chapterNumber)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#2b241d] group-hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-[#f0e6d6] group-hover:text-[#141210] transition-all shadow-sm"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>فصل {item.chapterNumber}</span>
              <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
