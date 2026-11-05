import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmailAddress, resolveEmailRecipientTarget } from '../src/server/emailRecipients.ts';

describe('Email recipient intent validation', () => {
  it('treats omission of recipientEmail as the only broadcast signal', () => {
    assert.deepEqual(resolveEmailRecipientTarget({ subject: 'News', htmlContent: '<p>News</p>' }), {
      kind: 'broadcast',
    });
  });

  it('normalizes and accepts a valid individual mailbox', () => {
    assert.deepEqual(resolveEmailRecipientTarget({ recipientEmail: '  Reader+One@Example.COM  ' }), {
      kind: 'individual',
      email: 'reader+one@example.com',
    });
  });

  it('rejects empty, malformed, oversized, or non-string recipient fields instead of broadcasting', () => {
    for (const recipientEmail of ['', '   ', null, 42, ['reader@example.com'], 'reader@example', 'two@@example.com', 'bad address@example.com', 'a'.repeat(250) + '@example.com']) {
      assert.deepEqual(resolveEmailRecipientTarget({ recipientEmail }), { kind: 'invalid' });
    }
  });

  it('validates subscriber addresses before adding them to a broadcast', () => {
    assert.equal(isValidEmailAddress('reader@example.com'), true);
    assert.equal(isValidEmailAddress('broken-address'), false);
    assert.equal(isValidEmailAddress('reader@invalid'), false);
    assert.equal(isValidEmailAddress('reader @example.com'), false);
  });

  it('rejects a non-object payload', () => {
    assert.deepEqual(resolveEmailRecipientTarget(null), { kind: 'invalid' });
    assert.deepEqual(resolveEmailRecipientTarget(['reader@example.com']), { kind: 'invalid' });
  });
});
