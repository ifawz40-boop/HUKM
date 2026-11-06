function withIsolatedLocalStorage<T>(callback: (storage: Storage) => T): T {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.has(key) ? values.get(key)! : null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() { return values.size; },
  } as Storage;
  const previous = (globalThis as any).localStorage;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    return callback(storage);
  } finally {
    if (previous === undefined) delete (globalThis as any).localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previous });
  }
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toggleUserBookmark,
  getStoredCurrentUser,
  getStoredNotifications,
  saveStoredNotifications,
  getNotificationStorageKey,
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

  it('does not invent a default notification when the account has no announcements', () => {
    withIsolatedLocalStorage(() => {
      assert.deepEqual(getStoredNotifications(), []);
    });
  });

  it('isolates notification read state between guest and different user accounts', () => {
    withIsolatedLocalStorage(() => {
      const userANotification = {
        id: 'announcement-1',
        title: 'إعلان حُكم',
        message: 'رسالة عامة',
        type: 'announcement' as const,
        timestamp: '2026-11-06T00:00:00.000Z',
        read: true,
        targetRole: 'all' as const,
      };
      saveStoredNotifications([userANotification], 'user-A');
      assert.deepEqual(getStoredNotifications('user-A'), [userANotification]);
      assert.deepEqual(getStoredNotifications('user-B'), []);
      assert.deepEqual(getStoredNotifications(), []);
      assert.equal(getNotificationStorageKey('user-A') === getNotificationStorageKey('user-B'), false);
    });
  });

  it('removes the old global pseudo-notification cache rather than leaking it to accounts', () => {
    withIsolatedLocalStorage((storage) => {
      storage.setItem('hukm_notifications_v1', JSON.stringify([{
        id: 'notif-welcome',
        title: 'fake default',
      }]));
      assert.deepEqual(getStoredNotifications('user-A'), []);
      assert.equal(storage.getItem('hukm_notifications_v1'), null);
    });
  });
});
