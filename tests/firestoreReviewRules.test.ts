import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { after, before, test } from 'node:test';

const PROJECT_ID = 'demo-hukm-library-review-rules';
const DATABASE_ID = 'ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96';
const REVIEW_COLLECTIONS = [
  'libraryEditorialStates',
  'libraryRightsStates',
  'libraryReviewEvents',
] as const;

let testEnvironment: RulesTestEnvironment;

async function assertPermissionDenied(operation: Promise<unknown>, label: string): Promise<void> {
  await assert.rejects(
    operation,
    (error: unknown) => {
      if (!error || typeof error !== 'object' || !('code' in error)) return false;
      return error.code === 'permission-denied';
    },
    label,
  );
}

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  });

  await testEnvironment.clearFirestore();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const adminDb = getFirestore(context.firestore().app, DATABASE_ID);
    for (const collectionName of REVIEW_COLLECTIONS) {
      await setDoc(doc(adminDb, `${collectionName}/existing`), {
        candidateId: 'sample-book',
        status: 'pending',
        version: 1,
      });
      await setDoc(doc(adminDb, `${collectionName}/existing/private/nested`), {
        shouldRemainPrivate: true,
      });
    }
  });
});

after(async () => {
  await testEnvironment.cleanup();
});

test('all direct client reads and writes to review collections are denied for every role', async () => {
  const contexts = [
    { name: 'unauthenticated', context: testEnvironment.unauthenticatedContext() },
    { name: 'reader', context: testEnvironment.authenticatedContext('reader-user', { role: 'reader' }) },
    { name: 'admin', context: testEnvironment.authenticatedContext('admin-user', { role: 'admin' }) },
    { name: 'owner', context: testEnvironment.authenticatedContext('owner-user', { role: 'owner', email_verified: true }) },
  ];

  for (const { name, context } of contexts) {
    const clientDb = getFirestore(context.firestore().app, DATABASE_ID);

    for (const collectionName of REVIEW_COLLECTIONS) {
      const existingDocument = doc(clientDb, `${collectionName}/existing`);
      const newDocument = doc(clientDb, `${collectionName}/new-${name}`);
      const nestedDocument = doc(clientDb, `${collectionName}/existing/private/nested`);
      const newNestedDocument = doc(clientDb, `${collectionName}/existing/private/new-${name}`);

      await assertPermissionDenied(getDoc(existingDocument), `${name} cannot read ${collectionName}`);
      await assertPermissionDenied(getDocs(collection(clientDb, collectionName)), `${name} cannot list ${collectionName}`);
      await assertPermissionDenied(setDoc(newDocument, { candidateId: 'attacker-book' }), `${name} cannot create in ${collectionName}`);
      await assertPermissionDenied(updateDoc(existingDocument, { status: 'approved' }), `${name} cannot update ${collectionName}`);
      await assertPermissionDenied(deleteDoc(existingDocument), `${name} cannot delete from ${collectionName}`);
      await assertPermissionDenied(getDoc(nestedDocument), `${name} cannot read nested documents under ${collectionName}`);
      await assertPermissionDenied(setDoc(newNestedDocument, { injected: true }), `${name} cannot create nested documents under ${collectionName}`);
    }
  }
});
