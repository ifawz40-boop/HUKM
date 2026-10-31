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
import { HukmLandingView } from './components/HukmLandingView';
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
import { AdminManagementModal } from './components/AdminManagementModal';
import { BannedNoticeModal } from './components/BannedNoticeModal';
import { HukmFooter } from './components/HukmFooter';
import { getActiveBanDetails } from './utils/moderationTracker';
import { testFirestoreConnection } from './firebase/config';
import {
  fetchBooksFromFirestore,
  saveBookToFirestore,
  deleteBookFromFirestore,
  fetchCategoriesFromFirestore,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
} from './firebase/firestoreService';
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
  getStoredNotifications,
  saveStoredNotifications,
  toggleUserBookmark,
  getStoredSubscribers,
  addEmailLog,
} from './utils/authStorage';
import { subscribeToAuthState, logoutUser } from './firebase/authService';
import { isOwner as checkIsOwner, isAdmin as checkIsAdmin } from './services/permissionService';
import { generateNewReleaseEmailHtml } from './utils/emailTemplateGenerator';

export default function App() {
  // Default entry view is landing: Platform Introduction & Sign-in Portal
  const [currentView, setCurrentView] = useState<string>('landing');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // Real User Auth & Role State (null when unauthenticated visitor / guest)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isReaderPreviewMode, setIsReaderPreviewMode] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Authoritative permissions derived strictly from Firebase Custom Claims & verified state
  const isUserOwner = checkIsOwner(currentUser);
  const isActualAdminOrOwner = checkIsAdmin(currentUser);
  const isOwner = isActualAdminOrOwner && !isReaderPreviewMode;

  // Real Firebase Auth Lifecycle listener
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(
      (profile) => {
        setCurrentUser(profile);
        setAuthLoading(false);
      },
      (loading) => {
        setAuthLoading(loading);
      }
    );
    return () => unsubscribe();
  }, []);

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

  // Books data: purged of mock books to start pristine with official publications
  const [books, setBooks] = useState<BookProject[]>(() => {
    try {
      localStorage.removeItem('hukm_books_v2');
      localStorage.removeItem('hukm_books_v1');
      const saved = localStorage.getItem('hukm_books_v3');
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
  const [isAdminManagementOpen, setIsAdminManagementOpen] = useState(false);

  // Active Ban verification for current session
  const activeBan = currentUser?.email ? getActiveBanDetails(currentUser.email) : null;

  // In-app interactive Toast Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  const handleQuickResumeChapter = (bookId: string, chapterId: string) => {
    setSelectedBookId(bookId);
    setSelectedChapterId(chapterId);
    setCurrentView('reader');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleBannedLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    showToast('تم تسجيل الخروج.');
  };

  // Sync state
  useEffect(() => {
    saveStoredNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('hukm_books_v3', JSON.stringify(books));
    } catch {}
  }, [books]);

  useEffect(() => {
    try {
      localStorage.setItem('hukm_categories_v1', JSON.stringify(categories));
    } catch {}
  }, [categories]);

  // Initial Firestore Cloud Connection & Seed/Sync
  useEffect(() => {
    testFirestoreConnection();

    // Pull or Seed Books (ensuring legacy mock books are not loaded)
    fetchBooksFromFirestore().then((remoteBooks) => {
      if (remoteBooks && remoteBooks.length > 0) {
        const realBooks = remoteBooks.filter(
          (b) => !['investigation-01', 'science-ai-01', 'history-01'].includes(b.id)
        );
        if (realBooks.length > 0) {
          setBooks(realBooks);
        }
      }
    });

    // Pull or Seed Categories
    fetchCategoriesFromFirestore().then((remoteCats) => {
      if (remoteCats && remoteCats.length > 0) {
        setCategories(remoteCats);
      } else {
        INITIAL_CATEGORIES.forEach((c) => saveCategoryToFirestore(c));
      }
    });
  }, []);

  // Support direct deep link URL params (strictly for views/books, no role bypass)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart');
    const bookParam = params.get('book');
    const viewParam = params.get('view');

    if (viewParam === 'home') {
      setCurrentView('home');
    } else if (viewParam === 'landing') {
      setCurrentView('landing');
    } else if (bookParam) {
      setSelectedBookId(bookParam);
      setCurrentView('reader');
    }
  }, []);

  const currentBook = (selectedBookId ? books.find((b) => b.id === selectedBookId) : books[0]) || null;

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
    saveBookToFirestore(updatedBook);
    showToast(`تم حفظ وتحديث كتاب «${updatedBook.title}» في السحابة بنجاح!`);
  };

  const handleCreateBook = (newBook: BookProject) => {
    setBooks((prev) => [newBook, ...prev]);
    setSelectedBookId(newBook.id);
    saveBookToFirestore(newBook);

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

    showToast(`تم نشر كتاب «${newBook.title}» ومزامنته سحابياً مع قاعدة البيانات! ☁️`);
    setCurrentView('writer');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleDeleteBook = (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    deleteBookFromFirestore(bookId);
    if (selectedBookId === bookId) {
      setSelectedBookId('');
    }
    showToast('تم حذف العمل بنجاح.');
  };

  const handleCreateSampleNovel = () => {
    const now = Date.now();
    const sampleId = `novel-${now}`;
    const sample: BookProject = {
      id: sampleId,
      title: 'لورد الحقيقة: سقوط الأقنعة',
      subtitle: 'تحقيق استقصائي في خفايا الأرشيف التاريخي والقرارات المصيرية',
      author: 'Dr/ Islam Mohamed',
      category: categories[0]?.id || 'investigations',
      coverImage: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=800&q=80',
      status: 'ongoing',
      summary: 'في قلب القرن الثامن عشر، قادت وثيقة مفقودة في أرشيفات الشرق إلى تفكيك أعظم الأساطير السياسية والعلمية. تحقيق استقصائي روائي يبحث، يفكك، ويفهم الحقيقة من جذورها الأولى.',
      rating: 5.0,
      viewsCount: 320,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: [
        {
          id: `ch-${now}-1`,
          bookId: sampleId,
          chapterNumber: 1,
          title: 'الفصل الأول: العثور على الأرشيف المفقود',
          subtitle: 'حيث تبدأ كل قصة لا يريدونك أن تعرفها',
          content: [
            'لم تكن القضية تتعلق بمجرد خلاف على أوراق تاريخية صفراء، بل كانت معركة على الوعي برمته. حين دخل الباحث قبو المكتبة الوطنية في مساء يوم شتوي ممطر، لم يكن يدرك أن ما بين يديه سيعيد كتابة نصف قرن من المسلمات.',
            '«وعشان الموضوع مش زي ما إنت فاكر… تعالى نعرف التفاصيل التي أخفتها السجلات الرسمية.»',
            'كانت المخطوطة مؤرخة بعام 1792، وتحمل توقيعاً غامضاً كاد يمحوه الزمن. لكن ما جاء بين السطور لم يكن يقبل الشك: القرارات الكبرى التي غيّرت مصير المنطقة لم تُتخذ في الغرف المضيئة كما تروي كتب المناهج، بل في أروقة مغلقة وراء كواليس الصفقات التجارية السرية.',
            'أخذ الباحث نفساً عميقاً، وبدأ بتدوين الملاحظات كلمة بكلمة، استعداداً لمواجهة العالم بالحقيقة التي طال انتظارها.',
          ],
          status: 'ready',
          wordCount: 135,
          readingTimeMinutes: 1,
          viewsCount: 210,
          updatedAt: new Date().toISOString(),
        },
        {
          id: `ch-${now}-2`,
          bookId: sampleId,
          chapterNumber: 2,
          title: 'الفصل الثاني: فك الشفرة والمواجهة الأولى',
          subtitle: 'عندما تصطدم الوثيقة بالرواية الشائعة',
          content: [
            'في الصباح التالي، كانت الشفرات الأولى للوثيقة قد بدأت تتضح. لم تكن مجرد نصوص تاريخية متباعدة، بل كانت خطة عمل متكاملة تسلسلت على مدى ثلاثين عاماً.',
            '«نبحث، نفكك، ونفهم» - كانت هذه هي القاعدة الذهبية التي سار عليها التحقيق. فكل سطر كُتب، كان يحيل إلى وثيقة مقابلة في أرشيفات أخرى مبعثرة بين العواصم.',
            'وحين طُرحت أولى النتائج على طاولة النقاش، كان الصمت هو سيد الموقف. لم يستطع أحد أن ينكر دقة المراجع وقوة الأدلة المستخرجة.',
          ],
          status: 'ready',
          wordCount: 105,
          readingTimeMinutes: 1,
          viewsCount: 110,
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    handleCreateBook(sample);
  };

  // Views increment: when a real reader views a chapter, increment from the custom baseline!
  const handleChapterViewed = (chapterId: string) => {
    if (!currentBook) return;
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === currentBook.id) {
          const updated = incrementBookViews(b, chapterId);
          saveBookToFirestore(updated);
          return updated;
        }
        return b;
      })
    );
  };

  // Category management
  const handleAddCategory = (newCat: { name: string; description?: string }) => {
    setCategories((prev) => {
      const updated = addCategory(prev, newCat);
      const added = updated[updated.length - 1];
      if (added) saveCategoryToFirestore(added);
      return updated;
    });
    showToast(`تمت إضافة قسم «${newCat.name}» ومزامنته سحابياً!`);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const catName = categories.find((c) => c.id === categoryId)?.name;
    setCategories((prev) => deleteCategory(prev, categoryId));
    deleteCategoryFromFirestore(categoryId);
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
    if (!currentUser) {
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      showToast('يرجى تسجيل الدخول لحفظ الكتب في مفضلتك.');
      return;
    }
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

  // View Mode Switching (Strictly for verified Admins & Owner)
  const handleToggleReaderPreview = () => {
    if (!isActualAdminOrOwner) return;
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

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
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
          onSelectNotification={handleSelectNotification}
          onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
          onOpenSendAnnouncement={() => setIsAnnouncementModalOpen(true)}
          onOpenEmailModal={() => setIsEmailModalOpen(true)}
          onOpenAdminManagement={() => setIsAdminManagementOpen(true)}
          onLogout={handleLogout}
          onUserRefreshed={(refreshed) => setCurrentUser(refreshed)}
          onShowToast={showToast}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1">
        {/* VIEW 0: PLATFORM LANDING, VISION & AUTHENTICATION PORTAL */}
        {currentView === 'landing' && (
          <HukmLandingView
            currentUser={currentUser}
            isOwner={isOwner}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              showToast(`أهلاً بك يا ${user.name} في منصة حُكم.`);
            }}
            onEnterLibrary={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
            }}
            onOpenWriter={() => handleOpenWriter()}
            onShowToast={showToast}
            onLogout={handleLogout}
          />
        )}

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

              {/* Books Grid or Elegant Empty Slate */}
              {displayedBooks.length === 0 ? (
                <div className="rounded-3xl border border-[#c59b27]/30 bg-gradient-to-b from-[#0a142c] to-[#050a16] p-8 sm:p-12 text-center space-y-5 shadow-2xl" dir="rtl">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#c59b27]/10 border border-[#c59b27]/30 text-[#d4af37]">
                    <BookOpen className="h-8 w-8" />
                  </div>
                  <div className="space-y-2 max-w-lg mx-auto">
                    <h3 className="text-xl sm:text-2xl font-black text-white font-cairo">
                      مكتبة حُكم جاهزة لاستقبال النشرات والكتب الرسمية
                    </h3>
                    <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                      تم تفريغ كافة الكتب الافتراضية بنجاح لتكون المنصة صفحة بيضاء نقية جاهزة لإصدارات المؤسس د. إسلام محمد وهيئة التحرير والتحقيقات الاستقصائية الموثقة.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {isOwner ? (
                      <>
                        <button
                          onClick={() => {
                            setCurrentView('writer');
                            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-6 py-3 text-xs sm:text-sm font-bold text-[#070d1e] shadow-lg hover:scale-105 transition-all cursor-pointer"
                        >
                          <PlusCircle className="h-4 w-4" />
                          <span>+ فتح استوديو التأليف والنشر</span>
                        </button>

                        <button
                          onClick={handleCreateSampleNovel}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0e1935] border border-[#c59b27]/50 px-5 py-3 text-xs sm:text-sm font-bold text-[#f0cb69] hover:bg-[#15254d] transition-all cursor-pointer"
                          title="إضافة رواية استقصائية تجريبية بفصلين للمعاينة والتجربة الفورية"
                        >
                          <Sparkles className="h-4 w-4 text-[#d4af37]" />
                          <span>⚡ إضافة رواية تجريبية للمعاينة</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setAuthModalMode('signup');
                          setIsAuthModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0e1935] border border-[#c59b27]/50 px-6 py-3 text-xs sm:text-sm font-bold text-[#f0cb69] hover:bg-[#15254d] transition-all cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>اشترك لتصلك أولى الإصدارات فور نشرها</span>
                      </button>
                    )}

                    <button
                      onClick={() => setCurrentView('landing')}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-3 text-xs sm:text-sm font-bold text-white transition-all cursor-pointer"
                    >
                      <span>التعريف برؤية المنصة ومؤسسيها</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {displayedBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      categories={categories}
                      isOwner={isOwner}
                      isBookmarked={Boolean(currentUser?.bookmarks?.includes(book.id))}
                      onRead={() => handleOpenBookOverview(book.id)}
                      onQuickResume={(chapterId) => handleQuickResumeChapter(book.id, chapterId)}
                      onEdit={isOwner ? () => handleOpenWriter(book.id) : undefined}
                      onToggleBookmark={() => handleToggleBookmark(book.id)}
                    />
                  ))}
                </div>
              )}
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
                  {books.length > 0 && books.some((b) => b.id === 'investigation-01') ? (
                    <button
                      onClick={() => handleOpenBookOverview('investigation-01')}
                      className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-5 py-3 text-xs font-bold text-[#070d1e] shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                      استعراض فصول السلسلة
                    </button>
                  ) : isOwner ? (
                    <button
                      onClick={() => setIsNewBookOpen(true)}
                      className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-5 py-3 text-xs font-bold text-[#070d1e] shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      + بدء كتابة السلسلة في الاستوديو
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentView('landing')}
                      className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-5 py-3 text-xs font-bold text-[#070d1e] shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      التعرف على رؤية السلسلة
                    </button>
                  )}

                  {isOwner && books.length > 0 && (
                    <button
                      onClick={() => handleOpenWriter()}
                      className="rounded-xl bg-[#0a1226] border border-[#c59b27]/40 px-4 py-3 text-xs font-bold text-[#f0cb69] hover:bg-[#122045] transition-colors"
                    >
                      استوديو التأليف
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
              categories={categories}
              onSelectBook={(bookId) => setSelectedBookId(bookId)}
              onUpdateBook={handleUpdateBook}
              onCreateBook={handleCreateBook}
              onDeleteBook={handleDeleteBook}
              onPreviewBook={(bookId, chId) => handleOpenReader(bookId, chId)}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onOpenAdminModal={() => setIsAdminManagementOpen(true)}
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
          currentBook ? (
            <BookOverviewView
              book={currentBook}
              categories={categories}
              isOwner={isOwner}
              isBookmarked={Boolean(currentUser?.bookmarks?.includes(currentBook.id))}
              onBack={() => setCurrentView('home')}
              onSelectChapter={(chapterId) => handleOpenReader(currentBook.id, chapterId)}
              onOpenWriter={isOwner ? (bookId) => handleOpenWriter(bookId) : undefined}
              onToggleBookmark={() => handleToggleBookmark(currentBook.id)}
              onShowToast={showToast}
            />
          ) : (
            <div className="p-12 text-center text-white max-w-md mx-auto my-12" dir="rtl">
              <p className="text-lg font-bold text-[#f0cb69]">الكتاب المطلوب غير متوفر حالياً في المكتبة.</p>
              <button
                onClick={() => setCurrentView('home')}
                className="mt-4 rounded-xl bg-[#c59b27] px-5 py-2.5 text-xs font-bold text-[#070d1e]"
              >
                العودة إلى المكتبة
              </button>
            </div>
          )
        )}

        {/* VIEW 3: BOOK READER VIEW */}
        {currentView === 'reader' && (
          currentBook ? (
            <BookReaderView
              book={currentBook}
              initialChapterId={selectedChapterId}
              isOwner={isOwner}
              isBookmarked={Boolean(currentUser?.bookmarks?.includes(currentBook.id))}
              onBack={() => setCurrentView('home')}
              onOpenOverview={() => handleOpenBookOverview(currentBook.id)}
              onOpenWriter={isOwner ? (bookId) => handleOpenWriter(bookId) : undefined}
              onChapterViewed={handleChapterViewed}
              onToggleBookmark={() => handleToggleBookmark(currentBook.id)}
            />
          ) : (
            <div className="p-12 text-center text-white max-w-md mx-auto my-12" dir="rtl">
              <p className="text-lg font-bold text-[#f0cb69]">الكتاب أو الفصل المطلوب غير متوفر حالياً للقراءة.</p>
              <button
                onClick={() => setCurrentView('home')}
                className="mt-4 rounded-xl bg-[#c59b27] px-5 py-2.5 text-xs font-bold text-[#070d1e]"
              >
                العودة إلى المكتبة
              </button>
            </div>
          )
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
        onLogout={handleLogout}
        onOpenBook={(bookId) => handleOpenBookOverview(bookId)}
        onUserRefreshed={(refreshed) => setCurrentUser(refreshed)}
        onShowToast={showToast}
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


      {/* Admin & Moderation Management Modal (Admins / Founder) */}
      <AdminManagementModal
        isOpen={isAdminManagementOpen}
        onClose={() => setIsAdminManagementOpen(false)}
        currentUser={currentUser}
        onShowToast={showToast}
      />

      {/* Official Banned Account Decree Modal */}
      <BannedNoticeModal
        isOpen={activeBan !== null}
        banDetails={activeBan}
        onLogout={handleBannedLogout}
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
