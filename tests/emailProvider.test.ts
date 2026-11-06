import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEmailProviderConfig } from '../src/server/emailProvider.ts';

describe('Email provider configuration', () => {
  it('prefers Gmail SMTP and strips visual spaces from Google App Passwords', () => {
    const config = resolveEmailProviderConfig({
      GMAIL_USER: 'HUKM.CONTACT@gmail.com',
      GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop',
      RESEND_API_KEY: 're_test_fallback',
      EMAIL_FROM: 'HUKM MEDIA <updates@example.com>',
    });
    assert.deepEqual(config, {
      kind: 'gmail',
      user: 'hukm.contact@gmail.com',
      appPassword: 'abcdefghijklmnop',
      from: 'HUKM MEDIA <hukm.contact@gmail.com>',
    });
  });

  it('fails closed when only one Gmail credential is present', () => {
    const config = resolveEmailProviderConfig({ GMAIL_USER: 'hukm.contact@gmail.com' });
    assert.equal(config?.kind, 'misconfigured');
  });

  it('uses Resend only when Gmail is not configured and both Resend settings exist', () => {
    assert.deepEqual(
      resolveEmailProviderConfig({
        RESEND_API_KEY: 're_test_placeholder',
        EMAIL_FROM: 'HUKM MEDIA <updates@example.com>',
      }),
      {
        kind: 'resend',
        apiKey: 're_test_placeholder',
        from: 'HUKM MEDIA <updates@example.com>',
      }
    );
  });

  it('does not report a partial Resend configuration as ready', () => {
    assert.equal(resolveEmailProviderConfig({ RESEND_API_KEY: 're_test_placeholder' })?.kind, 'misconfigured');
  });

  it('returns no provider when no email secrets are configured', () => {
    assert.equal(resolveEmailProviderConfig({}), null);
  });
});
