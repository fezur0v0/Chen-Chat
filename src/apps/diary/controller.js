import {createRichEditor} from './rich-editor.js';
import {plainDocument} from './rich-text.js';
import {diary,diaryEditor,diaryMoodOptions,diaryMoodButton,diaryPhotoStrip,moodEditor} from './view.js';
import {diaryHeader} from './cover/view.js';
import {createDiaryCover} from './cover/controller.js';
import {diaryOwner} from './cover/model.js';
import {diaryDate,validDiaryDate,diaryCalendar,shiftDiaryMonth,saveDiaryEntry,saveDiaryMood,updateDiaryMood,deleteDiaryMood,MOOD_POINT_LIMIT,MOOD_STROKE_LIMIT} from './model.js';
import {bindTouchRipple,touchRippleFinished} from '../../components/touch-ripple.js';
const motionOk=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE='cubic-bezier(.22,.8,.2,1)';

export function createDiaryApp({app,getState,setState,persist,notify,compressImage}){
 const today=diaryDate(),ui={screen:'cover',owner:'self',entryId:'',coverSelected:'',month:today.slice(0,7),selected:today};
 const editor=document.createElement('section');editor.className='diary-paper diary-compose';editor.setAttribute('aria-label','日记写作页');bindTouchRipple(editor);
 let noteRich=null,formatPaneOpen=false;
 let photos=[],textSize=16,noteHistory=[],noteCursor=0,initialNote='',uploading=false;
 let editorOpen=false,editingId='',returnScreen='entries',listScroll=0,detailScroll=0,revision=0,waitingForRipple=false;
 let moodPane,moodState,moodReturn,writingScroll=0,press=null,suppressChip=false;
 const scroller=()=>app.querySelector('.page-content');
 const currentEntry=()=>getState().diaryEntries.find(item=>item.id===ui.entryId&&diaryOwner(item.owner)===ui.owner);
 const cover=createDiaryCover({app,getState,setState,persist,notify,ui,refresh,enter(owner){
  ui.owner=owner;ui.screen='entries';ui.entryId='';ui.month=diaryDate().slice(0,7);ui.selected=diaryDate();listScroll=0;refresh();scroller().scrollTop=0;focusTitle();
 }});
 function focusTitle(){app.querySelector('.diary-app h1')?.focus({preventScroll:true});}
 function sync(){
  if(editorOpen&&ui.screen==='compose'){
   const slot=app.querySelector('.diary-compose-slot');if(slot&&!slot.contains(editor)){slot.append(editor);moodState?.resize();}
   updateNote();
  }
 }
 function refresh(focusSelector){
  const root=app.querySelector('.diary-app'),body=root?.querySelector('.desktop-app-body');if(!body)return;
  root.dataset.diaryOwner=ui.owner;root.dataset.diaryScreen=ui.screen;
  if(editorOpen&&ui.screen==='compose'){sync();return;}
  const top=scroller().scrollTop;
  body.innerHTML=diary(getState(),ui);root.querySelector('.app-topbar').outerHTML=diaryHeader(getState(),ui);scroller().scrollTop=top;
  if(focusSelector)body.querySelector(focusSelector)?.focus({preventScroll:true});
 }
 function afterRipple(button,action){
  const finished=touchRippleFinished(button);if(!finished){action();return;}
  const current=revision;waitingForRipple=true;
  void finished.then(()=>{if(current!==revision)return;waitingForRipple=false;if(editorOpen)action();});
 }
 function cancelPress(){if(press)clearTimeout(press.timer);press=null;}
 function clearEditor(){
  editor.querySelector('.diary-note-picker')?.close();editor.querySelector('.diary-photo-dialog')?.close();noteRich?.destroy();noteRich=null;formatPaneOpen=false;ui.moodEditing=false;revision++;cancelPress();suppressChip=false;waitingForRipple=false;moodState?.destroy();moodState=null;moodReturn=null;editorOpen=false;editor.remove();
 }
 function finishEditor(screen=returnScreen){
  clearEditor();ui.screen=screen;refresh();scroller().scrollTop=screen==='entries'?listScroll:detailScroll;focusTitle();
 }
 function close(){if(waitingForRipple||!editorOpen)return;if(moodState){closeMood();return;}if(!sameNote(readNote(),initialNote)&&!confirm('放弃这次还没保存的修改？'))return;finishEditor();}
 function open(entry){
  returnScreen=ui.screen==='detail'?'detail':'entries';
  if(returnScreen==='detail')detailScroll=scroller().scrollTop;else listScroll=scroller().scrollTop;
  revision++;editingId=entry?.id||'';ui.entryId=editingId;ui.screen='compose';formatPaneOpen=false;refresh();
  editor.innerHTML=diaryEditor(entry,ui.selected,getState(),ui.owner);moodPane=editor.querySelector('.diary-mood-editor');
  const date=editor.querySelector('[name=date]');date.required=true;date.min='0001-01-01';date.max='9999-12-31';
  photos=[...(entry?.photos||[])];textSize=entry?.textSize||16;noteRich=createRichEditor(editor.querySelector('.diary-rich-host'),{content:entry?.content||'',richText:entry?.richText,onChange:recordNote,onSelection:syncFormat,onLimit:()=>notify('日记最多保存 12000 字，请精简后继续。'),onUndo:restoreNote});uploading=false;noteHistory=[];noteCursor=0;editor.querySelector('[name=title]').maxLength=80;editorOpen=true;initialNote=readNote();noteHistory=[readNote()];renderPhotos();sync();scroller().scrollTop=0;focusTitle();
 }
 function showDetail(entry){listScroll=scroller().scrollTop;ui.entryId=entry.id;ui.screen='detail';detailScroll=0;refresh();scroller().scrollTop=0;focusTitle();}
 function backToList(){ui.screen='entries';ui.entryId='';refresh();scroller().scrollTop=listScroll;focusTitle();}
 function commit(change,alert){
  const previous=structuredClone(getState());
  try{const result=change(getState());if(!persist())throw new Error('日记尚未保存，本机存储不足或不可用。内容仍保留在这里，请备份后重试。');return result;}
  catch(error){setState(previous);const target=alert?.isConnected?alert:editor.querySelector('[role=alert]');if(target){target.hidden=false;target.textContent=error.message;target.scrollIntoView({block:'nearest'});}return null;}
 }
 function select(date,scroll=false){
  if(!validDiaryDate(date))return;
  ui.selected=date;ui.month=date.slice(0,7);refresh(`[data-diary-date="${date}"]`);
  if(scroll){
   if(motionOk())app.querySelector(`[data-diary-date="${date}"] .diary-day-number`)?.animate([{transform:'scale(.93)'},{transform:'scale(1.055)',offset:.64},{transform:'scale(1)'}],{duration:230,easing:'ease-out'});
   app.querySelector(`[data-entry-date="${date}"]`)?.scrollIntoView({block:'nearest',behavior:motionOk()?'smooth':'auto'});
  }
 }
 function selectedMood(){return editor.querySelector('.diary-mood-options input:checked')?.value||'';}
 function replaceMoodOptions(selected){const options=editor.querySelector('.diary-mood-options');if(!options)return;const left=options.scrollLeft;options.innerHTML=diaryMoodOptions(getState(),selected);options.scrollLeft=left;}
 function switchMoodPane(opening,focus){
  const scroll=scroller(),writing=editor.querySelector('.diary-writing');if(opening)writingScroll=scroll.scrollTop;
  writing.closest('form').hidden=opening;moodPane.hidden=!opening;ui.moodEditing=opening;app.querySelector('.diary-app>.app-topbar').outerHTML=diaryHeader(getState(),ui);updateNote();
  const incoming=opening?moodPane:writing;
  if(motionOk())incoming.animate([{opacity:0},{opacity:1}],{duration:180,easing:EASE});
  focus?.focus({preventScroll:true});
  if(opening)incoming.scrollIntoView({block:'start',behavior:motionOk()?'smooth':'auto'});else scroll.scrollTop=writingScroll;
 }
 function closeMood(focus){
  if(!moodState)return;moodState.destroy();moodState=null;
  const target=focus||(moodReturn?.isConnected?moodReturn:editor.querySelector('[data-note-mood]'));
  switchMoodPane(false,target);moodPane.replaceChildren();moodReturn=null;recordNote();
 }
 function openMood(name){
  if(moodState||!editorOpen)return false;
  editor.querySelector('.diary-note-picker').close();setFormatPane(false);noteRich?.blur();
  const state=getState(),existing=name?(state.diaryMoods||[]).find(mood=>mood.name===name):null;
  if(name&&!existing)return false;
  if(!existing&&(state.diaryMoods||[]).length>=12){notify('最多添加 12 个自定义心情。');return false;}
  moodReturn=document.activeElement;
  moodPane.innerHTML=moodEditor({name:existing?.name||'',color:existing?.color||'#f6a5b8',legacy:existing&&!existing.strokes?.length?existing.drawing:'',editing:!!existing});
  moodState=createMoodCanvas(moodPane.querySelector('form'),{strokes:existing?.strokes||[],editing:!!existing,notify});
  switchMoodPane(true,moodPane);moodState.resize();return true;
 }
 editor.addEventListener('pointerdown',event=>{
  const chip=event.target.closest('[data-mood-custom]');if(!chip||event.button!==0)return;
  cancelPress();suppressChip=false;const checked=selectedMood();
  press={name:chip.dataset.moodCustom,x:event.clientX,y:event.clientY,checked,fired:false,timer:setTimeout(()=>{if(!press)return;press.fired=openMood(press.name);suppressChip=press.fired;},500)};
 });
 editor.addEventListener('pointermove',event=>{if(press&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>8)cancelPress();});
 editor.addEventListener('pointerup',()=>{if(press&&!press.fired)cancelPress();});editor.addEventListener('pointercancel',cancelPress);
 editor.addEventListener('contextmenu',event=>{const chip=event.target.closest('[data-mood-custom]');if(!chip)return;event.preventDefault();const checked=selectedMood();cancelPress();suppressChip=openMood(chip.dataset.moodCustom);if(suppressChip)press={checked,fired:true};});
 app.addEventListener('click',event=>{
  const button=event.target.closest('.diary-app button');if(!button)return;
  if(button.hasAttribute('data-diary-close')){if(!editor.contains(button))close();return;}
  if(button.dataset.diaryDate){select(button.dataset.diaryDate,true);return;}
  if(button.dataset.diaryEdit){const entry=getState().diaryEntries.find(item=>item.id===button.dataset.diaryEdit&&diaryOwner(item.owner)===ui.owner);if(entry)showDetail(entry);return;}
  const action=button.dataset.diaryAction;
  if(action==='mood-back'){closeMood(editor.querySelector('[data-note-mood]'));return;}
  if(action==='photos'&&ui.screen==='detail'){showReaderPhotos();return;}
  if(action==='delete-entry'&&ui.screen==='detail'){const entry=currentEntry();if(entry&&confirm('删除这篇日记？删除后无法恢复。')){const saved=commit(state=>{state.diaryEntries=state.diaryEntries.filter(n=>n.id!==entry.id);return true;});if(saved)backToList();}return;}
  if(action==='undo'||action==='redo'){restoreNote(action==='undo'?-1:1);return;}
  if(action==='write'&&!editorOpen)open();
  if(action==='edit-entry'&&ui.screen==='detail'){const entry=currentEntry();if(entry)open(entry);}
  if(action==='back-list')backToList();
  if(action==='today')select(diaryDate());
  if(action==='previous'||action==='next'){
   ui.month=shiftDiaryMonth(ui.month,action==='next'?1:-1);
   const last=diaryCalendar(ui.month).filter(Boolean).at(-1),day=Math.min(Number(ui.selected.slice(-2)),Number(last.slice(-2)));
   ui.selected=`${ui.month}-${String(day).padStart(2,'0')}`;refresh(`[data-diary-action="${action}"]`);
  }
 });
 app.addEventListener('keydown',event=>{
  if(!app.querySelector('.diary-app'))return;
  if(editor.querySelector('.diary-note-picker')?.open)return;
  if(event.key==='Escape'&&!event.defaultPrevented){if(editorOpen){event.preventDefault();close();}else if(ui.screen==='detail'){event.preventDefault();backToList();}return;}
  const button=event.target.closest('[data-diary-date]');if(!button)return;
  const date=new Date(`${button.dataset.diaryDate}T12:00:00`),offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-date.getDay(),End:6-date.getDay()}[event.key];
  if(offset===undefined||event.altKey||event.ctrlKey||event.metaKey)return;event.preventDefault();date.setDate(date.getDate()+offset);select(diaryDate(date));
 });
 editor.addEventListener('click',event=>{
  if(waitingForRipple)return;
  if(suppressChip&&event.target.closest('[data-mood-custom]')){
   event.preventDefault();event.stopPropagation();const previous=editor.querySelector(`.diary-mood-options input[value="${CSS.escape(press?.checked||'')}"]`);if(previous)previous.checked=true;suppressChip=false;press=null;return;
  }
  if(moodState&&moodPane.contains(event.target)){handleMoodClick(event);return;}
  if(noteClick(event))return;
  if(event.target.closest('[data-diary-mood-add]')){openMood();return;}
  const cancel=event.target.closest('[data-diary-close]');if(cancel){afterRipple(cancel,close);return;}
  if(event.target.closest('[data-diary-delete]')&&confirm('删除这篇日记？删除后无法恢复。')){
   const saved=commit(state=>{state.diaryEntries=state.diaryEntries.filter(entry=>entry.id!==editingId);return true;});
   if(saved){finishEditor('entries');notify('日记已删除。');}
  }
 },true);
 editor.addEventListener('submit',event=>{
  event.preventDefault();if(waitingForRipple||!editorOpen)return;
  if(event.target.id==='diary-mood-form'){saveMood(event.submitter);return;}
  if(moodState||uploading)return;
  const entry=commit(state=>saveDiaryEntry(state,{...Object.fromEntries(new FormData(event.target)),content:noteRich.text(),richText:noteRich.document(),photos,textSize,owner:ui.owner}));if(!entry)return;
  afterRipple(event.submitter,()=>{ui.month=entry.date.slice(0,7);ui.selected=entry.date;ui.entryId=entry.id;detailScroll=0;finishEditor('detail');notify('日记已保存。');});
 });
 editor.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();editor.querySelector(moodState?'#diary-mood-form':'#diary-entry-form').requestSubmit();}});

 function sameNote(a,b){return !!b&&['id','title','content','date','mood','textSize'].every(k=>a[k]===b[k])&&a.photos.length===b.photos.length&&a.photos.every((v,i)=>v===b.photos[i])&&JSON.stringify(a.richText)===JSON.stringify(b.richText);}
 function readNote(){const form=editor.querySelector('#diary-entry-form');return form?{...Object.fromEntries(new FormData(form)),content:noteRich?.text()||'',richText:noteRich?.document()||plainDocument(''),photos:[...photos],textSize}:{};}
 function updateNote(){
  if(!editorOpen)return;
  const content=editor.querySelector('[name=content]');content.value=noteRich?.text()||'';editor.style.setProperty('--note-size',textSize+'px');
  editor.querySelector('[data-note-mood]').innerHTML=diaryMoodButton(getState(),selectedMood(),ui.owner);
  editor.querySelector('[data-note-mood]').setAttribute('aria-label','选择心情：'+(selectedMood()||'未选择'));
  for(const [action,disabled]of [['undo',noteCursor<=0],['redo',noteCursor>=noteHistory.length-1]]){const b=app.querySelector(`[data-diary-action=${action}]`);if(b)b.disabled=disabled||!!moodState||uploading;}
  const save=app.querySelector('[data-note-save]');if(save)save.disabled=!!moodState||uploading||waitingForRipple;
  syncFormat();
 }
 function syncFormat(){editor.querySelectorAll('[data-note-format]').forEach(b=>b.setAttribute('aria-pressed',String(noteRich?.active(b.dataset.noteFormat)||false)));const style=noteRich?.styles()||{};editor.querySelectorAll('[data-note-font-size]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.noteFontSize)===(style.fontSize||textSize))));editor.querySelectorAll('[data-note-font-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.noteFontColor===(style.color||'default'))));}
 function setFormatPane(opening){formatPaneOpen=opening;const pane=editor.querySelector('.diary-format-panel');if(pane)pane.hidden=!opening;editor.querySelector('[data-note-aa]')?.setAttribute('aria-expanded',String(opening));if(opening){noteRich?.blur();syncFormat();}}
 editor.addEventListener('focusin',e=>{if(e.target.closest('.diary-rich-editor,[name=title],[name=date]'))setFormatPane(false);});

 function photoGallery(editing){return photos.map((src,i)=>`<figure><img src="${src}" alt="日记照片 ${i+1}">${editing?`<button type="button" data-note-remove="${i}" aria-label="移除第 ${i+1} 张图片">移除</button>`:''}</figure>`).join('');}
 function renderPhotos(){editor.querySelector('.diary-note-photos').innerHTML=diaryPhotoStrip(photos,true);editor.querySelector('.diary-photo-gallery').innerHTML=photoGallery(true);}
 const readerPhotos=document.createElement('dialog');readerPhotos.className='diary-photo-dialog';readerPhotos.setAttribute('aria-label','日记图片');document.body.append(readerPhotos);
 function showReaderPhotos(){const entry=currentEntry();if(!entry)return;readerPhotos.innerHTML='<div class="diary-note-picker-head"><span>日记图片</span><button type="button" aria-label="关闭图片">×</button></div><div class="diary-photo-gallery">'+(entry.photos||[]).map((src,i)=>`<figure><img src="${src}" alt="日记照片 ${i+1}"></figure>`).join('')+'</div>';readerPhotos.querySelector('button').onclick=()=>readerPhotos.close();readerPhotos.showModal();}
 readerPhotos.addEventListener('click',e=>{if(e.target!==readerPhotos)return;const r=readerPhotos.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)readerPhotos.close();});
 editor.addEventListener('click',e=>{const dialog=e.target;if(!dialog.matches?.('.diary-note-picker,.diary-photo-dialog'))return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 editor.addEventListener('mousedown',e=>{if(e.target.closest('[data-note-format],[data-note-aa],[data-note-font-size],[data-note-font-color],[data-note-format-close]'))e.preventDefault();});
 function recordNote(){if(!editorOpen)return;const next=readNote();if(!sameNote(next,noteHistory[noteCursor])){noteHistory.splice(noteCursor+1);noteHistory.push(next);if(noteHistory.length>100)noteHistory.shift();noteCursor=noteHistory.length-1;}updateNote();}
 function restoreNote(step){if(!editorOpen||moodState||uploading)return;const next=noteCursor+step;if(next<0||next>=noteHistory.length)return;noteCursor=next;const value=noteHistory[next];for(const name of ['title','date'])editor.querySelector(`[name=${name}]`).value=value[name];noteRich.set(value.richText||plainDocument(value.content));replaceMoodOptions(value.mood);photos=[...value.photos];textSize=value.textSize;renderPhotos();updateNote();}
 function noteClick(event){
  const b=event.target.closest('button');if(!b)return false;
  if(b.hasAttribute('data-note-mood')){editor.querySelector('.diary-note-picker').showModal();return true;}
  if(b.hasAttribute('data-note-picker-close')){editor.querySelector('.diary-note-picker').close();return true;}
  if(b.hasAttribute('data-note-aa')){const opening=!formatPaneOpen;setFormatPane(opening);if(!opening)noteRich?.focus();return true;}
  if(b.hasAttribute('data-note-format-close')){setFormatPane(false);return true;}
  if(b.hasAttribute('data-note-font-size')){noteRich?.setSize(Number(b.dataset.noteFontSize));syncFormat();return true;}
  if(b.hasAttribute('data-note-font-color')){noteRich?.setColor(b.dataset.noteFontColor);syncFormat();return true;}
  if(b.hasAttribute('data-note-image')){setFormatPane(false);if(!uploading)editor.querySelector('[data-note-upload]').click();return true;}
  if(b.hasAttribute('data-note-format')){noteRich?.format(b.dataset.noteFormat,{focus:!formatPaneOpen});syncFormat();return true;}
  if(b.hasAttribute('data-note-photos')){editor.querySelector('.diary-photo-dialog').showModal();return true;}
  if(b.hasAttribute('data-note-photos-close')){editor.querySelector('.diary-photo-dialog').close();return true;}
  if(b.hasAttribute('data-note-remove')){photos.splice(Number(b.dataset.noteRemove),1);renderPhotos();recordNote();return true;}
  return false;
 }
 editor.addEventListener('input',e=>{if(['title','content'].includes(e.target.name)&&!e.isComposing)recordNote();});
 editor.addEventListener('compositionend',e=>{if(['title','content'].includes(e.target.name))recordNote();});
 editor.addEventListener('change',async e=>{
  if(e.target.name==='mood'){editor.querySelector('.diary-note-picker').close();recordNote();}
  if(e.target.name==='date')recordNote();
  if(!e.target.hasAttribute('data-note-upload'))return;
  const files=[...e.target.files],rev=revision;e.target.value='';if(!files.length||uploading)return;
  if(photos.length+files.length>6){notify('每篇日记最多添加 6 张图片。');return;}
  uploading=true;updateNote();
  try{const additions=[];for(const file of files)additions.push(await compressImage(file,1200));if(rev!==revision||!editorOpen)return;photos.push(...additions);renderPhotos();recordNote();}
  catch(error){if(rev===revision)notify(error.message||'图片读取失败，请重试。');}
  finally{if(rev===revision){uploading=false;updateNote();}}
 });
 editor.addEventListener('keydown',e=>{if(e.defaultPrevented||e.isComposing||moodState||!(e.ctrlKey||e.metaKey))return;const key=e.key.toLowerCase();if(key==='z'||key==='y'){e.preventDefault();restoreNote(key==='y'||e.shiftKey?1:-1);}});
 function handleMoodClick(event){
  const cancel=event.target.closest('[data-mood-close]');if(cancel){afterRipple(cancel,()=>closeMood());return;}
  const swatch=event.target.closest('[data-mood-color]');if(swatch){moodState?.setColor(swatch.dataset.moodColor);moodState?.resetDelete();return;}
  if(event.target.closest('[data-mood-tool="pen"]')){moodState?.setTool('pen');return;}
  if(event.target.closest('[data-mood-tool="eraser"]')){moodState?.setTool('eraser');return;}
  if(event.target.closest('[data-mood-size]')){moodState?.toggleSize();return;}
  if(event.target.closest('[data-mood-palette]')){moodState?.toggleColors();return;}
  if(event.target.closest('[data-mood-undo]')){moodState?.undo();return;}
  if(event.target.closest('[data-mood-clear]')){moodState?.clear();return;}
  if(event.target.closest('[data-mood-delete]')){moodState?.confirmDelete(removeMood);return;}
 }
 editor.addEventListener('input',event=>{if(!moodState||!moodPane.contains(event.target))return;if(event.target.name==='mood-name')moodState.syncSave();if(event.target.type==='range')moodState.setBrush(event.target.value);});
 function saveMood(button){
  if(!moodState)return;const alert=moodPane.querySelector('[role=alert]');alert.hidden=true;
  const draft=moodState.draft();if(!draft){alert.hidden=false;alert.textContent=moodState.editing?'先画一笔，或撤销到原来的表情。':'先画一张脸吧。';return;}
  const previousName=moodState.previousName,saved=commit(state=>previousName?updateDiaryMood(state,previousName,draft):saveDiaryMood(state,draft),alert);if(!saved)return;
  const selected=selectedMood(),next=!previousName||selected===previousName?saved.name:selected;replaceMoodOptions(next);
  afterRipple(button,()=>{closeMood(editor.querySelector('.diary-mood-options input:checked'));notify(previousName?'心情已修改。':'心情已保存。');});
 }
 function removeMood(){
  const alert=moodPane.querySelector('[role=alert]'),name=moodState?.previousName;alert.hidden=true;if(!name)return;
  const saved=commit(state=>{deleteDiaryMood(state,name);return true;},alert);if(!saved)return;
  replaceMoodOptions(selectedMood()===name?'':selectedMood());closeMood();notify('心情已删除。相关日记改为不标记，主页心情回到平静。');
 }
 return {ui,sync,openHome(){clearEditor();readerPhotos.close();ui.entryId='';cover.reset();}};
}

function createMoodCanvas(dialog,{strokes,editing,notify}) {
 const canvas=dialog.querySelector('canvas'),pad=dialog.querySelector('.diary-mood-pad'),ctx=canvas.getContext('2d');
 const name=dialog.querySelector('[name=mood-name]'),save=dialog.querySelector('.diary-mood-save');
 const undo=dialog.querySelector('[data-mood-undo]'),clearButton=dialog.querySelector('[data-mood-clear]');
 const sizePop=dialog.querySelector('.diary-mood-size'),sizeInput=sizePop.querySelector('input'),dot=dialog.querySelector('[data-brush-dot]');
 const legacyImage=dialog.querySelector('.diary-mood-legacy');
 const original=strokes.map(stroke=>({points:stroke.points.map(point=>[point[0],point[1]]),width:stroke.width,erase:stroke.erase===true}));
 const drawing=original.map(stroke=>({points:stroke.points.map(point=>[...point]),width:stroke.width,erase:stroke.erase}));
 let tool='pen',brush=Number(sizeInput.value),active=null,color=dialog.querySelector('[data-mood-color][aria-pressed=true]')?.dataset.moodColor||'#f6a5b8';
 const colors=dialog.querySelector('.diary-mood-colors'),paletteButton=dialog.querySelector('[data-mood-palette]'),sizeButton=dialog.querySelector('[data-mood-size]');
 function closePanels(){sizePop.hidden=true;colors.hidden=true;sizeButton.setAttribute('aria-expanded','false');paletteButton.setAttribute('aria-expanded','false');}
 dialog.addEventListener('pointerdown',event=>{if(!event.target.closest('.diary-mood-tools'))closePanels();});
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||(colors.hidden&&sizePop.hidden))return;
  event.preventDefault();event.stopPropagation();const target=colors.hidden?sizeButton:paletteButton;closePanels();target.focus({preventScroll:true});
 });
 const same=()=>JSON.stringify(drawing)===JSON.stringify(original);
 const penStroke=()=>drawing.some(stroke=>!stroke.erase);
 function paintDot(){const size=Math.max(4,brush*2.2);dot.style.width=`${size}px`;dot.style.height=`${size}px`;}
 function syncButtons(){
  const dirty=!same();
  const ready=name.value.trim().length>0&&name.value.trim().length<=12&&(penStroke()||(editing&&!dirty));
  save.setAttribute('aria-disabled',String(!ready));const headerSave=document.querySelector('[data-note-mood-save]');if(headerSave)headerSave.disabled=!ready;undo.disabled=!drawing.length;clearButton.disabled=!drawing.length;
  if(legacyImage)legacyImage.hidden=penStroke();
 }
 function draw(){
  const width=canvas.width,scale=width/64;ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.lineCap='round';ctx.lineJoin='round';const ink=getComputedStyle(canvas).color;
  for(const stroke of drawing){
   ctx.globalCompositeOperation=stroke.erase?'destination-out':'source-over';
   ctx.strokeStyle=ink;ctx.lineWidth=stroke.width*scale;const points=stroke.points;
   ctx.beginPath();ctx.moveTo(points[0][0]*scale,points[0][1]*scale);
   if(points.length===1)ctx.lineTo(points[0][0]*scale+.01,points[0][1]*scale);
   for(const point of points)ctx.lineTo(point[0]*scale,point[1]*scale);
   ctx.stroke();
  }
  ctx.globalCompositeOperation='source-over';syncButtons();
 }
 function resize(){
  const rect=canvas.getBoundingClientRect();if(rect.width<2||rect.height<2)return;
  const dpr=Math.max(1,Math.min(window.devicePixelRatio||1,3));
  const width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  draw();
 }
 const observer=new ResizeObserver(()=>resize());observer.observe(pad);
 const theme=new MutationObserver(draw);
 theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','style']});
 function point(event){
  const rect=canvas.getBoundingClientRect();
  const x=Math.round((event.clientX-rect.left)/rect.width*640)/10;
  const y=Math.round((event.clientY-rect.top)/rect.height*640)/10;
  // Match the guide's radius in the stored 64×64 coordinate system.
  const radius=64*.42-brush/2;
  return Math.hypot(x-32,y-32)<=radius?[x,y]:null;
 }
 canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||active)return;
  const start=point(event);if(!start)return;
  if(drawing.length>=MOOD_STROKE_LIMIT){notify('笔画太多了，先撤销几笔。');return;}
  closePanels();
  resetDelete();
  canvas.setPointerCapture(event.pointerId);
  active={id:event.pointerId,points:[start]};
  drawing.push({points:active.points,width:brush,erase:tool==='eraser'});
  draw();
 });
 canvas.addEventListener('pointermove',event=>{
  if(!active||active.id!==event.pointerId)return;
  const next=point(event);
  if(!next){active=null;return;}
  const last=active.points[active.points.length-1];
  if(Math.hypot(next[0]-last[0],next[1]-last[1])<.6)return;
  if(active.points.length>=MOOD_POINT_LIMIT)active.points[active.points.length-1]=next;
  else active.points.push(next);
  draw();
 });
 const endStroke=event=>{if(active&&(!event||active.id===event.pointerId))active=null;};
 canvas.addEventListener('pointerup',endStroke);canvas.addEventListener('pointercancel',endStroke);canvas.addEventListener('lostpointercapture',endStroke);
 function resetDelete(){const button=dialog.querySelector('[data-mood-delete]'),note=dialog.querySelector('[data-mood-delete-note]');if(!button)return;button.classList.remove('is-confirm');button.textContent='删除这个心情';if(note)note.hidden=true;button.dataset.confirm='';}
  paintDot();syncButtons();
 return {
  editing,previousName:editing?name.defaultValue:'',
  resize,resetDelete,syncSave:syncButtons,
  destroy(){observer.disconnect();theme.disconnect();},
  setColor(next){
   color=next;pad.style.setProperty('--mood',next);
   paletteButton.style.setProperty('--swatch',next);
   for(const button of colors.querySelectorAll('[data-mood-color]'))button.setAttribute('aria-pressed',String(button.dataset.moodColor===next));
   closePanels();paletteButton.focus({preventScroll:true});
  },
  setTool(next){tool=next;dialog.querySelector('[data-mood-tool=pen]').setAttribute('aria-pressed',String(next==='pen'));dialog.querySelector('[data-mood-tool=eraser]').setAttribute('aria-pressed',String(next==='eraser'));closePanels();},
  toggleSize(){const opening=sizePop.hidden;closePanels();sizePop.hidden=!opening;sizeButton.setAttribute('aria-expanded',String(opening));},
  toggleColors(){const opening=colors.hidden;closePanels();colors.hidden=!opening;paletteButton.setAttribute('aria-expanded',String(opening));},
  setBrush(value){const next=Number(value);if(!Number.isFinite(next))return;brush=Math.min(Number(sizeInput.max),Math.max(Number(sizeInput.min),next));sizeInput.value=String(brush);paintDot();},
  undo(){drawing.pop();draw();resetDelete();},
  clear(){drawing.splice(0,drawing.length);draw();resetDelete();},
  draft(){
   const label=name.value.trim();
   if(!label||label.length>12)return null;
   const dirty=!same();
   if(!penStroke()&&(!editing||dirty))return null;
   const data={name:label,color};
   if(dirty&&penStroke())data.strokes=drawing.map(stroke=>({points:stroke.points.map(point=>[point[0],point[1]]),width:stroke.width,erase:stroke.erase}));
   return data;
  },
  confirmDelete(remove){
   const button=dialog.querySelector('[data-mood-delete]'),note=dialog.querySelector('[data-mood-delete-note]');
   if(button.dataset.confirm!=='yes'){button.dataset.confirm='yes';button.classList.add('is-confirm');button.textContent='再点一次确认删除';if(note)note.hidden=false;return;}
   remove();
  },
 };
}
