import React, { useState } from 'react';
import { X, Plus, Trash2, Layers, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { CategoryItem, BookProject } from '../types/hukm';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  books: BookProject[];
  onAddCategory: (category: { name: string; description?: string }) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  books,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setError('يرجى إدخال اسم القسم');
      return;
    }

    if (categories.some((c) => c.name.toLowerCase() === newCatName.trim().toLowerCase())) {
      setError('هذا القسم موجود مسبقاً');
      return;
    }

    onAddCategory({
      name: newCatName.trim(),
      description: newCatDesc.trim(),
    });

    setNewCatName('');
    setNewCatDesc('');
    setError('');
    setSuccessMsg('تمت إضافة القسم بنجاح!');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const handleDelete = (categoryId: string, categoryName: string) => {
    const booksInCat = books.filter((b) => b.category === categoryId).length;
    let message = `هل أنت متأكد من حذف قسم "${categoryName}"؟`;
    if (booksInCat > 0) {
      message += ` يوجد ${booksInCat} كتب مرتبطة بهذا القسم، وسيتم نقلها إلى قسم "عام".`;
    }

    if (confirm(message)) {
      onDeleteCategory(categoryId);
      setSuccessMsg(`تم حذف قسم "${categoryName}"`);
      setTimeout(() => setSuccessMsg(''), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
      <div className="relative my-8 w-full max-w-xl rounded-2xl border border-[#c59b27]/40 bg-[#0a1226] p-6 shadow-2xl text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c59b27]/20 border border-[#c59b27]/40 text-[#f0cb69]">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-cairo">
                إدارة أقسام وتصنيفات الكتب
              </h3>
              <p className="text-[11px] text-[#94a3b8]">
                إضافة وحذف وتعديل مسارات المعرفة في حُكم | HUKM MEDIA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748b] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-300">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form: Add New Category */}
        <form onSubmit={handleAdd} className="mt-4 space-y-3 bg-[#070d1e] p-4 rounded-xl border border-white/5">
          <h4 className="text-xs font-bold text-[#d4af37]">إضافة قسم جديد:</h4>
          <div className="space-y-2">
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => {
                setNewCatName(e.target.value);
                setError('');
              }}
              placeholder="اسم القسم الجديد (مثال: علم النفس والسلوك، الاقتصاد السياسي...)"
              className="w-full rounded-xl bg-[#0a1226] p-2.5 text-xs font-semibold text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
            />
            <input
              type="text"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="وصف مختصر لموضوعات هذا القسم..."
              className="w-full rounded-xl bg-[#0a1226] p-2 text-xs text-[#cbd5e1] border border-white/10 focus:border-[#d4af37] focus:outline-none"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-[#c59b27] hover:bg-[#d4af37] px-4 py-2 text-xs font-bold text-[#070d1e] shadow transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة القسم</span>
            </button>
          </div>
        </form>

        {/* Existing Categories List */}
        <div className="mt-5 space-y-2.5 max-h-[45vh] overflow-y-auto pl-1">
          <h4 className="text-xs font-bold text-[#94a3b8] mb-1">الأقسام الحالية ({categories.length}):</h4>
          {categories.map((cat) => {
            const count = books.filter((b) => b.category === cat.id).length;
            return (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#070d1e] border border-white/5 hover:border-[#c59b27]/30 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-cairo">
                      {cat.name}
                    </span>
                    <span className="rounded-full bg-[#c59b27]/15 px-2 py-0.2 text-[10px] font-bold text-[#f0cb69]">
                      {count} كتب
                    </span>
                  </div>
                  {cat.description && (
                    <p className="text-[11px] text-[#64748b] mt-0.5">{cat.description}</p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="rounded-lg p-2 text-[#64748b] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="حذف هذا القسم"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end border-t border-white/10 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-[#0e1935] hover:bg-[#15254d] px-5 py-2 text-xs font-bold text-white"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
