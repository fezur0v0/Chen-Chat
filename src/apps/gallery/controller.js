import {gallery,gallerySheet,galleryViewer} from './view.js';
import {albumPhotos,GALLERY_COLLECTIONS,saveAlbum,addUploadedPhotos,copyPhotos,movePhotos,removeFromAlbum,reorderAlbums,deletePhotos,deleteAlbum,updatePhoto,saveChatPhoto,detachDiaryPhotoRefs} from './model.js';
import {icon} from '../../icons.js';
import {animateDrawerClose,bindDrawerDismiss} from '../../drawer.js';
const customAlbum=id=>id&&!GALLERY_COLLECTIONS.includes(id);
export function createGalleryApp({app,getState,setState,persist,notify,compressImage}){
 const ui={view:'time',albumId:'',selecting:false,selected:[],busy:false};
 const picker=document.createElement('input');picker.type='file';picker.multiple=true;picker.accept='image/jpeg,image/png,image/webp';picker.hidden=true;picker.dataset.galleryFiles='';document.body.append(picker);
 const sheet=document.createElement('dialog');sheet.className='gallery-sheet glass app-sheet bottom-sheet';document.body.append(sheet);
 const viewer=document.createElement('dialog');viewer.className='gallery-viewer';viewer.setAttribute('aria-label','照片预览');document.body.append(viewer);
 let importTarget='',importRevision=0,sheetRevision=0,closing=false,sheetKind='',placeAfterCreate='',returnFocus=null,viewerPhoto='',viewerReturn='',viewerNote=false,swipe=null,gesture=null,albumDrag=null,swallowClick=false,viewerHandled=false;
 const data=()=>getState().gallery;
 const scope=()=>app.querySelector('.gallery-app');
 function syncKeyboard(){
  const root=scope();if(!root)return;
  const vv=window.visualViewport;
  const overlap=vv?Math.max(0,window.innerHeight-(vv.height+vv.offsetTop)):0;
  root.style.setProperty('--gallery-keyboard',`${overlap}px`);
 }
 window.visualViewport?.addEventListener('resize',syncKeyboard);
 window.visualViewport?.addEventListener('scroll',syncKeyboard);
 function paintSelection(){
  const selected=new Set(ui.selected);
  for(const button of app.querySelectorAll('.gallery-thumbnail')){
   const on=selected.has(button.dataset.id);
   button.classList.toggle('is-selected',on);
   if(ui.selecting)button.setAttribute('aria-pressed',String(on));
   const mark=button.querySelector('.gallery-photo-check');if(mark)mark.innerHTML=on?icon('check'):'';
  }
  const bar=app.querySelector('.gallery-capsule');if(bar)bar.setAttribute('aria-label',`已选 ${ui.selected.length} 张`);
  const status=app.querySelector('.gallery-capsule [role=status]');if(status)status.textContent=`已选 ${ui.selected.length} 张`;
  for(const button of app.querySelectorAll('.gallery-capsule-button')){
   const action=button.dataset.galleryAction;
   const needsAlbum=action==='remove-from-album';
   button.disabled=!ui.selected.length||needsAlbum&&!customAlbum(ui.albumId);
  }
 }
 function refresh(focus,top=false){
  const root=scope();if(!root)return;
  if(ui.albumId&&!GALLERY_COLLECTIONS.includes(ui.albumId)&&!data().albums.some(a=>a.id===ui.albumId)){ui.albumId='';ui.selecting=false;ui.selected=[];}
  const visible=new Set(albumPhotos(data(),ui.albumId||'all').map(p=>p.id));ui.selected=ui.selected.filter(id=>visible.has(id));
  if(ui.selecting&&!ui.selected.length&&!visible.size)ui.selecting=false;
  const scroller=app.querySelector('.page-content'),scroll=scroller?.scrollTop||0;
  root.innerHTML=gallery(getState(),ui);if(scroller)scroller.scrollTop=top?0:scroll;
  syncKeyboard();
  if(focus)root.querySelector(focus)?.focus({preventScroll:true});
 }
 function commit(change){
  const previous=structuredClone(data()),previousDiary=structuredClone(getState().diaryEntries||[]);
  try{const result=change();if(!persist())throw new Error('图库尚未保存，本机存储不足或不可用。请导出备份、减少一次上传的照片后重试。');return result??true;}
  catch(error){setState({...getState(),gallery:previous,diaryEntries:previousDiary});const alert=sheet.open&&sheet.querySelector('[role=alert]');if(alert){alert.hidden=false;alert.textContent=error.message;}else notify(error.message);return null;}
 }
 async function close(){if(!sheet.open||closing)return;closing=true;const ticket=sheetRevision;await animateDrawerClose(sheet);if(ticket!==sheetRevision)return;sheet.close();closing=false;}
 bindDrawerDismiss(sheet,{panel:()=>sheet.open&&!closing?sheet:null,close,backdrop:true});
 sheet.addEventListener('cancel',event=>{event.preventDefault();void close();});
 sheet.addEventListener('close',()=>{if(sheet.open)return;sheetRevision++;closing=false;sheet.style.transform='';sheet.getAnimations().forEach(a=>a.cancel());const fallback=viewer.open?viewer.querySelector('[data-gallery-action=edit-photo]'):app.querySelector('.gallery-header button:last-child');(returnFocus?.isConnected?returnFocus:fallback)?.focus({preventScroll:true});});
 function openSheet(kind,item=null,{placing=''}={}){
  if(!sheet.open)returnFocus=document.activeElement;
  sheetRevision++;closing=false;sheet.style.transform='';sheet.getAnimations().forEach(a=>a.cancel());sheetKind=kind;placeAfterCreate=placing;
  sheet.innerHTML=gallerySheet(kind,getState(),ui,item);sheet.setAttribute('aria-label',kind==='album'?'相册编辑':kind==='photo'?'照片信息':kind==='copy'?'复制到相册':kind==='move'?'移动照片':'删除确认');
  const name=sheet.querySelector('[name=name]');if(name){name.required=true;name.maxLength=kind==='album'?60:180;}
  const date=sheet.querySelector('[name=date]');if(date){date.required=true;date.min='0001-01-01T00:00';date.max='9999-12-31T23:59';}
  if(!sheet.open)sheet.showModal();(name||sheet.querySelector('.drawer-handle'))?.focus({preventScroll:true});
 }
 function renderViewer(){
  const photos=albumPhotos(data(),ui.albumId||'all'),index=photos.findIndex(p=>p.id===viewerPhoto);
  if(index<0){if(viewer.open)viewer.close();return;}
  const caption=viewer.querySelector('[name=caption]');const draft=document.activeElement===caption?caption.value:null;
  viewer.innerHTML=galleryViewer(photos[index],index,photos.length,viewerNote);
  const next=viewer.querySelector('[name=caption]');if(next&&draft!==null)next.value=draft;
 }
 function openViewer(id){viewerPhoto=id;viewerReturn=id;viewerNote=false;renderViewer();if(!viewer.querySelector('img'))return;viewer.showModal();viewer.querySelector('.nav-back').focus({preventScroll:true});}
 function step(delta){const photos=albumPhotos(data(),ui.albumId||'all'),index=photos.findIndex(p=>p.id===viewerPhoto),next=photos[index+delta];if(next){viewerPhoto=next.id;renderViewer();const control=viewer.querySelector(`[data-gallery-action=${delta>0?'next-photo':'previous-photo'}]`);(control&&!control.disabled?control:viewer.querySelector('.nav-back'))?.focus({preventScroll:true});}}
 function exitSelection(focus='[data-gallery-action=upload]'){ui.selecting=false;ui.selected=[];refresh(focus);}
 viewer.addEventListener('close',()=>{app.querySelector(`[data-gallery-action=photo][data-id="${CSS.escape(viewerReturn)}"]`)?.focus({preventScroll:true});viewer.innerHTML='';swipe=null;viewerNote=false;});
 viewer.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)&&!sheet.open&&document.activeElement?.tagName!=='TEXTAREA'){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}});
 viewer.addEventListener('pointerdown',event=>{if(event.isPrimary)swipe={x:event.clientX,y:event.clientY,footer:!!event.target.closest('.gallery-viewer-footer')};});
 viewer.addEventListener('pointerup',event=>{if(!swipe)return;const x=event.clientX-swipe.x,y=event.clientY-swipe.y,footer=swipe.footer;swipe=null;if(footer&&y<-36&&Math.abs(y)>Math.abs(x)){viewerHandled=true;viewerNote=true;renderViewer();viewer.querySelector('[name=caption]')?.focus({preventScroll:true});return;}if(!footer&&Math.abs(x)>55&&Math.abs(y)<45){viewerHandled=true;step(x<0?1:-1);}});
 viewer.addEventListener('pointercancel',()=>swipe=null);
 viewer.addEventListener('click',event=>{
  if(viewerHandled){viewerHandled=false;event.preventDefault();event.stopPropagation();return;}
  if(event.target.closest('.gallery-viewer-footer')&&!event.target.closest('button,textarea,input,label')){viewerNote=!viewerNote;renderViewer();}
 },true);
 viewer.addEventListener('submit',event=>{
  event.preventDefault();const photo=data().photos.find(p=>p.id===viewerPhoto);if(!photo)return;
  const caption=new FormData(event.target).get('caption');
  if(!commit(()=>updatePhoto(data(),{id:photo.id,name:photo.name,caption,time:photo.time})))return;
  renderViewer();notify('备注已保存。');
 });
 function handle(event){
  if(swallowClick){swallowClick=false;event.preventDefault();event.stopPropagation();return;}
  const button=event.target.closest('[data-gallery-action]');if(!button||button.disabled)return;
  const action=button.dataset.galleryAction,id=button.dataset.id;
  if(action==='show-time'){ui.view='time';ui.albumId='';exitSelection('[data-gallery-action=show-time]');}
  if(action==='show-albums'){ui.view='album';ui.albumId='';exitSelection('[data-gallery-action=show-albums]');}
  if(action==='back'){ui.albumId='';ui.view='album';exitSelection('[data-gallery-action=show-albums]');}
  if(action==='close-select')exitSelection();
  if(action==='open-album'){ui.albumId=id;ui.selecting=false;ui.selected=[];refresh('.gallery-header .nav-back',true);}
  if(action==='upload'){
   if(ui.busy)return notify('照片正在整理中，请稍等。');
   importTarget=customAlbum(ui.albumId)?ui.albumId:'';picker.value='';picker.click();
  }
  if(action==='new-album')openSheet('album');
  if(action==='edit-album'){const album=data().albums.find(a=>a.id===id);if(album)openSheet('album',album);}
  if(action==='photo'){
   if(!ui.selecting){openViewer(id);return;}
   ui.selected=ui.selected.includes(id)?ui.selected.filter(v=>v!==id):[...ui.selected,id];refresh(`[data-gallery-action=photo][data-id="${CSS.escape(id)}"]`);
  }
  if(action==='select-all'){const photos=albumPhotos(data(),ui.albumId||'all');ui.selected=photos.every(p=>ui.selected.includes(p.id))?[]:photos.map(p=>p.id);refresh('[data-gallery-action=select-all]');}
  if(action==='copy'&&ui.selected.length)openSheet('copy');
  if(action==='move'&&ui.selected.length)openSheet('move');
  if(action==='copy-to'&&ui.selected.length){
   if(commit(()=>copyPhotos(data(),ui.selected,id))){sheet.close();ui.selected=[];ui.selecting=false;refresh('[data-gallery-action=show-albums]');notify('已加入相册，没有另存一份图片。');}
  }
  if(action==='move-to'&&ui.selected.length){
   if(commit(()=>movePhotos(data(),ui.selected,id))){sheet.close();ui.selected=[];ui.selecting=false;refresh();notify('照片已移动。');}
  }
  if(action==='new-destination')openSheet('album',null,{placing:sheetKind==='copy'?'copy':'move'});
  if(action==='remove-from-album'&&ui.selected.length){
   if(!customAlbum(ui.albumId))return notify('请先打开一个自建相册，再从中移除。');
   if(commit(()=>removeFromAlbum(data(),ui.selected,ui.albumId))){ui.selected=[];ui.selecting=false;refresh();notify('已从相册移除，照片仍留在图库里。');}
  }
  if(action==='delete-photos'&&ui.selected.length)openSheet('delete-photos',{diary:data().photos.some(p=>ui.selected.includes(p.id)&&p.origin==='diary')});
  if(action==='confirm-delete-photos'){
   if(commit(()=>{detachDiaryPhotoRefs(getState(),ui.selected);deletePhotos(data(),ui.selected);})){sheet.close();ui.selected=[];ui.selecting=false;if(viewer.open)viewer.close();refresh();notify('照片已从图库删除。');}
  }
  if(action==='delete-album'){const album=data().albums.find(a=>a.id===id);if(album)openSheet('delete-album',album);}
  if(action==='confirm-delete-album'){
   if(commit(()=>deleteAlbum(data(),id))){sheet.close();refresh('[data-gallery-action=upload]');notify('相册已删除，照片已保留。');}
  }
  if(action==='close')void close();
  if(action==='close-viewer')viewer.close();
  if(action==='previous-photo')step(-1);if(action==='next-photo')step(1);
  if(action==='toggle-note'){viewerNote=!viewerNote;renderViewer();viewer.querySelector(viewerNote?'[name=caption]':'[data-gallery-action=toggle-note]')?.focus({preventScroll:true});}
  if(action==='edit-photo'){const photo=data().photos.find(p=>p.id===viewerPhoto);if(photo)openSheet('photo',photo);}
 }
 function clearGesture(){if(gesture?.timer)clearTimeout(gesture.timer);gesture=null;}
 app.addEventListener('pointerdown',event=>{
  if(!scope()||!event.isPrimary||event.button>0)return;
  const drag=event.target.closest('[data-gallery-drag]');
  if(drag&&scope().contains(drag)){
   albumDrag={pointer:event.pointerId,id:drag.closest('[data-id]')?.dataset.id,over:''};
   drag.setPointerCapture?.(event.pointerId);return;
  }
  const thumb=event.target.closest('.gallery-thumbnail');
  if(!thumb||!scope().contains(thumb))return;
  gesture={pointer:event.pointerId,id:thumb.dataset.id,x:event.clientX,y:event.clientY,selecting:ui.selecting,axis:'',timer:null};
   if(!ui.selecting)gesture.timer=setTimeout(()=>{
   if(!gesture)return;ui.selecting=true;ui.selected=[gesture.id];gesture.selecting=true;swallowClick=true;refresh(`[data-gallery-action=photo][data-id="${CSS.escape(gesture.id)}"]`);
  },450);
 },true);
 app.addEventListener('pointermove',event=>{
  if(albumDrag&&albumDrag.pointer===event.pointerId){
   const card=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('.gallery-custom');
   if(!card||card.dataset.id===albumDrag.id)return;
   const list=app.querySelector('.gallery-custom-list');if(!list)return;
   const cards=[...list.querySelectorAll('.gallery-custom')],from=cards.findIndex(item=>item.dataset.id===albumDrag.id),to=cards.findIndex(item=>item.dataset.id===card.dataset.id);
   if(from<0||to<0)return;
   if(from<to)cards[to].after(cards[from]);else cards[to].before(cards[from]);
   albumDrag.over=card.dataset.id;return;
  }
  if(!gesture||gesture.pointer!==event.pointerId)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(!gesture.axis&&Math.hypot(dx,dy)>10){
   if(gesture.timer){clearTimeout(gesture.timer);gesture.timer=null;}
   if(!gesture.selecting){swallowClick=true;gesture=null;return;}
   gesture.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
   if(gesture.axis==='y'){gesture=null;return;}
   swallowClick=true;
  }
  if(gesture?.axis==='x'){
   const node=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('.gallery-thumbnail');
   if(node&&scope()?.contains(node)&&!ui.selected.includes(node.dataset.id)){ui.selected=[...ui.selected,node.dataset.id];paintSelection();}
  }
 },true);
 function endPointer(event){
  if(albumDrag&&(!event||albumDrag.pointer===event.pointerId)){
   const ids=[...app.querySelectorAll('.gallery-custom')].map(card=>card.dataset.id);
   const changed=ids.some((id,index)=>id!==data().albums[index]?.id);
   albumDrag=null;
   if(changed&&ids.length){if(commit(()=>reorderAlbums(data(),ids)))refresh();else refresh();}
   return;
  }
  if(gesture&&(!event||gesture.pointer===event.pointerId))clearGesture();
  if(swallowClick)setTimeout(()=>{swallowClick=false;},0);
 }
 app.addEventListener('pointerup',endPointer,true);
 app.addEventListener('pointercancel',endPointer,true);
 app.addEventListener('click',handle);sheet.addEventListener('click',handle);viewer.addEventListener('click',handle);
 app.addEventListener('keydown',event=>{if(event.key==='Escape'&&ui.selecting&&scope())exitSelection();});
 sheet.addEventListener('submit',event=>{
  event.preventDefault();const fields=Object.fromEntries(new FormData(event.target));
  if(sheetKind==='album'){
   const placing=placeAfterCreate,result=commit(()=>{const album=saveAlbum(data(),fields);if(placing==='move')movePhotos(data(),ui.selected,album.id);if(placing==='copy')copyPhotos(data(),ui.selected,album.id);return album;});if(!result)return;
   sheet.close();ui.selected=[];ui.selecting=false;if(!fields.id&&!placing){ui.view='album';ui.albumId=result.id;}
   refresh('.gallery-header .nav-back',!fields.id&&!placing);notify(placing==='copy'?'相册已新建，照片已加入。':placing==='move'?'相册已新建，照片已移入。':'相册已保存。');
  }
  if(sheetKind==='photo'){
   if(!commit(()=>updatePhoto(data(),{...fields,time:new Date(fields.date).getTime()})))return;
   sheet.close();refresh();renderViewer();notify('照片信息已保存。');
  }
 });
 picker.addEventListener('change',async()=>{
  const files=Array.from(picker.files||[]);if(!files.length||ui.busy)return;
  const target=importTarget,ticket=++importRevision;ui.busy=true;picker.disabled=true;refresh();
  try{
   const items=[];for(const file of files){
    if(file.size>10*1024*1024)throw new Error('单张照片不能超过 10MB。');
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error('请选择 JPG、PNG 或 WebP 照片。');
    const image=await compressImage(file,1440);if(ticket!==importRevision)return;
    items.push({data:image,name:file.name,time:file.lastModified||Date.now()});
   }
   if(commit(()=>addUploadedPhotos(data(),items,target)))notify(`已添加 ${items.length} 张照片。`);
  }catch(error){if(ticket===importRevision)notify(error.message||'照片读取失败。');}
  finally{if(ticket===importRevision){ui.busy=false;picker.disabled=false;picker.value='';refresh();}}
 });
 function reset(){importRevision++;ui.view='time';ui.albumId='';ui.selecting=false;ui.selected=[];ui.busy=false;picker.disabled=false;picker.value='';clearGesture();if(sheet.open)sheet.close();if(viewer.open)viewer.close();}
 return {ui,reset,openHome(){ui.view='time';ui.albumId='';ui.selecting=false;ui.selected=[];},saveConversationPhoto(input){const result=commit(()=>saveChatPhoto(getState(),input));if(result){refresh();if(result.created)notify('一张对话照片已加入珍藏。');}return result;}};
}
