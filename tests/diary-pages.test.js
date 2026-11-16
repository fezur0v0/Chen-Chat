import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,exportData} from '../src/store.js';
import {saveDiaryEntry} from '../src/apps/diary/model.js';
import {diary,diaryEditor} from '../src/apps/diary/view.js';
import {diaryHeader} from '../src/apps/diary/cover/view.js';

test('diary detail renders full safe content, authorship and timestamps without editing controls',()=>{
 const state=createState();state.diaryCover.self.name='<name>';
 const entry=saveDiaryEntry(state,{date:'2026-11-15',title:'<script>title</script>',content:'First line\n'+('Long body '.repeat(160))+'<img src=x>',mood:'开心'},1000);
 saveDiaryEntry(state,{...entry,content:entry.content+' edited'},2000);
 const html=diary(state,{screen:'detail',owner:'self',entryId:entry.id});
 assert.match(html,/diary-detail/);assert.match(html,/Long body/);assert.match(html,/ edited/);assert.match(html,/&lt;name&gt;/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img src=x&gt;/);assert.match(html,/修改于/);
 assert.doesNotMatch(html,/<script>|<img src=x>|<textarea|<form/);
 assert.match(diaryHeader(state,{screen:'detail'}),/data-diary-action="edit-entry"/);
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.deepEqual(restored.diaryEntries,state.diaryEntries);
});
test('detail routing cannot show a record from the other diary and composer has no sheet markup',()=>{
 const state=createState(),entry=saveDiaryEntry(state,{date:'2026-11-15',owner:'partner',title:'Private blue entry',content:'Different diary'});
 assert.doesNotMatch(diary(state,{screen:'detail',owner:'self',entryId:entry.id}),/Private blue entry|Different diary/);
 const editor=diaryEditor(entry,entry.date,state);
 assert.match(editor,/<dialog[^>]+aria-label="选择心情"/);assert.doesNotMatch(editor,/diary-editor-footer/);
 assert.match(editor,/diary-compose-layout/);assert.match(editor,/diary-mood-editor/);assert.match(editor,/diary-entry-form/);
 for(const screen of ['entries','detail','compose'])assert.doesNotMatch(diaryHeader(state,{screen}),/dc-config/);
 assert.match(diaryHeader(state,{screen:'cover'}),/dc-config-star/);
});

test('diary photos and text size survive backup, reject unsafe images, and retain old records unchanged',()=>{
 const state=createState(),photo='data:image/png;base64,YWJj';
 const original=saveDiaryEntry(state,{date:'2026-11-16',title:'照片',content:'文字',photos:[photo,'javascript:alert(1)','https://example.invalid/tracker'],textSize:20});
 assert.deepEqual(original.photos,[photo]);
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.deepEqual(restored.diaryEntries[0],original);
 saveDiaryEntry(restored,{...original,photos:[],textSize:16});
 assert.equal(restored.diaryEntries[0].photos,undefined);assert.equal(restored.diaryEntries[0].textSize,undefined);
 const corrupted=JSON.parse(exportData(state));corrupted.diaryEntries[0].photos=['data:image/svg+xml;base64,YWJj','https://example.invalid/tracker'];corrupted.diaryEntries[0].textSize='expression(bad)';
 const clean=normalizeState(corrupted).diaryEntries[0];assert.equal(clean.photos,undefined);assert.equal(clean.textSize,undefined);
});
