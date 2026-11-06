/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  BookOpen,
  Sparkles,
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
import { BookReaderView } from './components/BookReaderView';
import { BookOverviewView } from './components/BookOverviewView';
import { HukmSearchModal } from './components/HukmSearchModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { SendAnnouncementModal } from './components/SendAnnouncementModal';
import { AdminManagementModal } from './components/AdminManagementModal';
import { HukmEmailModal } from './components/HukmEmailModal';
import { BannedNoticeModal } from './components/BannedNoticeModal';
import { LegacyLibraryPurgeModal } from './components/LegacyLibraryPurgeModal';
import { HukmFooter } from './components/HukmFooter';
import { getActiveBanDetails } from './utils/moderationTracker';
import { auth } from './firebase/config';
import {
  updateUserBookmarksInFirestore,
  fetchUserReadingProgress,
  uploadGuestReadingProgressToFirestore,
  subscribeToPublicNotifications,
  savePublicNotificationToFirestore,
} from './firebase/firestoreService';
import {
  HUKM_LOGO,
  HUKM_MOTTO,
  HUKM_DESCRIPTION,
} from './data/hukmData';
import { PUBLIC_LIBRARY_BOOKS, PUBLIC_LIBRARY_CATEGORIES, loadPublicLibraryBook } from './data/library';
import { CategoryItem, BookProject } from './types/hukm';
import { UserProfile, AppNotification, BannedAccount } from './types/auth';
import {
  incrementBookViews,
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
} from './utils/authStorage';
import {
  getAllReadingProgress,
  saveAllReadingProgress,
  mergeGuestReadingProgressWithUser,
  clearGuestReadingProgress,
  hasGuestReadingProgress,
} from './utils/readingTracker';
import { subscribeToAuthState, logoutUser } from './firebase/authService';
import { isEffectiveOwner, isAdmin as checkIsAdmin } from './services/permissionService';

export default function App() {
  // Default entry view is landing: Platform Introduction & Sign-in Portal
  const [currentView, setCurrentView] = useState<string>('landing');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [libraryDisplayMode, setLibraryDisplayMode] = useState<'grid' | 'shelf'>('grid');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // Real User Auth & Role State (null when unauthenticated visitor / guest)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeBan, setActiveBan] = useState<BannedAccount | null>(null);
  const [guestBookmarks, setGuestBookmarks] = useState<string[]>(() => getStoredBookmarks());
  const [isReaderPreviewMode, setIsReaderPreviewMode] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Authoritative permissions derived strictly from Firebase Custom Claims & verified state
  const isActualAdminOrOwner = checkIsAdmin(currentUser);
  // Owner-only UI gates must never inherit the broader Admin-or-Owner check.
  const isOwner = isEffectiveOwner(currentUser, isReaderPreviewMode);

  // Session tracking to completely eliminate async race conditions during account switching
  const authSessionIdRef = useRef<number>(0);
  const bookLoadRequestIdRef = useRef<number>(0);

  // Real Firebase Auth Lifecycle listener with Cloud Reader Synchronization & Safe Migration
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(
      async (profile) => {
        // Invalidate prior asynchronous callbacks by incrementing the active session token
        const currentSessionId = ++authSessionIdRef.current;

        if (profile) {
          setActiveBan(null);

          // Check the authenticated account's cloud moderation status before
          // migrating bookmarks or writing any reader progress to Firestore.
          let accountBan = profile.email ? getActiveBanDetails(profile.email) : null;
          try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Missing Firebase ID token for account-status check.');
            const response = await fetch('/api/auth/account-status', {
              headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) {
              throw new Error('Account moderation status could not be verified.');
            }
            accountBan = payload.banned && payload.ban ? payload.ban as BannedAccount : null;
          } catch (error) {
            // Keep the local cache as a fallback if the cloud check is temporarily unavailable.
            console.warn('Could not verify cloud moderation status:', error);
          }

          if (accountBan) {
            if (authSessionIdRef.current === currentSessionId) {
              setActiveBan(accountBan);
              setCurrentUser(profile);
              setAuthLoading(false);
            }
            return;
          }
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
          const guestProgress = getAllReadingProgress(); // Reads only the guest-owned partition
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
            setActiveBan(accountBan);
            setCurrentUser(profile);
            setAuthLoading(false);
          }
        } else {
          // Logged out / unauthenticated: verify session before resetting to guest
          if (authSessionIdRef.current === currentSessionId) {
            setCurrentUser(null);
            setActiveBan(null);
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

  // Shared announcement content comes from Firestore; read state is isolated per account on this device.
  const activeNotificationOwnerId = currentUser?.id ?? null;
  const [notificationState, setNotificationState] = useState<{
    ownerId: string | null;
    items: AppNotification[];
  }>(() => ({ ownerId: null, items: getStoredNotifications() }));
  const notifications = notificationState.ownerId === activeNotificationOwnerId
    ? notificationState.items
    : [];

  useEffect(() => {
    setNotificationState({
      ownerId: activeNotificationOwnerId,
      items: getStoredNotifications(activeNotificationOwnerId || undefined),
    });
  }, [activeNotificationOwnerId]);

  useEffect(() => {
    if (notificationState.ownerId !== activeNotificationOwnerId) return;
    let active = true;
    const unsubscribe = subscribeToPublicNotifications((remote) => {
      if (!active) return;
      setNotificationState((current) => {
        if (!active || current.ownerId !== activeNotificationOwnerId) return current;
        const readState = new Map(current.items.map((item) => [item.id, item.read]));
        return {
          ownerId: activeNotificationOwnerId,
          items: remote.map((item) => ({ ...item, read: readState.get(item.id) ?? false })),
        };
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [activeNotificationOwnerId, notificationState.ownerId]);

  useEffect(() => {
    if (notificationState.ownerId !== activeNotificationOwnerId) return;
    saveStoredNotifications(notificationState.items, activeNotificationOwnerId || undefined);
  }, [notificationState, activeNotificationOwnerId]);

  // The public-domain catalogue and its categories are bundled with the application.
  // They are immutable at runtime and never loaded from Firestore or localStorage.
  const categories: CategoryItem[] = PUBLIC_LIBRARY_CATEGORIES.filter((category) =>
    PUBLIC_LIBRARY_BOOKS.some((book) => book.category === category.id)
  );
  const [books, setBooks] = useState(PUBLIC_LIBRARY_BOOKS);
  const [loadedBook, setLoadedBook] = useState<BookProject | null>(null);
  const [isLoadingBook, setIsLoadingBook] = useState(false);

  // Remove only obsolete catalogue caches. User reading progress, bookmarks and notes are preserved.
  useEffect(() => {
    for (const key of ['hukm_books_v1', 'hukm_books_v2', 'hukm_books_v3', 'hukm_categories_v1']) {
      try { localStorage.removeItem(key); } catch {}
    }
  }, []);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalInitialTab, setProfileModalInitialTab] = useState<'profile' | 'bookmarks'>('profile');
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isAdminManagementOpen, setIsAdminManagementOpen] = useState(false);
  const [isLegacyPurgeOpen, setIsLegacyPurgeOpen] = useState(false);
  const [legacyLibraryPurgeCompleted, setLegacyLibraryPurgeCompleted] = useState(false);

  // Read the one-time legacy purge marker only for the authenticated owner UI.
  useEffect(() => {
    if (!isOwner || !currentUser) {
      setLegacyLibraryPurgeCompleted(false);
      return;
    }
    let cancelled = false;
    const readPurgeStatus = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const response = await fetch('/api/auth/legacy-library-purge-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!cancelled && response.ok && payload.success) {
          setLegacyLibraryPurgeCompleted(payload.status === 'completed');
        }
      } catch (error) {
        console.warn('Could not read legacy library purge status:', error);
      }
    };
    void readPurgeStatus();
    return () => { cancelled = true; };
  }, [isOwner, currentUser?.id]);

  // In-app interactive Toast Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  const invalidatePendingBookLoad = () => {
    bookLoadRequestIdRef.current += 1;
    setIsLoadingBook(false);
  };

  const loadBookById = async (bookId: string): Promise<BookProject | null> => {
    const requestId = ++bookLoadRequestIdRef.current;
    if (loadedBook?.id === bookId) return loadedBook;
    setIsLoadingBook(true);
    try {
      const fullBook = await loadPublicLibraryBook(bookId);
      if (bookLoadRequestIdRef.current !== requestId) return null;
      setLoadedBook(fullBook);
      return fullBook;
    } catch (error) {
      if (bookLoadRequestIdRef.current === requestId) {
        console.error('Static book load failed:', error);
        showToast('تعذر تحميل ملف هذا الكتاب من حزمة الموقع.');
      }
      return null;
    } finally {
      if (bookLoadRequestIdRef.current === requestId) setIsLoadingBook(false);
    }
  };

  const handleQuickResumeChapter = async (bookId: string, chapterId: string) => {
    const targetBook = books.find((book) => book.id === bookId);
    if (!targetBook) {
      showToast('هذا الكتاب غير موجود في فهرس المكتبة.');
      return;
    }
    const fullBook = await loadBookById(bookId);
    const chapterIsPublic = fullBook?.chapters.some((chapter) => chapter.id === chapterId && chapter.status === 'ready');
    if (!fullBook || !chapterIsPublic) {
      showToast('هذا الفصل غير موجود في النسخة المضمّنة من الكتاب.');
      return;
    }
    setSelectedBookId(bookId);
    setSelectedChapterId(chapterId);
    setCurrentView('reader');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleBannedLogout = async () => {
    authSessionIdRef.current++;
    await logoutUser();
    setCurrentUser(null);
    setActiveBan(null);
    setGuestBookmarks(getStoredBookmarks());
    showToast('تم تسجيل الخروج.');
  };

  // Notification read-state persistence is scoped to the active account above.



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
      void loadBookById(bookParam).then((book) => {
        if (!book) return;
        setSelectedBookId(bookParam);
        setCurrentView('reader');
      });
    }
  }, []);

  // Catalogue entries contain metadata only; full text is loaded lazily from the bundled JSON file.
  const accessibleBooks = books;
  const currentBook = loadedBook?.id === selectedBookId ? loadedBook : null;

  // Actions
  const handleOpenBookOverview = async (bookId: string) => {
    const targetBook = books.find((book) => book.id === bookId);
    if (!targetBook) {
      showToast('هذا الكتاب غير موجود في فهرس المكتبة.');
      return;
    }
    const fullBook = await loadBookById(bookId);
    if (!fullBook) return;
    setSelectedBookId(bookId);
    setCurrentView('overview');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleOpenReader = async (bookId: string, chapterId?: string) => {
    const targetBook = books.find((book) => book.id === bookId);
    if (!targetBook) {
      showToast('هذا الكتاب غير موجود في فهرس المكتبة.');
      return;
    }
    const fullBook = await loadBookById(bookId);
    if (!fullBook) return;
    const chapterIsPublic = !chapterId || fullBook.chapters.some((chapter) => chapter.id === chapterId && chapter.status === 'ready');
    if (!chapterIsPublic) {
      showToast('هذا الفصل غير موجود في النسخة المضمّنة من الكتاب.');
      return;
    }
    setSelectedBookId(bookId);
    if (chapterId) setSelectedChapterId(chapterId);
    setCurrentView('reader');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  // View counters remain session-only; full text and catalogue records stay immutable source files.
  const handleChapterViewed = (chapterId: string) => {
    if (!currentBook) return;
    const updated = incrementBookViews(currentBook, chapterId);
    setLoadedBook(updated);
    setBooks((prev) => prev.map((book) =>
      book.id === currentBook.id ? { ...book, viewsCount: updated.viewsCount } : book
    ));
  };

  // Helper to determine if a book is bookmarked (respects current user or guest)
  const checkIsBookmarked = (bookId: string) => {
    if (currentUser) {
      return (currentUser.bookmarks || []).includes(bookId);
    }
    return guestBookmarks.includes(bookId);
  };

  // Bookmark Toggle with Cloud Sync & Guest Support
  const handleToggleBookmark = async (bookId: string) => {
    const bookTitle = books.find((b) => b.id === bookId)?.title || 'الكتاب';

    if (currentUser) {
      const updated = toggleUserBookmark(currentUser, bookId);
      setCurrentUser(updated);
      const isAdded = updated.bookmarks.includes(bookId);
      try {
        const synced = await updateUserBookmarksInFirestore(currentUser.id, updated.bookmarks);
        if (synced) {
          showToast(isAdded
            ? 'تمت إضافة «' + bookTitle + '» إلى محفوظاتك ومزامنتها مع حسابك. ⭐'
            : 'تمت إزالة «' + bookTitle + '» من المفضلة ومزامنة التعديل.');
        } else {
          showToast(isAdded
            ? 'تم حفظ «' + bookTitle + '» على هذا الجهاز، لكن تعذرت المزامنة السحابية.'
            : 'تمت إزالة «' + bookTitle + '» محلياً، لكن تعذرت مزامنة التعديل.');
        }
      } catch (error) {
        console.warn('Could not sync bookmarks with Firestore:', error);
        showToast('حُفظ التغيير على هذا الجهاز، لكن تعذرت المزامنة السحابية.');
      }
    } else {
      const updatedGuest = toggleGuestBookmark(bookId);
      setGuestBookmarks(updatedGuest);
      const isAdded = updatedGuest.includes(bookId);
      showToast(isAdded
        ? 'تم حفظ «' + bookTitle + '» محلياً. سجّل الدخول لمزامنة مكتبتك عبر أجهزتك. ⭐'
        : 'تمت إزالة «' + bookTitle + '» من المفضلة.');
    }
  };

  // Notifications Actions — shared content is persisted; read state remains account-local.
  const handleSelectNotification = (notif: AppNotification) => {
    setNotificationState((current) => current.ownerId !== activeNotificationOwnerId
      ? current
      : {
          ...current,
          items: current.items.map((item) => item.id === notif.id ? { ...item, read: true } : item),
        });
    if (notif.bookId) {
      handleOpenReader(notif.bookId, notif.chapterId);
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotificationState((current) => current.ownerId !== activeNotificationOwnerId
      ? current
      : { ...current, items: current.items.map((item) => ({ ...item, read: true })) });
    showToast('تم تحديد جميع الإشعارات كمقروءة على هذا الحساب.');
  };

  const handleSendAnnouncement = async (
    input: Pick<AppNotification, 'title' | 'message' | 'type' | 'bookId'>
  ): Promise<boolean> => {
    const saved = await savePublicNotificationToFirestore(input);
    if (!saved) {
      showToast('لم يتم إرسال التنبيه؛ تعذر تأكيد حفظه في قاعدة البيانات.');
      return false;
    }
    setNotificationState((current) => current.ownerId !== activeNotificationOwnerId
      ? current
      : { ...current, items: [saved, ...current.items.filter((item) => item.id !== saved.id)] });
    showToast('تم حفظ التنبيه «' + saved.title + '» وأصبح متاحاً للقراء. 📢');
    return true;
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
      return next;
    });
  };

  const handleLogout = async () => {
    authSessionIdRef.current++;
    await logoutUser();
    setCurrentUser(null);
    setIsReaderPreviewMode(false);
    setGuestBookmarks(getStoredBookmarks());
    showToast('تم تسجيل الخروج بنجاح.');
  };


  // Public metrics and search must never include locally cached private drafts.
  const totalChapters = accessibleBooks.reduce((acc, book) => acc + (book.chapterCount ?? book.chapters.length), 0);
  const totalWords = accessibleBooks.reduce(
    (acc, book) => acc + (book.wordCount ?? 0),
    0
  );

  const displayedBooks =
    selectedCategoryId === 'all'
      ? accessibleBooks
      : accessibleBooks.filter((book) => book.category === selectedCategoryId);

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
      {isLoadingBook && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#050a16]/85 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#c59b27]/30 bg-[#0a1329] px-8 py-7 text-center shadow-2xl">
            <BookOpen className="h-9 w-9 animate-pulse text-[#d4af37]" />
            <p className="text-sm font-bold text-white">جاري تحميل الكتاب من ملفات الموقع...</p>
            <p className="text-[11px] text-[#94a3b8]">لا يتم جلب محتوى الكتاب من Firebase</p>
          </div>
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
            invalidatePendingBookLoad();
            if (catId) {
              setSelectedCategoryId(catId);
              setCurrentView('home');
            } else {
              setCurrentView(view);
            }
            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
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
              invalidatePendingBookLoad();
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
            }}
            onShowToast={showToast}
            onLogout={handleLogout}
          />
        )}

        {/* VIEW 1: HOME & PROJECT DIRECTORY */}
        {currentView === 'home' && (
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-10">
            {/* 1. Hero Showcase */}
            <HukmHero
              onExploreBooks={() => {
                const el = document.getElementById('books-catalog');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              totalBooksCount={accessibleBooks.length}
              totalChaptersCount={totalChapters}
              totalWordsCount={totalWords}
            />

            {/* 2. Static library catalogue */}
            <div id="books-catalog" className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white font-cairo">
                      مكتبة حُكم للتراث العربي
                    </h2>
                    <span className="rounded-md bg-[#c59b27]/20 px-2 py-0.5 text-xs font-bold text-[#f0cb69] border border-[#c59b27]/30">
                      {displayedBooks.length} مؤلفات
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    نصوص عربية تراثية كاملة مضمّنة في ملفات الموقع، مع بيانات المصدر والترخيص لكل كتاب
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

                  {isOwner && !legacyLibraryPurgeCompleted && (
                    <button
                      type="button"
                      onClick={() => setIsLegacyPurgeOpen(true)}
                      className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] font-bold text-red-200 hover:bg-red-500/10"
                      title="تنظيف سجلات الكتب والتصنيفات القديمة من Firestore"
                    >
                      تنظيف بيانات المكتبة القديمة
                    </button>
                  )}

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

                </div>
              </div>

              {/* Books Grid or Elegant Empty Slate */}
              {displayedBooks.length === 0 ? (
                <div className="rounded-3xl border border-[#c59b27]/30 bg-gradient-to-b from-[#0a142c] to-[#050a16] p-8 sm:p-12 text-center space-y-4 shadow-2xl" dir="rtl">
                  <BookOpen className="mx-auto h-12 w-12 text-[#d4af37]" />
                  <h3 className="text-xl font-black text-white">لم تُحمّل ملفات الكتب بعد</h3>
                  <p className="mx-auto max-w-xl text-sm leading-7 text-[#94a3b8]">
                    المكتبة تعتمد على ملفات نصية ثابتة داخل المشروع. عند اكتمال مزامنة النصوص الموثقة ستظهر الكتب هنا، دون قراءة محتوى الكتب من Firebase.
                  </p>
                  <a href="https://huggingface.co/datasets/Bayanat-Labs/arabic-wikisource-pd" target="_blank" rel="noreferrer" className="text-xs font-bold text-[#f0cb69] underline underline-offset-4">
                    مصدر مجموعة النصوص وتفاصيل الترخيص
                  </a>
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
                      onToggleBookmark={() => handleToggleBookmark(book.id)}
                    />
                  ))}
                </div>
              )}
            </div>

          </main>
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
              onBack={() => { invalidatePendingBookLoad(); setCurrentView('home'); }}
              onSelectChapter={(chapterId) => handleOpenReader(currentBook.id, chapterId)}
              onToggleBookmark={() => handleToggleBookmark(currentBook.id)}
              onShowToast={showToast}
            />
          ) : (
            <div className="p-12 text-center text-white max-w-md mx-auto my-12" dir="rtl">
              <p className="text-lg font-bold text-[#f0cb69]">الكتاب المطلوب غير متوفر حالياً في المكتبة.</p>
              <button
                onClick={() => { invalidatePendingBookLoad(); setCurrentView('home'); }}
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

      {isOwner && (
        <LegacyLibraryPurgeModal
          isOpen={isLegacyPurgeOpen}
          onClose={() => setIsLegacyPurgeOpen(false)}
          onPurged={(result) => {
            setLegacyLibraryPurgeCompleted(true);
            setIsLegacyPurgeOpen(false);
            showToast(`تم حذف ${result.deleted.books} كتابًا و${result.deleted.bookDraftChapters} مسودة و${result.deleted.categories} تصنيفًا قديمًا من Firebase.`);
          }}
        />
      )}

      {/* Instant Search Modal */}
      <HukmSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        books={accessibleBooks}
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
            invalidatePendingBookLoad();
            if (catId) {
              setSelectedCategoryId(catId);
              setCurrentView('home');
            } else {
              setCurrentView(view === 'writer' ? 'home' : view);
            }
            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          }}
        />
      )}
    </div>
  );
}
