import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBookSourceLinkLabel,
  getBookSourceName,
  getSourcePageDisclosure,
} from './bookProvenance';
import type { BookSourcePage } from '../types/hukm';

const pages = (count: number): BookSourcePage[] =>
  Array.from({ length: count }, (_, index) => ({
    title: `صفحة ${index + 1}`,
    url: `https://ar.wikisource.org/wiki/Page_${index + 1}`,
    revisionId: index + 100,
    revisionTimestamp: '2026-11-06T00:00:00Z',
  }));

test('Hindawi legacy records keep a clear Arabic publisher attribution', () => {
  const source = {
    sourceUrl: 'https://www.hindawi.org/books/123/',
    publisher: 'Hindawi Foundation',
  };

  assert.equal(getBookSourceName(source), 'مؤسسة هنداوي');
  assert.equal(getBookSourceLinkLabel(source), 'صفحة الكتاب لدى مؤسسة هنداوي');
});

test('Wikisource records are identified from their source URL, not mislabeled as a publisher', () => {
  const source = {
    sourceUrl: 'https://ar.wikisource.org/wiki/Some_Book',
    publisher: '',
  };

  assert.equal(getBookSourceName(source), 'ويكي مصدر');
  assert.equal(getBookSourceLinkLabel(source), 'صفحة العمل في ويكي مصدر');
});

test('explicit Arabic source names take precedence over host-derived labels', () => {
  const source = {
    sourceUrl: 'https://example.org/book',
    publisher: '',
    sourceNameAr: 'المكتبة الرقمية',
  };

  assert.equal(getBookSourceName(source), 'المكتبة الرقمية');
  assert.equal(getBookSourceLinkLabel(source), 'صفحة الكتاب لدى المكتبة الرقمية');
});

test('unknown and invalid source URLs use a neutral safe label', () => {
  assert.equal(
    getBookSourceLinkLabel({ sourceUrl: 'not a url', publisher: '' }),
    'صفحة المصدر'
  );
  assert.equal(
    getBookSourceName({ sourceUrl: 'not a url', publisher: '' }),
    'المصدر الأصلي'
  );
});

test('source-page disclosure reports the exact visible and total counts', () => {
  const disclosure = getSourcePageDisclosure(pages(20));

  assert.equal(disclosure.totalCount, 20);
  assert.equal(disclosure.visibleCount, 12);
  assert.equal(disclosure.isPartial, true);
  assert.equal(disclosure.visiblePages[0].revisionId, 100);
  assert.equal(disclosure.visiblePages[11].revisionId, 111);
});

test('source-page disclosure shows every page when the list fits the limit', () => {
  const disclosure = getSourcePageDisclosure(pages(3));

  assert.equal(disclosure.totalCount, 3);
  assert.equal(disclosure.visibleCount, 3);
  assert.equal(disclosure.isPartial, false);
});

test('source-page disclosure handles empty and invalid limits safely', () => {
  assert.equal(getSourcePageDisclosure([]).isPartial, false);
  assert.equal(getSourcePageDisclosure(pages(15), 0).visibleCount, 12);
  assert.equal(getSourcePageDisclosure(pages(15), Number.NaN).visibleCount, 12);
});
