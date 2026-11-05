/** Conservative email shape validation shared by CLI and HTTP provisioning paths. */
export function isValidOwnerEmail(email: string): boolean {
  return /^(?=.{3,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(email);
}

export interface OwnerBootstrapState {
  bootstrapExists: boolean;
  bootstrapData?: Record<string, unknown> | null;
  ownerUid: string;
  ownerAdminExists: boolean;
  registeredOwnerUids: string[];
}

export type OwnerBootstrapDecision = 'reserve' | 'resume';

/**
 * Fail-closed state machine for the one-time first-owner bootstrap.
 * Existing admin records are never overwritten by the bootstrap script.
 */
export function decideOwnerBootstrap(state: OwnerBootstrapState): OwnerBootstrapDecision {
  const { bootstrapExists, bootstrapData, ownerUid, ownerAdminExists, registeredOwnerUids } = state;

  if (!ownerUid.trim()) {
    throw new Error('OWNER_UID_REQUIRED');
  }

  if (bootstrapExists) {
    if (bootstrapData?.status === 'completed' || bootstrapData?.completed === true || bootstrapData?.locked === true) {
      throw new Error('BOOTSTRAP_ALREADY_COMPLETED');
    }

    if (bootstrapData?.status !== 'pending') {
      throw new Error('BOOTSTRAP_STATE_UNRECOGNIZED');
    }

    if (bootstrapData.ownerUid !== ownerUid) {
      throw new Error('BOOTSTRAP_RESERVED_BY_OTHER_USER');
    }

    if ((bootstrapData.managerUid ?? null) !== null || (bootstrapData.managerEmail ?? null) !== null) {
      throw new Error('BOOTSTRAP_MANAGER_CONFIGURATION_UNEXPECTED');
    }

    if (ownerAdminExists || registeredOwnerUids.length > 0) {
      throw new Error('BOOTSTRAP_PENDING_WITH_EXISTING_OWNER_RECORD');
    }

    return 'resume';
  }

  if (ownerAdminExists) {
    throw new Error('TARGET_ADMIN_RECORD_ALREADY_EXISTS');
  }

  if (registeredOwnerUids.length > 0) {
    throw new Error('OWNER_REGISTRY_ALREADY_POPULATED');
  }

  return 'reserve';
}

/** Only an unprivileged or reader claim may be promoted during first-owner setup. */
export function assertOwnerClaimCanBeAssigned(
  currentRole: unknown,
  isRecovery: boolean
): void {
  if (currentRole === undefined || currentRole === null || currentRole === '' || currentRole === 'reader') {
    return;
  }

  if (currentRole === 'owner' && isRecovery) {
    return;
  }

  if (currentRole === 'owner') {
    throw new Error('ACCOUNT_ALREADY_HAS_OWNER_CLAIM_WITHOUT_RECOVERY_LOCK');
  }

  throw new Error('TARGET_ACCOUNT_ALREADY_HAS_ELEVATED_OR_UNKNOWN_ROLE');
}
