import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,exportData,loadState,saveState} from '../src/store.js';
import {emptyDiaryCover,normalizeDiaryCover,saveDiaryCover} from '../src/apps/diary/cover/model.js';
import {saveDiaryEntry} from '../src/apps/diary/model.js';
import {diary} from '../src/apps/diary/view.js';
import {diaryCover,coverEditor} from '../src/apps/diary/cover/view.js';
import {createArchive,inspectArchive} from '../src/backup/model.js';

test('new and legacy states have blank cover profiles independent of chat identities',()=>{
 const state=createState();state.home.userName='Existing identity';state.persona.name='Another identity';
 assert.deepEqual(state.diaryCover,emptyDiaryCover());
 delete state.diaryCover;
 assert.deepEqual(normalizeState(state).diaryCover,emptyDiaryCover());
 const html=diaryCover(state);
 assert.doesNotMatch(html,/Existing identity|Another identity|<img/);
 assert.match(html,/我的日记/);assert.match(html,/TA 的日记/);
 assert.equal((html.match(/class="dc-sign">/g)||[]).length,2);
});
test('cover normalization limits text, rejects external or active images, and escapes display text',()=>{
 const state=createState();
 saveDiaryCover(state,{self:{name:'<script>',signature:'x'.repeat(200),avatar:'https://example.com/avatar.png',portrait:'data:image/svg+xml;base64,PHN2Zy8+'},partner:{name:' A ',signature:' B ',avatar:'data:image/webp;base64,YQ=='}});
 assert.equal(state.diaryCover.self.signature.length,160);
 assert.equal(state.diaryCover.self.avatar,'');assert.equal(state.diaryCover.self.portrait,'');
 assert.equal(state.diaryCover.partner.name,'A');assert.equal(state.diaryCover.partner.signature,'B');
 assert.equal(state.diaryCover.partner.avatar,'data:image/webp;base64,YQ==');
 assert.match(diaryCover(state),/&lt;script&gt;/);assert.doesNotMatch(diaryCover(state),/<script>/);
 assert.equal(normalizeDiaryCover({self:{name:13,avatar:'data:image/png;base64,'+'A'.repeat(900000)}}).self.name,'');
 assert.equal(normalizeDiaryCover({self:{avatar:'data:image/png;base64,'+'A'.repeat(900000)}}).self.avatar,'');
 assert.deepEqual(normalizeDiaryCover(null),emptyDiaryCover());
 assert.match(coverEditor(emptyDiaryCover()),/name="cover-name"/);
});
test('entry ownership separates calendars, preserves legacy entries and survives edits',()=>{
 const state=createState();
 const a=saveDiaryEntry(state,{date:'2026-11-15',content:'Self entry'});
 const b=saveDiaryEntry(state,{owner:'partner',date:'2026-11-15',content:'Partner entry'});
 assert.equal(a.owner,'self');assert.equal(b.owner,'partner');
 let html=diary(state,{owner:'self',month:'2026-11'});
 assert.match(html,/Self entry/);assert.doesNotMatch(html,/Partner entry/);
 html=diary(state,{owner:'partner',month:'2026-11'});
 assert.match(html,/Partner entry/);assert.doesNotMatch(html,/Self entry/);
 saveDiaryEntry(state,{...b,owner:'self',content:'Edited'});
 assert.equal(state.diaryEntries[1].owner,'partner');
 delete state.diaryEntries[0].owner;
 assert.equal(normalizeState(state).diaryEntries[0].owner,'self');
});
test('local reload, JSON backup and full archive retain both profiles and entry ownership',async()=>{
 const state=createState();const image='data:image/png;base64,aGVsbG8=';
 saveDiaryCover(state,{self:{name:'A',signature:'Line one\nLine two',avatar:image},partner:{name:'B',portrait:image}});
 saveDiaryEntry(state,{owner:'partner',date:'2026-11-15',content:'Retained diary'});
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 saveState(storage,state);assert.equal(values.size,1);
 const candidates=[loadState(storage),normalizeState(JSON.parse(exportData(state)))];
 const archive=await createArchive(state,{music:async()=>null,voice:async()=>null});
 candidates.push((await inspectArchive(archive.blob)).state);
 for(const restored of candidates){assert.deepEqual(restored.diaryCover,state.diaryCover);assert.equal(restored.diaryEntries[0].owner,'partner');}
});
