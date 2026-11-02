import React, { useState } from 'react';
import {
  X,
  Mail,
  Copy,
  Check,
  Send,
  Users,
  Eye,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  History,
  FileCode,
  CheckCircle,
} from 'lucide-react';
import { BookProject } from '../types/hukm';
import { HukmSubscriber, EmailLogEntry } from '../types/auth';
import {
  generateWelcomeEmailHtml,
  generateNewReleaseEmailHtml,
  generateCustomBroadcastEmailHtml,
} from '../utils/emailTemplateGenerator';
import {
  getStoredSubscribers,
  getStoredEmailLogs,
  addEmailLog,
  toggleSubscriberActive,
} from '../utils/authStorage';
import { HUKM_LOGO } from '../data/hukmData';
import {
  getEmailServiceStatus,
  dispatchRealEmail,
  type EmailServiceStatus,
} from '../services/emailClient';

interface HukmEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookProject[];
  onShowToast: (msg: string) => void;
}

export const HukmEmailModal: React.FC<HukmEmailModalProps> = ({
  isOpen,
  onClose,
  books,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'broadcast' | 'subscribers' | 'logs'>('preview');
  const [previewTemplate, setPreviewTemplate] = useState<'welcome' | 'release' | 'custom'>('welcome');
  const [selectedBookId, setSelectedBookId] = useState<string>(books[0]?.id || '');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailServiceStatus | null>(null);

  const [subscribers, setSubscribers] = useState<HukmSubscriber[]>(() => getStoredSubscribers());
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>(() => getStoredEmailLogs());

  React.useEffect(() => {
    if (isOpen) {
      getEmailServiceStatus().then(setEmailStatus);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBook = books.find((b) => b.id === selectedBookId) || books[0];
  const activeSubscribersCount = subscribers.filter((s) => s.active).length;

  // Compute current HTML preview
  let currentHtml = '';
  let currentSubject = '';

  if (previewTemplate === 'welcome') {
    currentSubject = 'أهلاً بك في منصة حُكم | HUKM MEDIA';
    currentHtml = generateWelcomeEmailHtml('أحمد المنصور', 'ahmed.reader@example.com');
  } else if (previewTemplate === 'release') {
    currentSubject = `إصدار استقصائي جديد: ${currentBook?.title || 'كتاب حُكم'}`;
    currentHtml = generateNewReleaseEmailHtml(
      currentBook,
      currentBook?.chapters[0],
      'عزيزنا المشترك'
    );
  } else {
    currentSubject = customSubject || 'بيان رسمي وتحديث جديد من منصة حُكم';
    currentHtml = generateCustomBroadcastEmailHtml(
      currentSubject,
      customBody || 'يسرنا إحاطتكم علماً ببدء العمل على السلسلة الوثائقية الجديدة وفتح باب النقاش حول الوثائق المسربة.'
    );
  }

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(currentHtml);
    setCopiedHtml(true);
    onShowToast('تم نسخ كود الـ HTML بهوية حُكم الملكية بنجاح!');
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSubject.trim() || !customBody.trim()) {
      onShowToast('يرجى كتابة عنوان الرسالة ونصها.');
      return;
    }

    setIsSending(true);
    const html = generateCustomBroadcastEmailHtml(customSubject, customBody);

    const res = await dispatchRealEmail({
      subject: customSubject.trim(),
      htmlContent: html,
      type: 'announcement',
      bookTitle: currentBook?.title,
    });

    setIsSending(false);

    if (res.delivered) {
      addEmailLog({
        subject: customSubject.trim(),
        recipientCount: res.recipientCount || activeSubscribersCount,
        timestamp: 'الآن',
        type: 'announcement',
        bookTitle: currentBook?.title,
        previewHtml: html,
        delivered: true,
      });

      setEmailLogs(getStoredEmailLogs());
      setCustomSubject('');
      setCustomBody('');
      onShowToast(res.message);
      setActiveTab('logs');
    } else {
      // Honest reporting: show exact server/provider reason
      onShowToast(res.message);
    }
  };

  const handleSendTestWelcome = async () => {
    setIsSending(true);
    const testEmail = 'ifawz40@gmail.com';
    const html = generateWelcomeEmailHtml('إبراهيم فوزي', testEmail);

    const res = await dispatchRealEmail({
      subject: 'أهلاً بك في منصة حُكم | HUKM MEDIA (رسالة ترحيب)',
      htmlContent: html,
      recipientEmail: testEmail,
      type: 'welcome',
    });

    setIsSending(false);

    if (res.delivered) {
      addEmailLog({
        subject: 'أهلاً بك في منصة حُكم | HUKM MEDIA (رسالة ترحيب)',
        recipientCount: 1,
        recipientEmail: testEmail,
        timestamp: 'الآن',
        type: 'welcome',
        previewHtml: html,
        delivered: true,
      });
      setEmailLogs(getStoredEmailLogs());
      onShowToast(res.message);
    } else {
      onShowToast(res.message);
    }
  };

  const handleToggleSubscriber = (subId: string) => {
    const updated = toggleSubscriberActive(subId);
    setSubscribers(updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl border border-[#c59b27]/40 bg-[#070d1e] shadow-2xl flex flex-col text-right">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-[#c59b27]/25 bg-[#0a1226] px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#050a16] border border-[#c59b27]/50 overflow-hidden shadow">
              <img src={HUKM_LOGO} alt="حُكم" className="h-full w-full object-cover scale-105" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-cairo">
                  مركز بريد وهوية رسائل <span className="gold-gradient-text">حُكم MEDIA</span>
                </h2>
                <span className="rounded-md bg-[#c59b27]/20 border border-[#c59b27]/40 px-2 py-0.5 text-[10px] font-bold text-[#f0cb69]">
                  {activeSubscribersCount} مشتركاً تلقائياً
                </span>
              </div>
              <p className="text-xs text-[#94a3b8]">
                قالب بريد فاخر وموحد يرسل تلقائياً للمشتركين عند التسجيل ونشر أي موضوع جديد.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#94a3b8] hover:bg-white/10 hover:text-white transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-white/5 bg-[#0a1226]/60 px-5 sm:px-6 py-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'preview', label: 'معاينة القالب الملكي الفاخر', icon: Eye },
            { id: 'broadcast', label: 'إرسال نشرة بريدية جديدة', icon: Send },
            { id: 'subscribers', label: `المشتركون التلقائيون (${subscribers.length})`, icon: Users },
            { id: 'logs', label: `سجل الإرسال (${emailLogs.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#c59b27] text-[#070d1e] shadow'
                    : 'text-[#cbd5e1] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 no-scrollbar">
          {emailStatus && !emailStatus.configured && (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-200">
              <span className="text-base">⚠️</span>
              <div>
                <p className="font-bold text-amber-300">خدمة إرسال البريد الإلكتروني غير مهيأة على الخادم</p>
                <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-relaxed">
                  لم يتم ضبط مفتاح مزود البريد <code className="text-[#f0cb69] bg-white/5 px-1 py-0.5 rounded">RESEND_API_KEY</code> في متغيرات بيئة الخادم. تم إيقاف المحاكاة الوهمية، ولن يتم تسجيل أي إرسال كـ Delivered دون تأكيد مزود البريد.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: Live Royal Email Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0a1226] border border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#f0cb69]">نوع القالب:</span>
                  <div className="flex rounded-xl bg-[#070d1e] p-1 border border-white/10">
                    <button
                      onClick={() => setPreviewTemplate('welcome')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        previewTemplate === 'welcome'
                          ? 'bg-[#c59b27] text-[#070d1e]'
                          : 'text-[#cbd5e1] hover:text-white'
                      }`}
                    >
                      ✉️ ترحيب بالمشترك الجديد
                    </button>
                    <button
                      onClick={() => setPreviewTemplate('release')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        previewTemplate === 'release'
                          ? 'bg-[#c59b27] text-[#070d1e]'
                          : 'text-[#cbd5e1] hover:text-white'
                      }`}
                    >
                      📖 إشعار صدور فصل/كتاب
                    </button>
                  </div>
                </div>

                {previewTemplate === 'release' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#94a3b8]">المشروع:</span>
                    <select
                      value={selectedBookId}
                      onChange={(e) => setSelectedBookId(e.target.value)}
                      className="rounded-xl bg-[#070d1e] border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c59b27]"
                    >
                      {books.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyHtml}
                    className="flex items-center gap-1.5 rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/30 px-3 py-1.5 text-xs font-bold text-[#f0cb69] transition-all"
                    title="نسخ كود HTML المتوافق مع جميع تطبيقات البريد الإلكتروني"
                  >
                    {copiedHtml ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedHtml ? 'تم النسخ!' : 'نسخ كود HTML'}</span>
                  </button>

                  <button
                    onClick={handleSendTestWelcome}
                    disabled={isSending}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] px-3.5 py-1.5 text-xs font-bold text-[#070d1e] shadow transition-all disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>إرسال تجريبي</span>
                  </button>
                </div>
              </div>

              {/* Subject display */}
              <div className="flex items-center gap-2 rounded-xl bg-[#0a1226]/60 border border-white/5 px-4 py-2.5 text-xs">
                <span className="font-bold text-[#d4af37]">عنوان البريد (Subject):</span>
                <span className="text-white font-medium">{currentSubject}</span>
              </div>

              {/* Rendered HTML in iframe */}
              <div className="rounded-2xl border border-[#c59b27]/35 overflow-hidden shadow-2xl bg-[#030712]">
                <div className="bg-[#050a16] border-b border-white/10 px-4 py-2 flex items-center justify-between text-[11px] text-[#94a3b8]">
                  <span>معاينة البريد كما يظهر للقارئ في Gmail وApple Mail وOutlook:</span>
                  <span className="text-[#f0cb69] font-bold">هوية حُكم الرسمية (كحلي ملكي + ذهبي)</span>
                </div>
                <iframe
                  title="معاينة البريد"
                  srcDoc={currentHtml}
                  className="w-full h-[520px] bg-[#030712] border-0"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Broadcast to all subscribers */}
          {activeTab === 'broadcast' && (
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div className="rounded-2xl bg-[#0a1226] border border-[#c59b27]/25 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#f0cb69]">
                  <Sparkles className="h-4 w-4" />
                  <span>بث رسالة بريدية لجميع المشتركين ({activeSubscribersCount} مشترك نشط)</span>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  سيتم تنسيق الرسالة وتغليفها تلقائياً داخل القالب الفاخر لهوية حُكم (الإطار الذهبي، الشعار الملكي، ومصادر التواصل).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#cbd5e1] mb-1.5">
                  عنوان الرسالة البريدية (Subject) *
                </label>
                <input
                  type="text"
                  required
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="مثال: وثائق تاريخية جديدة تُنشر لأول مرة في مشروع حُكم..."
                  className="w-full rounded-xl bg-[#0a1226] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#cbd5e1] mb-1.5">
                  نص الرسالة والبيان التحريري *
                </label>
                <textarea
                  rows={6}
                  required
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="اكتب تفاصيل التحديث، الرسالة للجمهور، أو الإعلان عن الفصل الجديد..."
                  className="w-full rounded-xl bg-[#0a1226] border border-white/10 p-3.5 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewTemplate('custom');
                    setActiveTab('preview');
                  }}
                  className="rounded-xl bg-[#0e1935] border border-white/10 px-4 py-2.5 text-xs font-semibold text-[#cbd5e1] hover:text-white"
                >
                  معاينة في القالب أولاً 👁️
                </button>

                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] px-6 py-2.5 text-xs font-bold text-[#070d1e] shadow-lg shadow-[#c59b27]/20 transition-all disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSending ? 'جارٍ الإرسال...' : `إرسال إلى ${activeSubscribersCount} مشتركاً ✉️`}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Subscribers list */}
          {activeTab === 'subscribers' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#0a1226] border border-[#c59b27]/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white font-cairo">
                    قائمة المشتركين التلقائيين في تحديثات حُكم
                  </h4>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    كل مستخدم يسجل حسابه (عبر Google أو البريد) يُضاف تلقائياً لهذه القائمة ويتلقى كل الإصدارات.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-[#c59b27]/20 border border-[#c59b27]/40 px-3 py-1 text-xs font-bold text-[#f0cb69]">
                    {activeSubscribersCount} مشترك نشط
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0a1226] overflow-hidden">
                <div className="divide-y divide-white/5">
                  {subscribers.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3.5 sm:px-5 hover:bg-[#0e1935]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#070d1e] border border-[#c59b27]/30 flex items-center justify-center text-xs font-bold text-[#f0cb69]">
                          {sub.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-white">{sub.name}</h5>
                            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-[#94a3b8]">
                              {sub.source === 'google' ? 'حساب Google 🌐' : sub.source === 'apple' ? 'حساب Apple 🍎' : 'تسجيل بريد ✉️'}
                            </span>
                            {sub.email === 'ifawz40@gmail.com' && (
                              <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold">
                                الناشر الرسمي 👑
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#64748b] block mt-0.5">
                            {sub.email} · مشترك منذ {sub.subscribedAt}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub.active
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {sub.active ? 'يستقبل الإشعارات' : 'معطل'}
                        </span>

                        <button
                          onClick={() => handleToggleSubscriber(sub.id)}
                          className="rounded-lg bg-[#070d1e] hover:bg-[#162752] border border-white/10 px-2.5 py-1 text-[11px] text-[#cbd5e1] hover:text-white transition-colors"
                        >
                          {sub.active ? 'تعطيل' : 'تفعيل'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Email Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                <span>سجل الرسائل الصادرة والمنشورات التلقائية للمشتركين:</span>
                <span>{emailLogs.length} سجل</span>
              </div>

              {emailLogs.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0a1226] p-8 text-center text-xs text-[#64748b]">
                  لم يتم إرسال أي رسائل بعد. يمكنك تجربة "إرسال تجريبي" أو بث رسالة للمشتركين.
                </div>
              ) : (
                <div className="space-y-2">
                  {emailLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-white/10 bg-[#0a1226] p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white">{log.subject}</h5>
                          <span className="text-[11px] text-[#94a3b8] block mt-0.5">
                            تم التوصيل إلى {log.recipientCount} مشترك ({log.timestamp})
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-[#f0cb69] bg-[#c59b27]/10 border border-[#c59b27]/25 px-2 py-1 rounded-lg">
                        {log.type === 'welcome' ? 'ترحيب' : log.type === 'new_release' ? 'إصدار' : 'إعلان عام'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
