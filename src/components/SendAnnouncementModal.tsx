import React, { useState } from 'react';
import { X, Send, Megaphone, Sparkles, BookOpen } from 'lucide-react';
import { BookProject } from '../types/hukm';
import { AppNotification } from '../types/auth';

interface SendAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookProject[];
  onSendNotification: (notification: Pick<AppNotification, 'title' | 'message' | 'type' | 'bookId'>) => Promise<boolean>;
}

export const SendAnnouncementModal: React.FC<SendAnnouncementModalProps> = ({
  isOpen,
  onClose,
  books,
  onSendNotification,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'announcement' | 'new_chapter' | 'new_book'>('announcement');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || !title.trim() || !message.trim()) return;

    setIsSending(true);
    setSendError('');
    try {
      const succeeded = await onSendNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        bookId: selectedBookId || undefined,
      });
      if (!succeeded) {
        setSendError('لم يؤكد الخادم حفظ التنبيه. احتفظنا بالنص كما هو؛ حاول مرة أخرى.');
        return;
      }
      setTitle('');
      setMessage('');
      setSelectedBookId('');
      onClose();
    } catch {
      setSendError('تعذر الاتصال لحفظ التنبيه. لم يتم إرساله، ويمكنك إعادة المحاولة.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#c59b27]/40 bg-[#0a1226] p-6 sm:p-8 shadow-2xl text-right">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 rounded-full p-1.5 text-[#94a3b8] hover:bg-white/10 hover:text-white transition-colors"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c59b27]/20 border border-[#c59b27]/40 text-[#f0cb69] shadow-lg">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white font-cairo">
              بث إشعار عام للقراء
            </h2>
            <p className="text-xs text-[#94a3b8]">
              إرسال تنبيه فوري يظهر في مركز إشعارات جميع القراء المسجلين بالمنصة.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
              نوع الإشعار
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('announcement')}
                className={`rounded-xl py-2 px-2 text-xs font-bold transition-all ${
                  type === 'announcement'
                    ? 'bg-[#c59b27] text-[#070d1e]'
                    : 'bg-[#070d1e] text-[#94a3b8] border border-white/5'
                }`}
              >
                📢 إعلان عام
              </button>
              <button
                type="button"
                onClick={() => setType('new_chapter')}
                className={`rounded-xl py-2 px-2 text-xs font-bold transition-all ${
                  type === 'new_chapter'
                    ? 'bg-[#c59b27] text-[#070d1e]'
                    : 'bg-[#070d1e] text-[#94a3b8] border border-white/5'
                }`}
              >
                📖 فصل جديد
              </button>
              <button
                type="button"
                onClick={() => setType('new_book')}
                className={`rounded-xl py-2 px-2 text-xs font-bold transition-all ${
                  type === 'new_book'
                    ? 'bg-[#c59b27] text-[#070d1e]'
                    : 'bg-[#070d1e] text-[#94a3b8] border border-white/5'
                }`}
              >
                🏛️ كتاب جديد
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
              عنوان التنبيه
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: ترقبوا صدور الفصل القادم الليلة!"
              className="w-full rounded-xl bg-[#070d1e] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
              نص الرسالة والتفاصيل
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب التنويه أو التوضيح الذي تود توجيهه للقراء..."
              className="w-full rounded-xl bg-[#070d1e] border border-white/10 p-3 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
              ربط بكتاب معين (اختياري)
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full rounded-xl bg-[#070d1e] border border-white/10 px-3 py-2 text-xs text-white focus:border-[#c59b27] focus:outline-none"
            >
              <option value="">بدون رابط مباشر</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>

          {sendError && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-6 text-red-200">
              {sendError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-[#94a3b8] hover:text-white disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSending || !title.trim() || !message.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-5 py-2.5 text-xs font-black text-[#070d1e] shadow-lg hover:scale-102 active:scale-98 transition-transform"
            >
              <Send className="h-4 w-4" />
              <span>{isSending ? 'جاري حفظ التنبيه...' : 'إرسال التنبيه الآن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
