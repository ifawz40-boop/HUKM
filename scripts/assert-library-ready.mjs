#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'src/data/library/manifest.json');
const catalogPath = path.join(root, 'src/data/library/catalog.json');
const booksDir = path.join(root, 'src/data/library/books');

function stop(message) {
  console.error(`[HUKM deployment gate] ${message}`);
  process.exit(1);
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (!Array.isArray(catalog)) stop('The static library catalogue must be a JSON array.');

  const files = fs.existsSync(booksDir)
    ? fs.readdirSync(booksDir).filter((name) => name.endsWith('.json')).sort()
    : [];
  if (files.length < manifest.minimumBooks) {
    stop(`Expected at least ${manifest.minimumBooks} complete books; found ${files.length}. Refusing to publish an empty or incomplete library.`);
  }
  if (catalog.length !== files.length) {
    stop(`Catalogue/file count mismatch: ${catalog.length} catalogue entries and ${files.length} full-text files.`);
  }

  const fileSet = new Set(files);
  const ids = new Set();
  let totalWords = 0;

  for (const entry of catalog) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)) {
      stop('Every catalogue entry must have a unique, non-empty book ID.');
    }
    ids.add(entry.id);

    const filename = `${entry.id}.json`;
    if (!fileSet.has(filename)) stop(`Missing full-text file for catalogue book ${entry.id}.`);

    const book = JSON.parse(fs.readFileSync(path.join(booksDir, filename), 'utf8'));
    if (book.id !== entry.id || !book.title || !book.author || book.status !== 'completed') {
      stop(`Book ${entry.id} has incomplete or mismatched identity metadata.`);
    }
    if (!Array.isArray(book.chapters) || book.chapters.length < manifest.minimumChapters) {
      stop(`Book ${entry.id} does not contain the required number of complete sections.`);
    }
    if (!book.chapters.every((chapter) =>
      chapter.status === 'ready' &&
      Array.isArray(chapter.content) &&
      chapter.content.some((paragraph) => typeof paragraph === 'string' && paragraph.trim())
    )) {
      stop(`Book ${entry.id} contains an empty or unready section.`);
    }

    const wordCount = Number(book.wordCount || 0);
    if (!Number.isFinite(wordCount) || wordCount < manifest.minimumWords || wordCount > manifest.maximumWordsPerBook) {
      stop(`Book ${entry.id} is outside the permitted word-count range.`);
    }
    totalWords += wordCount;

    const rights = book.rights || {};
    const rightsPathIsValid =
      (rights.tier === 'cc-by-4-translation' && rights.translationCovered === true) ||
      rights.tier === 'public-domain-life70-screen';
    if (!rightsPathIsValid || rights.originalTextStatus !== 'public-domain') {
      stop(`Book ${entry.id} does not meet an approved per-book rights path.`);
    }
    if (!/CC BY 4\\.0|الملكية العامة/.test(String(rights.license || '')) ||
        !rights.bookUrl ||
        !rights.historyUrl ||
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
