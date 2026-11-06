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
const USER_AGENT = 'HUKM-MEDIA-Static-Library/2.1 (rights-screened Arabic books; https://github.com/ifawz40-boop/HUKM)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const countWords = (value) => (value.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu) || []).length;
const safeText = (value) => typeof value === 'string' ? value.trim() : '';
const sqlString = (value) => "'" + value.replace(/'/g, "''") + "'";
const revisionUrl = (revision) => `https://huggingface.co/datasets/${DATASET}/tree/${revision}`;
const licenseUrl = 'https://creativecommons.org/licenses/by/4.0/';
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 20_000;

function buildRequestUrl(endpoint, params) {
  const isAbsoluteUrl = endpoint.startsWith('https://') || endpoint.startsWith('http://');
  const base = isAbsoluteUrl ? endpoint : `${API}/${endpoint}`;
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function requestJson(endpoint, params, label) {
  const url = buildRequestUrl(endpoint, params);
  let lastError = '';
  let attemptsMade = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    attemptsMade = attempt;
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const body = await response.text();
      if (response.ok) {
        let payload;
        try { payload = JSON.parse(body); }
        catch { throw new Error(`Invalid JSON from Dataset Viewer for ${label}: ${body.slice(0, 400)}`); }
        if (payload.partial === true) {
          const partialError = new Error(`Dataset Viewer marked ${label} partial; refusing incomplete source data.`);
          partialError.name = 'NonRetryableSourceError';
          throw partialError;
        }
        return payload;
      }

      lastError = `HTTP ${response.status}: ${body.slice(0, 500)}`;
      const retryable = response.status >= 500 || response.status === 429;
      if (!retryable || attempt === MAX_ATTEMPTS) break;

      const retryAfterSeconds = Number(response.headers.get('retry-after') || 0);
      const waitMs = response.status === 429 && retryAfterSeconds > 0
        ? Math.min(15_000, retryAfterSeconds * 1000)
        : Math.min(10_000, attempt * 1_000);
      console.log(`Dataset Viewer temporary HTTP ${response.status} for ${label} (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${waitMs / 1000}s.`);
      await sleep(waitMs);
    } catch (error) {
      if (error instanceof SyntaxError || (error instanceof Error && (
        error.message.startsWith('Invalid JSON') || error.name === 'NonRetryableSourceError'
      ))) {
        throw error;
      }
      lastError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      if (attempt === MAX_ATTEMPTS) break;
      const waitMs = Math.min(10_000, attempt * 1_000);
      console.log(`Dataset Viewer request error for ${label} (attempt ${attempt}/${MAX_ATTEMPTS}): ${lastError}; retrying in ${waitMs / 1000}s.`);
      await sleep(waitMs);
    }
  }
  throw new Error(`Dataset Viewer failed for ${label} after ${attemptsMade} attempt(s): ${lastError}`);
}

async function verifyDatasetRevision(expectedRevision) {
  const metadata = await requestJson(
    `https://huggingface.co/api/datasets/${DATASET}`,
    {},
    'pinned dataset revision preflight'
  );
  const actualRevision = safeText(metadata.sha);
  if (!actualRevision) {
    throw new Error('Hugging Face Hub did not return a dataset commit SHA; refusing to claim a pinned source revision.');
  }
  if (actualRevision !== expectedRevision) {
    throw new Error(
      `Dataset HEAD changed: manifest pins ${expectedRevision}, but Hugging Face currently serves ${actualRevision}. Review the new revision and update the manifest before syncing.`
    );
  }
  console.log(`Verified source dataset commit: ${actualRevision}`);
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
    const pageTotal = Number(payload.num_rows_total || 0);
    if (total === null) total = pageTotal;
    else if (pageTotal !== total) throw new Error(`Chapter row count changed during pagination for ${bookId}.`);
    all.push(...(payload.rows || []).map((item) => item.row).filter(Boolean));
  }
  if (total === null || all.length !== total) {
    throw new Error(`Chapter row count mismatch for ${bookId}: expected ${total}, received ${all.length}.`);
  }
  const indices = all.map((row) => Number(row.chapter_index));
  if (indices.some((index) => !Number.isSafeInteger(index)) || new Set(indices).size !== indices.length) {
    throw new Error(`Chapter indices are missing or duplicated for ${bookId}.`);
  }
  return all.sort((a, b) => Number(a.chapter_index) - Number(b.chapter_index));
}

function isTranslationExplicitlyLicensed(row) {
  const quote = safeText(row.license_quote);
  const translationCovered = row.translation_covered === true || row.translation_covered === 'true' || row.translation_covered === 1;
  const originalIsPublicDomain = row.original_text_status === 'public-domain';
  const mentionsCcBy4 = /(?:المشاع الإبداعي|Creative Commons)[\s\S]{0,180}(?:٤[٫.]٠|4\.0)/i.test(quote);
  return row.is_translation === true && translationCovered && originalIsPublicDomain && mentionsCcBy4;
}

const RIGHTS_RELEVANT_ROLES = new Set(['author', 'translator', 'editor', 'compiler', 'foreword']);

function getCredits(row) {
  return Array.isArray(row.credits)
    ? row.credits.filter((credit) => credit && typeof credit === 'object').map((credit) => {
        const rawDeathYear = credit.death_year;
        const deathYear = rawDeathYear === null || rawDeathYear === undefined || rawDeathYear === ''
          ? null
          : (Number.isFinite(Number(rawDeathYear)) ? Number(rawDeathYear) : null);
        return {
          role: safeText(credit.role || credit.role_ar).toLowerCase(),
          roleAr: safeText(credit.role_ar),
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
  const isExplicitlyOriginal = row.is_translation === false;
  const isExplicitlyTranslated = row.is_translation === true;
  const rawCredits = Array.isArray(row.credits) ? row.credits : [];
  const credits = getCredits(row);
  const translatorCredits = getRoleNames(credits, /^translator$/i);
  const unknownCredits = credits.filter((credit) =>
    !RIGHTS_RELEVANT_ROLES.has(credit.role) && credit.role !== 'reviser'
  );
  const rightsCredits = credits.filter((credit) => RIGHTS_RELEVANT_ROLES.has(credit.role));

  // The upstream builder's is_translation flag is authoritative; unknown values fail closed.
  if (!isExplicitlyOriginal && !(isExplicitlyTranslated && translatorCredits.length > 0)) return false;
  // Unknown contributor roles or incomplete credit rows must not pass the life+70 screen.
  if (unknownCredits.length > 0 || credits.length !== rawCredits.length) return false;

  // Require death-year evidence for each rights-relevant contributor; the upstream author-only shortcut is insufficient here.
  return rightsCredits.length > 0 &&
    rightsCredits.every((credit) => credit.deathYear !== null && credit.deathYear <= 1955);
}

function getRightsKind(row) {
  if (isTranslationExplicitlyLicensed(row)) return 'cc-by-4-translation';
  if (row.original_text_status === 'public-domain' && isPublicDomainByLife70(row)) return 'public-domain-life70-screen';
  return null;
}

function isSafeBookId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

function isSafeHttpUrl(value) {
  try {
    const parsed = new URL(safeText(value));
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function categoryLabel(category) {
  const labels = {
    history: 'التاريخ',
    literature: 'الأدب',
    'literary.criticism': 'النقد الأدبي',
    'detective.fiction': 'الأدب البوليسي',
    novels: 'الروايات',
    biographies: 'السير والتراجم',
    'children.stories': 'قصص الأطفال',
    science: 'العلوم',
    'science.fiction': 'الخيال العلمي',
    philosophy: 'الفلسفة',
    'travel.literature': 'أدب الرحلات',
    'social.sciences': 'العلوم الاجتماعية',
    religions: 'الدراسات الدينية',
    psychology: 'علم النفس',
    politics: 'السياسة',
    economics: 'الاقتصاد',
    linguistics: 'اللغويات',
    technology: 'التكنولوجيا',
    arts: 'الفنون',
    plays: 'المسرح',
    poetry: 'الشعر',
    geography: 'الجغرافيا',
    'environmental.sciences': 'العلوم البيئية',
    health: 'الصحة',
    business: 'الأعمال',
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
      Boolean(isSafeBookId(row.book_id) && safeText(row.title) && isSafeHttpUrl(row.book_url) && safeText(row.attribution) && /^[a-f0-9]{64}$/i.test(safeText(row.source_file_sha256))) &&
      words >= manifest.minimumWords &&
      words <= manifest.maximumWordsPerBook &&
      chapters >= manifest.minimumChapters
    );
  });

  const byRights = {
    ccByTranslation: eligible.filter((row) => getRightsKind(row) === 'cc-by-4-translation').length,
    life70Screen: eligible.filter((row) => getRightsKind(row) === 'public-domain-life70-screen').length,
  };
  console.log(`Rights-screened metadata: ${eligible.length} eligible (${byRights.ccByTranslation} CC BY 4.0 translations; ${byRights.life70Screen} public-domain life+70-screened).`);

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
  const authors = getRoleNames(credits, /^author$/i);
  const translators = getRoleNames(credits, /^translator$/i);
  const editors = getRoleNames(credits, /^(editor|compiler|foreword)$/i);
  const fallbackAuthors = Array.isArray(metadata.authors) ? metadata.authors.map((person) => safeText(typeof person === 'string' ? person : person?.name)).filter(Boolean) : [safeText(metadata.original_author || metadata.authors)].filter(Boolean);
  const author = authors.length ? authors.join('، ') : fallbackAuthors.join('، ');
  if (!author) throw new Error(`${metadata.title}: no verifiable author credit in the source metadata.`);
  const chapters = sourceChapters.map((row, index) => {
    const content = toParagraphs(row.text_raw);
    const extractedWordCount = countWords(String(row.text_raw || ''));
    const declaredWordCount = Number(row.n_words || 0);
    if (declaredWordCount > 0 &&
        (extractedWordCount < declaredWordCount * 0.95 || extractedWordCount > declaredWordCount * 1.10)) {
      throw new Error(`${metadata.title}: section ${row.chapter_index} has ${extractedWordCount} extracted words vs ${declaredWordCount} declared.`);
    }
    const wordCount = declaredWordCount || extractedWordCount;
    const footnotes = mapFootnotes(row.footnotes);
    const sourceChapterIndex = Number(row.chapter_index);
    return {
      id: `${metadata.book_id}-chapter-${sourceChapterIndex}`,
      bookId: metadata.book_id,
      chapterNumber: index + 1,
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
  if (expectedWords > 0 && (words < expectedWords * 0.95 || words > expectedWords * 1.10)) {
    throw new Error(`${metadata.title}: extracted text contains ${words} words vs metadata ${expectedWords}; outside the 95–110% integrity range.`);
  }
  if (new Set(chapters.map((chapter) => chapter.id)).size !== chapters.length ||
      new Set(chapters.map((chapter) => chapter.chapterNumber)).size !== chapters.length) {
    throw new Error(`${metadata.title}: duplicate chapter identifiers or display numbers.`);
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
    subtitle: translatorsText ? `ترجمة: ${translatorsText}` : (metadata.is_translation === true ? 'ترجمة عربية' : 'نص عربي أصلي'),
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
      authorDeathYear: credits.filter((credit) => credit.role === 'author' && credit.deathYear !== null).reduce((latest, credit) => Math.max(latest, credit.deathYear), 0) || null,
      latestDeathYear: credits.filter((credit) => RIGHTS_RELEVANT_ROLES.has(credit.role)).reduce((latest, credit) => credit.deathYear === null ? latest : Math.max(latest, credit.deathYear), 0) || null,
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
  const datasetUrl = `https://huggingface.co/datasets/${DATASET}`;
  const datasetRevisionUrl = revisionUrl(manifest.datasetRevision);
  await verifyDatasetRevision(manifest.datasetRevision);
  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Loading ${DATASET} metadata; rights paths: explicit CC BY 4.0 Arabic translation + public-domain original, or conservative life+70 screen for public-domain original.`);
  const metadataRows = await fetchAllMetadata();
  const selected = selectBooks(metadataRows, manifest);
  console.log(`Selected ${selected.length} books / target ${manifest.targetBooks}; fetching complete chapters with bounded retries.`);

  const generated = [];
  const rejected = [];
  for (const metadata of selected) {
    await sleep(1100);
    try {
      const sourceChapters = await fetchChapters(metadata.book_id);
      if (sourceChapters.length !== Number(metadata.n_chapters || 0)) {
        throw new Error(`expected exactly ${metadata.n_chapters} source sections, received ${sourceChapters.length}`);
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
  const totalBytes = generated.reduce((sum, book) => sum + Buffer.byteLength(JSON.stringify(book, null, 2) + '\n', 'utf8'), 0);
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
      `- Rights: ${book.rights.license}`,
      '',
    ]),
    '## Build summary',
    '',
    `- Books: ${generated.length}`,
    `- Sections: ${totalChapters}`,
    `- Words: ${totalWords.toLocaleString('en-US')}`,
    `- JSON payload: ${(totalBytes / (1024 * 1024)).toFixed(2)} MiB before compression.`,
    `- Generated snapshot: ${manifest.snapshotDate} (deterministic source snapshot)`,
    '',
    '## Limitations',
    '',
    '- The publisher colophon and life+70 screen are evidence, not legal advice. Copyright terms differ by jurisdiction; verify before redistribution.',
    '- Images, SVG figures and some tables are omitted; per-book omission counts are stored in each JSON file.',
    '- The 95% word-count threshold and section-count checks detect incomplete extraction, not proofreading or textual accuracy.',
    '',
  ].join('\n');
  await writeFile(NOTICE_PATH, notice, 'utf8');

  console.log(`SUCCESS: generated ${generated.length} complete books, ${totalChapters} sections, ${totalWords} words, ${(totalBytes / (1024 * 1024)).toFixed(2)} MiB.`);
  if (rejected.length) console.warn(`Skipped ${rejected.length} source books after validation failures: ${JSON.stringify(rejected)}`);
}

main().catch((error) => {
  console.error('Static library sync failed:', error);
  process.exitCode = 1;
});
