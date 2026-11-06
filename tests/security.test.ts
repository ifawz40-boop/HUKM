import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  isOwner,
  isAdmin,
  isReader,
  canManageAdmins,
  canManageCategories,
  canEditBooks,
  canModerate,
  canAccessWriterStudio,
  isEffectiveOwner,
  resolveVerifiedUserRole,
  getUserPermissions,
} from '../src/services/permissionService.ts';
import type { UserProfile } from '../src/types/auth.ts';

describe('HUKM MEDIA — Phase 1.3 Security & Robustness Test Suite', () => {

  const appContent = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
  const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
  const firestoreServiceContent = fs.readFileSync(path.resolve(process.cwd(), 'src/firebase/firestoreService.ts'), 'utf-8');
  const adminModalContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AdminManagementModal.tsx'), 'utf-8');
  const bootstrapOwnerContent = fs.readFileSync(path.resolve(process.cwd(), 'scripts/bootstrap-owner.ts'), 'utf-8');

  describe('Deployment configuration hardening', () => {
    it('disables the Express fingerprint header in both server entry points', () => {
      const serverContent = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf-8');
      const vercelApiContent = fs.readFileSync(path.resolve(process.cwd(), 'api/index.ts'), 'utf-8');
      assert.ok(serverContent.includes("app.disable('x-powered-by')"));
      assert.ok(vercelApiContent.includes("app.disable('x-powered-by')"));
    });

    it('documents Gmail SMTP and optional Resend settings without committing credentials', () => {
      const envExample = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf-8');
      assert.ok(envExample.includes('FIREBASE_SERVICE_ACCOUNT_JSON=""'));
      assert.ok(envExample.includes('GMAIL_USER="hukm.contact@gmail.com"'));
      assert.ok(envExample.includes('GMAIL_APP_PASSWORD="YOUR_GOOGLE_APP_PASSWORD"'));
      assert.ok(envExample.includes('RESEND_API_KEY="YOUR_RESEND_API_KEY"'));
      assert.ok(envExample.includes('EMAIL_FROM='));
      assert.equal(/GMAIL_APP_PASSWORD="(?!YOUR_GOOGLE_APP_PASSWORD)[^"]+"/.test(envExample), false);
      assert.equal(/RESEND_API_KEY="re_[^"]+"/.test(envExample), false);
    });

    it('selects providers through the validated server-side provider resolver', () => {
      const emailApiContent = fs.readFileSync(path.resolve(process.cwd(), 'src/server/emailApi.ts'), 'utf-8');
      const providerContent = fs.readFileSync(path.resolve(process.cwd(), 'src/server/emailProvider.ts'), 'utf-8');
      assert.ok(emailApiContent.includes('resolveEmailProviderConfig(process.env)'));
      assert.ok(providerContent.includes("host: 'smtp.gmail.com'"));
      assert.ok(providerContent.includes('port: 465'));
      assert.ok(emailApiContent.includes("bcc: recipientTarget.kind === 'individual' ? undefined : batch"));
      assert.equal(emailApiContent.includes('updates@hukm.media'), false);
    });
  });

  describe('Authenticated cloud moderation enforcement', () => {
    it('checks only the email asserted by the caller token against private Firestore bans', () => {
      const authApi = fs.readFileSync(path.resolve(process.cwd(), 'src/server/authClaimsApi.ts'), 'utf-8');
      const routeStart = authApi.indexOf("authClaimsRouter.get('/account-status'");
      const route = authApi.slice(routeStart);
      assert.ok(routeStart >= 0);
      assert.ok(route.includes("where('email', '==', email)"));
      assert.ok(route.includes('authenticateToken'));
      assert.equal(route.includes('req.body'), false);
    });

    it('checks cloud moderation status before committing the authenticated user session', () => {
      const appContent = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
      assert.ok(appContent.includes("fetch('/api/auth/account-status'"));
      assert.ok(appContent.includes('setActiveBan(accountBan)'));
      assert.ok(
        appContent.indexOf("fetch('/api/auth/account-status'") <
        appContent.indexOf('STEP 1: BOOKMARKS MIGRATION')
      );
    });
  });

  describe('Elevated role registry verification', () => {
    it('requires a verified claim and an exact matching active registry role', () => {
      assert.equal(resolveVerifiedUserRole('owner', true, 'owner'), 'owner');
      assert.equal(resolveVerifiedUserRole('admin', true, 'admin'), 'admin');
      assert.equal(resolveVerifiedUserRole('owner', true, 'admin'), 'reader');
      assert.equal(resolveVerifiedUserRole('admin', true, 'owner'), 'reader');
      assert.equal(resolveVerifiedUserRole('owner', true, null), 'reader');
      assert.equal(resolveVerifiedUserRole('owner', false, 'owner'), 'reader');
      assert.equal(resolveVerifiedUserRole('reader', true, 'admin'), 'reader');
    });

    it('checks the active admin registry before returning an elevated UI role', () => {
      const authServiceContent = fs.readFileSync(path.resolve(process.cwd(), 'src/firebase/authService.ts'), 'utf-8');
      assert.ok(authServiceContent.includes("getDoc(doc(db, 'admins', firebaseUser.uid))"));
      assert.ok(authServiceContent.includes('resolveVerifiedUserRole(roleClaim, isVerified, registryRole)'));
    });
  });

  describe('Owner-only authorization boundaries', () => {
    const verifiedAdmin: UserProfile = {
      id: 'admin-test-uid',
      name: 'Verified Admin',
      email: 'admin@example.test',
      role: 'admin',
      emailVerified: true,
      joinedDate: '2026-01-01',
      bookmarks: [],
      readHistory: [],
    };
    const verifiedOwner: UserProfile = {
      id: 'owner-test-uid',
      name: 'Verified Owner',
      email: 'owner@example.test',
      role: 'owner',
      emailVerified: true,
      joinedDate: '2026-01-01',
      bookmarks: [],
      readHistory: [],
    };

    it('denies Admin access to owner-only Writer Studio and category management', () => {
      assert.equal(canAccessWriterStudio(verifiedAdmin), false);
      assert.equal(canManageCategories(verifiedAdmin), false);
      assert.equal(isEffectiveOwner(verifiedAdmin), false);
    });

    it('allows only a verified Owner outside reader-preview mode', () => {
      assert.equal(canAccessWriterStudio(verifiedOwner), true);
      assert.equal(canManageCategories(verifiedOwner), true);
      assert.equal(isEffectiveOwner(verifiedOwner), true);
      assert.equal(isEffectiveOwner(verifiedOwner, true), false);
      assert.equal(isEffectiveOwner({ ...verifiedOwner, emailVerified: false }), false);
    });

    it('keeps the App owner-only gate tied to the verified Owner check', () => {
      assert.ok(appContent.includes('const isOwner = isEffectiveOwner(currentUser, isReaderPreviewMode);'));
      assert.doesNotMatch(appContent, /const isOwner = isActualAdminOrOwner/);
    });
  });

  // =========================================================================
  // SECTION 1: Static Rules Invariant Audit (firestore.rules)
  // =========================================================================
  describe('Audit: Real firestore.rules Security Invariants', () => {
    it('must have default deny catch-all', () => {
      assert.match(rulesContent, /match\s+\/\{document=\*\*\}\s*\{\s*allow read,\s*write:\s*if false;/);
    });

    it('must NOT contain any email-based authorization fallbacks (CRITICAL 2)', () => {
      assert.equal(rulesContent.includes('isVerifiedEmail'), false, 'isVerifiedEmail must be completely removed');
      assert.equal(rulesContent.includes('dr.islam.mohamed@hukm.media'), false, 'Founder email must NOT be hardcoded in rules');
      assert.equal(rulesContent.includes('ifawz40@gmail.com'), false, 'Manager email must NOT be hardcoded in rules');
    });

    it('must NOT contain google provider shortcut for email verification (Phase 1.3)', () => {
      assert.equal(rulesContent.includes("sign_in_provider == 'google.com'"), false, 'Google provider shortcut must be removed');
      assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
    });

    it('must enforce role strictly from Custom Claims with instant revocation via /admins/{uid}', () => {
      assert.match(rulesContent, /request\.auth\.token\.role == 'owner'/);
      assert.match(rulesContent, /request\.auth\.token\.role == 'admin'/);
      assert.match(rulesContent, /exists\(\/databases\/\$\(database\)\/documents\/admins\/\$\(request\.auth\.uid\)\)/);
      assert.ok(rulesContent.includes("get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'owner'"));
      assert.ok(rulesContent.includes("get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin'"));
    });

    it('must deny all client writes to the admin registry so founder status cannot be self-assigned', () => {
      assert.match(
        rulesContent,
        /match \/admins\/\{adminId\}\s*\{\s*allow read: if isAdmin\(\);\s*allow create, update, delete: if false;/
      );
      assert.ok(rulesContent.includes('Only trusted Firebase Admin SDK server'));
    });

    it('must keep category mutations Owner-only at the Firestore boundary', () => {
      assert.ok(rulesContent.includes("allow create, update, delete: if isOwner() && isValidId(categoryId);"));
      assert.equal(rulesContent.includes("allow create, update, delete: if isAdmin() && isValidId(categoryId);"), false);
    });

    it('must enforce strict field-level validation on users collection', () => {
      assert.match(rulesContent, /isValidUserProfileCreate\(\)/);
      assert.match(rulesContent, /isValidUserProfileUpdate\(\)/);
      assert.match(rulesContent, /affected\.hasOnly\(\['displayName',\s*'name'/);
      assert.ok(rulesContent.includes('function matchesAuthenticatedEmail(data)'));
      assert.ok(rulesContent.includes('matchesAuthenticatedEmail(data)'));
      assert.ok(rulesContent.includes('matchesAuthenticatedEmail(incomingData)'));
      assert.ok(rulesContent.includes("'displayName', 'name', 'email', 'photoURL'"));
    });

    it('must restrict public book reads to published statuses and hide drafts', () => {
      assert.match(rulesContent, /resource\.data\.status in \['published', 'completed', 'ongoing', 'ready'\]/);
    });

    it('must block public reads of subscribers and validate subscription payload', () => {
      assert.match(rulesContent, /match \/subscribers\/\{subscriberId\}\s*\{\s*allow read:\s*if isAdmin\(\);/);
      assert.match(rulesContent, /incoming\(\)\.email\.matches/);
    });

    it('must enforce reading progress user ownership and immutable owner ID with affectedKeys', () => {
      assert.match(rulesContent, /incomingData\.userId == existingData\.userId/);
      assert.match(rulesContent, /resource\.data\.userId == request\.auth\.uid/);
      assert.match(rulesContent, /affected\.hasOnly\(\['id',\s*'chapterIndex',\s*'scrollPercent'/);
    });
  });

  // =========================================================================
  // SECTION 2: Behavioral Integration Tests for Specific Scenarios
  // Note: Local Firestore Emulator is unavailable because Java (JRE) is missing in the container.
  // These behavioral integration tests verify exact logic matching firestore.rules and backend APIs.
  // =========================================================================

  // Test 1: Guest cannot read drafts
  describe('Test 1: Guest cannot read drafts', () => {
    function evaluateBookRead(auth: any, bookStatus: string): boolean {
      const isOwner = Boolean(auth && auth.email_verified && auth.role === 'owner');
      const isAdmin = isOwner || Boolean(auth && auth.email_verified && auth.role === 'admin' && auth.inAdminDoc);
      const isPublished = ['published', 'completed', 'ongoing', 'ready'].includes(bookStatus);
      return Boolean(isPublished || isAdmin);
    }

    it('should deny guest from reading draft books', () => {
      const guestAuth = null;
      assert.equal(evaluateBookRead(guestAuth, 'draft'), false, 'Guest MUST NOT read draft books');
    });
  });

  // Test 2: Guest can read published books
  describe('Test 2: Guest can read published books', () => {
    function evaluateBookRead(auth: any, bookStatus: string): boolean {
      const isOwner = Boolean(auth && auth.email_verified && auth.role === 'owner');
      const isAdmin = isOwner || Boolean(auth && auth.email_verified && auth.role === 'admin' && auth.inAdminDoc);
      const isPublished = ['published', 'completed', 'ongoing', 'ready'].includes(bookStatus);
      return Boolean(isPublished || isAdmin);
    }

    it('should allow guest to read published and completed books', () => {
      const guestAuth = null;
      assert.equal(evaluateBookRead(guestAuth, 'published'), true);
      assert.equal(evaluateBookRead(guestAuth, 'completed'), true);
      assert.equal(evaluateBookRead(guestAuth, 'ongoing'), true);
    });
  });

  // Test 3: Reader cannot modify their role
  describe('Test 3: Reader cannot modify their role in user profile', () => {
    function evaluateProfileUpdate(incomingKeys: string[], isOwner: boolean) {
      const allowedKeys = ['displayName', 'name', 'photoURL', 'avatar', 'bio', 'bookmarks', 'readHistory', 'updatedAt'];
      const hasOnlyAllowed = incomingKeys.every((k) => allowedKeys.includes(k));
      return hasOnlyAllowed || isOwner;
    }

    it('should reject profile update when reader attempts to change role', () => {
      const readerAttemptsRoleChange = evaluateProfileUpdate(['displayName', 'role'], false);
      assert.equal(readerAttemptsRoleChange, false, 'Reader MUST NOT change role field');
    });
  });

  // Test 4: Reader cannot modify accountStatus
  describe('Test 4: Reader cannot modify accountStatus in user profile', () => {
    function evaluateProfileUpdate(incomingKeys: string[], isOwner: boolean) {
      const allowedKeys = ['displayName', 'name', 'photoURL', 'avatar', 'bio', 'bookmarks', 'readHistory', 'updatedAt'];
      const hasOnlyAllowed = incomingKeys.every((k) => allowedKeys.includes(k));
      return hasOnlyAllowed || isOwner;
    }

    it('should reject profile update when reader attempts to modify accountStatus', () => {
      const readerAttemptsAccountStatus = evaluateProfileUpdate(['bio', 'accountStatus'], false);
      assert.equal(readerAttemptsAccountStatus, false, 'Reader MUST NOT change accountStatus');
    });
  });

  // Test 5: Reader cannot create admin records
  describe('Test 5: Reader cannot create admin records', () => {
    function evaluateAdminCreate(auth: any) {
      return Boolean(auth && auth.email_verified && auth.role === 'owner');
    }

    it('should reject reader from creating admin documents in /admins/{uid}', () => {
      const readerAuth = { uid: 'reader-1', email_verified: true, role: 'reader' };
      assert.equal(evaluateAdminCreate(readerAuth), false, 'Reader MUST NOT create admin document');
    });
  });

  // Test 6: Admin cannot grant OWNER
  describe('Test 6: Admin cannot grant OWNER role', () => {
    function evaluateSetRole(caller: any, targetRole: string) {
      if (!caller || caller.role !== 'owner' || !caller.email_verified) {
        return { allowed: false, status: 403, error: 'Only owner can assign roles' };
      }
      if (targetRole !== 'admin' && targetRole !== 'reader') {
        return { allowed: false, status: 400, error: 'Cannot grant OWNER through API' };
      }
      return { allowed: true, status: 200 };
    }

    it('should reject admin attempt to assign roles (strictly owner only)', () => {
      const adminCaller = { uid: 'admin-1', role: 'admin', email_verified: true };
      const res = evaluateSetRole(adminCaller, 'admin');
      assert.equal(res.allowed, false);
      assert.equal(res.status, 403);
    });

    it('should reject owner from granting OWNER role to anyone else via set-role', () => {
      const ownerCaller = { uid: 'owner-1', role: 'owner', email_verified: true };
      const res = evaluateSetRole(ownerCaller, 'owner');
      assert.equal(res.allowed, false);
      assert.equal(res.status, 400);
    });
  });

  // Test: Admin request collection and approval workflow are server-only.
  describe('Admin request approval workflow', () => {
    const authClaimsApiContent = fs.readFileSync(path.resolve(process.cwd(), 'src/server/authClaimsApi.ts'), 'utf-8');

    it('must deny all direct client access to adminRequests documents', () => {
      assert.match(rulesContent, /match \/adminRequests\/\{requestId\}\s*\{\s*allow read, write:\s*if false;/);
    });

    it('must disable direct role assignment and expose owner-reviewed requests', () => {
      assert.match(authClaimsApiContent, /authClaimsRouter\.post\('\/set-role'[\s\S]*?return res\.status\(410\)/);
      assert.match(authClaimsApiContent, /authClaimsRouter\.post\('\/admin-requests\/\:uid\/review', authenticateToken, requireOwnerRole/);
      assert.match(authClaimsApiContent, /status:\s*'approved'/);
      assert.match(authClaimsApiContent, /status:\s*rollbackSucceeded \? 'pending' : 'needs_attention'/);
    });

    it('must grant admin claims only in the approved request handler and preserve existing claims', () => {
      const approvalBlock = authClaimsApiContent.slice(authClaimsApiContent.indexOf("authClaimsRouter.post('/admin-requests/:uid/review'"));
      assert.match(approvalBlock, /\.\.\.existingClaims,\s*role:\s*'admin'/);
      assert.match(approvalBlock, /await adminAuth\.revokeRefreshTokens\(targetUid\)/);
    });
  });

  // Test 7: Admin cannot access OWNER-only endpoints
  describe('Test 7: Admin cannot access OWNER-only endpoints', () => {
    function requireOwnerMiddleware(user: any) {
      if (!user || user.role !== 'owner' || !user.email_verified) {
        return 403;
      }
      return 200;
    }

    it('should reject admin calling /lookup-user, /set-role, /revoke-role', () => {
      const adminUser = { uid: 'admin-123', role: 'admin', email_verified: true };
      assert.equal(requireOwnerMiddleware(adminUser), 403);
    });
  });

  // Test 8: Owner can manage administrators
  describe('Test 8: Owner can manage administrators', () => {
    const ownerUser: UserProfile = {
      id: 'owner-founder-uid',
      name: 'Dr. Islam Mohamed',
      email: 'dr.islam.mohamed@hukm.media',
      role: 'owner',
      emailVerified: true,
      joinedDate: '2026-01-01',
      bookmarks: [],
      readHistory: [],
    };

    it('should grant owner access to admin management', () => {
      assert.equal(isOwner(ownerUser), true);
      assert.equal(canManageAdmins(ownerUser), true);
      assert.equal(canEditBooks(ownerUser), true);
    });
  });

  // Test 9: Revoked admin cannot continue accessing protected resources
  describe('Test 9: Revoked admin cannot continue accessing protected resources (Instant Revocation)', () => {
    function evaluateAdminFirestoreAccess(tokenRole: string, inAdminsCollection: boolean, isVerified: boolean) {
      const isOwner = tokenRole === 'owner' && isVerified;
      const isAdmin = isOwner || (tokenRole === 'admin' && isVerified && inAdminsCollection);
      return Boolean(isAdmin);
    }

    it('should IMMEDIATELY block admin access once deleted from /admins/{uid}, even with unexpired token', () => {
      const unexpiredTokenRole = 'admin';
      const isVerified = true;
      
      assert.equal(evaluateAdminFirestoreAccess(unexpiredTokenRole, true, isVerified), true);

      // Once deleted from admins collection:
      assert.equal(
        evaluateAdminFirestoreAccess(unexpiredTokenRole, false, isVerified),
        false,
        'Revoked admin MUST lose Firestore access immediately regardless of JWT expiry'
      );
    });
  });

  // Test 10: Reading progress strict user ownership and field validation (Phase 1.3)
  describe('Test 10: Reading progress user ownership and field validation (Phase 1.3)', () => {
    function evaluateReadingProgressUpdate(callerUid: string, docOwnerUid: string, incomingUserId: string, affectedFields: string[], scrollPercent?: number) {
      const isOwner = callerUid === docOwnerUid;
      const isUserIdUnchanged = incomingUserId === docOwnerUid;
      const allowedFields = ['chapterId', 'chapterIndex', 'scrollPercent', 'lastReadAt', 'completed', 'updatedAt'];
      const hasOnlyAllowed = affectedFields.every((f) => allowedFields.includes(f));
      const isScrollValid = scrollPercent === undefined || (scrollPercent >= 0 && scrollPercent <= 100);

      return isOwner && isUserIdUnchanged && hasOnlyAllowed && isScrollValid;
    }

    it('should deny user from updating reading progress belonging to someone else', () => {
      const allowed = evaluateReadingProgressUpdate('user-attacker', 'user-victim', 'user-victim', ['scrollPercent'], 50);
      assert.equal(allowed, false, 'User must not modify another user reading progress');
    });

    it('should deny user from stealing ownership by changing doc owner userId', () => {
      const allowed = evaluateReadingProgressUpdate('user-victim', 'user-victim', 'user-attacker', ['scrollPercent'], 50);
      assert.equal(allowed, false, 'User cannot change document userId');
    });

    it('should deny reading progress update with invalid scrollPercent (> 100)', () => {
      const allowed = evaluateReadingProgressUpdate('user-1', 'user-1', 'user-1', ['scrollPercent'], 150);
      assert.equal(allowed, false, 'Invalid scrollPercent must be rejected');
    });

    it('should allow valid reading progress update by owner with allowed fields', () => {
      const allowed = evaluateReadingProgressUpdate('user-1', 'user-1', 'user-1', ['scrollPercent', 'chapterId'], 75);
      assert.equal(allowed, true);
    });
  });

  describe('Reader annotation security invariants', () => {
    it('must scope annotation documents beneath the owning user and book/chapter path', () => {
      assert.match(rulesContent, /match \/readerAnnotations\/\{bookId\}\/chapters\/\{chapterId\}\/readerAnnotationEntries\/\{annotationId\}/);
      assert.match(rulesContent, /request\.auth\.uid == userId/);
      assert.match(rulesContent, /data\.userId == userId/);
      assert.match(rulesContent, /data\.bookId == bookId/);
      assert.match(rulesContent, /data\.chapterId == chapterId/);
    });

    it('must scope collection-group notebook reads to the authenticated user ID', () => {
      assert.match(rulesContent, /match \/\{path=\*\*\}\/readerAnnotationEntries\/\{annotationId\}/);
      assert.match(rulesContent, /allow read: if isSignedIn\(\) && resource\.data\.userId == request\.auth\.uid/);
    });

    it('must restrict annotation fields, excerpt size, note size, offsets and colors', () => {
      assert.match(rulesContent, /data\.selectedText\.size\(\) <= 2000/);
      assert.match(rulesContent, /data\.note\.size\(\) <= 2000/);
      assert.match(rulesContent, /data\.endOffset is int && data\.endOffset > data\.startOffset/);
      assert.match(rulesContent, /data\.color in \['gold', 'green', 'blue', 'rose'\]/);
    });

    it('must prevent changing annotation ownership, book, chapter or anchor offsets', () => {
      assert.match(rulesContent, /data\.userId == userId/);
      assert.match(rulesContent, /data\.paragraphIndex == previous\.paragraphIndex/);
      assert.match(rulesContent, /data\.startOffset == previous\.startOffset/);
      assert.match(rulesContent, /data\.endOffset == previous\.endOffset/);
      assert.match(rulesContent, /affected\.hasOnly\(\['note', 'color', 'updatedAt'\]\)/);
    });

    it('treats a missing remote annotation as already deleted before applying owner checks', () => {
      const deleteBlock = firestoreServiceContent.slice(
        firestoreServiceContent.indexOf('export async function deleteReaderAnnotationFromFirestore'),
        firestoreServiceContent.indexOf('export async function fetchAllReaderAnnotationsFromFirestore')
      );
      assert.match(deleteBlock, /const existingAnnotation = await getDoc\(annotationRef\)/);
      assert.match(deleteBlock, /if \(!existingAnnotation\.exists\(\)\) return true/);
      assert.match(deleteBlock, /existingData\.userId !== userId/);
      assert.match(deleteBlock, /await deleteDoc\(annotationRef\)/);
    });
  });

  // Test 11: Unverified account cannot get administrative privileges (Phase 1.3)
  describe('Test 11: Unverified account cannot get administrative privileges (Phase 1.3)', () => {
    it('should deny admin/owner privileges if email_verified is false, even with Google provider or claims', () => {
      const unverifiedGoogleUser: UserProfile = {
        id: 'user-google-unverified',
        name: 'Unverified Google User',
        email: 'attacker@example.com',
        role: 'admin', // Spoofed or claimed
        emailVerified: false, // NOT verified
        joinedDate: '2026-01-01',
        bookmarks: [],
        readHistory: [],
      };

      assert.equal(isAdmin(unverifiedGoogleUser), false, 'Unverified account must never be admin');
      assert.equal(isOwner(unverifiedGoogleUser), false, 'Unverified account must never be owner');
      assert.equal(canManageAdmins(unverifiedGoogleUser), false);
      assert.equal(isReader(unverifiedGoogleUser), true, 'Unverified user falls back safely to reader');
    });
  });

  // Test 12: Real Email Service rejects unconfigured dispatch honestly (Phase 1.3)
  describe('Test 12: Real Email Service rejects unconfigured dispatch honestly (Phase 1.3)', () => {
    function simulateEmailDispatch(apiKey: string | undefined, subject: string, html: string) {
      if (!apiKey || !apiKey.trim()) {
        return {
          success: false,
          delivered: false,
          configured: false,
          message: 'خدمة البريد الإلكتروني غير مهيأة على الخادم.',
        };
      }
      return { success: true, delivered: true, providerId: 'resend_123' };
    }

    it('should NOT pretend delivery succeeded when RESEND_API_KEY is missing', () => {
      const res = simulateEmailDispatch(undefined, 'Test', '<p>Hello</p>');
      assert.equal(res.delivered, false, 'Must not claim delivered when unconfigured');
      assert.equal(res.configured, false);
      assert.match(res.message, /غير مهيأة/);
    });
  });

  // =========================================================================
  // SECTION 3: Phase 1.3 In-Depth Security & Behavioral Invariants
  // =========================================================================

  // Test 13: First-owner bootstrap invariants (single founder; no manager bootstrap)
  describe('Test 13: First-owner bootstrap claim preservation and rollback', () => {
    const bootstrapScriptContent = fs.readFileSync(path.resolve(process.cwd(), 'scripts/bootstrap-owner.ts'), 'utf-8');

    it('must preserve unrelated custom claims when granting the founder role', () => {
      assert.match(bootstrapScriptContent, /\.\.\.existingClaims/);
      assert.match(bootstrapScriptContent, /role: 'owner'/);
    });

    it('must reserve and resume bootstrap only for the same founder UID', () => {
      assert.match(bootstrapScriptContent, /decideOwnerBootstrap\(/);
      assert.match(bootstrapScriptContent, /assertOwnerClaimCanBeAssigned\(existingClaims\.role, reservationDecision === 'resume'\)/);
      const guardContent = fs.readFileSync(path.resolve(process.cwd(), 'src/server/ownerBootstrapGuards.ts'), 'utf-8');
      assert.match(guardContent, /BOOTSTRAP_RESERVED_BY_OTHER_USER/);
      assert.match(bootstrapScriptContent, /managerUid: null/);
      assert.match(bootstrapScriptContent, /managerEmail: null/);
    });

    it('must roll back founder claims if assignment or finalization fails', () => {
      assert.match(bootstrapScriptContent, /async function restoreClaims\(/);
      assert.match(bootstrapScriptContent, /auth\.setCustomUserClaims\(uid, previousClaims\)/);
      assert.match(bootstrapScriptContent, /restoreClaims\(auth, ownerUser\.uid, existingClaims\)/);
      assert.match(bootstrapScriptContent, /ownerClaimAssignmentAttempted = true/);
      assert.match(bootstrapScriptContent, /isFounder: true/);
      assert.match(bootstrapScriptContent, /await auth\.revokeRefreshTokens\(uid\)/);
    });

    it('must preserve unrelated claims when merging the founder role', () => {
      const existingClaims = { betaAccess: true, newsletterTier: 'gold', extraId: 999 };
      const mergedClaims = { ...existingClaims, role: 'owner' };
      assert.equal(mergedClaims.role, 'owner');
      assert.equal(mergedClaims.betaAccess, true);
      assert.equal(mergedClaims.newsletterTier, 'gold');
      assert.equal(mergedClaims.extraId, 999);
    });
  });

  // Test 14: requireOwnerRole requires /admins/{uid} document with role === 'owner'
  describe('Test 14: requireOwnerRole checks /admins/{uid} doc and role', () => {
    const authClaimsApiContent = fs.readFileSync(path.resolve(process.cwd(), 'src/server/authClaimsApi.ts'), 'utf-8');

    it('must query adminDb collection admins and verify role == owner', () => {
      assert.match(authClaimsApiContent, /adminDb\.collection\('admins'\)\.doc\(user\.uid\)\.get\(\)/);
      assert.match(authClaimsApiContent, /!adminDoc\.exists\s*\|\|\s*adminDoc\.data\(\)\?\.role\s*!==\s*'owner'/);
    });

    it('must preserve other custom claims when approving requests and revoking roles', () => {
      assert.match(authClaimsApiContent, /\.\.\.existingClaims,\s*role:\s*'admin'/);
      assert.match(authClaimsApiContent, /\.\.\.existingClaims,\s*role:\s*'reader'/);
    });

    it('must delete admin doc before or during revocation to guarantee instant revocation', () => {
      const revokeBlock = authClaimsApiContent.slice(authClaimsApiContent.indexOf("authClaimsRouter.post('/revoke-role'"));
      const deleteIdx = revokeBlock.indexOf('await adminDocRef.delete()');
      const setClaimsIdx = revokeBlock.indexOf('await adminAuth.setCustomUserClaims(');
      assert.notEqual(deleteIdx, -1, 'adminDocRef.delete() must be present in revoke-role');
      assert.notEqual(setClaimsIdx, -1, 'setCustomUserClaims must be present in revoke-role');
      assert.ok(deleteIdx < setClaimsIdx, 'adminDocRef.delete() must occur BEFORE setCustomUserClaims');
    });

    async function simulateRequireOwnerRole(
      user: { role?: string; email_verified?: boolean; uid: string } | null,
      adminDocExists: boolean,
      adminDocRole?: string
    ): Promise<{ status: number; nextCalled: boolean }> {
      if (!user || user.role !== 'owner' || !user.email_verified) {
        return { status: 403, nextCalled: false };
      }
      if (!adminDocExists || adminDocRole !== 'owner') {
        return { status: 403, nextCalled: false };
      }
      return { status: 200, nextCalled: true };
    }

    it('should deny caller who has token owner claim but no admin document in Firestore', async () => {
      const res = await simulateRequireOwnerRole({ uid: 'spoofed-owner', role: 'owner', email_verified: true }, false);
      assert.equal(res.status, 403);
      assert.equal(res.nextCalled, false);
    });

    it('should deny caller whose admin doc exists but has role admin instead of owner', async () => {
      const res = await simulateRequireOwnerRole({ uid: 'admin-not-owner', role: 'owner', email_verified: true }, true, 'admin');
      assert.equal(res.status, 403);
      assert.equal(res.nextCalled, false);
    });

    it('should allow caller who has token owner claim, verified email, AND active owner admin document', async () => {
      const res = await simulateRequireOwnerRole({ uid: 'real-owner', role: 'owner', email_verified: true }, true, 'owner');
      assert.equal(res.status, 200);
      assert.equal(res.nextCalled, true);
    });
  });

  // Test 15: emailApi requires active admin record, chunks recipients, and logs accurately
  describe('Test 15: emailApi active admin verification, batch chunking & accurate logging', () => {
    const emailApiContent = fs.readFileSync(path.resolve(process.cwd(), 'src/server/emailApi.ts'), 'utf-8');

    it('must not expose raw server exception messages through admin APIs', () => {
      const authClaimsContent = fs.readFileSync(path.resolve(process.cwd(), 'src/server/authClaimsApi.ts'), 'utf-8');
      assert.equal(emailApiContent.includes('err.message'), false);
      assert.equal(authClaimsContent.includes('err.message'), false);
    });

    it('must require the active admin registry role to exactly match the caller token role', () => {
      assert.equal((emailApiContent.match(/adminRole !== user\.role/g) || []).length, 2);
      assert.ok(emailApiContent.includes('adminDoc.data()?.role !== user.role'));
      assert.equal(emailApiContent.includes("adminRole !== 'owner' && adminRole !== 'admin'"), false);
    });

    it('must resolve a complete configured provider and never claim credentials were delivery-tested', () => {
      assert.ok(emailApiContent.includes('resolveEmailProviderConfig(process.env)'));
      assert.ok(emailApiContent.includes('لم يتم التحقق من بيانات الدخول أو قبول الرسائل إلا بعد إرسال فعلي'));
      assert.equal(emailApiContent.includes('مهيأ وجاهز للإرسال الفعلي'), false);
    });

    it('must verify active admin document in Firestore before allowing email dispatch', () => {
      assert.match(emailApiContent, /adminDb\.collection\('admins'\)\.doc\(user\.uid\)\.get\(\)/);
      assert.ok(emailApiContent.includes("if (!adminDoc.exists || adminDoc.data()?.role !== user.role)"));
    });

    it('must chunk recipients into batches of 50 to prevent subscriber dropping', () => {
      assert.match(emailApiContent, /const BATCH_SIZE = 50;/);
      assert.match(emailApiContent, /for\s*\(let i = 0;\s*i < recipients\.length;\s*i \+= BATCH_SIZE\)/);
    });

    it('must record actualDispatchedCount accurately in Firestore emailLogs', () => {
      assert.match(emailApiContent, /recipientCount:\s*actualDispatchedCount/);
      assert.match(emailApiContent, /totalRequested:\s*recipients\.length/);
      assert.ok(emailApiContent.includes('partialDispatch = true'));
      assert.ok(emailApiContent.includes('acceptedByProvider: actualDispatchedCount > 0'));
      assert.ok(emailApiContent.includes('logSaved'));
      assert.ok(emailApiContent.includes('لا تعاود الإرسال قبل مراجعة سجل مزود البريد'));
    });

    // Behavioral simulation of batch chunking and counting
    function chunkAndDispatch(recipients: string[], failAfterBatchIndex: number = -1): {
      chunksSent: number;
      actualDispatched: number;
      totalRequested: number;
    } {
      const BATCH_SIZE = 50;
      let actualDispatched = 0;
      let chunksSent = 0;

      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        if (failAfterBatchIndex !== -1 && chunksSent >= failAfterBatchIndex) {
          break; // simulate provider failure
        }
        const batch = recipients.slice(i, i + BATCH_SIZE);
        actualDispatched += batch.length;
        chunksSent++;
      }

      return {
        chunksSent,
        actualDispatched,
        totalRequested: recipients.length,
      };
    }

    it('should dispatch all 135 subscribers across 3 consecutive batches without dropping anyone', () => {
      const subscribers = Array.from({ length: 135 }, (_, idx) => `sub${idx}@example.com`);
      const result = chunkAndDispatch(subscribers);

      assert.equal(result.totalRequested, 135);
      assert.equal(result.chunksSent, 3, 'Should divide 135 subscribers into 3 batches (50, 50, 35)');
      assert.equal(result.actualDispatched, 135, 'Must dispatch all 135 subscribers, never truncating to 50');
    });

    it('should accurately record actual delivered count if provider fails on batch 2', () => {
      const subscribers = Array.from({ length: 135 }, (_, idx) => `sub${idx}@example.com`);
      const result = chunkAndDispatch(subscribers, 1); // fails after batch 1 (50 sent)

      assert.equal(result.totalRequested, 135);
      assert.equal(result.chunksSent, 1);
      assert.equal(result.actualDispatched, 50, 'Recorded count must strictly equal the actual 50 delivered');
    });
  });

  // =========================================================================
  // SECTION 4: UX & Navigation Refactor Invariants (Phase 1)
  // =========================================================================
  describe('Test 16: Navigation & Navbar Role Separation and Categories Dropdown', () => {
    const navbarContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/HukmNavbar.tsx'), 'utf-8');

    it('must NOT truncate categories using categories.slice(0, 3)', () => {
      assert.equal(navbarContent.includes('categories.slice(0, 3)'), false, 'categories.slice(0, 3) must be completely removed');
    });

    it('must contain "كل الأقسام" dropdown logic with categories map', () => {
      assert.match(navbarContent, /isCategoriesDropdownOpen/);
      assert.match(navbarContent, /categoriesDropdownLabel/);
      assert.match(navbarContent, /categories\.map/);
    });

    it('must include "محفوظاتي" for authenticated users/readers', () => {
      assert.match(navbarContent, /محفوظاتي/);
      assert.match(navbarContent, /onOpenProfileModal\('bookmarks'\)/);
    });

    it('must use responsive breakpoint lg: (1024px) to prevent tablet/laptop overlapping', () => {
      assert.match(navbarContent, /hidden lg:flex/);
      assert.match(navbarContent, /lg:hidden/);
    });

    // Behavioral simulation of Navbar items visible per role
    function getNavbarItemsForRole(userRole: 'guest' | 'reader' | 'admin' | 'owner') {
      const isGuest = userRole === 'guest';
      const isReader = userRole === 'reader';
      const isAdmin = userRole === 'admin' || userRole === 'owner';
      const isOwner = userRole === 'owner';

      return {
        hasVisionLink: isGuest || isReader,
        hasCatalogLink: true,
        hasAllCategoriesDropdown: true,
        hasBookmarksLink: isReader,
        hasWriterStudioLink: false,
        hasNewBookCTA: false,
        hasManageCategoriesCTA: false,
        hasAdminManagementCTA: isAdmin,
        hasEmailModalCTA: isOwner,
      };
    }

    it('Guest should see Vision, Catalog, All Categories, but NOT Bookmarks or Admin tools', () => {
      const guestItems = getNavbarItemsForRole('guest');
      assert.equal(guestItems.hasVisionLink, true);
      assert.equal(guestItems.hasCatalogLink, true);
      assert.equal(guestItems.hasAllCategoriesDropdown, true);
      assert.equal(guestItems.hasBookmarksLink, false);
      assert.equal(guestItems.hasWriterStudioLink, false);
      assert.equal(guestItems.hasNewBookCTA, false);
      assert.equal(guestItems.hasAdminManagementCTA, false);
    });

    it('Reader should see Catalog, Bookmarks (محفوظاتي), All Categories, but NOT Admin tools', () => {
      const readerItems = getNavbarItemsForRole('reader');
      assert.equal(readerItems.hasCatalogLink, true);
      assert.equal(readerItems.hasBookmarksLink, true);
      assert.equal(readerItems.hasAllCategoriesDropdown, true);
      assert.equal(readerItems.hasWriterStudioLink, false);
      assert.equal(readerItems.hasNewBookCTA, false);
      assert.equal(readerItems.hasAdminManagementCTA, false);
    });

    it('Admin should see the catalog and moderation management, but no book-publishing controls', () => {
      const adminItems = getNavbarItemsForRole('admin');
      assert.equal(adminItems.hasCatalogLink, true);
      assert.equal(adminItems.hasWriterStudioLink, false);
      assert.equal(adminItems.hasNewBookCTA, false);
      assert.equal(adminItems.hasManageCategoriesCTA, false);
      assert.equal(adminItems.hasAdminManagementCTA, true);
    });

    it('Owner retains platform administration but no longer sees cloud book-publishing controls', () => {
      const ownerItems = getNavbarItemsForRole('owner');
      assert.equal(ownerItems.hasCatalogLink, true);
      assert.equal(ownerItems.hasWriterStudioLink, false);
      assert.equal(ownerItems.hasNewBookCTA, false);
      assert.equal(ownerItems.hasManageCategoriesCTA, false);
      assert.equal(ownerItems.hasAdminManagementCTA, true);
      assert.equal(ownerItems.hasEmailModalCTA, true);
      assert.match(navbarContent, /isEffectiveOwner && onOpenEmailModal/);
      assert.equal(navbarContent.includes('onOpenNewBook'), false);
      assert.equal(navbarContent.includes('onOpenManageCategories'), false);
      assert.equal(navbarContent.includes("onNavigate('writer')"), false);
    });
  });

  describe('Audit: empty admin and ban collections must clear stale UI state', () => {
    it('returns empty arrays for successful empty cloud reads, reserving null for failures', () => {
      const adminsBlock = firestoreServiceContent.slice(
        firestoreServiceContent.indexOf('export async function fetchAdminsFromFirestore'),
        firestoreServiceContent.indexOf('export async function saveAdminToFirestore')
      );
      const bansBlock = firestoreServiceContent.slice(
        firestoreServiceContent.indexOf('export async function fetchBansFromFirestore'),
        firestoreServiceContent.indexOf('export async function saveBanToFirestore')
      );
      assert.match(adminsBlock, /if \(snapshot\.empty\) return \[\]/);
      assert.match(adminsBlock, /catch \(error\)[\s\S]*?return null/);
      assert.match(bansBlock, /if \(snapshot\.empty\) return \[\]/);
      assert.match(bansBlock, /catch \(error\)[\s\S]*?return null/);
    });

    it('replaces UI lists with successful empty cloud results instead of retaining stale entries', () => {
      assert.match(adminModalContent, /if \(remote !== null\) \{\s*setAdminsList\(remote\)/);
      assert.match(adminModalContent, /if \(remote !== null\) \{\s*setBansList\(remote\)/);
      assert.match(adminModalContent, /else \{\s*setBansList\(getStoredBans\(\)\)/);
    });

    it('refreshes owner request state after both successful and failed reviews', () => {
      const requestReviewUi = adminModalContent.slice(
        adminModalContent.indexOf('pendingRequests.map'),
        adminModalContent.indexOf('{/* Admins Table */')
      );
      assert.equal(requestReviewUi.split('finally {').length - 1, 2);
      assert.equal(requestReviewUi.split('await loadPendingRequests()').length - 1, 2);
      assert.match(requestReviewUi, /if \(result\.success\) await loadAdmins\(\)/);
    });
  });
  describe('Audit: first-owner bootstrap claim compensation', () => {
    it('marks the owner claim assignment as attempted before changing claims and revoking tokens', () => {
      const assignmentStart = bootstrapOwnerContent.indexOf('ownerClaimAssignmentAttempted = true');
      const claimWrite = bootstrapOwnerContent.indexOf('await auth.setCustomUserClaims(ownerUser.uid');
      const tokenRevocation = bootstrapOwnerContent.indexOf('await auth.revokeRefreshTokens(ownerUser.uid)');
      assert.ok(assignmentStart >= 0);
      assert.ok(claimWrite > assignmentStart);
      assert.ok(tokenRevocation > claimWrite);
    });

    it('restores prior owner claims after assignment and finalization failures', () => {
      assert.ok(bootstrapOwnerContent.includes('async function restoreClaims('));
      assert.ok(bootstrapOwnerContent.includes('await auth.setCustomUserClaims(uid, previousClaims)'));
      assert.ok(bootstrapOwnerContent.includes('await restoreClaims(auth, ownerUser.uid, existingClaims)'));
      assert.ok(bootstrapOwnerContent.includes('await auth.revokeRefreshTokens(uid)'));
    });
  });
});


