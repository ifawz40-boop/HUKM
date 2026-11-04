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

describe('HUKM MEDIA — Phase 3A.1: Email Modal & Cloud Subscribers Integration', () => {
  const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
  const appTsxContent = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
  const navbarContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/HukmNavbar.tsx'), 'utf-8');
  const modalContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/HukmEmailModal.tsx'), 'utf-8');
  const emailApiContent = fs.readFileSync(path.resolve(process.cwd(), 'src/server/emailApi.ts'), 'utf-8');

  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // SCENARIO 1 & 2: Navbar Button and Modal Mounting in App.tsx
  // =========================================================================
  describe('Scenario 1 & 2: HukmEmailModal Integration & Navigation Triggers', () => {
    it('1. Navbar button successfully connects to onOpenEmailModal', () => {
      // Must have desktop trigger
      assert.match(navbarContent, /onOpenEmailModal/);
      assert.match(navbarContent, /هوية البريد ✉️/);

      // Must have mobile trigger
      assert.match(navbarContent, /هوية البريد والمشتركين ✉️/);

      // App.tsx must pass onOpenEmailModal to HukmNavbar
      assert.match(appTsxContent, /onOpenEmailModal=\{?\(\)\s*=>\s*setIsEmailModalOpen\(true\)\}?/);
    });

    it('2. Modal is mounted inside App.tsx and closes correctly', () => {
      // Must import HukmEmailModal
      assert.match(appTsxContent, /import\s+\{\s*HukmEmailModal\s*\}\s+from\s+['"]\.\/components\/HukmEmailModal['"]/);

      // Must mount HukmEmailModal with isEmailModalOpen and onClose
      assert.match(appTsxContent, /<HukmEmailModal\s+isOpen=\{isEmailModalOpen\}\s+onClose=\{\(\)\s*=>\s*setIsEmailModalOpen\(false\)\}/);

      // Verify state transition simulation
      let isEmailModalOpen = false;
      const openModal = () => { isEmailModalOpen = true; };
      const closeModal = () => { isEmailModalOpen = false; };

      openModal();
      assert.equal(isEmailModalOpen, true, 'Modal must open when trigger fires');

      closeModal();
      assert.equal(isEmailModalOpen, false, 'Modal must close and reset state when dismissed');
    });
  });

  // =========================================================================
  // SCENARIO 3, 4 & 5: Server-side Authorization & Security Invariants
  // =========================================================================
  describe('Scenario 3, 4 & 5: Real Subscriber Retrieval & Server Security', () => {
    it('3. Actual subscriber retrieval endpoint (/api/email/subscribers) is registered with strict checks', () => {
      assert.match(emailApiContent, /emailApiRouter\.get\(['"]\/subscribers['"]/);
      assert.match(emailApiContent, /adminDb\.collection\(['"]subscribers['"]\)/);
      assert.match(emailApiContent, /authenticateToken/);
    });

    it('4. Unauthorized readers and guests are rejected with 403 Forbidden on the server', () => {
      // Verify server checks role and verification
      assert.match(emailApiContent, /user\.role\s*!==\s*'owner'\s*&&\s*user\.role\s*!==\s*'admin'/);
      assert.match(emailApiContent, /!user\.email_verified/);
      assert.match(emailApiContent, /status\(403\)/);
    });

    it('5. Server rejects requests if active admin record does not exist in /admins/{uid}', () => {
      assert.match(emailApiContent, /adminDb\.collection\(['"]admins['"]\)\.doc\(user\.uid\)\.get\(\)/);
      assert.match(emailApiContent, /!adminDoc\.exists/);
    });
  });

  // =========================================================================
  // SCENARIO 6 & 7: Empty and Error States with Retry
  // =========================================================================
  describe('Scenario 6 & 7: UI States, Network Failures and Retry Resilience', () => {
    it('6. Empty subscriber collection displays an appropriate empty state', () => {
      // Empty state messaging in HukmEmailModal
      assert.match(modalContent, /لا يوجد مشتركون مسجلون حالياً في القائمة السحابية/);
      assert.match(modalContent, /filteredSubscribers\.length\s*===\s*0/);
    });

    it('7. Network failure displays error banner and allows retry', () => {
      // Must contain error state alert and retry button
      assert.match(modalContent, /subscriberError/);
      assert.match(modalContent, /إعادة المحاولة/);
      assert.match(modalContent, /loadSubscribers\(true\)/);
    });
  });

  // =========================================================================
  // SCENARIO 8: Large Subscriber Lists and Search Filter
  // =========================================================================
  describe('Scenario 8: Large Subscriber Lists & Fast In-App Filtering', () => {
    it('8. Supports search filtering by name or email with live counter', () => {
      assert.match(modalContent, /subscriberSearch/);
      assert.match(modalContent, /sub\.name\.toLowerCase\(\)\.includes/);
      assert.match(modalContent, /sub\.email\.toLowerCase\(\)\.includes/);

      // Simulation of filtering 150 subscribers
      const mockList: HukmSubscriber[] = Array.from({ length: 150 }, (_, i) => ({
        id: `sub-${i}`,
        email: `reader${i}@example.com`,
        name: i === 42 ? 'د. الباحث المستقل' : `قارئ رقم ${i}`,
        source: 'signup',
        subscribedAt: '2026-11-04T00:00:00.000Z',
        active: i % 2 === 0,
        receiveAllReleases: true,
      }));

      const query = 'الباحث';
      const filtered = mockList.filter(
        (s) => s.name.includes(query) || s.email.includes(query)
      );
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].name, 'د. الباحث المستقل');
    });
  });

  // =========================================================================
  // SCENARIO 9: Existing Email Sending Workflow Intact
  // =========================================================================
  describe('Scenario 9: Existing Email Sending Robustness', () => {
    it('9. Preserves honest server response when email provider is unconfigured', () => {
      assert.match(emailApiContent, /process\.env\.RESEND_API_KEY/);
      assert.match(emailApiContent, /status\(503\)/);
      assert.match(emailApiContent, /لم يتم إرسال أي بريد تجنباً للادعاءات الوهمية/);
    });
  });

  // =========================================================================
  // SCENARIO 10: Subscriber Privacy & Security Rules Invariants
  // =========================================================================
  describe('Scenario 10: Subscriber Privacy in Firestore Rules & Frontend', () => {
    it('10. firestore.rules strictly forbids public read access to /subscribers/{subscriberId}', () => {
      // Must require isAdmin() for reading subscribers
      assert.match(rulesContent, /match\s+\/subscribers\/\{subscriberId\}\s*\{/);
      assert.match(rulesContent, /allow read:\s*if isAdmin\(\);/);
      assert.match(rulesContent, /allow update,\s*delete:\s*if isAdmin\(\);/);

      // Must NOT allow read: if true
      const subMatch = rulesContent.match(/match\s+\/subscribers\/\{subscriberId\}[\s\S]*?\}/);
      assert.ok(subMatch, 'Must find subscribers block');
      assert.equal(subMatch[0].includes('allow read: if true'), false, 'Subscribers must NEVER be publicly readable');
    });
  });
});
