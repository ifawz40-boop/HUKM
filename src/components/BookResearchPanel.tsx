import React, { useEffect, useMemo, useState } from 'react';
import { BookProject } from '../types/hukm';
import { BookOpen, ExternalLink, FileText, Plus, Quote, Save, Trash2 } from 'lucide-react';

type RawEntry = Record<string, unknown>;

interface BookResearchPanelProps {
  book: BookProject | null;
  onUpdateBook: (updatedBook: BookProject) => void | Promise<boolean>;
  onShowToast: (message: string) => void;
}

const isRecord = (value: unknown): value is RawEntry =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

const makeEntryId = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36)}`;

export const BookResearchPanel: React.FC<BookResearchPanelProps> = ({
  book,
  onUpdateBook,
  onShowToast,
}) => {
  const [sources, setSources] = useState<unknown[]>([]);
  const [quotes, setQuotes] = useState<unknown[]>([]);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceAuthor, setSourceAuthor] = useState('');
  const [sourcePublisher, setSourcePublisher] = useState('');
  const [sourceYear, setSourceYear] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceNote, setSourceNote] = useState('');
  const [quoteText, setQuoteText] = useState('');
  const [quoteSourceId, setQuoteSourceId] = useState('');
  const [quotePage, setQuotePage] = useState('');
  const [quoteNote, setQuoteNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSources(Array.isArray(book?.sources) ? book.sources : []);
    setQuotes(Array.isArray(book?.quotes) ? book.quotes : []);
    setSourceTitle('');
    setSourceAuthor('');
    setSourcePublisher('');
    setSourceYear('');
    setSourceUrl('');
    setSourceNote('');
    setQuoteText('');
    setQuoteSourceId('');
    setQuotePage('');
    setQuoteNote('');
  }, [book?.id]);

  const selectableSources = useMemo(
    () =>
      sources.flatMap((item, index) => {
        if (!isRecord(item) || typeof item.id !== 'string' || !item.id) return [];
        const title = readText(item.title) || readText(item.name) || `مصدر ${index + 1}`;
        return [{ id: item.id, title }];
      }),
    [sources],
  );

  if (!book) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0a1329] p-8 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-[#c59b27]" />
        <h3 className="mt-3 text-base font-bold text-white">اختر كتابًا أولًا</h3>
        <p className="mt-2 text-xs leading-relaxed text-[#94a3b8]">يمكنك تنظيم المراجع والاقتباسات بعد اختيار عمل من مكتبة الاستوديو.</p>
      </div>
    );
  }

  const handleAddSource = () => {
    if (!sourceTitle.trim()) {
      onShowToast('اكتب عنوان المصدر أولًا.');
      return;
    }
    if (sources.length >= 100) {
      onShowToast('وصلت إلى الحد الأقصى للمراجع في هذا العمل (100).');
      return;
    }
    if (sourceUrl.trim()) {
      try {
        const parsed = new URL(sourceUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
      } catch {
        onShowToast('رابط المصدر غير صالح. استخدم رابط HTTP أو HTTPS.');
        return;
      }
    }

    setSources((current) => [
      ...current,
      {
        id: makeEntryId('source'),
        title: sourceTitle.trim().slice(0, 200),
        author: sourceAuthor.trim().slice(0, 150),
        publisher: sourcePublisher.trim().slice(0, 150),
        year: sourceYear.trim().slice(0, 4),
        url: sourceUrl.trim().slice(0, 2048),
        note: sourceNote.trim().slice(0, 1000),
        createdAt: new Date().toISOString(),
      },
    ]);
    setSourceTitle('');
    setSourceAuthor('');
    setSourcePublisher('');
    setSourceYear('');
    setSourceUrl('');
    setSourceNote('');
  };

  const handleAddQuote = () => {
    if (!quoteText.trim()) {
      onShowToast('اكتب نص الاقتباس أولًا.');
      return;
    }
    if (quotes.length >= 200) {
      onShowToast('وصلت إلى الحد الأقصى للاقتباسات في هذا العمل (200).');
      return;
    }
    setQuotes((current) => [
      ...current,
      {
        id: makeEntryId('quote'),
        text: quoteText.trim().slice(0, 4000),
        sourceId: quoteSourceId || '',
        page: quotePage.trim().slice(0, 40),
        note: quoteNote.trim().slice(0, 500),
        createdAt: new Date().toISOString(),
      },
    ]);
    setQuoteText('');
    setQuoteSourceId('');
    setQuotePage('');
    setQuoteNote('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await onUpdateBook({
        ...book,
        sources,
        quotes,
        updatedAt: new Date().toISOString(),
      });
      if (result === false) {
        onShowToast('تعذر حفظ المراجع والاقتباسات سحابيًا. احتفظنا بالتعديلات في هذه الجلسة.');
        return;
      }
      onShowToast('تم حفظ ملف البحث ومراجعه بنجاح.');
    } catch {
      onShowToast('حدث خطأ أثناء حفظ ملف البحث.');
    } finally {
      setIsSaving(false);
    }
  };

  const sourceTitleFor = (sourceId: string) =>
    selectableSources.find((source) => source.id === sourceId)?.title || 'مصدر غير محدد';

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#c59b27]/25 bg-[#0a1329] p-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black text-white font-cairo">
            <BookOpen className="h-5 w-5 text-[#d4af37]" />
            ملف البحث والمراجع
          </h2>
          <p className="mt-1 text-xs text-[#94a3b8]">«{book.title}» — اجمع المصادر والاقتباسات في مكان واحد قبل النشر</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-4 py-2.5 text-xs font-black text-[#070d1e] shadow transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'جارٍ الحفظ...' : 'حفظ ملف البحث'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#0a1329] p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#f0cb69]">
              <FileText className="h-4 w-4" /> مصادر ومراجع البحث
            </h3>
            <span className="text-[10px] text-[#94a3b8]">{sources.length} / 100</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)} maxLength={200} placeholder="عنوان المصدر *" className="rounded-xl border border-white/10 bg-[#050a16] px-3 py-2.5 text-xs text-white outline-none focus:border-[#c59b27] sm:col-span-2" />
            <input value={sourceAuthor} onChange={(e) => setSourceAuthor(e.target.value)} maxLength={150} placeholder="المؤلف / الجهة" className="rounded-xl border border-white/10 bg-[#050a16] px-3 py-2.5 text-xs text-white outline-none focus:border-[#c59b27]" />
            <input value={sourcePublisher} onChange={(e) => setSourcePublisher(e.target.value)} maxLength={150} placeholder="الناشر / الدورية / الأرشيف" className="rounded-xl border border-white/10 bg-[#050a16] px-3 py-2.5 text-xs text-white outline-none focus:border-[#c59b27]" />
            <input value={sourceYear} onChange={(e) => setSourceYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} inputMode="numeric" placeholder="سنة النشر" className="rounded-xl border border-white/10 bg-[#050a16] px-3 py-2.5 text-xs text-white outline-none focus:border-[#c59b27]" />
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} type="url" maxLength={2048} placeholder="رابط المصدر (اختياري)" className="rounded-xl border border-white/10 bg-[#050a16] px-3 py-2.5 text-xs text-white outline-none focus:border-[#c59b27]" />
            <textarea value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} maxLength={1000} rows={2} placeholder="ملاحظات حول موثوقية المصدر أو موضع الاستفادة منه" className="rounded-xl border border-white/10 bg-[#050a16] px-3 py-2.5 text-xs text-white outline-none focus:border-[#c59b27] sm:col-span-2" />
          </div>

          <button type="button" onClick={handleAddSource} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c59b27]/40 bg-[#c59b27]/10 px-3 py-2 text-xs font-bold text-[#f0cb69] hover:bg-[#c59b27]/20">
            <Plus className="h-3.5 w-3.5" /> إضافة المصدر
          </button>

          <div className="space-y-2">
            {sources.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-[#64748b]">لم تضف مصادر لهذا الكتاب بعد.</p>
            ) : sources.map((item, index) => {
              const record = isRecord(item) ? item : {};
              const title = readText(record.title) || readText(record.name) || (typeof item === 'string' ? item : `مصدر محفوظ سابقًا ${index + 1}`);
              const author = readText(record.author);
              const publisher = readText(record.publisher);
              const year = readText(record.year);
              const url = readText(record.url);
              const id = readText(record.id);
              return (
                <div key={id || `legacy-source-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#070d1e] p-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-bold text-white">{title}</p>
                    <p className="text-[10px] text-[#94a3b8]">{[author, publisher, year].filter(Boolean).join(' • ') || 'بيانات وصفية غير متاحة'}</p>
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-[10px] text-[#f0cb69] hover:underline"><ExternalLink className="h-3 w-3 shrink-0" />{url}</a>}
                  </div>
                  <button type="button" onClick={() => setSources((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`حذف المصدر ${title}`} className="shrink-0 rounded-lg p-2 text-[#94a3b8] hover:bg-rose-500/10 hover:text-rose-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#0a1329] p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#f0cb69]">
              <Quote className="h-4 w-4" /> اقتباسات وملاحظات موثقة
            </h3>
            <span className="text-[10px] text-[#94a3b8]">{quotes.length} / 200</span>
          </div>

          <textarea value={quoteText} onChange={(e) => setQuoteText(e.target.value)} maxLength={4000} rows={4} placeholder="نص الاقتباس كما ورد في المصدر، مع الحفاظ على دقته..." className="w-full rounded-xl border border-white/10 bg-[#050a16] px-3 py-2.5 text-xs leading-relaxed text-white outline-none focus:border-[#c59b27]" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select value={quoteSourceId} onChange={(e) => setQuoteSourceId(e.target.value)} className="rounded-xl border border-white/10 bg-[#050a16] px-3 py-2.5 text-xs text-white outline-none focus:border-[#c59b27]">
              <option value="">اربط الاقتباس بمصدر (اختياري)</option>
              {selectableSources.map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}
            </select>
            <input value={quotePage} onChange={(e) => setQuotePage(e.target.value)} maxLength={40} placeholder="رقم الصفحة / الموضع" className="rounded-xl border border-white/10 bg-[#050a16] px-3 py-2.5 text-xs text-white outline-none focus:border-[#c59b27]" />
            <input value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} maxLength={500} placeholder="ملاحظة تحليلية قصيرة (اختياري)" className="rounded-xl border border-white/10 bg-[#050a16] px-3 py-2.5 text-xs text-white outline-none focus:border-[#c59b27] sm:col-span-2" />
          </div>

          <button type="button" onClick={handleAddQuote} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c59b27]/40 bg-[#c59b27]/10 px-3 py-2 text-xs font-bold text-[#f0cb69] hover:bg-[#c59b27]/20">
            <Plus className="h-3.5 w-3.5" /> إضافة الاقتباس
          </button>

          <div className="space-y-2">
            {quotes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-[#64748b]">لم تضف اقتباسات لهذا الكتاب بعد.</p>
            ) : quotes.map((item, index) => {
              const record = isRecord(item) ? item : {};
              const text = readText(record.text) || readText(record.quote) || (typeof item === 'string' ? item : 'اقتباس محفوظ سابقًا');
              const id = readText(record.id);
              const sourceId = readText(record.sourceId);
              const page = readText(record.page);
              const note = readText(record.note);
              return (
                <div key={id || `legacy-quote-${index}`} className="rounded-xl border border-white/10 bg-[#070d1e] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <blockquote className="min-w-0 whitespace-pre-wrap text-xs leading-relaxed text-[#e2e8f0]">«{text}»</blockquote>
                    <button type="button" onClick={() => setQuotes((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="حذف الاقتباس" className="shrink-0 rounded-lg p-2 text-[#94a3b8] hover:bg-rose-500/10 hover:text-rose-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#94a3b8]">
                    {sourceId && <span>المصدر: {sourceTitleFor(sourceId)}</span>}
                    {page && <span>الصفحة: {page}</span>}
                  </div>
                  {note && <p className="mt-2 border-t border-white/5 pt-2 text-[10px] text-[#cbd5e1]">{note}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <p className="text-[10px] leading-relaxed text-[#64748b]">تُحفظ هذه البيانات ضمن ملف الكتاب نفسه. لا تضع نصوصًا محمية طويلة؛ سجّل الاقتباس بالقدر الضروري مع بيانات المصدر والصفحة.</p>
    </div>
  );
};
