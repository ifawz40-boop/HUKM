import React from 'react';
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
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import { BookProject } from '../types/hukm';
import { OWNER_USER, DEMO_READER_USER, isAuthorizedOwnerEmail } from '../utils/authStorage';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  books: BookProject[];
  isReaderPreviewMode?: boolean;
  onToggleReaderPreview?: () => void;
  onSwitchUser: (targetUser: UserProfile) => void;
  onLogout: () => void;
  onOpenBook: (bookId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  books,
  isReaderPreviewMode = false,
  onToggleReaderPreview,
  onSwitchUser,
  onLogout,
  onOpenBook,
}) => {
  if (!isOpen) return null;

  const isOwnerUser = isAuthorizedOwnerEmail(user.email);
  const bookmarkedBooks = books.filter((b) => user.bookmarks.includes(b.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#c59b27]/40 bg-[#0a1226] p-6 sm:p-8 shadow-2xl text-right">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 rounded-full p-1.5 text-[#94a3b8] hover:bg-white/10 hover:text-white transition-colors"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        {/* User Card Header */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-5 mb-5">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#c59b27]/40 text-[#f0cb69] shadow-inner text-xl font-black">
            {user.name.charAt(0)}
            {isOwnerUser && (
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-[#070d1e] shadow">
                <Crown className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white font-cairo">{user.name}</h3>
              {isOwnerUser ? (
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-[#f0cb69] border border-amber-500/40">
                  صاحب المنصة 👑
                </span>
              ) : (
                <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
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

        {/* Bio */}
        {user.bio && (
          <div className="mb-5 rounded-xl bg-[#070d1e] p-3 text-xs text-[#cbd5e1] border border-white/5 leading-relaxed">
            {user.bio}
          </div>
        )}

        {/* Bookmarks Section */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span className="flex items-center gap-1.5 text-[#f0cb69]">
              <Bookmark className="h-4 w-4" />
              <span>المحفوظات والمفضلة ({bookmarkedBooks.length})</span>
            </span>
          </div>

          {bookmarkedBooks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-[#64748b]">
              لم تقم بحفظ أي كتب في المفضلة بعد. اضغط على أيقونة الإشارة المرجعية لأي كتاب لحفظه هنا!
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar pr-1">
              {bookmarkedBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center justify-between rounded-xl bg-[#070d1e] border border-white/5 p-2.5 text-xs hover:border-[#c59b27]/30 transition-colors"
                >
                  <div className="truncate pr-2">
                    <span className="font-bold text-white block truncate">
                      {book.title}
                    </span>
                    <span className="text-[10px] text-[#94a3b8]">
                      {book.chapters.length} فصول
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onOpenBook(book.id);
                      onClose();
                    }}
                    className="flex items-center gap-1 rounded-lg bg-[#c59b27]/20 border border-[#c59b27]/40 px-2.5 py-1 text-[11px] font-bold text-[#f0cb69] hover:bg-[#c59b27] hover:text-[#070d1e] transition-colors shrink-0"
                  >
                    <span>قراءة</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Switch View Mode: Strictly and exclusively for ifawz40@gmail.com */}
        {isOwnerUser && (
          <div className="rounded-2xl bg-[#070d1e] border border-[#c59b27]/30 p-3 mb-5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#f0cb69]">
              <span>👑 خاص بحساب المالك ({user.email}):</span>
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
                  ? 'العودة لواجهة صاحب المنصة (صلاحيات كاملة)'
                  : 'التبديل إلى معاينة تجربة القارئ 👁️'}
              </span>
            </button>
          </div>
        )}


        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>تسجيل الخروج</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-[#0e1935] px-4 py-2 text-xs font-bold text-[#cbd5e1] hover:text-white"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
