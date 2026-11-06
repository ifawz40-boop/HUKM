export type EditorialReviewStatus =
  | 'pending'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected';

export type RightsClearanceStatus =
  | 'unknown'
  | 'permission_requested'
  | 'cleared'
  | 'public_domain_verified'
  | 'restricted';

export interface ReviewSnapshot {
  candidateFingerprint: string;
  policyVersion: string;
}

export interface CurrentReviewContext extends ReviewSnapshot {
  allowlisted: boolean;
  editorialSnapshot: ReviewSnapshot;
  rightsSnapshot: ReviewSnapshot;
}

const EDITORIAL_TRANSITIONS: Record<EditorialReviewStatus, readonly EditorialReviewStatus[]> = {
  pending: ['in_review'],
  in_review: ['approved', 'rejected', 'changes_requested'],
  changes_requested: ['in_review', 'rejected'],
  approved: ['in_review'],
  rejected: ['in_review'],
};

const RIGHTS_TRANSITIONS: Record<RightsClearanceStatus, readonly RightsClearanceStatus[]> = {
  unknown: ['permission_requested', 'cleared', 'public_domain_verified', 'restricted'],
  permission_requested: ['unknown', 'cleared', 'restricted'],
  cleared: ['permission_requested', 'restricted'],
  public_domain_verified: ['permission_requested', 'restricted'],
  restricted: ['permission_requested', 'cleared', 'public_domain_verified'],
};

const MIN_DECISION_NOTE_LENGTH = 20;
const MAX_NOTE_LENGTH = 3000;
const MAX_EVIDENCE_REFERENCES = 10;
const MAX_EVIDENCE_URL_LENGTH = 2048;

export function validateReviewerNote(value: unknown): string {
  if (typeof value !== 'string') throw new Error('INVALID_REVIEW_NOTE');
  const note = value.trim();
  if (note.length > MAX_NOTE_LENGTH || note.includes('\0')) {
    throw new Error('INVALID_REVIEW_NOTE');
  }
  return note;
}

export function validateEvidenceReferences(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_EVIDENCE_REFERENCES) {
    throw new Error('INVALID_REVIEW_EVIDENCE');
  }

  const normalized = value.map((entry) => {
    if (typeof entry !== 'string') throw new Error('INVALID_REVIEW_EVIDENCE');
    const raw = entry.trim();
    if (!raw || raw.length > MAX_EVIDENCE_URL_LENGTH) throw new Error('INVALID_REVIEW_EVIDENCE');

    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error('INVALID_REVIEW_EVIDENCE');
    }

    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      throw new Error('INVALID_REVIEW_EVIDENCE');
    }
    return parsed.toString();
  });

  return [...new Set(normalized)];
}

function requireDecisionEvidence(note: string, evidenceReferences: readonly string[]): void {
  if (note.length < MIN_DECISION_NOTE_LENGTH || evidenceReferences.length === 0) {
    throw new Error('REVIEW_DECISION_REQUIRES_NOTE_AND_EVIDENCE');
  }
}

export function transitionEditorialStatus(
  current: EditorialReviewStatus,
  next: EditorialReviewStatus,
  noteValue: unknown,
  evidenceValue: unknown,
): EditorialReviewStatus {
  if (!EDITORIAL_TRANSITIONS[current]?.includes(next)) {
    throw new Error('INVALID_EDITORIAL_TRANSITION');
  }

  const note = validateReviewerNote(noteValue);
  const evidence = validateEvidenceReferences(evidenceValue);

  if (next === 'approved' || next === 'rejected' || next === 'changes_requested') {
    requireDecisionEvidence(note, evidence);
  }

  if ((current === 'approved' || current === 'rejected') && next === 'in_review' && (note.length < MIN_DECISION_NOTE_LENGTH || evidence.length === 0)) {
    throw new Error('REOPEN_REQUIRES_EXPLANATION_AND_EVIDENCE');
  }

  return next;
}

export function transitionRightsStatus(
  current: RightsClearanceStatus,
  next: RightsClearanceStatus,
  noteValue: unknown,
  evidenceValue: unknown,
): RightsClearanceStatus {
  if (!RIGHTS_TRANSITIONS[current]?.includes(next)) {
    throw new Error('INVALID_RIGHTS_TRANSITION');
  }

  const note = validateReviewerNote(noteValue);
  const evidence = validateEvidenceReferences(evidenceValue);

  if (next === 'cleared' || next === 'public_domain_verified' || next === 'restricted') {
    requireDecisionEvidence(note, evidence);
  }

  if (
    ((current === 'cleared' || current === 'public_domain_verified') &&
      (next === 'permission_requested' || next === 'restricted')) ||
    (current === 'restricted' && next === 'permission_requested')
  ) {
    if (note.length < MIN_DECISION_NOTE_LENGTH || evidence.length === 0) {
      throw new Error('RIGHTS_REVOCATION_REQUIRES_EXPLANATION_AND_EVIDENCE');
    }
  }

  return next;
}

export function isReviewSnapshotCurrent(
  review: ReviewSnapshot,
  current: ReviewSnapshot,
): boolean {
  return /^[a-f0-9]{64}$/i.test(review.candidateFingerprint) &&
    Boolean(review.policyVersion) &&
    review.candidateFingerprint === current.candidateFingerprint &&
    review.policyVersion === current.policyVersion;
}

/**
 * Editorial approval is not publication. Rights clearance is an independent gate,
 * and the final public catalogue still requires an explicit Git allowlist entry.
 */
export function isPublicLibraryEligible(
  editorialStatus: EditorialReviewStatus,
  rightsStatus: RightsClearanceStatus,
  context: CurrentReviewContext,
): boolean {
  const currentSnapshot = {
    candidateFingerprint: context.candidateFingerprint,
    policyVersion: context.policyVersion,
  };
  return editorialStatus === 'approved' &&
    (rightsStatus === 'cleared' || rightsStatus === 'public_domain_verified') &&
    context.allowlisted === true &&
    isReviewSnapshotCurrent(context.editorialSnapshot, currentSnapshot) &&
    isReviewSnapshotCurrent(context.rightsSnapshot, currentSnapshot);
}
