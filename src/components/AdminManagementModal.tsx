import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Ban,
  Clock,
  CheckCircle,
  AlertTriangle,
  Mail,
  User,
  Crown,
  Trash2,
  Search,
  Loader2,
  Lock,
} from 'lucide-react';
import { AdminAccount, BannedAccount, UserProfile } from '../types/auth';
import {
  getStoredBans,
  banUser,
  unbanUser,
  formatRemainingTime,
} from '../utils/moderationTracker';
import {
  fetchAdminsFromFirestore,
  fetchBansFromFirestore,
  saveBanToFirestore,
} from '../firebase/firestoreService';
import { canManageAdmins, isOwner, isAdmin } from '../services/permissionService';
import {
  lookupUserByEmail,
  assignAdminRole,
  revokeAdminRole,
} from '../services/adminClaimsClient';

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onShowToast: (message: string) => void;
}

export const AdminManagementModal: React.FC<AdminManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast,
}) => {
  const isUserOwner = isOwner(currentUser);
  const isUserAdmin = isAdmin(currentUser);

  // If user is owner, default to admins tab; if regular admin, lock to bans tab
  const [activeTab, setActiveTab] = useState<'admins' | 'bans'>(isUserOwner ? 'admins' : 'bans');
  const [adminsList, setAdminsList] = useState<AdminAccount[]>([]);
  const [bansList, setBansList] = useState<BannedAccount[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);

  // User Lookup & Add Admin state
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    currentRole: string;
  } | null>(null);
  const [newAdminTitle, setNewAdminTitle] = useState('مدير تحرير معتمد');
  const [isAssigningRole, setIsAssigningRole] = useState(false);

  // Ban form state
  const [banEmail, setBanEmail] = useState('');
  const [banName, setBanName] = useState('');
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banDurationDays, setBanDurationDays] = useState<number>(7);
  const [banReason, setBanReason] = useState('مخالفة معايير الحوار الموضوعي وإساءة استخدام المنصة.');

  // Load admins and bans from Firestore
  const loadAdmins = async () => {
    setIsLoadingAdmins(true);
    const remote = await fetchAdminsFromFirestore();
    if (remote && remote.length > 0) {
      setAdminsList(remote);
    }
    setIsLoadingAdmins(false);
  };

  const loadBans = async () => {
    const remote = await fetchBansFromFirestore();
    if (remote && remote.length > 0) {
      setBansList(remote);
    } else {
      setBansList(getStoredBans());
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (!isUserOwner) {
        setActiveTab('bans');
      }
      loadAdmins();
      loadBans();
    }
  }, [isOpen, isUserOwner]);

  if (!isOpen || !currentUser || !isUserAdmin) return null;

  // Search User by Email in Firebase Auth
  const handleLookupUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim() || !searchEmail.includes('@')) {
      onShowToast('يرجى كتابة بريد إلكتروني صالح للبحث.');
      return;
    }

    setIsSearchingUser(true);
    setFoundUser(null);

    const res = await lookupUserByEmail(searchEmail.trim());
    setIsSearchingUser(false);

    if (res.success && res.user) {
      setFoundUser(res.user);
      onShowToast(`تم العثور على الحساب: ${res.user.displayName}`);
    } else {
      onShowToast(res.message || 'لم يتم العثور على حساب مسجل بهذا البريد.');
    }
  };

  // Assign Admin Custom Claim and UID identity
  const handleConfirmAssignAdmin = async () => {
    if (!foundUser) return;

    if (!foundUser.emailVerified) {
      onShowToast('عذراً، لا يمكن منح رتبة إدارية لحساب غير مؤكد بريدياً طبقاً لسياسة الأمان.');
      return;
    }

    setIsAssigningRole(true);
    const res = await assignAdminRole(foundUser.uid, newAdminTitle);
    setIsAssigningRole(false);

    if (res.success) {
      onShowToast(res.message);
      setFoundUser(null);
      setSearchEmail('');
      await loadAdmins();
    } else {
      onShowToast(res.message);
    }
  };

  // Revoke Admin Custom Claim and revoke tokens
  const handleRevokeAdmin = async (adminAccount: AdminAccount) => {
    if (adminAccount.isFounder || adminAccount.role === 'owner') {
      onShowToast('لا يمكن سحب صلاحيات المؤسس الرئيسي.');
      return;
    }

    const targetUid = adminAccount.uid || adminAccount.id;
    if (confirm(`هل أنت متأكد من سحب صلاحية الإدارة نهائياً من ${adminAccount.name}؟`)) {
      const res = await revokeAdminRole(targetUid);
      if (res.success) {
        onShowToast(res.message);
        await loadAdmins();
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
      bannedBy: currentUser.name || 'إدارة حُكم',
    });

    if (res.success) {
      setBansList(getStoredBans());
      if (res.ban) {
        saveBanToFirestore(res.ban);
      }
      setBanEmail('');
      setBanName('');
      onShowToast(res.message);
    } else {
      onShowToast(res.message);
    }
  };

  const handleUnban = (banId: string) => {
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
                  مركز الإدارة والرقابة المعرفية | <span className="gold-gradient-text">HUKM MEDIA</span>
                </h2>
              </div>
              <p className="text-xs text-[#94a3b8] font-cairo">
                {isUserOwner ? (
                  <span className="text-[#f0cb69] font-bold">صاحب المنصة والمشرف العام (صلاحيات كاملة تشمل تعيين وسحب المدراء) 👑</span>
                ) : (
                  <span className="text-blue-300 font-bold">مدير معتمد (إدارة المحتوى وضبط المعايير والحظر) 🛡️</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#94a3b8] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#081023] px-6 pt-3 gap-4">
          <button
            onClick={() => {
              if (isUserOwner) {
                setActiveTab('admins');
              } else {
                onShowToast('خاص بصاحب المنصة: تعيين وسحب المدراء مقتصر حصرياً على رتبة Owner.');
              }
            }}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'admins'
                ? 'border-[#c59b27] text-[#f0cb69]'
                : isUserOwner
                ? 'border-transparent text-[#94a3b8] hover:text-white'
                : 'border-transparent text-slate-500 opacity-60 cursor-not-allowed'
            }`}
          >
            {isUserOwner ? <Crown className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            <span>تعيين وإدارة المدراء ({adminsList.length})</span>
            {!isUserOwner && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Owner فقط</span>}
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
          {/* TAB 1: ADMINS MANAGEMENT (OWNER ONLY) */}
          {activeTab === 'admins' && (
            isUserOwner ? (
              <div className="space-y-6">
                {/* Search & Assign Admin Card */}
                <div className="rounded-2xl border border-[#c59b27]/30 bg-[#0a142c] p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2 text-white font-cairo text-sm font-bold">
                    <UserPlus className="h-4 w-4 text-[#d4af37]" />
                    <span>تعيين مدير موثق عبر معرف Firebase UID الحقيقي</span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mb-4 leading-relaxed">
                    لحماية المنصة، يتم التحقق أولاً من وجود حساب المستخدم في Firebase وتأكيد بريده الإلكتروني قبل منح Custom Claims.
                  </p>

                  <form onSubmit={handleLookupUser} className="flex flex-col sm:flex-row gap-2.5 mb-4">
                    <div className="relative flex-1">
                      <Mail className="absolute right-3.5 top-3 h-4 w-4 text-[#64748b]" />
                      <input
                        type="email"
                        required
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        placeholder="ابحث بالبريد الإلكتروني المسجل في المنصة..."
                        className="w-full rounded-xl bg-[#050a16] border border-white/15 px-3.5 py-2.5 pr-10 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearchingUser}
                      className="flex items-center justify-center gap-2 rounded-xl gold-gradient-btn px-5 py-2.5 text-xs font-bold text-[#070d1e] shadow-md hover:scale-102 transition-transform cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {isSearchingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      <span>فحص الحساب وتأكيده</span>
                    </button>
                  </form>

                  {/* Found Account Preview Card */}
                  {foundUser && (
                    <div className="rounded-2xl bg-[#070d1e] border border-[#c59b27]/40 p-4 space-y-3 animate-in fade-in duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{foundUser.displayName}</span>
                            <span className="text-xs text-[#94a3b8]">({foundUser.email})</span>
                          </div>
                          <span className="text-[11px] text-[#64748b] font-mono block">Firebase UID: {foundUser.uid}</span>
                        </div>

                        <div>
                          {foundUser.emailVerified ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold">
                              <CheckCircle className="h-3.5 w-3.5" />
                              البريد مؤكد وموثق
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 text-xs font-bold">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              بريد غير مؤكد (لا يمكن ترقيته)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] text-[#cbd5e1] mb-1 font-bold">المسمى الإداري:</label>
                          <input
                            type="text"
                            value={newAdminTitle}
                            onChange={(e) => setNewAdminTitle(e.target.value)}
                            placeholder="مثلاً: مدير تحرير معتمد"
                            className="w-full rounded-xl bg-[#050a16] border border-white/15 px-3 py-2 text-xs text-white focus:border-[#c59b27] focus:outline-none"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={handleConfirmAssignAdmin}
                            disabled={!foundUser.emailVerified || isAssigningRole}
                            className="w-full flex items-center justify-center gap-2 rounded-xl gold-gradient-btn py-2 text-xs font-bold text-[#070d1e] shadow-md hover:scale-101 transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isAssigningRole ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>جاري تعيين Custom Claims...</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-4 w-4" />
                                <span>منح رتبة مدير وتفعيل Custom Claims</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Admins Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#d4af37]" />
                      <span>قائمة المدراء والمشرفين المعتمدين في النظام ({adminsList.length})</span>
                    </h3>
                  </div>

                  {isLoadingAdmins ? (
                    <div className="text-center py-8 text-xs text-[#94a3b8] flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
                      <span>جاري مزامنة قائمة المدراء من Firestore...</span>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1226]">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#050a16] text-[#94a3b8] border-b border-white/10 font-bold">
                          <tr>
                            <th className="py-3 px-4">المدير / المشرف</th>
                            <th className="py-3 px-4">المسمى والرتبة</th>
                            <th className="py-3 px-4 hidden md:table-cell">معرف Firebase UID</th>
                            <th className="py-3 px-4 text-center">إجراءات الصلاحية</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {adminsList.map((admin) => (
                            <tr key={admin.uid || admin.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  {admin.role === 'owner' || admin.isFounder ? (
                                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                                  ) : (
                                    <Shield className="h-3.5 w-3.5 text-blue-400" />
                                  )}
                                  <span>{admin.name}</span>
                                </div>
                                <span className="text-[11px] text-[#94a3b8] block">{admin.email}</span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                  admin.role === 'owner' || admin.isFounder
                                    ? 'bg-amber-500/20 text-[#f0cb69] border-amber-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                }`}>
                                  {admin.title}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 hidden md:table-cell text-[#64748b] font-mono text-[10px]">
                                {admin.uid || admin.id}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                {admin.role === 'owner' || admin.isFounder ? (
                                  <span className="text-[11px] text-[#64748b]">المؤسس (محمي)</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeAdmin(admin)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 px-2.5 py-1 text-[11px] font-bold text-red-300 transition-colors cursor-pointer"
                                    title="سحب صلاحية الإدارة وإلغاء Custom Claims فوراً"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>سحب الصلاحية</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Lock className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                <p className="font-bold text-white">إدارة المدراء مخصصة لصاحب المنصة (Owner) حصرياً.</p>
              </div>
            )
          )}

          {/* TAB 2: BANS & MODERATION (ACCESSIBLE TO ADMIN & OWNER) */}
          {activeTab === 'bans' && (
            <div className="space-y-6">
              {/* Add Ban Card */}
              <div className="rounded-2xl border border-red-500/30 bg-[#160b13]/60 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2 text-red-300 font-cairo text-sm font-bold">
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                  <span>إصدار قرار حظر / تعليق حساب مخالف للمعاير</span>
                </div>
                <p className="text-xs text-[#94a3b8] mb-4 leading-relaxed">
                  الحساب المحظور يُمنع فورياً من التفاعل أو القراءة وتظهر له وثيقة المخالفة الرسمية وتوقيت انتهاء التعليق.
                </p>

                <form onSubmit={handleBanUser} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#cbd5e1] mb-1 font-bold">بريد الحساب المخالف:</label>
                      <input
                        type="email"
                        required
                        value={banEmail}
                        onChange={(e) => setBanEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full rounded-xl bg-[#070d1e] border border-white/15 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#cbd5e1] mb-1 font-bold">اسم صاحب الحساب (اختياري):</label>
                      <input
                        type="text"
                        value={banName}
                        onChange={(e) => setBanName(e.target.value)}
                        placeholder="اسم المستخدم"
                        className="w-full rounded-xl bg-[#070d1e] border border-white/15 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#cbd5e1] mb-1 font-bold">نوع الحظر:</label>
                      <select
                        value={banType}
                        onChange={(e) => setBanType(e.target.value as 'temporary' | 'permanent')}
                        className="w-full rounded-xl bg-[#070d1e] border border-white/15 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                      >
                        <option value="temporary">تعليق مؤقت (محدد بأيام)</option>
                        <option value="permanent">حظر دائم وشامل</option>
                      </select>
                    </div>

                    {banType === 'temporary' && (
                      <div>
                        <label className="block text-[11px] text-[#cbd5e1] mb-1 font-bold">المدة بالأيام:</label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={banDurationDays}
                          onChange={(e) => setBanDurationDays(parseInt(e.target.value) || 1)}
                          className="w-full rounded-xl bg-[#070d1e] border border-white/15 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#cbd5e1] mb-1 font-bold">سبب المخالفة الصريح:</label>
                    <input
                      type="text"
                      required
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="سبب القرار الذي سيظهر للمستخدم..."
                      className="w-full rounded-xl bg-[#070d1e] border border-white/15 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/50 transition-all cursor-pointer"
                  >
                    تطبيق قرار الحظر والتعليق
                  </button>
                </form>
              </div>

              {/* Bans List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-400" />
                  <span>سجل الحسابات المحظورة والمعلقة ({bansList.length})</span>
                </h3>

                {bansList.length === 0 ? (
                  <div className="rounded-xl border border-white/5 bg-[#0a1226] p-6 text-center text-xs text-[#64748b]">
                    لا توجد حسابات معلقة حالياً. المنصة في حالة استقرار تام.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bansList.map((ban) => (
                      <div
                        key={ban.id}
                        className={`rounded-2xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                          ban.isActive
                            ? 'bg-[#150a11] border-red-500/30'
                            : 'bg-[#0a1226] border-white/5 opacity-60'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{ban.name || ban.email}</span>
                            <span className="text-[#94a3b8]">({ban.email})</span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                ban.isActive
                                  ? ban.banType === 'permanent'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {ban.isActive
                                ? ban.banType === 'permanent'
                                  ? 'حظر دائم'
                                  : `مؤقت: ${formatRemainingTime(ban.expiresAt)}`
                                : 'منتهي / ملغى'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">السبب: {ban.reason}</p>
                          <span className="text-[10px] text-[#64748b] block">بواسطة: {ban.bannedBy}</span>
                        </div>

                        {ban.isActive && (
                          <button
                            type="button"
                            onClick={() => handleUnban(ban.id)}
                            className="rounded-xl bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shrink-0"
                          >
                            رفع الحظر
                          </button>
                        )}
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
