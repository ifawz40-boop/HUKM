import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('HUKM — bundled heritage library architecture', () => {
  const app = read('src/App.tsx');
  const data = read('src/data/hukmData.ts');
  const libraryIndex = read('src/data/library/index.ts');
  const syncScript = read('scripts/sync-public-library.mjs');
  const serverApi = read('src/server/authClaimsApi.ts');

  it('must not load or persist the public book catalogue through Firestore', () => {
    for (const forbidden of [
      'fetchBooksFromFirestore',
      'saveBookToFirestore',
      'deleteBookFromFirestore',
      'fetchCategoriesFromFirestore',
      'saveCategoryToFirestore',
      'deleteCategoryFromFirestore',
    ]) {
      assert.equal(app.includes(forbidden), false, `App must not call ${forbidden}`);
    }
    assert.match(libraryIndex, /import\.meta\.glob\('\.\/books\/\*\.json'/);
    assert.equal(app.includes("localStorage.getItem('hukm_books_v1')"), false);
    assert.equal(app.includes("localStorage.getItem('hukm_books_v2')"), false);
    assert.equal(app.includes("localStorage.getItem('hukm_books_v3')"), false);
  });

  it('must clear only obsolete book and category caches while preserving user reading data', () => {
    assert.match(app, /for \(const key of \['hukm_books_v1', 'hukm_books_v2', 'hukm_books_v3', 'hukm_categories_v1'\]\)/);
    assert.match(app, /localStorage\.removeItem\(key\)/);
    assert.match(app, /getAllReadingProgress/);
    assert.match(app, /getStoredBookmarks/);
  });

  it('must not ship the old sample media, empty book seed or fictional category seed', () => {
    assert.equal(data.includes('HUKM_PRESET_MEDIA'), false);
    assert.equal(data.includes('INITIAL_BOOKS'), false);
    assert.equal(data.includes('INITIAL_CATEGORIES'), false);
    assert.match(libraryIndex, /PUBLIC_LIBRARY_CATEGORIES/);
    assert.match(libraryIndex, /PUBLIC_LIBRARY_BOOKS/);
  });

  it('must validate source tier, license, book length, chapters, genre and completeness before bundling', () => {
    assert.match(syncScript, /works-pd-core/);
    assert.match(syncScript, /CC BY-SA 4\.0/);
    assert.match(syncScript, /row\.words/);
    assert.match(syncScript, /row\.chapters/);
    assert.match(syncScript, /row\.source_pages/);
    assert.match(syncScript, /row\.genre === 'poetry'/);
    assert.match(syncScript, /أعمال غير مكتملة/);
    assert.match(syncScript, /minimumBooks/);
  });

  it('must preserve attribution, revision history and share-alike license metadata in each bundled book', () => {
    assert.match(syncScript, /sourcePages/);
    assert.match(syncScript, /historyUrl/);
    assert.match(syncScript, /licenseUrl/);
    assert.match(syncScript, /datasetCitation/);
    assert.match(syncScript, /CC BY-SA 4\.0/);
  });

  it('must gate legacy Firestore deletion behind founder verification and an exact confirmation phrase', () => {
    const routeStart = serverApi.indexOf("authClaimsRouter.post('/purge-legacy-library'");
    assert.ok(routeStart >= 0);
    const route = serverApi.slice(routeStart, serverApi.indexOf("authClaimsRouter.get('/my-claims'", routeStart));
    assert.match(route, /authenticateToken, requireFounderOwner/);
    assert.match(route, /DELETE_ALL_LEGACY_LIBRARY_DATA/);
    assert.match(route, /\['books', 'bookDraftChapters', 'categories'\]/);
    assert.match(route, /status: 'completed'/);
    assert.match(route, /status: 'failed'/);
  });

  it('must retain source and license details for every generated full-text book', (t) => {
    const directory = path.resolve(process.cwd(), 'src/data/library/books');
    const files = fs.existsSync(directory)
      ? fs.readdirSync(directory).filter((file) => file.endsWith('.json'))
      : [];
    if (files.length === 0) {
      t.skip('The GitHub Actions dataset sync has not committed the generated book files yet.');
      return;
    }
    for (const file of files) {
      const book = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
      assert.ok(book.id && book.title && book.author, `${file} must have grounded identity metadata`);
      assert.equal(book.status, 'completed');
      assert.ok(book.chapters.length > 0, `${file} must include chapters`);
      assert.ok(book.chapters.every((chapter: any) => chapter.status === 'ready' && chapter.content.length > 0));
      assert.equal(book.rights.license, 'CC BY-SA 4.0');
      assert.ok(book.rights.sourceUrl);
      assert.ok(book.rights.historyUrl);
      assert.ok(book.rights.sourcePages.length > 0);
    }
  });
});
