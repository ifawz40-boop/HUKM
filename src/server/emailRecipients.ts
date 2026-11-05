export type EmailRecipientTarget =
  | { kind: 'broadcast' }
  | { kind: 'individual'; email: string }
  | { kind: 'invalid' };

/**
 * Deliberately modest validation for ordinary mailbox addresses.
 * It rejects empty values, whitespace, malformed domains, and oversized input.
 */
export function isValidEmailAddress(value: string): boolean {
  if (value.length === 0 || value.length > 254 || /\s/.test(value)) return false;
  const atIndex = value.indexOf('@');
  if (atIndex <= 0 || atIndex !== value.lastIndexOf('@') || atIndex > 64) return false;
  const domain = value.slice(atIndex + 1);
  return domain.length > 2 && domain.length <= 253 &&
    /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(domain) &&
    /^[^@]+@/.test(value);
}

/**
 * Broadcast is explicit by omission of recipientEmail. Presence of the field
 * always selects individual mode and must contain one valid mailbox address.
 */
export function resolveEmailRecipientTarget(body: unknown): EmailRecipientTarget {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { kind: 'invalid' };
  const payload = body as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(payload, 'recipientEmail')) {
    return { kind: 'broadcast' };
  }

  if (typeof payload.recipientEmail !== 'string') return { kind: 'invalid' };
  const email = payload.recipientEmail.trim().toLowerCase();
  return isValidEmailAddress(email) ? { kind: 'individual', email } : { kind: 'invalid' };
}
