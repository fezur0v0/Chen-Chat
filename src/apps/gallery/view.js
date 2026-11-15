import {escape,backButton,field} from '../../ui.js';
import {icon} from '../../icons.js';
import {drawerHeader} from '../../drawer.js';
import {albumPhotos,collection,photoGroups,GALLERY_COLLECTIONS} from './model.js';
const action=(value,label,symbol,extra='')=>`<button type="button" data-gallery-action="${value}" aria-label="${escape(label)}" ${extra}>${icon(symbol)}</button>`;
const capsule=(value,label,symbol,extra='')=>`<button type="button" class="gallery-capsule-button" data-gallery-action="${value}" aria-label="${escape(label)}" data-hint="${escape(label)}" ${extra}>${icon(symbol)}</button>`;
const dayLabel=time=>new Date(time).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'});
const customAlbum=id=>id&&!GALLERY_COLLECTIONS.includes(id);
const canUpload=id=>id!=='chat'&&id!=='diary';
function thumb(photo,ui,selected){
 const on=selected.has(photo.id);
 return `<button type="button" class="gallery-thumbnail ${on?'is-selected':''}" data-gallery-action="photo" data-id="${escape(photo.id)}" ${ui.selecting?`aria-pressed="${on}"`:''} aria-label="${ui.selecting?'选择':'查看'} ${escape(photo.name)}"><img src="${escape(photo.data)}" alt="${escape(photo.name)}" loading="lazy" draggable="false">${ui.selecting?`<span class="gallery-photo-check" aria-hidden="true">${on?icon('check'):''}</span>`:''}</button>`;
}
function timeline(photos,ui,selected){
 if(!photos.length){
  const title=ui.albumId==='diary'?'日记里还没有画面':ui.albumId==='chat'?'留给被记住的瞬间':'还没有照片';
  const copy=ui.albumId==='diary'?'日记正文还没有照片。以后留下的画面，会出现在这里。':ui.albumId==='chat'?'AI 在对话中珍藏的照片，会出现在这里。':'把喜欢的画面，按时间留在这里。';
  return `<section class="gallery-empty"><span>${icon(ui.albumId==='diary'?'note':'image')}</span><h2>${title}</h2><p>${copy}</p>${canUpload(ui.albumId)?'<button type="button" class="gallery-upload-empty" data-gallery-action="upload">上传照片</button>':''}</section>`;
 }
 return `<div class="gallery-timeline">${photoGroups(photos).map(group=>`<section class="gallery-day"><header><h2>${dayLabel(group.photos[0].time)}</h2><span>${group.photos.length} 张</span></header><div class="gallery-photo-grid">${group.photos.map(photo=>thumb(photo,ui,selected)).join('')}</div></section>`).join('')}</div>`;
}
function albumCard(data,album,{custom=false}={}){
 const photos=albumPhotos(data,album.id),cover=photos.find(p=>p.id===album.coverId)||photos[0];
 return `<article class="${custom?'gallery-custom':'gallery-system-card'}" data-id="${escape(album.id)}"><button type="button" class="gallery-album-open" data-gallery-action="open-album" data-id="${escape(album.id)}" aria-label="${escape(album.name)}，${photos.length} 张照片"><span class="gallery-album-cover ${!cover?'is-empty':''}">${cover?`<img src="${escape(cover.data)}" alt="" loading="lazy">`:icon(album.id==='chat'?'chat':album.id==='diary'?'note':'image')}</span><strong>${escape(album.name)}</strong><small>${photos.length} 张</small></button>${custom?`<button type="button" class="gallery-drag" data-gallery-drag aria-label="拖动调整 ${escape(album.name)} 的顺序">${icon('grip')}</button>${action('edit-album',`编辑相册 ${album.name}`,'more',`class="gallery-album-menu" data-id="${escape(album.id)}"`)}`:''}</article>`;
}
function bar(ui){
 if(ui.selecting){
  const count=ui.selected?.length||0,inAlbum=customAlbum(ui.albumId);
  return `<div class="gallery-capsule" role="toolbar" aria-label="已选 ${count} 张"><span class="sr-only" role="status">已选 ${count} 张</span>${capsule('copy','复制到相册','copy',count?'':'disabled')}${capsule('move','移动到相册','folder-input',count?'':'disabled')}${capsule('remove-from-album','从相册移除','folder-minus',count&&inAlbum?'':'disabled')}${capsule('delete-photos','彻底删除','trash',count?'':'disabled')}</div>`;
 }
 const albums=ui.view==='album'||!!ui.albumId;
 return `<div class="gallery-capsule" role="tablist" aria-label="图库视图">${capsule('show-time','时间轴','clock',`role="tab" aria-selected="${!albums}"`)}${capsule('show-albums','相册','layout',`role="tab" aria-selected="${albums}"`)}</div>`;
}
export function gallery(state,ui={}){
 const data=state.gallery,current=ui.albumId?collection(data,ui.albumId):null,selected=new Set(ui.selected||[]);
 const photos=albumPhotos(data,current?.id||'all');
 const title=current?.name||(ui.view==='album'?'相册':'图库');
 const allSelected=photos.length>0&&photos.every(photo=>selected.has(photo.id));
 const back=ui.selecting?action('close-select','退出选择','close'):current?backButton('back','返回相册',{actionAttribute:'data-gallery-action'}):backButton('home','返回主页');
 const tools=ui.selecting?action('select-all',allSelected?'取消全选':'全选当前照片','check'):canUpload(ui.albumId)?action('upload','上传照片','plus',ui.busy?'disabled':''):'<span aria-hidden="true"></span>';
 const header=`<header class="desktop-app-header app-topbar gallery-header ${ui.selecting?'is-selecting':''}">${back}<h1 tabindex="-1">${escape(title)}</h1>${tools}</header>`;
 let body;
 if(current){
  const photos=albumPhotos(data,current.id);
  body=`<div class="gallery-album-summary"><div><span>${photos.length} 张照片</span>${current.description?`<p>${escape(current.description)}</p>`:''}</div></div>${timeline(photos,ui,selected)}`;
 }else if(ui.view==='album'){
  const systems=GALLERY_COLLECTIONS.map(id=>collection(data,id));
  body=`<section class="gallery-block"><h2>系统相册</h2><div class="gallery-albums">${systems.map(album=>albumCard(data,album)).join('')}</div></section><section class="gallery-block"><div class="gallery-section-heading"><h2>我的相册</h2><button type="button" data-gallery-action="new-album">${icon('plus')}新建</button></div><div class="gallery-albums gallery-custom-list">${data.albums.map(album=>albumCard(data,album,{custom:true})).join('')||'<p class="gallery-footnote">还没有自建相册。</p>'}</div></section>`;
 }else body=timeline(albumPhotos(data,'all'),ui,selected);
 return `<div class="gallery-app-inner ${ui.selecting?'is-selecting':''}">${header}${ui.busy?'<p class="gallery-importing" role="status">正在整理照片…</p>':''}${body}${bar(ui)}</div>`;
}
export function gallerySheet(kind,state,ui,item){
 const data=state.gallery;
 const titles={album:item?.id?'编辑相册':'新建相册',photo:'照片信息',move:'移动到相册',copy:'复制到相册','delete-photos':'彻底删除','delete-album':'删除相册'};
 const start=`${drawerHeader({title:titles[kind],action:'close',actionAttribute:'data-gallery-action'})}<p class="gallery-sheet-error" role="alert" hidden></p>`;
 if(kind==='album'){
  const photos=item?.id?albumPhotos(data,item.id):[];
  return `${start}<div class="drawer-scroll"><form id="gallery-album-form"><input type="hidden" name="id" value="${escape(item?.id||'')}">${field('相册名称','name',item?.name||'','例如：一起走过的地方')}<label class="field"><span>相册描述</span><textarea name="description" rows="3" maxlength="500" placeholder="给这些画面留一句话。">${escape(item?.description||'')}</textarea></label>${photos.length?`<fieldset class="gallery-cover-picker"><legend>相册封面</legend><label class="gallery-cover-auto"><input type="radio" name="coverId" value="" ${!item.coverId?'checked':''}>自动使用最新照片</label><div>${photos.map(photo=>`<label class="gallery-cover-choice"><input type="radio" name="coverId" value="${escape(photo.id)}" ${photo.id===item.coverId?'checked':''}><img src="${escape(photo.data)}" alt="使用 ${escape(photo.name)} 作为封面" loading="lazy"></label>`).join('')}</div></fieldset>`:''}<footer class="gallery-sheet-footer">${item?.id?`<button type="button" class="gallery-danger" data-gallery-action="delete-album" data-id="${escape(item.id)}">删除相册</button>`:''}<button type="submit" class="primary">保存</button></footer></form></div>`;
 }
 if(kind==='photo'){
  const d=new Date(item.time),local=new Date(item.time-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const origin=item.origin==='diary'?'来自日记':item.origin==='assistant'?'由 AI 在对话中珍藏':'由你上传';
  return `${start}<div class="drawer-scroll"><form id="gallery-photo-form"><input type="hidden" name="id" value="${escape(item.id)}">${field('照片名称','name',item.name,'为这张照片命名')}${field('照片日期','date',local,'','datetime-local')}<p class="gallery-field-note">日期决定照片在时间轴中的位置。</p><label class="field"><span>照片备注</span><textarea name="caption" rows="3" maxlength="1000" placeholder="记下这个瞬间。">${escape(item.caption)}</textarea></label><p class="gallery-field-note">${origin}</p><footer class="gallery-sheet-footer"><button type="submit" class="primary">保存</button></footer></form></div>`;
 }
 if(kind==='move'||kind==='copy'){
  const verb=kind==='copy'?'复制到':'移动到',note=kind==='copy'?'照片仍只有一份，只是同时出现在这个相册里。':'照片会改到这个相册，不再留在原来的自建相册里。';
  return `${start}<div class="drawer-scroll"><p class="gallery-sheet-description">${verb} ${ui.selected.length} 张照片。${note}</p><div class="gallery-destination-list">${kind==='move'?`<button type="button" data-gallery-action="move-to" data-id="">${icon('image')}<span>不归入自建相册<small>仍保留在所有照片中</small></span>${icon('chevron')}</button>`:''}${data.albums.map(album=>`<button type="button" data-gallery-action="${kind}-to" data-id="${escape(album.id)}">${icon('folder')}<span>${escape(album.name)}<small>${albumPhotos(data,album.id).length} 张照片</small></span>${icon('chevron')}</button>`).join('')}</div><button type="button" class="gallery-new-destination" data-gallery-action="new-destination">${icon('plus')}新建相册并${kind==='copy'?'复制':'移动'}</button></div>`;
 }
 if(kind==='delete-album')return `${start}<p class="gallery-sheet-description">删除「${escape(item.name)}」？<br>里面的照片会保留在图库中。</p><footer class="gallery-sheet-footer"><button type="button" class="secondary" data-gallery-action="close">取消</button><button type="button" class="primary gallery-danger-fill" data-gallery-action="confirm-delete-album" data-id="${escape(item.id)}">删除相册</button></footer>`;
 const diary=item?.diary?'<br>这些照片来自日记。彻底删除后，对应日记里的引用也会一并移除。':'';
 return `${start}<p class="gallery-sheet-description">彻底删除选中的 ${ui.selected.length} 张照片？<br>照片会从图库中移除，聊天里的原图会保留。${diary}</p><footer class="gallery-sheet-footer"><button type="button" class="secondary" data-gallery-action="close">取消</button><button type="button" class="primary gallery-danger-fill" data-gallery-action="confirm-delete-photos">彻底删除</button></footer>`;
}
export function galleryViewer(photo,index,total,noteOpen=false){
 const origin=photo.origin==='diary'?'日记':photo.origin==='assistant'?'对话珍藏':'我上传的';
 return `<header class="gallery-viewer-header">${backButton('close-viewer','关闭照片',{actionAttribute:'data-gallery-action'})}<span>${index+1} / ${total}</span>${action('edit-photo','编辑照片信息','more')}</header><div class="gallery-viewer-stage"><img src="${escape(photo.data)}" alt="${escape(photo.name)}" draggable="false"></div><footer class="gallery-viewer-footer ${noteOpen?'is-open':''}"><button type="button" class="gallery-note-toggle" data-gallery-action="toggle-note" aria-expanded="${noteOpen}" aria-label="${noteOpen?'收起备注':'展开备注'}">${icon(noteOpen?'down':'up')}</button><strong>${escape(photo.name)}</strong><time datetime="${new Date(photo.time).toISOString()}">${dayLabel(photo.time)} · ${origin}</time><form class="gallery-note-form" ${noteOpen?'':'hidden'}><label><span class="sr-only">照片备注</span><textarea name="caption" maxlength="1000" placeholder="写下这一张的备注。">${escape(photo.caption)}</textarea></label><button type="submit" aria-label="保存备注">${icon('check')}</button></form><div class="gallery-viewer-nav">${action('previous-photo','上一张照片','back',index===0?'disabled':'')}${action('next-photo','下一张照片','back',`class="gallery-next" ${index===total-1?'disabled':''}`)}</div></footer>`;
}
