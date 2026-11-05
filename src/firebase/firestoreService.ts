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
  writeBatch,
} from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from './config';
import { BookProject, BookChapter, BookDraftChapter, CategoryItem, ReadingProgress, ReadingProgressRecord } from '../types/hukm';
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
// BOOKS & DRAFT CHAPTERS ISOLATION
// ----------------------------------------------------

/**
 * Format a backwards-compatible document ID for isolated draft chapters.
 * Existing safe IDs keep their exact historical value. Unsafe or overlong inputs
 * are rejected instead of being normalized into a potentially colliding ID.
 */
export function formatDraftChapterId(bookId: string, chapterId: string): string {
  if (!bookId || !chapterId) {
    throw new Error('Draft bookId and chapterId must both be non-empty.');
  }
  const raw = `draft_${bookId}_${chapterId}`;
  if (!/^[a-zA-Z0-9_-]+$/.test(raw)) {
    throw new Error('Draft IDs may contain only letters, numbers, underscores, and hyphens. Refusing lossy ID normalization.');
  }
  if (raw.length > 128) {
    throw new Error('Draft ID exceeds Firestore’s 128-character application limit. Refusing lossy truncation.');
  }
  return raw;
}

/**
 * Keep every non-ready chapter private, including unknown or legacy runtime statuses.
 * The TypeScript status union is intentionally not trusted as runtime validation.
 */
export function partitionBookChapters(chapters: BookChapter[] = []): {
  readyChapters: BookChapter[];
  draftChapters: BookChapter[];
} {
  return {
    readyChapters: chapters.filter((chapter) => chapter.status === 'ready'),
    draftChapters: chapters.filter((chapter) => chapter.status !== 'ready'),
  };
}

/** Firestore documents are limited to 1 MiB. Keep a conservative JSON byte budget
 * to leave room for Firestore's internal encoding and field/index overhead.
 */
export const FIRESTORE_DOCUMENT_SAFE_LIMIT_BYTES = 800 * 1024;

export function assertFirestoreDocumentSize(payload: Record<string, unknown>, label: string): void {
  const serialized = JSON.stringify(payload);
  if (typeof serialized !== 'string') {
    throw new Error(`${label} could not be serialized safely for Firestore.`);
  }
  const byteLength = new TextEncoder().encode(serialized).length;
  if (byteLength > FIRESTORE_DOCUMENT_SAFE_LIMIT_BYTES) {
    throw new Error(
      `${label} is approximately ${byteLength} bytes; the safe Firestore document budget is ${FIRESTORE_DOCUMENT_SAFE_LIMIT_BYTES} bytes. Reduce or split the content before saving.`
    );
  }
}

/**
 * Fetch books from Firestore.
 * - If adminUser: queries all books, retrieves isolated drafts from /bookDraftChapters,
 *   merges them into their respective books, and sorts chapters by chapterNumber ascending.
 * - If reader / public: queries only published books and filters chapters strictly to 'ready'.
 *   Drafts collection is never queried.
 */
export async function fetchBooksFromFirestore(isAdminUser: boolean = false): Promise<BookProject[] | null> {
  const path = 'books';
  try {
    let q;
    if (isAdminUser) {
      // Admins and Owner can query all books
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

    if (isAdminUser) {
      // For administrators: fetch isolated draft chapters and re-merge
      try {
        const draftsSnapshot = await getDocs(collection(db, 'bookDraftChapters'));
        const draftsByBookId = new Map<string, BookChapter[]>();

        draftsSnapshot.forEach((d) => {
          const draftData = d.data();
          const draftChapter: BookChapter = {
            id: draftData.chapterId || draftData.id.replace(new RegExp(`^draft_${draftData.bookId}_`), ''),
            bookId: draftData.bookId,
            chapterNumber: typeof draftData.chapterNumber === 'number' ? draftData.chapterNumber : 1,
            title: draftData.title || '',
            subtitle: draftData.subtitle || '',
            content: Array.isArray(draftData.content) ? draftData.content : [],
            notes: draftData.notes || '',
            references: Array.isArray(draftData.references) ? draftData.references : [],
            status: 'draft',
            wordCount: typeof draftData.wordCount === 'number' ? draftData.wordCount : 0,
            readingTimeMinutes: typeof draftData.readingTimeMinutes === 'number' ? draftData.readingTimeMinutes : 1,
            viewsCount: typeof draftData.viewsCount === 'number' ? draftData.viewsCount : 0,
            updatedAt: draftData.updatedAt || new Date().toISOString(),
          };

          const existing = draftsByBookId.get(draftChapter.bookId) || [];
          existing.push(draftChapter);
          draftsByBookId.set(draftChapter.bookId, existing);
        });

        // Merge drafts into each book
        for (const book of books) {
          const bookDrafts = draftsByBookId.get(book.id) || [];
          const existingReadyChapters = (book.chapters || []).filter((ch) => ch.status === 'ready');
          
          // Also handle legacy embedded drafts by deduplicating against isolated drafts
          const combinedMap = new Map<string, BookChapter>();
          for (const ch of existingReadyChapters) {
            combinedMap.set(ch.id, ch);
          }
          for (const draft of bookDrafts) {
            combinedMap.set(draft.id, draft);
          }
          // Sort by chapterNumber ascending
          book.chapters = Array.from(combinedMap.values()).sort(
            (a, b) => a.chapterNumber - b.chapterNumber
          );
        }
      } catch (draftErr) {
        // Fail closed: never return a partial admin book list that could later overwrite unseen drafts.
        throw draftErr;
      }
    } else {
      // Public / readers: strictly filter each book's chapters to ready only
      for (const book of books) {
        book.chapters = (book.chapters || []).filter((ch) => ch.status === 'ready');
      }
    }

    return books;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Atomically saves a book and isolates draft chapters.
 * - Ready chapters remain in books/{bookId}.chapters
 * - Draft chapters are stripped from books/{bookId}.chapters and saved to /bookDraftChapters/{draftId}
 * - Promoted or deleted chapters are removed from /bookDraftChapters
 * Returns Promise<boolean> explicitly.
 */
export async function saveBookToFirestore(book: BookProject): Promise<boolean> {
  const path = `books/${book.id}`;
  try {
    const { readyChapters, draftChapters } = partitionBookChapters(book.chapters || []);

    const batch = writeBatch(db);
    let cleanupCount = 0;

    // 1. Fetch existing drafts for this book to clean up promoted/removed drafts
    try {
      const existingDraftsQ = query(
        collection(db, 'bookDraftChapters'),
        where('bookId', '==', book.id)
      );
      const existingDraftsSnap = await getDocs(existingDraftsQ);
      const currentDraftIdList = draftChapters.map((d) => formatDraftChapterId(book.id, d.id));
      const currentDraftIds = new Set(currentDraftIdList);
      if (currentDraftIds.size !== currentDraftIdList.length) {
        throw new Error('Draft chapter ID collision detected; refusing to overwrite another chapter.');
      }

      existingDraftsSnap.forEach((docSnap) => {
        if (!currentDraftIds.has(docSnap.id)) {
          // Chapter was promoted to ready or deleted; remove from draft chapters collection
          batch.delete(docSnap.ref);
          cleanupCount++;
        }
      });
    } catch (queryErr) {
      // Fail closed: committing without a complete cleanup query can leave stale or exposed drafts.
      throw queryErr;
    }

    // Firestore batches are limited to 500 writes. Abort before commit rather than partially saving.
    if (cleanupCount + draftChapters.length + 1 > 500) {
      throw new Error('This book requires more than 500 Firestore writes. Save was safely aborted; use a chunked server-side operation.');
    }

    // 2. Write all active draft chapters into /bookDraftChapters/{draftId}
    for (const draft of draftChapters) {
      const draftId = formatDraftChapterId(book.id, draft.id);
      const draftRef = doc(db, 'bookDraftChapters', draftId);
      // Firestore rules enforce immutable (bookId, chapterId) identity on updates,
      // so this write is race-safe without one extra document read per draft.
      const draftPayload: Record<string, any> = {
        id: draftId,
        bookId: book.id,
        chapterId: draft.id,
        chapterNumber: draft.chapterNumber,
        title: draft.title,
        subtitle: draft.subtitle || '',
        content: Array.isArray(draft.content) ? draft.content : [],
        notes: draft.notes || '',
        references: Array.isArray(draft.references) ? draft.references : [],
        status: 'draft',
        wordCount: draft.wordCount || 0,
        readingTimeMinutes: draft.readingTimeMinutes || 1,
        viewsCount: draft.viewsCount || 0,
        updatedAt: draft.updatedAt || new Date().toISOString(),
      };
      assertFirestoreDocumentSize(draftPayload, `Draft chapter "${draft.title || draft.id}"`);
      batch.set(draftRef, draftPayload, { merge: true });
    }

    // 3. Write book document with ONLY ready chapters in books/{bookId}
    const bookRef = doc(db, 'books', book.id);
    const bookPayload: Record<string, any> = {
      ...book,
      chapters: readyChapters,
      updatedAt: new Date().toISOString(),
    };
    assertFirestoreDocumentSize(bookPayload, `Book "${book.title || book.id}"`);
    batch.set(bookRef, bookPayload, { merge: true });

    // 4. Commit batch atomically
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Atomically deletes a book and all associated draft chapters in /bookDraftChapters.
 * Returns Promise<boolean> explicitly.
 */
export async function deleteBookFromFirestore(bookId: string): Promise<boolean> {
  const path = `books/${bookId}`;
  try {
    const batch = writeBatch(db);

    // 1. Queue main book deletion; nothing is committed until all draft records are verified.
    batch.delete(doc(db, 'books', bookId));

    // 2. Find and delete all draft chapters belonging to this book
    try {
      const existingDraftsQ = query(
        collection(db, 'bookDraftChapters'),
        where('bookId', '==', bookId)
      );
      const existingDraftsSnap = await getDocs(existingDraftsQ);
      if (existingDraftsSnap.size + 1 > 500) {
        throw new Error('This book has more than 499 draft records. Deletion was safely aborted; use a chunked server-side cleanup.');
      }
      existingDraftsSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
    } catch (queryErr) {
      // Fail closed: never delete the parent book if its draft records could not be enumerated.
      throw queryErr;
    }

    // 3. Commit atomic deletion
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
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
  if (!userId || !bookId || !chapterId) {
    throw new Error('Reading progress userId, bookId, and chapterId must all be non-empty.');
  }
  const raw = `prog_${userId}_${bookId}_${chapterId}`;
  if (!/^[a-zA-Z0-9_-]+$/.test(raw)) {
    throw new Error('Reading progress IDs may contain only letters, numbers, underscores, and hyphens. Refusing lossy ID normalization.');
  }
  if (raw.length > 128) {
    throw new Error('Reading progress ID exceeds Firestore’s 128-character document ID limit. Refusing lossy truncation.');
  }
  return raw;
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

  let progressId: string;
  try {
    progressId = progress.id || formatReadingProgressId(progress.userId, progress.bookId, progress.chapterId);
  } catch (error) {
    console.warn('Reading progress was not saved because its document ID is unsafe:', error);
    return false;
  }
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
  try {
    const progressId = formatReadingProgressId(userId, bookId, chapterId);
    const path = `readingProgress/${progressId}`;
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
        id: '', // saveReadingProgressToFirestore generates and validates the canonical ID
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

