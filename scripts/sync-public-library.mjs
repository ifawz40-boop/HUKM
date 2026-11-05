#!/usr/bin/env node
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'src/data/library/manifest.json');
const OUTPUT_DIR = path.join(ROOT, 'src/data/library/books');
const CATALOG_PATH = path.join(ROOT, 'src/data/library/catalog.json');
const NOTICE_PATH = path.join(ROOT, 'src/data/library/NOTICE.md');
const API = 'https://datasets-server.huggingface.co';
const DATASET = 'Bayanat-Labs/open-arabic-books';
const USER_AGENT = 'HUKM-MEDIA-Static-Library/2.0 (rights-screened Arabic books; https://github.com/ifawz40-boop/HUKM)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const countWords = (value) => (value.match(/[\p{L}\p{N}]+/gu) || []).length;
const safeText = (value) => typeof value === 'string' ? value.trim() : '';
const sqlString = (value) => "'" + value.replace(/'/g, "''") + "'";
const revisionUrl = (revision) => `https://huggingface.co/datasets/${DATASET}/tree/${revision}`;
const licenseUrl = 'https://creativecommons.org/licenses/by/4.0/';

async function requestJson(endpoint, params, label) {
  const url = `${API}/${endpoint}?${new URLSearchParams(params).toString()}`;
  let lastError = '';
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(45000),
    });
    const body = await response.text();
    if (response.ok) {
      let payload;
      try { payload = JSON.parse(body); }
      catch { throw new Error(`Invalid JSON from Dataset Viewer for ${label}: ${body.slice(0, 400)}`); }
      if (payload.partial === true) {
        throw new Error(`Dataset Viewer marked ${label} partial; refusing incomplete source data.`);
      }
      return payload;
    }
    lastError = `HTTP ${response.status}: ${body.slice(0, 500)}`;
    if ((response.status >= 500 || response.status === 429) && attempt < 12) {
      const waitMs = response.status === 429 ? 30000 : Math.min(20000, attempt * 2500);
      console.log(`Dataset Viewer temporary HTTP ${response.status} for ${label} (attempt ${attempt}/12); retrying in ${waitMs / 1000}s.`);
      await sleep(waitMs);
      continue;
    }
    break;
  }
  throw new Error(`Dataset Viewer failed for ${label}: ${lastError}`);
}

async function fetchAllMetadata() {
  const all = [];
  let total = null;
  for (let offset = 0; total === null || offset < total; offset += 100) {
    if (offset > 0) await sleep(1100);
    const payload = await requestJson('rows', {
      dataset: DATASET,
      config: 'metadata',
      split: 'train',
      offset: String(offset),
      length: '100',
    }, `metadata rows ${offset}-${offset + 99}`);
    total = Number(payload.num_rows_total || 0);
    all.push(...(payload.rows || []).map((item) => item.row).filter(Boolean));
    console.log(`Metadata loaded: ${Math.min(offset + 100, total)} / ${total}`);
  }
  if (!total || all.length !== total) {
    throw new Error(`Metadata row count mismatch: expected ${total}, received ${all.length}.`);
  }
  return all;
}

async function fetchChapters(bookId) {
  const all = [];
  let total = null;
  for (let offset = 0; total === null || offset < total; offset += 100) {
    if (offset > 0) await sleep(1100);
    const payload = await requestJson('filter', {
      dataset: DATASET,
      config: 'chapters',
      split: 'train',
      where: '"book_id"=' + sqlString(bookId),
      offset: String(offset),
      length: '100',
    }, `chapters for ${bookId} at ${offset}`);
    total = Number(payload.num_rows_total || 0);
    all.push(...(payload.rows || []).map((item) => item.row).filter(Boolean));
  }
  return all.sort((a, b) => Number(a.chapter_index || 0) - Number(b.chapter_index || 0));
}

function isTranslationExplicitlyLicensed(row) {
  const quote = safeText(row.license_quote);
  const translationCovered = row.translation_covered === true || row.translation_covered === 'true' || row.translation_covered === 1;
  const originalIsPublicDomain = row.original_text_status === 'public-domain';
  const mentionsCcBy4 = /(?:المشاع الإبداعي|Creative Commons)[\s\S]{0,180}(?:٤[٫.]٠|4\.0)/i.test(quote);
  return translationCovered && originalIsPublicDomain && mentionsCcBy4;
}

function getCredits(row) {
  return Array.isArray(row.credits)
    ? row.credits.map((credit) => {
        const rawDeathYear = credit.death_year;
        const deathYear = rawDeathYear === null || rawDeathYear === undefined || rawDeathYear === ''
          ? null
          : (Number.isFinite(Number(rawDeathYear)) ? Number(rawDeathYear) : null);
        return {
          role: safeText(credit.role_ar || credit.role),
          name: safeText(credit.name),
          deathYear,
        };
      }).filter((credit) => credit.name)
    : [];
}

function getRoleNames(credits, matcher) {
  return credits.filter((credit) => matcher.test(credit.role)).map((credit) => credit.name);
}

function isPublicDomainByLife70(row) {
  const latestDeathYear = Number(row.latest_death_year);
  if (Number.isFinite(latestDeathYear) && latestDeathYear > 0 && latestDeathYear <= 1955) return true;
  const credits = getCredits(row);
  return credits.length > 0 && credits.every((credit) => credit.deathYear !== null && credit.deathYear <= 1955);
}

function getRightsKind(row) {
  if (isTranslationExplicitlyLicensed(row)) return 'cc-by-4-translation';
  if (row.original_text_status === 'public-domain' && isPublicDomainByLife70(row)) return 'public-domain-life70-screen';
  return null;
}

function categoryLabel(category) {
  const labels = {
    history: 'التاريخ',
    literature: 'الأدب',
    'detective.fiction': 'الأدب البوليسي',
    novels: 'الروايات',
    biographies: 'السير والتراجم',
    'children.stories': 'قصص الأطفال',
    science: 'العلوم',
    philosophy: 'الفلسفة',
    travel: 'الرحلات',
    social_sciences: 'العلوم الاجتماعية',
    religion: 'الدراسات الدينية',
    other: 'متنوع',
  };
  return labels[category] || 'متنوع';
}

function selectBooks(metadata, manifest) {
  const eligible = metadata.filter((row) => {
    const words = Number(row.n_words || 0);
    const chapters = Number(row.n_chapters || 0);
    return (
      getRightsKind(row) !== null &&
      Boolean(row.book_id && row.title && row.book_url && row.attribution && /^[a-f0-9]{64}$/i.test(safeText(row.source_file_sha256))) &&
      words >= manifest.minimumWords &&
      words <= manifest.maximumWordsPerBook &&
      chapters >= manifest.minimumChapters
    );
  });

  const selected = [];
  const usedIds = new Set();
  let totalWords = 0;
  const addFromCategory = (category, quota) => {
    const candidates = eligible
      .filter((row) => row.category_main === category && !usedIds.has(row.book_id))
      .sort((a, b) => Number(b.n_words || 0) - Number(a.n_words || 0) || String(a.title).localeCompare(String(b.title), 'ar'));
    for (const row of candidates) {
      if (selected.length >= manifest.targetBooks || selected.filter((item) => item.category_main === category).length >= quota) break;
      const words = Number(row.n_words || 0);
      if (totalWords + words > manifest.maximumTotalWords) continue;
      selected.push(row);
      usedIds.add(row.book_id);
      totalWords += words;
    }
  };

  for (const entry of manifest.categories) addFromCategory(entry.id, entry.quota);
  for (const category of manifest.fallbackCategories || []) {
    if (selected.length >= manifest.targetBooks) break;
    addFromCategory(category, manifest.targetBooks);
  }

  if (selected.length < manifest.targetBooks) {
    const remaining = eligible
      .filter((row) => !usedIds.has(row.book_id))
      .sort((a, b) => Number(b.n_words || 0) - Number(a.n_words || 0));
    for (const row of remaining) {
      if (selected.length >= manifest.targetBooks) break;
      const words = Number(row.n_words || 0);
      if (totalWords + words > manifest.maximumTotalWords) continue;
      selected.push(row);
      usedIds.add(row.book_id);
      totalWords += words;
    }
  }

  if (selected.length < manifest.minimumBooks) {
    throw new Error(`Only ${selected.length} books passed the rights and completeness screen; minimum is ${manifest.minimumBooks}. Eligible metadata rows: ${eligible.length}.`);
  }
  return selected;
}

function toParagraphs(text) {
  const normalized = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];
  const blocks = normalized.split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
  if (blocks.length > 1) return blocks;
  return normalized.split('\n').map((part) => part.trim()).filter(Boolean);
}

function mapFootnotes(value) {
  if (!Array.isArray(value)) return [];
  return value.map((note) => ({
    marker: safeText(note.marker),
    text: safeText(note.text),
    offset: Number.isFinite(Number(note.offset)) ? Number(note.offset) : null,
  })).filter((note) => note.text);
}

function buildBook(metadata, sourceChapters, manifest) {
  const credits = getCredits(metadata);
  const authors = getRoleNames(credits, /author|مؤلف|كاتب|شاعر/i);
  const translators = getRoleNames(credits, /translat|مترجم|ترجمة/i);
  const editors = getRoleNames(credits, /edit|مراجع|محرر|تحرير|محقق/i);
  const fallbackAuthors = Array.isArray(metadata.authors) ? metadata.authors.map((person) => safeText(typeof person === 'string' ? person : person?.name)).filter(Boolean) : [safeText(metadata.original_author || metadata.authors)].filter(Boolean);
  const author = authors.length ? authors.join('، ') : fallbackAuthors.join('، ');
  if (!author) throw new Error(`${metadata.title}: no verifiable author credit in the source metadata.`);
  const chapters = sourceChapters.map((row, index) => {
    const content = toParagraphs(row.text_raw);
    const wordCount = Number(row.n_words || countWords(row.text_raw || ''));
    const footnotes = mapFootnotes(row.footnotes);
    return {
      id: `${metadata.book_id}-chapter-${Number(row.chapter_index || index + 1)}`,
      bookId: metadata.book_id,
      chapterNumber: Number(row.chapter_index || index + 1),
      title: safeText(row.chapter_title || row.chapter_label || row.part_title || row.volume_title || row.title) || `القسم ${index + 1}`,
      subtitle: [safeText(row.volume_title), safeText(row.part_title)].filter(Boolean).join(' • '),
      content,
      footnotes,
      omittedMedia: {
        images: Number(row.n_images_omitted || 0),
        svgs: Number(row.n_svg_omitted || 0),
        tables: Number(row.n_tables || 0),
      },
      references: [],
      status: 'ready',
      wordCount,
      readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 200)),
      viewsCount: 0,
      updatedAt: `${manifest.snapshotDate}T00:00:00.000Z`,
    };
  }).filter((chapter) => chapter.content.length > 0);

  const words = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
  const expectedWords = Number(metadata.n_words || 0);
  if (chapters.length < manifest.minimumChapters) {
    throw new Error(`${metadata.title}: only ${chapters.length} non-empty sections after extraction.`);
  }
  if (expectedWords > 0 && words < expectedWords * 0.95) {
    throw new Error(`${metadata.title}: chapter extraction contains ${words} words vs metadata ${expectedWords}; below 95% completeness threshold.`);
  }

  const totalOmissions = chapters.reduce((sum, chapter) => ({
    images: sum.images + chapter.omittedMedia.images,
    svgs: sum.svgs + chapter.omittedMedia.svgs,
    tables: sum.tables + chapter.omittedMedia.tables,
  }), { images: 0, svgs: 0, tables: 0 });
  const translatorsText = translators.join('، ');
  const datasetUrl = 'https://huggingface.co/datasets/Bayanat-Labs/open-arabic-books';
  const datasetRevisionUrl = revisionUrl(manifest.datasetRevision);
  const attribution = safeText(metadata.attribution);
  const licenseQuote = safeText(metadata.license_quote);
  const rightsKind = getRightsKind(metadata);
  const translationCovered = metadata.translation_covered === true || metadata.translation_covered === 'true' || metadata.translation_covered === 1;
  const licenseLabel = rightsKind === 'cc-by-4-translation'
    ? 'CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة'
    : 'الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين';
  const bookLicenseUrl = rightsKind === 'cc-by-4-translation'
    ? licenseUrl
    : 'https://creativecommons.org/publicdomain/mark/1.0/';
  const book = {
    id: metadata.book_id,
    title: safeText(metadata.title),
    subtitle: translatorsText ? `ترجمة: ${translatorsText}` : 'نسخة عربية مرخصة',
    author,
    category: safeText(metadata.category_main) || 'other',
    coverImage: '',
    status: 'completed',
    summary: 'كتاب كامل من إصدار مؤسسة هنداوي، مقسّم إلى فصول وأقسام مع حفظ الحواشي وبيان حقوق النسخة العربية.',
    viewsCount: 0,
    wordCount: words,
    chapterCount: chapters.length,
    chapters,
    createdAt: `${manifest.snapshotDate}T00:00:00.000Z`,
    updatedAt: `${manifest.snapshotDate}T00:00:00.000Z`,
    sources: [],
    quotes: [],
    socialLinks: {},
    rights: {
      license: licenseLabel,
      licenseUrl: bookLicenseUrl,
      attribution,
      datasetName: DATASET,
      datasetVersion: manifest.version,
      datasetUrl,
      dumpDate: manifest.snapshotDate,
      tier: rightsKind,
      publicDomainRule: rightsKind === 'cc-by-4-translation'
        ? 'translation_covered=true; original_text_status=public-domain; the publisher colophon explicitly licenses the Arabic translation and book design under CC BY 4.0.'
        : 'original_text_status=public-domain; all credited rights-relevant persons have recorded death years no later than 1955 (life+70 public-domain screen as of 2026).',
      authorDeathYear: credits.filter((credit) => /author|مؤلف|كاتب|شاعر/i.test(credit.role) && credit.deathYear !== null).reduce((latest, credit) => Math.max(latest, credit.deathYear), 0) || null,
      latestDeathYear: Number(metadata.latest_death_year) || (credits.reduce((latest, credit) => credit.deathYear === null ? latest : Math.max(latest, credit.deathYear), 0) || null),
      sourceUrl: safeText(metadata.book_url),
      historyUrl: datasetRevisionUrl,
      sourcePages: [],
      sourceLicense: rightsKind === 'cc-by-4-translation' ? 'CC BY 4.0 (Arabic translation); original work public domain' : 'Public-domain original text (life+70 screen); dataset metadata CC BY 4.0',
      sourceLicenseUrl: licenseUrl,
      datasetCitation: 'Hallberg, A. (2024). The Arabic E-Book Corpus (Version 1), University of Gothenburg, https://doi.org/10.5878/7rbh-gy93; Bayanat Labs (2026). Open Arabic Books, v0.1.0, https://huggingface.co/datasets/Bayanat-Labs/open-arabic-books.',
      licenseQuote,
      publisher: 'Hindawi Foundation',
      originalTextStatus: safeText(metadata.original_text_status),
      translationCovered,
      credits,
      translators,
      editors,
      sourceHash: safeText(metadata.source_file_sha256),
      sourceFile: safeText(metadata.source_file),
      omissions: totalOmissions,
      bookId: safeText(metadata.book_id),
      hindawiId: safeText(metadata.hindawi_id),
      bookUrl: safeText(metadata.book_url),
      corpusSource: 'The Arabic E-Book Corpus, version 1 (Andreas Hallberg, University of Gothenburg, 2024)',
    },
  };
  return book;
}

function toCatalogEntry(book) {
  const { chapters, ...metadata } = book;
  return { ...metadata, chapters: [] };
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Loading ${DATASET} metadata; rights filter: explicit CC BY 4.0 Arabic translation + public-domain original.`);
  const metadataRows = await fetchAllMetadata();
  const selected = selectBooks(metadataRows, manifest);
  console.log(`Selected ${selected.length} books / target ${manifest.targetBooks}; fetching complete chapters.`);

  const generated = [];
  const rejected = [];
  for (const metadata of selected) {
    await sleep(1100);
    try {
      const sourceChapters = await fetchChapters(metadata.book_id);
      if (sourceChapters.length < Number(metadata.n_chapters || 0)) {
        throw new Error(`expected ${metadata.n_chapters} sections, received ${sourceChapters.length}`);
      }
      const book = buildBook(metadata, sourceChapters, manifest);
      const outputPath = path.join(OUTPUT_DIR, `${book.id}.json`);
      await writeFile(outputPath, JSON.stringify(book, null, 2) + '\n', 'utf8');
      generated.push(book);
      console.log(`ACCEPTED: ${book.title} — ${book.wordCount} words / ${book.chapters.length} sections / ${book.rights.translators.length} translators`);
    } catch (error) {
      rejected.push({ id: metadata.book_id, title: metadata.title, reason: error instanceof Error ? error.message : String(error) });
      console.warn(`REJECTED: ${metadata.title} — ${rejected[rejected.length - 1].reason}`);
    }
  }

  if (generated.length < manifest.minimumBooks) {
    throw new Error(`Only ${generated.length} books passed full chapter extraction; minimum required is ${manifest.minimumBooks}. Rejected: ${JSON.stringify(rejected)}`);
  }

  const catalog = generated.map(toCatalogEntry).sort((a, b) => a.title.localeCompare(b.title, 'ar'));
  await writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  const expectedFiles = new Set(generated.map((book) => `${book.id}.json`));
  for (const file of await readdir(OUTPUT_DIR)) {
    if (file.endsWith('.json') && !expectedFiles.has(file)) {
      await rm(path.join(OUTPUT_DIR, file), { force: true });
    }
  }

  const totalWords = generated.reduce((sum, book) => sum + book.wordCount, 0);
  const totalChapters = generated.reduce((sum, book) => sum + book.chapterCount, 0);
  const totalBytes = generated.reduce((sum, book) => sum + Buffer.byteLength(JSON.stringify(book), 'utf8'), 0);
  const notice = [
    '# HUKM static Arabic library — source and licensing notice',
    '',
    'The full book texts are bundled as one lazy-loaded JSON file per book under `books/`. The initial application catalogue contains metadata only. The deployed website does not fetch book content from Firebase or from Hugging Face at runtime.',
    '',
    '## Dataset and rights method',
    '',
    `- Dataset: [${DATASET}](${datasetUrl})`,
    `- Version: ${manifest.version}; pinned revision: [${manifest.datasetRevision}](${datasetRevisionUrl})`,
    '- Source corpus: Andreas Hallberg, The Arabic E-Book Corpus, version 1, University of Gothenburg, 2024, https://doi.org/10.5878/7rbh-gy93.',
    '- Publisher: Hindawi Foundation.',
    '- Selected books follow one of two rights paths: (1) explicit CC BY 4.0 colophon for the Arabic translation plus public-domain original; or (2) public-domain original with all credited rights-relevant persons recorded as deceased by 1955 (life+70 screen as of 2026).',
    '- CC BY 4.0 translations retain their attribution and share-alike-compatible source terms; public-domain original texts remain public domain. The dataset metadata/attribution is CC BY 4.0.',
    '- Attribution is preserved verbatim per book. Each JSON retains the exact colophon quotation, source URL, source hash, credits and pinned dataset revision.',
    '- The underlying source dataset contains 1,545 books, but this repository includes only the rights-screened curated subset listed below.',
    '',
    '## Included books',
    '',
    ...generated.flatMap((book) => [
      `### ${book.title}`,
      `- Author(s): ${book.author || 'not specified'}`,
      `- Translator(s): ${book.rights.translators.join('، ') || 'not specified'}`,
      `- Category: ${categoryLabel(book.category)} (${book.category})`,
      `- Length: ${book.wordCount.toLocaleString('en-US')} words; ${book.chapterCount} sections.`,
      `- Source: ${book.rights.bookUrl}`,
      `- Attribution: ${book.rights.attribution}`,
      `- Colophon: ${book.rights.licenseQuote}`,
      `- Source SHA-256: ${book.rights.sourceHash}`,
      '',
    ]),
    '## Quality and legal limitations',
    '',
    'The source dataset reports 0 source-hash and license-quote mismatches across its 1,545-book release, and a 100-book reading sample with correct chapter boundaries. This is not a complete proofreading of every word. Images and SVG figures are omitted by the source dataset; omission counts are retained per chapter and shown in the reader. Table counts are also retained. The source dataset notes that its publisher public-domain statements are not legal advice; this HUKM subset additionally requires an explicit CC BY 4.0 Arabic-translation colophon and a public-domain original-text status.',
    '',
    'CC BY 4.0 requires attribution and a link to the license. Do not remove the per-book credit or colophon when redistributing these texts.',
    '',
    '## Inventory totals',
    '',
    `- Books: ${generated.length}`,
    `- Chapters/sections: ${totalChapters}`,
    `- Words: ${totalWords.toLocaleString('en-US')}`,
    `- Approximate UTF-8 JSON payload: ${(totalBytes / (1024 * 1024)).toFixed(2)} MiB`,
    '',
    '## Dataset citation',
    '',
    'Hallberg, A. (2024). The Arabic E-Book Corpus (Version 1) [Data set]. University of Gothenburg. https://doi.org/10.5878/7rbh-gy93',
    '',
    'Bayanat Labs (2026). Open Arabic Books, version 0.1.0. https://huggingface.co/datasets/Bayanat-Labs/open-arabic-books',
    '',
  ].join('\n');
  await writeFile(NOTICE_PATH, notice, 'utf8');
  console.log(`SYNC COMPLETE: ${generated.length} complete books, ${totalChapters} sections, ${totalWords} words, ${(totalBytes / (1024 * 1024)).toFixed(2)} MiB.`);
  console.log('GENERATED SUMMARY: ' + JSON.stringify(generated.map((book) => ({ id: book.id, title: book.title, author: book.author, category: book.category, words: book.wordCount, chapters: book.chapterCount, source: book.rights.bookUrl, hash: book.rights.sourceHash }))));
  console.log('REJECTED SUMMARY: ' + JSON.stringify(rejected));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
