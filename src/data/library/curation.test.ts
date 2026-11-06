import test from 'node:test';
import assert from 'node:assert/strict';
import { HUKM_ALLOWED_BOOK_CATEGORIES, selectCuratedPublicBooks } from './curation';
const books = [{id:'religious-1',category:'religious'},{id:'travel-1',category:'travel'},{id:'novel-1',category:'novels'},{id:'critique-1',category:'islamic-philosophy-critique'},{id:'self-1',category:'self-development'}];
test('only explicitly approved books in allowed categories become public',()=>{const approved=new Set(['religious-1','travel-1','novel-1','critique-1','self-1']);assert.deepEqual(selectCuratedPublicBooks(books,approved).map(b=>b.id),['religious-1','travel-1','critique-1','self-1']);});
test('unapproved books stay hidden',()=>assert.deepEqual(selectCuratedPublicBooks(books,new Set()),[]));
test('only the four requested categories are allowed',()=>assert.deepEqual(HUKM_ALLOWED_BOOK_CATEGORIES,['religious','self-development','travel','islamic-philosophy-critique']));
