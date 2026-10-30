import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from './config';
import { BookProject, CategoryItem } from '../types/hukm';
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

export async function fetchBooksFromFirestore(): Promise<BookProject[] | null> {
  const path = 'books';
  try {
    const snapshot = await getDocs(collection(db, path));
    if (snapshot.empty) return null;
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
