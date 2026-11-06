import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Search, ShieldCheck, X } from 'lucide-react';
import { filterLibraryCandidates, isSafeExternalUrl } from '../utils/libraryCuration';

type CandidateStatus =
  | 'candidate'
  | 'metadata-verified-content-review-pending'
  | 'editorial-review'
  | 'approved'
  | 'rejected'
  | 'rights-pending'
  | string;

interface LibraryCandidate {
  id: string;
  title: string;
  author: string;
  category: string;
  sourceUrl: string;
  edition?: string;
  pages?: number | null;
  status: CandidateStatus;
  reason?: string;
  shamelaUrl?: string;
  initialSpotCheck?: string;
}

interface CandidateDataset {
  updatedAt?: string;
  policyVersion?: string;
  books?: LibraryCandidate[];
}

interface LibraryCurationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const candidateModules = import.meta.glob('../data/library/candidates.json', {
  eager: true,
  import: 'default',
}) as Record<string, CandidateDataset>;

const candidateDataset = candidateModules['../data/library/candidates.json'];

const candidates = Array.isArray(candidateDataset?.books)
  ? candidateDataset.books.filter((book) =>
      Boolean(book && book.id && book.title && book.author && book.category && book.status && isSafeExternalUrl(book.sourceUrl))
    )
  : [];

const categoryLabels: Record<string, string> = {
  religious: 'الكتب الشرعية',
  'self-development': 'تزكية النفس وتطويرها',
  travel: 'الرحلات',
  'islamic-philosophy-critique': 'نقد الفلسفة إسلاميًا',
};

const statusLabels: Record<string, string> = {
  candidate: 'مرشح أولي',
  'metadata-verified-content-review-pending': 'البيانات موثقة — مراجعة النص معلّقة',
  'editorial-review': 'قيد المراجعة التحريرية',
  approved: 'معتمد',
  rejected: 'مستبعد',
  'rights-pending': 'بانتظار حسم الحقوق',
};

const formatStatus = (status: string) => statusLabels[status] || 'حالة غير معروفة';

export const LibraryCurationPanel: React.FC<LibraryCurationPanelProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredCandidates = useMemo(
    () => filterLibraryCandidates(candidates, { query, category, status }),
    [query, category, status],
  );

  const categoryCounts = useMemo(() => ({
    religious: candidates.filter((book) => book.category === 'religious').length,
    'self-development': candidates.filter((book) => book.category === 'self-development').length,
    travel: candidates.filter((book) => book.category === 'travel').length,
    'islamic-philosophy-critique': candidates.filter((book) => book.category === 'islamic-philosophy-critique').length,
  }), []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#020617]/90 p-2 backdrop-blur-md sm:p-5" dir="rtl">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-curation-title"
        className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[#c59b27]/35 bg-[#070d1e] shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#0a1329] px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c59b27]/30 bg-[#c59b27]/10 text-[#f0cb69]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 id="library-curation-title" className="text-base font-black text-white sm:text-lg">
                مركز مراجعة مكتبة حُكم
              </h2>
              <p className="mt-1 text-xs leading-6 text-slate-400">
                متابعة الكتب المرشحة ومصادرها وحالة فحصها قبل أي اعتماد أو نشر
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:border-white/20 hover:text-white"
            aria-label="إغلاق مركز مراجعة المكتبة"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/5 p-4 sm:flex-row sm:items-start">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-bold text-amber-100">هذه شاشة متابعة وليست شاشة اعتماد</p>
              <p className="mt-1 text-xs leading-6 text-slate-300">
                لا يوجد هنا زر لاعتماد الكتب أو نشرها. جميع المرشحين يظلون خارج المكتبة العامة حتى تتم مراجعة المؤلف والمنهج والنص الكامل والحواشي والطبعة، ثم توثيق القرار في ملفات المشروع.
              </p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-xl border border-white/10 bg-[#0a1329] p-3">
              <p className="text-[10px] text-slate-400">إجمالي المرشحين</p>
              <p className="mt-1 text-2xl font-black text-white tabular-nums">{candidates.length}</p>
            </div>
            {Object.entries(categoryLabels).map(([id, label]) => (
              <div key={id} className="rounded-xl border border-white/10 bg-[#0a1329] p-3">
                <p className="text-[10px] text-slate-400">{label}</p>
                <p className="mt-1 text-xl font-black text-[#f0cb69] tabular-nums">
                  {categoryCounts[id as keyof typeof categoryCounts] || 0}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_220px_240px]">
            <label className="relative block">
              <span className="sr-only">البحث في الكتب المرشحة</span>
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث بالعنوان أو المؤلف أو المحقق..."
                className="w-full rounded-xl border border-white/10 bg-[#0a1329] py-3 pr-10 pl-3 text-xs text-white outline-none transition placeholder:text-slate-500 focus:border-[#c59b27]/60"
              />
            </label>
            <label className="block">
              <span className="sr-only">تصفية حسب القسم</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0a1329] px-3 py-3 text-xs text-white outline-none focus:border-[#c59b27]/60"
              >
                <option value="all">كل الأقسام</option>
                {Object.entries(categoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">تصفية حسب حالة المراجعة</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0a1329] px-3 py-3 text-xs text-white outline-none focus:border-[#c59b27]/60"
              >
                <option value="all">كل حالات المراجعة</option>
                {Object.entries(statusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">سجل الكتب المرشحة</h3>
            <span className="text-[11px] text-slate-400">{filteredCandidates.length} نتيجة</span>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#0a1329] p-10 text-center text-sm text-slate-400">
              لا توجد كتب تطابق البحث أو عوامل التصفية الحالية.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {filteredCandidates.map((book) => (
                <article key={book.id} className="rounded-2xl border border-white/10 bg-[#0a1329] p-4 transition-colors hover:border-[#c59b27]/30">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-black leading-7 text-white">{book.title}</h4>
                      <p className="text-xs text-[#f0cb69]">{book.author}</p>
                    </div>
                    <span className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[10px] font-bold leading-5 text-amber-200">
                      {formatStatus(book.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300">
                    <span className="rounded-md bg-white/5 px-2 py-1">{categoryLabels[book.category] || book.category}</span>
                    {book.pages ? <span className="rounded-md bg-white/5 px-2 py-1">{book.pages.toLocaleString('ar-EG')} صفحة</span> : null}
                    {book.edition ? <span className="rounded-md bg-white/5 px-2 py-1">{book.edition}</span> : null}
                  </div>

                  {book.reason && <p className="mt-3 text-xs leading-6 text-slate-300">{book.reason}</p>}
                  {book.initialSpotCheck && (
                    <div className="mt-3 rounded-xl border border-white/5 bg-[#070d1e] p-3">
                      <p className="text-[10px] font-bold text-slate-400">ملاحظة الفحص الأولي — لا تعني اعتماد النص</p>
                      <p className="mt-1 text-[11px] leading-6 text-slate-300" dir="auto">{book.initialSpotCheck}</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/5 pt-3">
                    <a href={book.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#f0cb69] underline underline-offset-4 hover:text-white">
                      <ExternalLink className="h-3 w-3" /> الوقفية / المصدر
                    </a>
                    {isSafeExternalUrl(book.shamelaUrl) && (
                      <a href={book.shamelaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 underline underline-offset-4 hover:text-white">
                        <ExternalLink className="h-3 w-3" /> المكتبة الشاملة
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
