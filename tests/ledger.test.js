import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLedger, loadLedger, saveLedger, parseAmount, rangeOf, entriesBetween, sumEntries, totals, ymd } from '../src/apps/ledger/model.js';
import { createState, normalizeState } from '../src/store.js';

test('a new ledger starts empty and keeps its own storage key',() => {
 const memory = new Map();
 const storage = {getItem:key => memory.get(key) ?? null,setItem:(key,value) => memory.set(key,String(value))};
 assert.deepEqual(loadLedger(storage),emptyLedger());
 const data = emptyLedger();
 data.startingBalanceCents = 1000;
 data.entries.push({id:'a',type:'expense',category:'food',title:'午饭',amountCents:1250,ts:Date.UTC(2026,10,14,4,0),imageIds:['img']});
 saveLedger(storage,data);
 const loaded = loadLedger(storage);
 assert.equal(loaded.startingBalanceCents,1000);
 assert.equal(loaded.entries[0].amountCents,1250);
 assert.deepEqual(loaded.entries[0].imageIds,['img']);
 assert.equal(memory.has('chenxin.frontend.v1'),false);
});

test('amounts reject blank, words and zero, and keep two decimal places',() => {
 assert.equal(parseAmount('').ok,false);
 assert.equal(parseAmount('午饭').ok,false);
 assert.equal(parseAmount('0').ok,false);
 assert.equal(parseAmount('0.00').ok,false);
 assert.equal(parseAmount('12.5').cents,1250);
 assert.equal(parseAmount('12.').cents,1200);
});

test('week, month and year totals use the selected range',() => {
 const entries = [
  {type:'expense',amountCents:450,ts:new Date(2026,10,14,8,40).getTime()},
  {type:'expense',amountCents:120000,ts:new Date(2026,10,1,10,0).getTime()},
  {type:'income',amountCents:480000,ts:new Date(2026,10,5,9,0).getTime()},
  {type:'expense',amountCents:8000,ts:new Date(2026,5,15,12,0).getTime()}
 ];
 const anchor = new Date(2026,10,14);
 const week = rangeOf('week',anchor);
 assert.equal(ymd(week.start),'2026-11-08');
 assert.equal(sumEntries(entriesBetween(entries,week.start,week.end)).expense,450);
 const month = rangeOf('month',anchor);
 assert.equal(sumEntries(entriesBetween(entries,month.start,month.end)).expense,120450);
 assert.equal(sumEntries(entriesBetween(entries,month.start,month.end)).income,480000);
 const year = rangeOf('year',anchor);
 assert.equal(sumEntries(entriesBetween(entries,year.start,year.end)).expense,128450);
 assert.equal(totals({startingBalanceCents:0,entries}).assets,480000 - 128450);
});

test('adding the ledger app does not rewrite existing chat state',() => {
 const state = createState();
 state.home.note = '旧便签';
 const restored = normalizeState(JSON.parse(JSON.stringify(state)));
 assert.equal(restored.home.note,'旧便签');
 assert.equal(restored.sessions[0].messages.length,0);
 assert.equal('ledger' in restored,false);
});
