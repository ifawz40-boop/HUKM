import React, { useState } from 'react';
import {
  X,
  User,
  ShieldCheck,
  BookOpen,
  Bookmark,
  Calendar,
  LogOut,
  RefreshCw,
  Crown,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  History,
  StickyNote,
  Highlighter,
  Trash2,
  Search,
  Pencil,
  Download,
} from 'lucide-react';
import { UserProfile, AdminRequest } from '../types/auth';
import { createAdminRequest, getMyAdminRequest } from '../services/adminClaimsClient';
import { BookProject, ReaderAnnotation, ReaderAnnotationColor } from '../types/hukm';
import { fetchAllReaderAnnotationsFromFirestore, saveReaderAnnotationToFirestore, deleteReaderAnnotationFromFirestore } from '../firebase/firestoreService';
import { getAllReaderAnnotations, mergeReaderAnnotations, removeReaderAnnotationLocal, saveAllReaderAnnotations, upsertReaderAnnotationLocal } from '../utils/readerAnnotations';
import { isOwner, isAdmin } from '../services/permissionService';
import { resendVerificationEmail, reloadCurrentUserSession } from '../firebase/authService';
import { getAllReadingProgress, getBookReadingProgress } from '../utils/readingTracker';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  books: BookProject[];
  initialTab?: 'profile' | 'bookmarks';
  isReaderPreviewMode?: boolean;
  onToggleReaderPreview?: () => void;
  onLogout: () => void;
  onOpenBook: (bookId: string) => void;
  onOpenReader?: (bookId: string, chapterId?: string) => void;
  onUserRefreshed?: (user: UserProfile) => void;
  onShowToast?: (msg: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  books,
  initialTab = 'profile',
  isReaderPreviewMode = false,
  onToggleReaderPreview,
  onLogout,
  onOpenBook,
  onOpenReader,
  onUserRefreshed,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'bookmarks' | 'notes'>(initialTab);
  const [readerNotes, setReaderNotes] = useState<ReaderAnnotation[]>([]);
  const [readerNotesSearch, setReaderNotesSearch] = useState('');
  const [isLoadingReaderNotes, setIsLoadingReaderNotes] = useState(false);
  const [editingReaderNote, setEditingReaderNote] = useState<ReaderAnnotation | null>(null);
  const [editReaderNoteText, setEditReaderNoteText] = useState('');
  const [editReaderNoteColor, setEditReaderNoteColor] = useState<ReaderAnnotationColor>('gold');
  const [isSavingReaderNoteEdit, setIsSavingReaderNoteEdit] = useState(false);
  const [savedSubTab, setSavedSubTab] = useState<'favorites' | 'history'>('favorites');
  const [isResending, setIsResending] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [adminRequest, setAdminRequest] = useState<AdminRequest | null>(null);
  const [adminRequestReason, setAdminRequestReason] = useState('');
  const [isLoadingAdminRequest, setIsLoadingAdminRequest] = useState(false);
  const [isSubmittingAdminRequest, setIsSubmittingAdminRequest] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  React.useEffect(() => {
    let active = true;
    if (!isOpen || !user || user.role !== 'reader') return () => { active = false; };
    setIsLoadingAdminRequest(true);
    getMyAdminRequest().then((result) => {
      if (!active) return;
      if (result.success) setAdminRequest(result.request);
      else onShowToast?.(result.message || 'تعذر تحميل حالة طلب الإدارة.');
    }).finally(() => {
      if (active) setIsLoadingAdminRequest(false);
    });
    return () => { active = false; };
  }, [isOpen, user?.id, user?.role, onShowToast]);

  React.useEffect(() => {
    if (!isOpen || activeTab !== 'notes' || !user) return;
    let active = true;
    const localNotes = getAllReaderAnnotations(user.id);
    setReaderNotes(localNotes);
    setIsLoadingReaderNotes(true);

    fetchAllReaderAnnotationsFromFirestore(user.id).then(async (cloudNotes) => {
      if (!active || !cloudNotes) return;
      const latestLocal = getAllReaderAnnotations(user.id);
      const merged = mergeReaderAnnotations(latestLocal, cloudNotes)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      saveAllReaderAnnotations(merged, user.id);
      if (active) setReaderNotes(merged);

      for (const pending of merged.filter((note) => note.syncStatus === 'pending')) {
        const saved = await saveReaderAnnotationToFirestore(pending);
        if (!saved || !active) continue;
        const synced = { ...pending, syncStatus: 'synced' as const };
        upsertReaderAnnotationLocal(synced, user.id);
        if (active) setReaderNotes((current) => current.map((note) => note.id === synced.id ? synced : note));
      }
    }).finally(() => {
      if (active) setIsLoadingReaderNotes(false);
    });

    return () => { active = false; };
  }, [isOpen, activeTab, user?.id]);

  const handleSubmitAdminRequest = async () => {
    if (!user || !user.emailVerified || !adminRequestReason.trim()) return;
    setIsSubmittingAdminRequest(true);
    const result = await createAdminRequest(adminRequestReason.trim());
    setIsSubmittingAdminRequest(false);
    if (result.success && result.request) {
      setAdminRequest(result.request);
      setAdminRequestReason('');
    }
    onShowToast?.(result.message);
  };

  if (!isOpen || !user) return null;

  const isUserOwner = isOwner(user);
  const isUserAdmin = isAdmin(user);
  const bookmarkedBooks = books.filter((b) => (user.bookmarks || []).includes(b.id));
  const visibleReaderNotes = readerNotes.filter((note) => note.userId === user.id);
  const filteredReaderNotes = visibleReaderNotes.filter((note) => {
    const query = readerNotesSearch.trim().toLocaleLowerCase();
    if (!query) return true;
    const bookTitle = books.find((book) => book.id === note.bookId)?.title || '';
    const chapterTitle = books.find((book) => book.id === note.bookId)?.chapters.find((chapter) => chapter.id === note.chapterId)?.title || '';
    return [note.selectedText, note.note, bookTitle, chapterTitle]
      .some((value) => value.toLocaleLowerCase().includes(query));
  });

  // Compute actual reading history records for this user
  const allProgress = getAllReadingProgress(user.id);
  const recentlyReadList = Object.entries(allProgress)
    .filter(([_, prog]) => (prog.completedChapterIds && prog.completedChapterIds.length > 0) || prog.lastChapterId)
    .map(([bookId, prog]) => {
      const book = books.find((b) => b.id === bookId);
      if (!book) return null;
      const lastChapter = prog.lastChapterId
        ? book.chapters.find((c) => c.id === prog.lastChapterId) || book.chapters[0]
        : book.chapters[0];
      const completedCount = prog.completedChapterIds?.length || 0;
      const percent = book.chapters.length > 0 ? Math.round((completedCount / book.chapters.length) * 100) : 0;
      return {
        book,
        lastChapter,
        completedCount,
        percent,
        lastReadAt: prog.lastReadAt,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => new Date(b.lastReadAt || 0).getTime() - new Date(a.lastReadAt || 0).getTime());

  const handleStartEditReaderNote = (note: ReaderAnnotation) => {
    setEditingReaderNote(note);
    setEditReaderNoteText(note.note);
    setEditReaderNoteColor(note.color);
  };

  const handleSaveEditedReaderNote = async () => {
    if (!user || !editingReaderNote || editingReaderNote.userId !== user.id) return;
    setIsSavingReaderNoteEdit(true);
    const updated: ReaderAnnotation = {
      ...editingReaderNote,
      note: editReaderNoteText.trim(),
      color: editReaderNoteColor,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };
    const allLocal = getAllReaderAnnotations(user.id);
    const nextLocal = allLocal.map((note) => note.id === updated.id ? updated : note);
    if (!saveAllReaderAnnotations(nextLocal, user.id)) {
      setIsSavingReaderNoteEdit(false);
      onShowToast?.('تعذر حفظ التعديل محلياً. لم نغيّر النسخة الحالية.');
      return;
    }
    setReaderNotes([...nextLocal].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))));
    setEditingReaderNote(null);

    const saved = await saveReaderAnnotationToFirestore(updated);
    setIsSavingReaderNoteEdit(false);
    if (saved) {
      const synced = { ...updated, syncStatus: 'synced' as const };
      upsertReaderAnnotationLocal(synced, user.id);
      setReaderNotes(getAllReaderAnnotations(user.id).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))));
      onShowToast?.('تم تحديث الملاحظة ومزامنتها مع حسابك ✓');
    } else {
      onShowToast?.('حُفظ التعديل على هذا الجهاز، وستتم مزامنته عند عودة الاتصال.');
    }
  };

  const handleExportReaderNotes = () => {
    if (!user || visibleReaderNotes.length === 0) return;
    const lines = [
      '# دفتر ملاحظات حُكم',
      '',
      `تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}`,
      '',
      ...visibleReaderNotes.flatMap((note) => {
        const book = books.find((item) => item.id === note.bookId);
        const chapter = book?.chapters.find((item) => item.id === note.chapterId);
        return [
          `## ${book?.title || 'كتاب غير متاح'} — ${chapter?.title || 'فصل غير متاح'}`,
          '',
          `> ${note.selectedText.replace(/\n/g, '\n> ')}`,
          '',
          note.note || '_لا توجد ملاحظة إضافية._',
          '',
          `لون التمييز: ${note.color} · تاريخ الحفظ: ${note.createdAt}`,
          '',
          '---',
          '',
        ];
      }),
    ];
    const blob = new Blob(['\uFEFF', lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hukm-reading-notes-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpenReaderNote = (note: ReaderAnnotation) => {
    const book = books.find((item) => item.id === note.bookId);
    const chapterExists = book?.chapters.some((chapter) => chapter.id === note.chapterId);
    const chapter = book?.chapters.find((item) => item.id === note.chapterId);
    const canReadPrivateDrafts = isUserAdmin && !isReaderPreviewMode;
    const isPublic = Boolean(book && ['published', 'completed', 'ongoing', 'ready'].includes(book.status) && chapter?.status === 'ready');
    if (!book || !chapterExists || !onOpenReader || (!canReadPrivateDrafts && !isPublic)) {
      onShowToast?.('الكتاب أو الفصل المرتبط بهذا المقتطف لم يعد متاحاً لهذا الحساب.');
      return;
    }
    onOpenReader(note.bookId, note.chapterId);
    onClose();
  };

  const handleDeleteReaderNote = async (note: ReaderAnnotation) => {
    if (user && note.syncStatus === 'synced') {
      const deleted = await deleteReaderAnnotationFromFirestore(user.id, note);
      if (!deleted) {
        onShowToast?.('تعذر حذف المقتطف من السحابة؛ لم نحذفه من جهازك.');
        return;
      }
    }
    const next = removeReaderAnnotationLocal(note.id, user?.id);
    setReaderNotes(next);
    onShowToast?.('تم حذف المقتطف.');
  };

  const handleResend = async () => {
    setIsResending(true);
    const res = await resendVerificationEmail();
    setIsResending(false);
    onShowToast?.(res.message);
  };

  const handleReload = async () => {
    setIsReloading(true);
    const refreshed = await reloadCurrentUserSession();
    setIsReloading(false);
    if (refreshed) {
      onUserRefreshed?.(refreshed);
      if (refreshed.emailVerified) {
        onShowToast?.('تم التحقق وتأكيد البريد بنجاح!');
      } else {
        onShowToast?.('لم يتم تأكيد البريد بعد.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#c59b27]/40 bg-[#0a1226] p-6 sm:p-8 shadow-2xl text-right">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 rounded-full p-1.5 text-[#94a3b8] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        {/* User Card Header */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-5 mb-5">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#c59b27]/40 text-[#f0cb69] shadow-inner text-xl font-black">
            {user.name.charAt(0)}
            {isUserOwner && (
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-[#070d1e] shadow">
                <Crown className="h-3.5 w-3.5" />
              </div>
            )}
            {!isUserOwner && isUserAdmin && (
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white font-cairo">{user.name}</h3>
              {isUserOwner ? (
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-[#f0cb69] border border-amber-500/40">
                  المؤسس والمشرف العام 👑
                </span>
              ) : isUserAdmin ? (
                <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/40">
                  مدير المنصة والناشر 🛡️
                </span>
              ) : (
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  قارئ معتمد 📖
                </span>
              )}
            </div>
            <p className="text-xs text-[#94a3b8]">{user.email}</p>
            <div className="flex items-center gap-1.5 text-[10px] text-[#64748b]">
              <Calendar className="h-3 w-3" />
              <span>عضو منذ: {user.joinedDate}</span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 mb-5 p-1 rounded-2xl bg-[#070d1e] border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#c59b27] text-[#070d1e] shadow-md'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>بيانات الحساب</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-[#c59b27] text-[#070d1e] shadow-md'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <StickyNote className="h-3.5 w-3.5" />
            <span>ملاحظاتي</span>
            <span className={`rounded-full px-1.5 text-[10px] font-black ${activeTab === 'notes' ? 'bg-[#070d1e] text-[#f0cb69]' : 'bg-white/10 text-[#f0cb69]'}`}>
              {visibleReaderNotes.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bookmarks'
                ? 'bg-[#c59b27] text-[#070d1e] shadow-md'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>محفوظاتي</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'bookmarks' ? 'bg-[#070d1e] text-[#f0cb69]' : 'bg-white/10 text-[#f0cb69]'
            }`}>
              {bookmarkedBooks.length}
            </span>
          </button>
        </div>

        {/* TAB 1: PROFILE INFO */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* Verification Status Banner */}
            <div>
              {user.emailVerified ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-2.5 text-xs text-emerald-300">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>الحساب مؤكد وموثق رسمياً عبر Firebase</span>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-950/40 border border-amber-500/40 p-3 text-xs text-amber-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>البريد الإلكتروني غير مؤكد بعد.</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-300 cursor-pointer disabled:opacity-50"
                    >
                      {isResending ? 'جاري الإرسال...' : 'إعادة إرسال الرابط'}
                    </button>
                    <button
                      type="button"
                      onClick={handleReload}
                      disabled={isReloading}
                      className="rounded-lg bg-white/10 hover:bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
                    >
                      {isReloading ? 'جاري الفحص...' : 'فحص التأكيد 🔄'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="rounded-xl bg-[#070d1e] p-3 text-xs text-[#cbd5e1] border border-white/5 leading-relaxed">
                {user.bio}
              </div>
            )}

            {/* Admin role request: reader-only, server-authoritative */}
            {user.role === 'reader' && (
              <div className="rounded-2xl bg-[#070d1e] border border-[#c59b27]/25 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#f0cb69]">
                  <ShieldCheck className="h-4 w-4" />
                  <span>طلب الانضمام إلى فريق الإدارة</span>
                </div>
                {isLoadingAdminRequest ? (
                  <p className="text-xs text-[#94a3b8]">جاري تحميل حالة طلبك...</p>
                ) : adminRequest?.status === 'pending' || adminRequest?.status === 'processing' ? (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-200">
                    {adminRequest.status === 'pending' ? 'طلبك قيد المراجعة من صاحب المنصة.' : 'يجري صاحب المنصة مراجعة طلبك الآن.'}
                    <p className="mt-1 text-[10px] text-amber-200/70">تاريخ الإرسال: {new Date(adminRequest.submittedAt).toLocaleString('ar-EG')}</p>
                  </div>
                ) : adminRequest?.status === 'needs_attention' ? (
                  <p className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-200">تعذر إكمال مراجعة الطلب بأمان. يرجى التواصل مع إدارة المنصة.</p>
                ) : adminRequest?.status === 'approved' ? (
                  <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs text-emerald-200">تمت الموافقة على طلبك. حدّث جلسة الدخول لتفعيل الصلاحيات.</p>
                ) : (
                  <>
                    {adminRequest?.status === 'rejected' && (
                      <p className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-200">
                        لم تتم الموافقة على طلبك السابق. يمكنك تقديم طلب جديد بعد مراجعة السبب.
                        {adminRequest.reviewNote && <span className="block mt-1 text-rose-100/80">ملاحظة الإدارة: {adminRequest.reviewNote}</span>}
                      </p>
                    )}
                    {!user.emailVerified ? (
                      <p className="text-xs text-amber-200">يجب تأكيد بريدك الإلكتروني أولاً قبل تقديم طلب الإدارة.</p>
                    ) : (
                      <>
                        <p className="text-xs text-[#94a3b8] leading-relaxed">اكتب باختصار سبب رغبتك في الانضمام إلى فريق الإدارة. الطلب لا يمنح أي صلاحيات تلقائياً؛ القرار النهائي لصاحب المنصة وحده.</p>
                        <textarea
                          value={adminRequestReason}
                          onChange={(e) => setAdminRequestReason(e.target.value.slice(0, 500))}
                          maxLength={500}
                          rows={3}
                          placeholder="لماذا ترغب في الانضمام إلى فريق الإدارة؟"
                          className="w-full rounded-xl bg-[#050a16] border border-white/15 px-3 py-2.5 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none resize-y"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] text-[#64748b]">{adminRequestReason.length}/500</span>
                          <button type="button" onClick={handleSubmitAdminRequest} disabled={isSubmittingAdminRequest || !adminRequestReason.trim()} className="rounded-xl gold-gradient-btn px-4 py-2 text-xs font-bold text-[#070d1e] disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmittingAdminRequest ? 'جاري الإرسال...' : 'إرسال طلب الإدارة'}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Switch View Mode: For verified Admins / Owner */}
            {isUserAdmin && (
              <div className="rounded-2xl bg-[#070d1e] border border-[#c59b27]/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#f0cb69]">
                  <span>صلاحيات الإدارة ({user.role}):</span>
                  <span className="text-[10px] text-[#94a3b8]">تبديل الواجهة</span>
                </div>
                <button
                  onClick={() => {
                    onToggleReaderPreview?.();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0e1935] hover:bg-[#15254d] border border-[#c59b27]/40 py-2.5 text-xs font-bold text-[#f0cb69] hover:text-white transition-all cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>
                    {isReaderPreviewMode
                      ? 'العودة لواجهة الإدارة والتحرير'
                      : 'معاينة المنصة بتجربة القارئ 👁️'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BOOKMARKS / SAVED BOOKS & READING HISTORY */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-3 mb-2">
            {/* Sub-tab Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#070d1e] border border-white/5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSavedSubTab('favorites')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  savedSubTab === 'favorites'
                    ? 'bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 shadow-sm'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                <Bookmark className="h-3 w-3" />
                <span>المفضلة ({bookmarkedBooks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSavedSubTab('history')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  savedSubTab === 'history'
                    ? 'bg-[#c59b27]/20 text-[#f0cb69] border border-[#c59b27]/40 shadow-sm'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                <History className="h-3 w-3" />
                <span>سجل القراءة ({recentlyReadList.length})</span>
              </button>
            </div>

            {/* SUB-VIEW 1: FAVORITES */}
            {savedSubTab === 'favorites' && (
              <>
                {bookmarkedBooks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-[#070d1e]/50 p-6 text-center text-xs text-[#94a3b8] space-y-2">
                    <Bookmark className="h-8 w-8 mx-auto text-[#64748b] opacity-50" />
                    <p className="font-bold text-white">لم تقم بحفظ أي كتب في المفضلة بعد</p>
                    <p className="text-[11px] text-[#64748b]">
                      يمكنك حفظ أي كتاب بمجرد الضغط على علامة النجمة ⭐ في بطاقة الكتاب أو صفحة نظرة عامة.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar pr-1">
                    {bookmarkedBooks.map((book) => {
                      const bookProgress = getBookReadingProgress(book.id, user.id);
                      const completedCount = bookProgress.completedChapterIds?.length || 0;
                      const percent = book.chapters.length > 0 ? Math.round((completedCount / book.chapters.length) * 100) : 0;

                      return (
                        <div
                          key={book.id}
                          className="flex items-center justify-between rounded-2xl bg-[#070d1e] border border-white/10 p-3 text-xs hover:border-[#c59b27]/40 transition-all group"
                        >
                          <div className="flex items-center gap-3 truncate pr-1">
                            {book.coverImage && (
                              <img
                                src={book.coverImage}
                                alt={book.title}
                                className="h-11 w-8 object-cover rounded-md border border-white/10 shrink-0"
                              />
                            )}
                            <div className="truncate">
                              <span className="font-bold text-white block truncate group-hover:text-[#f0cb69] transition-colors">
                                {book.title}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-[#94a3b8]">
                                <span>{book.chapters.length} فصول</span>
                                {completedCount > 0 && (
                                  <span className="text-emerald-400 font-bold">• قرأت {percent}%</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              onOpenBook(book.id);
                              onClose();
                            }}
                            className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-3 py-1.5 text-[11px] font-bold text-[#070d1e] shadow hover:scale-102 transition-transform shrink-0 cursor-pointer"
                          >
                            <span>قراءة</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* SUB-VIEW 2: READING HISTORY */}
            {savedSubTab === 'history' && (
              <>
                {recentlyReadList.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-[#070d1e]/50 p-6 text-center text-xs text-[#94a3b8] space-y-2">
                    <History className="h-8 w-8 mx-auto text-[#64748b] opacity-50" />
                    <p className="font-bold text-white">لا يوجد سجل قراءة حتى الآن</p>
                    <p className="text-[11px] text-[#64748b]">
                      عندما تبدأ قراءة أي فصل، سيظهر هنا تلقائياً ليمكنك استكمال القراءة من حيث توقفت.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar pr-1">
                    {recentlyReadList.map((item) => (
                      <div
                        key={item.book.id}
                        className="flex items-center justify-between rounded-2xl bg-[#070d1e] border border-white/10 p-3 text-xs hover:border-[#c59b27]/40 transition-all group"
                      >
                        <div className="flex items-center gap-3 truncate pr-1">
                          {item.book.coverImage && (
                            <img
                              src={item.book.coverImage}
                              alt={item.book.title}
                              className="h-12 w-9 object-cover rounded-md border border-white/10 shrink-0"
                            />
                          )}
                          <div className="truncate">
                            <span className="font-bold text-white block truncate group-hover:text-[#f0cb69] transition-colors">
                              {item.book.title}
                            </span>
                            <span className="text-[10px] text-emerald-400 block truncate font-medium">
                              {item.lastChapter?.title || 'الفصل الأخير'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9px] text-[#64748b] mt-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{new Date(item.lastReadAt).toLocaleDateString('ar-EG')}</span>
                              <span>• إنجاز: {item.percent}%</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (onOpenReader) {
                              onOpenReader(item.book.id, item.lastChapter?.id);
                            } else {
                              onOpenBook(item.book.id);
                            }
                            onClose();
                          }}
                          className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 px-3 py-1.5 text-[11px] font-bold text-white shadow hover:scale-102 transition-transform shrink-0 cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>استكمال</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: PRIVATE READING NOTEBOOK */}
        {activeTab === 'notes' && (
          <div className="space-y-3 mb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-white">دفتر مقتطفاتك وملاحظاتك</h4>
                <p className="mt-1 text-[10px] text-[#94a3b8]">مقتطفاتك الخاصة من جميع الكتب، محفوظة لحسابك.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-[#c59b27]/25 bg-[#c59b27]/10 px-2 py-1 text-[10px] font-bold text-[#f0cb69]">{visibleReaderNotes.length} مقتطف</span>
                <button type="button" onClick={handleExportReaderNotes} disabled={visibleReaderNotes.length === 0} className="rounded-lg border border-white/15 p-2 text-[#cbd5e1] hover:border-[#c59b27]/50 disabled:opacity-30" title="تصدير دفتر الملاحظات بصيغة Markdown" aria-label="تصدير الملاحظات">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
              <input
                value={readerNotesSearch}
                onChange={(e) => setReaderNotesSearch(e.target.value)}
                placeholder="ابحث في المقتطفات والكتب والملاحظات..."
                aria-label="البحث في دفتر الملاحظات"
                className="w-full rounded-xl border border-white/10 bg-[#070d1e] py-2.5 pr-9 pl-3 text-xs text-white outline-none focus:border-[#c59b27]"
              />
            </div>

            {isLoadingReaderNotes && visibleReaderNotes.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#94a3b8]">جاري تحميل دفتر الملاحظات...</div>
            ) : visibleReaderNotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#070d1e]/50 p-7 text-center text-xs text-[#94a3b8] space-y-2">
                <Highlighter className="mx-auto h-8 w-8 text-[#64748b]" />
                <p className="font-bold text-white">دفترك ما زال فارغاً</p>
                <p className="text-[11px] text-[#64748b]">أثناء القراءة، حدد أي مقتطف واضغط زر التمييز لحفظه هنا مع ملاحظتك الشخصية.</p>
              </div>
            ) : filteredReaderNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-[#94a3b8]">لا توجد مقتطفات تطابق بحثك.</div>
            ) : (
              <>
                {isLoadingReaderNotes && <p className="text-[10px] text-[#64748b]">الملاحظات المحلية ظاهرة الآن؛ جاري تحديث النسخة السحابية...</p>}
                <div className="max-h-[48vh] overflow-y-auto space-y-2 no-scrollbar pr-1">
                  {filteredReaderNotes.map((note) => {
                    const book = books.find((item) => item.id === note.bookId);
                    const chapter = book?.chapters.find((item) => item.id === note.chapterId);
                    const colorClass = note.color === 'green'
                      ? 'bg-emerald-300/60 text-[#123326]'
                      : note.color === 'blue'
                        ? 'bg-sky-300/70 text-[#102c46]'
                        : note.color === 'rose'
                          ? 'bg-rose-300/70 text-[#451a2a]'
                          : 'bg-amber-300/70 text-[#1f2937]';
                    return (
                      <article key={note.id} className="rounded-xl border border-white/10 bg-[#070d1e] p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-[#f0cb69] truncate">{book?.title || 'كتاب غير متاح'}</p>
                            <p className="text-[10px] text-[#64748b] truncate">{chapter?.title || 'فصل غير متاح'}</p>
                          </div>
                          <span className="shrink-0 text-[9px] text-[#64748b]">
                            {note.syncStatus === 'pending' ? 'بانتظار المزامنة' : note.syncStatus === 'synced' ? 'سحابي' : 'محلي'}
                          </span>
                        </div>
                        <blockquote className={`rounded-lg border-r-2 border-[#c59b27]/50 p-2 text-xs font-bold leading-relaxed ${colorClass}`}>«{note.selectedText}»</blockquote>
                        {note.note && <p className="text-[11px] leading-relaxed text-[#cbd5e1] whitespace-pre-wrap">{note.note}</p>}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenReaderNote(note)}
                            disabled={!book || !chapter || !onOpenReader}
                            className="rounded-lg bg-[#c59b27]/15 px-3 py-1.5 text-[10px] font-bold text-[#f0cb69] hover:bg-[#c59b27]/25 disabled:opacity-40"
                          >
                            العودة إلى موضع النص
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditReaderNote(note)}
                            className="rounded-lg border border-white/15 p-1.5 text-[#cbd5e1] hover:border-[#c59b27]/50"
                            aria-label="تعديل الملاحظة"
                            title="تعديل الملاحظة"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReaderNote(note)}
                            className="rounded-lg border border-rose-500/25 p-1.5 text-rose-400 hover:bg-rose-500/10"
                            aria-label="حذف المقتطف"
                            title="حذف المقتطف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {editingReaderNote && editingReaderNote.userId === user.id && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation">
            <div role="dialog" aria-modal="true" aria-labelledby="edit-reader-note-title" className="w-full max-w-lg rounded-2xl border border-[#c59b27]/35 bg-[#0a1226] p-5 text-right text-white shadow-2xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 id="edit-reader-note-title" className="text-sm font-black text-[#f0cb69]">تعديل ملاحظتك</h3>
                  <p className="mt-1 text-[10px] text-[#94a3b8]">النص المقتبس وموضعه ثابتان؛ يمكنك تعديل الملاحظة ولون التمييز.</p>
                </div>
                <button type="button" onClick={() => setEditingReaderNote(null)} className="rounded-lg p-2 text-[#94a3b8] hover:bg-white/5" aria-label="إغلاق">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <blockquote className="rounded-xl border-r-2 border-[#c59b27] bg-white/5 p-3 text-xs leading-relaxed text-[#e2e8f0]">
                «{editingReaderNote.selectedText}»
              </blockquote>
              <label className="block space-y-2">
                <span className="text-xs font-bold text-[#cbd5e1]">الملاحظة</span>
                <textarea
                  value={editReaderNoteText}
                  onChange={(e) => setEditReaderNoteText(e.target.value.slice(0, 2000))}
                  maxLength={2000}
                  rows={4}
                  className="w-full resize-y rounded-xl border border-white/15 bg-[#050a16] px-3 py-2.5 text-xs leading-relaxed text-white outline-none focus:border-[#c59b27]"
                />
                <span className="block text-left text-[10px] text-[#64748b]">{editReaderNoteText.length}/2000</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(['gold', 'green', 'blue', 'rose'] as const).map((color) => (
                  <button key={color} type="button" onClick={() => setEditReaderNoteColor(color)} className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold ${color === 'gold' ? 'bg-amber-300 text-[#1f2937]' : color === 'green' ? 'bg-emerald-300 text-[#123326]' : color === 'blue' ? 'bg-sky-300 text-[#102c46]' : 'bg-rose-300 text-[#451a2a]'} ${editReaderNoteColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a1226]' : 'opacity-65'}`}>
                    {color === 'gold' ? 'ذهبي' : color === 'green' ? 'أخضر' : color === 'blue' ? 'أزرق' : 'وردي'}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingReaderNote(null)} className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-[#cbd5e1]">إلغاء</button>
                <button type="button" onClick={handleSaveEditedReaderNote} disabled={isSavingReaderNoteEdit} className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-4 py-2 text-xs font-black text-[#070d1e] disabled:opacity-50">
                  {isSavingReaderNoteEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>تسجيل الخروج</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-[#0e1935] px-4 py-2 text-xs font-bold text-[#cbd5e1] hover:text-white cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
