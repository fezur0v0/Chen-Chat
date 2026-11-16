import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRichText,richPlain,renderRichText,plainDocument,richField,NOTE_SIZES,NOTE_COLORS,NOTE_HIGHLIGHT} from '../src/apps/diary/rich-text.js';
import {createState,normalizeState,exportData} from '../src/store.js';
import {saveDiaryEntry} from '../src/apps/diary/model.js';

test('formatted diary survives backup and text updates never retain stale formatting',()=>{
 const state=createState(),doc={type:'doc',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'标题'}]},{type:'paragraph',content:[{type:'text',text:'正文',marks:[{type:'bold'},{type:'underline'}]}]},{type:'horizontalRule'}]};
 const entry=saveDiaryEntry(state,{date:'2026-11-16',content:richPlain(doc),richText:doc});
 assert.match(renderRichText(entry.richText),/<h2>标题<\/h2>/);assert.match(renderRichText(entry.richText),/<u><strong>正文/);assert.match(renderRichText(entry.richText),/<hr>/);
 const restored=normalizeState(JSON.parse(exportData(state)));assert.deepEqual(restored.diaryEntries[0],entry);
 saveDiaryEntry(restored,{id:entry.id,date:entry.date,content:'后来改成纯文字'});assert.equal(restored.diaryEntries[0].richText,undefined);
 assert.equal(richField(doc,'和文档不匹配的正文').richText,undefined);
});

test('rich text imports only supported structures and never render scripts, media, links or injected attributes',()=>{
 const doc={type:'doc',content:[{type:'paragraph',attrs:{textAlign:'center',onclick:'alert(1)'},content:[{type:'text',text:'<script>alert(1)</script>',marks:[{type:'bold',attrs:{onclick:'bad'}},{type:'link',attrs:{href:'javascript:bad'}}]},{type:'image',attrs:{src:'https://example.invalid/tracker'}}]},{type:'iframe',attrs:{srcdoc:'bad'}}]};
 const clean=normalizeRichText(doc),html=renderRichText(clean);
 assert.match(html,/diary-align-center/);assert.match(html,/&lt;script&gt;/);assert.match(html,/<strong>/);
 assert.doesNotMatch(html,/<script|onclick|javascript:|<img|<iframe|srcdoc|<a\b|href/);
 assert.equal(richPlain(clean),'<script>alert(1)</script>');
});

test('formatting documents have depth, text and node bounds and legacy plain text remains literal',()=>{
 assert.equal(normalizeRichText(plainDocument('a'.repeat(12001))),null);
 assert.equal(normalizeRichText({type:'doc',content:Array.from({length:6001},()=>({type:'paragraph'}))}),null);
 let nested={type:'paragraph',content:[]};for(let i=0;i<24;i++)nested={type:'blockquote',content:[nested]};assert.equal(normalizeRichText({type:'doc',content:[nested]}),null);
 const plain='第一行\n<b>仍是文字</b>\n';assert.equal(richPlain(plainDocument(plain)),plain);assert.doesNotMatch(renderRichText(plainDocument(plain)),/<b>/);
});

test('lists, headings, quotes and alignment restore as bounded semantic tags',()=>{
 const doc={type:'doc',content:[{type:'orderedList',attrs:{start:2},content:[{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'清单'}]}]}]},{type:'blockquote',content:[{type:'heading',attrs:{level:3,textAlign:'right'},content:[{type:'text',text:'引用',marks:[{type:'italic'},{type:'strike'}]}]}]}]};
 const html=renderRichText(doc);assert.match(html,/<ol start="2">/);assert.match(html,/<li><p>清单/);assert.match(html,/<blockquote><h3 class="diary-align-right">/);assert.match(html,/<s><em>引用/);
});

test('chosen font sizes, colours and highlight survive safe normalization and backup',()=>{
 const state=createState(),doc={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'有颜色的文字',marks:[{type:'textStyle',attrs:{fontSize:36,color:NOTE_COLORS[1]}},{type:'highlight'}]}]}]};
 const entry=saveDiaryEntry(state,{date:'2026-11-16',content:richPlain(doc),richText:doc});
 const html=renderRichText(entry.richText);assert.match(html,/font-size:36px/);assert.match(html,/color:#e5484d/);assert.match(html,/diary-highlight/);
 assert.deepEqual(normalizeState(JSON.parse(exportData(state))).diaryEntries[0],entry);
 assert.deepEqual(NOTE_SIZES,[16,18,20,24,36,48,64,72]);assert.equal(entry.richText.content[0].content[0].marks[1].attrs.color,NOTE_HIGHLIGHT);
});

test('font formatting rejects CSS injection, arbitrary colours and excessive sizes while retaining text',()=>{
 const doc={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'安全文字',marks:[{type:'textStyle',attrs:{fontSize:'36;position:fixed',color:'url(https://example.invalid/tracker)',backgroundImage:'bad'}},{type:'highlight',attrs:{color:'red;display:none'}}]}]}]};
 const html=renderRichText(doc);assert.match(html,/安全文字/);assert.doesNotMatch(html,/style=|https:|position:|display:|backgroundImage|<mark/);
 doc.content[0].content[0].marks=[{type:'textStyle',attrs:{fontSize:72,color:'rgb(39, 58, 139)',onclick:'bad'}}];
 const clean=normalizeRichText(doc);assert.deepEqual(clean.content[0].content[0].marks,[{type:'textStyle',attrs:{fontSize:72,color:'#273a8b'}}]);
});
