import React from 'react';
import { ShieldAlert, Clock, AlertTriangle, LogOut, Mail } from 'lucide-react';
import { BannedAccount } from '../types/auth';
import { HUKM_LOGO } from '../data/hukmData';
import { formatRemainingTime } from '../utils/moderationTracker';

interface BannedNoticeModalProps {
  isOpen: boolean;
  banDetails: BannedAccount | null;
  onLogout: () => void;
}

export const BannedNoticeModal: React.FC<BannedNoticeModalProps> = ({
  isOpen,
  banDetails,
  onLogout,
}) => {
  if (!isOpen || !banDetails) return null;

  const isPermanent = banDetails.banType === 'permanent';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-red-500/40 bg-[#0a060a] p-6 sm:p-8 shadow-2xl text-right">
        {/* Top Crest */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-red-500/50 bg-[#050a16] shadow-xl p-0.5">
            <img src={HUKM_LOGO} alt="حُكم | HUKM MEDIA" className="h-full w-full object-cover scale-105" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-950/60 border border-red-500/40 px-3 py-1 text-xs font-bold text-red-300">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <span>إشعار إداري رسمي من منصة حُكم</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white font-cairo">
            تم تعليق هذا الحساب لمخالفة المعايير
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
            نعتذر، لقد تم إيقاف صلاحية الدخول واستخدام الحساب (<strong className="text-white">{banDetails.email}</strong>) بناءً على مراجعة الإدارة وضوابط المنصة.
          </p>
        </div>

        {/* Ban Details Card */}
        <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4 space-y-3 mb-6">
          <div className="flex items-center justify-between text-xs border-b border-red-500/20 pb-2">
            <span className="text-slate-400 font-bold">مستوى الإجراء:</span>
            <span
              className={`rounded px-2 py-0.5 font-bold ${
                isPermanent
                  ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                  : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
              }`}
            >
              {isPermanent ? 'حظر دائم ونهائي' : 'حظر مؤقت'}
            </span>
          </div>

          {!isPermanent && banDetails.expiresAt && (
            <div className="flex items-center justify-between text-xs border-b border-red-500/20 pb-2">
              <span className="text-slate-400 font-bold">المدة المتبقية:</span>
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatRemainingTime(banDetails.expiresAt)}
              </span>
            </div>
          )}

          <div className="text-xs space-y-1">
            <span className="text-slate-400 font-bold block">السبب المسجل:</span>
            <p className="text-slate-200 bg-black/40 p-2.5 rounded-xl border border-white/5 leading-relaxed font-sans">
              {banDetails.reason || 'مخالفة معايير الحوار والتوثيق المعتمدة في منصة حُكم.'}
            </p>
          </div>

          <div className="text-[11px] text-slate-400 text-left pt-1">
            بواسطة: {banDetails.bannedBy}
          </div>
        </div>

        {/* Appeal Information */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-slate-300 mb-6 flex items-start gap-2.5">
          <Mail className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            لتقديم طلب مراجعة أو استئناف، يرجى مراسلة لجنة الإشراف الرسمية تحت إشراف المؤسس:
            <span className="block font-bold text-[#f0cb69] mt-0.5">dr.islam.mohamed@hukm.media</span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white py-3 text-xs font-bold transition-all cursor-pointer shadow-lg"
          >
            <LogOut className="h-4 w-4" />
            <span>تسجيل الخروج والعودة كزائر</span>
          </button>
        </div>
      </div>
    </div>
  );
};
