import { createHash } from 'node:crypto';
import { Router, type Request, type RequestHandler } from 'express';
import {
  LibraryReviewRepositoryError,
  type LibraryReviewRepository,
  type LibraryReviewCandidateSummary,
  type LibraryReviewDimension,
  type LibraryReviewEvent,
  type LibraryReviewState,
} from './libraryReviewRepository.ts';
import type { EditorialReviewStatus, RightsClearanceStatus } from '../data/library/reviewWorkflow.ts';

export interface ReviewableLibraryCandidate {
  id: string;
  title: string;
  author: string;
  category: string;
  sourceUrl: string;
  edition?: string;
  publisher?: string;
  publicationYear?: string;
  pages?: number;
  scanPages?: number;
  reviewReportUrl?: string;
}

interface ReviewRequestUser {
  uid?: unknown;
  role?: unknown;
  email_verified?: unknown;
}

interface AuthenticatedRequest extends Request {
  user?: ReviewRequestUser;
}

export interface LibraryReviewRouterDependencies {
  repository: LibraryReviewRepository;
  listCandidates: () => ReviewableLibraryCandidate[];
  resolveCandidate: (candidateId: string) => ReviewableLibraryCandidate | null;
  policyVersion: string;
  authenticateToken: RequestHandler;
  requireOwnerRole: RequestHandler;
}

const EDITORIAL_TARGETS = new Set(['in_review', 'approved', 'rejected', 'changes_requested']);
const RIGHTS_TARGETS = new Set(['unknown', 'permission_requested', 'cleared', 'public_domain_verified', 'restricted']);

const CLIENT_ERROR_CODES = new Set([
  'INVALID_CANDIDATE_ID',
  'INVALID_EXPECTED_VERSION',
  'INVALID_REVIEWER_NOTE',
  'INVALID_REVIEW_EVIDENCE',
  'INVALID_REVIEW_SNAPSHOT',
  'INVALID_IDEMPOTENCY_KEY',
  'INVALID_REVIEW_DIMENSION',
  'INVALID_EDITORIAL_TRANSITION',
  'INVALID_RIGHTS_TRANSITION',
  'REVIEW_DECISION_REQUIRES_NOTE_AND_EVIDENCE',
  'REOPEN_REQUIRES_EXPLANATION_AND_EVIDENCE',
  'RIGHTS_REVOCATION_REQUIRES_EXPLANATION_AND_EVIDENCE',
  'STALE_REVIEW_REQUIRES_RESTART',
  'STALE_REVIEW_RESTART_REQUIRES_NOTE_AND_EVIDENCE',
]);

const CONFLICT_ERROR_CODES = new Set([
  'REVIEW_VERSION_CONFLICT',
  'IDEMPOTENCY_KEY_REUSED',
  'STALE_REVIEW_REQUIRES_RESTART',
]);

export function fingerprintReviewCandidate(candidate: ReviewableLibraryCandidate): string {
  const canonicalMetadata = [
    candidate.id,
    candidate.title.trim(),
    candidate.author.trim(),
    candidate.category,
    candidate.sourceUrl.trim(),
    candidate.edition?.trim() || '',
    candidate.publisher?.trim() || '',
    candidate.publicationYear?.trim() || '',
    Number.isSafeInteger(candidate.pages) ? candidate.pages : null,
    Number.isSafeInteger(candidate.scanPages) ? candidate.scanPages : null,
    candidate.reviewReportUrl?.trim() || '',
  ];
  return createHash('sha256').update(JSON.stringify(canonicalMetadata), 'utf8').digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeState(state: LibraryReviewState | null): Record<string, unknown> | null {
  if (!state) return null;
  return {
    candidateId: state.candidateId,
    status: state.status,
    version: state.version,
    candidateFingerprint: state.candidateFingerprint,
    policyVersion: state.policyVersion,
    lastEventId: state.lastEventId,
    lastReviewedBy: state.lastReviewedBy,
    lastReviewedAt: state.lastReviewedAt,
  };
}

function safeEvent(event: LibraryReviewEvent): Record<string, unknown> {
  return {
    id: event.id,
    candidateId: event.candidateId,
    dimension: event.dimension,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    note: event.note,
    evidenceReferences: event.evidenceReferences,
    reviewerUid: event.reviewerUid,
    reviewerRole: event.reviewerRole,
    candidateFingerprint: event.candidateFingerprint,
    policyVersion: event.policyVersion,
    version: event.version,
    createdAt: event.createdAt,
  };
}

function safeCandidate(candidate: ReviewableLibraryCandidate): Record<string, unknown> {
  return {
    id: candidate.id,
    title: candidate.title,
    author: candidate.author,
    category: candidate.category,
    sourceUrl: candidate.sourceUrl,
    edition: candidate.edition || null,
    publisher: candidate.publisher || null,
    publicationYear: candidate.publicationYear || null,
    pages: candidate.pages ?? null,
    scanPages: candidate.scanPages ?? null,
    reviewReportUrl: candidate.reviewReportUrl || null,
  };
}

function safeSummary(
  candidate: ReviewableLibraryCandidate,
  summary: LibraryReviewCandidateSummary | null,
): Record<string, unknown> {
  return {
    candidate: safeCandidate(candidate),
    candidateFingerprint: fingerprintReviewCandidate(candidate),
    editorial: safeState(summary?.editorial || null),
    rights: safeState(summary?.rights || null),
  };
}

function mapReviewError(error: unknown, res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]): void {
  const code = error instanceof LibraryReviewRepositoryError
    ? error.code
    : error instanceof Error
      ? error.message
      : '';

  if (CONFLICT_ERROR_CODES.has(code)) {
    res.status(409).json({ success: false, code, message: 'تغيرت حالة المراجعة أو بيانات الكتاب. أعد تحميل السجل ثم حاول مرة أخرى.' });
    return;
  }

  if (code === 'REVIEWER_NOT_AUTHORIZED') {
    res.status(403).json({ success: false, code, message: 'هذه العملية مقتصرة على المالك الموثق.' });
    return;
  }

  if (CLIENT_ERROR_CODES.has(code)) {
    res.status(400).json({ success: false, code, message: 'بيانات المراجعة غير صالحة أو لا تتوافق مع انتقال الحالة المسموح.' });
    return;
  }

  next(error);
}

export function createLibraryReviewRouter(dependencies: LibraryReviewRouterDependencies) {
  if (!dependencies.policyVersion.trim()) {
    throw new Error('LIBRARY_REVIEW_POLICY_VERSION_REQUIRED');
  }

  const router = Router();
  router.use(dependencies.authenticateToken, dependencies.requireOwnerRole);

  router.get('/', async (_req, res, next) => {
    try {
      const [candidates, summaries] = await Promise.all([
        Promise.resolve(dependencies.listCandidates()),
        dependencies.repository.listCurrentStates(),
      ]);
      const summariesById = new Map(summaries.map((summary) => [summary.candidateId, summary]));
      return res.json({
        success: true,
        policyVersion: dependencies.policyVersion,
        candidates: candidates.map((candidate) => safeSummary(candidate, summariesById.get(candidate.id) || null)),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:candidateId', async (req, res, next) => {
    try {
      const candidate = dependencies.resolveCandidate(req.params.candidateId);
      if (!candidate) {
        return res.status(404).json({ success: false, code: 'CANDIDATE_NOT_FOUND', message: 'الكتاب المرشح غير موجود في قائمة المراجعة الحالية.' });
      }
      const history = await dependencies.repository.getCandidateHistory(candidate.id);
      return res.json({
        success: true,
        candidate: safeCandidate(candidate),
        candidateFingerprint: fingerprintReviewCandidate(candidate),
        policyVersion: dependencies.policyVersion,
        editorial: safeState(history.editorial),
        rights: safeState(history.rights),
        events: history.events.map(safeEvent),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:candidateId/events', async (req, res, next) => {
    try {
      const candidate = dependencies.resolveCandidate(req.params.candidateId);
      if (!candidate) {
        return res.status(404).json({ success: false, code: 'CANDIDATE_NOT_FOUND', message: 'الكتاب المرشح غير موجود في قائمة المراجعة الحالية.' });
      }

      const user = (req as AuthenticatedRequest).user;
      if (typeof user?.uid !== 'string' || !user.uid || user.role !== 'owner' || user.email_verified !== true) {
        return res.status(403).json({ success: false, code: 'REVIEWER_NOT_AUTHORIZED', message: 'هذه العملية مقتصرة على المالك الموثق.' });
      }

      const body = isRecord(req.body) ? req.body : {};
      const dimension = body.dimension;
      if (dimension !== 'editorial' && dimension !== 'rights') {
        return res.status(400).json({ success: false, code: 'INVALID_REVIEW_DIMENSION', message: 'نوع المراجعة غير صالح.' });
      }

      const targetStatus = body.targetStatus;
      const allowedTargets = dimension === 'editorial' ? EDITORIAL_TARGETS : RIGHTS_TARGETS;
      if (typeof targetStatus !== 'string' || !allowedTargets.has(targetStatus)) {
        return res.status(400).json({ success: false, code: 'INVALID_REVIEW_STATUS', message: 'حالة المراجعة المطلوبة غير صالحة.' });
      }

      if (typeof body.note !== 'string' || !Array.isArray(body.evidenceReferences)) {
        return res.status(400).json({ success: false, code: 'INVALID_REVIEW_PAYLOAD', message: 'الملاحظة ومراجع الأدلة مطلوبة بصيغة صحيحة.' });
      }
      if (!Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 0) {
        return res.status(400).json({ success: false, code: 'INVALID_EXPECTED_VERSION', message: 'إصدار المراجعة المتوقع غير صالح.' });
      }

      const idempotencyKey = req.get('Idempotency-Key') || '';
      const result = await dependencies.repository.appendEvent({
        candidateId: candidate.id,
        dimension: dimension as LibraryReviewDimension,
        targetStatus: targetStatus as EditorialReviewStatus | RightsClearanceStatus,
        note: body.note,
        evidenceReferences: body.evidenceReferences,
        expectedVersion: Number(body.expectedVersion),
        reviewerUid: user.uid,
        reviewerRole: 'owner',
        candidateFingerprint: fingerprintReviewCandidate(candidate),
        policyVersion: dependencies.policyVersion,
        idempotencyKey,
      });

      return res.status(result.replayed ? 200 : 201).json({
        success: true,
        replayed: result.replayed,
        event: safeEvent(result.event),
        state: safeState(result.state),
      });
    } catch (error) {
      return mapReviewError(error, res, next);
    }
  });

  return router;
}
