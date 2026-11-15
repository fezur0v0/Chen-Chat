import {escape,backButton,field} from '../../ui.js';
import {icon} from '../../icons.js';
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
  return `<div class="gallery-capsule" role="toolbar" aria-label="已选 ${count} 张"><span class="sr-only" role="status">已选 ${count} 张</span>${capsule('add-to','添加到','folder-plus',count?'':'disabled')}${capsule('remove-from-album','从相册移除','folder-minus',count&&inAlbum?'':'disabled')}${capsule('delete-photos','彻底删除','trash',count?'':'disabled')}</div>`;
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
const originLabel=photo=>photo.origin==='diary'?'日记':photo.origin==='assistant'?'对话珍藏':'我上传的';
const clockLabel=time=>{const d=new Date(time);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
const localDateValue=time=>{const d=new Date(time);return new Date(time-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export function galleryAlbumForm(state,item){
 const data=state.gallery,photos=item?.id?albumPhotos(data,item.id):[];
 return `<form class="gallery-form" id="gallery-album-form"><h2>${item?.id?'编辑相册':'新建相册'}</h2><p class="gallery-form-error" role="alert" hidden></p><input type="hidden" name="id" value="${escape(item?.id||'')}">${field('相册名称','name',item?.name||'','例如：一起走过的地方')}<label class="field"><span>相册描述</span><textarea name="description" rows="3" maxlength="500" placeholder="给这些画面留一句话。">${escape(item?.description||'')}</textarea></label>${photos.length?`<fieldset class="gallery-cover-picker"><legend>相册封面</legend><label class="gallery-cover-auto"><input type="radio" name="coverId" value="" ${!item.coverId?'checked':''}>自动使用最新照片</label><div>${photos.map(photo=>`<label class="gallery-cover-choice"><input type="radio" name="coverId" value="${escape(photo.id)}" ${photo.id===item.coverId?'checked':''}><img src="${escape(photo.data)}" alt="使用 ${escape(photo.name)} 作为封面" loading="lazy"></label>`).join('')}</div></fieldset>`:''}<div class="gallery-form-actions">${item?.id?`<button type="button" class="gallery-danger" data-gallery-action="delete-album" data-id="${escape(item.id)}">删除相册</button>`:''}<button type="button" data-gallery-action="close-popup">取消</button><button type="submit">保存</button></div></form>`;
}
export function galleryConfirm({title,body,confirmAction,confirmLabel,id=''}){
 return `<div class="gallery-confirm"><h2>${escape(title)}</h2><p>${escape(body)}</p><div class="gallery-form-actions"><button type="button" data-gallery-action="close-popup">取消</button><button type="button" class="gallery-danger-fill" data-gallery-action="${escape(confirmAction)}" data-id="${escape(id)}">${escape(confirmLabel)}</button></div></div>`;
}
export function photoDetail(photo){
 return `<form class="gallery-detail-form"><p class="gallery-form-error" role="alert" hidden></p><label class="gallery-detail-name"><span>名称</span><input name="name" maxlength="180" value="${escape(photo.name)}"></label><label class="gallery-detail-caption"><span>备注</span><textarea name="caption" maxlength="1000" placeholder="写下这一张的备注。">${escape(photo.caption)}</textarea></label><div class="gallery-detail-meta"><label><span>时间</span><input name="date" type="datetime-local" required min="0001-01-01T00:00" max="9999-12-31T23:59" value="${localDateValue(photo.time)}"></label><span>${originLabel(photo)}</span></div><div class="gallery-form-actions"><button type="button" data-gallery-action="close-detail">取消</button><button type="submit">保存</button></div></form>`;
}
export function addPicker(gallery){
 const cards=gallery.albums.map(album=>{
  const photos=albumPhotos(gallery,album.id),cover=photos.find(p=>p.id===album.coverId)||photos[0];
  return `<button type="button" class="gallery-add-card" data-gallery-action="choose-album" data-id="${escape(album.id)}" aria-label="选择相册 ${escape(album.name)}，${photos.length} 张"><span class="gallery-album-cover ${cover?'':'is-empty'}">${cover?`<img src="${escape(cover.data)}" alt="" loading="lazy">`:icon('folder')}</span><strong>${escape(album.name)}</strong><small>${photos.length} 张</small></button>`;
 }).join('');
 return `<header class="gallery-picker-bar">${action('close-picker','返回','back')}<h2>添加到</h2><button type="button" data-gallery-action="close-picker">取消</button></header><button type="button" class="gallery-new-album" data-gallery-action="create-target">${icon('plus')}新建相册</button>${cards?`<div class="gallery-add-grid">${cards}</div>`:'<p class="gallery-footnote">还没有可添加的自建相册。</p>'}`;
}
export function addChoice(album){
 return `<div class="gallery-choice"><h2>选择添加方式</h2><p>「${escape(album.name)}」<br>确认前不会改动照片所属相册。</p><button type="button" data-gallery-action="confirm-copy">复制</button><button type="button" data-gallery-action="confirm-move">移动</button><button type="button" data-gallery-action="close-popup">取消</button></div>`;
}
export function wallpaperChoice(){
 return `<div class="gallery-choice"><h2>设为壁纸</h2><p>主页和开屏各自独立，只会改你点的那一项。</p><button type="button" data-gallery-action="apply-appearance" data-key="wallpaper">主页壁纸</button><button type="button" data-gallery-action="apply-appearance" data-key="splashWallpaper">开屏壁纸</button><button type="button" data-gallery-action="close-popup">取消</button></div>`;
}
export function avatarChoice(state){
 const user=state.home?.userName||'我',ai=state.persona?.name||'AI';
 return `<div class="gallery-choice"><h2>设为头像</h2><p>只替换选中的一个头像。</p><button type="button" data-gallery-action="apply-appearance" data-key="userAvatar">${escape(user)} 的头像</button><button type="button" data-gallery-action="apply-appearance" data-key="aiAvatar">${escape(ai)} 的头像</button><button type="button" data-gallery-action="close-popup">取消</button></div>`;
}
export function galleryViewer(photos,index){
 const photo=photos[index],when=dayLabel(photo.time);
 return `<header class="gallery-viewer-header">${action('close-viewer','返回','back')}<div class="gallery-viewer-when"><strong>${when}</strong><small>${clockLabel(photo.time)}</small></div>${action('favorite',photo.favorite?'取消收藏':'收藏','heart',`aria-pressed="${photo.favorite===true}" class="${photo.favorite?'is-on':''}"`)}${action('info','照片详情','info')}</header><div class="gallery-viewer-stage"><img data-id="${escape(photo.id)}" src="${escape(photo.data)}" alt="${escape(photo.name)}" draggable="false"></div><div class="gallery-filmstrip" role="listbox" aria-label="照片胶片">${photos.map((item,itemIndex)=>`<button type="button" class="gallery-film ${itemIndex===index?'is-current':''}" data-gallery-action="film" data-index="${itemIndex}" data-id="${escape(item.id)}" role="option" aria-selected="${itemIndex===index}" aria-label="${escape(item.name)}"><img src="${escape(item.data)}" alt="" draggable="false"></button>`).join('')}</div><div class="gallery-capsule gallery-viewer-capsule" role="toolbar" aria-label="照片操作">${capsule('delete-current','删除这张照片','trash')}${capsule('more','更多','more')}</div><div class="gallery-more" hidden><button type="button" data-gallery-action="set-wallpaper">设为壁纸</button><button type="button" data-gallery-action="set-avatar">设为头像</button><button type="button" data-gallery-action="add-to">添加到</button></div>`;
}
