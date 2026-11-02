import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toggleUserBookmark,
  getStoredCurrentUser,
  getStoredNotifications,
} from './authStorage.ts';
import type { UserProfile } from '../types/auth.ts';

describe('authStorage Utility Tests', () => {
  it('guarantees getStoredCurrentUser returns null (no mock owner bypass in local storage)', () => {
    assert.strictEqual(getStoredCurrentUser(), null);
  });

  it('correctly toggles bookmarks for authenticated user', () => {
    const testUser: UserProfile = {
      id: 'uid-test-1',
      name: 'Reader',
      email: 'reader@example.com',
      role: 'reader',
      emailVerified: true,
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

  it('provides default system notification without compromising user data', () => {
    const notifs = getStoredNotifications();
    assert.ok(Array.isArray(notifs));
    assert.ok(notifs.length > 0);
  });
});
