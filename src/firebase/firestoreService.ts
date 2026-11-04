import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from './config';
import { BookProject, CategoryItem, ReadingProgress, ReadingProgressRecord } from '../types/hukm';
import { AdminAccount, BannedAccount, HukmSubscriber } from '../types/auth';

// ----------------------------------------------------
// AUTHENTICATION WITH FIREBASE (Real Google Sign-In)
// ----------------------------------------------------

export async function loginWithFirebaseGoogle(): Promise<{ email: string; name: string; uid: string } | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      email: user.email || '',
      name: user.displayName || 'مستخدم Google',
      uid: user.uid,
    };
  } catch (err) {
    console.warn('Firebase Google Sign-in popup fallback', err);
    return null;
  }
}

// ----------------------------------------------------
// BOOKS COLLECTION
// ----------------------------------------------------

export async function fetchBooksFromFirestore(isAdminUser: boolean = false): Promise<BookProject[] | null> {
  const path = 'books';
  try {
    let q;
    if (isAdminUser) {
      // Admins and Owner can query all books including drafts
      q = collection(db, path);
    } else {
      // Public and reader queries strictly filter published statuses to comply with firestore.rules
      q = query(
        collection(db, path),
        where('status', 'in', ['published', 'completed', 'ongoing', 'ready'])
      );
    }
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    const books: BookProject[] = [];
    snapshot.forEach((d) => {
      books.push(d.data() as BookProject);
    });
    return books;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveBookToFirestore(book: BookProject): Promise<void> {
  const path = `books/${book.id}`;
  try {
    await setDoc(doc(db, 'books', book.id), book, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBookFromFirestore(bookId: string): Promise<void> {
  const path = `books/${bookId}`;
  try {
    await deleteDoc(doc(db, 'books', bookId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// CATEGORIES COLLECTION
// ----------------------------------------------------

export async function fetchCategoriesFromFirestore(): Promise<CategoryItem[] | null> {
  const path = 'categories';
  try {
    const snapshot = await getDocs(collection(db, path));
    if (snapshot.empty) return null;
    const items: CategoryItem[] = [];
    snapshot.forEach((d) => {
      items.push(d.data() as CategoryItem);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveCategoryToFirestore(category: CategoryItem): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    await setDoc(doc(db, 'categories', category.id), category, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// ADMINS REGISTRY
// ----------------------------------------------------

export async function fetchAdminsFromFirestore(): Promise<AdminAccount[] | null> {
  const path = 'admins';
  try {
    const snapshot = await getDocs(collection(db, path));
    if (snapshot.empty) return null;
    const admins: AdminAccount[] = [];
    snapshot.forEach((d) => {
      admins.push(d.data() as AdminAccount);
    });
    return admins;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveAdminToFirestore(admin: AdminAccount): Promise<void> {
  const path = `admins/${admin.id}`;
  try {
    await setDoc(doc(db, 'admins', admin.id), admin, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAdminFromFirestore(adminId: string): Promise<void> {
  const path = `admins/${adminId}`;
  try {
    await deleteDoc(doc(db, 'admins', adminId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// BANS & MODERATION
// ----------------------------------------------------

export async function fetchBansFromFirestore(): Promise<BannedAccount[] | null> {
  const path = 'bans';
  try {
    const snapshot = await getDocs(collection(db, path));
    if (snapshot.empty) return null;
    const bans: BannedAccount[] = [];
    snapshot.forEach((d) => {
      bans.push(d.data() as BannedAccount);
    });
    return bans;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveBanToFirestore(ban: BannedAccount): Promise<void> {
  const path = `bans/${ban.id}`;
  try {
    await setDoc(doc(db, 'bans', ban.id), ban, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// SUBSCRIBERS
// ----------------------------------------------------

export async function saveSubscriberToFirestore(subscriber: HukmSubscriber): Promise<void> {
  const path = `subscribers/${subscriber.id}`;
  try {
    await setDoc(doc(db, 'subscribers', subscriber.id), subscriber, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchSubscribersFromFirestore(): Promise<HukmSubscriber[] | null> {
  const path = 'subscribers';
  try {
    const snapshot = await getDocs(collection(db, path));
    if (snapshot.empty) return [];
    const subscribers: HukmSubscriber[] = [];
    snapshot.forEach((d) => {
      subscribers.push(d.data() as HukmSubscriber);
    });
    return subscribers;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function toggleSubscriberInFirestore(
  subscriberId: string,
  active: boolean
): Promise<boolean> {
  const path = `subscribers/${subscriberId}`;
  try {
    const subRef = doc(db, 'subscribers', subscriberId);
    await updateDoc(subRef, {
      active,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}


// ----------------------------------------------------
// READER SYNCHRONIZATION: BOOKMARKS & READING PROGRESS
// ----------------------------------------------------

/**
 * Format a stable, rules-compliant document ID for reading progress.
 * Pattern: prog_<userId>_<bookId>_<chapterId> sanitized to [a-zA-Z0-9_-], max 128 chars.
 */
export function formatReadingProgressId(userId: string, bookId: string, chapterId: string): string {
  const raw = `prog_${userId}_${bookId}_${chapterId}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

/**
 * Update authenticated user's bookmarks array in Firestore (/users/{uid})
 */
export async function updateUserBookmarksInFirestore(
  userId: string,
  bookmarks: string[]
): Promise<boolean> {
  if (!userId) return false;
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      bookmarks,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    // If updateDoc fails because document doesn't exist yet, fallback to setDoc merge
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(
        userRef,
        {
          uid: userId,
          bookmarks,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    } catch (innerError) {
      handleFirestoreError(innerError, OperationType.WRITE, path);
      return false;
    }
  }
}

/**
 * Update authenticated user's readHistory array in Firestore (/users/{uid})
 */
export async function updateUserReadHistoryInFirestore(
  userId: string,
  readHistory: string[]
): Promise<boolean> {
  if (!userId) return false;
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      readHistory,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Save or update a chapter's reading progress in /readingProgress/{progressId}
 * Complies strictly with firestore.rules field schema.
 */
export async function saveReadingProgressToFirestore(
  progress: ReadingProgressRecord
): Promise<boolean> {
  if (!progress.userId || !progress.bookId || !progress.chapterId) {
    return false;
  }

  const progressId = progress.id || formatReadingProgressId(progress.userId, progress.bookId, progress.chapterId);
  const path = `readingProgress/${progressId}`;

  // Filter payload strictly to fields allowed in firestore.rules
  const payload: Record<string, any> = {
    id: progressId,
    userId: progress.userId,
    bookId: progress.bookId,
    chapterId: progress.chapterId,
    lastReadAt: progress.lastReadAt || new Date().toISOString(),
    updatedAt: serverTimestamp(),
  };

  if (typeof progress.chapterIndex === 'number' && progress.chapterIndex >= 0) {
    payload.chapterIndex = Math.floor(progress.chapterIndex);
  }
  if (typeof progress.scrollPercent === 'number') {
    payload.scrollPercent = Math.min(100, Math.max(0, Math.round(progress.scrollPercent * 10) / 10));
  }
  if (typeof progress.completed === 'boolean') {
    payload.completed = progress.completed;
  }

  try {
    const progressRef = doc(db, 'readingProgress', progressId);
    await setDoc(progressRef, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Fetch all reading progress records for a user (optionally filtered by bookId)
 */
export async function fetchUserReadingProgress(
  userId: string,
  bookId?: string
): Promise<ReadingProgressRecord[]> {
  if (!userId) return [];
  const path = 'readingProgress';

  try {
    let q = query(collection(db, path), where('userId', '==', userId));
    if (bookId) {
      q = query(collection(db, path), where('userId', '==', userId), where('bookId', '==', bookId));
    }

    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    const records: ReadingProgressRecord[] = [];
    snapshot.forEach((d) => {
      records.push(d.data() as ReadingProgressRecord);
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

/**
 * Fetch single chapter reading progress for a user
 */
export async function fetchUserSingleProgress(
  userId: string,
  bookId: string,
  chapterId: string
): Promise<ReadingProgressRecord | null> {
  if (!userId || !bookId || !chapterId) return null;
  const progressId = formatReadingProgressId(userId, bookId, chapterId);
  const path = `readingProgress/${progressId}`;

  try {
    const docRef = doc(db, 'readingProgress', progressId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return snapshot.data() as ReadingProgressRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Upload all guest reading progress records to Firestore under the authenticated user's records.
 * Returns true if all writes succeeded, false if any write failed or userId is missing.
 */
export async function uploadGuestReadingProgressToFirestore(
  userId: string,
  guestProgress: Record<string, ReadingProgress>
): Promise<boolean> {
  if (!userId || !guestProgress || typeof guestProgress !== 'object') {
    return false;
  }

  const entries = Object.entries(guestProgress);
  if (entries.length === 0) {
    return true; // Nothing to upload
  }

  let allSucceeded = true;

  for (const [bookId, prog] of entries) {
    if (!bookId || !prog) continue;

    // Collect all unique chapter IDs that were opened, completed, or have scroll positions
    const chapterIds = new Set<string>();
    if (prog.lastChapterId) chapterIds.add(prog.lastChapterId);
    (prog.completedChapterIds || []).forEach((chId) => chId && chapterIds.add(chId));
    if (prog.chapterScrollPositions) {
      Object.keys(prog.chapterScrollPositions).forEach((chId) => chId && chapterIds.add(chId));
    }

    if (chapterIds.size === 0) continue;

    for (const chapterId of chapterIds) {
      const scrollVal = prog.chapterScrollPositions?.[chapterId];
      const isCompleted = prog.completedChapterIds?.includes(chapterId) || false;
      const scrollPercent = typeof scrollVal === 'number'
        ? scrollVal
        : (isCompleted ? 100 : 0);

      const record: ReadingProgressRecord = {
        id: formatReadingProgressId(userId, bookId, chapterId),
        userId,
        bookId,
        chapterId,
        scrollPercent,
        lastReadAt: prog.lastReadAt || new Date().toISOString(),
        completed: isCompleted,
      };

      const success = await saveReadingProgressToFirestore(record);
      if (!success) {
        allSucceeded = false;
      }
    }
  }

  return allSucceeded;
}

