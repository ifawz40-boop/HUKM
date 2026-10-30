import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  UserMinus,
  Ban,
  Clock,
  CheckCircle,
  AlertTriangle,
  Mail,
  User,
  Crown,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { AdminAccount, BannedAccount, UserProfile } from '../types/auth';
import {
  getStoredAdmins,
  addAdmin,
  removeAdmin,
  getStoredBans,
  banUser,
  unbanUser,
  formatRemainingTime,
} from '../utils/moderationTracker';

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onShowToast: (message: string) => void;
}

export const AdminManagementModal: React.FC<AdminManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'admins' | 'bans'>('admins');
  const [adminsList, setAdminsList] = useState<AdminAccount[]>([]);
  const [bansList, setBansList] = useState<BannedAccount[]>([]);

  // Add Admin form state
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminTitle, setNewAdminTitle] = useState('مدير تحرير معتمد');

  // Ban form state
  const [banEmail, setBanEmail] = useState('');
  const [banName, setBanName] = useState('');
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banDurationDays, setBanDurationDays] = useState<number>(7);
  const [banReason, setBanReason] = useState('مخالفة معايير الحوار الموضوعي وإساءة استخدام المنصة.');

  useEffect(() => {
    if (isOpen) {
      setAdminsList(getStoredAdmins());
      setBansList(getStoredBans());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handlers for Admins
  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) {
      onShowToast('يرجى كتابة البريد الإلكتروني للمدير.');
      return;
    }

    const res = addAdmin({
      email: newAdminEmail,
      name: newAdminName,
      title: newAdminTitle,
      addedBy: currentUser.name || 'إدارة حُكم',
      canEditBooks: true,
      canManageBans: true,
    });

    if (res.success) {
      setAdminsList(getStoredAdmins());
      setNewAdminEmail('');
      setNewAdminName('');
      onShowToast(res.message);
    } else {
      onShowToast(res.message);
    }
  };

  const handleRemoveAdmin = (adminId: string, adminName: string) => {
    if (confirm(`هل أنت متأكد من سحب صلاحية الإدارة من ${adminName}؟`)) {
      const res = removeAdmin(adminId);
      if (res.success) {
        setAdminsList(getStoredAdmins());
        onShowToast(res.message);
      } else {
        onShowToast(res.message);
      }
    }
  };

  // Handlers for Bans
  const handleBanUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!banEmail.trim()) {
      onShowToast('يرجى كتابة البريد الإلكتروني للحساب المراد حظره.');
      return;
    }

    const res = banUser({
      email: banEmail,
      name: banName,
      banType,
      durationDays: banType === 'temporary' ? banDurationDays : undefined,
      reason: banReason,
      bannedBy: currentUser.name || 'Dr/ Islam Mohamed',
    });

    if (res.success) {
      setBansList(getStoredBans());
      setBanEmail('');
      setBanName('');
      onShowToast(res.message);
    } else {
      onShowToast(res.message);
    }
  };

  const handleUnban = (banId: string, email: string) => {
    const res = unbanUser(banId);
    if (res.success) {
      setBansList(getStoredBans());
      onShowToast(res.message);
    } else {
      onShowToast(res.message);
    }
  };

  const activeBansCount = bansList.filter((b) => b.isActive).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl border border-[#c59b27]/40 bg-[#070d1e] shadow-2xl flex flex-col text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c59b27]/25 bg-[#0a1226] px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#050a16] border border-[#c59b27]/50 shadow text-[#f0cb69]">
              <ShieldCheck className="h-6 w-6 text-[#d4af37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-cairo">
                  مركز الإدارة وضبط المعايير والحظر | <span className="gold-gradient-text">HUKM MEDIA</span>
                </h2>
              </div>
              <p className="text-xs text-[#94a3b8] font-cairo">
                إشراف المؤسس: <strong className="text-[#f0cb69]">Dr/ Islam Mohamed</strong>
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
        <div className="flex border-b border-white/10 bg-[#081023] px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'admins'
                ? 'border-[#c59b27] text-[#f0cb69]'
                : 'border-transparent text-[#94a3b8] hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>تعيين وإدارة المدراء ({adminsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bans')}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'bans'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-[#94a3b8] hover:text-white'
            }`}
          >
            <Ban className="h-4 w-4" />
            <span>ضبط المعايير وحظر الحسابات ({activeBansCount})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: ADMINS MANAGEMENT */}
          {activeTab === 'admins' && (
            <div className="space-y-6">
              {/* Add Admin Card */}
              <div className="rounded-2xl border border-[#c59b27]/30 bg-[#0a142c] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3 text-white font-cairo text-sm font-bold">
                  <UserPlus className="h-4 w-4 text-[#d4af37]" />
                  <span>تعيين بريد شخص كمدير للمنصة (منح صلاحيات التعديل والنشر)</span>
                </div>
                <p className="text-xs text-[#94a3b8] mb-4 leading-relaxed">
                  بمجرد إضافة البريد الإلكتروني، سيتمكن صاحبه فور تسجيل الدخول من الدخول إلى استوديو تأليف ونشر الكتب، وتعديل الفصول، وإدارة التصنيفات.
                </p>

                <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                      البريد الإلكتروني للمدير <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="editor@hukm.media"
                        className="w-full rounded-xl border border-white/15 bg-[#050a16] pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#c59b27] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                      اسم المدير
                    </label>
                    <div className="relative">
                      <User className="absolute right-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
                      <input
                        type="text"
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="مثال: د. كمال رضوان"
                        className="w-full rounded-xl border border-white/15 bg-[#050a16] pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#c59b27] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                      المسمى التحريري
                    </label>
                    <input
                      type="text"
                      value={newAdminTitle}
                      onChange={(e) => setNewAdminTitle(e.target.value)}
                      placeholder="مدير تحرير / باحث استقصائي"
                      className="w-full rounded-xl border border-white/15 bg-[#050a16] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#c59b27] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3 flex justify-end pt-2">
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl gold-gradient-btn px-5 py-2.5 text-xs font-bold text-[#070d1e] shadow transition-all hover:scale-101 cursor-pointer"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>منح صلاحيات الإدارة والتعديل</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Current Admins List */}
              <div>
                <h3 className="text-sm font-bold text-white font-cairo mb-3">
                  قائمة المدراء المعتمدين حالياً بالمنصة
                </h3>
                <div className="space-y-2.5">
                  {adminsList.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#091124] p-3.5 hover:border-[#c59b27]/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm ${
                            admin.isFounder
                              ? 'bg-[#c59b27]/20 border border-[#c59b27] text-[#f0cb69]'
                              : 'bg-blue-950/40 border border-blue-500/30 text-blue-400'
                          }`}
                        >
                          {admin.isFounder ? <Crown className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-white font-cairo">
                              {admin.name}
                            </h4>
                            {admin.isFounder && (
                              <span className="rounded-full bg-[#c59b27]/20 border border-[#c59b27]/50 px-2 py-0.5 text-[10px] font-bold text-[#f0cb69]">
                                المؤسس الرسمي
                              </span>
                            )}
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-[#cbd5e1]">
                              {admin.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#94a3b8] mt-0.5">
                            <span>{admin.email}</span>
                            <span>• أضيف بواسطة: {admin.addedBy}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          <CheckCircle className="h-3 w-3" />
                          <span>صلاحيات التعديل كاملة</span>
                        </span>

                        {!admin.isFounder && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmin(admin.id, admin.name)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="سحب صلاحية الإدارة"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BANS & USER MODERATION */}
          {activeTab === 'bans' && (
            <div className="space-y-6">
              {/* Ban Form */}
              <div className="rounded-2xl border border-red-500/30 bg-[#160a0f] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3 text-red-400 font-cairo text-sm font-bold">
                  <ShieldAlert className="h-4 w-4" />
                  <span>حظر حساب غير ملتزم بالمعايير (مؤقت أو دائم)</span>
                </div>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  يمنع الحساب المحظور من تسجيل الدخول والمشاركة على المنصة، وتظهر له رسالة توضح نوع ومدة الحظر والسبب المسجل من الإدارة.
                </p>

                <form onSubmit={handleBanUser} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        البريد الإلكتروني المراد حظره <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={banEmail}
                        onChange={(e) => setBanEmail(e.target.value)}
                        placeholder="user.violator@domain.com"
                        className="w-full rounded-xl border border-red-500/20 bg-[#070d1e] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        اسم صاحب الحساب (اختياري)
                      </label>
                      <input
                        type="text"
                        value={banName}
                        onChange={(e) => setBanName(e.target.value)}
                        placeholder="اسم المستخدم إن وُجد"
                        className="w-full rounded-xl border border-red-500/20 bg-[#070d1e] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        نوع الحظر
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBanType('temporary')}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            banType === 'temporary'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          حظر مؤقت
                        </button>
                        <button
                          type="button"
                          onClick={() => setBanType('permanent')}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            banType === 'permanent'
                              ? 'bg-red-500/20 border-red-500 text-red-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          حظر دائم نهائي
                        </button>
                      </div>
                    </div>

                    {banType === 'temporary' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          مدة الحظر المؤقت
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setBanDurationDays(1)}
                            className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                              banDurationDays === 1
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            24 ساعة
                          </button>
                          <button
                            type="button"
                            onClick={() => setBanDurationDays(7)}
                            className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                              banDurationDays === 7
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            7 أيام
                          </button>
                          <button
                            type="button"
                            onClick={() => setBanDurationDays(30)}
                            className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                              banDurationDays === 30
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            30 يوماً
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      سبب الحظر (يظهر للمستخدم عند محاولة الدخول)
                    </label>
                    <textarea
                      rows={2}
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      className="w-full rounded-xl border border-red-500/20 bg-[#070d1e] p-2.5 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 px-5 text-xs font-bold text-white shadow transition-all cursor-pointer"
                    >
                      <Ban className="h-4 w-4" />
                      <span>تأكيد فرض الحظر على الحساب</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Banned Accounts List */}
              <div>
                <h3 className="text-sm font-bold text-white font-cairo mb-3 flex items-center justify-between">
                  <span>سجل الحسابات المحظورة والمقيدة</span>
                  <span className="text-xs text-slate-400 font-normal">
                    {activeBansCount} حسابات محظورة حالياً
                  </span>
                </h3>

                {bansList.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[#091124] p-8 text-center text-[#94a3b8]">
                    لا توجد أي حسابات محظورة حالياً.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {bansList.map((ban) => (
                      <div
                        key={ban.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                          ban.isActive
                            ? 'border-red-500/30 bg-[#14080c]'
                            : 'border-white/10 bg-[#091124] opacity-60'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-white font-cairo">
                              {ban.email}
                            </span>
                            {ban.name && (
                              <span className="text-xs text-slate-400">({ban.name})</span>
                            )}
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                !ban.isActive
                                ? 'bg-slate-700 text-slate-300'
                                : ban.banType === 'permanent'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {!ban.isActive
                                ? 'تم رفع الحظر'
                                : ban.banType === 'permanent'
                                ? 'حظر دائم'
                                : 'حظر مؤقت'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">
                            <strong className="text-slate-400">السبب:</strong> {ban.reason}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ban.isActive ? formatRemainingTime(ban.expiresAt) : 'حظر غير نشط'}
                            </span>
                            <span>بواسطة: {ban.bannedBy}</span>
                          </div>
                        </div>

                        <div>
                          {ban.isActive && (
                            <button
                              type="button"
                              onClick={() => handleUnban(ban.id, ban.email)}
                              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>رفع الحظر الآن</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
