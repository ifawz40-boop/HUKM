import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Crown,
  Trash2,
  Loader2,
  Lock,
} from 'lucide-react';
import { AdminAccount, AdminRequest, BannedAccount, UserProfile } from '../types/auth';
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
import { isOwner, isAdmin } from '../services/permissionService';
import {
  listPendingAdminRequests,
  reviewAdminRequest,
  revokeAdminRole,
  grantOwnerRole,
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
  const isFounder = adminsList.some((admin) => (admin.uid || admin.id) === currentUser?.id && admin.isFounder === true);

  // If user is owner, default to admins tab; if regular admin, lock to bans tab
  const [activeTab, setActiveTab] = useState<'admins' | 'bans'>(isUserOwner ? 'admins' : 'bans');
  const [adminsList, setAdminsList] = useState<AdminAccount[]>([]);
  const [bansList, setBansList] = useState<BannedAccount[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);

  const [pendingRequests, setPendingRequests] = useState<AdminRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [reviewingRequestUid, setReviewingRequestUid] = useState<string | null>(null);
  const [additionalOwnerEmail, setAdditionalOwnerEmail] = useState('');
  const [isGrantingOwner, setIsGrantingOwner] = useState(false);

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
    if (remote !== null) {
      setAdminsList(remote);
    }
    setIsLoadingAdmins(false);
  };

  const loadPendingRequests = async () => {
    if (!isUserOwner) return;
    setIsLoadingRequests(true);
    const result = await listPendingAdminRequests();
    setPendingRequests(result.success ? result.requests : []);
    if (!result.success) onShowToast(result.message || 'تعذر تحميل طلبات الإدارة.');
    setIsLoadingRequests(false);
  };

  const loadBans = async () => {
    const remote = await fetchBansFromFirestore();
    if (remote !== null) {
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
      if (isUserOwner) loadPendingRequests();
    }
  }, [isOpen, isUserOwner]);

  if (!isOpen || !currentUser || !isUserAdmin) return null;

  const handleGrantOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = additionalOwnerEmail.trim().toLowerCase();
    if (!email) {
      onShowToast('أدخل البريد الإلكتروني للحساب المراد إضافته.');
      return;
    }
    if (!confirm('هل تؤكد منح هذا الحساب صلاحيات Owner كاملة؟ يجب أن يكون الحساب مسجلًا وبريده موثقًا.')) return;

    setIsGrantingOwner(true);
    try {
      const result = await grantOwnerRole(email);
      onShowToast(result.message);
      if (result.success) {
        setAdditionalOwnerEmail('');
        await loadAdmins();
      }
    } finally {
      setIsGrantingOwner(false);
    }
  };

  // Revoke Admin Custom Claim and revoke tokens
  const handleRevokeAdmin = async (adminAccount: AdminAccount) => {
    if (adminAccount.isFounder) {
      onShowToast('لا يمكن سحب صلاحيات المالك المؤسس الأساسي.');
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
            <span>إدارة المدراء ({adminsList.length})</span>
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
                {isFounder ? (
                <section className="rounded-2xl border border-amber-500/30 bg-[#151326] p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-200">
                    <Crown className="h-4 w-4" />
                    <h3 className="text-sm font-bold">إضافة مالك آخر للمنصة</h3>
                  </div>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    يمنح هذا الإجراء صلاحيات Owner كاملة لحساب موجود وموثق في Firebase. المالك المؤسس الأساسي محمي من السحب، ويمكن للمالك إدارة المالكين الإضافيين.
                  </p>
                  <form onSubmit={handleGrantOwner} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      required
                      value={additionalOwnerEmail}
                      onChange={(e) => setAdditionalOwnerEmail(e.target.value)}
                      placeholder="البريد الإلكتروني لحساب مسجل وموثق"
                      className="min-w-0 flex-1 rounded-xl bg-[#070d1e] border border-amber-500/25 px-3 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isGrantingOwner}
                      className="rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-2.5 text-xs font-bold text-amber-200 disabled:opacity-50"
                    >
                      {isGrantingOwner ? 'جارٍ التحقق والمنح...' : 'منح صلاحية Owner'}
                    </button>
                  </form>
                </section>

                ) : (
                  <p className="rounded-xl border border-white/10 bg-[#070d1e] p-3 text-xs text-[#94a3b8]">
                    إضافة مالكين جدد مقتصرة على المالك المؤسس الأساسي. صلاحيات المالكين الآخرين لا تشمل تعيين مالكين إضافيين.
                  </p>
                )}

                {/* Admin requests: approval is the only grant path */}
                <section className="rounded-2xl border border-[#c59b27]/30 bg-[#0a142c] p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">طلبات الانضمام إلى فريق الإدارة</h3>
                      <p className="text-xs text-[#94a3b8] mt-1">لا تُمنح الصلاحيات إلا بعد موافقتك من الخادم.</p>
                    </div>
                    <button type="button" onClick={loadPendingRequests} disabled={isLoadingRequests} className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-[#cbd5e1] disabled:opacity-50">
                      {isLoadingRequests ? 'جاري التحديث...' : 'تحديث'}
                    </button>
                  </div>
                  {isLoadingRequests ? (
                    <div className="py-5 text-center text-xs text-[#94a3b8]">جاري تحميل الطلبات...</div>
                  ) : pendingRequests.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-[#64748b]">لا توجد طلبات معلقة حالياً.</div>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequests.map((request) => (
                        <article key={request.uid} className="rounded-xl border border-white/10 bg-[#070d1e] p-3 sm:p-4 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-white">{request.displayName}</p>
                              <p className="text-[11px] text-[#94a3b8]">{request.email}</p>
                              <p className="text-[10px] text-[#64748b] mt-1">{new Date(request.submittedAt).toLocaleString('ar-EG')}</p>
                            </div>
                            <span className={`rounded-md border px-2 py-1 text-[10px] ${request.status === 'needs_attention' ? 'bg-rose-500/10 border-rose-500/25 text-rose-200' : 'bg-amber-500/10 border-amber-500/25 text-amber-200'}`}>
                              {request.status === 'needs_attention' ? 'يتطلب فحصًا يدويًا' : request.status === 'processing' ? 'جارٍ التنفيذ' : 'قيد المراجعة'}
                            </span>
                          </div>
                          <p className="rounded-lg bg-white/5 p-3 text-xs text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">{request.reason}</p>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={reviewingRequestUid === request.uid || request.status === 'needs_attention' || (request.status === 'processing' && (!request.processingAt || Date.now() - Date.parse(request.processingAt) <= 5 * 60 * 1000))} onClick={async () => {
                              setReviewingRequestUid(request.uid);
                              try {
                                const result = await reviewAdminRequest(request.uid, 'approve');
                                onShowToast(result.message);
                                if (result.success) await loadAdmins();
                              } finally {
                                setReviewingRequestUid(null);
                                await loadPendingRequests();
                              }
                            }} className="rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-2 text-[11px] font-bold text-emerald-300 disabled:opacity-50">
                              {reviewingRequestUid === request.uid ? 'جاري التنفيذ...' : 'موافقة ومنح صلاحية المدير'}
                            </button>
                            <button type="button" disabled={reviewingRequestUid === request.uid || request.status === 'needs_attention' || (request.status === 'processing' && (!request.processingAt || Date.now() - Date.parse(request.processingAt) <= 5 * 60 * 1000))} onClick={async () => {
                              if (!confirm('هل تريد رفض طلب الإدارة؟ لن تُمنح أي صلاحيات لهذا الحساب.')) return;
                              setReviewingRequestUid(request.uid);
                              try {
                                const result = await reviewAdminRequest(request.uid, 'reject');
                                onShowToast(result.message);
                              } finally {
                                setReviewingRequestUid(null);
                                await loadPendingRequests();
                              }
                            }} className="rounded-lg bg-rose-600/10 border border-rose-500/30 px-3 py-2 text-[11px] font-bold text-rose-300 disabled:opacity-50">
                              رفض الطلب
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

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
                                {admin.isFounder ? (
                                  <span className="text-[11px] text-[#64748b]">المالك المؤسس (محمي)</span>
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
