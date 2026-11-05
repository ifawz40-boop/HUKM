import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
