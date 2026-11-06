import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFirestoreLibraryReviewRepository,
  LibraryReviewRepositoryError,
  type ReviewFirestoreLike,
} from './libraryReviewRepository.ts';

interface StoredDocument {
  [key: string]: unknown;
}

class MemoryFirestore {
  failNextCommit = false;
  private readonly collections = new Map<string, Map<string, StoredDocument>>();

  private getCollection(name: string) {
    let collection = this.collections.get(name);
    if (!collection) {
      collection = new Map<string, StoredDocument>();
      this.collections.set(name, collection);
    }
    return collection;
  }

  private snapshot(value: StoredDocument | undefined) {
    return {
      exists: Boolean(value),
      data: () => value ? { ...value } : undefined,
    };
  }

  collection(name: string) {
    const store = this.getCollection(name);
    const makeReference = (id: string) => ({
      id,
      collectionName: name,
      get: async () => this.snapshot(store.get(id)),
    });

    const makeQuerySnapshot = (documents: Array<[string, StoredDocument]>) => ({
      docs: documents.map(([id, value]) => ({
        id,
        data: () => ({ ...value }),
      })),
    });

    return {
      doc: makeReference,
      get: async () => makeQuerySnapshot([...store.entries()]),
      where: (field: string, operator: '==', expected: unknown) => ({
        get: async () => {
          if (operator !== '==') throw new Error('UNSUPPORTED_TEST_QUERY');
          return makeQuerySnapshot([...store.entries()].filter(([, value]) => value[field] === expected));
        },
      }),
    };
  }

  async runTransaction<T>(update: (transaction: {
    get: (reference: { id: string; collectionName: string }) => Promise<{ exists: boolean; data: () => StoredDocument | undefined }>;
    create: (reference: { id: string; collectionName: string }, data: StoredDocument) => void;
    set: (reference: { id: string; collectionName: string }, data: StoredDocument) => void;
  }) => Promise<T>): Promise<T> {
    const writes: Array<{ kind: 'create' | 'set'; reference: { id: string; collectionName: string }; data: StoredDocument }> = [];
    const transaction = {
      get: async (reference: { id: string; collectionName: string }) => this.snapshot(this.getCollection(reference.collectionName).get(reference.id)),
      create: (reference: { id: string; collectionName: string }, data: StoredDocument) => {
        writes.push({ kind: 'create', reference, data });
      },
      set: (reference: { id: string; collectionName: string }, data: StoredDocument) => {
        writes.push({ kind: 'set', reference, data });
      },
    };

    const result = await update(transaction);
    if (this.failNextCommit) {
      this.failNextCommit = false;
      throw new Error('INJECTED_COMMIT_FAILURE');
    }
    for (const write of writes) {
      if (write.kind === 'create' && this.getCollection(write.reference.collectionName).has(write.reference.id)) {
        throw new Error('DOCUMENT_ALREADY_EXISTS');
      }
    }
    for (const write of writes) {
      this.getCollection(write.reference.collectionName).set(write.reference.id, { ...write.data });
    }
    return result;
  }
}

const candidateFingerprint = 'a'.repeat(64);
const nextCandidateFingerprint = 'b'.repeat(64);
const policyVersion = '1.0.0';
const decisionNote = 'Reviewed the full candidate evidence and documented the reason for this decision.';
const evidenceReferences = ['https://example.org/edition-record'];

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    candidateId: 'sample-book',
    dimension: 'editorial' as const,
    targetStatus: 'in_review' as const,
    note: '',
    evidenceReferences: [],
    expectedVersion: 0,
    reviewerUid: 'verified-owner-uid',
    reviewerRole: 'owner',
    candidateFingerprint,
    policyVersion,
    idempotencyKey: 'request-key-00000001',
    ...overrides,
  };
}

function makeRepository() {
  const db = new MemoryFirestore();
  let timestamp = 0;
  const repository = createFirestoreLibraryReviewRepository(
    db as unknown as ReviewFirestoreLike,
    () => new Date(++timestamp),
  );
  return { db, repository };
}

test('editorial events and state projections are written together with monotonic versions', async () => {
  const { repository } = makeRepository();
  const started = await repository.appendEvent(makeInput());
  assert.equal(started.event.fromStatus, 'pending');
  assert.equal(started.event.toStatus, 'in_review');
  assert.equal(started.state.version, 1);
  assert.equal(started.replayed, false);

  const approvedInput = makeInput({
    targetStatus: 'approved',
    note: decisionNote,
    evidenceReferences,
    expectedVersion: 1,
    idempotencyKey: 'request-key-00000002',
  });
  const approved = await repository.appendEvent(approvedInput);
  assert.equal(approved.event.fromStatus, 'in_review');
  assert.equal(approved.event.toStatus, 'approved');
  assert.equal(approved.state.version, 2);

  const history = await repository.getCandidateHistory('sample-book');
  assert.equal(history.editorial?.status, 'approved');
  assert.equal(history.editorial?.version, 2);
  assert.equal(history.events.length, 2);
  assert.deepEqual(history.events.map((event) => event.version), [1, 2]);
});

test('injected transaction commit failure leaves neither event nor state partially written', async () => {
  const { db, repository } = makeRepository();
  db.failNextCommit = true;
  await assert.rejects(
    () => repository.appendEvent(makeInput()),
    /INJECTED_COMMIT_FAILURE/,
  );
  const history = await repository.getCandidateHistory('sample-book');
  assert.equal(history.editorial, null);
  assert.equal(history.rights, null);
  assert.equal(history.events.length, 0);
  assert.equal((await repository.listCurrentStates()).length, 0);
});

test('idempotent retries return the original event without duplicating state', async () => {
  const { repository } = makeRepository();
  const input = makeInput();
  const first = await repository.appendEvent(input);
  const replay = await repository.appendEvent(input);

  assert.equal(replay.replayed, true);
  assert.equal(replay.event.id, first.event.id);
  assert.equal(replay.state.version, first.state.version);
  assert.equal((await repository.getCandidateHistory('sample-book')).events.length, 1);
});

test('reusing an idempotency key with a different payload is rejected', async () => {
  const { repository } = makeRepository();
  const input = makeInput();
  await repository.appendEvent(input);

  await assert.rejects(
    () => repository.appendEvent({ ...input, targetStatus: 'in_review', note: 'different request payload' }),
    (error: unknown) => error instanceof LibraryReviewRepositoryError && error.code === 'IDEMPOTENCY_KEY_REUSED',
  );
});

test('optimistic version checks reject stale concurrent review forms', async () => {
  const { repository } = makeRepository();
  await repository.appendEvent(makeInput());

  await assert.rejects(
    () => repository.appendEvent(makeInput({
      expectedVersion: 0,
      idempotencyKey: 'request-key-00000002',
    })),
    (error: unknown) => error instanceof LibraryReviewRepositoryError && error.code === 'REVIEW_VERSION_CONFLICT',
  );
});

test('a changed candidate fingerprint requires a documented restart before another decision', async () => {
  const { repository } = makeRepository();
  await repository.appendEvent(makeInput());
  await repository.appendEvent(makeInput({
    targetStatus: 'approved',
    note: decisionNote,
    evidenceReferences,
    expectedVersion: 1,
    idempotencyKey: 'request-key-00000002',
  }));

  await assert.rejects(
    () => repository.appendEvent(makeInput({
      targetStatus: 'approved',
      note: decisionNote,
      evidenceReferences,
      expectedVersion: 2,
      candidateFingerprint: nextCandidateFingerprint,
      idempotencyKey: 'request-key-00000003',
    })),
    (error: unknown) => error instanceof LibraryReviewRepositoryError && error.code === 'STALE_REVIEW_REQUIRES_RESTART',
  );

  const restarted = await repository.appendEvent(makeInput({
    targetStatus: 'in_review',
    note: decisionNote,
    evidenceReferences,
    expectedVersion: 2,
    candidateFingerprint: nextCandidateFingerprint,
    idempotencyKey: 'request-key-00000004',
  }));
  assert.equal(restarted.state.status, 'in_review');
  assert.equal(restarted.state.candidateFingerprint, nextCandidateFingerprint);
  assert.equal(restarted.state.version, 3);
});

test('rights review is independent from editorial review and requires evidence to clear', async () => {
  const { repository } = makeRepository();
  await assert.rejects(
    () => repository.appendEvent(makeInput({
      dimension: 'rights',
      targetStatus: 'cleared',
      note: decisionNote,
      evidenceReferences: [],
      idempotencyKey: 'rights-request-key-01',
    })),
    /REVIEW_DECISION_REQUIRES_NOTE_AND_EVIDENCE/,
  );

  const rights = await repository.appendEvent(makeInput({
    dimension: 'rights',
    targetStatus: 'cleared',
    note: decisionNote,
    evidenceReferences,
    idempotencyKey: 'rights-request-key-02',
  }));
  const history = await repository.getCandidateHistory('sample-book');
  assert.equal(rights.state.status, 'cleared');
  assert.equal(history.editorial, null);
  assert.equal(history.rights?.status, 'cleared');
  assert.equal(history.events.length, 1);
});

test('listCurrentStates merges the independent editorial and rights projections', async () => {
  const { repository } = makeRepository();
  await repository.appendEvent(makeInput());
  await repository.appendEvent(makeInput({
    dimension: 'rights',
    targetStatus: 'permission_requested',
    idempotencyKey: 'rights-request-key-03',
  }));

  const summaries = await repository.listCurrentStates();
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].editorial?.status, 'in_review');
  assert.equal(summaries[0].rights?.status, 'permission_requested');
});

test('invalid reviewer identity, version, idempotency key and candidate ID fail closed', async () => {
  const { repository } = makeRepository();
  await assert.rejects(
    () => repository.appendEvent(makeInput({ reviewerRole: 'admin' })),
    /REVIEWER_NOT_AUTHORIZED/,
  );
  await assert.rejects(
    () => repository.appendEvent(makeInput({ expectedVersion: -1 })),
    /INVALID_EXPECTED_VERSION/,
  );
  await assert.rejects(
    () => repository.appendEvent(makeInput({ idempotencyKey: 'short' })),
    /INVALID_IDEMPOTENCY_KEY/,
  );
  await assert.rejects(
    () => repository.appendEvent(makeInput({ candidateId: '../unsafe' })),
    /INVALID_CANDIDATE_ID/,
  );
});
