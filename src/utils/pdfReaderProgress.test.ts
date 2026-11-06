import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampPdfPage,
  clampPdfZoom,
  getPdfReaderProgressKey,
  normalizePdfBookmarks,
  normalizePdfNotes,
  normalizePdfSearchText,
  parsePdfReaderProgress,
  searchPdfPages,
  serializePdfReaderProgress,
} from './pdfReaderProgress';

test('PDF progress keys are scoped by document and account', () => {
  assert.equal(getPdfReaderProgressKey('book/a', 'user 1'), 'hukm:pdf-reader:v1:book%2Fa:user%201');
  assert.notEqual(getPdfReaderProgressKey('book', 'user-a'), getPdfReaderProgressKey('book', 'user-b'));
  assert.notEqual(getPdfReaderProgressKey('book', null), getPdfReaderProgressKey('book', 'user-a'));
});

test('PDF page numbers are clamped to valid document bounds', () => {
  assert.equal(clampPdfPage(0, 79), 1);
  assert.equal(clampPdfPage(4.8, 79), 4);
  assert.equal(clampPdfPage(100, 79), 79);
  assert.equal(clampPdfPage(Number.NaN, 79), 1);
  assert.equal(clampPdfPage(12, 0), 1);
});

test('PDF zoom is finite and bounded', () => {
  assert.equal(clampPdfZoom(Number.NaN), 1);
  assert.equal(clampPdfZoom(0.1), 0.7);
  assert.equal(clampPdfZoom(3), 2.5);
  assert.equal(clampPdfZoom(1.234), 1.23);
});

test('bookmarks are deduplicated, sorted and constrained to the document', () => {
  assert.deepEqual(normalizePdfBookmarks([4, 2, 4, 0, 81, '3', 'bad'], 79), [2, 3, 4]);
  assert.deepEqual(normalizePdfBookmarks('not-an-array', 79), []);
});

test('notes are normalized, bounded and ignore invalid page keys', () => {
  assert.deepEqual(
    normalizePdfNotes({ '2': '  note  ', '0': 'invalid', '80': 'outside', abc: 'bad', '3': 4 }, 79),
    { '2': 'note' }
  );
  assert.equal(normalizePdfNotes({ '1': 'x'.repeat(6000) }, 79)['1'].length, 5000);
});

test('saved progress is parsed defensively and clamps page, zoom, bookmarks and notes', () => {
  assert.deepEqual(parsePdfReaderProgress(null, 79), {
    page: 1, zoom: 1, fitToWidth: true, bookmarks: [], notes: {},
  });
  assert.deepEqual(parsePdfReaderProgress('not-json', 79), {
    page: 1, zoom: 1, fitToWidth: true, bookmarks: [], notes: {},
  });
  assert.deepEqual(
    parsePdfReaderProgress('{"page":500,"zoom":4,"fitToWidth":false,"bookmarks":[4,4,0,81],"notes":{"2":" saved ","90":"bad"}}', 79),
    { page: 79, zoom: 2.5, fitToWidth: false, bookmarks: [4], notes: { '2': 'saved' } }
  );
});

test('serialized PDF progress contains normalized reading state and annotations', () => {
  assert.equal(
    serializePdfReaderProgress(5.9, 4, false, [4, 2, 4], { '2': 'note' }),
    '{"page":5,"zoom":2.5,"fitToWidth":false,"bookmarks":[2,4],"notes":{"2":"note"}}'
  );
});

test('Arabic PDF text search ignores diacritics and common alef/ya variants', () => {
  assert.equal(normalizePdfSearchText('إِنَّ الْقُرْآنَ هُدًى'), 'ان القران هدي');
});

test('PDF text search returns matching pages and reports progress', async () => {
  const pageTexts = ['', 'مقدمة في العلوم', 'اللغة العربية', 'العلوم الحديثة'];
  const progress: number[] = [];
  const results = await searchPdfPages(
    3,
    'العلوم',
    async (page) => pageTexts[page],
    (completed) => progress.push(completed)
  );

  assert.deepEqual(results, [1, 3]);
  assert.deepEqual(progress, [1, 2, 3]);
});

test('PDF text search can be aborted between page reads', async () => {
  const controller = new AbortController();
  await assert.rejects(
    searchPdfPages(
      5,
      'word',
      async (page) => {
        if (page === 1) controller.abort();
        return 'word';
      },
      undefined,
      controller.signal
    ),
    { name: 'AbortError' }
  );
});
