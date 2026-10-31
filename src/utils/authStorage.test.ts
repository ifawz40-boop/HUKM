import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isOwner,
  isAuthorizedOwnerEmail,
  canSwitchViewMode,
  toggleUserBookmark,
  getStoredCurrentUser,
} from './authStorage';
import { UserProfile } from '../types/auth';

describe('Hardened Auth & Permission Security Tests', () => {
  it('strictly verifies owner authorization only for dr.islam.mohamed@hukm.media and ifawz40@gmail.com', () => {
    assert.strictEqual(isAuthorizedOwnerEmail('dr.islam.mohamed@hukm.media'), true);
    assert.strictEqual(isAuthorizedOwnerEmail('DR.ISLAM.MOHAMED@HUKM.MEDIA '), true);
    assert.strictEqual(isAuthorizedOwnerEmail('ifawz40@gmail.com'), true);
    assert.strictEqual(isAuthorizedOwnerEmail('IFAWZ40@GMAIL.COM '), true);

    // Unauthenticated or arbitrary emails must be rejected
    assert.strictEqual(isAuthorizedOwnerEmail('reader@hukm.media'), false);
    assert.strictEqual(isAuthorizedOwnerEmail('random_hacker@gmail.com'), false);
    assert.strictEqual(isAuthorizedOwnerEmail(null), false);
    assert.strictEqual(isAuthorizedOwnerEmail(undefined), false);
  });

  it('verifies isOwner only when email is authorized AND role is owner/admin', () => {
    const validFounder: UserProfile = {
      id: 'uid-founder-1',
      name: 'Dr. Islam Mohamed',
      email: 'dr.islam.mohamed@hukm.media',
      role: 'owner',
      joinedDate: '2026-01-01',
      bookmarks: [],
      readHistory: [],
    };
    assert.strictEqual(isOwner(validFounder), true);

    const validManagingAdmin: UserProfile = {
      id: 'uid-admin-1',
      name: 'Ibrahim Fawzy',
      email: 'ifawz40@gmail.com',
      role: 'admin',
      joinedDate: '2026-01-01',
      bookmarks: [],
      readHistory: [],
    };
    assert.strictEqual(isOwner(validManagingAdmin), true);

    // Spoofed role without authorized email must fail
    const spoofedUser: UserProfile = {
      id: 'uid-spoof-1',
      name: 'Imposter',
      email: 'attacker@gmail.com',
      role: 'owner',
      joinedDate: '2026-01-01',
      bookmarks: [],
      readHistory: [],
    };
    assert.strictEqual(isOwner(spoofedUser), false);

    // Normal reader must fail
    const regularReader: UserProfile = {
      id: 'uid-reader-1',
      name: 'Karim Reader',
      email: 'karim@gmail.com',
      role: 'reader',
      joinedDate: '2026-01-01',
      bookmarks: [],
      readHistory: [],
    };
    assert.strictEqual(isOwner(regularReader), false);
    assert.strictEqual(isOwner(null), false);
    assert.strictEqual(isOwner(undefined), false);
  });

  it('guarantees getStoredCurrentUser returns null (no mock owner bypass in local storage)', () => {
    assert.strictEqual(getStoredCurrentUser(), null);
  });

  it('correctly toggles bookmarks for authenticated user', () => {
    const testUser: UserProfile = {
      id: 'uid-test-1',
      name: 'Reader',
      email: 'reader@example.com',
      role: 'reader',
      joinedDate: '2026-01-01',
      bookmarks: ['book-1'],
      readHistory: [],
    };

    const added = toggleUserBookmark(testUser, 'book-2');
    assert.ok(added.bookmarks.includes('book-2'));
    assert.ok(added.bookmarks.includes('book-1'));

    const removed = toggleUserBookmark(added, 'book-1');
    assert.strictEqual(removed.bookmarks.includes('book-1'), false);
    assert.strictEqual(removed.bookmarks.includes('book-2'), true);
  });
});
