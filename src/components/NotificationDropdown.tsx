import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  BookOpen,
  FileText,
  Megaphone,
  Sparkles,
  ExternalLink,
  PlusCircle,
  X,
} from 'lucide-react';
import { AppNotification } from '../types/auth';

interface NotificationDropdownProps {
  notifications: AppNotification[];
  isOwner: boolean;
  onSelectNotification: (notif: AppNotification) => void;
  onMarkAllAsRead: () => void;
  onOpenSendAnnouncement?: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  isOwner,
  onSelectNotification,
  onMarkAllAsRead,
  onOpenSendAnnouncement,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'new_chapter':
        return <BookOpen className="h-4 w-4 text-[#d4af37]" />;
      case 'new_book':
        return <Sparkles className="h-4 w-4 text-emerald-400" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-amber-400" />;
      default:
        return <Bell className="h-4 w-4 text-[#f0cb69]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef} dir="rtl">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center rounded-xl bg-[#0e1935] hover:bg-[#15254d] border border-[#c59b27]/30 p-2 text-[#cbd5e1] hover:text-[#f0cb69] transition-all cursor-pointer focus:outline-none"
        aria-label="الإشعارات والتنبيهات"
        title="التنبيهات والإشعارات"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-1 text-[10px] font-black text-white shadow-md animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute left-0 right-auto mt-2 w-80 sm:w-96 rounded-2xl border border-[#c59b27]/40 bg-[#0a1226] p-4 shadow-2xl shadow-black/80 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white font-cairo">مركز الإشعارات</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#c59b27]/20 px-2 py-0.5 text-[10px] font-bold text-[#f0cb69] border border-[#c59b27]/30">
                  {unreadCount} جديد
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-[11px] font-bold text-[#94a3b8] hover:text-[#f0cb69] transition-colors"
                >
                  تحديد الكل كمقروء
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#64748b] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Owner Quick Broadcast Action */}
          {isOwner && onOpenSendAnnouncement && (
            <div className="mt-2.5 mb-2 rounded-xl bg-gradient-to-r from-[#172554] to-[#0f172a] border border-[#c59b27]/40 p-2.5 flex items-center justify-between">
              <div className="text-right">
                <span className="text-[11px] font-bold text-[#f0cb69] block">
                  لوحة تحكم الناشر
                </span>
                <span className="text-[10px] text-[#cbd5e1]">
                  أرسل تنبيهاً فورياً لكل القراء
                </span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSendAnnouncement();
                }}
                className="flex items-center gap-1 rounded-lg bg-[#c59b27] px-2.5 py-1 text-[11px] font-bold text-[#070d1e] hover:bg-[#d4af37] transition-colors shadow"
              >
                <Megaphone className="h-3 w-3" />
                <span>بث إشعار</span>
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="mt-2 max-h-80 overflow-y-auto space-y-2 pr-1 no-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748b]">
                لا توجد إشعارات حالياً.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    onSelectNotification(notif);
                    setIsOpen(false);
                  }}
                  className={`relative flex items-start gap-3 rounded-xl p-2.5 text-right transition-all cursor-pointer ${
                    !notif.read
                      ? 'bg-[#101b36] border border-[#c59b27]/30 hover:bg-[#162752]'
                      : 'bg-[#070d1e]/60 border border-white/5 hover:bg-[#070d1e]'
                  }`}
                >
                  {/* Icon container */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#070d1e] border border-white/10 mt-0.5">
                    {getIcon(notif.type)}
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-white truncate font-cairo">
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#cbd5e1] line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-[#64748b] block mt-1">
                      {notif.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
