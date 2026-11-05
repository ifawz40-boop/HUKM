import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateWelcomeEmailHtml,
  generateNewReleaseEmailHtml,
  generateCustomBroadcastEmailHtml,
} from '../src/utils/emailTemplateGenerator.ts';
import type { BookProject, BookChapter } from '../src/types/hukm.ts';

describe('Email template output safety', () => {
  it('escapes signup-provided names and email addresses', () => {
    const html = generateWelcomeEmailHtml('<img src=x onerror=alert(1)>', 'reader"><script>alert(1)</script>@example.com');
    assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
    assert.equal(html.includes('<script>alert(1)</script>'), false);
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  });

  it('escapes book metadata and rejects unsafe media URLs in release emails', () => {
    const book = {
      id: 'book"><script>alert(1)</script>',
      title: '<svg onload=alert(1)>',
      subtitle: '<b>unsafe subtitle</b>',
      summary: 'safe fallback summary',
      coverImage: 'javascript:alert(1)',
      standaloneEpisode: {
        hasStandaloneEpisode: true,
        videoUrl: 'javascript:alert(2)',
        description: '<iframe src=x onload=alert(3)>',
      },
      socialLinks: { youtubeUrl: 'data:text/html,evil' },
    } as unknown as BookProject;
    const chapter = {
      title: '<script>chapter</script>',
      subtitle: '<img src=x onerror=alert(4)>',
    } as unknown as BookChapter;

    const html = generateNewReleaseEmailHtml(book, chapter, '<b>reader</b>');
    assert.equal(html.includes('<script>chapter</script>'), false);
    assert.equal(html.includes('<svg onload=alert(1)>'), false);
    assert.equal(html.includes('<iframe src=x onload=alert(3)>'), false);
    assert.equal(html.includes('<img src=x onerror=alert(4)>'), false);
    assert.equal(/(?:javascript:|data:text\/html)/i.test(html), false);
    assert.ok(html.includes('&lt;script&gt;chapter&lt;/script&gt;'));
    assert.ok(html.includes('https://hukm.media?book='));
  });

  it('escapes broadcast content and falls back from unsafe action URLs', () => {
    const html = generateCustomBroadcastEmailHtml(
      '<script>subject</script>',
      '<img src=x onerror=alert(1)>\n<script>body</script>',
      'javascript:alert(1)',
      '<svg onload=alert(2)>'
    );
    assert.equal(html.includes('<script>subject</script>'), false);
    assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
    assert.equal(html.includes('<script>body</script>'), false);
    assert.equal(html.includes('<svg onload=alert(2)>'), false);
    assert.ok(html.includes('&lt;script&gt;subject&lt;/script&gt;'));
    assert.ok(html.includes('href="https://hukm.media"'));
  });

  it('keeps valid HTTPS action links working', () => {
    const html = generateCustomBroadcastEmailHtml('خبر', 'نص آمن', 'https://example.com/news?a=1&b=2', 'اقرأ');
    assert.ok(html.includes('href="https://example.com/news?a=1&amp;b=2"'));
  });
});
