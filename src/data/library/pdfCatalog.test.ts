import test from 'node:test';
import assert from 'node:assert/strict';
import { PDF_LIBRARY_ITEMS } from './pdfCatalog';

test('PDF scan fixtures keep source and public-domain evidence separate from transcriptions', () => {
  assert.equal(PDF_LIBRARY_ITEMS.length, 1);
  const item = PDF_LIBRARY_ITEMS[0];

  assert.equal(item.id, 'lisan-ghusn-lubnan-1891-scan');
  assert.equal(item.publicationYear, 1891);
  assert.equal(item.pageCount, 79);
  assert.equal(item.sourceRevisionId, 1186958260);
  assert.match(item.sourceUrl, /oldid=1186958260/);
  assert.equal(item.isScanned, true);
  assert.equal(item.searchAvailable, false);
  assert.match(item.fileUrl, /^https:\/\/upload\.wikimedia\.org\//);
  assert.match(item.sourceUrl, /^https:\/\/commons\.wikimedia\.org\//);
  assert.match(item.licenseUrl, /creativecommons\.org\/publicdomain\/mark\/1\.0/);
  assert.match(item.license, /الملكية العامة/);
  assert.match(item.attribution, /شاكر شقير/);
  assert.match(item.description, /ليست استيرادًا للتفريغ النصي/);
});
