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
 assert.match(html,/data-diary-action="edit-entry"/);
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.deepEqual(restored.diaryEntries,state.diaryEntries);
});
test('detail routing cannot show a record from the other diary and composer has no sheet markup',()=>{
 const state=createState(),entry=saveDiaryEntry(state,{date:'2026-11-15',owner:'partner',title:'Private blue entry',content:'Different diary'});
 assert.doesNotMatch(diary(state,{screen:'detail',owner:'self',entryId:entry.id}),/Private blue entry|Different diary/);
 const editor=diaryEditor(entry,entry.date,state);
 assert.doesNotMatch(editor,/<dialog|drawer-handle|drawer-layout|drawer-scroll/);
 assert.match(editor,/diary-compose-layout/);assert.match(editor,/diary-mood-editor/);assert.match(editor,/diary-entry-form/);
 for(const screen of ['entries','detail','compose'])assert.doesNotMatch(diaryHeader(state,{screen}),/dc-config/);
 assert.match(diaryHeader(state,{screen:'cover'}),/dc-config-star/);
});
