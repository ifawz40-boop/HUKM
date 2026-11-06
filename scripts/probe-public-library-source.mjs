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

const results = await Promise.all([
  probe('parquet', parquetUrl),
  probe('chapters-rows-first-page', rowsUrl),
  probe('chapters-filter-single-book', filterUrl),
]);

if (!results[0].ok && !results[1].ok) {
  console.error('Neither direct Parquet discovery nor the chapters rows endpoint is available.');
  process.exitCode = 1;
}
