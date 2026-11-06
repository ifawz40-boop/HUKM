import { createHash } from 'node:crypto';
import {
  isReviewSnapshotCurrent,
  transitionEditorialStatus,
  transitionRightsStatus,
  validateEvidenceReferences,
  validateReviewerNote,
  type EditorialReviewStatus,
  type RightsClearanceStatus,
} from '../data/library/reviewWorkflow.ts';

export type LibraryReviewDimension = 'editorial' | 'rights';

export interface LibraryReviewState {
  candidateId: string;
  status: EditorialReviewStatus | RightsClearanceStatus;
  version: number;
  candidateFingerprint: string;
  policyVersion: string;
  lastEventId: string;
  lastReviewedBy: string;
  lastReviewedAt: unknown;
}

export interface LibraryReviewEvent {
  id: string;
  candidateId: string;
  dimension: LibraryReviewDimension;
  fromStatus: string;
  toStatus: string;
  note: string;
  evidenceReferences: string[];
  reviewerUid: string;
  reviewerRole: string;
  candidateFingerprint: string;
  policyVersion: string;
  version: number;
  createdAt: unknown;
  idempotencyKeyHash: string;
  requestFingerprint: string;
}

export interface AppendLibraryReviewEventInput {
  candidateId: string;
  dimension: LibraryReviewDimension;
  targetStatus: EditorialReviewStatus | RightsClearanceStatus;
  note: unknown;
  evidenceReferences: unknown;
  expectedVersion: number;
  reviewerUid: string;
  reviewerRole: string;
  candidateFingerprint: string;
  policyVersion: string;
  idempotencyKey: string;
}

export interface AppendLibraryReviewEventResult {
  event: LibraryReviewEvent;
  state: LibraryReviewState;
  replayed: boolean;
}

export interface LibraryReviewCandidateSummary {
  candidateId: string;
  editorial: LibraryReviewState | null;
  rights: LibraryReviewState | null;
}

export interface LibraryReviewHistory extends LibraryReviewCandidateSummary {
  events: LibraryReviewEvent[];
}

export interface LibraryReviewRepository {
  listCurrentStates(): Promise<LibraryReviewCandidateSummary[]>;
  getCandidateHistory(candidateId: string): Promise<LibraryReviewHistory>;
  appendEvent(input: AppendLibraryReviewEventInput): Promise<AppendLibraryReviewEventResult>;
}

interface DocumentSnapshotLike {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface QueryDocumentSnapshotLike {
  id: string;
  data(): Record<string, unknown>;
}

interface QuerySnapshotLike {
  docs: QueryDocumentSnapshotLike[];
}

interface DocumentReferenceLike {
  id: string;
  get(): Promise<DocumentSnapshotLike>;
}

interface QueryLike {
  get(): Promise<QuerySnapshotLike>;
}

interface CollectionReferenceLike extends QueryLike {
  doc(id: string): DocumentReferenceLike;
  where(field: string, operator: '==', value: unknown): QueryLike;
}

interface TransactionLike {
  get(reference: DocumentReferenceLike): Promise<DocumentSnapshotLike>;
  create(reference: DocumentReferenceLike, data: Record<string, unknown>): void;
  set(reference: DocumentReferenceLike, data: Record<string, unknown>): void;
}

export interface ReviewFirestoreLike {
  collection(name: string): CollectionReferenceLike;
  runTransaction<T>(update: (transaction: TransactionLike) => Promise<T>): Promise<T>;
}

export class LibraryReviewRepositoryError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'LibraryReviewRepositoryError';
    this.code = code;
  }
}

const EDITORIAL_COLLECTION = 'libraryEditorialStates';
const RIGHTS_COLLECTION = 'libraryRightsStates';
const EVENTS_COLLECTION = 'libraryReviewEvents';

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function isCandidateId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function toState(candidateId: string, value: Record<string, unknown>): LibraryReviewState {
  return {
    candidateId,
    status: value.status as EditorialReviewStatus | RightsClearanceStatus,
    version: Number(value.version),
    candidateFingerprint: String(value.candidateFingerprint || ''),
    policyVersion: String(value.policyVersion || ''),
    lastEventId: String(value.lastEventId || ''),
    lastReviewedBy: String(value.lastReviewedBy || ''),
    lastReviewedAt: value.lastReviewedAt,
  };
}

function toEvent(value: Record<string, unknown>): LibraryReviewEvent {
  return {
    id: String(value.id || ''),
    candidateId: String(value.candidateId || ''),
    dimension: value.dimension as LibraryReviewDimension,
    fromStatus: String(value.fromStatus || ''),
    toStatus: String(value.toStatus || ''),
    note: String(value.note || ''),
    evidenceReferences: Array.isArray(value.evidenceReferences)
      ? value.evidenceReferences.filter((entry): entry is string => typeof entry === 'string')
      : [],
    reviewerUid: String(value.reviewerUid || ''),
    reviewerRole: String(value.reviewerRole || ''),
    candidateFingerprint: String(value.candidateFingerprint || ''),
    policyVersion: String(value.policyVersion || ''),
    version: Number(value.version),
    createdAt: value.createdAt,
    idempotencyKeyHash: String(value.idempotencyKeyHash || ''),
    requestFingerprint: String(value.requestFingerprint || ''),
  };
}

function timestampMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return Number(value.toMillis());
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function makeStateFromEvent(event: LibraryReviewEvent): LibraryReviewState {
  return {
    candidateId: event.candidateId,
    status: event.toStatus as EditorialReviewStatus | RightsClearanceStatus,
    version: event.version,
    candidateFingerprint: event.candidateFingerprint,
    policyVersion: event.policyVersion,
    lastEventId: event.id,
    lastReviewedBy: event.reviewerUid,
    lastReviewedAt: event.createdAt,
  };
}

function requestFingerprint(input: AppendLibraryReviewEventInput, note: string, evidence: string[]): string {
  return sha256(JSON.stringify([
    input.candidateId,
    input.dimension,
    input.targetStatus,
    note,
    evidence,
    input.expectedVersion,
    input.reviewerUid,
    input.reviewerRole,
    input.candidateFingerprint,
    input.policyVersion,
  ]));
}

function assertStaleReviewRestart(
  dimension: LibraryReviewDimension,
  targetStatus: string,
  note: string,
  evidenceReferences: readonly string[],
): void {
  const expectedStatus = dimension === 'editorial' ? 'in_review' : 'permission_requested';
  if (targetStatus !== expectedStatus) {
    throw new LibraryReviewRepositoryError('STALE_REVIEW_REQUIRES_RESTART');
  }
  if (note.length < 20 || evidenceReferences.length === 0) {
    throw new LibraryReviewRepositoryError('STALE_REVIEW_RESTART_REQUIRES_NOTE_AND_EVIDENCE');
  }
}

export function createFirestoreLibraryReviewRepository(
  db: ReviewFirestoreLike,
  serverTimestamp: () => unknown,
): LibraryReviewRepository {
  const editorialCollection = db.collection(EDITORIAL_COLLECTION);
  const rightsCollection = db.collection(RIGHTS_COLLECTION);
  const eventsCollection = db.collection(EVENTS_COLLECTION);

  return {
    async listCurrentStates() {
      const [editorialSnapshot, rightsSnapshot] = await Promise.all([
        editorialCollection.get(),
        rightsCollection.get(),
      ]);
      const summaries = new Map<string, LibraryReviewCandidateSummary>();

      for (const document of editorialSnapshot.docs) {
        const current = summaries.get(document.id) || {
          candidateId: document.id,
          editorial: null,
          rights: null,
        };
        current.editorial = toState(document.id, document.data());
        summaries.set(document.id, current);
      }

      for (const document of rightsSnapshot.docs) {
        const current = summaries.get(document.id) || {
          candidateId: document.id,
          editorial: null,
          rights: null,
        };
        current.rights = toState(document.id, document.data());
        summaries.set(document.id, current);
      }

      return [...summaries.values()].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    },

    async getCandidateHistory(candidateId) {
      if (!isCandidateId(candidateId)) throw new LibraryReviewRepositoryError('INVALID_CANDIDATE_ID');

      const [editorialSnapshot, rightsSnapshot, eventSnapshot] = await Promise.all([
        editorialCollection.doc(candidateId).get(),
        rightsCollection.doc(candidateId).get(),
        eventsCollection.where('candidateId', '==', candidateId).get(),
      ]);

      const events = eventSnapshot.docs
        .map((document) => toEvent(document.data()))
        .sort((a, b) => timestampMillis(a.createdAt) - timestampMillis(b.createdAt));

      return {
        candidateId,
        editorial: editorialSnapshot.exists && editorialSnapshot.data()
          ? toState(candidateId, editorialSnapshot.data()!)
          : null,
        rights: rightsSnapshot.exists && rightsSnapshot.data()
          ? toState(candidateId, rightsSnapshot.data()!)
          : null,
        events,
      };
    },

    async appendEvent(input) {
      if (typeof input.candidateId !== 'string' || !isCandidateId(input.candidateId)) {
        throw new LibraryReviewRepositoryError('INVALID_CANDIDATE_ID');
      }
      if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) {
        throw new LibraryReviewRepositoryError('INVALID_EXPECTED_VERSION');
      }
      if (typeof input.reviewerUid !== 'string' || !input.reviewerUid.trim() || input.reviewerRole !== 'owner') {
        throw new LibraryReviewRepositoryError('REVIEWER_NOT_AUTHORIZED');
      }
      if (
        typeof input.candidateFingerprint !== 'string' ||
        !/^[a-f0-9]{64}$/i.test(input.candidateFingerprint) ||
        typeof input.policyVersion !== 'string' ||
        !input.policyVersion.trim()
      ) {
        throw new LibraryReviewRepositoryError('INVALID_REVIEW_SNAPSHOT');
      }
      if (input.dimension !== 'editorial' && input.dimension !== 'rights') {
        throw new LibraryReviewRepositoryError('INVALID_REVIEW_DIMENSION');
      }
      if (typeof input.idempotencyKey !== 'string' || !/^[A-Za-z0-9._:-]{16,128}$/.test(input.idempotencyKey)) {
        throw new LibraryReviewRepositoryError('INVALID_IDEMPOTENCY_KEY');
      }

      const note = validateReviewerNote(input.note);
      const evidenceReferences = validateEvidenceReferences(input.evidenceReferences);
      const idempotencyKeyHash = sha256(`${input.reviewerUid}\0${input.candidateId}\0${input.idempotencyKey}`);
      const fingerprint = requestFingerprint(input, note, evidenceReferences);
      const eventId = idempotencyKeyHash;
      const eventReference = eventsCollection.doc(eventId);
      const stateCollection = input.dimension === 'editorial' ? editorialCollection : rightsCollection;
      const stateReference = stateCollection.doc(input.candidateId);

      const transactionResult = await db.runTransaction(async (transaction) => {
        const eventSnapshot = await transaction.get(eventReference);
        if (eventSnapshot.exists) {
          const existingEvent = eventSnapshot.data();
          if (!existingEvent) throw new LibraryReviewRepositoryError('INVALID_IDEMPOTENCY_RECORD');
          const event = toEvent(existingEvent);
          if (event.requestFingerprint !== fingerprint) {
            throw new LibraryReviewRepositoryError('IDEMPOTENCY_KEY_REUSED');
          }
          return { event, state: makeStateFromEvent(event), replayed: true };
        }

        const stateSnapshot = await transaction.get(stateReference);
        const previousData = stateSnapshot.exists ? stateSnapshot.data() : undefined;
        const previous = previousData ? toState(input.candidateId, previousData) : null;
        const currentVersion = previous?.version ?? 0;
        if (!Number.isSafeInteger(currentVersion) || currentVersion < 0) {
          throw new LibraryReviewRepositoryError('INVALID_REVIEW_STATE');
        }
        if (currentVersion !== input.expectedVersion) {
          throw new LibraryReviewRepositoryError('REVIEW_VERSION_CONFLICT');
        }

        const defaultStatus = input.dimension === 'editorial' ? 'pending' : 'unknown';
        const currentStatus = previous?.status || defaultStatus;
        const snapshotIsCurrent = previous
          ? isReviewSnapshotCurrent(previous, {
              candidateFingerprint: input.candidateFingerprint,
              policyVersion: input.policyVersion,
            })
          : true;

        let nextStatus: string;
        if (previous && !snapshotIsCurrent) {
          assertStaleReviewRestart(input.dimension, String(input.targetStatus), note, evidenceReferences);
          nextStatus = String(input.targetStatus);
        } else if (input.dimension === 'editorial') {
          nextStatus = transitionEditorialStatus(
            currentStatus as EditorialReviewStatus,
            input.targetStatus as EditorialReviewStatus,
            note,
            evidenceReferences,
          );
        } else {
          nextStatus = transitionRightsStatus(
            currentStatus as RightsClearanceStatus,
            input.targetStatus as RightsClearanceStatus,
            note,
            evidenceReferences,
          );
        }

        const nextVersion = currentVersion + 1;
        const createdAt = serverTimestamp();
        const event: LibraryReviewEvent = {
          id: eventId,
          candidateId: input.candidateId,
          dimension: input.dimension,
          fromStatus: String(currentStatus),
          toStatus: nextStatus,
          note,
          evidenceReferences,
          reviewerUid: input.reviewerUid,
          reviewerRole: 'owner',
          candidateFingerprint: input.candidateFingerprint,
          policyVersion: input.policyVersion,
          version: nextVersion,
          createdAt,
          idempotencyKeyHash,
          requestFingerprint: fingerprint,
        };
        const state: LibraryReviewState = {
          candidateId: input.candidateId,
          status: nextStatus as EditorialReviewStatus | RightsClearanceStatus,
          version: nextVersion,
          candidateFingerprint: input.candidateFingerprint,
          policyVersion: input.policyVersion,
          lastEventId: eventId,
          lastReviewedBy: input.reviewerUid,
          lastReviewedAt: createdAt,
        };

        transaction.create(eventReference, event as unknown as Record<string, unknown>);
        transaction.set(stateReference, state as unknown as Record<string, unknown>);
        return { event, state, replayed: false };
      });

      if (transactionResult.replayed) return transactionResult;
      // Resolve Firestore serverTimestamp sentinels before returning an event to the HTTP layer.
      const persistedEventSnapshot = await eventReference.get();
      const persistedEventData = persistedEventSnapshot.data();
      if (!persistedEventSnapshot.exists || !persistedEventData) {
        throw new LibraryReviewRepositoryError('REVIEW_EVENT_PERSISTENCE_UNCONFIRMED');
      }
      const persistedEvent = toEvent(persistedEventData);
      return {
        event: persistedEvent,
        state: makeStateFromEvent(persistedEvent),
        replayed: false,
      };
    },
  };
}
