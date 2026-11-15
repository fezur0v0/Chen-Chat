import {coverEditor} from './view.js';
import {normalizeDiaryCover,saveDiaryCover,readCoverImage,diaryOwner} from './model.js';
import {bindDrawerDismiss,animateDrawerClose} from '../../../drawer.js';
import {bindTouchRipple,touchRippleFinished} from '../../../components/touch-ripple.js';

export function createDiaryCover({app,getState,setState,persist,notify,ui,refresh,enter}){
 const dialog=document.createElement('dialog');dialog.className='dc-editor glass app-sheet bottom-sheet';dialog.setAttribute('aria-label','编辑日记封面');document.body.append(dialog);bindTouchRipple(dialog);
 let draft,owner='self',uploading=false,closing=false,waiting=false,revision=0,animationRevision=0,opening=false,contentAnimation=null,returnFocus;
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
 // Fade only the content. Keep the header in place and never stretch a paper clone.
 async function switchContent(change){
  if(opening)return;
  const body=app.querySelector('.diary-app .desktop-app-body');if(!body)return;
  opening=true;const current=++animationRevision;let animation;
  try{
   if(motion()){
    animation=body.animate([{opacity:1},{opacity:0}],{duration:150,easing:'ease-in',fill:'forwards'});contentAnimation=animation;
    await animation.finished.catch(()=>{});
   }
   if(current!==animationRevision||!body.isConnected)return;
   change();
   animation?.cancel();
   if(motion()){
    animation=body.animate([{opacity:0},{opacity:1}],{duration:220,easing:'ease-out',fill:'forwards'});contentAnimation=animation;
    await animation.finished.catch(()=>{});
   }
  }finally{animation?.cancel();if(current===animationRevision){contentAnimation=null;opening=false;}}
 }
 app.addEventListener('click',event=>{const target=event.target.closest('.diary-app [data-diary-cover-action]');if(!target||opening)return;const action=target.dataset.diaryCoverAction;if(action==='edit'){openEditor();return;}if(action==='back'){void switchContent(()=>{ui.screen='cover';ui.coverSelected='';refresh();app.querySelector('.page-content').scrollTop=0;app.querySelector('.diary-app h1')?.focus({preventScroll:true});});return;}if(action==='select'&&!opening){const owner=diaryOwner(target.dataset.owner);if(ui.coverSelected===owner){void switchContent(()=>enter(diaryOwner(target.dataset.owner)));return;}ui.coverSelected=owner;app.querySelectorAll('.dc-entry').forEach(n=>{const selected=n.dataset.owner===owner;n.classList.toggle('is-selected',selected);n.setAttribute('aria-pressed',String(selected));n.setAttribute('aria-label',(normalizeDiaryCover(getState().diaryCover)[n.dataset.owner].name||(n.dataset.owner==='self'?'我的日记':'TA 的日记'))+'，'+(selected?'再次轻触进入':'轻触选中'));});}});
 return {reset(){animationRevision++;opening=false;contentAnimation?.cancel();contentAnimation=null;ui.screen='cover';ui.coverSelected='';}};
}
