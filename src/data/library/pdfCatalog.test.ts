import test from 'node:test';
import assert from 'node:assert/strict';
import { PDF_LIBRARY_ITEMS } from './pdfCatalog';
test('the public PDF shelf contains no item until editorial approval is recorded',()=>assert.deepEqual(PDF_LIBRARY_ITEMS,[]));
