import {gallery,galleryAlbumForm,galleryConfirm,photoDetail,addPicker,addChoice,wallpaperChoice,avatarChoice,galleryViewer} from './view.js';
import {albumPhotos,GALLERY_COLLECTIONS,saveAlbum,addUploadedPhotos,copyPhotos,movePhotos,removeFromAlbum,reorderAlbums,deletePhotos,deleteAlbum,updatePhoto,favoritePhoto,saveChatPhoto,detachDiaryPhotoRefs,assignAppearanceImage} from './model.js';
import {icon} from '../../icons.js';
const customAlbum=id=>id&&!GALLERY_COLLECTIONS.includes(id);
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export function createGalleryApp({app,getState,setState,persist,notify,compressImage,render}){
 const ui={view:'time',albumId:'',selecting:false,selected:[],busy:false};
 const pickerInput=document.createElement('input');pickerInput.type='file';pickerInput.multiple=true;pickerInput.accept='image/jpeg,image/png,image/webp';pickerInput.hidden=true;pickerInput.dataset.galleryFiles='';document.body.append(pickerInput);
 const viewer=document.createElement('dialog');viewer.className='gallery-viewer';viewer.setAttribute('aria-label','照片');document.body.append(viewer);
 const detail=document.createElement('dialog');detail.className='gallery-detail';detail.setAttribute('aria-label','照片详情');document.body.append(detail);
 const picker=document.createElement('dialog');picker.className='gallery-picker';picker.setAttribute('aria-label','添加到');document.body.append(picker);
 const popup=document.createElement('dialog');popup.className='gallery-popup';document.body.append(popup);
 let importTarget='',importRevision=0,viewerPhoto='',viewerReturn='',gesture=null,albumDrag=null,swallowClick=false,stageDrag=null,filmMoved=false,stripSync=false,stripTimer=0,filmRaf=0,popupKind='',albumIntent='',addIds=[],pendingAlbum='';
 const data=()=>getState().gallery;
 const scope=()=>app.querySelector('.gallery-app');
 const contextPhotos=()=>albumPhotos(data(),ui.albumId||'all');
 function syncKeyboard(){
  const vv=window.visualViewport,overlap=vv?Math.max(0,window.innerHeight-(vv.height+vv.offsetTop)):0,value=`${overlap}px`;
  for(const node of [scope(),viewer,detail,picker,popup])node?.style.setProperty('--gallery-keyboard',value);
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
  const bar=app.querySelector('.gallery-app .gallery-capsule');if(bar)bar.setAttribute('aria-label',`已选 ${ui.selected.length} 张`);
  const status=app.querySelector('.gallery-capsule [role=status]');if(status)status.textContent=`已选 ${ui.selected.length} 张`;
  for(const button of app.querySelectorAll('.gallery-app .gallery-capsule-button')){
   const needsAlbum=button.dataset.galleryAction==='remove-from-album';
   button.disabled=!ui.selected.length||needsAlbum&&!customAlbum(ui.albumId);
  }
 }
 function refresh(focus,top=false){
  const root=scope();if(!root)return;
  if(ui.albumId&&!GALLERY_COLLECTIONS.includes(ui.albumId)&&!data().albums.some(a=>a.id===ui.albumId)){ui.albumId='';ui.selecting=false;ui.selected=[];}
  const visible=new Set(contextPhotos().map(p=>p.id));ui.selected=ui.selected.filter(id=>visible.has(id));
  if(ui.selecting&&!ui.selected.length&&!visible.size)ui.selecting=false;
  const scroller=app.querySelector('.page-content'),scroll=scroller?.scrollTop||0;
  root.innerHTML=gallery(getState(),ui);if(scroller)scroller.scrollTop=top?0:scroll;
  syncKeyboard();
  if(focus)root.querySelector(focus)?.focus({preventScroll:true});
 }
 function fail(error){
  const alert=(popup.open&&popup.querySelector('[role=alert]'))||(detail.open&&detail.querySelector('[role=alert]'));
  if(alert){alert.hidden=false;alert.textContent=error.message;}else notify(error.message);
 }
 function commit(change){
  const previous=structuredClone(data()),previousDiary=structuredClone(getState().diaryEntries||[]);
  try{const result=change();if(!persist())throw new Error('图库尚未保存，本机存储不足或不可用。请导出备份、减少一次上传的照片后重试。');return result??true;}
  catch(error){setState({...getState(),gallery:previous,diaryEntries:previousDiary});fail(error);return null;}
 }
 function showPopup(kind,html,label){popupKind=kind;popup.innerHTML=html;popup.setAttribute('aria-label',label);const name=popup.querySelector('[name=name]');if(name){name.required=true;name.maxLength=60;}if(!popup.open)popup.showModal();(name||popup.querySelector('button'))?.focus({preventScroll:true});}
 function hideMore(){const menu=viewer.querySelector('.gallery-more');if(menu)menu.hidden=true;}
 function scrollFilm(index){
  const strip=viewer.querySelector('.gallery-filmstrip'),item=strip?.querySelectorAll('.gallery-film')[index];if(!strip||!item)return;
  const left=item.offsetLeft-(strip.clientWidth-item.offsetWidth)/2;
  stripSync=true;strip.scrollTo({left:Math.max(0,left),behavior:reduceMotion()?'auto':'smooth'});
  clearTimeout(stripTimer);stripTimer=setTimeout(()=>{stripSync=false;},reduceMotion()?0:420);
 }
 function nearestFilm(strip){
  const center=strip.scrollLeft+strip.clientWidth/2;let best=0,distance=Infinity;
  [...strip.children].forEach((item,index)=>{const delta=Math.abs(item.offsetLeft+item.offsetWidth/2-center);if(delta<distance){distance=delta;best=index;}});
  return best;
 }
 function paintViewer(index,{fromStrip=false,rebuild=false}={}){
  const photos=contextPhotos();if(!photos.length){if(viewer.open)viewer.close();return;}
  index=Math.max(0,Math.min(photos.length-1,index));
  const photo=photos[index];viewerPhoto=photo.id;
  const films=[...viewer.querySelectorAll('.gallery-film')];
  const same=!rebuild&&films.length===photos.length&&films.every((node,item)=>node.dataset.id===photos[item].id);
  if(!same)viewer.innerHTML=galleryViewer(photos,index);
  else{
   const img=viewer.querySelector('.gallery-viewer-stage img');
   if(img&&img.dataset.id!==photo.id){img.dataset.id=photo.id;img.src=photo.data;img.alt=photo.name;img.style.transform='';}
   const headerWhen=viewer.querySelector('.gallery-viewer-when');
   if(headerWhen){const date=new Date(photo.time);headerWhen.innerHTML=`<strong>${date.toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'})}</strong><small>${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}</small>`;}
   const heart=viewer.querySelector('[data-gallery-action=favorite]');
   if(heart){heart.setAttribute('aria-pressed',String(photo.favorite===true));heart.setAttribute('aria-label',photo.favorite?'取消收藏':'收藏');heart.classList.toggle('is-on',photo.favorite===true);}
   films.forEach((node,item)=>{const on=item===index;node.classList.toggle('is-current',on);node.setAttribute('aria-selected',String(on));});
  }
  if(!fromStrip)scrollFilm(index);
 }
 function openViewer(id){
  const photos=contextPhotos(),index=photos.findIndex(p=>p.id===id);if(index<0)return;
  viewerPhoto=id;viewerReturn=id;viewer.innerHTML=galleryViewer(photos,index);
  if(!viewer.open)viewer.showModal();
  viewer.querySelector('[data-gallery-action=close-viewer]')?.focus({preventScroll:true});
  scrollFilm(index);
 }
 function openDetail(){
  const photo=data().photos.find(p=>p.id===viewerPhoto);if(!photo)return;
  hideMore();detail.innerHTML=photoDetail(photo);if(!detail.open)detail.showModal();detail.querySelector('[name=caption]')?.focus({preventScroll:true});
 }
 function openAdd(ids){
  addIds=[...new Set(ids)].filter(id=>data().photos.some(p=>p.id===id));if(!addIds.length)return;
  pendingAlbum='';hideMore();picker.innerHTML=addPicker(data());if(!picker.open)picker.showModal();
 }
 function openChoice(album){pendingAlbum=album.id;showPopup('choice',addChoice(album),'选择添加方式');}
 function finishAdd(message){
  popup.close();picker.close();
  const photos=contextPhotos(),index=photos.findIndex(p=>p.id===viewerPhoto);
  if(viewer.open){if(index>=0)paintViewer(index,{rebuild:true});else viewer.close();}
  ui.selected=[];ui.selecting=false;refresh();notify(message);
 }
 async function applyAppearance(key){
  const photo=data().photos.find(p=>p.id===viewerPhoto);if(!photo)return;
  const appearance=getState().appearance,previous=appearance?.[key];
  try{
   const blob=await (await fetch(photo.data)).blob();
   const file=new File([blob],photo.name||'photo',{type:blob.type||'image/jpeg'});
   const sized=await compressImage(file,key==='userAvatar'||key==='aiAvatar'?256:1440);
   assignAppearanceImage(getState(),key,sized);
   if(!persist()){if(appearance)appearance[key]=previous;return;}
   popup.close();hideMore();render?.();notify(key.endsWith('Avatar')?'头像已更新。':'壁纸已更新。');
  }catch(error){if(appearance&&previous!==undefined)appearance[key]=previous;notify(error.message||'图片未能保存。');}
 }
 function handle(event){
  if(swallowClick&&event.currentTarget===app){swallowClick=false;event.preventDefault();event.stopPropagation();return;}
  if(filmMoved&&event.target.closest?.('[data-gallery-action=film]')){filmMoved=false;event.preventDefault();event.stopPropagation();return;}
  const button=event.target.closest?.('[data-gallery-action]');if(!button||button.disabled)return;
  const action=button.dataset.galleryAction,id=button.dataset.id;
  if(action==='show-time'){ui.view='time';ui.albumId='';ui.selecting=false;ui.selected=[];refresh('[data-gallery-action=show-time]');}
  if(action==='show-albums'){ui.view='album';ui.albumId='';ui.selecting=false;ui.selected=[];refresh('[data-gallery-action=show-albums]');}
  if(action==='back'){ui.albumId='';ui.view='album';ui.selecting=false;ui.selected=[];refresh('[data-gallery-action=show-albums]');}
  if(action==='close-select'){ui.selecting=false;ui.selected=[];refresh();}
  if(action==='open-album'){ui.albumId=id;ui.selecting=false;ui.selected=[];refresh('.gallery-header [data-gallery-action=back]',true);}
  if(action==='upload'){if(ui.busy)return notify('照片正在整理中，请稍等。');importTarget=customAlbum(ui.albumId)?ui.albumId:'';pickerInput.value='';pickerInput.click();}
  if(action==='new-album'){albumIntent='edit';showPopup('album',galleryAlbumForm(getState()),'新建相册');}
  if(action==='edit-album'){const album=data().albums.find(a=>a.id===id);if(album){albumIntent='edit';showPopup('album',galleryAlbumForm(getState(),album),'编辑相册');}}
  if(action==='photo'){
   if(!ui.selecting){openViewer(id);return;}
   ui.selected=ui.selected.includes(id)?ui.selected.filter(value=>value!==id):[...ui.selected,id];refresh(`[data-gallery-action=photo][data-id="${CSS.escape(id)}"]`);
  }
  if(action==='select-all'){const photos=contextPhotos();ui.selected=photos.every(p=>ui.selected.includes(p.id))?[]:photos.map(p=>p.id);refresh('[data-gallery-action=select-all]');}
  if(action==='add-to')openAdd(button.closest('.gallery-viewer')?[viewerPhoto]:ui.selected);
  if(action==='choose-album'){const album=data().albums.find(a=>a.id===id);if(album)openChoice(album);}
  if(action==='create-target'){albumIntent='create-target';showPopup('album',galleryAlbumForm(getState()),'新建相册');}
  if(action==='confirm-copy'||action==='confirm-move'){
   const ids=addIds.slice(),target=pendingAlbum;if(!ids.length||!target)return;
   const copying=action==='confirm-copy';
   if(commit(()=>copying?copyPhotos(data(),ids,target):movePhotos(data(),ids,target)))finishAdd(copying?'已加入相册，没有另存一份图片。':'照片已移动。');
  }
  if(action==='close-popup')popup.close();
  if(action==='close-picker'){if(popup.open)popup.close();picker.close();addIds=[];pendingAlbum='';}
  if(action==='remove-from-album'&&ui.selected.length){
   if(!customAlbum(ui.albumId))return notify('请先打开一个自建相册，再从中移除。');
   if(commit(()=>removeFromAlbum(data(),ui.selected,ui.albumId))){ui.selected=[];ui.selecting=false;refresh();notify('已从相册移除，照片仍留在图库里。');}
  }
  if(action==='delete-photos'&&ui.selected.length){
   const diary=data().photos.some(p=>ui.selected.includes(p.id)&&p.origin==='diary');
   showPopup('delete-photos',galleryConfirm({title:'彻底删除',body:diary?'这些照片来自日记。彻底删除后，对应日记里的引用也会一并移除。照片会从图库中移除。':'照片会从图库中移除，聊天里的原图会保留。',confirmAction:'confirm-delete-photos',confirmLabel:'彻底删除'}),'彻底删除');
  }
  if(action==='confirm-delete-photos'){
   if(commit(()=>{detachDiaryPhotoRefs(getState(),ui.selected);deletePhotos(data(),ui.selected);})){popup.close();ui.selected=[];ui.selecting=false;if(viewer.open)viewer.close();refresh();notify('照片已从图库删除。');}
  }
  if(action==='delete-album'){const album=data().albums.find(a=>a.id===id);if(album)showPopup('delete-album',galleryConfirm({title:'删除相册',body:`删除「${album.name}」？里面的照片会保留在图库中。`,confirmAction:'confirm-delete-album',confirmLabel:'删除相册',id:album.id}),'删除相册');}
  if(action==='confirm-delete-album'){
   if(commit(()=>deleteAlbum(data(),id))){popup.close();refresh();notify('相册已删除，照片已保留。');}
  }
  if(action==='close-viewer')viewer.close();
  if(action==='favorite'){const photo=data().photos.find(p=>p.id===viewerPhoto);if(photo&&commit(()=>favoritePhoto(data(),photo.id,!photo.favorite)))paintViewer(contextPhotos().findIndex(p=>p.id===photo.id));}
  if(action==='info')openDetail();
  if(action==='close-detail')detail.close();
  if(action==='film')paintViewer(Number(button.dataset.index));
  if(action==='more'){const menu=viewer.querySelector('.gallery-more');if(menu)menu.hidden=!menu.hidden;}
  if(action==='delete-current'){
   const photo=data().photos.find(p=>p.id===viewerPhoto);if(!photo)return;
   showPopup('delete-current',galleryConfirm({title:'彻底删除',body:photo.origin==='diary'?'这张照片来自日记。彻底删除后，对应日记里的引用也会一并移除。':'照片会从图库中移除，聊天里的原图会保留。',confirmAction:'confirm-delete-current',confirmLabel:'彻底删除'}),'彻底删除');
  }
  if(action==='confirm-delete-current'){
   const id=viewerPhoto,index=contextPhotos().findIndex(p=>p.id===id);
   if(commit(()=>{detachDiaryPhotoRefs(getState(),[id]);deletePhotos(data(),[id]);})){popup.close();const photos=contextPhotos();if(!photos.length)viewer.close();else paintViewer(Math.min(Math.max(index,0),photos.length-1),{rebuild:true});refresh();notify('照片已从图库删除。');}
  }
  if(action==='set-wallpaper')showPopup('wallpaper',wallpaperChoice(),'设为壁纸');
  if(action==='set-avatar')showPopup('avatar',avatarChoice(getState()),'设为头像');
  if(action==='apply-appearance')void applyAppearance(button.dataset.key);
 }
 function clearGesture(){if(gesture?.timer)clearTimeout(gesture.timer);gesture=null;}
 app.addEventListener('pointerdown',event=>{
  if(!scope()||!event.isPrimary||event.button>0)return;
  const drag=event.target.closest('[data-gallery-drag]');
  if(drag&&scope().contains(drag)){albumDrag={pointer:event.pointerId,id:drag.closest('[data-id]')?.dataset.id};drag.setPointerCapture?.(event.pointerId);return;}
  const thumb=event.target.closest('.gallery-thumbnail');if(!thumb||!scope().contains(thumb))return;
  gesture={pointer:event.pointerId,id:thumb.dataset.id,x:event.clientX,y:event.clientY,selecting:ui.selecting,axis:'',timer:null};
  if(!ui.selecting)gesture.timer=setTimeout(()=>{if(!gesture)return;ui.selecting=true;ui.selected=[gesture.id];gesture.selecting=true;swallowClick=true;refresh(`[data-gallery-action=photo][data-id="${CSS.escape(gesture.id)}"]`);},450);
 },true);
 app.addEventListener('pointermove',event=>{
  if(albumDrag&&albumDrag.pointer===event.pointerId){
   const card=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('.gallery-custom');if(!card||card.dataset.id===albumDrag.id)return;
   const list=app.querySelector('.gallery-custom-list');if(!list)return;
   const cards=[...list.querySelectorAll('.gallery-custom')],from=cards.findIndex(item=>item.dataset.id===albumDrag.id),to=cards.findIndex(item=>item.dataset.id===card.dataset.id);
   if(from<0||to<0)return;if(from<to)cards[to].after(cards[from]);else cards[to].before(cards[from]);return;
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
   const ids=[...app.querySelectorAll('.gallery-custom')].map(card=>card.dataset.id),changed=ids.some((item,index)=>item!==data().albums[index]?.id);
   albumDrag=null;if(changed&&ids.length){if(commit(()=>reorderAlbums(data(),ids)))refresh();else refresh();}return;
  }
  if(gesture&&(!event||gesture.pointer===event.pointerId))clearGesture();
  if(swallowClick)setTimeout(()=>{swallowClick=false;},0);
 }
 app.addEventListener('pointerup',endPointer,true);
 app.addEventListener('pointercancel',endPointer,true);
 viewer.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button>0)return;
  if(event.target.closest('.gallery-filmstrip')){filmMoved=false;stageDrag={pointer:event.pointerId,x:event.clientX,y:event.clientY,dx:0,film:true,active:false};return;}
  if(event.target.closest('button,input,textarea,a'))return;
  const stage=event.target.closest('.gallery-viewer-stage');if(!stage)return;
  stageDrag={pointer:event.pointerId,x:event.clientX,y:event.clientY,dx:0,film:false,active:false};
  stage.classList.add('is-dragging');
 },true);
 viewer.addEventListener('pointermove',event=>{
  if(!stageDrag||stageDrag.pointer!==event.pointerId)return;
  stageDrag.dx=event.clientX-stageDrag.x;const dy=event.clientY-stageDrag.y;
  if(stageDrag.film){if(Math.abs(stageDrag.dx)>8)filmMoved=true;return;}
  if(!stageDrag.active&&Math.hypot(stageDrag.dx,dy)<8)return;
  if(!stageDrag.active&&Math.abs(dy)>Math.abs(stageDrag.dx)){stageDrag=null;viewer.querySelector('.gallery-viewer-stage')?.classList.remove('is-dragging');return;}
  stageDrag.active=true;
  const img=viewer.querySelector('.gallery-viewer-stage img');if(!img||reduceMotion())return;
  const photos=contextPhotos(),index=photos.findIndex(p=>p.id===viewerPhoto);let dx=stageDrag.dx;
  if((index<=0&&dx>0)||(index>=photos.length-1&&dx<0))dx*=.35;
  img.style.transform=`translate3d(${dx}px,0,0)`;
 },true);
 function endStage(event){
  if(!stageDrag||(event&&stageDrag.pointer!==event.pointerId))return;
  const drag=stageDrag;stageDrag=null;
  viewer.querySelector('.gallery-viewer-stage')?.classList.remove('is-dragging');
  const img=viewer.querySelector('.gallery-viewer-stage img');if(img)img.style.transform='';
  if(drag.film||event?.type==='pointercancel'||!drag.active)return;
  const photos=contextPhotos(),index=photos.findIndex(p=>p.id===viewerPhoto);
  if(Math.abs(drag.dx)<48)return;
  const next=index+(drag.dx<0?1:-1);if(next>=0&&next<photos.length)paintViewer(next);
 }
 viewer.addEventListener('pointerup',endStage,true);
 viewer.addEventListener('pointercancel',endStage,true);
 viewer.addEventListener('scroll',event=>{
  if(stripSync||event.target!==viewer.querySelector('.gallery-filmstrip'))return;
  cancelAnimationFrame(filmRaf);
  filmRaf=requestAnimationFrame(()=>{
   const strip=viewer.querySelector('.gallery-filmstrip');if(!strip||stripSync)return;
   const index=nearestFilm(strip),current=contextPhotos().findIndex(p=>p.id===viewerPhoto);
   if(index!==current)paintViewer(index,{fromStrip:true});
  });
 },true);
 viewer.addEventListener('cancel',event=>{if(popup.open||picker.open||detail.open){event.preventDefault();return;}const menu=viewer.querySelector('.gallery-more');if(menu&&!menu.hidden){event.preventDefault();menu.hidden=true;}});
 viewer.addEventListener('close',()=>{hideMore();app.querySelector(`[data-gallery-action=photo][data-id="${CSS.escape(viewerReturn)}"]`)?.focus({preventScroll:true});viewer.innerHTML='';stageDrag=null;});
 viewer.addEventListener('keydown',event=>{
  if(event.key==='Escape'){const menu=viewer.querySelector('.gallery-more');if(menu&&!menu.hidden){event.preventDefault();menu.hidden=true;}}
  if(['ArrowLeft','ArrowRight'].includes(event.key)&&!detail.open&&!popup.open&&!picker.open&&document.activeElement?.tagName!=='TEXTAREA'){event.preventDefault();const photos=contextPhotos(),index=photos.findIndex(p=>p.id===viewerPhoto),next=index+(event.key==='ArrowRight'?1:-1);if(next>=0&&next<photos.length)paintViewer(next);}
 });
 detail.addEventListener('submit',event=>{
  event.preventDefault();const photo=data().photos.find(p=>p.id===viewerPhoto);if(!photo)return;
  const fields=Object.fromEntries(new FormData(event.target)),time=new Date(fields.date).getTime();
  if(!commit(()=>updatePhoto(data(),{id:photo.id,name:fields.name,caption:fields.caption,time})))return;
  detail.close();paintViewer(contextPhotos().findIndex(p=>p.id===photo.id),{rebuild:true});refresh();notify('照片信息已保存。');
 });
 popup.addEventListener('submit',event=>{
  event.preventDefault();if(popupKind!=='album')return;
  const fields=Object.fromEntries(new FormData(event.target)),intent=albumIntent;
  const result=commit(()=>saveAlbum(data(),fields));if(!result)return;
  if(intent==='create-target'){picker.innerHTML=addPicker(data());openChoice(result);notify('相册已新建，照片还没有加入。');return;}
  popup.close();if(!fields.id){ui.view='album';ui.albumId=result.id;ui.selecting=false;}
  refresh();notify('相册已保存。');
 });
 for(const node of [app,viewer,detail,picker,popup])node.addEventListener('click',handle);
 app.addEventListener('keydown',event=>{if(event.key==='Escape'&&ui.selecting&&scope()&&!viewer.open){ui.selecting=false;ui.selected=[];refresh();}});
 pickerInput.addEventListener('change',async()=>{
  const files=Array.from(pickerInput.files||[]);if(!files.length||ui.busy)return;
  const target=importTarget,ticket=++importRevision;ui.busy=true;pickerInput.disabled=true;refresh();
  try{
   const items=[];for(const file of files){
    if(file.size>10*1024*1024)throw new Error('单张照片不能超过 10MB。');
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error('请选择 JPG、PNG 或 WebP 照片。');
    const image=await compressImage(file,1440);if(ticket!==importRevision)return;
    items.push({data:image,name:file.name,time:file.lastModified||Date.now()});
   }
   if(commit(()=>addUploadedPhotos(data(),items,target)))notify(`已添加 ${items.length} 张照片。`);
  }catch(error){if(ticket===importRevision)notify(error.message||'照片读取失败。');}
  finally{if(ticket===importRevision){ui.busy=false;pickerInput.disabled=false;pickerInput.value='';refresh();}}
 });
 function reset(){importRevision++;ui.view='time';ui.albumId='';ui.selecting=false;ui.selected=[];ui.busy=false;pickerInput.disabled=false;pickerInput.value='';clearGesture();addIds=[];pendingAlbum='';for(const node of [popup,picker,detail,viewer])if(node.open)node.close();}
 return {ui,reset,openHome(){ui.view='time';ui.albumId='';ui.selecting=false;ui.selected=[];},saveConversationPhoto(input){const result=commit(()=>saveChatPhoto(getState(),input));if(result){refresh();if(result.created)notify('一张对话照片已加入珍藏。');}return result;}};
}
