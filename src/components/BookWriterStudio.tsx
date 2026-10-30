import React, { useState } from 'react';
import {
  PenTool,
  BookOpen,
  Plus,
  Trash2,
  Save,
  Download,
  Printer,
  Sparkles,
  Link as LinkIcon,
  Video,
  Mic,
  Twitter,
  Instagram,
  CheckCircle,
  FileText,
  Clock,
  Layers,
  HelpCircle,
  Eye,
  Copy,
  Check,
  Film,
  Image as ImageIcon,
  Upload,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Edit3,
  ExternalLink,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { BookProject, BookChapter, SourceReference, SocialQuote, ChapterMedia, MediaType } from '../types/hukm';
import { calculateWordsCount, calculateReadingTimeMinutes, generateExportText } from '../utils/hukmEngine';
import { HUKM_PRESET_MEDIA } from '../data/hukmData';

interface BookWriterStudioProps {
  books: BookProject[];
  currentBook: BookProject;
  onSelectBook: (bookId: string) => void;
  onUpdateBook: (updatedBook: BookProject) => void;
  onPreviewBook: (bookId: string, chapterId?: string) => void;
}

export const BookWriterStudio: React.FC<BookWriterStudioProps> = ({
  books,
  currentBook,
  onSelectBook,
  onUpdateBook,
  onPreviewBook,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    currentBook.chapters[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'editor' | 'media' | 'social_media' | 'sources' | 'cover'>('editor');
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Get current chapter
  const currentChapter =
    currentBook.chapters.find((c) => c.id === selectedChapterId) ||
    currentBook.chapters[0];

  // Raw text representation of content for easy smooth typing
  const [contentText, setContentText] = useState(
    currentChapter ? currentChapter.content.join('\n\n') : ''
  );
  const [chapterTitle, setChapterTitle] = useState(currentChapter?.title || '');
  const [chapterSubtitle, setChapterSubtitle] = useState(currentChapter?.subtitle || '');
  const [chapterStatus, setChapterStatus] = useState<'draft' | 'ready'>(
    currentChapter?.status || 'draft'
  );
  const [chapterNotes, setChapterNotes] = useState(currentChapter?.notes || '');
  const [chapterViews, setChapterViews] = useState<number>(currentChapter?.viewsCount || 1500);

  // Media Management State
  const [chapterMedia, setChapterMedia] = useState<ChapterMedia[]>(currentChapter?.media || []);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);

  // Media Form Inputs
  const [mediaType, setMediaType] = useState<MediaType>('video');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaDuration, setMediaDuration] = useState<number>(6);
  const [mediaPlacement, setMediaPlacement] = useState<'header' | 'in_content' | 'footer'>('header');
  const [mediaBadge, setMediaBadge] = useState('');

  // Book Cover Customization State
  const [bookCoverImage, setBookCoverImage] = useState(currentBook.coverImage);
  const [bookCoverType, setBookCoverType] = useState<MediaType>(currentBook.coverMediaType || 'image');

  // Sync state when selected chapter changes
  const handleSelectChapter = (chId: string) => {
    const ch = currentBook.chapters.find((c) => c.id === chId);
    if (ch) {
      setSelectedChapterId(chId);
      setChapterTitle(ch.title);
      setChapterSubtitle(ch.subtitle || '');
      setChapterStatus(ch.status);
      setChapterNotes(ch.notes || '');
      setChapterViews(ch.viewsCount !== undefined ? ch.viewsCount : 1500);
      setContentText(ch.content.join('\n\n'));
      setChapterMedia(ch.media || []);
    }
  };


  // Add new chapter
  const handleAddNewChapter = () => {
    const newNumber = currentBook.chapters.length + 1;
    const newChapter: BookChapter = {
      id: `ch-${Date.now()}`,
      bookId: currentBook.id,
      chapterNumber: newNumber,
      title: `الفصل ${newNumber}: عنوان الفصل الجديد`,
      subtitle: 'ملخص فرعي للفصل',
      content: [
        'اكتب مقدمة الفصل هنا...',
        '«وعشان الموضوع مش زي ما إنت فاكر… تعالى نعرف التفاصيل.»',
      ],
      references: [],
      status: 'draft',
      wordCount: 15,
      readingTimeMinutes: 1,
      viewsCount: 1500,
      updatedAt: new Date().toISOString(),
    };

    const updated = {
      ...currentBook,
      chapters: [...currentBook.chapters, newChapter],
      updatedAt: new Date().toISOString(),
    };

    onUpdateBook(updated);
    setSelectedChapterId(newChapter.id);
    setChapterTitle(newChapter.title);
    setChapterSubtitle(newChapter.subtitle || '');
    setChapterStatus('draft');
    setChapterViews(1500);
    setContentText(newChapter.content.join('\n\n'));
  };

  // Delete chapter
  const handleDeleteChapter = (chId: string) => {
    if (currentBook.chapters.length <= 1) {
      alert('يجب أن يحتوي الكتاب على فصل واحد على الأقل.');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا الفصل ومحتواه؟')) return;

    const remaining = currentBook.chapters.filter((c) => c.id !== chId);
    const updated = {
      ...currentBook,
      chapters: remaining,
      updatedAt: new Date().toISOString(),
    };
    onUpdateBook(updated);
    if (remaining.length > 0) {
      handleSelectChapter(remaining[0].id);
    }
  };

  // Save current chapter
  const handleSaveCurrentChapter = () => {
    if (!currentChapter) return;

    const paragraphs = contentText
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const words = calculateWordsCount(paragraphs);
    const readingTime = calculateReadingTimeMinutes(words);
    const parsedViews = Number(chapterViews) >= 0 ? Number(chapterViews) : (currentChapter.viewsCount || 1500);

    const updatedChapters = currentBook.chapters.map((c) =>
      c.id === currentChapter.id
        ? {
            ...c,
            title: chapterTitle.trim() || c.title,
            subtitle: chapterSubtitle.trim(),
            content: paragraphs.length > 0 ? paragraphs : ['مسودة قيد الكتابة...'],
            notes: chapterNotes.trim(),
            status: chapterStatus,
            wordCount: words,
            readingTimeMinutes: readingTime,
            viewsCount: parsedViews,
            media: chapterMedia,
            updatedAt: new Date().toISOString(),
          }
        : c
    );

    const totalViews = updatedChapters.reduce((acc, c) => acc + (c.viewsCount || 0), 0);

    const updatedBook = {
      ...currentBook,
      coverImage: bookCoverImage,
      coverMediaType: bookCoverType,
      chapters: updatedChapters,
      viewsCount: totalViews,
      updatedAt: new Date().toISOString(),
    };

    onUpdateBook(updatedBook);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Sync media changes directly to book
  const syncMediaToCurrentChapter = (updatedMedia: ChapterMedia[]) => {
    const updatedChapters = currentBook.chapters.map((c) =>
      c.id === currentChapter?.id ? { ...c, media: updatedMedia } : c
    );
    onUpdateBook({
      ...currentBook,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });
  };

  // Open modal to add media
  const handleOpenAddMedia = (preset?: ChapterMedia) => {
    if (preset) {
      setMediaType(preset.type);
      setMediaUrl(preset.url);
      setMediaTitle(preset.title || '');
      setMediaCaption(preset.caption || '');
      setMediaDuration(preset.durationSeconds || 6);
      setMediaPlacement(preset.placement || 'header');
      setMediaBadge(
        preset.badgeText ||
          (preset.type === 'video'
            ? 'فيديو قصير (6ث)'
            : preset.type === 'gif'
            ? 'GIF متحرك'
            : 'صورة توضيحية')
      );
    } else {
      setMediaType('video');
      setMediaUrl('https://assets.mixkit.co/videos/preview/mixkit-vintage-clock-gears-turning-42091-large.mp4');
      setMediaTitle('فيديو قصير توضيحي');
      setMediaCaption('شرح وسياق الأدلة والوثائق المرئية...');
      setMediaDuration(6);
      setMediaPlacement('header');
      setMediaBadge('فيديو توضيحي (6 ثوانٍ)');
    }
    setEditingMediaId(null);
    setIsMediaModalOpen(true);
  };

  // Open modal to edit existing media
  const handleOpenEditMedia = (m: ChapterMedia) => {
    setEditingMediaId(m.id);
    setMediaType(m.type);
    setMediaUrl(m.url);
    setMediaTitle(m.title || '');
    setMediaCaption(m.caption || '');
    setMediaDuration(m.durationSeconds || 6);
    setMediaPlacement(m.placement || 'header');
    setMediaBadge(m.badgeText || '');
    setIsMediaModalOpen(true);
  };

  // Save media from modal
  const handleSaveMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl.trim()) return;

    if (editingMediaId) {
      const updated = chapterMedia.map((m) =>
        m.id === editingMediaId
          ? {
              ...m,
              type: mediaType,
              url: mediaUrl.trim(),
              title: mediaTitle.trim(),
              caption: mediaCaption.trim(),
              durationSeconds: mediaDuration,
              placement: mediaPlacement,
              badgeText:
                mediaBadge.trim() ||
                (mediaType === 'video'
                  ? `فيديو قصير (${mediaDuration}ث)`
                  : mediaType === 'gif'
                  ? 'GIF متحرك'
                  : 'صورة أرشيفية'),
            }
          : m
      );
      setChapterMedia(updated);
      syncMediaToCurrentChapter(updated);
    } else {
      const newMedia: ChapterMedia = {
        id: `media-${Date.now()}`,
        type: mediaType,
        url: mediaUrl.trim(),
        title:
          mediaTitle.trim() ||
          (mediaType === 'video'
            ? 'فيديو قصير'
            : mediaType === 'gif'
            ? 'صورة متحركة GIF'
            : 'صورة توثيقية'),
        caption: mediaCaption.trim(),
        durationSeconds: mediaDuration,
        placement: mediaPlacement,
        loop: true,
        autoplay: true,
        badgeText:
          mediaBadge.trim() ||
          (mediaType === 'video'
            ? `فيديو قصير (${mediaDuration} ثوانٍ)`
            : mediaType === 'gif'
            ? 'صورة متحركة GIF'
            : 'وثيقة أرشيفية'),
      };
      const updated = [...chapterMedia, newMedia];
      setChapterMedia(updated);
      syncMediaToCurrentChapter(updated);
    }

    setIsMediaModalOpen(false);
  };

  // Delete media
  const handleDeleteMedia = (mediaId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الوسيط؟')) return;
    const updated = chapterMedia.filter((m) => m.id !== mediaId);
    setChapterMedia(updated);
    syncMediaToCurrentChapter(updated);
  };

  // Local File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        setMediaUrl(dataUrl);
        if (file.type.includes('gif')) {
          setMediaType('gif');
          setMediaBadge('GIF متحرك');
        } else if (file.type.startsWith('video/')) {
          setMediaType('video');
          setMediaBadge('فيديو قصير');
        } else {
          setMediaType('image');
          setMediaBadge('صورة عالية الدقة');
        }
        if (!mediaTitle) {
          setMediaTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    };
    reader.readAsDataURL(file);
  };


  // Insert helper text into editor
  const handleInsertSnippet = (type: 'hukm' | 'quote' | 'script_note') => {
    let snippet = '';
    if (type === 'hukm') {
      snippet = '\n\n«الـ حُكم هنا: اكتب الخلاصة والنتيجة التي تم استنتاجها بالأدلة.»\n\n';
    } else if (type === 'quote') {
      snippet = '\n\n«وعشان الموضوع مش زي ما إنت فاكر… تعالى نرجع للوثائق الأصلية.»\n\n';
    } else if (type === 'script_note') {
      snippet = '\n\n[ملاحظة إنتاجية لفيديو يوتيوب / البودكاست: عرض رسم بياني للمخطوطة مع موسيقى وثائقية]\n\n';
    }
    setContentText((prev) => prev + snippet);
  };

  // Export full book
  const handleExportMarkdown = () => {
    const text = generateExportText(currentBook);
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentBook.title}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export current chapter
  const handleExportChapter = () => {
    if (!currentChapter) return;
    const text = generateExportText(currentBook, currentChapter.id);
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentChapter.title}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Add source reference
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceAuthor, setNewSourceAuthor] = useState('');
  const [newSourceType, setNewSourceType] = useState<SourceReference['type']>('book');

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceTitle.trim()) return;

    const newSource: SourceReference = {
      id: `src-${Date.now()}`,
      title: newSourceTitle.trim(),
      author: newSourceAuthor.trim() || 'وثيقة غير معلنة',
      type: newSourceType,
    };

    onUpdateBook({
      ...currentBook,
      sources: [...(currentBook.sources || []), newSource],
      updatedAt: new Date().toISOString(),
    });

    setNewSourceTitle('');
    setNewSourceAuthor('');
  };

  // Add social quote
  const [newQuoteText, setNewQuoteText] = useState('');
  const handleAddSocialQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteText.trim()) return;

    const newQ: SocialQuote = {
      id: `quote-${Date.now()}`,
      quoteText: newQuoteText.trim(),
      chapterNumber: currentChapter?.chapterNumber || 1,
      context: currentChapter?.title || currentBook.title,
    };

    onUpdateBook({
      ...currentBook,
      quotes: [...(currentBook.quotes || []), newQ],
      updatedAt: new Date().toISOString(),
    });

    setNewQuoteText('');
  };

  const wordsInCurrentEditor = calculateWordsCount(contentText);
  const minutesInCurrentEditor = calculateReadingTimeMinutes(wordsInCurrentEditor);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6" dir="rtl">
      {/* Top Studio Header & Book Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-2xl border border-[#c59b27]/30 bg-[#0a1226] p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#c59b27]/20 border border-[#c59b27]/40 text-[#f0cb69]">
            <PenTool className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#d4af37]">استوديو حُكم لتأليف الكتب والمشاريع</span>
            <div className="flex items-center gap-2 mt-0.5">
              <label htmlFor="book-select" className="text-xs text-[#94a3b8]">المشروع الحالي:</label>
              <select
                id="book-select"
                value={currentBook.id}
                onChange={(e) => onSelectBook(e.target.value)}
                className="rounded-lg bg-[#070d1e] border border-[#c59b27]/40 px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-[#f0cb69] cursor-pointer"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#070d1e] text-white">
                    {b.title} ({b.chapters.length} فصول)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons: Preview, Export, Save */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onPreviewBook(currentBook.id, currentChapter?.id)}
            className="flex items-center gap-1.5 rounded-xl bg-[#0f1b38] hover:bg-[#162752] border border-[#c59b27]/30 px-3.5 py-2 text-xs font-bold text-[#e2e8f0] transition-colors"
          >
            <Eye className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>معاينة القارئ</span>
          </button>

          <button
            onClick={handleExportChapter}
            className="flex items-center gap-1.5 rounded-xl bg-[#0f1b38] hover:bg-[#162752] border border-white/10 px-3.5 py-2 text-xs font-semibold text-[#cbd5e1] transition-colors"
            title="تصدير الفصل الحالي بصيغة Markdown"
          >
            <Download className="h-3.5 w-3.5" />
            <span>تصدير الفصل</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 rounded-xl bg-[#0f1b38] hover:bg-[#162752] border border-white/10 px-3.5 py-2 text-xs font-semibold text-[#cbd5e1] transition-colors"
            title="تصدير الكتاب كاملاً بكل فصوله"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>تصدير الكتاب كاملاً</span>
          </button>

          <button
            onClick={handleSaveCurrentChapter}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] px-5 py-2 text-xs font-bold text-[#070d1e] shadow-md transition-all hover:scale-105 active:scale-95"
          >
            {saveSuccess ? (
              <>
                <Check className="h-4 w-4" />
                <span>تم الحفظ!</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Chapters Sidebar (Right) + Editor Workspace (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Chapters Index Sidebar */}
        <div className="lg:col-span-1 rounded-2xl border border-[#c59b27]/20 bg-[#0a1226] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#d4af37]" />
              <h3 className="text-sm font-bold text-white font-cairo">فهرس فصول الكتاب</h3>
            </div>
            <span className="rounded-full bg-[#c59b27]/20 px-2 py-0.5 text-[11px] font-bold text-[#f0cb69]">
              {currentBook.chapters.length}
            </span>
          </div>

          {/* Chapters List */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pl-1">
            {currentBook.chapters.map((ch) => {
              const isSelected = ch.id === currentChapter?.id;
              return (
                <div
                  key={ch.id}
                  onClick={() => handleSelectChapter(ch.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl border text-right cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#c59b27]/20 border-[#c59b27]/60 text-white shadow-sm'
                      : 'bg-[#070d1e] border-white/5 hover:bg-[#0f1b38] hover:border-white/10 text-[#cbd5e1]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#d4af37]">
                        فصل {ch.chapterNumber}
                      </span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          ch.status === 'ready' ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                    </div>
                    <h4 className="text-xs font-bold truncate mt-0.5 font-cairo">
                      {ch.title}
                    </h4>
                    <span className="text-[10px] text-[#64748b]">
                      {ch.wordCount || calculateWordsCount(ch.content)} كلمة
                    </span>
                  </div>

                  {currentBook.chapters.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(ch.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#64748b] hover:text-rose-400 transition-opacity"
                      title="حذف الفصل"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add New Chapter Button */}
          <button
            onClick={handleAddNewChapter}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e1935] hover:bg-[#162752] border border-dashed border-[#c59b27]/40 py-2.5 text-xs font-bold text-[#d4af37] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة فصل جديد للكتاب</span>
          </button>
        </div>

        {/* Editor & Content Management Area */}
        <div className="lg:col-span-3 space-y-5">
          {/* Tabs: Content Editor / Chapter Media / Book Cover / Social Media Links / Research Sources */}
          <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'editor', label: 'محرر نص الفصل', icon: FileText },
              { id: 'media', label: `وسائط الفصل (${chapterMedia.length})`, icon: Film },
              { id: 'cover', label: 'غلاف ووسائط الكتاب', icon: ImageIcon },
              { id: 'social_media', label: 'ربط وسائل التواصل', icon: Video },
              { id: 'sources', label: 'المراجع والتوثيق', icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#c59b27] text-[#070d1e] shadow-md'
                      : 'bg-[#0a1226] text-[#cbd5e1] hover:text-white hover:bg-[#132247]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>


          {/* TAB 1: Main Content Editor */}
          {activeTab === 'editor' && (
            <div className="space-y-4 rounded-2xl border border-[#c59b27]/25 bg-[#0a1226] p-5 shadow-xl">
              {/* Chapter Meta Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#d4af37] mb-1">
                    عنوان الفصل *
                  </label>
                  <input
                    type="text"
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="مثال: كذبة العصور المظلمة: هل كانت أوروبا غارقة في الجهل؟"
                    className="w-full rounded-xl bg-[#070d1e] p-2.5 text-sm font-bold text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#d4af37] mb-1">
                    حالة الفصل
                  </label>
                  <select
                    value={chapterStatus}
                    onChange={(e) => setChapterStatus(e.target.value as any)}
                    className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs font-semibold text-white border border-white/10 focus:border-[#d4af37] focus:outline-none cursor-pointer"
                  >
                    <option value="draft">مسودة (قيد البحث والكتابة)</option>
                    <option value="ready">جاهز ومعتمد للنشر</option>
                  </select>
                </div>

                {/* Views Counter Baseline */}
                <div>
                  <label className="block text-xs font-bold text-[#f0cb69] mb-1">
                    المشاهدات المبدئية للفصل
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={chapterViews}
                    onChange={(e) => setChapterViews(Number(e.target.value))}
                    className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs font-bold text-[#f0cb69] border border-[#c59b27]/40 focus:border-[#d4af37] focus:outline-none"
                    title="الرقم الذي سيبدأ منه عداد المشاهدات عند قراءة الجمهور"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#d4af37] mb-1">
                  العنوان الفرعي أو التمهيد الاستقصائي
                </label>
                <input
                  type="text"
                  value={chapterSubtitle}
                  onChange={(e) => setChapterSubtitle(e.target.value)}
                  placeholder="مثال: إعادة قراءة لقرون من التعتيم واكتشاف جذور الثورة العلمية"
                  className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs text-[#cbd5e1] border border-white/10 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Quick Content Inserters */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-y border-white/5 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-[#94a3b8] ml-2">إدراج سريع:</span>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('hukm')}
                    className="rounded-lg bg-[#0e1935] hover:bg-[#c59b27]/20 border border-[#c59b27]/30 px-2.5 py-1 text-[11px] font-bold text-[#f0cb69] transition-colors"
                  >
                    + استخراج الـ «حُكم»
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('quote')}
                    className="rounded-lg bg-[#0e1935] hover:bg-[#c59b27]/20 border border-[#c59b27]/30 px-2.5 py-1 text-[11px] font-bold text-[#cbd5e1] transition-colors"
                  >
                    + «مش زي ما إنت فاكر»
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('script_note')}
                    className="rounded-lg bg-[#0e1935] hover:bg-[#c59b27]/20 border border-white/10 px-2.5 py-1 text-[11px] text-[#94a3b8] transition-colors"
                  >
                    + ملاحظة سيناريو مرئي
                  </button>
                </div>

                {/* Live Stats */}
                <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                  <span>
                    الكلمات: <strong className="text-white">{wordsInCurrentEditor}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    وقت القراءة: ~<strong className="text-[#f0cb69]">{minutesInCurrentEditor}</strong> دقيقة
                  </span>
                </div>
              </div>

              {/* Textarea for Chapter Content */}
              <div>
                <textarea
                  rows={14}
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="اكتب نصوص وأبحاث هذا الفصل هنا... (كل سطرين فارغين يشكلان فقرة قراءة متكاملة)"
                  className="w-full rounded-2xl bg-[#070d1e] p-4 text-base text-[#f4efe6] leading-relaxed border border-white/10 focus:border-[#d4af37] focus:outline-none font-cairo shadow-inner"
                />
              </div>

              {/* Documentary script notes */}
              <div>
                <label className="block text-xs font-bold text-[#d4af37] mb-1">
                  ملاحظات الإلقاء وتجهيز حلقة السوشيال ميديا (سكريبت الكواليس)
                </label>
                <textarea
                  rows={2}
                  value={chapterNotes}
                  onChange={(e) => setChapterNotes(e.target.value)}
                  placeholder="مثال: التركيز في أول 30 ثانية على الصدمة التاريخية، ثم عرض صورة الوثيقة في الثانية 45..."
                  className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs text-[#cbd5e1] border border-white/10 focus:border-[#d4af37] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Chapter Media Studio (Images, Animated GIFs, Short Videos) */}
          {activeTab === 'media' && (
            <div className="space-y-6 rounded-2xl border border-[#c59b27]/25 bg-[#0a1226] p-5 shadow-xl">
              {/* Top Media Studio Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Film className="h-5 w-5 text-[#d4af37]" />
                    <h3 className="text-base font-bold text-white font-cairo">
                      الوسائط المرئية للفصل الحالي: {chapterTitle}
                    </h3>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1">
                    تحكم بالصور، الصور المتحركة (GIF)، ومقاطع الفيديو القصيرة (بضع ثوانٍ) التي ترافق مواضيع ونصوص الفصل.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenAddMedia()}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] hover:to-[#b88c1b] px-4 py-2 text-xs font-bold text-[#070d1e] shadow transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ إضافة وسيط مخصص</span>
                  </button>
                </div>
              </div>

              {/* Quick Pick from HUKM Archival Presets */}
              <div className="rounded-2xl bg-[#070d1e] border border-[#c59b27]/20 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#f0cb69]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    <span>مكتبة وسائط حُكم الأرشيفية المقترحة (إدراج سريع بنقرة واحدة):</span>
                  </span>
                  <span className="text-[10px] text-[#94a3b8]">فيديوهات وGIFs وخرائط نادرة</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {HUKM_PRESET_MEDIA.map((preset) => {
                    const alreadyAdded = chapterMedia.some((m) => m.url === preset.url);
                    return (
                      <div
                        key={preset.id}
                        className="flex flex-col justify-between p-3 rounded-xl bg-[#0a1226] border border-white/5 hover:border-[#c59b27]/40 transition-colors"
                      >
                        <div className="space-y-1.5 mb-2">
                          <div className="flex items-center justify-between">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                preset.type === 'video'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : preset.type === 'gif'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {preset.type === 'video'
                                ? `🎬 فيديو قصير (${preset.durationSeconds}ث)`
                                : preset.type === 'gif'
                                ? '🎞️ GIF متحرك'
                                : '📸 صورة أرشيفية'}
                            </span>
                            {alreadyAdded && (
                              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                                <Check className="h-3 w-3" /> مضاف
                              </span>
                            )}
                          </div>
                          <h5 className="text-xs font-bold text-white line-clamp-1">{preset.title}</h5>
                          <p className="text-[11px] text-[#94a3b8] line-clamp-2 leading-relaxed">
                            {preset.caption}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleOpenAddMedia(preset)}
                          className="w-full flex items-center justify-center gap-1 rounded-lg bg-[#0e1935] hover:bg-[#162752] disabled:opacity-50 border border-white/10 py-1.5 text-[11px] font-bold text-[#f0cb69] transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{alreadyAdded ? 'موجود بالفعل في الفصل' : 'إدراج في هذا الفصل'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Chapter Media List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-cairo">
                    الوسائط المنشورة في هذا الفصل ({chapterMedia.length}):
                  </h4>
                  <span className="text-xs text-[#94a3b8]">
                    يمكنك تعديل أي وسيط أو حذفه في أي وقت
                  </span>
                </div>

                {chapterMedia.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0e1935] text-[#d4af37] mx-auto border border-[#c59b27]/30">
                      <Film className="h-6 w-6" />
                    </div>
                    <h5 className="text-sm font-bold text-white font-cairo">
                      لا توجد وسائط مرئية في هذا الفصل حتى الآن
                    </h5>
                    <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
                      أضف مقاطع فيديو قصيرة (لوب بضع ثوانٍ)، صور متحركة توضيحية GIF، أو وثائق تاريخية لشد انتباه القارئ وتأكيد أبحاث السلسلة!
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenAddMedia()}
                      className="rounded-xl bg-[#c59b27] px-4 py-2 text-xs font-bold text-[#070d1e] shadow"
                    >
                      + إضافة أول وسيط للفصل الآن
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chapterMedia.map((m) => (
                      <div
                        key={m.id}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#070d1e] hover:border-[#c59b27]/50 transition-all shadow-lg"
                      >
                        {/* Media Preview Box */}
                        <div className="relative aspect-video w-full bg-black overflow-hidden">
                          {m.type === 'video' ? (
                            <video
                              src={m.url}
                              autoPlay
                              loop
                              muted
                              playsInline
                              controls
                              className="h-full w-full object-cover"
                            />
                          ) : m.type === 'gif' ? (
                            <img
                              src={m.url}
                              alt={m.title || 'صورة متحركة'}
                              className="h-full w-full object-contain bg-black"
                            />
                          ) : (
                            <img
                              src={m.url}
                              alt={m.title || 'صورة توضيحية'}
                              className="h-full w-full object-cover"
                            />
                          )}

                          {/* Media Badge */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-lg bg-black/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-[#f0cb69] border border-white/10">
                            {m.type === 'video' ? (
                              <Film className="h-3 w-3 text-rose-400" />
                            ) : m.type === 'gif' ? (
                              <Sparkles className="h-3 w-3 text-purple-400" />
                            ) : (
                              <ImageIcon className="h-3 w-3 text-blue-400" />
                            )}
                            <span>
                              {m.badgeText ||
                                (m.type === 'video'
                                  ? `فيديو قصير (${m.durationSeconds || 6} ثوانٍ)`
                                  : m.type === 'gif'
                                  ? 'صورة متحركة GIF'
                                  : 'صورة عالية الدقة')}
                            </span>
                          </div>

                          {/* Placement badge */}
                          <div className="absolute top-2.5 left-2.5 rounded-md bg-black/70 px-2 py-0.5 text-[9px] font-bold text-[#cbd5e1] border border-white/10">
                            {m.placement === 'header'
                              ? 'أعلى الفصل'
                              : m.placement === 'in_content'
                              ? 'بين الفقرات'
                              : 'خاتمة الفصل'}
                          </div>
                        </div>

                        {/* Media Info & Controls */}
                        <div className="p-4 space-y-2">
                          <h5 className="text-xs sm:text-sm font-bold text-white font-cairo">
                            {m.title || 'وسيط بدون عنوان'}
                          </h5>
                          {m.caption && (
                            <p className="text-xs text-[#cbd5e1] line-clamp-2 leading-relaxed">
                              {m.caption}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditMedia(m)}
                                className="flex items-center gap-1 rounded-lg bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/30 px-2.5 py-1 text-xs font-bold text-[#f0cb69] transition-colors"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>تعديل</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteMedia(m.id)}
                                className="flex items-center gap-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 text-xs font-bold text-rose-300 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>

                            <span className="text-[10px] text-[#64748b] truncate max-w-[120px]">
                              {m.type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Book Cover & Global Media Customization */}
          {activeTab === 'cover' && (
            <div className="space-y-6 rounded-2xl border border-[#c59b27]/25 bg-[#0a1226] p-5 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-white font-cairo">
                  تخصيص غلاف ووسائط الكتاب: {currentBook.title}
                </h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  يمكنك تعيين صورة ثابتة، أو صورة متحركة GIF، أو حلقة فيديو قصيرة كغلاف رئيسي للكتاب يظهر في المعرض.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Form */}
                <div className="space-y-4 rounded-xl bg-[#070d1e] p-4 border border-white/5">
                  <div>
                    <label className="block text-xs font-bold text-[#f0cb69] mb-1.5">
                      اسم الكاتب والباحث (يظهر على الغلاف والبطاقات):
                    </label>
                    <input
                      type="text"
                      value={currentBook.author || 'إبراهيم فوزي'}
                      onChange={(e) =>
                        onUpdateBook({
                          ...currentBook,
                          author: e.target.value,
                        })
                      }
                      placeholder="مثال: إبراهيم فوزي"
                      className="w-full rounded-xl bg-[#0a1226] p-2.5 text-xs font-bold text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#f0cb69] mb-1.5">
                      نوع وسيط الغلاف:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'image', label: '📸 صورة عادية' },
                        { id: 'gif', label: '🎞️ GIF متحرك' },
                        { id: 'video', label: '🎬 فيديو قصير' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setBookCoverType(t.id as MediaType)}
                          className={`rounded-xl py-2 text-xs font-bold border transition-all ${
                            bookCoverType === t.id
                              ? 'bg-[#c59b27] text-[#070d1e] border-[#c59b27]'
                              : 'bg-[#0a1226] text-[#cbd5e1] border-white/10 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                      رابط وسيط الغلاف (Image / GIF / Video URL):
                    </label>
                    <input
                      type="url"
                      value={bookCoverImage}
                      onChange={(e) => setBookCoverImage(e.target.value)}
                      placeholder="https://... (JPG, PNG, GIF, MP4)"
                      className="w-full rounded-xl bg-[#0a1226] p-2.5 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  {/* File Upload Trigger */}
                  <div>
                    <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                      أو رفع غلاف من جهازك:
                    </label>
                    <label className="flex items-center justify-center gap-2 rounded-xl bg-[#0a1226] hover:bg-[#132247] border border-dashed border-[#c59b27]/40 p-3 text-xs font-bold text-[#f0cb69] cursor-pointer transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>اختر ملف صورة أو GIF أو MP4 من جهازك</span>
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const res = ev.target?.result as string;
                            if (res) {
                              setBookCoverImage(res);
                              if (file.type.includes('gif')) setBookCoverType('gif');
                              else if (file.type.startsWith('video/')) setBookCoverType('video');
                              else setBookCoverType('image');
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveCurrentChapter}
                    className="w-full rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] py-2.5 text-xs font-black text-[#070d1e] shadow mt-2 cursor-pointer"
                  >
                    حفظ وتحديث غلاف الكتاب
                  </button>
                </div>

                {/* Live Cover Preview */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#94a3b8] block">معاينة غلاف الكتاب المباشرة:</span>
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[#c59b27]/40 bg-black shadow-xl">
                    {bookCoverType === 'video' ? (
                      <video
                        src={bookCoverImage}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={bookCoverImage}
                        alt="معاينة الغلاف"
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                    <div className="absolute bottom-4 right-4 left-4">
                      <span className="rounded-md bg-[#c59b27] px-2 py-0.5 text-[10px] font-bold text-[#070d1e] mb-1 inline-block">
                        {bookCoverType === 'video' ? '🎬 غلاف فيديو متحرك' : bookCoverType === 'gif' ? '🎞️ غلاف GIF' : '📸 غلاف قياسي'}
                      </span>
                      <h4 className="text-sm font-black text-white">{currentBook.title}</h4>
                      <p className="text-[11px] text-[#cbd5e1] line-clamp-1">{currentBook.subtitle}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'social_media' && (
            <div className="space-y-6 rounded-2xl border border-[#c59b27]/25 bg-[#0a1226] p-5 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-white font-cairo">
                  ربط المنصات والحلقات المفرقة (تحكم صاحب المنصة)
                </h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  حدد ما إذا كان للموضوع حلقة مفرقة مستقلة، وخصص شارات وروابط كل منصة مع إمكانية التفعيل أو الحجب.
                </p>
              </div>

              {/* 1. STANDALONE EPISODE CONFIGURATION */}
              <div className="rounded-2xl bg-[#070d1e] border border-[#c59b27]/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="h-5 w-5 text-[#f0cb69]" />
                    <div>
                      <h4 className="text-xs font-bold text-white font-cairo">
                        تخصيص «حلقة مفرقة» مستقلة لهذا الموضوع 🎬
                      </h4>
                      <span className="text-[11px] text-[#94a3b8]">
                        إبراز شارة مميزة للقارئ وربط فيديو أو حلقة خاصة بهذا الكتاب
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!currentBook.standaloneEpisode?.hasStandaloneEpisode}
                      onChange={(e) =>
                        onUpdateBook({
                          ...currentBook,
                          standaloneEpisode: {
                            ...currentBook.standaloneEpisode,
                            hasStandaloneEpisode: e.target.checked,
                            badgeLabel: currentBook.standaloneEpisode?.badgeLabel || 'حلقة مفرقة',
                            title: currentBook.standaloneEpisode?.title || currentBook.title,
                            videoUrl: currentBook.standaloneEpisode?.videoUrl || currentBook.socialLinks?.youtubeUrl || '',
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#0a1226] border border-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c59b27]" />
                  </label>
                </div>

                {currentBook.standaloneEpisode?.hasStandaloneEpisode && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                        نص الشارة الظاهرة للقارئ:
                      </label>
                      <input
                        type="text"
                        value={currentBook.standaloneEpisode?.badgeLabel || 'حلقة مفرقة'}
                        onChange={(e) =>
                          onUpdateBook({
                            ...currentBook,
                            standaloneEpisode: {
                              ...currentBook.standaloneEpisode!,
                              badgeLabel: e.target.value,
                            },
                          })
                        }
                        placeholder="مثال: حلقة مفرقة"
                        className="w-full rounded-xl bg-[#0a1226] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                        رابط الحلقة المفرقة (يوتيوب أو رابط مباشر) *
                      </label>
                      <input
                        type="url"
                        value={currentBook.standaloneEpisode?.videoUrl || ''}
                        onChange={(e) =>
                          onUpdateBook({
                            ...currentBook,
                            standaloneEpisode: {
                              ...currentBook.standaloneEpisode!,
                              videoUrl: e.target.value,
                            },
                          })
                        }
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full rounded-xl bg-[#0a1226] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-[#cbd5e1] mb-1">
                        وصف مختصر للحلقة المفرقة (يظهر في البريد والموقع):
                      </label>
                      <input
                        type="text"
                        value={currentBook.standaloneEpisode?.description || ''}
                        onChange={(e) =>
                          onUpdateBook({
                            ...currentBook,
                            standaloneEpisode: {
                              ...currentBook.standaloneEpisode!,
                              description: e.target.value,
                            },
                          })
                        }
                        placeholder="مثال: حلقة وثائقية استقصائية تكشف أسرار الوثائق التاريخية بالصوت والصورة."
                        className="w-full rounded-xl bg-[#0a1226] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. OFFICIAL PODCAST NOTICE */}
              <div className="rounded-2xl bg-[#070d1e] border border-amber-500/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-amber-400" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-300">
                        حالة البودكاست الرسمي (ليس لحُكم بودكاست رسمي بعد)
                      </h4>
                      <p className="text-[11px] text-[#94a3b8]">
                        حُكم لم تطلق بودكاست رسمي بعد؛ يتم حجب روابط وشارات البودكاست في واجهة القراء تلقائياً.
                      </p>
                    </div>
                  </div>

                  <span className="rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 text-[10px] font-bold">
                    معطل تلقائياً
                  </span>
                </div>
              </div>

              {/* 3. PLATFORM TAGS & CUSTOM URLS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white font-cairo">
                    شارات وروابط المنصات الخارجية لهذا الموضوع
                  </h4>
                  <span className="text-[10px] text-[#94a3b8]">
                    فعّل المنصات وضع الرابط الذي سيفتح عند النقر
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* YouTube Tag */}
                  <div className="rounded-xl bg-[#070d1e] border border-white/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                        <Video className="h-4 w-4" />
                        يوتيوب (YouTube)
                      </span>
                      <input
                        type="checkbox"
                        checked={!!currentBook.socialLinks?.youtubeUrl}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            onUpdateBook({
                              ...currentBook,
                              socialLinks: { ...currentBook.socialLinks, youtubeUrl: '' },
                            });
                          }
                        }}
                        className="rounded border-white/20 text-[#c59b27]"
                      />
                    </div>
                    <input
                      type="url"
                      value={currentBook.socialLinks?.youtubeUrl || ''}
                      onChange={(e) =>
                        onUpdateBook({
                          ...currentBook,
                          socialLinks: {
                            ...currentBook.socialLinks,
                            youtubeUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full rounded-lg bg-[#0a1226] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  {/* 𝕏 Twitter Thread */}
                  <div className="rounded-xl bg-[#070d1e] border border-white/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                        <Twitter className="h-4 w-4" />
                        منصة 𝕏 (ثريد وتحليل)
                      </span>
                      <input
                        type="checkbox"
                        checked={!!currentBook.socialLinks?.xThreadUrl}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            onUpdateBook({
                              ...currentBook,
                              socialLinks: { ...currentBook.socialLinks, xThreadUrl: '' },
                            });
                          }
                        }}
                        className="rounded border-white/20 text-[#c59b27]"
                      />
                    </div>
                    <input
                      type="url"
                      value={currentBook.socialLinks?.xThreadUrl || ''}
                      onChange={(e) =>
                        onUpdateBook({
                          ...currentBook,
                          socialLinks: {
                            ...currentBook.socialLinks,
                            xThreadUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="https://x.com/hukmmedia/status/..."
                      className="w-full rounded-lg bg-[#0a1226] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  {/* Instagram Post */}
                  <div className="rounded-xl bg-[#070d1e] border border-white/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-pink-400">
                        <Instagram className="h-4 w-4" />
                        إنستغرام (Reel أو منشور)
                      </span>
                      <input
                        type="checkbox"
                        checked={!!currentBook.socialLinks?.instagramPostUrl}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            onUpdateBook({
                              ...currentBook,
                              socialLinks: { ...currentBook.socialLinks, instagramPostUrl: '' },
                            });
                          }
                        }}
                        className="rounded border-white/20 text-[#c59b27]"
                      />
                    </div>
                    <input
                      type="url"
                      value={currentBook.socialLinks?.instagramPostUrl || ''}
                      onChange={(e) =>
                        onUpdateBook({
                          ...currentBook,
                          socialLinks: {
                            ...currentBook.socialLinks,
                            instagramPostUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="https://instagram.com/p/..."
                      className="w-full rounded-lg bg-[#0a1226] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  {/* Telegram / Community Link */}
                  <div className="rounded-xl bg-[#070d1e] border border-white/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                        <LinkIcon className="h-4 w-4" />
                        تيليجرام / قناة التوثيق
                      </span>
                      <input
                        type="checkbox"
                        checked={!!currentBook.socialLinks?.telegramUrl}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            onUpdateBook({
                              ...currentBook,
                              socialLinks: { ...currentBook.socialLinks, telegramUrl: '' },
                            });
                          }
                        }}
                        className="rounded border-white/20 text-[#c59b27]"
                      />
                    </div>
                    <input
                      type="url"
                      value={currentBook.socialLinks?.telegramUrl || ''}
                      onChange={(e) =>
                        onUpdateBook({
                          ...currentBook,
                          socialLinks: {
                            ...currentBook.socialLinks,
                            telegramUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="https://t.me/hukmmedia/..."
                      className="w-full rounded-lg bg-[#0a1226] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Social Quotes Section */}
              <div className="border-t border-white/10 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white font-cairo">
                      اقتباسات جاهزة للنشر على السوشيال ميديا
                    </h4>
                    <p className="text-xs text-[#94a3b8]">
                      جمّع العبارات الجوهرية والـ «حُكم» لمشاركتها مباشرة مع جمهورك.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAddSocialQuote} className="flex gap-2">
                  <input
                    type="text"
                    value={newQuoteText}
                    onChange={(e) => setNewQuoteText(e.target.value)}
                    placeholder="اكتب اقتباساً استقصائياً قوياً من هذا الكتاب..."
                    className="flex-1 rounded-xl bg-[#070d1e] p-2.5 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newQuoteText.trim()}
                    className="rounded-xl bg-[#c59b27] hover:bg-[#d4af37] disabled:opacity-40 px-4 py-2 text-xs font-bold text-[#070d1e]"
                  >
                    + إضافة اقتباس
                  </button>
                </form>

                <div className="space-y-2.5">
                  {(currentBook.quotes || []).map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between rounded-xl bg-[#070d1e] border border-white/5 p-3"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs text-[#f0cb69] font-medium font-amiri">
                          «{q.quoteText}»
                        </p>
                        {q.context && (
                          <span className="text-[10px] text-[#64748b] block mt-0.5">
                            {q.context}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`«${q.quoteText}»\n— من كتاب: ${currentBook.title}\nحُكم | HUKM MEDIA`);
                          setCopiedQuoteId(q.id);
                          setTimeout(() => setCopiedQuoteId(null), 2000);
                        }}
                        className="flex items-center gap-1 rounded-lg bg-[#0e1935] hover:bg-[#15254d] px-2.5 py-1 text-[11px] text-[#cbd5e1] shrink-0 border border-white/10"
                      >
                        {copiedQuoteId === q.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-[#d4af37]" />
                            <span>نسخ للنشر</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Academic Sources & Bibliography */}
          {activeTab === 'sources' && (
            <div className="space-y-6 rounded-2xl border border-[#c59b27]/25 bg-[#0a1226] p-5 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-white font-cairo">
                  المراجع والمصادر البحثية المحققة
                </h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  توثيق الأوراق الأكاديمية والكتب والمخطوطات التاريخية التي بُني عليها هذا الكتاب.
                </p>
              </div>

              {/* Add Source Form */}
              <form onSubmit={handleAddSource} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-[#070d1e] p-3 rounded-xl border border-white/5">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    value={newSourceTitle}
                    onChange={(e) => setNewSourceTitle(e.target.value)}
                    placeholder="عنوان الكتاب، الورقة العلمية، أو الأرشيف..."
                    className="w-full rounded-lg bg-[#0a1226] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={newSourceAuthor}
                    onChange={(e) => setNewSourceAuthor(e.target.value)}
                    placeholder="المؤلف أو الهيئة المصدرة"
                    className="w-full rounded-lg bg-[#0a1226] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as any)}
                    className="flex-1 rounded-lg bg-[#0a1226] p-2 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none cursor-pointer"
                  >
                    <option value="book">كتاب</option>
                    <option value="paper">ورقة علمية</option>
                    <option value="archive">أرشيف/وثيقة</option>
                    <option value="documentary">وثائقي</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#c59b27] hover:bg-[#d4af37] px-3 py-2 text-xs font-bold text-[#070d1e] shrink-0"
                  >
                    + إضافة
                  </button>
                </div>
              </form>

              {/* Sources List */}
              <div className="space-y-2">
                {(currentBook.sources || []).map((s, index) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-[#070d1e] p-3 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0e1935] text-[11px] font-bold text-[#d4af37]">
                        {index + 1}
                      </span>
                      <div>
                        <h5 className="text-xs font-bold text-white font-cairo">{s.title}</h5>
                        <p className="text-[11px] text-[#94a3b8]">
                          {s.author} {s.year ? `(${s.year})` : ''} · {s.type}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const updated = (currentBook.sources || []).filter((item) => item.id !== s.id);
                        onUpdateBook({ ...currentBook, sources: updated });
                      }}
                      className="text-[#64748b] hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Media Add / Edit Modal */}
      {isMediaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#c59b27]/40 bg-[#0a1226] p-6 sm:p-7 shadow-2xl text-right no-scrollbar space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Film className="h-5 w-5 text-[#d4af37]" />
                <h3 className="text-base font-bold text-white font-cairo">
                  {editingMediaId ? 'تعديل بيانات الوسيط' : 'إضافة وسيط مرئي جديد للفصل'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(false)}
                className="rounded-full p-1.5 text-[#94a3b8] hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMedia} className="space-y-4">
              {/* Media Type Selector */}
              <div>
                <label className="block text-xs font-bold text-[#f0cb69] mb-1.5">
                  نوع الوسيط المرئي:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'video', label: '🎬 فيديو قصير (بضع ثوانٍ)', desc: 'لوب أو تيزر وثائقي' },
                    { id: 'gif', label: '🎞️ صورة متحركة GIF', desc: 'رسم توضيحي متحرك' },
                    { id: 'image', label: '📸 صورة عادية', desc: 'وثيقة أو مخطط عالي الدقة' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setMediaType(t.id as MediaType);
                        if (t.id === 'video') setMediaBadge(`فيديو قصير (${mediaDuration}ث)`);
                        else if (t.id === 'gif') setMediaBadge('GIF متحرك');
                        else setMediaBadge('صورة عالية الدقة');
                      }}
                      className={`rounded-xl p-2.5 text-right border transition-all ${
                        mediaType === t.id
                          ? 'bg-[#c59b27] text-[#070d1e] border-[#c59b27] font-bold shadow-md'
                          : 'bg-[#070d1e] text-[#cbd5e1] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="block text-xs font-bold">{t.label}</span>
                      <span className={`block text-[10px] ${mediaType === t.id ? 'text-[#070d1e]/80' : 'text-[#64748b]'}`}>
                        {t.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Source: URL or Local Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#cbd5e1]">
                  رابط الوسيط المباشر (URL):
                </label>
                <input
                  type="url"
                  required
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://... (MP4, WebM, GIF, JPG, PNG)"
                  className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                />

                {/* File Upload Option */}
                <div className="pt-1">
                  <label className="flex items-center justify-center gap-2 rounded-xl bg-[#070d1e] hover:bg-[#111e3f] border border-dashed border-[#c59b27]/30 p-2.5 text-xs text-[#f0cb69] font-bold cursor-pointer transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>أو اختر ملفاً من جهازك (JPG, PNG, GIF, MP4, WebM)</span>
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Video Specific: Duration in Seconds */}
              {mediaType === 'video' && (
                <div>
                  <label className="block text-xs font-bold text-[#f0cb69] mb-1">
                    مدة الفيديو القصير (بالثواني):
                  </label>
                  <div className="flex items-center gap-2">
                    {[3, 5, 6, 8, 10, 15].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setMediaDuration(sec);
                          setMediaBadge(`فيديو قصير (${sec} ثوانٍ)`);
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors ${
                          mediaDuration === sec
                            ? 'bg-[#c59b27] text-[#070d1e] border-[#c59b27]'
                            : 'bg-[#070d1e] text-[#cbd5e1] border-white/10'
                        }`}
                      >
                        {sec} ث
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={mediaDuration}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMediaDuration(val);
                        setMediaBadge(`فيديو قصير (${val}ث)`);
                      }}
                      className="w-20 rounded-lg bg-[#070d1e] p-1.5 text-xs text-center font-bold text-white border border-white/10"
                    />
                  </div>
                </div>
              )}

              {/* Title & Placement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                    عنوان الوسيط التوضيحي:
                  </label>
                  <input
                    type="text"
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="مثال: حركة التروس في القرن الثاني عشر"
                    className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                    موضع العرض في الفصل:
                  </label>
                  <select
                    value={mediaPlacement}
                    onChange={(e) => setMediaPlacement(e.target.value as any)}
                    className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none cursor-pointer"
                  >
                    <option value="header">أعلى الفصل (بانر رئيسي)</option>
                    <option value="in_content">بين الفقرات في منتصف الفصل</option>
                    <option value="footer">خاتمة وهوامش الفصل</option>
                  </select>
                </div>
              </div>

              {/* Caption Textarea */}
              <div>
                <label className="block text-xs font-bold text-[#cbd5e1] mb-1">
                  الشرح التوثيقي والسياق الاستقصائي (Caption):
                </label>
                <textarea
                  rows={2}
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  placeholder="شرح يوضح للقارئ ما يراه في هذا الفيديو أو الصورة وعلاقته بموضوع البحث..."
                  className="w-full rounded-xl bg-[#070d1e] p-2.5 text-xs text-white border border-white/10 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Live Preview Box */}
              {mediaUrl && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-[#94a3b8] block">معاينة مباشرة:</span>
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-[#c59b27]/30">
                    {mediaType === 'video' ? (
                      <video
                        src={mediaUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                        className="h-full w-full object-cover"
                      />
                    ) : mediaType === 'gif' ? (
                      <img src={mediaUrl} alt="GIF preview" className="h-full w-full object-contain" />
                    ) : (
                      <img src={mediaUrl} alt="Image preview" className="h-full w-full object-cover" />
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(false)}
                  className="rounded-xl bg-[#070d1e] px-4 py-2 text-xs font-semibold text-[#cbd5e1] hover:text-white"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={!mediaUrl.trim()}
                  className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] hover:from-[#f0cb69] disabled:opacity-50 px-6 py-2.5 text-xs font-black text-[#070d1e] shadow-lg cursor-pointer"
                >
                  {editingMediaId ? 'تأكيد التعديلات' : 'إدراج الوسيط في الفصل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

