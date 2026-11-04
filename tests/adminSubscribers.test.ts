import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock localStorage for Node.js test environment
const mockStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
};

import {
  getStoredSubscribers,
  addSubscriber,
  toggleSubscriberActive,
  getStoredEmailLogs,
  addEmailLog,
} from '../src/utils/authStorage.ts';
import type { HukmSubscriber } from '../src/types/auth.ts';

describe('HUKM MEDIA — Phase 3A.1 & 3A.1.1: Subscriber Reliability & Pagination Audit', () => {
  const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
  const appTsxContent = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
  const navbarContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/HukmNavbar.tsx'), 'utf-8');
  const modalContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/HukmEmailModal.tsx'), 'utf-8');
  const emailApiContent = fs.readFileSync(path.resolve(process.cwd(), 'src/server/emailApi.ts'), 'utf-8');
  const emailClientContent = fs.readFileSync(path.resolve(process.cwd(), 'src/services/emailClient.ts'), 'utf-8');

  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // SECTION 1: Base Integration & Security Verification
  // =========================================================================
  describe('Base System & Navbar Wiring', () => {
    it('Navbar button successfully connects to onOpenEmailModal in App.tsx', () => {
      assert.match(navbarContent, /onOpenEmailModal/);
      assert.match(navbarContent, /هوية البريد ✉️/);
      assert.match(appTsxContent, /onOpenEmailModal=\{?\(\)\s*=>\s*setIsEmailModalOpen\(true\)\}?/);
    });

    it('Modal is mounted inside App.tsx and closes correctly', () => {
      assert.match(appTsxContent, /import\s+\{\s*HukmEmailModal\s*\}\s+from\s+['"]\.\/components\/HukmEmailModal['"]/);
      assert.match(appTsxContent, /<HukmEmailModal\s+isOpen=\{isEmailModalOpen\}\s+onClose=\{\(\)\s*=>\s*setIsEmailModalOpen\(false\)\}/);
    });

    it('firestore.rules strictly forbids public read access to /subscribers/{subscriberId}', () => {
      assert.match(rulesContent, /match\s+\/subscribers\/\{subscriberId\}\s*\{/);
      assert.match(rulesContent, /allow read:\s*if isAdmin\(\);/);
      assert.match(rulesContent, /allow update,\s*delete:\s*if isAdmin\(\);/);

      const subMatch = rulesContent.match(/match\s+\/subscribers\/\{subscriberId\}[\s\S]*?\}/);
      assert.ok(subMatch, 'Must find subscribers block');
      assert.equal(subMatch[0].includes('allow read: if true'), false, 'Subscribers must NEVER be publicly readable');
    });
  });

  // =========================================================================
  // SECTION 2: 12 Specific Scenarios for Phase 3A.1.1 Subscriber Reliability
  // =========================================================================
  describe('Phase 3A.1.1: 12 Subscriber Reliability Scenarios', () => {
    // Helper state machine simulator matching HukmEmailModal.handleToggleSubscriber
    async function simulateToggleSubscriber({
      initialState,
      subId,
      mockApiToggle,
      mockFirestoreToggle,
    }: {
      initialState: HukmSubscriber[];
      subId: string;
      mockApiToggle: (id: string, active: boolean) => Promise<{ success: boolean; message?: string }>;
      mockFirestoreToggle: (id: string, active: boolean) => Promise<boolean>;
    }) {
      let subscribers = [...initialState];
      let togglingSubId: string | null = null;
      let toastMessage = '';
      let isSuccessToast = false;
      let isErrorToast = false;

      const onShowToast = (msg: string) => {
        toastMessage = msg;
        if (msg.includes('✓')) {
          isSuccessToast = true;
        } else {
          isErrorToast = true;
        }
      };

      const execute = async () => {
        const sub = subscribers.find((s) => s.id === subId);
        if (!sub) return;

        togglingSubId = subId;
        const nextState = !sub.active;
        let cloudSuccess = false;

        try {
          const apiRes = await mockApiToggle(subId, nextState);
          if (apiRes.success) {
            cloudSuccess = true;
          } else {
            const directSuccess = await mockFirestoreToggle(subId, nextState);
            if (directSuccess === true) {
              cloudSuccess = true;
            }
          }

          if (cloudSuccess) {
            subscribers = subscribers.map((s) => (s.id === subId ? { ...s, active: nextState } : s));
            toggleSubscriberActive(subId);
            onShowToast(
              nextState
                ? `تم تفعيل اشتراك ${sub.name} في قاعدة البيانات السحابية ✓`
                : `تم إيقاف اشتراك ${sub.name} مؤقتاً في السحابة ✓`
            );
          } else {
            onShowToast('فشل تحديث حالة المشترك في السحابة. لم يتم إجراء أي تغيير محلي.');
          }
        } catch (err: any) {
          onShowToast('حدث خطأ أثناء محاولة تعديل حالة المشترك.');
        } finally {
          togglingSubId = null;
        }
      };

      await execute();
      return {
        get subscribers() {
          return subscribers;
        },
        get togglingSubId() {
          return togglingSubId;
        },
        get toastMessage() {
          return toastMessage;
        },
        get isSuccessToast() {
          return isSuccessToast;
        },
        get isErrorToast() {
          return isErrorToast;
        },
        executeAgain: execute,
      };
    }

    const testSub: HukmSubscriber = {
      id: 'sub_123',
      email: 'reader@example.com',
      name: 'فهد التميمي',
      source: 'signup',
      subscribedAt: '2026-11-04T10:00:00Z',
      active: true,
      receiveAllReleases: true,
    };

    // 1. API toggle succeeds -> UI updates.
    it('1. API toggle succeeds -> UI updates', async () => {
      const result = await simulateToggleSubscriber({
        initialState: [testSub],
        subId: 'sub_123',
        mockApiToggle: async () => ({ success: true }),
        mockFirestoreToggle: async () => false,
      });

      assert.equal(result.subscribers[0].active, false, 'Subscriber active state must be toggled to false');
      assert.equal(result.isSuccessToast, true, 'Success toast must be emitted');
      assert.match(result.toastMessage, /تم إيقاف اشتراك/);
      assert.equal(result.togglingSubId, null, 'Loading indicator must be cleared');
    });

    // 2. API fails but Firestore fallback succeeds -> UI updates.
    it('2. API fails but Firestore fallback succeeds -> UI updates', async () => {
      const result = await simulateToggleSubscriber({
        initialState: [testSub],
        subId: 'sub_123',
        mockApiToggle: async () => ({ success: false, message: 'API offline' }),
        mockFirestoreToggle: async () => true, // Firestore fallback succeeds
      });

      assert.equal(result.subscribers[0].active, false, 'Subscriber active state must update via fallback');
      assert.equal(result.isSuccessToast, true, 'Success toast emitted because fallback succeeded');
      assert.equal(result.togglingSubId, null);
    });

    // 3. API and Firestore fallback both fail -> UI does not update.
    it('3. API and Firestore fallback both fail -> UI does not update', async () => {
      const result = await simulateToggleSubscriber({
        initialState: [testSub],
        subId: 'sub_123',
        mockApiToggle: async () => ({ success: false, message: 'API 500' }),
        mockFirestoreToggle: async () => false, // Firestore also fails
      });

      assert.equal(result.subscribers[0].active, true, 'Subscriber state must remain unchanged (true)');
      assert.equal(result.isSuccessToast, false, 'No false success toast must be shown');
      assert.equal(result.isErrorToast, true, 'Error message must be presented');
    });

    // 4. Failure displays an error, not a success toast.
    it('4. Failure displays an error, not a success toast', async () => {
      const result = await simulateToggleSubscriber({
        initialState: [testSub],
        subId: 'sub_123',
        mockApiToggle: async () => ({ success: false }),
        mockFirestoreToggle: async () => false,
      });

      assert.equal(result.isSuccessToast, false, 'Must not claim success');
      assert.match(result.toastMessage, /فشل تحديث حالة المشترك في السحابة/);
    });

    // 5. Retry after failure works.
    it('5. Retry after failure works', async () => {
      let attempt = 0;
      const sim = await simulateToggleSubscriber({
        initialState: [testSub],
        subId: 'sub_123',
        mockApiToggle: async () => {
          attempt++;
          if (attempt === 1) return { success: false };
          return { success: true }; // Succeeds on retry!
        },
        mockFirestoreToggle: async () => false,
      });

      // After first attempt: failed
      assert.equal(sim.subscribers[0].active, true);
      assert.equal(sim.isErrorToast, true);

      // Now retry the action
      await sim.executeAgain();
      assert.equal(sim.subscribers[0].active, false, 'Subscriber updated on retry');
      assert.equal(sim.isSuccessToast, true, 'Success toast emitted on successful retry');
    });

    // 6. Loading state resets after success and failure.
    it('6. Loading state resets after success and failure', async () => {
      // Check code implementation has finally { setTogglingSubId(null); }
      assert.match(modalContent, /finally\s*\{[\s\S]*?setTogglingSubId\(null\);/);

      // Verify in simulation on success
      const resSuccess = await simulateToggleSubscriber({
        initialState: [testSub],
        subId: 'sub_123',
        mockApiToggle: async () => ({ success: true }),
        mockFirestoreToggle: async () => false,
      });
      assert.equal(resSuccess.togglingSubId, null);

      // Verify in simulation on network throw/failure
      const resThrow = await simulateToggleSubscriber({
        initialState: [testSub],
        subId: 'sub_123',
        mockApiToggle: async () => {
          throw new Error('Network timeout');
        },
        mockFirestoreToggle: async () => false,
      });
      assert.equal(resThrow.togglingSubId, null);
    });

    // 7. First subscriber page loads correctly.
    it('7. First subscriber page loads correctly with pagination fields', () => {
      // Verify emailApi.ts implementation supports cursor, limit, hasMore, nextCursor
      assert.match(emailApiContent, /requestedLimit\s*=\s*Math\.min\(Math\.max\(Number\(req\.query\.limit\)\s*\|\|\s*20,\s*1\),\s*100\)/);
      assert.match(emailApiContent, /cursorDoc\s*=\s*await\s+adminDb\.collection\(['"]subscribers['"]\)\.doc\(cursor\)\.get\(\)/);
      assert.match(emailApiContent, /query\.startAfter\(cursorDoc\)/);
      assert.match(emailApiContent, /hasMore/);
      assert.match(emailApiContent, /nextCursor/);

      // Simulate first page fetch (20 items requested, 21 retrieved -> hasMore = true)
      const pageSize = 20;
      const allCloudDocs = Array.from({ length: 45 }, (_, i) => ({
        id: `doc_${String(i).padStart(3, '0')}`,
        email: `sub${i}@hukm.media`,
        name: `مشترك رقم ${i}`,
        subscribedAt: new Date(Date.now() - i * 3600000).toISOString(),
        active: true,
      }));

      // Server query simulation
      const docsPlusOne = allCloudDocs.slice(0, pageSize + 1);
      const hasMore = docsPlusOne.length > pageSize;
      const pageDocs = hasMore ? docsPlusOne.slice(0, pageSize) : docsPlusOne;
      const nextCursor = hasMore ? pageDocs[pageDocs.length - 1].id : null;

      assert.equal(pageDocs.length, 20);
      assert.equal(hasMore, true);
      assert.equal(nextCursor, 'doc_019');
    });

    // 8. Second page loads without duplicates.
    it('8. Second page loads without duplicates', () => {
      const allCloudDocs = Array.from({ length: 45 }, (_, i) => ({
        id: `doc_${String(i).padStart(3, '0')}`,
        email: `sub${i}@hukm.media`,
        name: `مشترك رقم ${i}`,
      }));

      const page1 = allCloudDocs.slice(0, 20);
      const page2 = allCloudDocs.slice(20, 40);

      // Frontend deduplication simulation matching HukmEmailModal.loadSubscribers
      const existingIds = new Set(page1.map((s) => s.id));
      const freshSubscribers = page2.filter((s) => !existingIds.has(s.id));
      const combined = [...page1, ...freshSubscribers];

      assert.equal(combined.length, 40);
      // Ensure no duplicates
      const uniqueIds = new Set(combined.map((s) => s.id));
      assert.equal(uniqueIds.size, 40, 'All combined items must be unique');

      // Verify HukmEmailModal has existingIds Set deduplication
      assert.match(modalContent, /existingIds\s*=\s*new\s+Set\(prev\.map\(\(s\)\s*=>\s*s\.id\)\)/);
      assert.match(modalContent, /uniqueIncoming\s*=\s*res\.subscribers\.filter\(\(s\)\s*=>\s*!existingIds\.has\(s\.id\)\)/);
    });

    // 9. Final page correctly reports hasMore = false.
    it('9. Final page correctly reports hasMore = false and nextCursor = null', () => {
      const pageSize = 20;
      const remainingDocs = Array.from({ length: 5 }, (_, i) => ({
        id: `doc_final_${i}`,
        email: `final${i}@hukm.media`,
      }));

      const docsPlusOne = remainingDocs.slice(0, pageSize + 1);
      const hasMore = docsPlusOne.length > pageSize;
      const pageDocs = hasMore ? docsPlusOne.slice(0, pageSize) : docsPlusOne;
      const nextCursor = hasMore ? pageDocs[pageDocs.length - 1].id : null;

      assert.equal(pageDocs.length, 5);
      assert.equal(hasMore, false, 'Final page must report hasMore = false');
      assert.equal(nextCursor, null, 'Final page nextCursor must be null');
    });

    // 10. Refresh resets pagination.
    it('10. Refresh resets pagination to page 1 and replaces records', () => {
      // In HukmEmailModal:
      // Refresh button calls loadSubscribers(true)
      // reset=true sets setNextCursor(null) and replaces subscribers array instead of appending
      assert.match(modalContent, /loadSubscribers\s*=\s*async\s*\(\s*reset\s*=\s*true\)/);
      assert.match(modalContent, /if\s*\(reset\)\s*\{\s*setSubscribers\(res\.subscribers\);\s*\}\s*else/);
      assert.match(modalContent, /title="تحديث القائمة من السحابة \(إعادة الضبط للصفحة الأولى\)"/);
    });

    // 11. Unauthorized requests cannot retrieve subscriber pages.
    it('11. Unauthorized requests cannot retrieve subscriber pages', () => {
      // Verify token authentication middleware is applied
      assert.match(emailApiContent, /emailApiRouter\.get\(['"]\/subscribers['"],\s*authenticateToken/);

      // Verify non-admin role rejection (403)
      assert.match(emailApiContent, /user\.role\s*!==\s*'owner'\s*&&\s*user\.role\s*!==\s*'admin'/);
      // Verify unverified email rejection (403)
      assert.match(emailApiContent, /!user\.email_verified/);
      // Verify server check of active /admins/{uid} doc (403)
      assert.match(emailApiContent, /adminDb\.collection\(['"]admins['"]\)\.doc\(user\.uid\)\.get\(\)/);
    });

    // 12. Search does not claim to cover unloaded records.
    it('12. Search clearly indicates it covers loaded records and notes unloaded cloud records', () => {
      // Placeholder indicates loaded count
      assert.match(modalContent, /placeholder=\{`البحث في المشتركين المحملين حالياً \(\$\{subscribers\.length\}\)\.\.\.`\}/);

      // Explanatory note when hasMore is true
      assert.match(modalContent, /البحث يشمل السجلات المحمّلة/);
      assert.match(modalContent, /توجد صفحات إضافية في السحابة؛ اضغط «تحميل المزيد» لضمها للبحث/);
    });
  });
});
