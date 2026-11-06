import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import express, { type RequestHandler } from 'express';
import test from 'node:test';
import {
  createLibraryReviewRouter,
  fingerprintReviewCandidate,
  type ReviewableLibraryCandidate,
} from './libraryReviewApi.ts';
import {
  LibraryReviewRepositoryError,
  type AppendLibraryReviewEventInput,
  type AppendLibraryReviewEventResult,
  type LibraryReviewRepository,
} from './libraryReviewRepository.ts';

const candidate: ReviewableLibraryCandidate = {
  id: 'sample-book',
  title: 'كتاب تجريبي للمراجعة',
  author: 'مؤلف موثق',
  category: 'religious',
  sourceUrl: 'https://example.org/book',
  edition: 'الطبعة الأولى',
  publisher: 'دار اختبار',
  publicationYear: '2020',
  pages: 120,
  scanPages: 126,
  reviewReportUrl: 'https://example.org/review',
};

function createRepository() {
  const calls: AppendLibraryReviewEventInput[] = [];
  const repository: LibraryReviewRepository = {
    listCurrentStates: async () => [],
    getCandidateHistory: async (candidateId) => ({
      candidateId,
      editorial: null,
      rights: null,
      events: [],
    }),
    appendEvent: async (input): Promise<AppendLibraryReviewEventResult> => {
      calls.push(input);
      const createdAt = new Date('2026-11-06T12:00:00.000Z');
      const event = {
        id: 'event-0001',
        candidateId: input.candidateId,
        dimension: input.dimension,
        fromStatus: input.dimension === 'editorial' ? 'pending' : 'unknown',
        toStatus: String(input.targetStatus),
        note: String(input.note),
        evidenceReferences: input.evidenceReferences as string[],
        reviewerUid: input.reviewerUid,
        reviewerRole: input.reviewerRole,
        candidateFingerprint: input.candidateFingerprint,
        policyVersion: input.policyVersion,
        version: input.expectedVersion + 1,
        createdAt,
        idempotencyKeyHash: 'internal-idempotency-hash',
        requestFingerprint: 'internal-request-fingerprint',
      };
      const state = {
        candidateId: input.candidateId,
        status: String(input.targetStatus) as AppendLibraryReviewEventResult['state']['status'],
        version: input.expectedVersion + 1,
        candidateFingerprint: input.candidateFingerprint,
        policyVersion: input.policyVersion,
        lastEventId: event.id,
        lastReviewedBy: input.reviewerUid,
        lastReviewedAt: createdAt,
      };
      return { event, state, replayed: false };
    },
  };
  return { repository, calls };
}

async function withApiServer<T>(
  role: 'owner' | 'admin' | 'reader',
  callback: (baseUrl: string, calls: AppendLibraryReviewEventInput[]) => Promise<T>,
): Promise<T> {
  const { repository, calls } = createRepository();
  const authenticateToken: RequestHandler = (req, _res, next) => {
    (req as typeof req & { user?: unknown }).user = {
      uid: 'verified-owner-uid',
      role,
      email_verified: true,
    };
    next();
  };
  const requireOwnerRole: RequestHandler = (req, res, next) => {
    const user = (req as typeof req & { user?: { role?: string; email_verified?: boolean } }).user;
    if (user?.role !== 'owner' || user.email_verified !== true) {
      res.status(403).json({ success: false, code: 'OWNER_REQUIRED' });
      return;
    }
    next();
  };

  const app = express();
  app.use(express.json());
  app.use('/api/library/reviews', createLibraryReviewRouter({
    repository,
    listCandidates: () => [candidate],
    resolveCandidate: (candidateId) => candidateId === candidate.id ? candidate : null,
    policyVersion: '1.0.0',
    authenticateToken,
    requireOwnerRole,
  }));

  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address() as AddressInfo;
  try {
    return await callback(`http://127.0.0.1:${address.port}`, calls);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test('owner-only review API lists candidates and returns current policy version', async () => {
  await withApiServer('owner', async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/library/reviews`);
    const body = await response.json() as { success: boolean; policyVersion: string; candidates: Array<{ candidate: { id: string }; candidateFingerprint: string }> };
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.policyVersion, '1.0.0');
    assert.equal(body.candidates[0].candidate.id, candidate.id);
    assert.equal(body.candidates[0].candidateFingerprint, fingerprintReviewCandidate(candidate));
  });
});

test('review API derives reviewer identity, candidate fingerprint and policy from server dependencies', async () => {
  await withApiServer('owner', async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/library/reviews/${candidate.id}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'api-request-key-0001',
      },
      body: JSON.stringify({
        dimension: 'editorial',
        targetStatus: 'in_review',
        note: '',
        evidenceReferences: [],
        expectedVersion: 0,
        reviewerUid: 'attacker-controlled-uid',
        reviewerRole: 'admin',
        candidateFingerprint: 'f'.repeat(64),
        policyVersion: 'attacker-policy',
        currentStatus: 'approved',
      }),
    });
    const body = await response.json() as { success: boolean; event: { reviewerUid: string; reviewerRole: string; candidateFingerprint: string; policyVersion: string } };
    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].reviewerUid, 'verified-owner-uid');
    assert.equal(calls[0].reviewerRole, 'owner');
    assert.equal(calls[0].candidateFingerprint, fingerprintReviewCandidate(candidate));
    assert.equal(calls[0].policyVersion, '1.0.0');
    assert.equal(body.event.reviewerUid, 'verified-owner-uid');
    assert.equal(body.event.reviewerRole, 'owner');
    assert.equal(body.event.candidateFingerprint, fingerprintReviewCandidate(candidate));
    assert.equal(body.event.policyVersion, '1.0.0');
    assert.equal(JSON.stringify(body).includes('attacker-controlled-uid'), false);
    assert.equal(JSON.stringify(body).includes('internal-request-fingerprint'), false);
  });
});

test('non-owner roles are denied before the repository can receive a write', async () => {
  await withApiServer('admin', async (baseUrl, calls) => {
    const response = await fetch(`${baseUrl}/api/library/reviews/${candidate.id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'api-request-key-0002' },
      body: JSON.stringify({
        dimension: 'editorial',
        targetStatus: 'in_review',
        note: '',
        evidenceReferences: [],
        expectedVersion: 0,
      }),
    });
    assert.equal(response.status, 403);
    assert.equal(calls.length, 0);
  });
});

test('unknown candidates and malformed review payloads are rejected', async () => {
  await withApiServer('owner', async (baseUrl, calls) => {
    const unknown = await fetch(`${baseUrl}/api/library/reviews/not-a-candidate/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'api-request-key-0003' },
      body: JSON.stringify({ dimension: 'editorial', targetStatus: 'in_review', note: '', evidenceReferences: [], expectedVersion: 0 }),
    });
    assert.equal(unknown.status, 404);

    const malformed = await fetch(`${baseUrl}/api/library/reviews/${candidate.id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'api-request-key-0004' },
      body: JSON.stringify({ dimension: 'unknown', targetStatus: 'approved', note: '', evidenceReferences: [], expectedVersion: 0 }),
    });
    assert.equal(malformed.status, 400);
    assert.equal(calls.length, 0);
  });
});

test('review API is not mounted in the production or development entry points yet', () => {
  const serverEntry = readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');
  const vercelEntry = readFileSync(path.resolve(process.cwd(), 'api/index.ts'), 'utf8');
  assert.equal(serverEntry.includes('libraryReviewApi'), false);
  assert.equal(serverEntry.includes('/api/library/reviews'), false);
  assert.equal(vercelEntry.includes('libraryReviewApi'), false);
  assert.equal(vercelEntry.includes('/api/library/reviews'), false);

  const firestoreRules = readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
  assert.match(firestoreRules, /match \/\{document=\*\*\}[\s\S]*?allow read, write: if false;/);
  for (const collectionName of ['libraryEditorialStates', 'libraryRightsStates', 'libraryReviewEvents']) {
    assert.ok(firestoreRules.includes(`match /${collectionName}/{document=**} {`));
    assert.ok(firestoreRules.includes(`match /${collectionName}/{document=**} {\n      allow read, write: if false;\n    }`));
  }
});

test('repository conflicts are mapped to safe HTTP conflicts', async () => {
  const { repository, calls } = createRepository();
  const conflictRepository: LibraryReviewRepository = {
    ...repository,
    appendEvent: async () => {
      calls.push(makeConflictInput());
      throw new LibraryReviewRepositoryError('REVIEW_VERSION_CONFLICT');
    },
  };
  const app = express();
  app.use(express.json());
  const authenticateToken: RequestHandler = (req, _res, next) => {
    (req as typeof req & { user?: unknown }).user = { uid: 'owner-uid', role: 'owner', email_verified: true };
    next();
  };
  const requireOwnerRole: RequestHandler = (_req, _res, next) => next();
  app.use('/api/library/reviews', createLibraryReviewRouter({
    repository: conflictRepository,
    listCandidates: () => [candidate],
    resolveCandidate: () => candidate,
    policyVersion: '1.0.0',
    authenticateToken,
    requireOwnerRole,
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/library/reviews/${candidate.id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'api-request-key-0005' },
      body: JSON.stringify({ dimension: 'editorial', targetStatus: 'in_review', note: '', evidenceReferences: [], expectedVersion: 0 }),
    });
    const body = await response.json() as { code: string };
    assert.equal(response.status, 409);
    assert.equal(body.code, 'REVIEW_VERSION_CONFLICT');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

function makeConflictInput(): AppendLibraryReviewEventInput {
  return {
    candidateId: candidate.id,
    dimension: 'editorial',
    targetStatus: 'in_review',
    note: '',
    evidenceReferences: [],
    expectedVersion: 0,
    reviewerUid: 'owner-uid',
    reviewerRole: 'owner',
    candidateFingerprint: fingerprintReviewCandidate(candidate),
    policyVersion: '1.0.0',
    idempotencyKey: 'api-request-key-0005',
  };
}
