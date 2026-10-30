/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Compass,
  PenTool,
  BookOpen,
  Sparkles,
  Layers,
  PlusCircle,
  Eye,
  ShieldCheck,
  CheckCircle,
  Bookmark,
  Bell,
  Check,
} from 'lucide-react';
import { HukmNavbar } from './components/HukmNavbar';
import { HukmHero } from './components/HukmHero';
import { BookCard } from './components/BookCard';
import { BookWriterStudio } from './components/BookWriterStudio';
import { BookReaderView } from './components/BookReaderView';
import { BookOverviewView } from './components/BookOverviewView';
import { NewBookModal } from './components/NewBookModal';
import { ManageCategoriesModal } from './components/ManageCategoriesModal';
import { HukmSearchModal } from './components/HukmSearchModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { SendAnnouncementModal } from './components/SendAnnouncementModal';
import { HukmEmailModal } from './components/HukmEmailModal';
import { HukmFooter } from './components/HukmFooter';
import {
  INITIAL_BOOKS,
  INITIAL_CATEGORIES,
  DEFAULT_CREATOR,
  HUKM_LOGO,
  HUKM_MOTTO,
  HUKM_DESCRIPTION,
} from './data/hukmData';
import { BookProject, CategoryItem } from './types/hukm';
import { UserProfile, AppNotification } from './types/auth';
import {
  calculateBookStats,
  incrementBookViews,
  addCategory,
  deleteCategory,
} from './utils/hukmEngine';
import {
  getStoredCurrentUser,
  saveStoredCurrentUser,
  getStoredNotifications,
  saveStoredNotifications,
  toggleUserBookmark,
  isAuthorizedOwnerEmail,
  canSwitchViewMode,
  OWNER_USER,
  DEMO_READER_USER,
  getStoredSubscribers,
  addEmailLog,
} from './utils/authStorage';
import { generateNewReleaseEmailHtml } from './utils/emailTemplateGenerator';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedBookId, setSelectedBookId] = useState<string>('investigation-01');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // User Auth & Role State
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => getStoredCurrentUser());
  const [isReaderPreviewMode, setIsReaderPreviewMode] = useState<boolean>(false);

  // Strict check: only ifawz40@gmail.com is authorized as owner
  const isActualOwner = isAuthorizedOwnerEmail(currentUser.email);
  const isOwner = isActualOwner && !isReaderPreviewMode;


  // Dynamic Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getStoredNotifications()
  );

  // Dynamic Categories with localStorage persistence
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('hukm_categories_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_CATEGORIES;
  });

  // Books data with localStorage persistence
  const [books, setBooks] = useState<BookProject[]>(() => {
    try {
      const saved = localStorage.getItem('hukm_books_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_BOOKS;
  });

  // Modals state
  const [isNewBookOpen, setIsNewBookOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // In-app interactive Toast Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  // Sync state to local storage
  useEffect(() => {
    saveStoredCurrentUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveStoredNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('hukm_books_v2', JSON.stringify(books));
    } catch {}
  }, [books]);

  useEffect(() => {
    try {
      localStorage.setItem('hukm_categories_v1', JSON.stringify(categories));
    } catch {}
  }, [categories]);

  // Support direct URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart');
    const bookParam = params.get('book');
    const viewParam = params.get('view');
    const roleParam = params.get('role');

    if (roleParam === 'reader') {
      setCurrentUser(DEMO_READER_USER);
    } else if (roleParam === 'owner') {
      setCurrentUser(OWNER_USER);
    }

    if (viewParam === 'writer') {
      if (isOwner) {
        setCurrentView('writer');
      } else {
        showToast('عذراً، استوديو التأليف مخصص لصاحب المنصة والناشر الرسمي فقط.');
      }
    } else if (bookParam) {
      setSelectedBookId(bookParam);
      setCurrentView('reader');
    } else if (autostart === '1') {
      if (isOwner) {
        setCurrentView('writer');
      }
    }
  }, []);

  const currentBook = books.find((b) => b.id === selectedBookId) || books[0];

  // Actions
  const handleOpenBookOverview = (bookId: string) => {
    setSelectedBookId(bookId);
    setCurrentView('overview');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleOpenReader = (bookId: string, chapterId?: string) => {
    setSelectedBookId(bookId);
    if (chapterId) setSelectedChapterId(chapterId);
    setCurrentView('reader');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleOpenWriter = (bookId?: string) => {
    if (!isOwner) {
      showToast('عذراً، استوديو التأليف مخصص للناشر الرسمي صاحب المنصة فقط.');
      return;
    }
    if (bookId) setSelectedBookId(bookId);
    setCurrentView('writer');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleUpdateBook = (updatedBook: BookProject) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === updatedBook.id ? updatedBook : b))
    );
    showToast(`تم حفظ وتحديث كتاب «${updatedBook.title}» بنجاح!`);
  };

  const handleCreateBook = (newBook: BookProject) => {
    setBooks((prev) => [newBook, ...prev]);
    setSelectedBookId(newBook.id);

    // 1. Dispatch automatic notification for readers
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: `كتاب استقصائي جديد: ${newBook.title} 🏛️`,
      message: newBook.subtitle || newBook.summary.slice(0, 90) + '...',
      type: 'new_book',
      timestamp: 'الآن',
      read: false,
      bookId: newBook.id,
      targetRole: 'all',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // 2. Dispatch royal branded email release to all active subscribers
    const activeSubs = getStoredSubscribers().filter((s) => s.active);
    addEmailLog({
      subject: `إصدار استقصائي جديد: ${newBook.title} | حُكم HUKM MEDIA`,
      recipientCount: activeSubs.length,
      timestamp: 'الآن',
      type: 'new_release',
      bookTitle: newBook.title,
      previewHtml: generateNewReleaseEmailHtml(newBook, newBook.chapters[0]),
      delivered: true,
    });

    showToast(`تم نشر كتاب «${newBook.title}» وإرسال بريد إلكتروني فاخر وإشعار إلى ${activeSubs.length} مشتركاً! ✉️`);
    setCurrentView('writer');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  // Views increment: when a real reader views a chapter, increment from the custom baseline!
  const handleChapterViewed = (chapterId: string) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === currentBook.id ? incrementBookViews(b, chapterId) : b))
    );
  };

  // Category management
  const handleAddCategory = (newCat: { name: string; description?: string }) => {
    setCategories((prev) => addCategory(prev, newCat));
    showToast(`تمت إضافة قسم «${newCat.name}» بنجاح!`);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const catName = categories.find((c) => c.id === categoryId)?.name;
    setCategories((prev) => deleteCategory(prev, categoryId));
    setBooks((prev) =>
      prev.map((b) =>
        b.category === categoryId
          ? { ...b, category: categories.find((c) => c.id !== categoryId)?.id || 'general' }
          : b
      )
    );
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId('all');
    }
    showToast(`تم حذف قسم «${catName || ''}» بنجاح.`);
  };

  // Bookmark Toggle
  const handleToggleBookmark = (bookId: string) => {
    const updated = toggleUserBookmark(currentUser, bookId);
    setCurrentUser(updated);
    const bookTitle = books.find((b) => b.id === bookId)?.title || 'الكتاب';
    if (updated.bookmarks.includes(bookId)) {
      showToast(`تمت إضافة «${bookTitle}» إلى محفوظاتك! ⭐`);
    } else {
      showToast(`تمت إزالة «${bookTitle}» من المفضلة.`);
    }
  };

  // Notifications Actions
  const handleSelectNotification = (notif: AppNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (notif.bookId) {
      handleOpenReader(notif.bookId, notif.chapterId);
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('تم تحديد جميع الإشعارات كمقروءة.');
  };

  const handleSendAnnouncement = (newNotif: AppNotification) => {
    setNotifications((prev) => [newNotif, ...prev]);
    showToast(`تم إرسال التنبيه «${newNotif.title}» بنجاح لجميع القراء! 📢`);
  };

  // View Mode Switching (Strictly for ifawz40@gmail.com)
  const handleToggleReaderPreview = () => {
    if (!isActualOwner) return;
    setIsReaderPreviewMode((prev) => {
      const next = !prev;
      showToast(
        next
          ? 'تم تفعيل وضع معاينة القارئ 👁️ (تتصفح المنصة كما يراها الجمهور)'
          : 'تمت العودة إلى واجهة صاحب المنصة والناشر 👑 (صلاحيات كاملة)'
      );
      if (next && currentView === 'writer') {
        setCurrentView('home');
      }
      return next;
    });
  };

  // User Switching
  const handleSwitchUser = (targetUser: UserProfile) => {
    setCurrentUser(targetUser);
    setIsReaderPreviewMode(false);
    if (targetUser.role === 'reader' && currentView === 'writer') {
      setCurrentView('home');
    }
    showToast(
      targetUser.email === 'ifawz40@gmail.com'
        ? 'تم التبديل إلى حساب صاحب المنصة والناشر الرسمي 👑 (صلاحيات كاملة)'
        : 'تم التبديل إلى حساب القارئ المعتمد 📖 (واجهة القراءة والتفاعل)'
    );
  };

  const handleLogout = () => {
    setCurrentUser(DEMO_READER_USER);
    setIsReaderPreviewMode(false);
    if (currentView === 'writer') {
      setCurrentView('home');
    }
    showToast('تم تسجيل الخروج بنجاح.');
  };


  // Metrics
  const totalChapters = books.reduce((acc, b) => acc + b.chapters.length, 0);
  const totalWords = books.reduce(
    (acc, b) => acc + calculateBookStats(b.chapters).totalWords,
    0
  );

  const displayedBooks =
    selectedCategoryId === 'all'
      ? books
      : books.filter((b) => b.category === selectedCategoryId);

  return (
    <div className="min-h-screen bg-[#070d1e] text-[#f4efe6] flex flex-col font-cairo selection:bg-[#c59b27] selection:text-[#070d1e]" dir="rtl">
      {/* Interactive Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-2xl bg-[#0a1226]/95 border border-[#c59b27] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-top duration-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#c59b27] text-[#070d1e]">
            <Check className="h-4 w-4" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Bar */}
      {currentView !== 'reader' && currentView !== 'overview' && (
        <HukmNavbar
          currentView={currentView}
          currentUser={currentUser}
          notifications={notifications}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          isReaderPreviewMode={isReaderPreviewMode}
          onToggleReaderPreview={handleToggleReaderPreview}
          onNavigate={(view, catId) => {
            if (catId) {
              setSelectedCategoryId(catId);
              setCurrentView('home');
            } else {
              if (view === 'writer' && !isOwner) {
                showToast('عذراً، استوديو التأليف مخصص لصاحب المنصة والناشر الرسمي فقط.');
                return;
              }
              setCurrentView(view);
            }
            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          }}
          onOpenNewBook={() => {
            if (!isOwner) {
              showToast('رفع الكتب مخصص لصاحب المنصة والناشر الرسمي.');
              return;
            }
            setIsNewBookOpen(true);
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenManageCategories={() => {
            if (!isOwner) {
              showToast('إدارة الأقسام مخصصة لصاحب المنصة.');
              return;
            }
            setIsManageCategoriesOpen(true);
          }}
          onOpenAuthModal={(mode) => {
            setAuthModalMode(mode || 'login');
            setIsAuthModalOpen(true);
          }}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onSwitchUser={handleSwitchUser}
          onSelectNotification={handleSelectNotification}
          onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
          onOpenSendAnnouncement={() => setIsAnnouncementModalOpen(true)}
          onOpenEmailModal={() => setIsEmailModalOpen(true)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1">
        {/* VIEW 1: HOME & PROJECT DIRECTORY */}
        {currentView === 'home' && (
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-10">
            {/* 1. Hero Showcase */}
            <HukmHero
              onOpenWriter={() => handleOpenWriter()}
              onExploreBooks={() => {
                const el = document.getElementById('books-catalog');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              totalBooksCount={books.length}
              totalChaptersCount={totalChapters}
              totalWordsCount={totalWords}
              isOwner={isOwner}
            />

            {/* 2. Category Filter Pills with "إدارة الأقسام" button (Owner only) */}
            <div id="books-catalog" className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white font-cairo">
                      مشاريع وكتب حُكم المفتوحة
                    </h2>
                    <span className="rounded-md bg-[#c59b27]/20 px-2 py-0.5 text-xs font-bold text-[#f0cb69] border border-[#c59b27]/30">
                      {displayedBooks.length} مؤلفات
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    كتب معرفية استقصائية تخدم المحتوى المرئي والمسموع عبر مختلف وسائل التواصل
                  </p>
                </div>

                {/* Filter buttons & Manage categories link */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar bg-[#0a1226] p-1.5 rounded-2xl border border-white/5">
                    <button
                      onClick={() => setSelectedCategoryId('all')}
                      className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                        selectedCategoryId === 'all'
                          ? 'bg-[#c59b27] text-[#070d1e] shadow-md'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      كافة المشاريع
                    </button>

                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                          selectedCategoryId === cat.id
                            ? 'bg-[#c59b27] text-[#070d1e] shadow-md'
                            : 'text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Owner ONLY: Add / Manage Categories Quick Trigger */}
                  {isOwner && (
                    <button
                      onClick={() => setIsManageCategoriesOpen(true)}
                      className="flex items-center gap-1.5 rounded-2xl bg-[#0e1935] hover:bg-[#162752] border border-[#c59b27]/40 px-3 py-2 text-xs font-bold text-[#f0cb69] transition-all shrink-0"
                      title="إضافة أو حذف أقسام الكتب (صاحب المنصة)"
                    >
                      <Layers className="h-4 w-4" />
                      <span className="hidden md:inline">+ إدارة الأقسام</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Books Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {displayedBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    categories={categories}
                    isOwner={isOwner}
                    isBookmarked={currentUser.bookmarks.includes(book.id)}
                    onRead={() => handleOpenBookOverview(book.id)}
                    onEdit={isOwner ? () => handleOpenWriter(book.id) : undefined}
                    onToggleBookmark={() => handleToggleBookmark(book.id)}
                  />
                ))}
              </div>
            </div>

            {/* 3. Featured Spotlight: Investigations series «وعشان الموضوع مش زي ما إنت فاكر» */}
            <div className="rounded-3xl border border-[#c59b27]/30 bg-gradient-to-r from-[#0d1730] to-[#070d1e] p-6 sm:p-8 space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-right">
                  <span className="rounded-full bg-[#c59b27]/20 border border-[#c59b27]/40 px-3 py-1 text-xs font-bold text-[#f0cb69]">
                    سلسلة حُكم الرئيسية
                  </span>
                  <h3 className="text-2xl font-black text-white font-cairo">
                    «وعشان الموضوع مش زي ما إنت فاكر… تعالى نعرف.»
                  </h3>
                  <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-2xl leading-relaxed">
                    مشروعنا الرائد في تفكيك الخرافات والمعلومات الشائعة بالاستناد إلى وثائق الأرشيف والأبحاث المحكّمة، لإعادة كتابة القصة من جذورها الحقيقية.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleOpenBookOverview('investigation-01')}
                    className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-5 py-3 text-xs font-bold text-[#070d1e] shadow-lg transition-transform hover:scale-105 active:scale-95"
                  >
                    استعراض فصول السلسلة
                  </button>

                  {isOwner ? (
                    <button
                      onClick={() => handleOpenWriter('investigation-01')}
                      className="rounded-xl bg-[#0a1226] border border-[#c59b27]/40 px-4 py-3 text-xs font-bold text-[#f0cb69] hover:bg-[#122045] transition-colors"
                    >
                      إضافة فصول جديدة في الاستوديو
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleBookmark('investigation-01')}
                      className={`rounded-xl border px-4 py-3 text-xs font-bold transition-colors ${
                        currentUser.bookmarks.includes('investigation-01')
                          ? 'bg-[#c59b27] text-[#070d1e] border-[#c59b27]'
                          : 'bg-[#0a1226] border-[#c59b27]/40 text-[#f0cb69] hover:bg-[#122045]'
                      }`}
                    >
                      {currentUser.bookmarks.includes('investigation-01')
                        ? 'محفوظة في مفضلتي ⭐'
                        : '+ حفظ في المفضلة'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </main>
        )}

        {/* VIEW 2: BOOK WRITER STUDIO (Owner ONLY) */}
        {currentView === 'writer' && (
          isOwner ? (
            <BookWriterStudio
              books={books}
              currentBook={currentBook}
              onSelectBook={(bookId) => setSelectedBookId(bookId)}
              onUpdateBook={handleUpdateBook}
              onPreviewBook={(bookId, chId) => handleOpenReader(bookId, chId)}
            />
          ) : (
            <div className="p-12 text-center text-white" dir="rtl">
              <p className="text-lg font-bold text-[#f0cb69]">عذراً، استوديو التأليف مخصص لصاحب المنصة والناشر الرسمي فقط.</p>
              <button
                onClick={() => setCurrentView('home')}
                className="mt-4 rounded-xl bg-[#c59b27] px-4 py-2 text-xs font-bold text-[#070d1e]"
              >
                العودة إلى المعرض والمشاريع
              </button>
            </div>
          )
        )}

        {/* VIEW 2.5: BOOK OVERVIEW & CHAPTERS INDEX */}
        {currentView === 'overview' && (
          <BookOverviewView
            book={currentBook}
            categories={categories}
            isOwner={isOwner}
            isBookmarked={currentUser.bookmarks.includes(currentBook.id)}
            onBack={() => setCurrentView('home')}
            onSelectChapter={(chapterId) => handleOpenReader(currentBook.id, chapterId)}
            onOpenWriter={isOwner ? (bookId) => handleOpenWriter(bookId) : undefined}
            onToggleBookmark={() => handleToggleBookmark(currentBook.id)}
            onShowToast={showToast}
          />
        )}

        {/* VIEW 3: BOOK READER VIEW */}
        {currentView === 'reader' && (
          <BookReaderView
            book={currentBook}
            initialChapterId={selectedChapterId}
            isOwner={isOwner}
            isBookmarked={currentUser.bookmarks.includes(currentBook.id)}
            onBack={() => setCurrentView('home')}
            onOpenOverview={() => handleOpenBookOverview(currentBook.id)}
            onOpenWriter={isOwner ? (bookId) => handleOpenWriter(bookId) : undefined}
            onChapterViewed={handleChapterViewed}
            onToggleBookmark={() => handleToggleBookmark(currentBook.id)}
          />
        )}
      </div>

      {/* New Book Modal (Owner only) */}
      {isOwner && (
        <NewBookModal
          isOpen={isNewBookOpen}
          onClose={() => setIsNewBookOpen(false)}
          categories={categories}
          onCreateBook={handleCreateBook}
        />
      )}

      {/* Manage Categories Modal (Owner only) */}
      {isOwner && (
        <ManageCategoriesModal
          isOpen={isManageCategoriesOpen}
          onClose={() => setIsManageCategoriesOpen(false)}
          categories={categories}
          books={books}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

      {/* Instant Search Modal */}
      <HukmSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        books={books}
        onSelectBook={(bookId) => handleOpenBookOverview(bookId)}
        onSelectChapter={(bookId, chId) => handleOpenReader(bookId, chId)}
      />

      {/* Auth Modal (Login / Sign up / Quick Test Switch) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`مرحباً بك يا ${user.name}!`);
        }}
      />

      {/* User Profile & Bookmarks Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        user={currentUser}
        books={books}
        isReaderPreviewMode={isReaderPreviewMode}
        onToggleReaderPreview={handleToggleReaderPreview}
        onClose={() => setIsProfileModalOpen(false)}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onOpenBook={(bookId) => handleOpenBookOverview(bookId)}
      />

      {/* Send Announcement Modal (Owner only) */}
      {isOwner && (
        <SendAnnouncementModal
          isOpen={isAnnouncementModalOpen}
          onClose={() => setIsAnnouncementModalOpen(false)}
          books={books}
          onSendNotification={handleSendAnnouncement}
        />
      )}

      {/* Royal Hukm Email & Newsletter Modal */}
      <HukmEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        books={books}
        onShowToast={showToast}
      />

      {/* Footer */}
      {currentView !== 'reader' && currentView !== 'overview' && (
        <HukmFooter
          onNavigate={(view, catId) => {
            if (catId) {
              setSelectedCategoryId(catId);
              setCurrentView('home');
            } else {
              if (view === 'writer' && !isOwner) {
                showToast('عذراً، استوديو التأليف مخصص لصاحب المنصة فقط.');
                return;
              }
              setCurrentView(view);
            }
            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          }}
        />
      )}
    </div>
  );
}
