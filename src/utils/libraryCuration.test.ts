import test from 'node:test';
import assert from 'node:assert/strict';
import { filterLibraryCandidates, isSafeExternalUrl } from './libraryCuration';

const candidates = [
  {
    id: 'ibn-taymiyyah-radd',
    title: 'الرد على المنطقيين',
    author: 'ابن تيمية',
    category: 'islamic-philosophy-critique',
    status: 'metadata-verified-content-review-pending',
    edition: 'تحقيق عبد الصمد شرف الدين',
  },
  {
    id: 'ibn-al-qayyim-daa',
    title: 'الداء والدواء',
    author: 'ابن قيم الجوزية',
    category: 'self-development',
    status: 'editorial-review',
    reason: 'تزكية القلب والتوبة',
  },
  {
    id: 'ibn-jubayr-rihla',
    title: 'رحلة ابن جبير',
    author: 'ابن جبير',
    category: 'travel',
    status: 'metadata-verified-content-review-pending',
  },
];

test('external candidate links accept HTTPS only and reject credentials', () => {
  assert.equal(isSafeExternalUrl('https://waqfeya.net/book/1'), true);
  assert.equal(isSafeExternalUrl('http://waqfeya.net/book/1'), false);
  assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalUrl('https://user:pass@example.org/book'), false);
  assert.equal(isSafeExternalUrl('not a url'), false);
  assert.equal(isSafeExternalUrl(null), false);
});

test('candidate search matches Arabic title, author, edition and reason', () => {
  assert.deepEqual(filterLibraryCandidates(candidates, { query: 'المنطقيين' }).map((book) => book.id), ['ibn-taymiyyah-radd']);
  assert.deepEqual(filterLibraryCandidates(candidates, { query: 'ابن قيم' }).map((book) => book.id), ['ibn-al-qayyim-daa']);
  assert.deepEqual(filterLibraryCandidates(candidates, { query: 'عبد الصمد' }).map((book) => book.id), ['ibn-taymiyyah-radd']);
  assert.deepEqual(filterLibraryCandidates(candidates, { query: 'التوبة' }).map((book) => book.id), ['ibn-al-qayyim-daa']);
});

test('candidate filters combine category and review status without leaking other records', () => {
  assert.deepEqual(
    filterLibraryCandidates(candidates, {
      category: 'travel',
      status: 'metadata-verified-content-review-pending',
    }).map((book) => book.id),
    ['ibn-jubayr-rihla'],
  );
  assert.deepEqual(
    filterLibraryCandidates(candidates, { category: 'religious' }),
    [],
  );
});

test('empty candidate filters return every candidate in source order', () => {
  assert.deepEqual(filterLibraryCandidates(candidates), candidates);
});
