import React, { useState, useEffect, useRef } from 'react';
import { BookResearchPanel } from './BookResearchPanel';
import {
  PenTool,
  BookOpen,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  FileText,
  Clock,
  Layers,
  Eye,
  Check,
  Edit3,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FolderPlus,
  Sparkles,
  Search,
  BookMarked,
  ArrowRight,
} from 'lucide-react';
import { BookProject, BookChapter, CategoryItem } from '../types/hukm';
import { calculateWordsCount, calculateReadingTimeMinutes, getCategoryName } from '../utils/hukmEngine';
import { WriterDraftSnapshot } from '../types/hukm';
import { getWriterDraftSnapshot, removeWriterDraftSnapshot, removeWriterDraftSnapshotsForBook, saveWriterDraftSnapshot } from '../utils/writerDraftRecovery';

// Quick curated collection of high-res novel cover arts for easy 1-click selection
const PRESET_COVERS = [
  {
    name: 'أرشيف وغموض',
    url: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'تاريخ وحضارة',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'فلسفة وتأمل',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'علوم وبحث',
    url: 'https://images.unsplash.com/photo-1507842229450-7994c502b48d?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'تحقيقات وأسرار',
    url: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=800&q=80',
  },
];

interface BookWriterStudioProps {
  books: BookProject[];
  currentBook: BookProject | null;
  categories?: CategoryItem[];
  onSelectBook: (bookId: string) => void;
  onUpdateBook: (updatedBook: BookProject) => void | Promise<boolean>;
  onCreateBook?: (newBook: BookProject) => void | Promise<boolean>;
  onDeleteBook?: (bookId: string) => void | Promise<boolean>;
  onPreviewBook: (bookId: string, chapterId?: string) => void;
  onAddCategory?: (category: { name: string; description?: string }) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onOpenAdminModal?: () => void;
  currentUserId?: string;
}

export const BookWriterStudio: React.FC<BookWriterStudioProps> = ({
  books,
  currentBook,
  categories = [],
  onSelectBook,
  onUpdateBook,
  onCreateBook,
  onDeleteBook,
  onPreviewBook,
  onAddCategory,
  onDeleteCategory,
  onOpenAdminModal,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'novels' | 'editor' | 'research' | 'categories'>('novels');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [recoverySnapshot, setRecoverySnapshot] = useState<WriterDraftSnapshot | null>(null);
  const [lastLocalAutosavedAt, setLastLocalAutosavedAt] = useState<string | null>(null);

  // Novel Creation / Editing Modal State
  const [isNovelModalOpen, setIsNovelModalOpen] = useState(false);
  const [editingNovelId, setEditingNovelId] = useState<string | null>(null);
  const [novelTitle, setNovelTitle] = useState('');
  const [novelAuthor, setNovelAuthor] = useState('');
  const [novelCategory, setNovelCategory] = useState(categories[0]?.id || 'investigations');
  const [novelStatus, setNovelStatus] = useState<'draft' | 'ongoing' | 'completed'>('draft');
  const [novelCover, setNovelCover] = useState(PRESET_COVERS[0].url);
  const [novelSummary, setNovelSummary] = useState('');

  // Chapter Editing State
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    currentBook?.chapters[0]?.id || ''
  );
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const isSavingChapterRef = useRef(false);
  const currentChapter = isCreatingChapter
    ? undefined
    : currentBook?.chapters.find((c) => c.id === selectedChapterId) ||
      (!selectedChapterId ? currentBook?.chapters[0] : undefined);

  const [chapterNumber, setChapterNumber] = useState<number>(currentChapter?.chapterNumber || 1);
  const [chapterTitle, setChapterTitle] = useState(currentChapter?.title || '');
  const [chapterContent, setChapterContent] = useState(
    currentChapter ? currentChapter.content.join('\n\n') : ''
  );
  // Default status for chapters is 'draft' for safety
  const [chapterStatus, setChapterStatus] = useState<'draft' | 'ready'>(
    currentChapter?.status || 'draft'
  );
  const editorBaseUpdatedAtRef = useRef<string | null>(currentChapter?.updatedAt || null);
  const dismissedRecoveryKeyRef = useRef<string | null>(null);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Reset editor state when the selected book changes; never carry another book's chapter text over.
  const previousBookIdRef = useRef(currentBook?.id);
  useEffect(() => {
    if (previousBookIdRef.current === currentBook?.id) return;
    previousBookIdRef.current = currentBook?.id;
    setIsCreatingChapter(false);
    const firstChapter = currentBook?.chapters[0];
    editorBaseUpdatedAtRef.current = firstChapter?.updatedAt || null;
    setRecoverySnapshot(null);
    setLastLocalAutosavedAt(null);
    dismissedRecoveryKeyRef.current = null;
    setSelectedChapterId(firstChapter?.id || '');
    setChapterNumber(firstChapter?.chapterNumber || 1);
    setChapterTitle(firstChapter?.title || '');
    setChapterContent(firstChapter ? firstChapter.content.join('\n\n') : '');
    setChapterStatus(firstChapter?.status || 'draft');
  }, [currentBook?.id]);

  const showNotification = (msg: string, isError: boolean = false) => {
    if (isError) {
      setSaveErrorMsg(msg);
      setTimeout(() => setSaveErrorMsg(null), 4000);
    } else {
      setSaveSuccessMsg(msg);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  const isEditorDirty = isCreatingChapter
    ? Boolean(chapterTitle.trim() || chapterContent.trim())
    : Boolean(currentChapter ? (
        chapterTitle !== currentChapter.title ||
        chapterContent !== currentChapter.content.join('\n\n') ||
        chapterNumber !== currentChapter.chapterNumber ||
        chapterStatus !== currentChapter.status
      ) : Boolean(selectedChapterId && (chapterTitle.trim() || chapterContent.trim())));

  // Offer recovery rather than overwriting a local snapshot automatically.
  useEffect(() => {
    if (!currentUserId || !currentBook) {
      setRecoverySnapshot(null);
      return;
    }

    const activeChapterId = isCreatingChapter ? null : currentChapter?.id || selectedChapterId || null;
    let snapshot = getWriterDraftSnapshot(currentUserId, currentBook.id, activeChapterId);
    if (!snapshot && !isCreatingChapter) {
      snapshot = getWriterDraftSnapshot(currentUserId, currentBook.id, null);
    }
    if (!snapshot) {
      setRecoverySnapshot(null);
      return;
    }
    const snapshotKey = `${currentBook.id}::${snapshot.chapterId || 'new'}`;
    if (dismissedRecoveryKeyRef.current === snapshotKey) {
      setRecoverySnapshot(null);
      return;
    }

    const cloudChapter = snapshot.chapterId
      ? currentBook.chapters.find((chapter) => chapter.id === snapshot!.chapterId)
      : null;
    const snapshotMatchesCloud = Boolean(cloudChapter &&
      snapshot.chapterNumber === cloudChapter.chapterNumber &&
      snapshot.title === cloudChapter.title &&
      snapshot.content === cloudChapter.content.join('\n\n') &&
      snapshot.status === cloudChapter.status);

    if (snapshotMatchesCloud) {
      removeWriterDraftSnapshot(currentUserId, currentBook.id, snapshot.chapterId);
      setRecoverySnapshot(null);
      return;
    }
    setRecoverySnapshot(snapshot);
  }, [currentUserId, currentBook?.id, currentChapter?.id, currentChapter?.updatedAt, selectedChapterId, isCreatingChapter]);

  // Debounced local autosave only; this does not create Firestore writes.
  useEffect(() => {
    if (!currentUserId || !currentBook || recoverySnapshot) return;

    const chapterId = isCreatingChapter ? null : currentChapter?.id || selectedChapterId || null;
    if (!isEditorDirty) {
      removeWriterDraftSnapshot(currentUserId, currentBook.id, chapterId);
      setLastLocalAutosavedAt(null);
      return;
    }

    const savedAt = new Date().toISOString();
    const snapshot: WriterDraftSnapshot = {
      id: `${currentBook.id}::${chapterId || 'new'}`,
      userId: currentUserId,
      bookId: currentBook.id,
      chapterId,
      chapterNumber: Math.max(1, Number(chapterNumber) || 1),
      title: chapterTitle,
      content: chapterContent,
      status: chapterStatus,
      baseUpdatedAt: editorBaseUpdatedAtRef.current,
      savedAt,
    };

    const timer = window.setTimeout(() => {
      const saved = saveWriterDraftSnapshot(snapshot);
      if (saved) {
        setLastLocalAutosavedAt(savedAt);
      } else {
        setSaveErrorMsg('تعذر حفظ نسخة الاسترداد المحلية. قد تكون مساحة تخزين المتصفح ممتلئة أو تجاوز النص الحد الآمن.');
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [
    currentUserId,
    currentBook?.id,
    currentChapter?.id,
    currentChapter?.updatedAt,
    isCreatingChapter,
    chapterNumber,
    chapterTitle,
    chapterContent,
    chapterStatus,
    isEditorDirty,
    recoverySnapshot,
  ]);

  const handleRestoreWriterDraft = () => {
    if (!recoverySnapshot || !currentBook || recoverySnapshot.userId !== currentUserId || recoverySnapshot.bookId !== currentBook.id) return;
    dismissedRecoveryKeyRef.current = `${currentBook.id}::${recoverySnapshot.chapterId || 'new'}`;
    const existingChapter = recoverySnapshot.chapterId
      ? currentBook.chapters.find((chapter) => chapter.id === recoverySnapshot.chapterId)
      : null;
    const restoreAsNew = !existingChapter;
    setIsCreatingChapter(restoreAsNew);
    setSelectedChapterId(existingChapter?.id || '');

    const maxNumber = Math.max(0, ...currentBook.chapters.map((chapter) => chapter.chapterNumber || 0));
    const proposedNumber = recoverySnapshot.chapterNumber;
    const numberInUse = currentBook.chapters.some((chapter) => chapter.chapterNumber === proposedNumber && chapter.id !== existingChapter?.id);
    setChapterNumber(restoreAsNew && numberInUse ? maxNumber + 1 : proposedNumber);
    setChapterTitle(recoverySnapshot.title);
    setChapterContent(recoverySnapshot.content);
    setChapterStatus(recoverySnapshot.status);
    setLastLocalAutosavedAt(null);
    editorBaseUpdatedAtRef.current = existingChapter ? recoverySnapshot.baseUpdatedAt : null;
    setRecoverySnapshot(null);
    showNotification(restoreAsNew
      ? 'تم استعادة الفصل المحلي كمشروع جديد غير منشور.'
      : 'تم استعادة النسخة المحلية. راجع التغييرات ثم احفظها يدوياً.');
  };

  const handleDiscardWriterDraft = () => {
    if (!recoverySnapshot || !currentBook || !currentUserId) return;
    dismissedRecoveryKeyRef.current = null;
    removeWriterDraftSnapshot(currentUserId, currentBook.id, recoverySnapshot.chapterId);
    const target = recoverySnapshot.chapterId
      ? currentBook.chapters.find((chapter) => chapter.id === recoverySnapshot.chapterId)
      : currentBook.chapters.find((chapter) => chapter.id === selectedChapterId) || currentBook.chapters[0];
    setRecoverySnapshot(null);
    if (target) {
      handleSelectChapter(target);
    } else {
      setIsCreatingChapter(false);
      setSelectedChapterId('');
      setChapterNumber(1);
      setChapterTitle('');
      setChapterContent('');
      setChapterStatus('draft');
      editorBaseUpdatedAtRef.current = null;
    }
    showNotification('تم تجاهل النسخة المحلية والعودة إلى النسخة الحالية.');
  };

  // Sync state when current chapter changes
  const handleSelectChapter = (ch: BookChapter) => {
    if (isSavingChapterRef.current) return;
    setRecoverySnapshot(null);
    setLastLocalAutosavedAt(null);
    dismissedRecoveryKeyRef.current = null;
    setIsCreatingChapter(false);
    editorBaseUpdatedAtRef.current = ch.updatedAt || null;
    setSelectedChapterId(ch.id);
    setChapterNumber(ch.chapterNumber);
    setChapterTitle(ch.title);
    setChapterContent(ch.content.join('\n\n'));
    setChapterStatus(ch.status);
    setActiveTab('editor');
  };

  // Save current chapter
  const handleSaveChapter = async () => {
    if (!currentBook || isSavingChapterRef.current) return;

    if (!chapterTitle.trim()) {
      alert('يرجى إدخال عنوان الفصل.');
      return;
    }

    const chNum = Number(chapterNumber);
    if (!Number.isInteger(chNum) || chNum <= 0) {
      alert('يرجى إدخال رقم فصل صحيح أكبر من صفر.');
      return;
    }

    // Validate chapter number uniqueness within this book
    const duplicateChapter = (currentBook.chapters || []).find(
      (ch) => ch.chapterNumber === chNum && ch.id !== (currentChapter?.id || '')
    );
    if (duplicateChapter) {
      alert(`رقم الفصل ${chNum} مستخدم بالفعل في هذا العمل للفصل «${duplicateChapter.title}». يرجى استخدام رقم غير مكرر.`);
      return;
    }

    const paragraphs = chapterContent
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Publishing integrity validation: Ready chapters MUST have non-empty content!
    if (chapterStatus === 'ready' && paragraphs.length === 0) {
      alert('لا يمكن اعتماد الفصل كـ جاهز للقراءة (ready) بدون محتوى حقيقي. يرجى كتابة نص الفصل أو حفظه كـ مسودة (draft).');
      return;
    }

    const words = calculateWordsCount(paragraphs);
    const readingTime = calculateReadingTimeMinutes(words);

    let updatedChapters: BookChapter[];
    let createdChapterId: string | null = null;

    if (currentChapter) {
      // Update existing chapter (no fake placeholder text)
      updatedChapters = currentBook.chapters.map((ch) =>
        ch.id === currentChapter.id
          ? {
              ...ch,
              chapterNumber: chNum,
              title: chapterTitle.trim(),
              content: paragraphs,
              status: chapterStatus,
              wordCount: words,
              readingTimeMinutes: readingTime,
              updatedAt: new Date().toISOString(),
            }
          : ch
      );
    } else {
      // Create new chapter
      const newCh: BookChapter = {
        id: `ch-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`,
        bookId: currentBook.id,
        chapterNumber: chNum,
        title: chapterTitle.trim(),
        content: paragraphs,
        status: chapterStatus,
        wordCount: words,
        readingTimeMinutes: readingTime,
        viewsCount: 0,
        updatedAt: new Date().toISOString(),
      };
      updatedChapters = [...currentBook.chapters, newCh];
      createdChapterId = newCh.id;
    }

    // Sort chapters by chapterNumber ascending
    updatedChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

    const updatedBook: BookProject = {
      ...currentBook,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    };

    isSavingChapterRef.current = true;
    setIsSavingChapter(true);
    try {
      const result = await onUpdateBook(updatedBook);
      if (result === false) {
        showNotification('فشل حفظ الفصل في السحابة. تم الاحتفاظ بتعديلاتك في المحرر.', true);
        return;
      }
      if (createdChapterId) {
        setIsCreatingChapter(false);
        setSelectedChapterId(createdChapterId);
      }
      const savedChapterId = createdChapterId || currentChapter?.id || null;
      const savedChapter = savedChapterId
        ? updatedChapters.find((chapter) => chapter.id === savedChapterId)
        : null;
      editorBaseUpdatedAtRef.current = savedChapter?.updatedAt || null;
      if (currentUserId) removeWriterDraftSnapshot(currentUserId, currentBook.id, createdChapterId ? null : savedChapterId);
      dismissedRecoveryKeyRef.current = null;
      setRecoverySnapshot(null);
      setLastLocalAutosavedAt(null);
      showNotification('تم حفظ وتحديث الفصل بنجاح ومزامنته سحابياً ✓');
    } catch (err: any) {
      showNotification('حدث خطأ أثناء حفظ الفصل. تم الاحتفاظ بالبيانات محلياً.', true);
    } finally {
      isSavingChapterRef.current = false;
      setIsSavingChapter(false);
    }
  };

  // Add new chapter trigger: defaults strictly to 'draft' and clean empty content
  const handleCreateNewChapter = () => {
    if (!currentBook || isSavingChapterRef.current) return;
    const nextNumber = Math.max(0, ...currentBook.chapters.map((chapter) => chapter.chapterNumber || 0)) + 1;
    setRecoverySnapshot(null);
    setLastLocalAutosavedAt(null);
    dismissedRecoveryKeyRef.current = null;
    setIsCreatingChapter(true);
    editorBaseUpdatedAtRef.current = null;
    setSelectedChapterId('');
    setChapterNumber(nextNumber);
    setChapterTitle(`الفصل ${nextNumber}`);
    setChapterContent('');
    setChapterStatus('draft'); // Default status must be draft!
    setActiveTab('editor');
  };

  // Delete chapter
  const handleDeleteChapter = async (chId: string) => {
    if (!currentBook || isSavingChapterRef.current) return;
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الفصل؟')) return;

    const remaining = currentBook.chapters.filter((c) => c.id !== chId);
    const updatedBook = {
      ...currentBook,
      chapters: remaining,
      updatedAt: new Date().toISOString(),
    };

    try {
      const result = await onUpdateBook(updatedBook);
      if (result === false) {
        showNotification('فشل حذف الفصل من السحابة.', true);
        return;
      }
      if (currentUserId) removeWriterDraftSnapshot(currentUserId, currentBook.id, chId);
      if (recoverySnapshot?.chapterId === chId) setRecoverySnapshot(null);
      if (selectedChapterId === chId) {
        if (remaining.length > 0) {
          handleSelectChapter(remaining[0]);
        } else {
          setIsCreatingChapter(false);
          setSelectedChapterId('');
          setChapterNumber(1);
          setChapterTitle('');
          setChapterContent('');
          editorBaseUpdatedAtRef.current = null;
          setLastLocalAutosavedAt(null);
        }
      }
      showNotification('تم حذف الفصل بنجاح.');
    } catch (err: any) {
      showNotification('حدث خطأ أثناء حذف الفصل.', true);
    }
  };

  // Open Novel Modal for Create
  const handleOpenCreateNovel = () => {
    setEditingNovelId(null);
    setNovelTitle('');
    setNovelAuthor('');
    setNovelCategory(categories[0]?.id || 'investigations');
    setNovelStatus('draft');
    setNovelCover(PRESET_COVERS[0].url);
    setNovelSummary('');
    setIsNovelModalOpen(true);
  };

  // Open Novel Modal for Edit
  const handleOpenEditNovel = (book: BookProject) => {
    setEditingNovelId(book.id);
    setNovelTitle(book.title);
    setNovelAuthor(book.author || '');
    setNovelCategory(book.category);
    setNovelStatus(book.status === 'completed' ? 'completed' : ['published', 'ongoing', 'ready'].includes(book.status) ? 'ongoing' : 'draft');
    setNovelCover(book.coverImage || PRESET_COVERS[0].url);
    setNovelSummary(book.summary || '');
    setIsNovelModalOpen(true);
  };

  // Save Novel (Create or Edit)
  const handleSaveNovel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novelTitle.trim()) {
      alert('يرجى إدخال عنوان الرواية / العمل.');
      return;
    }

    if (novelStatus !== 'draft') {
      const targetBook = editingNovelId ? books.find((book) => book.id === editingNovelId) : null;
      const readyChapterCount = (targetBook?.chapters || []).filter((chapter) => chapter.status === 'ready').length;
      if (readyChapterCount === 0) {
        alert('لا يمكن إتاحة العمل للقراء قبل وجود فصل واحد منشور على الأقل. احفظه كمسودة أولاً، ثم انشره بعد تجهيز المحتوى.');
        return;
      }
    }

    if (editingNovelId) {
      // Editing existing novel
      const existing = books.find((b) => b.id === editingNovelId);
      if (existing) {
        const updated: BookProject = {
          ...existing,
          title: novelTitle.trim(),
          author: novelAuthor.trim(),
          category: novelCategory,
          status: novelStatus,
          coverImage: novelCover.trim(),
          summary: novelSummary.trim(),
          updatedAt: new Date().toISOString(),
        };
        const res = await onUpdateBook(updated);
        if (res === false) {
          showNotification('فشل تحديث بيانات العمل في السحابة.', true);
          return;
        }
        showNotification('تم تحديث بيانات العمل بنجاح ✓');
      }
    } else {
      // Creating new novel
      const newBook: BookProject = {
        id: `novel-${Date.now()}`,
        title: novelTitle.trim(),
        author: novelAuthor.trim(),
        category: novelCategory,
        status: novelStatus,
        coverImage: novelCover.trim() || PRESET_COVERS[0].url,
        summary: novelSummary.trim(),
        viewsCount: 0,
        chapters: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      let res;
      if (onCreateBook) {
        res = await onCreateBook(newBook);
      } else {
        res = await onUpdateBook(newBook);
      }
      if (res === false) {
        showNotification('فشل حفظ العمل الجديد في السحابة.', true);
        return;
      }
      onSelectBook(newBook.id);
      showNotification('تم إنشاء العمل بنجاح! يمكنك الآن كتابة الفصول الأولى.');
    }
    setIsNovelModalOpen(false);
  };

  // Delete Novel
  const handleDeleteNovel = async (bookId: string) => {
    if (!confirm('تحذير: هل أنت متأكد من حذف هذا العمل وكافة فصوله نهائياً؟')) return;
    if (onDeleteBook) {
      const res = await onDeleteBook(bookId);
      if (res === false) {
        showNotification('فشل حذف العمل من السحابة.', true);
        return;
      }
    }
    if (currentUserId) removeWriterDraftSnapshotsForBook(currentUserId, bookId);
    showNotification('تم حذف العمل بنجاح.');
  };

  // Filtered books
  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.author || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#070d1e] text-[#f4efe6] pb-24" dir="rtl">
      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-[#c59b27]/20 bg-[#0a1226]/80 backdrop-blur-md sticky top-20 z-30 px-4 sm:px-8 py-3.5">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#c59b27] flex items-center justify-center text-[#070d1e] shadow-md shadow-amber-500/10">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white font-cairo">
                  استوديو إدارة ونشر الأعمال والروايات
                </h1>
                <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-[#f0cb69]">
                  صلاحيات الإدارة والتحرير
                </span>
              </div>
              <p className="text-xs text-[#94a3b8]">
                منصة متكاملة شبيهة بـ truthnovel لإدارة الأعمال، كتابة الفصول، وتعديل كل التفاصيل بسهولة
              </p>
            </div>
          </div>

          {/* Studio Navigation Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#050a16] p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setActiveTab('novels')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'novels'
                  ? 'bg-[#c59b27] text-[#070d1e] shadow'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <BookMarked className="h-3.5 w-3.5" />
              <span>الأعمال والروايات ({books.length})</span>
            </button>

            <button
              onClick={() => {
                if (!currentBook && books.length > 0) {
                  onSelectBook(books[0].id);
                }
                setActiveTab('editor');
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'editor'
                  ? 'bg-[#c59b27] text-[#070d1e] shadow'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>محرر الفصول</span>
            </button>

            <button
              onClick={() => {
                if (!currentBook && books.length > 0) onSelectBook(books[0].id);
                setActiveTab('research');
              }}
              disabled={books.length === 0}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                activeTab === 'research'
                  ? 'bg-[#c59b27] text-[#070d1e] shadow'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>المراجع والاقتباسات</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'categories'
                  ? 'bg-[#c59b27] text-[#070d1e] shadow'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>الأقسام ({categories.length})</span>
            </button>

            {onOpenAdminModal && (
              <button
                onClick={onOpenAdminModal}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-500/10 transition-colors"
                title="إدارة المدراء والحظر"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">المدراء والحظر</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Save Toast */}
      {saveSuccessMsg && (
        <div className="fixed bottom-6 left-6 z-50 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-3 text-xs font-bold text-white shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="h-4 w-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Floating Error Toast */}
      {saveErrorMsg && (
        <div className="fixed bottom-6 left-6 z-50 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 px-5 py-3 text-xs font-bold text-white shadow-2xl flex items-center gap-2 animate-bounce">
          <AlertCircle className="h-4 w-4" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* Main Studio Body */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* ========================================================================= */}
        {/* TAB 1: NOVELS & WORKS HUB (إدارة الأعمال والروايات) */}
        {/* ========================================================================= */}
        {activeTab === 'novels' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-cairo">
                  دليل الأعمال والمؤلفات
                </h2>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  أضف أعمالاً جديدة، عدل الغلاف، النبذة، أو اضغط لإدارة فصول أي عمل
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم أو الكاتب..."
                    className="w-full rounded-xl bg-[#0b1329] border border-white/10 pr-9 pl-3 py-2 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleOpenCreateNovel}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] px-4 py-2 text-xs font-bold text-[#070d1e] shadow-lg transition-transform hover:scale-102 shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ إضافة عمل جديد</span>
                </button>
              </div>
            </div>

            {/* Novels Cards Grid */}
            {filteredBooks.length === 0 ? (
              <div className="rounded-3xl border border-[#c59b27]/30 bg-gradient-to-b from-[#0a142c] to-[#050a16] p-12 text-center space-y-4">
                <BookOpen className="h-12 w-12 text-[#d4af37] mx-auto opacity-70" />
                <h3 className="text-lg font-bold text-white font-cairo">
                  لا توجد أعمال منشورة حتى الآن
                </h3>
                <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
                  المنصة جاهزة لاستقبال أول كتاب أو مشروع معرفي من حُكم.
                </p>
                <button
                  onClick={handleOpenCreateNovel}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-5 py-2.5 text-xs font-bold text-[#070d1e] shadow-md hover:scale-105 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ إضافة أول عمل الآن</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBooks.map((book) => {
                  const categoryName = getCategoryName(categories, book.category);
                  const isCurrent = currentBook?.id === book.id;

                  return (
                    <div
                      key={book.id}
                      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 bg-[#0a1329] p-4 flex flex-col justify-between ${
                        isCurrent
                          ? 'border-[#c59b27] shadow-lg shadow-[#c59b27]/10'
                          : 'border-white/10 hover:border-[#c59b27]/50'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Book Cover */}
                        <div className="h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#050a16] relative shadow">
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span
                            className={`absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                              book.status === 'draft' || book.status === 'in_progress'
                                ? 'bg-slate-600 text-white'
                                : book.status === 'completed'
                                  ? 'bg-amber-500 text-[#070d1e]'
                                  : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {book.status === 'draft' || book.status === 'in_progress'
                              ? 'مسودة'
                              : book.status === 'completed'
                                ? 'مكتملة'
                                : 'مستمرة'}
                          </span>
                        </div>

                        {/* Book Metadata */}
                        <div className="flex-1 space-y-1.5">
                          <span className="inline-block rounded-md bg-[#c59b27]/15 border border-[#c59b27]/30 px-2 py-0.5 text-[10px] font-bold text-[#f0cb69]">
                            {categoryName}
                          </span>
                          <h3 className="text-base font-bold text-white font-cairo leading-snug line-clamp-2">
                            {book.title}
                          </h3>
                          <p className="text-[11px] text-[#d4af37] font-medium">
                            المؤلف: {book.author || 'حُكم | HUKM MEDIA'}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-[#94a3b8] pt-1">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3 text-[#d4af37]" />
                              <span>{book.chapters.length} فصول</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3 text-blue-400" />
                              <span>{book.viewsCount} مشاهدة</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Summary preview */}
                      <p className="text-xs text-[#94a3b8] line-clamp-2 mt-3 leading-relaxed border-t border-white/5 pt-2.5">
                        {book.summary || 'لا توجد نبذة مدخلة بعد.'}
                      </p>

                      {/* Actions Toolbar */}
                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              onSelectBook(book.id);
                              setActiveTab('editor');
                            }}
                            className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-3 py-1.5 text-xs font-bold text-[#070d1e] shadow hover:scale-102 transition-all cursor-pointer"
                            title="إدارة وكتابة فصول هذا العمل"
                          >
                            <PenTool className="h-3.5 w-3.5" />
                            <span>الفصول ({book.chapters.length})</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditNovel(book)}
                            className="rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-white/10 px-2.5 py-1.5 text-xs font-bold text-[#cbd5e1] hover:text-white transition-colors"
                            title="تعديل بيانات الرواية والغلاف"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => onPreviewBook(book.id)}
                            className="rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-white/10 px-2.5 py-1.5 text-xs font-bold text-blue-300 hover:text-white transition-colors"
                            title="معاينة العمل كقارئ"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteNovel(book.id)}
                          className="rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2 py-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
                          title="حذف هذا العمل"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CHAPTER EDITOR & MANAGER (محرر وإدارة الفصول) */}
        {/* ========================================================================= */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            {/* Novel Selector & Quick Action Bar */}
            <div className="rounded-2xl border border-[#c59b27]/30 bg-[#0a1329] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-[#94a3b8] font-bold">العمل الحالي:</span>
                {books.length > 0 ? (
                  <select
                    value={currentBook?.id || ''}
                    onChange={(e) => onSelectBook(e.target.value)}
                    className="rounded-xl bg-[#050a16] border border-[#c59b27]/40 px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#c59b27]"
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.chapters.length} فصول)
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-rose-300 font-bold">لا يوجد عمل نشط حالياً</span>
                )}

                {currentBook && (
                  <button
                    onClick={() => onPreviewBook(currentBook.id, currentChapter?.id)}
                    className="flex items-center gap-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-bold text-[#f0cb69] transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>معاينة الرواية</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateNewChapter}
                  disabled={!currentBook}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-4 py-2 text-xs font-bold text-[#070d1e] shadow transition-transform hover:scale-102 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ كتابة فصل جديد</span>
                </button>
              </div>
            </div>

            {/* Editor Workspace: Chapters List (Side) + Live Editor (Main) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Chapters Drawer / Index (4 cols) */}
              <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-[#0a1329] p-4 space-y-3 h-fit">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-xs font-black text-white font-cairo">
                    فهرس فصول الرواية ({currentBook?.chapters.length || 0})
                  </h3>
                  <button
                    onClick={handleCreateNewChapter}
                    className="text-[11px] font-bold text-[#d4af37] hover:underline"
                  >
                    + فصل جديد
                  </button>
                </div>

                {(!currentBook || currentBook.chapters.length === 0) ? (
                  <div className="py-8 text-center text-xs text-[#94a3b8] space-y-2">
                    <p>لا توجد فصول بعد لهذا العمل.</p>
                    <button
                      onClick={handleCreateNewChapter}
                      className="rounded-lg bg-[#c59b27]/20 border border-[#c59b27]/40 px-3 py-1.5 text-[11px] font-bold text-[#f0cb69]"
                    >
                      + كتابة الفصل الأول
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[550px] overflow-y-auto pl-1">
                    {currentBook.chapters.map((ch) => {
                      const isSelected = ch.id === selectedChapterId;
                      return (
                        <div
                          key={ch.id}
                          onClick={() => handleSelectChapter(ch)}
                          className={`flex items-center justify-between rounded-xl p-2.5 text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#c59b27]/20 border border-[#c59b27]/60 text-white font-bold'
                              : 'bg-[#050a16] border border-white/5 text-[#cbd5e1] hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="h-5 w-5 rounded-md bg-[#0e1935] border border-white/10 flex items-center justify-center text-[10px] font-black text-[#d4af37]">
                              {ch.chapterNumber}
                            </span>
                            <span className="truncate">{ch.title}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 mr-2">
                            <span className="text-[10px] text-[#94a3b8]">
                              {ch.wordCount || calculateWordsCount(ch.content)} ك
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChapter(ch.id);
                              }}
                              className="p-1 text-[#64748b] hover:text-rose-400 transition-colors"
                              title="حذف الفصل"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Main Text Editor Workspace (8 cols) */}
              <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-[#0a1329] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#94a3b8]">رقم الفصل:</span>
                    <input
                      type="number"
                      value={chapterNumber}
                      disabled={isSavingChapter}
                      onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
                      className="w-16 rounded-lg bg-[#050a16] border border-white/15 px-2 py-1 text-xs text-center font-bold text-[#f0cb69] focus:outline-none focus:border-[#c59b27]"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                      <span>الحالة:</span>
                      <select
                        value={chapterStatus}
                        disabled={isSavingChapter}
                        onChange={(e) => setChapterStatus(e.target.value as 'draft' | 'ready')}
                        className="rounded-lg bg-[#050a16] border border-white/15 px-2.5 py-1 text-xs text-white focus:outline-none"
                      >
                        <option value="ready">منشور (جاهز للقراءة)</option>
                        <option value="draft">مسودة خاصة</option>
                      </select>
                    </div>

                    <span className="hidden sm:inline text-[10px] text-[#94a3b8]">
                      {lastLocalAutosavedAt
                        ? `حُفظت نسخة محلية ${new Date(lastLocalAutosavedAt).toLocaleTimeString('ar-EG')}`
                        : isEditorDirty ? 'تعديلاتك ستُحفظ محلياً تلقائياً' : 'لا توجد تعديلات محلية'}
                    </span>
                    <button
                      onClick={handleSaveChapter}
                      disabled={!currentBook || isSavingChapter}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isSavingChapter ? 'جارٍ الحفظ...' : chapterStatus === 'draft' ? 'حفظ المسودة' : 'حفظ ونشر الفصل'}</span>
                    </button>
                  </div>
                </div>

                {recoverySnapshot &&
                  recoverySnapshot.userId === currentUserId &&
                  recoverySnapshot.bookId === currentBook?.id && (
                    <section className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-amber-200">وجدنا نسخة كتابة محلية غير متزامنة</h3>
                          <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                            حُفظت هذه النسخة تلقائياً على هذا الجهاز بتاريخ {new Date(recoverySnapshot.savedAt).toLocaleString('ar-EG')}.
                            {recoverySnapshot.chapterId && currentBook?.chapters.some((chapter) => chapter.id === recoverySnapshot.chapterId) &&
                              recoverySnapshot.baseUpdatedAt !== currentBook?.chapters.find((chapter) => chapter.id === recoverySnapshot.chapterId)?.updatedAt
                              ? ' توجد نسخة سحابية أحدث؛ راجع النسختين قبل اعتماد التغييرات المحلية.'
                              : ' لم تُرفع هذه التعديلات إلى السحابة بعد.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button type="button" onClick={handleDiscardWriterDraft} className="rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-[#cbd5e1] hover:bg-white/5">
                          تجاهل النسخة المحلية
                        </button>
                        <button type="button" onClick={handleRestoreWriterDraft} className="rounded-lg bg-amber-300 px-3 py-2 text-[11px] font-black text-[#1f2937] hover:bg-amber-200">
                          استعادة النسخة المحلية
                        </button>
                      </div>
                    </section>
                  )}

                {/* Chapter Title */}
                <div>
                  <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                    عنوان الفصل:
                  </label>
                  <input
                    type="text"
                    value={chapterTitle}
                    disabled={isSavingChapter}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="مثال: الفصل الأول: استيقاظ الحقيقة"
                    className="w-full rounded-xl bg-[#050a16] border border-white/15 px-4 py-2.5 text-sm font-bold text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none font-cairo"
                  />
                </div>

                {/* Chapter Content Area */}
                <div>
                  <div className="flex items-center justify-between mb-1 text-xs text-[#94a3b8]">
                    <label className="font-bold text-[#cbd5e1]">
                      محتوى الفصل (النص الكامل):
                    </label>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span>{calculateWordsCount(chapterContent)} كلمة</span>
                      <span>•</span>
                      <span>
                        ~{calculateReadingTimeMinutes(calculateWordsCount(chapterContent))} دقائق قراءة
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={16}
                    value={chapterContent}
                    disabled={isSavingChapter}
                    onChange={(e) => setChapterContent(e.target.value)}
                    placeholder="اكتب أو الصق نص الفصل هنا... افصل بين الفقرات بسطر فارغ."
                    className="w-full rounded-xl bg-[#050a16] border border-white/15 p-4 text-sm text-[#f4efe6] placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none font-amiri leading-relaxed"
                  />
                </div>

                {/* Bottom Helper Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[#94a3b8]">
                  <p>
                    💡 نصيحة: يمكنك نسخ ولصق النص من Word أو المستندات مباشرة، وسيقوم النظام بتنسيقه تلقائياً.
                  </p>
                  <button
                    onClick={handleSaveChapter}
                    disabled={!currentBook || isSavingChapter}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:scale-102 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSavingChapter ? 'جارٍ الحفظ...' : 'حفظ ونشر التعديلات فوراً'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: RESEARCH SOURCES & QUOTES — adapted research workflow pattern */}
        {/* ========================================================================= */}
        {activeTab === 'research' && (
          <BookResearchPanel
            book={currentBook}
            onUpdateBook={onUpdateBook}
            onShowToast={showNotification}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CATEGORIES MANAGER (إدارة الأقسام) */}
        {/* ========================================================================= */}
        {activeTab === 'categories' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-[#0a1329] p-5 space-y-4">
              <h3 className="text-base font-black text-white font-cairo">
                إضافة قسم / تصنيف جديد
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="اسم القسم (مثلاً: روايات غموض، فلسفة، تحقيقات...)"
                  className="rounded-xl bg-[#050a16] border border-white/15 px-3 py-2 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                />
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="وصف مختصر للقسم (اختياري)..."
                  className="rounded-xl bg-[#050a16] border border-white/15 px-3 py-2 text-xs text-white placeholder-[#64748b] focus:border-[#c59b27] focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  if (!newCatName.trim()) return;
                  if (onAddCategory) {
                    onAddCategory({ name: newCatName.trim(), description: newCatDesc.trim() });
                    setNewCatName('');
                    setNewCatDesc('');
                    showNotification('تمت إضافة القسم بنجاح ✓');
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-4 py-2 text-xs font-bold text-[#070d1e] shadow hover:scale-102 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ حفظ وإضافة القسم</span>
              </button>
            </div>

            {/* Existing Categories Table */}
            <div className="rounded-2xl border border-white/10 bg-[#0a1329] p-5 space-y-3">
              <h3 className="text-sm font-black text-white font-cairo">
                الأقسام الحالية المعتمدة في المنصة
              </h3>
              <div className="space-y-2">
                {categories.map((cat) => {
                  const count = books.filter((b) => b.category === cat.id).length;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between rounded-xl bg-[#050a16] border border-white/5 p-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white text-sm block">{cat.name}</span>
                        {cat.description && (
                          <span className="text-[11px] text-[#94a3b8]">{cat.description}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-[#f0cb69] border border-white/10">
                          {count} أعمال
                        </span>
                        {onDeleteCategory && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف قسم «${cat.name}»؟`)) {
                                onDeleteCategory(cat.id);
                                showNotification('تم حذف القسم.');
                              }
                            }}
                            className="text-rose-400 hover:text-rose-300 p-1"
                            title="حذف القسم"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* NOVEL MODAL (CREATE OR EDIT NOVEL) */}
      {/* ========================================================================= */}
      {isNovelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-xl rounded-3xl border border-[#c59b27]/40 bg-[#0a1329] p-6 sm:p-8 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black text-white font-cairo">
                {editingNovelId ? 'تعديل بيانات العمل / الرواية' : '+ إضافة عمل روائي / كتاب جديد'}
              </h3>
              <button
                onClick={() => setIsNovelModalOpen(false)}
                className="text-[#94a3b8] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNovel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                  عنوان العمل أو الرواية:
                </label>
                <input
                  type="text"
                  required
                  value={novelTitle}
                  onChange={(e) => setNovelTitle(e.target.value)}
                  placeholder="مثال: لورد الحقيقة، أو شفرة الأرشيف..."
                  className="w-full rounded-xl bg-[#050a16] border border-white/15 px-3 py-2 text-xs text-white focus:border-[#c59b27] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                    اسم المؤلف / المترجم:
                  </label>
                  <input
                    type="text"
                    required
                    value={novelAuthor}
                    onChange={(e) => setNovelAuthor(e.target.value)}
                    placeholder="اسم المؤلف (اختياري)"
                    className="w-full rounded-xl bg-[#050a16] border border-white/15 px-3 py-2 text-xs text-white focus:border-[#c59b27] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                    القسم / التصنيف:
                  </label>
                  <select
                    value={novelCategory}
                    onChange={(e) => setNovelCategory(e.target.value)}
                    className="w-full rounded-xl bg-[#050a16] border border-white/15 px-3 py-2 text-xs text-white focus:border-[#c59b27] focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                  حالة العمل:
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={novelStatus === 'draft'}
                      onChange={() => setNovelStatus('draft')}
                    />
                    <span>مسودة خاصة (لا تظهر للقراء)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={novelStatus === 'ongoing'}
                      onChange={() => setNovelStatus('ongoing')}
                    />
                    <span>مستمرة (فصول متجددة)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={novelStatus === 'completed'}
                      onChange={() => setNovelStatus('completed')}
                    />
                    <span>مكتملة (تم نشر كافة الفصول)</span>
                  </label>
                </div>
              </div>

              {/* Cover Image & Presets */}
              <div>
                <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                  رابط صورة الغلاف:
                </label>
                <input
                  type="url"
                  required
                  value={novelCover}
                  onChange={(e) => setNovelCover(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl bg-[#050a16] border border-white/15 px-3 py-2 text-xs text-white focus:border-[#c59b27] focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-[#94a3b8]">أغلفة سريعة جاهزة:</span>
                  {PRESET_COVERS.map((preset) => (
                    <button
                      type="button"
                      key={preset.name}
                      onClick={() => setNovelCover(preset.url)}
                      className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 text-[10px] text-[#f0cb69]"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                  النبذة / القصة المختصرة:
                </label>
                <textarea
                  rows={4}
                  value={novelSummary}
                  onChange={(e) => setNovelSummary(e.target.value)}
                  placeholder="اكتب نبذة تشويقية عن الرواية تجذب القراء..."
                  className="w-full rounded-xl bg-[#050a16] border border-white/15 p-3 text-xs text-white focus:border-[#c59b27] focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNovelModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-[#94a3b8] hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-6 py-2.5 text-xs font-bold text-[#070d1e] shadow-lg hover:scale-102 transition-all cursor-pointer"
                >
                  {editingNovelId ? 'حفظ التعديلات' : '+ إنشاء الرواية والبدء'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
