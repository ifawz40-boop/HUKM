import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPublicLibraryEligible,
  isReviewSnapshotCurrent,
  transitionEditorialStatus,
  transitionRightsStatus,
  validateEvidenceReferences,
  validateReviewerNote,
} from './reviewWorkflow.ts';

const evidence = ['https://example.org/edition-record'];
const decisionNote = 'Reviewed the complete source and recorded the evidence for this decision.';

test('editorial workflow requires an explicit review before approval', () => {
  assert.equal(transitionEditorialStatus('pending', 'in_review', '', []), 'in_review');
  assert.equal(transitionEditorialStatus('in_review', 'approved', decisionNote, evidence), 'approved');
  assert.throws(
    () => transitionEditorialStatus('pending', 'approved', decisionNote, evidence),
    /INVALID_EDITORIAL_TRANSITION/,
  );
  assert.throws(
    () => transitionEditorialStatus('in_review', 'approved', '', evidence),
    /REVIEW_DECISION_REQUIRES_NOTE_AND_EVIDENCE/,
  );
  assert.throws(
    () => transitionEditorialStatus('in_review', 'approved', decisionNote, []),
    /REVIEW_DECISION_REQUIRES_NOTE_AND_EVIDENCE/,
  );
});

test('editorial reopen requires a documented explanation', () => {
  assert.throws(
    () => transitionEditorialStatus('approved', 'in_review', 'reopen', evidence),
    /REOPEN_REQUIRES_EXPLANATION_AND_EVIDENCE/,
  );
  assert.equal(
    transitionEditorialStatus('approved', 'in_review', decisionNote, evidence),
    'in_review',
  );
});

test('rights clearance is independent and requires evidence', () => {
  assert.equal(transitionRightsStatus('unknown', 'permission_requested', '', []), 'permission_requested');
  assert.throws(
    () => transitionRightsStatus('unknown', 'cleared', decisionNote, []),
    /REVIEW_DECISION_REQUIRES_NOTE_AND_EVIDENCE/,
  );
  assert.equal(transitionRightsStatus('unknown', 'cleared', decisionNote, evidence), 'cleared');
  assert.equal(
    transitionRightsStatus('unknown', 'public_domain_verified', decisionNote, evidence),
    'public_domain_verified',
  );
});

test('revoking or reopening a prior rights decision requires an explanation', () => {
  assert.throws(
    () => transitionRightsStatus('cleared', 'restricted', 'changed', evidence),
    /RIGHTS_REVOCATION_REQUIRES_EXPLANATION_AND_EVIDENCE/,
  );
  assert.throws(
    () => transitionRightsStatus('cleared', 'permission_requested', decisionNote, []),
    /RIGHTS_REVOCATION_REQUIRES_EXPLANATION_AND_EVIDENCE/,
  );
  assert.throws(
    () => transitionRightsStatus('restricted', 'permission_requested', decisionNote, []),
    /RIGHTS_REVOCATION_REQUIRES_EXPLANATION_AND_EVIDENCE/,
  );
  assert.equal(
    transitionRightsStatus('cleared', 'restricted', decisionNote, evidence),
    'restricted',
  );
  assert.throws(
    () => transitionRightsStatus('restricted', 'cleared', decisionNote, []),
    /REVIEW_DECISION_REQUIRES_NOTE_AND_EVIDENCE/,
  );
});

test('publication requires editorial approval, rights clearance and the Git allowlist', () => {
  const snapshot = { candidateFingerprint: 'a'.repeat(64), policyVersion: '1.0.0' };
  const current = { ...snapshot, allowlisted: true, editorialSnapshot: snapshot, rightsSnapshot: snapshot };
  assert.equal(isPublicLibraryEligible('approved', 'unknown', current), false);
  assert.equal(isPublicLibraryEligible('approved', 'cleared', { ...current, allowlisted: false }), false);
  assert.equal(isPublicLibraryEligible('in_review', 'cleared', current), false);
  assert.equal(isPublicLibraryEligible('approved', 'cleared', current), true);
  assert.equal(isPublicLibraryEligible('approved', 'public_domain_verified', current), true);
  assert.equal(isPublicLibraryEligible('approved', 'cleared', { ...current, rightsSnapshot: { ...snapshot, candidateFingerprint: 'b'.repeat(64) } }), false);
  assert.equal(isPublicLibraryEligible('approved', 'cleared', { ...current, editorialSnapshot: { ...snapshot, policyVersion: '0.9.0' } }), false);
});

test('review snapshots become stale when candidate metadata or policy changes', () => {
  const reviewed = { candidateFingerprint: 'a'.repeat(64), policyVersion: '1.0.0' };
  assert.equal(isReviewSnapshotCurrent(reviewed, reviewed), true);
  assert.equal(isReviewSnapshotCurrent(reviewed, { ...reviewed, candidateFingerprint: 'b'.repeat(64) }), false);
  assert.equal(isReviewSnapshotCurrent(reviewed, { ...reviewed, policyVersion: '1.0.1' }), false);
});

test('evidence references accept only unique HTTPS URLs without credentials', () => {
  assert.deepEqual(validateEvidenceReferences([
    'https://example.org/source',
    'https://example.org/source',
    'https://example.org/edition',
  ]), ['https://example.org/source', 'https://example.org/edition']);
  assert.throws(() => validateEvidenceReferences(['http://example.org']), /INVALID_REVIEW_EVIDENCE/);
  assert.throws(() => validateEvidenceReferences(['https://user:pass@example.org']), /INVALID_REVIEW_EVIDENCE/);
  assert.throws(() => validateEvidenceReferences(['javascript:alert(1)']), /INVALID_REVIEW_EVIDENCE/);
  assert.throws(() => validateEvidenceReferences(new Array(11).fill('https://example.org')), /INVALID_REVIEW_EVIDENCE/);
});

test('reviewer notes are bounded and reject invalid values', () => {
  assert.equal(validateReviewerNote('  evidence reviewed  '), 'evidence reviewed');
  assert.throws(() => validateReviewerNote('x'.repeat(3001)), /INVALID_REVIEW_NOTE/);
  assert.throws(() => validateReviewerNote(null), /INVALID_REVIEW_NOTE/);
  assert.throws(() => validateReviewerNote('invalid' + String.fromCharCode(0) + 'note'), /INVALID_REVIEW_NOTE/);
});
