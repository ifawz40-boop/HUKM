import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isOwner,
  isAuthorizedOwnerEmail,
  canSwitchViewMode,
  toggleUserBookmark,
  OWNER_USER,
  DEMO_READER_USER,
  OWNER_EMAIL,
} from './authStorage';

describe('Auth & Permission Engine Tests', () => {
  it('correctly verifies Owner role exclusively for ifawz40@gmail.com', () => {
    assert.strictEqual(isAuthorizedOwnerEmail('ifawz40@gmail.com'), true);
    assert.strictEqual(isAuthorizedOwnerEmail('IFAWZ40@GMAIL.COM '), true);
    assert.strictEqual(isAuthorizedOwnerEmail('reader@hukm.media'), false);
    assert.strictEqual(isAuthorizedOwnerEmail('random_user@gmail.com'), false);

    assert.strictEqual(isOwner(OWNER_USER), true);
    assert.strictEqual(isOwner({ ...DEMO_READER_USER, email: 'ifawz40@gmail.com' }), true);
  });

  it('strictly limits view mode switching privilege to ifawz40@gmail.com only', () => {
    assert.strictEqual(canSwitchViewMode(OWNER_USER), true);
    assert.strictEqual(canSwitchViewMode({ ...DEMO_READER_USER, email: 'ifawz40@gmail.com' }), true);

    // Regular reader cannot switch view mode
    assert.strictEqual(canSwitchViewMode(DEMO_READER_USER), false);
    assert.strictEqual(canSwitchViewMode({ ...OWNER_USER, email: 'other@gmail.com' }), false);
    assert.strictEqual(canSwitchViewMode(null), false);
    assert.strictEqual(canSwitchViewMode(undefined), false);
  });

  it('correctly verifies Reader role has no admin permissions', () => {
    assert.strictEqual(isOwner(DEMO_READER_USER), false);
    assert.strictEqual(isOwner(null), false);
    assert.strictEqual(isOwner(undefined), false);
  });

  it('correctly toggles bookmarks for a user', () => {
    const user = { ...DEMO_READER_USER, bookmarks: ['book-1'] };
    // Adding book-2
    const withBook2 = toggleUserBookmark(user, 'book-2');
    assert.ok(withBook2.bookmarks.includes('book-2'));
    assert.ok(withBook2.bookmarks.includes('book-1'));

    // Removing book-1
    const withoutBook1 = toggleUserBookmark(withBook2, 'book-1');
    assert.strictEqual(withoutBook1.bookmarks.includes('book-1'), false);
    assert.strictEqual(withoutBook1.bookmarks.includes('book-2'), true);
  });
});

