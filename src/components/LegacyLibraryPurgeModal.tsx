import React, { useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck, Trash2, X } from 'lucide-react';
import { auth } from '../firebase/config';

interface PurgeResult {
  deleted: {
    books: number;
    bookDraftChapters: number;
    categories: number;
  };
  completedAt: string;
}

interface LegacyLibraryPurgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurged: (result: PurgeResult) => void;
}

const CONFIRMATION = 'DELETE_ALL_LEGACY_LIBRARY_DATA';

export const LegacyLibraryPurgeModal: React.FC<LegacyLibraryPurgeModalProps> = ({
  isOpen,
  onClose,
  onPurged,
}) => {
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePurge = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (confirmation !== CONFIRMATION) {
      setError('عبارة التأكيد غير مطابقة.');
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('انتهت جلسة الدخول. سجّل الدخول مجددًا ثم أعد المحاولة.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/auth/purge-legacy-library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirmation: CONFIRMATION }),
      });
      const payload = await response.json();
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.message || 'لم يتم تأكيد نجاح عملية التنظيف.');
      }
      onPurged(payload as PurgeResult);
      setConfirmation('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حدث خطأ غير متوقع أثناء تنظيف البيانات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" dir="rtl">
      <section role="dialog" aria-modal="true" aria-labelledby="legacy-purge-title" className="w-full max-w-xl rounded-3xl border border-red-500/30 bg-[#0a1226] p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300"><Trash2 className="h-6 w-6" /></span>
            <div>
              <h2 id="legacy-purge-title" className="text-lg font-black text-white">حذف بيانات المكتبة القديمة</h2>
              <p className="mt-1 text-xs text-[#94a3b8]">إجراء نهائي لمرة واحدة — متاح للمؤسس فقط</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg p-2 text-[#94a3b8] hover:bg-white/5 hover:text-white" aria-label="إغلاق"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-amber-200"><AlertTriangle className="h-4 w-4" /><strong className="text-sm">ما الذي سيُحذف؟</strong></div>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-6 text-[#cbd5e1]">
            <li>كل المستندات داخل <code>books</code>.</li>
            <li>كل المستندات داخل <code>bookDraftChapters</code>.</li>
            <li>كل المستندات داخل <code>categories</code>.</li>
          </ul>
          <div className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3 text-xs leading-6 text-emerald-200">
            <ShieldCheck className="mt-1 h-4 w-4 shrink-0" />
            <span>لن تُحذف حسابات المستخدمين أو صلاحيات الإدارة أو المحفوظات أو تقدم القراءة أو الملاحظات أو الإشعارات أو المشتركين.</span>
          </div>
        </div>

        <form onSubmit={handlePurge} className="mt-5 space-y-3">
          <label htmlFor="legacy-purge-confirmation" className="block text-xs font-bold text-white">
            اكتب عبارة التأكيد التالية حرفيًا:
          </label>
          <code className="block select-all rounded-lg bg-black/30 p-3 text-center text-xs text-[#f0cb69]">{CONFIRMATION}</code>
          <input
            id="legacy-purge-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-white/15 bg-[#070d1e] px-3 py-3 text-left font-mono text-xs text-white outline-none focus:border-red-400"
            placeholder="عبارة التأكيد"
          />
          {error && <p role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs leading-6 text-red-200">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold text-[#cbd5e1] hover:bg-white/5">إلغاء</button>
            <button type="submit" disabled={isSubmitting || confirmation !== CONFIRMATION} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isSubmitting ? 'جارٍ حذف البيانات...' : 'تأكيد حذف بيانات المكتبة'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
