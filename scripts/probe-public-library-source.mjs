const DATASET = 'Bayanat-Labs/open-arabic-books';
const BASE = 'https://datasets-server.huggingface.co';
const HEADERS = { 'User-Agent': 'HUKM-static-library-source-probe/1.0', Accept: 'application/json' };

async function probe(label, url) {
  try {
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(25_000) });
    const body = await response.text();
    let payload = null;
    try { payload = JSON.parse(body); } catch { /* report the raw response below */ }
    console.log('\n[' + label + '] HTTP ' + response.status);
    if (!response.ok) {
      console.log(body.slice(0, 900));
      return { ok: false, payload: null };
    }
    if (label === 'parquet') {
      const files = payload?.parquet_files || [];
      console.log(JSON.stringify(files.map((file) => ({
        config: file.config,
        split: file.split,
        filename: file.filename,
        size: file.size,
        url: file.url,
      })), null, 2));
    } else {
      const row = payload?.rows?.[0]?.row;
      console.log(JSON.stringify({
        num_rows_total: payload?.num_rows_total,
        first_row: row ? {
          keys: Object.keys(row),
          book_id: row.book_id,
          chapter_index: row.chapter_index,
          section_type: row.section_type,
          text_length: String(row.text_raw || '').length,
        } : null,
      }, null, 2));
    }
    return { ok: true, payload };
  } catch (error) {
    console.log('\n[' + label + '] ERROR: ' + (error?.name || 'Error') + ': ' + (error?.message || String(error)));
    return { ok: false, payload: null };
  }
}

const parquetUrl = new URL('/parquet', BASE);
parquetUrl.searchParams.set('dataset', DATASET);
const rowsUrl = new URL('/rows', BASE);
for (const [key, value] of Object.entries({ dataset: DATASET, config: 'chapters', split: 'train', offset: '0', length: '1' })) {
  rowsUrl.searchParams.set(key, value);
}
const filterUrl = new URL('/filter', BASE);
for (const [key, value] of Object.entries({
  dataset: DATASET,
  config: 'chapters',
  split: 'train',
  where: '"book_id"=\'hindawi-35825168\'',
  offset: '0',
  length: '1',
})) {
  filterUrl.searchParams.set(key, value);
}

const SELECTED_IDS = new Set([
  'hindawi-35825168', 'hindawi-49069206', 'hindawi-58463626',
  'hindawi-75241938', 'hindawi-84282618', 'hindawi-37573972',
  'hindawi-80968603', 'hindawi-85731606', 'hindawi-48616852',
  'hindawi-20949628', 'hindawi-64797262', 'hindawi-69369183',
  'hindawi-19475069', 'hindawi-86920724', 'hindawi-30826903',
  'hindawi-28471509', 'hindawi-95716864',
]);

async function inspectSelectedMetadata() {
  const selected = [];
  let total = null;
  for (let offset = 0; total === null || offset < total; offset += 100) {
    const url = new URL('/rows', BASE);
    for (const [key, value] of Object.entries({
      dataset: DATASET, config: 'metadata', split: 'train',
      offset: String(offset), length: '100',
    })) url.searchParams.set(key, value);
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(25_000) });
    const body = await response.text();
    if (!response.ok) throw new Error('Metadata rows failed at ' + offset + ': HTTP ' + response.status + ' ' + body.slice(0, 500));
    const payload = JSON.parse(body);
    total = Number(payload.num_rows_total || 0);
    for (const item of payload.rows || []) {
      const row = item.row;
      if (!SELECTED_IDS.has(row.book_id)) continue;
      const credits = Array.isArray(row.credits) ? row.credits : [];
      const namesFor = (pattern) => credits.filter((credit) => pattern.test(String(credit.role || ''))).map((credit) => credit.name);
      selected.push({
        id: row.book_id,
        title: row.title,
        category: row.category_main,
        words: row.n_words,
        chapters: row.n_chapters,
        authors: namesFor(/author|مؤلف|كاتب/i),
        translators: namesFor(/translator|مترجم/i),
        editors: namesFor(/editor|محرر/i),
        originalTitle: row.original_title,
        originalAuthor: row.original_author,
        isTranslation: row.is_translation,
        translationCovered: row.translation_covered,
        originalTextStatus: row.original_text_status,
        latestDeathYear: row.latest_death_year,
        nearDuplicateGroup: row.near_duplicate_group,
        licenseQuote: String(row.license_quote || '').slice(0, 260),
      });
    }
    if (offset + 100 < total) await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  console.log('\n[selected-book-metadata]');
  console.log(JSON.stringify(selected, null, 2));
  console.log('selected metadata rows:', selected.length, 'of', SELECTED_IDS.size);
}

const results = await Promise.all([
  probe('parquet', parquetUrl),
  probe('chapters-rows-first-page', rowsUrl),
  probe('chapters-filter-single-book', filterUrl),
]);

await inspectSelectedMetadata();

if (!results[0].ok && !results[1].ok) {
  console.error('Neither direct Parquet discovery nor the chapters rows endpoint is available.');
  process.exitCode = 1;
}
