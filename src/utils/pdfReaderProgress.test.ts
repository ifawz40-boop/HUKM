import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampPdfPage,
  clampPdfZoom,
  getPdfReaderProgressKey,
  parsePdfReaderProgress,
  serializePdfReaderProgress,
} from './pdfReaderProgress';

test('PDF progress keys are scoped by document and account', () => {
  assert.equal(
    getPdfReaderProgressKey('book/a', 'user 1'),
    'hukm:pdf-reader:v1:book%2Fa:user%201'
  );
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

test('saved progress is parsed defensively and clamped to document length', () => {
  assert.deepEqual(parsePdfReaderProgress(null, 79), { page: 1, zoom: 1, fitToWidth: true });
  assert.deepEqual(parsePdfReaderProgress('not-json', 79), { page: 1, zoom: 1, fitToWidth: true });
  assert.deepEqual(parsePdfReaderProgress('{"page":500,"zoom":4}', 79), { page: 79, zoom: 2.5, fitToWidth: true });
  assert.deepEqual(parsePdfReaderProgress('{"page":-3,"zoom":0.2}', 79), { page: 1, zoom: 0.7, fitToWidth: true });
});

test('serialized PDF progress contains normalized page, zoom and fit-width mode', () => {
  assert.equal(serializePdfReaderProgress(5.9, 4, false), '{"page":5,"zoom":2.5,"fitToWidth":false}');
});
