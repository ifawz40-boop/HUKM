import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { decideOwnerBootstrap, assertOwnerClaimCanBeAssigned } from '../src/server/ownerBootstrapGuards.ts';

const base = {
  ownerUid: 'firebase-user-uid',
  ownerAdminExists: false,
  registeredOwnerUids: [] as string[],
};

describe('first-owner bootstrap guards', () => {
  it('allows a clean initial reservation only when no owner/admin record exists', () => {
    assert.equal(decideOwnerBootstrap({ ...base, bootstrapExists: false }), 'reserve');
  });

  it('allows recovery only for the same UID and a clean pending reservation', () => {
    assert.equal(decideOwnerBootstrap({
      ...base,
      bootstrapExists: true,
      bootstrapData: { status: 'pending', ownerUid: base.ownerUid, managerUid: null, managerEmail: null },
    }), 'resume');
  });

  it('rejects a completed or locked bootstrap permanently', () => {
    assert.throws(() => decideOwnerBootstrap({
      ...base, bootstrapExists: true, bootstrapData: { status: 'completed', ownerUid: base.ownerUid },
    }), /BOOTSTRAP_ALREADY_COMPLETED/);
    assert.throws(() => decideOwnerBootstrap({
      ...base, bootstrapExists: true, bootstrapData: { status: 'pending', completed: true, ownerUid: base.ownerUid },
    }), /BOOTSTRAP_ALREADY_COMPLETED/);
  });

  it('rejects takeover, unknown states, and unexpected manager configuration', () => {
    assert.throws(() => decideOwnerBootstrap({
      ...base, bootstrapExists: true, bootstrapData: { status: 'pending', ownerUid: 'another-uid' },
    }), /BOOTSTRAP_RESERVED_BY_OTHER_USER/);
    assert.throws(() => decideOwnerBootstrap({
      ...base, bootstrapExists: true, bootstrapData: { status: 'mystery', ownerUid: base.ownerUid },
    }), /BOOTSTRAP_STATE_UNRECOGNIZED/);
    assert.throws(() => decideOwnerBootstrap({
      ...base, bootstrapExists: true, bootstrapData: { status: 'pending', ownerUid: base.ownerUid, managerUid: 'manager-uid' },
    }), /BOOTSTRAP_MANAGER_CONFIGURATION_UNEXPECTED/);
  });

  it('never overwrites an existing target admin record or an existing owner registry', () => {
    assert.throws(() => decideOwnerBootstrap({ ...base, bootstrapExists: false, ownerAdminExists: true }), /TARGET_ADMIN_RECORD_ALREADY_EXISTS/);
    assert.throws(() => decideOwnerBootstrap({ ...base, bootstrapExists: false, registeredOwnerUids: ['existing-owner'] }), /OWNER_REGISTRY_ALREADY_POPULATED/);
    assert.throws(() => decideOwnerBootstrap({
      ...base, bootstrapExists: true, bootstrapData: { status: 'pending', ownerUid: base.ownerUid },
      registeredOwnerUids: ['existing-owner'],
    }), /BOOTSTRAP_PENDING_WITH_EXISTING_OWNER_RECORD/);
  });

  it('allows only reader/unset claims on a fresh account and owner claims during same-UID recovery', () => {
    assertOwnerClaimCanBeAssigned(undefined, false);
    assertOwnerClaimCanBeAssigned('reader', false);
    assertOwnerClaimCanBeAssigned('owner', true);
    assert.throws(() => assertOwnerClaimCanBeAssigned('owner', false), /ACCOUNT_ALREADY_HAS_OWNER_CLAIM_WITHOUT_RECOVERY_LOCK/);
    assert.throws(() => assertOwnerClaimCanBeAssigned('admin', true), /TARGET_ACCOUNT_ALREADY_HAS_ELEVATED_OR_UNKNOWN_ROLE/);
    assert.throws(() => assertOwnerClaimCanBeAssigned('unexpected', false), /TARGET_ACCOUNT_ALREADY_HAS_ELEVATED_OR_UNKNOWN_ROLE/);
  });
});

describe('owner bootstrap integration invariants', () => {
  const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

  it('keeps initial provisioning local-only and requires explicit project/confirmation guards', () => {
    const script = read('scripts/bootstrap-owner.ts');
    const api = read('src/server/authClaimsApi.ts');
    assert.ok(script.includes('BOOTSTRAP_CONFIRMATION'));
    assert.ok(script.includes('FIREBASE_PROJECT_ID'));
    assert.ok(script.includes('FIREBASE_DATABASE_ID'));
    assert.ok(script.includes("auth.getUserByEmail(ownerEmail)"));
    assert.ok(api.includes("authClaimsRouter.post('/bootstrap'"));
    assert.ok(api.includes("return res.status(403)"));
  });

  it('grants future owners only through authenticated owner middleware and verified Firebase accounts', () => {
    const api = read('src/server/authClaimsApi.ts');
    assert.ok(api.includes("authClaimsRouter.post('/grant-owner', authenticateToken, requireOwnerRole"));
    assert.ok(api.includes('targetUser.emailVerified'));
    assert.ok(api.includes("role: 'owner'"));
    assert.ok(api.includes('isFounder: false'));
    assert.ok(api.includes('targetRef.create'));
    assert.ok(api.includes('targetRef.delete()'));
  });

  it('provides a read-only verifier for matching Auth claims and Firestore founder state', () => {
    const verifier = read('scripts/verify-owner.ts');
    assert.ok(verifier.includes("auth.getUserByEmail(email)"));
    assert.ok(verifier.includes("user.customClaims?.role === 'owner'"));
    assert.ok(verifier.includes("bootstrap.status === 'completed'"));
    assert.ok(verifier.includes("admin.isFounder === true"));
    assert.doesNotMatch(verifier, /setCustomUserClaims|\.set\(|\.create\(|\.delete\(/);
    const packageJson = JSON.parse(read('package.json'));
    assert.equal(packageJson.scripts['owner:verify'], 'tsx scripts/verify-owner.ts');
  });

  it('keeps the founder protected while allowing revocation of non-founder owner records', () => {
    const api = read('src/server/authClaimsApi.ts');
    const modal = read('src/components/AdminManagementModal.tsx');
    assert.ok(api.includes("adminSnap.data()?.isFounder"));
    assert.ok(modal.includes('if (adminAccount.isFounder)'));
    assert.ok(modal.includes('admin.isFounder ?'));
    assert.ok(modal.includes('grantOwnerRole(email)'));
  });
});
