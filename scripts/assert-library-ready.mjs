#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

let root = process.cwd();
const args = process.argv.slice(2);
if (args.length > 0) {
  if (args.length !== 2 || args[0] !== '--root') {
    console.error('[HUKM deployment gate] Usage: node assert-library-ready.mjs [--root <directory>]');
    process.exit(2);
  }
  root = path.resolve(args[1]);
}
const manifestPath = path.join(root, 'src/data/library/manifest.json');
const catalogPath = path.join(root, 'src/data/library/catalog.json');
const booksDir = path.join(root, 'src/data/library/books');

function stop(message) {
  console.error(`[HUKM deployment gate] ${message}`);
  process.exit(1);
}

function isSafeBookId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

function isSafeHttpUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function countWords(value) {
  return (String(value || '').match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu) || []).length;
}


try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (!Array.isArray(catalog)) stop('The static library catalogue must be a JSON array.');

  const files = fs.existsSync(booksDir)
    ? fs.readdirSync(booksDir).filter((name) => name.endsWith('.json')).sort()
    : [];
  if (files.length === 0 && manifest.allowEmptyDuringCuration === true) {
    if (catalog.length !== 0) stop('The empty-curation mode requires an empty public catalogue.');
    const curationPath = path.join(root, 'src/data/library/curation.json');
    if (!fs.existsSync(curationPath)) stop('The curation allowlist is required when the public catalogue is intentionally empty.');
    const curation = JSON.parse(fs.readFileSync(curationPath, 'utf8'));
    if (!Array.isArray(curation.approvedBookIds) || curation.approvedBookIds.length !== 0) {
      stop('An empty public catalogue cannot declare approved book IDs.');
    }
    console.log('[HUKM deployment gate] PASS: public catalogue intentionally empty during editorial curation; no unapproved books are exposed.');
    process.exit(0);
  }

  if (files.length < manifest.minimumBooks) {
    stop(`Expected at least ${manifest.minimumBooks} complete books; found ${files.length}. Refusing to publish an empty or incomplete library.`);
  }
  if (catalog.length !== files.length) {
    stop(`Catalogue/file count mismatch: ${catalog.length} catalogue entries and ${files.length} full-text files.`);
  }

  const allowedCategories = new Set(manifest.allowedCategories || []);
  const fileSet = new Set(files);
  const ids = new Set();
  let totalWords = 0;

  for (const entry of catalog) {
    if (!entry || !isSafeBookId(entry.id) || ids.has(entry.id)) {
      stop('Every catalogue entry must have a unique, non-empty book ID.');
    }
    ids.add(entry.id);

    const filename = `${entry.id}.json`;
    if (!fileSet.has(filename)) stop(`Missing full-text file for catalogue book ${entry.id}.`);

    const book = JSON.parse(fs.readFileSync(path.join(booksDir, filename), 'utf8'));
    if (book.id !== entry.id || !book.title || !book.author || book.status !== 'completed') {
      stop(`Book ${entry.id} has incomplete or mismatched identity metadata.`);
    }
    if (!allowedCategories.has(book.category)) {
      stop('Book ' + entry.id + ' uses category "' + book.category + '" outside HUKM approved editorial policy.');
    }
    if (
      entry.title !== book.title ||
      entry.author !== book.author ||
      entry.category !== book.category ||
      entry.wordCount !== book.wordCount ||
      entry.chapterCount !== book.chapterCount
    ) {
      stop(`Catalogue metadata does not match the full-text record for book ${entry.id}.`);
    }
    if (!Array.isArray(book.chapters) || book.chapters.length < manifest.minimumChapters ||
        book.chapterCount !== book.chapters.length || entry.chapterCount !== book.chapters.length) {
      stop(`Book ${entry.id} does not contain the expected number of complete sections.`);
    }
    const chapterIds = book.chapters.map((chapter) => chapter.id);
    const chapterNumbers = book.chapters.map((chapter) => chapter.chapterNumber);
    if (chapterIds.some((id) => typeof id !== 'string' || !id) ||
        new Set(chapterIds).size !== chapterIds.length ||
        chapterNumbers.some((number, index) => !Number.isSafeInteger(number) || number !== index + 1) ||
        new Set(chapterNumbers).size !== chapterNumbers.length ||
        book.chapters.some((chapter) => chapter.bookId !== book.id) ||
        book.chapters.some((chapter) =>
          !Object.hasOwn(chapter, 'exactDuplicateGroup') ||
          !Object.hasOwn(chapter, 'nearDuplicateGroup') ||
          (chapter.exactDuplicateGroup != null && typeof chapter.exactDuplicateGroup !== 'string') ||
          (chapter.nearDuplicateGroup != null && typeof chapter.nearDuplicateGroup !== 'string')
        )) {
      stop(`Book ${entry.id} has missing, mismatched or non-contiguous chapter identifiers/order/duplicate metadata.`);
    }
    if (!book.chapters.every((chapter) =>
      chapter.status === 'ready' &&
      Array.isArray(chapter.content) &&
      chapter.content.some((paragraph) => typeof paragraph === 'string' && paragraph.trim())
    )) {
      stop(`Book ${entry.id} contains an empty or unready section.`);
    }

    const wordCount = Number(book.wordCount || 0);
    const declaredChapterWords = book.chapters.reduce((sum, chapter) => sum + Number(chapter.wordCount || 0), 0);
    const extractedChapterWords = book.chapters.map((chapter) =>
      countWords((chapter.content || []).join(' '))
    );
    const extractedWordCount = extractedChapterWords.reduce((sum, value) => sum + value, 0);
    const chapterCountsValid = book.chapters.every((chapter, index) => {
      const declared = Number(chapter.wordCount || 0);
      const extracted = extractedChapterWords[index];
      return Number.isSafeInteger(declared) && declared > 0 &&
        extracted >= declared * 0.95 && extracted <= declared * 1.10;
    });
    if (!Number.isSafeInteger(wordCount) || wordCount < manifest.minimumWords || wordCount > manifest.maximumWordsPerBook ||
        declaredChapterWords !== wordCount || !chapterCountsValid ||
        extractedWordCount < wordCount * 0.95 || extractedWordCount > wordCount * 1.10) {
      stop(`Book ${entry.id} has an invalid or inconsistent declared/extracted word count.`);
    }
    totalWords += wordCount;

    const rights = book.rights || {};
    const rightsPathIsValid =
      (rights.tier === 'cc-by-4-translation' && rights.translationCovered === true) ||
      rights.tier === 'public-domain-life70-screen';
    if (!rightsPathIsValid || rights.originalTextStatus !== 'public-domain') {
      stop(`Book ${entry.id} does not meet an approved per-book rights path.`);
    }
    if (!Object.hasOwn(rights, 'nearDuplicateGroup') ||
        (rights.nearDuplicateGroup != null && typeof rights.nearDuplicateGroup !== 'string') ||
        !/CC BY 4\.0|الملكية العامة/.test(String(rights.license || '')) ||
        !isSafeHttpUrl(rights.bookUrl) ||
        !isSafeHttpUrl(rights.historyUrl) ||
        !isSafeHttpUrl(rights.licenseUrl) ||
        !/^[a-f0-9]{64}$/i.test(String(rights.sourceHash || '')) ||
        !rights.licenseQuote ||
        !rights.attribution) {
      stop(`Book ${entry.id} is missing source, attribution, licence or integrity evidence.`);
    }
  }

  if (totalWords > manifest.maximumTotalWords) {
    stop(`The bundled library exceeds the ${manifest.maximumTotalWords}-word deployment ceiling.`);
  }

  console.log(`[HUKM deployment gate] PASS: ${catalog.length} complete, rights-screened books; ${totalWords.toLocaleString('en-US')} words.`);
} catch (error) {
  stop(error instanceof Error ? error.message : String(error));
}
