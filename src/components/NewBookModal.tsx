import React, { useState } from 'react';
import { X, Plus, BookOpen, AlertCircle, Eye, Loader2 } from 'lucide-react';
import { BookProject, CategoryItem, MediaType, PublishingStatus } from '../types/hukm';

interface NewBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  onCreateBook: (book: BookProject) => void | Promise<boolean>;
}

export const NewBookModal: React.FC<NewBookModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCreateBook,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('إبراهيم فوزي');
  const [category, setCategory] = useState<string>(categories[0]?.id || 'investigations');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<PublishingStatus>('draft'); // Draft by default for safety
  const [motto, setMotto] = useState('«وعشان الموضوع مش زي ما إنت فاكر… تعالى نعرف.»');
  const [initialViews, setInitialViews] = useState<number>(3500);
  const [coverType, setCoverType] = useState<MediaType>('image');
  const [coverImage, setCoverImage] = useState(
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80'
  );
  const [firstChapterTitle, setFirstChapterTitle] = useState('الفصل الأول: البداية وطرح السؤال');
  const [firstChapterContent, setFirstChapterContent] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('يرجى إدخال عنوان الكتاب');
      return;
    }
    if (!summary.trim()) {
      setError('يرجى كتابة نبذة تمهيدية عن موضوع البحث');
      return;
    }

    const paragraphs = firstChapterContent
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Publishing integrity validation: Cannot publish an empty book without ready content!
    const isPublishedMode = ['published', 'completed', 'ongoing', 'ready'].includes(status);
    if (isPublishedMode && paragraphs.length === 0) {
      setError('لا يمكن نشر الكتاب كـ منشور (published) دون وجود فصل واحد على الأقل بمحتوى حقيقي. يرجى إدخال محتوى الفصل الأول أو حفظ الكتاب كمسودة (draft) لاستكماله لاحقاً.');
      return;
    }

    const bookId = `book-${Date.now()}`;
    const chapterId = `ch-${Date.now()}`;
    const parsedViews = Number(initialViews) >= 0 ? Number(initialViews) : 0;

    // Build chapters cleanly without any fake or placeholder content
    const chapters = [];
    if (paragraphs.length > 0) {
      chapters.push({
        id: chapterId,
        bookId: bookId,
        chapterNumber: 1,
        title: firstChapterTitle.trim() || 'الفصل الأول',
        subtitle: 'مدخل استقصائي',
        content: paragraphs,
        references: [],
        status: (isPublishedMode ? 'ready' : 'draft') as 'ready' | 'draft',
        wordCount: paragraphs.join(' ').split(/\s+/).filter(Boolean).length,
        readingTimeMinutes: Math.max(1, Math.ceil(paragraphs.join(' ').split(/\s+/).filter(Boolean).length / 200)),
        viewsCount: parsedViews,
        updatedAt: new Date().toISOString(),
      });
    }

    const newBook: BookProject = {
      id: bookId,
      title: title.trim(),
      subtitle: subtitle.trim() || 'مشروع بحثي موثق من حُكم | HUKM MEDIA',
      author: author.trim() || 'إبراهيم فوزي',
      category: category,
      coverImage: coverImage.trim(),
      coverMediaType: coverType,
      status: status,
      summary: summary.trim(),
      motto: motto.trim(),
      viewsCount: parsedViews,
      socialLinks: {},
      sources: [],
      quotes: [],
      chapters: chapters,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      const result = await onCreateBook(newBook);
      // Explicitly check for boolean failure: if false, retain modal state and do NOT close
      if (result === false) {
        setError('فشل حفظ الكتاب سحابياً في قاعدة البيانات. تم الاحتفاظ ببياناتك للمحاولة مجدداً.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع أثناء حفظ الكتاب. يرجى التحقق من الاتصال والمحاولة لاحقاً.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
      <div className="relative my-8 w-full max-w-xl rounded-2xl border border-[#c59b27]/40 bg-[#0a1226] p-6 shadow-2xl text-right">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c59b27]/20 border border-[#c59b27]/40 text-[#f0cb69]">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-cairo">
                  رفع / نشر مشروع كتاب جديد
                </h3>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.2 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  حساب الناشر الرسمي
                </span>
              </div>
              <p className="text-[11px] text-[#94a3b8]">حُكم | HUKM MEDIA - نبحث، نفكك، ونفهم</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-[#64748b] hover:text-white disabled:opacity-50"
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pl-1">
          <div>
            <label className="block text-xs font-bold text-[#d4af37] mb-1">
              عنوان الكتاب / البحث *
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تشريح السقوط: كيف تنهار الحضارات من الداخل؟"
              className="w-full rounded-xl bg-[#070d1e] p-2.5 text-sm font-bold text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#d4af37] mb-1">
              العنوان الفرعي
            </label>
            <input
              type="text"
              disabled={isSubmitting}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="مثال: قراءة في دفاتر الإمبراطوريات القديمة والحديثة"
              className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#f0cb69] mb-1">
                اسم الكاتب والباحث
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="مثال: إبراهيم فوزي"
                className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs font-bold text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#d4af37] mb-1">
                حالة النشر الأولية *
              </label>
              <select
                disabled={isSubmitting}
                value={status}
                onChange={(e) => setStatus(e.target.value as PublishingStatus)}
                className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs font-semibold text-white border border-white/10 focus:border-[#d4af37] focus:outline-none cursor-pointer"
              >
                <option value="draft">مسودة خاصة (Draft - قيد الإعداد)</option>
                <option value="published">منشور للجمهور (Published - يتطلب محتوى)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#d4af37] mb-1">
                القسم / المسار المعرفي
              </label>
              <select
                disabled={isSubmitting}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs font-semibold text-white border border-white/10 focus:border-[#d4af37] focus:outline-none cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#f0cb69] mb-1">
                <Eye className="h-3.5 w-3.5 text-[#d4af37]" />
                <span>المشاهدات المبدئية عند النشر:</span>
              </label>
              <input
                type="number"
                min={0}
                disabled={isSubmitting}
                value={initialViews}
                onChange={(e) => setInitialViews(Number(e.target.value))}
                placeholder="مثال: 5000"
                className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs font-bold text-[#f0cb69] border border-[#c59b27]/40 focus:border-[#d4af37] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#d4af37] mb-1">
              نبذة تمهيدية ومحاور الكتاب *
            </label>
            <textarea
              rows={3}
              required
              disabled={isSubmitting}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="صف باختصار الفكرة المركزية للكتاب والأسئلة التي يفككها..."
              className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
            />
          </div>

          <div className="border-t border-white/10 pt-3 space-y-3">
            <h4 className="text-xs font-bold text-white font-cairo">بيانات ومحتوى الفصل الأول (اختياري عند الحفظ كمسودة):</h4>
            <div>
              <label className="block text-xs font-bold text-[#d4af37] mb-1">
                عنوان الفصل الأول
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={firstChapterTitle}
                onChange={(e) => setFirstChapterTitle(e.target.value)}
                className="w-full rounded-xl bg-[#070d1e] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#d4af37] mb-1">
                نص الفصل الأول (اتركه فارغاً إذا كنت ترغب في كتابته لاحقاً في الاستوديو)
              </label>
              <textarea
                rows={3}
                disabled={isSubmitting}
                value={firstChapterContent}
                onChange={(e) => setFirstChapterContent(e.target.value)}
                placeholder="الصق نص الفصل الأول هنا (افصل بين الفقرات بسطر فارغ)..."
                className="w-full rounded-xl bg-[#070d1e] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none font-cairo"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[#94a3b8] hover:text-white disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] px-6 py-2.5 text-xs font-bold text-[#070d1e] shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جارٍ الحفظ والمزامنة...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>{status === 'published' ? 'نشر وتأكيد الرفع' : 'حفظ كمسودة في الاستوديو'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
