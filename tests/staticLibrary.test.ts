import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

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
  const vercelConfig = JSON.parse(read('vercel.json'));
  const deploymentGate = read('scripts/assert-library-ready.mjs');

  it('must block Vercel deployment until the full static library passes rights and integrity checks', () => {
    assert.match(vercelConfig.buildCommand, /node scripts\/assert-library-ready\.mjs/);
    assert.match(deploymentGate, /manifest\.minimumBooks/);
    assert.match(deploymentGate, /maximumWordsPerBook/);
    assert.match(deploymentGate, /maximumTotalWords/);
    assert.match(deploymentGate, /cc-by-4-translation/);
    assert.match(deploymentGate, /public-domain-life70-screen/);
    assert.match(deploymentGate, /sourceHash/);
    assert.match(deploymentGate, /historyUrl/);
    assert.match(deploymentGate, /licenseQuote/);
  });


  it('must fail closed for an empty catalogue and pass a complete rights-screened fixture', () => {
    const gatePath = path.resolve(process.cwd(), 'scripts/assert-library-ready.mjs');
    const makeRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hukm-library-gate-'));
    const write = (root: string, relativePath: string, value: unknown) => {
      const target = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, JSON.stringify(value, null, 2), 'utf8');
    };
    const runGate = (root: string) => spawnSync(
      process.execPath,
      [gatePath, '--root', root],
      { encoding: 'utf8' }
    );

    const emptyRoot = makeRoot();
    try {
      write(emptyRoot, 'src/data/library/manifest.json', {
        minimumBooks: 1,
        minimumWords: 10,
        maximumWordsPerBook: 100,
        minimumChapters: 3,
        maximumTotalWords: 100,
      });
      write(emptyRoot, 'src/data/library/catalog.json', []);
      const result = runGate(emptyRoot);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Expected at least 1 complete books; found 0/);
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }

    const validRoot = makeRoot();
    try {
      write(validRoot, 'src/data/library/manifest.json', {
        minimumBooks: 1,
        minimumWords: 10,
        maximumWordsPerBook: 100,
        minimumChapters: 3,
        maximumTotalWords: 100,
      });
      write(validRoot, 'src/data/library/catalog.json', [{ id: 'book-1' }]);
      write(validRoot, 'src/data/library/books/book-1.json', {
        id: 'book-1',
        title: 'كتاب تجريبي',
        author: 'مؤلف تجريبي',
        status: 'completed',
        wordCount: 10,
        chapters: [
          { status: 'ready', content: ['نص الفصل الأول'] },
          { status: 'ready', content: ['نص الفصل الثاني'] },
          { status: 'ready', content: ['نص الفصل الثالث'] },
        ],
        rights: {
          tier: 'cc-by-4-translation',
          translationCovered: true,
          originalTextStatus: 'public-domain',
          license: 'CC BY 4.0 — الترجمة العربية',
          bookUrl: 'https://example.org/book',
          historyUrl: 'https://example.org/revision',
          sourceHash: 'a'.repeat(64),
          licenseQuote: 'CC BY 4.0',
          attribution: 'Attribution fixture',
        },
      });
      const result = runGate(validRoot);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.match(result.stdout, /PASS: 1 complete, rights-screened books/);
    } finally {
      fs.rmSync(validRoot, { recursive: true, force: true });
    }
  });


  it('must validate the actual generated library with the Vercel deployment gate when books are present', (context) => {
    const directory = path.resolve(process.cwd(), 'src/data/library/books');
    const files = fs.existsSync(directory)
      ? fs.readdirSync(directory).filter((file) => file.endsWith('.json'))
      : [];
    if (files.length === 0) {
      context.skip('The source-library sync has not committed full-text books yet.');
      return;
    }
    const gatePath = path.resolve(process.cwd(), 'scripts/assert-library-ready.mjs');
    const result = spawnSync(process.execPath, [gatePath], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /PASS:/);
  });

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
    assert.match(syncScript, /const datasetUrl = `https:\/\/huggingface\.co\/datasets\/\$\{DATASET\}`/);
    assert.match(syncScript, /const datasetRevisionUrl = revisionUrl\(manifest\.datasetRevision\)/);
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
