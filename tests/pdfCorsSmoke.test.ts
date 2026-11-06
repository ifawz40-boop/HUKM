import test from 'node:test';
import assert from 'node:assert/strict';

test('Wikimedia Commons PDF source permits anonymous cross-origin PDF.js reads', async () => {
  const url = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/%D9%83%D8%AA%D8%A7%D8%A8_%D9%84%D8%B3%D8%A7%D9%86_%D8%BA%D8%B5%D9%86_%D9%84%D8%A8%D9%86%D8%A7%D9%86_%D9%81%D9%8A_%D8%A7%D9%86%D8%AA%D9%82%D8%A7%D8%AF_%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9_%D8%A7%D9%84%D8%B9%D8%B5%D8%B1%D9%8A%D8%A9.pdf';
  const response = await fetch(url, {
    headers: {
      Origin: 'https://hukm-vdqc.vercel.app',
      Range: 'bytes=0-1023',
    },
    signal: AbortSignal.timeout(20_000),
  });
  const observed = {
    status: response.status,
    contentType: response.headers.get('content-type'),
    allowOrigin: response.headers.get('access-control-allow-origin'),
    exposeHeaders: response.headers.get('access-control-expose-headers'),
    acceptRanges: response.headers.get('accept-ranges'),
    contentRange: response.headers.get('content-range'),
  };
  console.log('WIKIMEDIA_PDF_CORS_SMOKE', JSON.stringify(observed));
  await response.body?.cancel();

  assert.ok(response.status === 200 || response.status === 206, 'upstream must return a readable PDF response');
  assert.match(observed.contentType || '', /application\/pdf/i);
  assert.ok(
    observed.allowOrigin === '*' || observed.allowOrigin === 'https://hukm-vdqc.vercel.app',
    'upload.wikimedia.org must allow the HUKM origin for PDF.js fetches'
  );
});
