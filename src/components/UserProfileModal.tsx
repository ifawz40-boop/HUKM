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
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import { BookProject } from '../types/hukm';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'bookmarks'>(initialTab);
  const [savedSubTab, setSavedSubTab] = useState<'favorites' | 'history'>('favorites');
  const [isResending, setIsResending] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen || !user) return null;

  const isUserOwner = isOwner(user);
  const isUserAdmin = isAdmin(user);
  const bookmarkedBooks = books.filter((b) => (user.bookmarks || []).includes(b.id));

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
