import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Star,
  Share2,
  Calendar,
  User,
  ShieldAlert,
  ArrowUpDown,
  Search,
  MessageSquare,
  Sparkles,
  Layers,
  CheckCircle,
  Eye,
  Check,
} from 'lucide-react';
import { Novel, Chapter, Comment, LibraryCategory } from '../types/novel';
import { formatArabicNumber, searchChapters } from '../utils/readingEngine';

interface NovelDetailsViewProps {
  novel: Novel;
  chapters: Chapter[];
  onBack: () => void;
  onReadChapter: (chapterNumber: number) => void;
  bookmarkCategory?: LibraryCategory;
  onSetBookmarkCategory: (cat: LibraryCategory) => void;
  lastReadChapterNumber?: number;
  comments: Comment[];
  onAddComment: (comment: { content: string; isSpoiler: boolean }) => void;
  onLikeComment: (commentId: string) => void;
}

export const NovelDetailsView: React.FC<NovelDetailsViewProps> = ({
  novel,
  chapters,
  onBack,
  onReadChapter,
  bookmarkCategory,
  onSetBookmarkCategory,
  lastReadChapterNumber,
  comments,
  onAddComment,
  onLikeComment,
}) => {
  const [activeTab, setActiveTab] = useState<'chapters' | 'lore' | 'discussions'>('chapters');
  const [chapterSearch, setChapterSearch] = useState('');
  const [sortAscending, setSortAscending] = useState(true);
  const [copiedShare, setCopiedShare] = useState(false);

  // Comments inside details
  const [newCommentText, setNewCommentText] = useState('');

  // Filter and sort chapters
  const filteredChapters = searchChapters(chapters, chapterSearch);
  const displayChapters = [...filteredChapters].sort((a, b) =>
    sortAscending ? a.chapterNumber - b.chapterNumber : b.chapterNumber - a.chapterNumber
  );

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment({ content: newCommentText.trim(), isSpoiler: false });
    setNewCommentText('');
  };

  return (
    <div className="min-h-screen bg-[#141210] text-[#f4efe6] pb-16" dir="rtl">
      {/* Top Breadcrumb & Back Bar */}
      <div className="border-b border-amber-900/20 bg-[#191613]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-semibold text-[#c7bfb3] hover:text-white transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للرئيسية</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg bg-[#241f1a] px-3 py-1.5 text-xs text-[#c7bfb3] hover:text-white transition-colors border border-white/5"
            >
              {copiedShare ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">تم نسخ الرابط!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>مشاركة الرواية</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Novel Profile Header */}
      <section className="relative overflow-hidden border-b border-amber-900/20 bg-gradient-to-b from-[#1f1a16] to-[#141210] py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8 lg:gap-10 items-start">
            {/* Book Cover */}
            <div className="relative mx-auto md:mx-0 w-52 sm:w-64 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-500/30 shadow-2xl">
              <img
                src={novel.cover}
                alt={novel.title}
                className="aspect-[3/4] w-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-bold shadow ${
                    novel.status === 'COMPLETED' ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}
                >
                  {novel.status === 'COMPLETED' ? 'مكتملة' : 'مستمرة'}
                </span>
              </div>
            </div>

            {/* Novel Info & Actions */}
            <div className="flex-1 space-y-4 text-right">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-md bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                    رواية مترجمة
                  </span>
                  <span className="text-xs text-[#9c9182]">سنة النشر: {novel.year}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-cairo">
                  {novel.title}
                </h1>
                <p className="text-base text-amber-400/80 font-sans mt-1">
                  {novel.titleOriginal}
                </p>
              </div>

              {/* Author & Translator */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#b8afa3]">
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-amber-500" />
                  <span>المؤلف: </span>
                  <strong className="text-white">{novel.author}</strong>
                </div>
                <span>·</span>
                <div>
                  <span>المترجم: </span>
                  <strong className="text-white">{novel.translator}</strong>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-[#1d1915] p-3.5 border border-white/5 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-lg">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{novel.rating}</span>
                  </div>
                  <span className="text-[11px] text-[#8f8577]">
                    {formatArabicNumber(novel.ratingCount)} تقييم
                  </span>
                </div>
                <div>
                  <div className="font-bold text-white text-lg">{novel.chaptersCount}</div>
                  <span className="text-[11px] text-[#8f8577]">فصل متاح</span>
                </div>
                <div>
                  <div className="font-bold text-white text-lg">
                    {formatArabicNumber(novel.views)}
                  </div>
                  <span className="text-[11px] text-[#8f8577]">إجمالي القراءات</span>
                </div>
                <div>
                  <div className="font-bold text-white text-lg">
                    {formatArabicNumber(novel.bookmarksCount)}
                  </div>
                  <span className="text-[11px] text-[#8f8577]">في المفضلة</span>
                </div>
              </div>

              {/* Synopsis */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-amber-400">القصة والنبذة:</h3>
                <p className="text-sm sm:text-base leading-relaxed text-[#c7bfb3]">
                  {novel.synopsis}
                </p>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {novel.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-lg bg-[#27211b] px-3 py-1 text-xs text-[#d6cec2] border border-amber-900/30"
                  >
                    #{g}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                {lastReadChapterNumber ? (
                  <button
                    onClick={() => onReadChapter(lastReadChapterNumber)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-6 py-3 text-sm font-bold text-[#141210] shadow-lg shadow-amber-950/40 transition-all hover:scale-105 active:scale-95"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>متابعة القراءة: الفصل {lastReadChapterNumber}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onReadChapter(1)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-6 py-3 text-sm font-bold text-[#141210] shadow-lg shadow-amber-950/40 transition-all hover:scale-105 active:scale-95"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>ابدأ القراءة: الفصل 1</span>
                  </button>
                )}

                {/* Bookmark selector dropdown */}
                <div className="flex items-center gap-1 rounded-xl bg-[#25201a] border border-white/10 p-1">
                  <Bookmark
                    className={`h-4 w-4 mr-2 ${
                      bookmarkCategory ? 'fill-amber-400 text-amber-400' : 'text-[#8f8577]'
                    }`}
                  />
                  <select
                    value={bookmarkCategory || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        onSetBookmarkCategory(e.target.value as LibraryCategory);
                      }
                    }}
                    className="bg-transparent text-xs font-semibold text-[#f4efe6] focus:outline-none p-1.5 cursor-pointer"
                  >
                    <option value="" className="bg-[#1e1a16] text-[#8f8577]">
                      + أضف إلى المكتبة
                    </option>
                    <option value="reading" className="bg-[#1e1a16] text-white">
                      أقرأها حالياً
                    </option>
                    <option value="favorites" className="bg-[#1e1a16] text-white">
                      المفضلة
                    </option>
                    <option value="plan_to_read" className="bg-[#1e1a16] text-white">
                      أرغب بقراءتها
                    </option>
                    <option value="completed" className="bg-[#1e1a16] text-white">
                      أنهيتها
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <div className="border-b border-amber-900/20 bg-[#161412]">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('chapters')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'chapters'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-[#9c9182] hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>فهرس الفصول ({novel.chaptersCount})</span>
          </button>

          {novel.lore && (
            <button
              onClick={() => setActiveTab('lore')}
              className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'lore'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-[#9c9182] hover:text-white'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>عالم وقوانين الرواية (Lore)</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('discussions')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'discussions'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-[#9c9182] hover:text-white'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>المناقشات والتقييمات ({comments.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* Tab 1: Chapters Index */}
        {activeTab === 'chapters' && (
          <div className="space-y-6">
            {/* Search and Sort Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl bg-[#1c1815] p-3.5 border border-amber-900/20">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8f8577]" />
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder="ابحث برقم الفصل أو العنوان..."
                  className="w-full rounded-xl bg-[#241f1a] pr-9 pl-4 py-2 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortAscending(!sortAscending)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#241f1a] px-3.5 py-2 text-xs font-semibold text-[#c7bfb3] hover:text-white border border-white/5 transition-colors"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-amber-500" />
                  <span>{sortAscending ? 'من الأول للأخير' : 'من الأحدث للأول'}</span>
                </button>
              </div>
            </div>

            {/* Chapters Grid / List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {displayChapters.map((ch) => {
                const isCurrentRead = lastReadChapterNumber === ch.chapterNumber;

                return (
                  <button
                    key={ch.id}
                    onClick={() => onReadChapter(ch.chapterNumber)}
                    className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all text-right ${
                      isCurrentRead
                        ? 'bg-amber-600/15 border-amber-500/40 text-amber-300'
                        : 'bg-[#1b1714] border-white/5 hover:bg-[#25201b] hover:border-amber-900/30 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isCurrentRead
                            ? 'bg-amber-500 text-[#141210]'
                            : 'bg-[#25201a] text-[#a89f91] group-hover:text-amber-400'
                        }`}
                      >
                        {ch.chapterNumber}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold truncate group-hover:text-amber-400 transition-colors">
                          {ch.title}
                        </span>
                        <span className="text-[11px] text-[#7d7365]">
                          {ch.wordCount} كلمة · قراءة فورية
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrentRead && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                          آخر ما قرأت
                        </span>
                      )}
                      <span className="text-xs font-bold text-amber-500 opacity-80 group-hover:translate-x-[-2px] transition-transform">
                        اقرأ ←
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {displayChapters.length === 0 && (
              <div className="py-12 text-center text-[#8f8577]">
                <p>لم يتم العثور على فصول مطابقة للبحث.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Lore & Sequences */}
        {activeTab === 'lore' && novel.lore && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-amber-900/30 bg-[#1c1815] p-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-lg font-bold font-cairo">نظام القوى والمسارات الخارقة</h3>
              </div>
              <p className="text-sm text-[#c7bfb3] leading-relaxed">{novel.lore.overview}</p>
            </div>

            <div className="space-y-6">
              {novel.lore.paths.map((path) => (
                <div
                  key={path.pathName}
                  className="rounded-2xl border border-amber-900/20 bg-[#1a1613] p-6 space-y-4"
                >
                  <div className="border-b border-white/5 pb-3">
                    <h4 className="text-xl font-black text-amber-400 font-cairo">
                      {path.pathName}
                    </h4>
                    <p className="text-xs text-[#a89f91] mt-1">{path.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {path.sequences.map((seq) => (
                      <div
                        key={seq.sequenceNumber}
                        className="rounded-xl border border-white/5 bg-[#221d18] p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{seq.name}</span>
                          <span className="rounded bg-amber-600/20 px-2 py-0.5 text-xs font-bold text-amber-400">
                            تسلسل {seq.sequenceNumber}
                          </span>
                        </div>
                        {seq.potionIngredients && (
                          <p className="text-[11px] text-amber-300/80 font-mono">
                            ⚗️ الجرعة: {seq.potionIngredients}
                          </p>
                        )}
                        <p className="text-xs text-[#c7bfb3] leading-relaxed">{seq.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Discussions & Comments */}
        {activeTab === 'discussions' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* New Comment */}
            <form onSubmit={handleCommentSubmit} className="rounded-2xl bg-[#1c1815] p-4 border border-amber-900/30 space-y-3">
              <h3 className="text-sm font-bold text-white font-cairo">
                اكتب مراجعتك أو تقييمك للرواية
              </h3>
              <textarea
                rows={3}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="ما رأيك في حبكة الرواية وجودة الترجمة والشخصيات؟"
                className="w-full rounded-xl bg-[#141210] p-3 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow disabled:opacity-40"
                >
                  إرسال المراجعة
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3">
              {comments.map((comm) => (
                <div
                  key={comm.id}
                  className="rounded-xl border border-white/5 bg-[#1a1714] p-4 text-right space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={comm.avatar}
                        alt={comm.authorName}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <div>
                        <span className="text-xs font-bold text-white">{comm.authorName}</span>
                        <p className="text-[10px] text-[#7d7365]">عضو نشط</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onLikeComment(comm.id)}
                      className="flex items-center gap-1 text-xs text-[#9c9182] hover:text-amber-400"
                    >
                      <span>👍 {comm.likes}</span>
                    </button>
                  </div>
                  <p className="text-sm text-[#d6cec2] leading-relaxed">{comm.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
