/**
 * HUKM MEDIA — Safe Draft Chapters Migration Script
 * 
 * Inspects all books in Firestore. If any book has chapters with status === 'draft'
 * embedded in books/{bookId}.chapters:
 * 1. Isolates draft chapters into /bookDraftChapters/{draftId}
 * 2. Updates books/{bookId}.chapters to contain ONLY 'ready' chapters
 * 
 * Safety features:
 * - Default mode is --dry-run (NO writes performed).
 * - Requires explicit --apply to commit changes.
 * - Idempotent and non-destructive: only extracts draft chapters, never alters or deletes ready chapters.
 * 
 * Usage:
 *   # Dry run audit (default)
 *   npx tsx scripts/migrate-draft-chapters.ts
 * 
 *   # Commit migration to Firestore
 *   npx tsx scripts/migrate-draft-chapters.ts --apply
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0492732633';
const DATABASE_ID = process.env.FIREBASE_DATABASE_ID || 'ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96';

function formatDraftChapterId(bookId: string, chapterId: string): string {
  const raw = `draft_${bookId}_${chapterId}`;
  if (!/^[a-zA-Z0-9_-]+$/.test(raw)) {
    throw new Error(`Unsafe draft ID inputs for book "${bookId}" / chapter "${chapterId}". Refusing lossy ID normalization.`);
  }
  if (raw.length > 128) {
    throw new Error(`Draft ID exceeds 128 characters for book "${bookId}" / chapter "${chapterId}". Refusing lossy truncation.`);
  }
  return raw;
}

const SAFE_DOCUMENT_LIMIT_BYTES = 800 * 1024;

function createDraftPayload(bookId: string, draft: any, draftId: string) {
  return {
    id: draftId,
    bookId,
    chapterId: draft.id,
    chapterNumber: draft.chapterNumber || 1,
    title: draft.title || '',
    subtitle: draft.subtitle || '',
    content: Array.isArray(draft.content) ? draft.content : [],
    notes: draft.notes || '',
    references: Array.isArray(draft.references) ? draft.references : [],
    status: 'draft',
    wordCount: draft.wordCount || 0,
    readingTimeMinutes: draft.readingTimeMinutes || 1,
    viewsCount: draft.viewsCount || 0,
    updatedAt: draft.updatedAt || new Date().toISOString(),
  };
}

function assertSafeDocumentSize(payload: Record<string, unknown>, label: string) {
  const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  if (bytes > SAFE_DOCUMENT_LIMIT_BYTES) {
    throw new Error(`${label} is ${bytes} bytes, above the conservative Firestore document budget of ${SAFE_DOCUMENT_LIMIT_BYTES} bytes. No migration writes were performed.`);
  }
}

async function runMigration() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const isDryRun = !isApply || args.includes('--dry-run');

  console.log('='.repeat(70));
  console.log('🏛️  HUKM MEDIA — Draft Chapters Migration Utility');
  console.log('='.repeat(70));
  console.log(`Execution Mode: ${isDryRun ? '🔍 DRY RUN (Simulation / Audit Only)' : '⚡ APPLY (Live Cloud Writes Enabled)'}`);
  console.log(`Project ID:     ${PROJECT_ID}`);
  console.log(`Database ID:    ${DATABASE_ID}`);
  console.log('='.repeat(70));

  let app: App;
  if (getApps().length === 0) {
    app = initializeApp({ projectId: PROJECT_ID });
  } else {
    app = getApps()[0];
  }

  const db = getFirestore(app, DATABASE_ID);

  try {
    const booksSnapshot = await db.collection('books').get();
    console.log(`Found ${booksSnapshot.size} total book document(s) in collection 'books'.\n`);

    let totalBooksExamined = 0;
    let booksWithDraftsCount = 0;
    let totalDraftChaptersIdentified = 0;
    let totalReadyChaptersRetained = 0;

    const migrationPlan: Array<{
      bookId: string;
      bookTitle: string;
      draftChapters: any[];
      readyChapters: any[];
    }> = [];

    for (const docSnap of booksSnapshot.docs) {
      totalBooksExamined++;
      const bookData = docSnap.data();
      const chapters: any[] = Array.isArray(bookData.chapters) ? bookData.chapters : [];

      // Only explicitly ready chapters may remain public. Unknown/missing legacy statuses
      // are quarantined as drafts rather than accidentally published.
      const ready = chapters.filter((c: any) => c.status === 'ready');
      const drafts = chapters.filter((c: any) => c.status !== 'ready');

      totalReadyChaptersRetained += ready.length;

      if (drafts.length > 0) {
        booksWithDraftsCount++;
        totalDraftChaptersIdentified += drafts.length;
        migrationPlan.push({
          bookId: docSnap.id,
          bookTitle: bookData.title || docSnap.id,
          draftChapters: drafts,
          readyChapters: ready,
        });
      }
    }

    // Preflight every planned ID globally before the first write. The legacy ID
    // formatter sanitizes and truncates strings, so checking one book at a time is insufficient.
    const plannedDraftOwners = new Map<string, string>();
    for (const plan of migrationPlan) {
      for (const draft of plan.draftChapters) {
        const draftId = formatDraftChapterId(plan.bookId, draft.id);
        assertSafeDocumentSize(createDraftPayload(plan.bookId, draft, draftId), `Draft "${draft.title || draft.id}"`);
        const ownerKey = JSON.stringify([plan.bookId, draft.id]);
        const previousOwner = plannedDraftOwners.get(draftId);
        if (previousOwner && previousOwner !== ownerKey) {
          throw new Error(`Global draft ID collision detected for "${draftId}" across planned chapters. No migration writes were performed.`);
        }
        plannedDraftOwners.set(draftId, ownerKey);
      }
    }

    // Validate the public parent payload size before any migration write as well.
    for (const plan of migrationPlan) {
      assertSafeDocumentSize({ chapters: plan.readyChapters }, `Ready chapters for book "${plan.bookTitle}"`);
    }

    // In apply mode, verify any pre-existing destination belongs to the exact same
    // book/chapter. Complete this preflight before writing any migration chunk.
    if (!isDryRun) {
      for (const plan of migrationPlan) {
        for (const draft of plan.draftChapters) {
          const draftId = formatDraftChapterId(plan.bookId, draft.id);
          const existingDraft = await db.collection('bookDraftChapters').doc(draftId).get();
          if (existingDraft.exists) {
            const existingData = existingDraft.data() || {};
            if (existingData.bookId !== plan.bookId || existingData.chapterId !== draft.id) {
              throw new Error(`Existing draft ID collision at "${draftId}". No migration writes were performed.`);
            }
          }
        }
      }
    }

    // Detailed Audit Report
    if (migrationPlan.length === 0) {
      console.log('✅ All books are cleanly isolated! No embedded draft chapters found.');
      console.log(`- Books examined: ${totalBooksExamined}`);
      console.log(`- Ready chapters preserved: ${totalReadyChaptersRetained}`);
      return;
    }

    console.log(`⚠️ Identified ${booksWithDraftsCount} book(s) containing a total of ${totalDraftChaptersIdentified} embedded draft chapter(s):\n`);

    migrationPlan.forEach((plan, idx) => {
      console.log(`  [${idx + 1}] Book: "${plan.bookTitle}" (ID: ${plan.bookId})`);
      console.log(`      - Ready Chapters to keep in books/{id}: ${plan.readyChapters.length}`);
      console.log(`      - Draft Chapters to isolate: ${plan.draftChapters.length}`);
      plan.draftChapters.forEach((d) => {
        const draftDocId = formatDraftChapterId(plan.bookId, d.id);
        console.log(`        * Ch #${d.chapterNumber}: "${d.title}" -> /bookDraftChapters/${draftDocId}`);
      });
      console.log('');
    });

    if (isDryRun) {
      console.log('-'.repeat(70));
      console.log('🔍 DRY RUN SUMMARY:');
      console.log(`- Books needing migration:    ${booksWithDraftsCount} of ${totalBooksExamined}`);
      console.log(`- Draft chapters to isolate:  ${totalDraftChaptersIdentified}`);
      console.log(`- Ready chapters to preserve: ${totalReadyChaptersRetained}`);
      console.log('ℹ️  No changes were made to Firestore.');
      console.log('👉 To apply this migration, run:');
      console.log('   npx tsx scripts/migrate-draft-chapters.ts --apply');
      console.log('-'.repeat(70));
      return;
    }

    // Firestore permits at most 500 writes per batch. Write private copies first in
    // bounded chunks, then remove non-ready chapters from the public book document.
    // If an intermediate chunk fails, the original book remains untouched (no data loss).
    console.log('🚀 Committing migration with bounded, retry-safe batches...');
    let migratedBooks = 0;
    let migratedDrafts = 0;

    for (const plan of migrationPlan) {
      const draftIds = plan.draftChapters.map((draft) => formatDraftChapterId(plan.bookId, draft.id));
      if (new Set(draftIds).size !== draftIds.length) {
        throw new Error(`Draft ID collision in book "${plan.bookId}". No public source data was changed.`);
      }

      for (let offset = 0; offset < plan.draftChapters.length; offset += 450) {
        const chunk = plan.draftChapters.slice(offset, offset + 450);
        const batch = db.batch();
        for (const draft of chunk) {
          const draftId = formatDraftChapterId(plan.bookId, draft.id);
          const draftRef = db.collection('bookDraftChapters').doc(draftId);
          const draftPayload = createDraftPayload(plan.bookId, draft, draftId);
          batch.set(draftRef, draftPayload, { merge: true });
        }
        await batch.commit();
        migratedDrafts += chunk.length;
      }

      // Strip legacy drafts only after every private copy for this book was committed.
      const finalizeBatch = db.batch();
      finalizeBatch.update(db.collection('books').doc(plan.bookId), {
        chapters: plan.readyChapters,
        updatedAt: new Date().toISOString(),
      });
      await finalizeBatch.commit();
      migratedBooks++;
      console.log(`  ✓ Migrated book "${plan.bookTitle}": ${plan.draftChapters.length} non-ready chapter(s) isolated.`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log(`- Books updated:           ${migratedBooks}`);
    console.log(`- Draft chapters isolated: ${migratedDrafts}`);
    console.log(`- Ready chapters intact:   ${totalReadyChaptersRetained}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('migrate-draft-chapters.ts')) {
  runMigration();
}

export { formatDraftChapterId, runMigration };
