import {coverEditor} from './view.js';
import {normalizeDiaryCover,saveDiaryCover,readCoverImage,diaryOwner} from './model.js';
import {bindDrawerDismiss,animateDrawerClose} from '../../../drawer.js';
import {bindTouchRipple,touchRippleFinished} from '../../../components/touch-ripple.js';

export function createDiaryCover({app,getState,setState,persist,notify,ui,refresh,enter}){
 const dialog=document.createElement('dialog');dialog.className='dc-editor glass app-sheet bottom-sheet';dialog.setAttribute('aria-label','编辑日记封面');document.body.append(dialog);bindTouchRipple(dialog);
 let draft,owner='self',uploading=false,closing=false,waiting=false,revision=0,animationRevision=0,opening=false,returnFocus;
 const motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
 function readDraft(){if(!draft)return;draft[owner].name=dialog.querySelector('[name=cover-name]')?.value||'';draft[owner].signature=dialog.querySelector('[name=cover-signature]')?.value||'';}
 function paintEditor(){dialog.innerHTML=coverEditor(draft,owner);}
 function openEditor(){if(opening||dialog.open)return;revision++;owner=diaryOwner(ui.owner);draft=normalizeDiaryCover(getState().diaryCover);returnFocus=document.activeElement;closing=false;dialog.style.transform='';paintEditor();dialog.showModal();dialog.querySelector('.drawer-handle').focus({preventScroll:true});}
 async function close(){if(uploading||closing||waiting)return;closing=true;const current=revision;await animateDrawerClose(dialog);if(current!==revision)return;dialog.close();closing=false;}
 bindDrawerDismiss(dialog,{panel:()=>dialog.open&&!closing?dialog:null,close,backdrop:true});dialog.addEventListener('cancel',event=>{event.preventDefault();void close();});
 dialog.addEventListener('close',()=>{if(dialog.open)return;revision++;draft=null;closing=false;waiting=false;dialog.style.transform='';dialog.getAnimations().forEach(a=>a.cancel());(returnFocus?.isConnected?returnFocus:app.querySelector('.dc-config'))?.focus({preventScroll:true});});
 async function afterButton(button,action){const current=revision;waiting=true;await touchRippleFinished(button);if(current!==revision)return;waiting=false;if(dialog.open)action();}
 dialog.addEventListener('click',event=>{const button=event.target.closest('[data-diary-cover-action]');if(!button||uploading||waiting||closing)return;const action=button.dataset.diaryCoverAction;if(action==='cancel'){void afterButton(button,()=>void close());return;}if(action==='owner'){readDraft();owner=diaryOwner(button.dataset.owner);paintEditor();dialog.querySelector(`[data-owner="${owner}"]`).focus({preventScroll:true});}if(action==='clear'){readDraft();if(['avatar','portrait'].includes(button.dataset.kind))draft[owner][button.dataset.kind]='';paintEditor();}});
 dialog.addEventListener('change',async event=>{
  const input=event.target,kind=input.dataset.coverUpload,file=input.files?.[0];if(!file||waiting||closing||!['avatar','portrait'].includes(kind)||uploading)return;
  readDraft();const current=revision,editingOwner=owner;uploading=true;dialog.querySelectorAll('button,input,textarea').forEach(n=>n.disabled=true);
  try{const image=await readCoverImage(file,kind);if(current!==revision||!dialog.open)return;draft[editingOwner][kind]=image;paintEditor();}
  catch(error){if(current===revision){const alert=dialog.querySelector('[role=alert]');alert.hidden=false;alert.textContent=error.message;}}
  finally{uploading=false;if(dialog.open&&current===revision){dialog.querySelectorAll('button,input,textarea').forEach(n=>n.disabled=false);dialog.querySelectorAll('[data-diary-cover-action=clear]').forEach(n=>n.disabled=!draft[owner][n.dataset.kind]);}}
 });
 dialog.addEventListener('submit',event=>{event.preventDefault();if(uploading||closing||waiting||!draft)return;readDraft();const previous=structuredClone(getState());saveDiaryCover(getState(),draft);if(!persist()){setState(previous);const alert=dialog.querySelector('[role=alert]');alert.hidden=false;alert.textContent='封面没有保存，本机空间可能不足。你的修改仍保留在这里。';return;}void afterButton(event.submitter,()=>{dialog.close();refresh();notify('日记封面已保存。');});});
 async function openEntry(entry){
  if(opening)return;opening=true;const current=++animationRevision;let ghost;
  try{
   if(motion()){
    const card=entry.querySelector('.dc-profile'),rect=card.getBoundingClientRect(),bounds=app.querySelector('.diary-app').getBoundingClientRect(),header=app.querySelector('.diary-app>.app-topbar').getBoundingClientRect();
    ghost=card.cloneNode(true);ghost.classList.add('dc-transition-paper');ghost.setAttribute('aria-hidden','true');
    Object.assign(ghost.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',minHeight:'0',transform:'none',padding:'18px'});document.body.append(ghost);
    ghost.querySelector('.dc-profile-body').animate([{opacity:1},{opacity:0}],{duration:140,fill:'forwards'});
    entry.classList.add('is-opening');
    await ghost.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${bounds.left+12-rect.left}px,${header.bottom+8-rect.top}px) scale(${(bounds.width-24)/rect.width},${Math.max(320,Math.min(innerHeight-header.bottom-24,600))/rect.height})`}],{duration:520,easing:'cubic-bezier(.2,.75,.15,1)',fill:'forwards'}).finished.catch(()=>{});
   }
   if(current!==animationRevision||!entry.isConnected)return;enter(diaryOwner(entry.dataset.owner));
  }finally{ghost?.remove();entry.classList.remove('is-opening');if(current===animationRevision)opening=false;}
 }
 app.addEventListener('click',event=>{const target=event.target.closest('.diary-app [data-diary-cover-action]');if(!target)return;const action=target.dataset.diaryCoverAction;if(action==='edit'){openEditor();return;}if(action==='back'){ui.screen='cover';ui.coverSelected='';refresh();app.querySelector('.page-content').scrollTop=0;return;}if(action==='select'&&!opening){const owner=diaryOwner(target.dataset.owner);if(ui.coverSelected===owner){void openEntry(target);return;}ui.coverSelected=owner;app.querySelectorAll('.dc-entry').forEach(n=>{const selected=n.dataset.owner===owner;n.classList.toggle('is-selected',selected);n.setAttribute('aria-pressed',String(selected));n.setAttribute('aria-label',(normalizeDiaryCover(getState().diaryCover)[n.dataset.owner].name||(n.dataset.owner==='self'?'我的日记':'TA 的日记'))+'，'+(selected?'再次轻触进入':'轻触选中'));n.querySelector('.dc-caption').firstChild.textContent=selected?'再轻触，翻开日记':(n.dataset.owner==='self'?'我的日记':'TA 的日记');});}});
 return {reset(){animationRevision++;opening=false;document.querySelectorAll('.dc-transition-paper').forEach(n=>n.remove());ui.screen='cover';ui.coverSelected='';}};
}
