const text=(value,max)=>typeof value==='string'?value.slice(0,max):'';
const image=value=>typeof value==='string'&&value.length<1200000&&/^data:image\/(jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(value)?value:'';
const date=value=>Number.isFinite(value)&&Math.abs(value)<=8640000000000000?value:Date.now();
export const GALLERY_COLLECTIONS=['all','uploads','chat','diary'];
export const emptyGallery=()=>({albums:[],photos:[]});
function memberships(item,albums){
 const raw=Array.isArray(item?.albumIds)?item.albumIds:item?.albumId?[item.albumId]:[];
 const ids=[];
 for(const value of [...raw,...(item?.albumId?[item.albumId]:[])]){
  const id=text(value,100);
  if(!id||!albums.has(id)||ids.includes(id))continue;
  ids.push(id);
 }
 return ids;
}
function syncMembership(photo){photo.albumId=photo.albumIds[0]||'';}
function inAlbum(photo,id){return Array.isArray(photo.albumIds)&&photo.albumIds.includes(id);}
export function normalizeGallery(value){
 const gallery=emptyGallery(),albumIds=new Set(),photoIds=new Set();
 let index=0;
 for(const item of Array.isArray(value?.albums)?value.albums:[]){
  const id=text(item?.id,100);if(!id||GALLERY_COLLECTIONS.includes(id)||albumIds.has(id))continue;
  albumIds.add(id);
  const order=Number.isFinite(item.order)?item.order:index;
  gallery.albums.push({id,name:text(item.name,60).trim()||'未命名相册',description:text(item.description,500),coverId:text(item.coverId,100),created:date(item.created),order});
  index++;
 }
 gallery.albums.sort((a,b)=>a.order-b.order||a.created-b.created||a.id.localeCompare(b.id));
 gallery.albums.forEach((album,order)=>{album.order=order;});
 for(const item of Array.isArray(value?.photos)?value.photos:[]){
  const id=text(item?.id,100),data=image(item?.data);if(!id||photoIds.has(id)||!data)continue;
  photoIds.add(id);
  const origin=item.origin==='assistant'?'assistant':item.origin==='diary'?'diary':'upload';
  const source=origin==='assistant'?{sessionId:text(item.source?.sessionId,100),messageId:text(item.source?.messageId,100),attachmentId:text(item.source?.attachmentId,100)}:null;
  const photo={id,data,name:text(item.name,180)||'照片',caption:text(item.caption,1000),time:date(item.time),addedAt:date(item.addedAt),albumId:'',albumIds:memberships(item,albumIds),origin,source};
  syncMembership(photo);gallery.photos.push(photo);
 }
 cleanCovers(gallery);
 return gallery;
}
export function collection(gallery,id='all'){
 const builtins={all:{id:'all',name:'所有照片',description:'把喜欢的瞬间，慢慢留下。'},uploads:{id:'uploads',name:'我上传的',description:'由你亲手放进相册的画面。'},chat:{id:'chat',name:'对话珍藏',description:'对话中，AI 想替你留下的照片。'},diary:{id:'diary',name:'日记',description:'从日记里留下来的画面。'}};
 return Object.hasOwn(builtins,id)?builtins[id]:gallery.albums.find(a=>a.id===id);
}
export function albumPhotos(gallery,id='all'){
 return gallery.photos.filter(p=>id==='all'||id==='uploads'&&p.origin==='upload'||id==='chat'&&p.origin==='assistant'||id==='diary'&&p.origin==='diary'||!GALLERY_COLLECTIONS.includes(id)&&inAlbum(p,id)).sort((a,b)=>b.time-a.time||b.addedAt-a.addedAt||a.id.localeCompare(b.id));
}
export function photoDay(time){const d=new Date(time);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function photoGroups(photos){
 const groups=[];for(const photo of photos){const day=photoDay(photo.time);if(groups.at(-1)?.day!==day)groups.push({day,photos:[]});groups.at(-1).photos.push(photo);}return groups;
}
export function saveAlbum(gallery,input){
 const name=text(input.name,60).trim();if(!name)throw new Error('给相册起一个名字吧。');
 const existing=gallery.albums.find(a=>a.id===input.id);
 if(input.id&&!existing)throw new Error('这个相册已不存在。');
 const order=existing?existing.order:gallery.albums.reduce((max,album)=>Math.max(max,album.order),-1)+1;
 const album={id:existing?.id||crypto.randomUUID(),name,description:text(input.description,500).trim(),created:existing?.created??Date.now(),coverId:existing&&gallery.photos.some(p=>p.id===input.coverId&&inAlbum(p,existing.id))?input.coverId:'',order};
 if(existing)Object.assign(existing,album);else gallery.albums.push(album);return existing||album;
}
function targetAlbum(gallery,id){if(id&&!gallery.albums.some(a=>a.id===id))throw new Error('目标相册已不存在。');return id||'';}
function photoRecord(item,target,origin,source=null){
 const data=image(item.data);if(!data)throw new Error('照片格式无法保存，请选择 JPG、PNG 或 WebP 图片。');
 const albumIds=target?[target]:[];
 return {id:crypto.randomUUID(),data,name:text(item.name,180)||'照片',caption:text(item.caption,1000),time:date(item.time),addedAt:Date.now(),albumId:albumIds[0]||'',albumIds,origin,source};
}
export function addUploadedPhotos(gallery,items,albumId=''){
 const target=targetAlbum(gallery,albumId);if(!items.length)throw new Error('请先选择照片。');
 const photos=items.map(item=>photoRecord(item,target,'upload'));gallery.photos.push(...photos);return photos;
}
export function copyPhotos(gallery,ids,albumId){
 const target=targetAlbum(gallery,albumId);if(!target)throw new Error('请选择一个相册。');
 const selected=new Set(ids);
 for(const photo of gallery.photos)if(selected.has(photo.id)&&!photo.albumIds.includes(target)){photo.albumIds.push(target);syncMembership(photo);}
}
export function movePhotos(gallery,ids,albumId=''){
 const target=targetAlbum(gallery,albumId),selected=new Set(ids);
 for(const photo of gallery.photos)if(selected.has(photo.id)){photo.albumIds=target?[target]:[];syncMembership(photo);}
 cleanCovers(gallery);
}
export function removeFromAlbum(gallery,ids,albumId){
 if(!gallery.albums.some(a=>a.id===albumId))throw new Error('这个相册已不存在。');
 const selected=new Set(ids);
 for(const photo of gallery.photos)if(selected.has(photo.id)){photo.albumIds=photo.albumIds.filter(id=>id!==albumId);syncMembership(photo);}
 cleanCovers(gallery);
}
export function reorderAlbums(gallery,ids){
 const rank=new Map(ids.map((id,index)=>[id,index]));
 gallery.albums.sort((a,b)=>(rank.has(a.id)?rank.get(a.id):gallery.albums.length+a.order)-(rank.has(b.id)?rank.get(b.id):gallery.albums.length+b.order));
 gallery.albums.forEach((album,order)=>{album.order=order;});
}
function cleanCovers(gallery){for(const album of gallery.albums)if(!gallery.photos.some(p=>p.id===album.coverId&&inAlbum(p,album.id)))album.coverId='';}
export function deletePhotos(gallery,ids){const selected=new Set(ids);gallery.photos=gallery.photos.filter(p=>!selected.has(p.id));cleanCovers(gallery);}
// Diary entries do not store photos yet. This only clears a future reference
// if one is already present, and never creates a photo field on the diary.
export function detachDiaryPhotoRefs(state,ids){
 const drop=new Set(ids);
 for(const entry of Array.isArray(state?.diaryEntries)?state.diaryEntries:[]){
  if(Array.isArray(entry?.photoIds))entry.photoIds=entry.photoIds.filter(id=>!drop.has(id));
  if(Array.isArray(entry?.images))entry.images=entry.images.filter(id=>!drop.has(id));
 }
}
export function deleteAlbum(gallery,id){
 if(!gallery.albums.some(a=>a.id===id))throw new Error('这个相册已不存在。');
 gallery.albums=gallery.albums.filter(a=>a.id!==id);
 for(const photo of gallery.photos)if(photo.albumIds.includes(id)){photo.albumIds=photo.albumIds.filter(album=>album!==id);syncMembership(photo);}
 gallery.albums.forEach((album,order)=>{album.order=order;});
 cleanCovers(gallery);
}
export function updatePhoto(gallery,input){
 const photo=gallery.photos.find(p=>p.id===input.id);if(!photo)throw new Error('这张照片已不存在。');
 if(!Number.isFinite(input.time)||Math.abs(input.time)>8640000000000000)throw new Error('请选择有效的照片日期。');
 Object.assign(photo,{name:text(input.name,180).trim()||'照片',caption:text(input.caption,1000).trim(),time:input.time});return photo;
}
// The model may request a save only for an existing user photo, never a sticker,
// wallpaper, avatar, generated image, or arbitrary URL. Saves are idempotent.
export function saveChatPhoto(state,input){
 const session=state.sessions.find(s=>s.id===input.sessionId),message=session?.messages.find(m=>m.id===input.messageId);
 const attachment=message?.attachments?.find(a=>a.id===input.attachmentId);
 if(message?.role!=='user'||!attachment||attachment.kind==='sticker'||attachment.kind==='voice'||!image(attachment.data))throw new Error('只能珍藏你在对话中发出的照片。');
 const duplicate=state.gallery.photos.find(p=>p.source?.sessionId===session.id&&p.source.messageId===message.id&&p.source.attachmentId===attachment.id);
 if(duplicate)return {photo:duplicate,created:false};
 const albumId=targetAlbum(state.gallery,input.albumId);
 const photo=photoRecord({data:attachment.data,name:text(input.name,180).trim()||attachment.name||'对话照片',caption:text(input.caption,1000).trim(),time:date(message.time)},albumId,'assistant',{sessionId:session.id,messageId:message.id,attachmentId:attachment.id});
 state.gallery.photos.push(photo);return {photo,created:true};
}
