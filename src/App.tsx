/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { BookSpineShelf } from './components/BookSpineShelf';
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
import { HukmEmailModal } from './components/HukmEmailModal';
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
  updateUserBookmarksInFirestore,
  fetchUserReadingProgress,
  uploadGuestReadingProgressToFirestore,
} from './firebase/firestoreService';
import {
  INITIAL_BOOKS,
  INITIAL_CATEGORIES,
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
  getStoredBookmarks,
  saveStoredBookmarks,
  mergeGuestBookmarksWithUser,
  clearGuestBookmarks,
  hasGuestBookmarks,
  toggleUserBookmark,
  toggleGuestBookmark,
  getStoredSubscribers,
  addEmailLog,
} from './utils/authStorage';
import {
  getAllReadingProgress,
  saveAllReadingProgress,
  mergeGuestReadingProgressWithUser,
  clearGuestReadingProgress,
  hasGuestReadingProgress,
} from './utils/readingTracker';
import { subscribeToAuthState, logoutUser } from './firebase/authService';
import { isOwner as checkIsOwner, isAdmin as checkIsAdmin } from './services/permissionService';
import { generateNewReleaseEmailHtml } from './utils/emailTemplateGenerator';

export default function App() {
  // Default entry view is landing: Platform Introduction & Sign-in Portal
  const [currentView, setCurrentView] = useState<string>('landing');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [libraryDisplayMode, setLibraryDisplayMode] = useState<'grid' | 'shelf'>('grid');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // Real User Auth & Role State (null when unauthenticated visitor / guest)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [guestBookmarks, setGuestBookmarks] = useState<string[]>(() => getStoredBookmarks());
  const [isReaderPreviewMode, setIsReaderPreviewMode] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Authoritative permissions derived strictly from Firebase Custom Claims & verified state
  const isUserOwner = checkIsOwner(currentUser);
  const isActualAdminOrOwner = checkIsAdmin(currentUser);
  const isOwner = isActualAdminOrOwner && !isReaderPreviewMode;

  // Session tracking to completely eliminate async race conditions during account switching
  const authSessionIdRef = useRef<number>(0);

  // Real Firebase Auth Lifecycle listener with Cloud Reader Synchronization & Safe Migration
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(
      async (profile) => {
        // Invalidate prior asynchronous callbacks by incrementing the active session token
        const currentSessionId = ++authSessionIdRef.current;

        if (profile) {
          // ---------------------------------------------------------------
          // STEP 1: BOOKMARKS MIGRATION & LOCAL CACHE MERGE
          // ---------------------------------------------------------------
          const localGuestBookmarks = getStoredBookmarks();
          const cloudBookmarks = profile.bookmarks || [];
          const mergedBookmarks = mergeGuestBookmarksWithUser(localGuestBookmarks, cloudBookmarks);

          // Update local partitioned cache for user immediately so UI feels responsive
          saveStoredBookmarks(mergedBookmarks, profile.id);

          // If there are guest bookmarks that need cloud persistence, upload them
          if (localGuestBookmarks.length > 0 && mergedBookmarks.length > cloudBookmarks.length) {
            try {
              const syncSuccess = await updateUserBookmarksInFirestore(profile.id, mergedBookmarks);
              // CRITICAL: Only clear guest bookmarks if write succeeded AND this session is still active
              if (syncSuccess && authSessionIdRef.current === currentSessionId) {
                clearGuestBookmarks();
                setGuestBookmarks([]);
              }
            } catch (err) {
              console.warn('Could not sync guest bookmarks to Firestore, retaining locally:', err);
            }
          }

          // Abort if session changed while awaiting bookmark sync
          if (authSessionIdRef.current !== currentSessionId) return;

          // ---------------------------------------------------------------
          // STEP 2: READING PROGRESS LOCAL MERGE & SEPARATE CLOUD UPLOAD
          // ---------------------------------------------------------------
          const guestProgress = getAllReadingProgress(); // Reads guest or legacy
          const hasGuestProgress = hasGuestReadingProgress() || Object.keys(guestProgress).length > 0;
          const userProgress = getAllReadingProgress(profile.id);
          const mergedProgress = mergeGuestReadingProgressWithUser(guestProgress, userProgress);
          saveAllReadingProgress(mergedProgress, profile.id);

          if (hasGuestProgress) {
            try {
              const uploadSuccess = await uploadGuestReadingProgressToFirestore(profile.id, guestProgress);
              // CRITICAL: Only clear guest reading progress if cloud upload confirmed AND session is active
              if (uploadSuccess && authSessionIdRef.current === currentSessionId) {
                clearGuestReadingProgress();
              }
            } catch (err) {
              console.warn('Could not upload guest reading progress to Firestore, retaining locally:', err);
            }
          }

          // Abort if session changed
          if (authSessionIdRef.current !== currentSessionId) return;

          // ---------------------------------------------------------------
          // STEP 3: SYNC CLOUD READING PROGRESS RECORDS INTO LOCAL TRACKER
          // ---------------------------------------------------------------
          try {
            const remoteRecords = await fetchUserReadingProgress(profile.id);
            if (authSessionIdRef.current === currentSessionId && remoteRecords && remoteRecords.length > 0) {
              const currentTracker = getAllReadingProgress(profile.id);
              remoteRecords.forEach((rec) => {
                const bookProg = currentTracker[rec.bookId] || {
                  bookId: rec.bookId,
                  completedChapterIds: [],
                  lastReadAt: rec.lastReadAt,
                  chapterScrollPositions: {},
                };
                if (rec.completed && !bookProg.completedChapterIds.includes(rec.chapterId)) {
                  bookProg.completedChapterIds.push(rec.chapterId);
                }
                if (typeof rec.scrollPercent === 'number') {
                  bookProg.chapterScrollPositions = bookProg.chapterScrollPositions || {};
                  bookProg.chapterScrollPositions[rec.chapterId] = rec.scrollPercent;
                }
                const recDate = new Date(rec.lastReadAt || 0).getTime();
                const curDate = new Date(bookProg.lastReadAt || 0).getTime();
                if (recDate >= curDate) {
                  bookProg.lastChapterId = rec.chapterId;
                  bookProg.lastReadAt = rec.lastReadAt;
                }
                currentTracker[rec.bookId] = bookProg;
              });
              saveAllReadingProgress(currentTracker, profile.id);
            }
          } catch (err) {
            console.warn('Could not sync remote reading progress:', err);
          }

          // ---------------------------------------------------------------
          // STEP 4: COMMIT FINAL ACTIVE STATE IF SESSION REMAINS MATCHED
          // ---------------------------------------------------------------
          if (authSessionIdRef.current === currentSessionId) {
            profile.bookmarks = mergedBookmarks;
            setCurrentUser(profile);
            setAuthLoading(false);
          }
        } else {
          // Logged out / unauthenticated: verify session before resetting to guest
          if (authSessionIdRef.current === currentSessionId) {
            setCurrentUser(null);
            setGuestBookmarks(getStoredBookmarks());
            setAuthLoading(false);
          }
        }
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

  // Books data: safe migration from v1/v2 to v3 without destructive deletion
  const [books, setBooks] = useState<BookProject[]>(() => {
    try {
      const savedV3 = localStorage.getItem('hukm_books_v3');
      if (savedV3) return JSON.parse(savedV3);
      // Non-destructive fallback migration
      const savedV2 = localStorage.getItem('hukm_books_v2');
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        localStorage.setItem('hukm_books_v3', JSON.stringify(parsed));
        return parsed;
      }
      const savedV1 = localStorage.getItem('hukm_books_v1');
      if (savedV1) {
        const parsed = JSON.parse(savedV1);
        localStorage.setItem('hukm_books_v3', JSON.stringify(parsed));
        return parsed;
      }
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
  const [profileModalInitialTab, setProfileModalInitialTab] = useState<'profile' | 'bookmarks'>('profile');
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
    authSessionIdRef.current++;
    await logoutUser();
    setCurrentUser(null);
    setGuestBookmarks(getStoredBookmarks());
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

    // Pull or Seed Books (filtered to published for readers, unfiltered for admins)
    fetchBooksFromFirestore(checkIsAdmin(currentUser)).then((remoteBooks) => {
      if (remoteBooks !== null) {
        const realBooks = remoteBooks.filter(
          (b) => !['investigation-01', 'science-ai-01', 'history-01'].includes(b.id)
        );
        setBooks(realBooks);
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
  }, [currentUser]);

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

  const handleUpdateBook = async (updatedBook: BookProject): Promise<boolean> => {
    const success = await saveBookToFirestore(updatedBook);
    if (success) {
      setBooks((prev) =>
        prev.map((b) => (b.id === updatedBook.id ? updatedBook : b))
      );
      showToast(`تم حفظ وتحديث كتاب «${updatedBook.title}» في السحابة بنجاح!`);
      return true;
    } else {
      showToast(`فشل حفظ كتاب «${updatedBook.title}» في السحابة. تم الاحتفاظ بالتعديلات محلياً.`);
      return false;
    }
  };

  const handleCreateBook = async (newBook: BookProject): Promise<boolean> => {
    const success = await saveBookToFirestore(newBook);
    if (!success) {
      showToast(`فشل حفظ كتاب «${newBook.title}» في السحابة. يرجى التحقق من الاتصال والمحاولة لاحقاً.`);
      return false;
    }

    setBooks((prev) => [newBook, ...prev]);
    setSelectedBookId(newBook.id);

    const isPublished = ['published', 'completed', 'ongoing', 'ready'].includes(newBook.status);
    const readyChapters = (newBook.chapters || []).filter((ch) => ch.status === 'ready');

    // Only dispatch notification & email if book is actually published AND has at least one ready chapter!
    if (isPublished && readyChapters.length > 0) {
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
      if (activeSubs.length > 0) {
        addEmailLog({
          subject: `إصدار استقصائي جديد: ${newBook.title} | حُكم HUKM MEDIA`,
          recipientCount: activeSubs.length,
          timestamp: 'الآن',
          type: 'new_release',
          bookTitle: newBook.title,
          previewHtml: generateNewReleaseEmailHtml(newBook, readyChapters[0]),
          delivered: false, // Delivery status recorded honestly without false success claims
        });
      }
    }

    if (isPublished && readyChapters.length > 0) {
      showToast(`تم نشر كتاب «${newBook.title}» ومزامنته سحابياً مع قاعدة البيانات! ☁️`);
    } else {
      showToast(`تم حفظ مسودة «${newBook.title}» في الاستوديو دون إتاحتها للقراء.`);
    }
    setCurrentView('writer');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    return true;
  };

  const handleDeleteBook = async (bookId: string): Promise<boolean> => {
    const success = await deleteBookFromFirestore(bookId);
    if (success) {
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
      if (selectedBookId === bookId) {
        setSelectedBookId('');
      }
      showToast('تم حذف العمل بنجاح.');
      return true;
    } else {
      showToast('فشل حذف العمل من السحابة. لم يتم الحذف.');
      return false;
    }
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

  // Helper to determine if a book is bookmarked (respects current user or guest)
  const checkIsBookmarked = (bookId: string) => {
    if (currentUser) {
      return (currentUser.bookmarks || []).includes(bookId);
    }
    return guestBookmarks.includes(bookId);
  };

  // Bookmark Toggle with Cloud Sync & Guest Support
  const handleToggleBookmark = (bookId: string) => {
    const bookTitle = books.find((b) => b.id === bookId)?.title || 'الكتاب';

    if (currentUser) {
      const updated = toggleUserBookmark(currentUser, bookId);
      setCurrentUser(updated);
      const isAdded = updated.bookmarks.includes(bookId);
      showToast(isAdded ? `تمت إضافة «${bookTitle}» إلى محفوظاتك ومزامنتها سحابياً! ⭐` : `تمت إزالة «${bookTitle}» من المفضلة.`);

      // Sync with Firestore
      updateUserBookmarksInFirestore(currentUser.id, updated.bookmarks).catch((err) => {
        console.warn('Could not sync bookmarks with Firestore:', err);
      });
    } else {
      // Guest reader bookmarking
      const updatedGuest = toggleGuestBookmark(bookId);
      setGuestBookmarks(updatedGuest);
      const isAdded = updatedGuest.includes(bookId);
      if (isAdded) {
        showToast(`تم حفظ «${bookTitle}» محلياً. سجّل دخولك لمزامنة مكتبتك سحابياً عبر كافة أجهزتك! ⭐`);
      } else {
        showToast(`تمت إزالة «${bookTitle}» من المفضلة.`);
      }
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
    authSessionIdRef.current++;
    await logoutUser();
    setCurrentUser(null);
    setIsReaderPreviewMode(false);
    setGuestBookmarks(getStoredBookmarks());
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
          onOpenProfileModal={(tab) => {
            setProfileModalInitialTab(tab || 'profile');
            setIsProfileModalOpen(true);
          }}
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

                  <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0a1226] p-1" role="group" aria-label="طريقة عرض الكتب">
                    <button
                      type="button"
                      aria-pressed={libraryDisplayMode === 'grid'}
                      onClick={() => setLibraryDisplayMode('grid')}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${libraryDisplayMode === 'grid' ? 'bg-[#c59b27] text-[#070d1e]' : 'text-[#94a3b8] hover:text-white'}`}
                    >
                      بطاقات
                    </button>
                    <button
                      type="button"
                      aria-pressed={libraryDisplayMode === 'shelf'}
                      onClick={() => setLibraryDisplayMode('shelf')}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${libraryDisplayMode === 'shelf' ? 'bg-[#c59b27] text-[#070d1e]' : 'text-[#94a3b8] hover:text-white'}`}
                    >
                      أرفف الكتب
                    </button>
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
                      لم تُنشر كتب بعد. ستظهر هنا الإصدارات التي يعتمدها فريق حُكم للنشر.
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
                      <span>التعريف برؤية المنصة</span>
                    </button>
                  </div>
                </div>
              ) : libraryDisplayMode === 'shelf' ? (
                <BookSpineShelf
                  books={displayedBooks}
                  categories={categories}
                  onRead={handleOpenBookOverview}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {displayedBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      categories={categories}
                      currentUserId={currentUser?.id}
                      isOwner={isOwner}
                      isBookmarked={checkIsBookmarked(book.id)}
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
              currentUser={currentUser}
              isOwner={isOwner}
              isBookmarked={checkIsBookmarked(currentBook.id)}
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
              isBookmarked={checkIsBookmarked(currentBook.id)}
              currentUser={currentUser}
              onBack={() => setCurrentView('home')}
              onOpenOverview={() => handleOpenBookOverview(currentBook.id)}
              onOpenWriter={isOwner ? (bookId) => handleOpenWriter(bookId) : undefined}
              onChapterViewed={handleChapterViewed}
              onToggleBookmark={() => handleToggleBookmark(currentBook.id)}
              onShowToast={showToast}
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
        initialTab={profileModalInitialTab}
        isReaderPreviewMode={isReaderPreviewMode}
        onToggleReaderPreview={handleToggleReaderPreview}
        onClose={() => setIsProfileModalOpen(false)}
        onLogout={handleLogout}
        onOpenBook={(bookId) => handleOpenBookOverview(bookId)}
        onOpenReader={(bookId, chapterId) => handleOpenReader(bookId, chapterId)}
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

      {/* Royal Email Identity & Cloud Subscribers Modal (Admins / Founder) */}
      <HukmEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        books={books}
        onShowToast={showToast}
      />

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
