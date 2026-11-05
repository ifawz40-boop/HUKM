#!/usr/bin/env node
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'src/data/library/manifest.json');
const OUTPUT_DIR = path.join(ROOT, 'src/data/library/books');
const NOTICE_PATH = path.join(ROOT, 'src/data/library/NOTICE.md');
const API = 'https://datasets-server.huggingface.co/filter';
const USER_AGENT = 'HUKM-MEDIA-Library-Sync/1.0 (public-domain Arabic corpus; https://github.com/ifawz40-boop/HUKM)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const countWords = (value) => (value.match(/[\p{L}\p{N}]+/gu) || []).length;
const safeText = (value) => typeof value === 'string' ? value.trim() : '';
const sqlString = (value) => "'" + value.replace(/'/g, "''") + "'";

async function fetchWork(title, attempt = 1) {
  const params = new URLSearchParams({
    dataset: 'Bayanat-Labs/arabic-wikisource-pd',
    config: 'works-pd-core',
    split: 'train',
    where: '"title"=' + sqlString(title),
    offset: '0',
    length: '100',
  });
  const response = await fetch(`${API}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    if (response.status === 500 && /index is loading|dataset index/i.test(body) && attempt < 12) {
      const waitMs = 15000;
      console.log(`Dataset index is still loading for "${title}" (attempt ${attempt}/12); retrying in 15s.`);
      await sleep(waitMs);
      return fetchWork(title, attempt + 1);
    }
    throw new Error(`Dataset Viewer returned HTTP ${response.status} for "${title}": ${body}`);
  }
  const payload = await response.json();
  if (payload.partial === true) {
    throw new Error('Dataset Viewer marked the result partial; refusing to treat the selection as exhaustive.');
  }
  return (payload.rows || []).map((item) => item.row).filter(Boolean);
}

function validateWork(row, item) {
  const reasons = [];
  if (row.tier !== 'works-pd-core') reasons.push('not core public-domain tier');
  if (row.source_license !== 'CC BY-SA 4.0') reasons.push('unexpected source-text license');
  if (!safeText(row.text_raw) || row.text_raw.length < item.minWords * 3) reasons.push('missing or unusually short full text');
  if (!Array.isArray(row.chapters) || row.chapters.length < 1) reasons.push('no chapter structure');
  if (Number(row.words || 0) < item.minWords) reasons.push(`only ${row.words || 0} words; minimum ${item.minWords}`);
  if (row.genre === 'poetry') reasons.push('poetry record is not a book-length prose work');
  const categories = Array.isArray(row.categories) ? row.categories.join(' ') : '';
  if (/أعمال غير مكتملة|غير مكتمل|incomplete/i.test(categories)) reasons.push('Wikisource marks this work incomplete');
  const proof = row.proofreading && typeof row.proofreading === 'object' ? row.proofreading : {};
  if (proof.incomplete === true || proof.is_complete === false) reasons.push('dataset proofreading metadata marks the work incomplete');
  const author = safeText(row.author);
  if (item.expectedAuthor && !author.includes(item.expectedAuthor)) reasons.push(`author mismatch: ${author || 'unknown'}`);
  if (!Array.isArray(row.source_pages) || row.source_pages.length === 0) reasons.push('missing source-page provenance');
  const validChapters = (row.chapters || []).filter((chapter) => safeText(chapter?.text));
  if (validChapters.length === 0) reasons.push('all chapters are empty');
  if (reasons.length) return { ok: false, reasons };
  return { ok: true, chapters: validChapters };
}

function toParagraphs(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function sourcePageUrl(page) {
  if (page?.url) return page.url;
  if (!page?.title) return null;
  return 'https://ar.wikisource.org/wiki/' + encodeURIComponent(String(page.title).replace(/ /g, '_'));
}

function buildBook(row, item, chapters, manifest) {
  const sourcePages = row.source_pages.map((page) => ({
    title: safeText(page.title),
    url: sourcePageUrl(page),
    revisionId: page.revision_id ?? null,
    revisionTimestamp: page.revision_timestamp ?? null,
  })).filter((page) => page.url);
  const bookId = item.id;
  const builtChapters = chapters.map((chapter, index) => {
    const paragraphs = toParagraphs(chapter.text);
    const wordCount = countWords(chapter.text);
    return {
      id: `${bookId}-chapter-${index + 1}`,
      bookId,
      chapterNumber: Number(chapter.order || index + 1),
      title: safeText(chapter.title) || `القسم ${index + 1}`,
      subtitle: '',
      content: paragraphs,
      references: [],
      status: 'ready',
      wordCount,
      readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 200)),
      viewsCount: 0,
      updatedAt: `${manifest.dumpDate}T00:00:00.000Z`,
    };
  });
  const author = safeText(row.author);
  const title = item.title;
  const datasetUrl = 'https://huggingface.co/datasets/Bayanat-Labs/arabic-wikisource-pd';
  return {
    id: bookId,
    title,
    subtitle: [author, safeText(row.century_ah_ce)].filter(Boolean).join(' • '),
    author,
    category: item.category,
    coverImage: '',
    coverMediaType: 'image',
    status: 'completed',
    summary: `نص تراثي رقمي من ويكي مصدر العربي. هذه النسخة مبنية من مجموعة ${manifest.dataset} (${manifest.version})، مع إظهار بيانات المصدر والترخيص.`,
    motto: '',
    viewsCount: 0,
    chapters: builtChapters,
    createdAt: `${manifest.dumpDate}T00:00:00.000Z`,
    updatedAt: `${manifest.dumpDate}T00:00:00.000Z`,
    sources: [],
    quotes: [],
    socialLinks: {},
    rights: {
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      attribution: 'نصوص ويكي مصدر العربي — مساهمو ويكي مصدر العربي، مرخصة بموجب CC BY-SA 4.0. مجموعة البيانات: Bayanat Labs, Arabic Wikisource Public-Domain Works, v0.1.0.',
      datasetName: manifest.dataset,
      datasetVersion: manifest.version,
      datasetUrl,
      dumpDate: manifest.dumpDate,
      tier: row.tier,
      publicDomainRule: row.pd_rule || '',
      authorDeathYear: row.author_death_year ?? null,
      latestDeathYear: row.latest_death_year ?? null,
      sourceUrl: row.url,
      historyUrl: row.history_url,
      sourcePages,
      sourceLicense: row.source_license,
      sourceLicenseUrl: row.source_license_url,
      datasetCitation: 'Bayanat Labs (2026). Arabic Wikisource Public-Domain Works, version 0.1.0. https://huggingface.co/datasets/Bayanat-Labs/arabic-wikisource-pd',
    },
  };
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  await mkdir(OUTPUT_DIR, { recursive: true });
  const accepted = [];
  const rejected = [];
  const foundIds = new Set();

  for (const item of manifest.books) {
    let selected = null;
    let selectedAlias = null;
    for (const alias of item.aliases || [item.title]) {
      await sleep(1100);
      const rows = await fetchWork(alias);
      if (rows.length) {
        const candidates = rows
          .filter((row) => row.title === alias)
          .sort((a, b) => Number(b.words || 0) - Number(a.words || 0));
        if (candidates.length) {
          selected = candidates[0];
          selectedAlias = alias;
          break;
        }
      }
    }
    if (!selected) {
      rejected.push({ id: item.id, title: item.title, reason: 'no exact title row found in works-pd-core' });
      continue;
    }
    const validation = validateWork(selected, item);
    if (!validation.ok) {
      rejected.push({ id: item.id, title: item.title, sourceTitle: selected.title, reason: validation.reasons.join('; ') });
      continue;
    }
    if (foundIds.has(selected.id)) {
      rejected.push({ id: item.id, title: item.title, reason: `duplicate source work ${selected.id}` });
      continue;
    }
    foundIds.add(selected.id);
    const book = buildBook(selected, item, validation.chapters, manifest);
    await writeFile(path.join(OUTPUT_DIR, `${item.id}.json`), JSON.stringify(book, null, 2) + '\n', 'utf8');
    accepted.push({
      id: item.id,
      title: item.title,
      sourceTitle: selected.title,
      author: book.author,
      words: Number(selected.words),
      chapters: book.chapters.length,
      sourcePages: book.rights.sourcePages.length,
      sourceUrl: book.rights.sourceUrl,
      historyUrl: book.rights.historyUrl,
      license: book.rights.license,
      sourceId: selected.id,
      selectedAlias,
    });
    console.log(`ACCEPTED: ${item.title} — ${selected.words} words / ${book.chapters.length} chapters / ${book.rights.sourcePages.length} source pages`);
  }

  if (accepted.length < manifest.minimumBooks) {
    throw new Error(`Only ${accepted.length} validated works found; minimum required is ${manifest.minimumBooks}. Rejected: ${JSON.stringify(rejected)}`);
  }

  const expectedFiles = new Set(accepted.map((book) => `${book.id}.json`));
  for (const file of await readdir(OUTPUT_DIR)) {
    if (file.endsWith('.json') && !expectedFiles.has(file)) {
      await rm(path.join(OUTPUT_DIR, file), { force: true });
    }
  }

  const notice = [
    '# HUKM static Arabic library — source and licensing notice',
    '',
    'This directory contains complete-text works bundled into the application at build time. The website does not fetch book content from Firebase or from a third-party API at runtime.',
    '',
    '## Dataset',
    '',
    `- Dataset: [${manifest.dataset}](https://huggingface.co/datasets/Bayanat-Labs/arabic-wikisource-pd)`,
    `- Version: ${manifest.version}`,
    `- Wikimedia dump date: ${manifest.dumpDate}`,
    '- Selected tier: `works-pd-core` only (authors, translators and editors all fall within the dataset core public-domain rule).',
    '- Text transcription license: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).',
    '- Attribution: Arabic Wikisource contributors; dataset selection and assembly by Bayanat Labs. Each book file retains source-page URLs and revision-history URLs.',
    '- Redistribution of the transcribed text must preserve attribution and the CC BY-SA 4.0 share-alike terms.',
    '',
    '## Included works',
    '',
    ...accepted.flatMap((book) => [
      `### ${book.title}`,
      `- Author: ${book.author}`,
      `- Source title: ${book.sourceTitle}`,
      `- Size: ${book.words.toLocaleString('en-US')} words; ${book.chapters} chapters; ${book.sourcePages} source pages.`,
      `- Source: ${book.sourceUrl}`,
      `- Revision history: ${book.historyUrl}`,
      `- License: ${book.license}`,
      '',
    ]),
    '## Quality and legal limitations',
    '',
    'The dataset filters the core tier using recorded author/translator/editor death dates and supplies source histories. This is a reproducible public-domain screening method, not a legal opinion or a guarantee that every underlying print edition has no unnamed modern editorial contributions. HUKM excludes records explicitly marked incomplete, poetry-only records, records without source provenance, and records below the per-title length threshold. The text is presented as a historical digital transcription, not as a critical edition.',
    '',
    '## Attribution statement',
    '',
    'Arabic Wikisource contributors, CC BY-SA 4.0. Dataset: Bayanat Labs, Arabic Wikisource Public-Domain Works, v0.1.0. Source pages and history are listed per book in the corresponding JSON file.',
    '',
  ].join('\n');
  await writeFile(NOTICE_PATH, notice, 'utf8');
  console.log(`SYNC COMPLETE: ${accepted.length} validated works, ${accepted.reduce((sum, book) => sum + book.words, 0)} words.`);
  console.log('ACCEPTED SUMMARY: ' + JSON.stringify(accepted));
  console.log('REJECTED SUMMARY: ' + JSON.stringify(rejected));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
