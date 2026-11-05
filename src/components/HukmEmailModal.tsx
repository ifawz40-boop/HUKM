import React, { useState, useEffect } from 'react';
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
  RotateCw,
  Search,
  AlertCircle,
  Loader2,
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
  fetchSubscribersApi,
  toggleSubscriberApi,
  type EmailServiceStatus,
} from '../services/emailClient';
import {
  fetchSubscribersFromFirestore,
  toggleSubscriberInFirestore,
} from '../firebase/firestoreService';

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

  // Cloud Subscribers State
  const [subscribers, setSubscribers] = useState<HukmSubscriber[]>(() => getStoredSubscribers());
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [subscriberError, setSubscriberError] = useState<string | null>(null);
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [isRefreshingSubscribers, setIsRefreshingSubscribers] = useState(false);
  const [togglingSubId, setTogglingSubId] = useState<string | null>(null);

  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>(() => getStoredEmailLogs());

  const PAGE_SIZE = 20;

  // Real Cloud Subscriber Fetch with cursor-based pagination & multi-tier fallback
  const loadSubscribers = async (reset = true) => {
    if (reset) {
      setIsLoadingSubscribers(true);
      setIsRefreshingSubscribers(true);
      setSubscriberError(null);
      setNextCursor(null);
      setHasMore(false);
    } else {
      if (!hasMore || !nextCursor || isLoadingMore) return;
      setIsLoadingMore(true);
      setSubscriberError(null);
    }

    try {
      const cursorToUse = reset ? null : nextCursor;
      // 1. Preferred Tier: Protected Server API endpoint with pagination
      const res = await fetchSubscribersApi(PAGE_SIZE, cursorToUse);
      if (res && res.success && Array.isArray(res.subscribers)) {
        if (reset) {
          setSubscribers(res.subscribers);
        } else {
          // Prevent duplicates when appending next page
          setSubscribers((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const uniqueIncoming = res.subscribers.filter((s) => !existingIds.has(s.id));
            return [...prev, ...uniqueIncoming];
          });
        }
        setHasMore(Boolean(res.hasMore));
        setNextCursor(res.nextCursor || null);
        setIsLoadingSubscribers(false);
        setIsRefreshingSubscribers(false);
        setIsLoadingMore(false);
        return;
      }

      // 2. Fallback Tier: Direct Firestore client query (initial page only)
      if (reset) {
        const direct = await fetchSubscribersFromFirestore();
        if (direct && Array.isArray(direct)) {
          setSubscribers(direct);
          setHasMore(false);
          setNextCursor(null);
          setIsLoadingSubscribers(false);
          setIsRefreshingSubscribers(false);
          setIsLoadingMore(false);
          return;
        }
      }

      // If both cloud mechanisms returned error
      const errMsg = res?.message || 'تعذر تحميل سجلات المشتركين من قاعدة البيانات السحابية.';
      setSubscriberError(errMsg);
      if (reset) {
        // Fallback gracefully to locally stored data so admin never sees a broken screen
        const local = getStoredSubscribers();
        if (local && local.length > 0) {
          setSubscribers(local);
        }
      }
    } catch (err: any) {
      console.warn('Could not load subscribers from cloud:', err);
      setSubscriberError(err?.message || 'خطأ في الاتصال بالخادم أثناء استرجاع بيانات المشتركين.');
      if (reset) {
        setSubscribers(getStoredSubscribers());
      }
    } finally {
      setIsLoadingSubscribers(false);
      setIsRefreshingSubscribers(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      getEmailServiceStatus().then(setEmailStatus);
      loadSubscribers(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBook = books.find((b) => b.id === selectedBookId) || books[0];
  const activeSubscribersCount = subscribers.filter((s) => s.active).length;

  // Filtered subscribers for fast in-app search & large lists
  const filteredSubscribers = subscribers.filter((sub) => {
    if (!subscriberSearch.trim()) return true;
    const q = subscriberSearch.trim().toLowerCase();
    return (
      sub.name.toLowerCase().includes(q) ||
      sub.email.toLowerCase().includes(q)
    );
  });

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

    if (res.acceptedByProvider || res.delivered) {
      addEmailLog({
        subject: customSubject.trim(),
        recipientCount: res.recipientCount || activeSubscribersCount,
        timestamp: 'الآن',
        type: 'announcement',
        bookTitle: currentBook?.title,
        previewHtml: html,
        delivered: true,
        acceptedByProvider: res.acceptedByProvider ?? res.delivered,
        partial: res.partial ?? false,
        totalRequested: res.totalRequested ?? res.recipientCount ?? activeSubscribersCount,
      });

      setEmailLogs(getStoredEmailLogs());
      setCustomSubject('');
      setCustomBody('');
      onShowToast(res.message);
      setActiveTab('logs');
      // Refresh subscribers list count
      loadSubscribers(false);
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

  const handleToggleSubscriber = async (subId: string) => {
    const sub = subscribers.find((s) => s.id === subId);
    if (!sub) return;

    const nextState = !sub.active;
    setTogglingSubId(subId);

    try {
      let cloudSuccess = false;
      let failureReason = '';

      // 1. Try server-side protected endpoint first
      try {
        const apiRes = await toggleSubscriberApi(subId, nextState);
        if (apiRes && apiRes.success) {
          cloudSuccess = true;
        } else if (apiRes && apiRes.message) {
          failureReason = apiRes.message;
        }
      } catch (apiErr: any) {
        failureReason = apiErr?.message || '';
      }

      // 2. If API did not succeed, try existing authorized Firestore SDK fallback
      if (!cloudSuccess) {
        try {
          const directSuccess = await toggleSubscriberInFirestore(subId, nextState);
          if (directSuccess === true) {
            cloudSuccess = true;
          }
        } catch (directErr: any) {
          failureReason = directErr?.message || failureReason;
        }
      }

      // 3. ONLY update state and local storage after CONFIRMED cloud success
      if (cloudSuccess) {
        toggleSubscriberActive(subId);
        setSubscribers((prev) =>
          prev.map((s) => (s.id === subId ? { ...s, active: nextState } : s))
        );
        onShowToast(
          nextState
            ? 'تم تفعيل استقبال المشترك للإصدارات سحابياً ✓'
            : 'تم تعطيل استقبال الإشعارات للمشترك سحابياً ✓'
        );
      } else {
        // Both cloud operations failed: PRESERVE previous state, show clear error, allow retry
        onShowToast(
          `فشل تحديث حالة المشترك في السحابة: ${
            failureReason || 'تعذر الاتصال بقاعدة البيانات. يرجى إعادة المحاولة.'
          }`
        );
      }
    } catch (err: any) {
      console.warn('Unexpected error in handleToggleSubscriber:', err);
      onShowToast(`خطأ في تحديث حالة المشترك: ${err?.message || 'تعذر إتمام العملية.'}`);
    } finally {
      setTogglingSubId(null);
    }
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

          {/* TAB 3: Subscribers list backed by Firestore Cloud Database */}
          {activeTab === 'subscribers' && (
            <div className="space-y-4">
              {/* Top Banner & Live Sync Controls */}
              <div className="rounded-2xl bg-[#0a1226] border border-[#c59b27]/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white font-cairo">
                      سجلات المشتركين السحابية المعتمدة
                    </h4>
                    <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      قاعدة بيانات Firestore ☁️
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    بيانات المشتركين الحقيقية في المنصة؛ يتلقون النشرات والإصدارات التحريرية الرسمية تلقائياً.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-xl bg-[#c59b27]/20 border border-[#c59b27]/40 px-3 py-1.5 text-xs font-bold text-[#f0cb69]">
                    {activeSubscribersCount} نشط / {subscribers.length} إجمالي
                  </span>

                  <button
                    type="button"
                    onClick={() => loadSubscribers(true)}
                    disabled={isRefreshingSubscribers}
                    className="flex items-center gap-1.5 rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-white/10 px-3 py-1.5 text-xs font-semibold text-[#cbd5e1] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                    title="تحديث القائمة من السحابة (إعادة الضبط للصفحة الأولى)"
                  >
                    <RotateCw className={`h-3.5 w-3.5 text-[#d4af37] ${isRefreshingSubscribers ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">تحديث</span>
                  </button>
                </div>
              </div>

              {/* In-app Search & Filter */}
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute right-3.5 top-3 h-4 w-4 text-[#94a3b8]" />
                  <input
                    type="text"
                    value={subscriberSearch}
                    onChange={(e) => setSubscriberSearch(e.target.value)}
                    placeholder={`البحث في المشتركين المحملين حالياً (${subscribers.length})...`}
                    className="w-full rounded-2xl bg-[#0a1226] border border-white/10 pr-10 pl-4 py-2.5 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                  />
                </div>
                {hasMore && (
                  <p className="text-[11px] text-amber-300/90 px-2 flex items-center gap-1.5">
                    <span>💡 ملاحظة:</span>
                    <span>البحث يشمل السجلات المحمّلة ({subscribers.length}). توجد صفحات إضافية في السحابة؛ اضغط «تحميل المزيد» لضمها للبحث.</span>
                  </p>
                )}
              </div>

              {/* Error State Banner with Retry */}
              {subscriberError && (
                <div className="flex items-center justify-between rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>{subscriberError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadSubscribers(true)}
                    className="rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 px-3 py-1 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {/* Loading State Skeleton */}
              {isLoadingSubscribers ? (
                <div className="rounded-2xl border border-white/10 bg-[#0a1226] p-8 text-center space-y-3">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#d4af37]" />
                  <p className="text-xs text-[#94a3b8]">
                    جارٍ جلب وتأكيد سجلات المشتركين من قاعدة البيانات السحابية الموثقة...
                  </p>
                </div>
              ) : filteredSubscribers.length === 0 ? (
                /* Empty State */
                <div className="rounded-2xl border border-white/10 bg-[#0a1226] p-8 text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-[#c59b27]/10 border border-[#c59b27]/30 flex items-center justify-center mx-auto text-[#f0cb69]">
                    <Users className="h-6 w-6" />
                  </div>
                  <h5 className="text-sm font-bold text-white font-cairo">
                    {subscriberSearch.trim() ? 'لا توجد نتائج تطابق كلمة البحث' : 'لا يوجد مشتركون مسجلون حالياً في القائمة السحابية'}
                  </h5>
                  <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
                    {subscriberSearch.trim()
                      ? 'تأكد من كتابة البريد أو الاسم بشكل صحيح أو امسح البحث لعرض كافة المشتركين.'
                      : 'كل حساب جديد ينضم عبر البريد أو Google يُضاف تلقائياً لهذه القائمة ويتلقى كل الإصدارات.'}
                  </p>
                </div>
              ) : (
                /* Real Cloud Subscribers List */
                <div className="rounded-2xl border border-white/10 bg-[#0a1226] overflow-hidden">
                  <div className="divide-y divide-white/5 max-h-[460px] overflow-y-auto no-scrollbar">
                    {filteredSubscribers.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3.5 sm:px-5 hover:bg-[#0e1935]/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#070d1e] border border-[#c59b27]/30 flex items-center justify-center text-xs font-bold text-[#f0cb69]">
                            {sub.name.charAt(0) || 'م'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-xs font-bold text-white">{sub.name}</h5>
                              <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-[#94a3b8]">
                                {sub.source === 'google'
                                  ? 'حساب Google 🌐'
                                  : sub.source === 'apple'
                                  ? 'حساب Apple 🍎'
                                  : 'تسجيل بريد ✉️'}
                              </span>
                              {sub.email === 'ifawz40@gmail.com' && (
                                <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold">
                                  الناشر الرسمي 👑
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#64748b] block mt-0.5 font-mono">
                              {sub.email} {sub.subscribedAt ? `· منذ ${sub.subscribedAt.split('T')[0]}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sub.active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {sub.active ? 'يستقبل الإصدارات' : 'معطل'}
                          </span>

                          <button
                            type="button"
                            disabled={togglingSubId === sub.id}
                            onClick={() => handleToggleSubscriber(sub.id)}
                            className="rounded-lg bg-[#070d1e] hover:bg-[#162752] border border-white/10 px-2.5 py-1 text-[11px] text-[#cbd5e1] hover:text-white transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                          >
                            {togglingSubId === sub.id && <Loader2 className="h-3 w-3 animate-spin text-[#d4af37]" />}
                            <span>{sub.active ? 'تعطيل' : 'تفعيل'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Footer Controls */}
                  {hasMore ? (
                    <div className="p-3 bg-[#070d1e]/90 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                      <span className="text-[11px] text-[#94a3b8]">
                        تم عرض {subscribers.length} مشتركاً (توجد صفحات إضافية في السحابة)
                      </span>
                      <button
                        type="button"
                        disabled={isLoadingMore}
                        onClick={() => loadSubscribers(false)}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] px-4 py-1.5 text-xs font-bold text-[#070d1e] shadow-md shadow-[#c59b27]/20 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>جارٍ جلب السجلات السحابية...</span>
                          </>
                        ) : (
                          <span>تحميل المزيد من المشتركين ⬇️</span>
                        )}
                      </button>
                    </div>
                  ) : (
                    subscribers.length > 0 && (
                      <div className="p-2.5 bg-[#070d1e]/40 border-t border-white/5 text-center text-[11px] text-emerald-400/90 font-medium">
                        ✓ تم تحميل كافة سجلات المشتركين ({subscribers.length}) من قاعدة البيانات السحابية بالكامل
                      </div>
                    )
                  )}
                </div>
              )}
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
                        <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${log.partial ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                          {log.partial ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white">{log.subject}</h5>
                          <span className="text-[11px] text-[#94a3b8] block mt-0.5">
                            {log.partial
                              ? `إرسال جزئي: قُبل إلى ${log.recipientCount} من أصل ${log.totalRequested ?? log.recipientCount} مستلم (${log.timestamp})`
                              : `قُبل الإرسال إلى ${log.recipientCount} مستلم (${log.timestamp})`}
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
