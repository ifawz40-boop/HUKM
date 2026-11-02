/**
 * HUKM MEDIA — Secure Server-Side Bootstrap Script (Local Operator CLI Only)
 * 
 * Strict operator-controlled initialization script executed locally via terminal.
 * Guarantees:
 * 1. Matching PROJECT_ID & DATABASE_ID with Firebase applet configuration.
 * 2. Constant-time secret verification against mandatory EXPECTED_BOOTSTRAP_SECRET.
 * 3. Dynamic OWNER_EMAIL validation with strict emailVerified requirement.
 * 4. Validation of optional MANAGER_EMAIL (must differ from OWNER_EMAIL and be verified).
 * 5. Atomic Reservation FIRST: Firestore Transaction locks state to 'pending' bound to ownerUid.
 * 6. Safe Recovery: If previous run failed during claims assignment, allows recovery ONLY for the SAME ownerUid.
 * 7. Anti-Hijack: If pending under a different ownerUid or already completed, aborts immediately.
 * 8. Custom Claims granted only AFTER successful reservation; if claims fail, no completed lock is created.
 * 9. Atomic Completion: Transition to 'completed' and creation of /admins/{ownerUid} occurs only after claims succeed.
 * 
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json" \
 *   BOOTSTRAP_SECRET="<secret-min-16-chars>" \
 *   EXPECTED_BOOTSTRAP_SECRET="<exact-matching-secret>" \
 *   OWNER_EMAIL="<your-verified-email>" \
 *   [MANAGER_EMAIL="<optional-verified-manager-email>"] \
 *   npx tsx scripts/bootstrap-owner.ts
 */

import crypto from 'node:crypto';
import { initializeApp, getApps } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// 1. Project & Database Configuration matched with firebase-applet-config.json
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0492732633';
const DATABASE_ID = process.env.FIREBASE_DATABASE_ID || 'ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96';

// 2. Secret Verification: Both BOOTSTRAP_SECRET and EXPECTED_BOOTSTRAP_SECRET are mandatory
const providedSecret = process.env.BOOTSTRAP_SECRET;
const expectedSecret = process.env.EXPECTED_BOOTSTRAP_SECRET;

if (!providedSecret || providedSecret.trim().length < 16) {
  console.error('❌ FATAL: BOOTSTRAP_SECRET environment variable is missing or shorter than 16 characters. Execution halted.');
  process.exit(1);
}

if (!expectedSecret || expectedSecret.trim().length < 16) {
  console.error('❌ FATAL: EXPECTED_BOOTSTRAP_SECRET environment variable is missing or shorter than 16 characters. Execution halted.');
  process.exit(1);
}

// Constant-time SHA-256 hash comparison
const providedHash = crypto.createHash('sha256').update(providedSecret.trim()).digest();
const expectedHash = crypto.createHash('sha256').update(expectedSecret.trim()).digest();

if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
  console.error('❌ FATAL: BOOTSTRAP_SECRET does not match EXPECTED_BOOTSTRAP_SECRET. Unauthorized.');
  process.exit(1);
}

// 3. Dynamic OWNER_EMAIL from environment (Mandatory)
const rawOwnerEmail = process.env.OWNER_EMAIL;
if (!rawOwnerEmail || !rawOwnerEmail.includes('@')) {
  console.error('❌ FATAL: OWNER_EMAIL environment variable is missing or invalid. Execution halted.');
  process.exit(1);
}
const ownerEmail = rawOwnerEmail.trim().toLowerCase();

// 4. Optional MANAGER_EMAIL verification: must be valid and CANNOT equal OWNER_EMAIL
const rawManagerEmail = process.env.MANAGER_EMAIL;
let managerEmail: string | null = null;

if (rawManagerEmail !== undefined && rawManagerEmail !== null && rawManagerEmail.trim() !== '') {
  const cleanManagerEmail = rawManagerEmail.trim().toLowerCase();
  if (!cleanManagerEmail.includes('@')) {
    console.error('❌ FATAL: MANAGER_EMAIL is provided but is not a valid email address. Execution halted.');
    process.exit(1);
  }
  if (cleanManagerEmail === ownerEmail) {
    console.error('❌ FATAL: MANAGER_EMAIL cannot be the same email address as OWNER_EMAIL. Execution halted.');
    process.exit(1);
  }
  managerEmail = cleanManagerEmail;
}

let app: App;
if (getApps().length === 0) {
  app = initializeApp({ projectId: PROJECT_ID });
} else {
  app = getApps()[0]!;
}

const auth = getAuth(app);
const db = getFirestore(app, DATABASE_ID);

async function bootstrap() {
  console.log('🔒 Starting HUKM MEDIA Secure Atomic Bootstrap...');
  console.log(`📌 Project: ${PROJECT_ID} | Database: ${DATABASE_ID}`);
  console.log(`🎯 Target OWNER: ${ownerEmail}`);
  if (managerEmail) {
    console.log(`👤 Target MANAGER (Optional): ${managerEmail}`);
  }

  // Step A: Verify target accounts exist and have emailVerified === true
  const ownerUser = await auth.getUserByEmail(ownerEmail).catch(() => null);
  if (!ownerUser) {
    console.error(`❌ FATAL: Target OWNER account (${ownerEmail}) does not exist in Firebase Authentication. Create and verify the account first.`);
    process.exit(1);
  }

  if (!ownerUser.emailVerified) {
    console.error(`❌ FATAL: Target OWNER account (${ownerEmail}) email is NOT verified (emailVerified === false). Email verification is strictly required.`);
    process.exit(1);
  }

  let managerUser: any = null;
  if (managerEmail) {
    managerUser = await auth.getUserByEmail(managerEmail).catch(() => null);
    if (!managerUser) {
      console.error(`❌ FATAL: Target MANAGER account (${managerEmail}) does not exist in Firebase Authentication.`);
      process.exit(1);
    }
    if (!managerUser.emailVerified) {
      console.error(`❌ FATAL: Target MANAGER account (${managerEmail}) email is NOT verified (emailVerified === false).`);
      process.exit(1);
    }
  }

  // Step B: ATOMIC RESERVATION FIRST (Firestore Transaction)
  // Ensures only one process can acquire the pending reservation, locked strictly to ownerUser.uid.
  const bootstrapRef = db.collection('_system').doc('bootstrap');
  const ownerAdminRef = db.collection('admins').doc(ownerUser.uid);
  const managerAdminRef = managerUser ? db.collection('admins').doc(managerUser.uid) : null;

  console.log('📝 Acquiring atomic reservation in Firestore...');
  try {
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(bootstrapRef);

      if (snap.exists) {
        const data = snap.data();
        // Check if already completed
        if (data?.status === 'completed' || data?.completed === true) {
          throw new Error('BOOTSTRAP_ALREADY_COMPLETED');
        }

        // Check if pending under another user
        if (data?.status === 'pending') {
          if (data.ownerUid !== ownerUser.uid) {
            throw new Error('BOOTSTRAP_RESERVED_BY_OTHER_USER');
          }
          // Authorized retry / recovery for the SAME owner
          console.log(`🔄 Authorized resumption: Prior pending reservation found for the SAME OWNER UID (${ownerUser.uid}). Continuing...`);
          transaction.update(bootstrapRef, {
            lastAttemptAt: new Date().toISOString(),
            attempts: (data.attempts || 1) + 1,
          });
          return;
        }
      }

      // Initial clean reservation
      transaction.set(bootstrapRef, {
        status: 'pending',
        completed: false,
        locked: false,
        reservedAt: new Date().toISOString(),
        ownerUid: ownerUser.uid,
        ownerEmail: ownerUser.email,
        managerUid: managerUser?.uid || null,
        managerEmail: managerUser?.email || null,
        attempts: 1,
      });
    });
  } catch (err: any) {
    if (err.message === 'BOOTSTRAP_ALREADY_COMPLETED') {
      console.error('❌ FATAL: Initial platform bootstrap has ALREADY been executed and completed. Re-execution is prohibited.');
      process.exit(1);
    }
    if (err.message === 'BOOTSTRAP_RESERVED_BY_OTHER_USER') {
      console.error('❌ FATAL: Bootstrap is currently in PENDING state under a different owner UID. Takeover or replacement is prohibited.');
      process.exit(1);
    }
    console.error('❌ FATAL: Failed to acquire Firestore reservation transaction:', err);
    process.exit(1);
  }

  console.log(`✅ Atomic reservation secured for OWNER UID: ${ownerUser.uid} (status: pending)`);

  // Step C: ASSIGN CUSTOM CLAIMS AFTER RESERVATION
  // If claims assignment fails, the lock remains in pending state for this exact UID to retry.
  console.log('🔑 Granting OWNER Custom Claim in Firebase Authentication...');
  try {
    await auth.setCustomUserClaims(ownerUser.uid, { role: 'owner' });
    await auth.revokeRefreshTokens(ownerUser.uid);
    console.log(`✅ OWNER claim ({ role: 'owner' }) granted successfully to UID=${ownerUser.uid}`);
  } catch (claimErr: any) {
    console.error('❌ FATAL: Failed to assign OWNER claim in Firebase Authentication:', claimErr.message);
    console.error('⚠️ The bootstrap reservation remains in PENDING status for this exact OWNER UID.');
    console.error('⚠️ You may safely resolve network/IAM credentials and re-run with the same OWNER_EMAIL to complete.');
    process.exit(1);
  }

  if (managerUser) {
    console.log('🔑 Granting ADMIN Custom Claim in Firebase Authentication...');
    try {
      await auth.setCustomUserClaims(managerUser.uid, { role: 'admin' });
      await auth.revokeRefreshTokens(managerUser.uid);
      console.log(`✅ ADMIN claim ({ role: 'admin' }) granted successfully to UID=${managerUser.uid}`);
    } catch (claimErr: any) {
      console.error('❌ Failed to assign ADMIN claim in Firebase Authentication:', claimErr.message);
      console.error('⚠️ Bootstrap NOT marked completed. Resolve issue and re-run.');
      process.exit(1);
    }
  }

  // Step D: FINALIZE BOOTSTRAP TO COMPLETED (Atomic Lock & Admin Records)
  // Transition status: 'completed', write /admins/{ownerUid} and /admins/{managerUid}.
  console.log('🔒 Finalizing bootstrap to COMPLETED in Firestore...');
  try {
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(bootstrapRef);
      const data = snap.data();

      // Guard check
      if (data?.ownerUid !== ownerUser.uid) {
        throw new Error('OWNER_UID_MISMATCH_ON_COMPLETION');
      }

      // 1. Mark completed and permanently locked
      transaction.update(bootstrapRef, {
        status: 'completed',
        completed: true,
        locked: true,
        completedAt: new Date().toISOString(),
      });

      // 2. Write verified OWNER record in admins collection
      transaction.set(ownerAdminRef, {
        id: ownerUser.uid,
        uid: ownerUser.uid,
        email: ownerUser.email,
        name: ownerUser.displayName || 'مالك المنصة والمؤسس',
        title: 'المؤسس والمشرف العام للمنصة',
        role: 'owner',
        isFounder: true,
        canEditBooks: true,
        canManageBans: true,
        addedBy: 'SYSTEM_BOOTSTRAP_LOCAL',
        addedAt: new Date().toISOString(),
      });

      // 3. Write optional MANAGER record in admins collection
      if (managerUser && managerAdminRef) {
        transaction.set(managerAdminRef, {
          id: managerUser.uid,
          uid: managerUser.uid,
          email: managerUser.email,
          name: managerUser.displayName || 'مدير معتمد',
          title: 'المدير التنفيذي والناشر',
          role: 'admin',
          isFounder: false,
          canEditBooks: true,
          canManageBans: true,
          addedBy: 'SYSTEM_BOOTSTRAP_LOCAL',
          addedAt: new Date().toISOString(),
        });
      }
    });
  } catch (finalErr: any) {
    console.error('❌ FATAL: Failed to finalize bootstrap in Firestore:', finalErr);
    console.error('⚠️ Custom Claims were set, but Firestore finalization failed. Re-run to finalize.');
    process.exit(1);
  }

  console.log('🎉 Bootstrap completed successfully!');
  console.log(`👑 Verified OWNER: ${ownerUser.email} (UID: ${ownerUser.uid})`);
  console.log('🔒 The platform bootstrap is now permanently sealed and locked.');
}

bootstrap().catch((err) => {
  console.error('❌ Unhandled bootstrap execution error:', err);
  process.exit(1);
});
