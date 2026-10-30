import React, { useState } from 'react';
import { X, Plus, BookOpen, AlertCircle, Check } from 'lucide-react';
import { Novel, Chapter, NovelStatus } from '../types/novel';

interface AddNovelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNovel: (novel: Novel, initialChapter: Chapter) => void;
}

export const AddNovelModal: React.FC<AddNovelModalProps> = ({
  isOpen,
  onClose,
  onAddNovel,
}) => {
  const [title, setTitle] = useState('');
  const [titleEnglish, setTitleEnglish] = useState('');
  const [author, setAuthor] = useState('');
  const [translator, setTranslator] = useState('');
  const [status, setStatus] = useState<NovelStatus>('ONGOING');
  const [genres, setGenres] = useState('فانتازيا, غموض, مغامرة');
  const [synopsis, setSynopsis] = useState('');
  const [coverUrl, setCoverUrl] = useState(
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=700&q=80'
  );
  const [chapterTitle, setChapterTitle] = useState('الفصل الأول: فجر المغامرة');
  const [chapterContent, setChapterContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى إدخال عنوان الرواية');
      return;
    }
    if (!author.trim()) {
      setError('يرجى إدخال اسم المؤلف');
      return;
    }
    if (!synopsis.trim()) {
      setError('يرجى كتابة نبذة أو ملخص عن الرواية');
      return;
    }
    if (!chapterContent.trim()) {
      setError('يرجى كتابة أو لصق محتوى الفصل الأول على الأقل');
      return;
    }

    const novelId = `novel-${Date.now()}`;
    const chapterId = `ch-${Date.now()}`;

    const parsedGenres = genres
      .split(',')
      .map((g) => g.trim())
      .filter((g) => g.length > 0);

    const paragraphs = chapterContent
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const newNovel: Novel = {
      id: novelId,
      title: title.trim(),
      titleOriginal: titleEnglish.trim() || title.trim(),
      cover: coverUrl.trim(),
      author: author.trim(),
      translator: translator.trim() || 'فريق تروث نوفل',
      status: status,
      rating: 5.0,
      ratingCount: 1,
      views: 1,
      bookmarksCount: 1,
      genres: parsedGenres.length > 0 ? parsedGenres : ['عام'],
      synopsis: synopsis.trim(),
      year: new Date().getFullYear(),
      latestChapter: {
        number: 1,
        title: chapterTitle.trim(),
        releaseDate: new Date().toISOString(),
      },
      chaptersCount: 1,
    };

    const newChapter: Chapter = {
      id: chapterId,
      novelId: novelId,
      chapterNumber: 1,
      title: chapterTitle.trim(),
      releaseDate: new Date().toISOString(),
      wordCount: chapterContent.split(/\s+/).length,
      content: paragraphs,
      views: 1,
      likes: 1,
    };

    onAddNovel(newNovel, newChapter);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto" dir="rtl">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-amber-900/40 bg-[#1c1815] p-6 shadow-2xl text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <h3 className="text-lg font-bold text-white font-cairo">اقتراح / إضافة رواية جديدة</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#8f8577] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-white font-cairo">
              تمت إضافة الرواية والفصل الأول بنجاح!
            </h4>
            <p className="text-xs text-[#a89f91]">يمكنك الآن تصفحها وقراءتها مباشرة على المنصة.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  عنوان الرواية (بالعربية) *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: لورد الغموض الجديد"
                  className="w-full rounded-xl bg-[#241f1a] p-2.5 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  الاسم الأصلي / الإنجليزي
                </label>
                <input
                  type="text"
                  value={titleEnglish}
                  onChange={(e) => setTitleEnglish(e.target.value)}
                  placeholder="مثال: Lord of Mysteries"
                  className="w-full rounded-xl bg-[#241f1a] p-2.5 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">المؤلف *</label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="اسم الكاتب"
                  className="w-full rounded-xl bg-[#241f1a] p-2.5 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">المترجم</label>
                <input
                  type="text"
                  value={translator}
                  onChange={(e) => setTranslator(e.target.value)}
                  placeholder="اسم المترجم أو الفريق"
                  className="w-full rounded-xl bg-[#241f1a] p-2.5 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">حالة الرواية</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as NovelStatus)}
                  className="w-full rounded-xl bg-[#241f1a] p-2.5 text-sm text-white border border-white/5 focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="ONGOING">مستمرة</option>
                  <option value="COMPLETED">مكتملة</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">
                التصنيفات (مفصولة بفاصلة)
              </label>
              <input
                type="text"
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                placeholder="فانتازيا, سحر, أكشن, تناسخ"
                className="w-full rounded-xl bg-[#241f1a] p-2.5 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">
                رابط صورة الغلاف (Cover URL)
              </label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-xl bg-[#241f1a] p-2.5 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">
                نبذة وقصة الرواية *
              </label>
              <textarea
                rows={3}
                required
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="صف ملخص حبكة الرواية وشخصياتها..."
                className="w-full rounded-xl bg-[#241f1a] p-2.5 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <h4 className="text-sm font-bold text-white font-cairo">محتوى الفصل الأول</h4>
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">عنوان الفصل *</label>
                <input
                  type="text"
                  required
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  className="w-full rounded-xl bg-[#241f1a] p-2.5 text-sm text-white border border-white/5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">نص الفصل *</label>
                <textarea
                  rows={4}
                  required
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  placeholder="الصق نص الفصل الأول هنا (كل سطر يعتبر فقرة قراءة مستقلة)..."
                  className="w-full rounded-xl bg-[#241f1a] p-2.5 text-sm text-white placeholder-[#7d7365] border border-white/5 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[#8f8577] hover:text-white"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة الرواية للمكتبة</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
