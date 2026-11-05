import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('HUKM — bundled Arabic library architecture', () => {
  const app = read('src/App.tsx');
  const data = read('src/data/hukmData.ts');
  const libraryIndex = read('src/data/library/index.ts');
  const syncScript = read('scripts/sync-public-library.mjs');
  const serverApi = read('src/server/authClaimsApi.ts');
  const firebaseConfig = JSON.parse(read('firebase.json'));
  const bootstrapScript = read('scripts/bootstrap-owner.ts');
  const verifyScript = read('scripts/verify-owner.ts');
  const firebaseAdmin = read('src/server/firebaseAdmin.ts');

  it('must bind Firestore rules to the exact named database used by every Admin SDK entry point', () => {
    const expectedDatabase = 'ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96';
    assert.equal(firebaseConfig.firestore.database, expectedDatabase);
    assert.equal(firebaseConfig.firestore.rules, 'firestore.rules');
    for (const source of [bootstrapScript, verifyScript, firebaseAdmin]) {
      assert.match(source, new RegExp(expectedDatabase));
    }
  });

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
    assert.match(libraryIndex, /loadPublicLibraryBook/);
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

  it('must enforce the explicit per-book CC BY or conservative public-domain rights paths', () => {
    assert.match(syncScript, /Bayanat-Labs\/open-arabic-books/);
    assert.match(syncScript, /translation_covered/);
    assert.match(syncScript, /original_text_status === 'public-domain'/);
    assert.match(syncScript, /CC BY 4\.0/);
    assert.match(syncScript, /minimumWords/);
    assert.match(syncScript, /minimumChapters/);
    assert.match(syncScript, /maximumTotalWords/);
    assert.match(syncScript, /rawDeathYear === null \|\| rawDeathYear === undefined/);
    assert.match(syncScript, /credit\.deathYear !== null && credit\.deathYear <= 1955/);
    assert.match(syncScript, /getRightsKind/);
  });

  it('must preserve full chapter text, footnotes, exact colophon, attribution and source hash', () => {
    assert.match(syncScript, /fetchChapters/);
    assert.match(syncScript, /text_raw/);
    assert.match(syncScript, /mapFootnotes/);
    assert.match(syncScript, /licenseQuote/);
    assert.match(syncScript, /sourceHash/);
    assert.match(syncScript, /datasetCitation/);
    assert.match(syncScript, /historyUrl/);
  });

  it('must lazy-load full book files rather than putting all text in the initial catalogue bundle', () => {
    assert.match(libraryIndex, /import\.meta\.glob\('\.\/books\/\*\.json'\)/);
    assert.match(libraryIndex, /import\.meta\.glob\('\.\/catalog\.json'/);
  });

  it('must gate legacy Firestore deletion behind founder verification and exact confirmation', () => {
    const routeStart = serverApi.indexOf("authClaimsRouter.post('/purge-legacy-library'");
    assert.ok(routeStart >= 0);
    const routeEnd = serverApi.indexOf("authClaimsRouter.get('/my-claims'", routeStart);
    const route = serverApi.slice(routeStart, routeEnd > 0 ? routeEnd : undefined);
    assert.match(route, /authenticateToken, requireFounderOwner/);
    assert.match(route, /DELETE_ALL_LEGACY_LIBRARY_DATA/);
    assert.match(route, /\['books', 'bookDraftChapters', 'categories'\]/);
    assert.match(route, /status: 'completed'/);
    assert.match(route, /status: 'failed'/);
  });

  it('must retain source and rights details for every generated full-text book', (t) => {
    const directory = path.resolve(process.cwd(), 'src/data/library/books');
    const files = fs.existsSync(directory)
      ? fs.readdirSync(directory).filter((file) => file.endsWith('.json'))
      : [];
    if (files.length === 0) {
      t.skip('The GitHub Actions dataset sync has not committed generated full-text books yet.');
      return;
    }
    const catalog = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/data/library/catalog.json'), 'utf8'));
    assert.equal(catalog.length, files.length);
    for (const file of files) {
      const book = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
      assert.ok(book.id && book.title && book.author, `${file} must have grounded identity metadata`);
      assert.equal(book.status, 'completed');
      assert.ok(book.chapters.length >= 3, `${file} must include multiple sections`);
      assert.ok(book.chapters.every((chapter: any) => chapter.status === 'ready' && chapter.content.length > 0));
      assert.ok(book.rights.translationCovered === true || book.rights.tier === 'public-domain-life70-screen');
      assert.equal(book.rights.originalTextStatus, 'public-domain');
      assert.match(book.rights.license, /CC BY 4\.0|الملكية العامة/);
      assert.ok(book.rights.bookUrl);
      assert.ok(book.rights.historyUrl);
      assert.ok(book.rights.sourceHash);
      assert.ok(book.rights.licenseQuote);
      assert.ok(book.rights.attribution);
    }
  });
});
