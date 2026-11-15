import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,addDraftMessage,exportData} from '../src/store.js';
import {emptyGallery,normalizeGallery,saveAlbum,addUploadedPhotos,albumPhotos,photoGroups,copyPhotos,movePhotos,removeFromAlbum,reorderAlbums,deletePhotos,deleteAlbum,updatePhoto,favoritePhoto,saveChatPhoto,detachDiaryPhotoRefs,collection,GALLERY_COLLECTIONS,assignAppearanceImage} from '../src/apps/gallery/model.js';
const image='data:image/png;base64,aGVsbG8=';
const upload=(gallery,name='照片',albumId='',time=Date.now())=>addUploadedPhotos(gallery,[{data:image,name,time}],albumId)[0];

test('old states start with empty albums, without collecting avatars, wallpapers or chat images',()=>{
 const state=createState();delete state.gallery;state.appearance.wallpaper=image;state.appearance.userAvatar=image;
 addDraftMessage(state,'照片',[{id:'attachment',name:'旧聊天照片',data:image}]);
 assert.deepEqual(normalizeState(state).gallery,emptyGallery());
});
test('albums, edited captions, covers and dates survive a complete backup',()=>{
 const state=createState(),album=saveAlbum(state.gallery,{name:'我们的旅行',description:'海边的小事'});
 const photo=upload(state.gallery,'海',album.id,1000);
 saveAlbum(state.gallery,{...album,coverId:photo.id});updatePhoto(state.gallery,{id:photo.id,name:'那天的海',caption:'记得那阵风',time:2000});
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.deepEqual(restored.gallery,state.gallery);assert.equal(restored.gallery.albums[0].coverId,photo.id);
});
test('moving and deleting photos repair covers; deleting albums preserves their photos',()=>{
 const gallery=emptyGallery(),first=saveAlbum(gallery,{name:'一'}),second=saveAlbum(gallery,{name:'二'});
 const a=upload(gallery,'a',first.id),b=upload(gallery,'b',first.id);saveAlbum(gallery,{...first,coverId:a.id});
 movePhotos(gallery,[a.id],second.id);assert.equal(first.coverId,'');assert.equal(albumPhotos(gallery,first.id).length,1);
 saveAlbum(gallery,{...second,coverId:a.id});deletePhotos(gallery,[a.id]);assert.equal(second.coverId,'');
 deleteAlbum(gallery,first.id);assert.equal(gallery.photos[0].id,b.id);assert.equal(gallery.photos[0].albumId,'');
});
test('uploads reject invalid data and stale destination albums atomically',()=>{
 const gallery=emptyGallery();assert.throws(()=>addUploadedPhotos(gallery,[{data:image},{data:'https://example.com/photo.jpg'}]));assert.equal(gallery.photos.length,0);
 assert.throws(()=>upload(gallery,'无效相册','missing'));assert.equal(gallery.photos.length,0);
 assert.throws(()=>saveAlbum(gallery,{name:' '}));
});
test('photo timeline uses descending photo dates, with deterministic ties and day groups',()=>{
 const gallery=emptyGallery(),yesterday=new Date(2026,9,16,12).getTime(),today=new Date(2026,9,17,12).getTime();
 upload(gallery,'昨天','',yesterday);upload(gallery,'今天','',today);upload(gallery,'今天稍早','',today-1000);
 const ordered=albumPhotos(gallery);assert.deepEqual(ordered.map(p=>p.name),['今天','今天稍早','昨天']);assert.deepEqual(photoGroups(ordered).map(g=>g.photos.length),[2,1]);
 updatePhoto(gallery,{id:ordered[0].id,name:'改成昨天',caption:'',time:yesterday-1000});assert.equal(albumPhotos(gallery)[0].name,'今天稍早');
});
test('model photo saves accept only user photo attachments and are idempotent',()=>{
 const state=createState(),photoMessage=addDraftMessage(state,'分享照片',[{id:'photo',name:'我的照片',data:image}]);
 const request={sessionId:state.active,messageId:photoMessage.id,attachmentId:'photo',caption:'想替你留下'};
 const first=saveChatPhoto(state,request);assert.equal(first.created,true);assert.equal(first.photo.origin,'assistant');
 assert.equal(saveChatPhoto(state,request).created,false);assert.equal(state.gallery.photos.length,1);
 assert.equal(albumPhotos(state.gallery,'chat').length,1);assert.equal(albumPhotos(state.gallery,'uploads').length,0);
 photoMessage.role='assistant';assert.throws(()=>saveChatPhoto(state,request));photoMessage.role='user';photoMessage.attachments[0].kind='sticker';assert.throws(()=>saveChatPhoto(state,request));
 photoMessage.attachments[0].kind='file';photoMessage.attachments[0].data='https://example.com/photo.jpg';assert.throws(()=>saveChatPhoto(state,request));
 assert.throws(()=>saveChatPhoto(state,{...request,messageId:'missing'}));
});
test('AI-saved photos retain an independent snapshot when original chats disappear',()=>{
 const state=createState(),message=addDraftMessage(state,'',[{id:'photo',name:'照片',data:image}]);
 const {photo}=saveChatPhoto(state,{sessionId:state.active,messageId:message.id,attachmentId:'photo'});
 state.sessions[0].messages=[];const restored=normalizeState(JSON.parse(exportData(state)));
 assert.equal(restored.gallery.photos[0].data,image);assert.equal(restored.gallery.photos[0].source.messageId,message.id);
 deletePhotos(restored.gallery,[photo.id]);assert.equal(restored.gallery.photos.length,0);
});
test('gallery normalization filters unsafe images and duplicate IDs and repairs stale memberships',()=>{
 const normalized=normalizeGallery({albums:[{id:'album',name:'好'},{id:'album',name:'重复'},{id:'all',name:'内置冲突'}],photos:[{id:'p',data:image,albumId:'missing'},{id:'p',data:image},{id:'evil',data:'data:image/svg+xml;base64,aGVsbG8='},{id:'remote',data:'https://example.com/a.jpg'}]});
 assert.equal(normalized.albums.length,1);assert.equal(normalized.photos.length,1);assert.equal(normalized.photos[0].albumId,'');assert.deepEqual(normalized.photos[0].albumIds,[]);
});
test('legacy album membership becomes a list and keeps the original album id',()=>{
 const normalized=normalizeGallery({albums:[{id:'trip',name:'旅行'}],photos:[{id:'p',data:image,albumId:'trip',caption:'风'}]});
 assert.deepEqual(normalized.photos[0].albumIds,['trip']);assert.equal(normalized.photos[0].albumId,'trip');assert.equal(normalized.photos[0].caption,'风');
});
test('copy adds membership without duplicating the image, move replaces it, and remove keeps the photo',()=>{
 const state=createState(),first=saveAlbum(state.gallery,{name:'甲'}),second=saveAlbum(state.gallery,{name:'乙'});
 const photo=upload(state.gallery,'海',first.id,1000);
 copyPhotos(state.gallery,[photo.id],second.id);
 assert.equal(state.gallery.photos.length,1);assert.equal(state.gallery.photos[0].data,image);
 assert.deepEqual(photo.albumIds,[first.id,second.id]);assert.equal(photo.albumId,first.id);
 assert.equal(albumPhotos(state.gallery,first.id).length,1);assert.equal(albumPhotos(state.gallery,second.id).length,1);
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.deepEqual(restored.gallery.photos[0].albumIds,[first.id,second.id]);assert.equal(restored.gallery.photos[0].albumId,first.id);assert.equal(restored.gallery.photos[0].data,image);
 movePhotos(restored.gallery,[photo.id],second.id);assert.deepEqual(restored.gallery.photos[0].albumIds,[second.id]);assert.equal(restored.gallery.photos[0].albumId,second.id);assert.equal(albumPhotos(restored.gallery,first.id).length,0);
 removeFromAlbum(restored.gallery,[photo.id],second.id);assert.deepEqual(restored.gallery.photos[0].albumIds,[]);assert.equal(restored.gallery.photos.length,1);
 deletePhotos(restored.gallery,[photo.id]);assert.equal(restored.gallery.photos.length,0);
});
test('custom albums remember their order and diary photos stay in their own collection',()=>{
 const gallery=emptyGallery(),first=saveAlbum(gallery,{name:'先'}),second=saveAlbum(gallery,{name:'后'});
 reorderAlbums(gallery,[second.id,first.id]);assert.deepEqual(gallery.albums.map(album=>album.name),['后','先']);assert.deepEqual(gallery.albums.map(album=>album.order),[0,1]);
 const restored=normalizeGallery(JSON.parse(JSON.stringify(gallery)));assert.deepEqual(restored.albums.map(album=>album.id),[second.id,first.id]);
 const diary=normalizeGallery({photos:[{id:'page',data:image,origin:'diary',name:'一页'}]});
 assert.equal(diary.photos[0].origin,'diary');assert.equal(diary.photos[0].source,null);assert.equal(albumPhotos(diary,'diary').length,1);assert.equal(albumPhotos(diary,'uploads').length,0);assert.equal(albumPhotos(diary,'chat').length,0);
 assert.equal(collection(emptyGallery(),'diary').name,'日记');assert.equal(GALLERY_COLLECTIONS.includes('ledger'),false);
});
test('deleting photos clears reserved diary references and does not invent diary fields',()=>{
 const state=createState();state.gallery=normalizeGallery({photos:[{id:'page',data:image,origin:'diary'}]});
 state.diaryEntries=[{id:'entry',photoIds:['page','keep'],images:['page']}];
 detachDiaryPhotoRefs(state,['page']);deletePhotos(state.gallery,['page']);
 assert.deepEqual(state.diaryEntries[0].photoIds,['keep']);assert.deepEqual(state.diaryEntries[0].images,[]);assert.equal(state.gallery.photos.length,0);
 const plain=createState();plain.diaryEntries=[{id:'entry',content:'没有照片'}];detachDiaryPhotoRefs(plain,['page']);
 assert.equal(Object.hasOwn(plain.diaryEntries[0],'photoIds'),false);assert.equal(Object.hasOwn(plain.diaryEntries[0],'images'),false);
});
test('favorites persist through backup and missing flags stay off',()=>{
 const state=createState(),photo=upload(state.gallery,'窗');
 assert.equal(photo.favorite,false);favoritePhoto(state.gallery,photo.id,true);
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.equal(restored.gallery.photos[0].favorite,true);assert.equal(restored.gallery.photos[0].data,image);
 const legacy=normalizeGallery({photos:[{id:'old',data:image,albumId:''}]});
 assert.equal(legacy.photos[0].favorite,false);
});
test('copy and move do nothing until they are actually called, including a newly created album',()=>{
 const gallery=emptyGallery(),first=saveAlbum(gallery,{name:'甲'}),photo=upload(gallery,'海',first.id);
 const before=structuredClone(gallery.photos.map(item=>({id:item.id,data:item.data,albumIds:[...item.albumIds]})));
 assert.deepEqual(gallery.photos.map(item=>({id:item.id,data:item.data,albumIds:[...item.albumIds]})),before);
 const created=saveAlbum(gallery,{name:'新'});
 assert.equal(albumPhotos(gallery,created.id).length,0);assert.equal(gallery.photos.length,1);assert.equal(gallery.photos[0].data,image);
 copyPhotos(gallery,[photo.id],created.id);assert.deepEqual(photo.albumIds,[first.id,created.id]);assert.equal(gallery.photos.length,1);
 movePhotos(gallery,[photo.id],created.id);assert.deepEqual(photo.albumIds,[created.id]);assert.equal(photo.data,image);
 assert.throws(()=>copyPhotos(gallery,[photo.id],'all'));assert.throws(()=>movePhotos(gallery,[photo.id],'diary'));
 assert.deepEqual(photo.albumIds,[created.id]);
});
test('wallpaper and avatar writes change only the chosen target and keep the gallery photo',()=>{
 const state=createState(),photo=upload(state.gallery,'窗');
 assignAppearanceImage(state,'wallpaper',photo.data);
 assert.equal(state.appearance.wallpaper,photo.data);assert.equal(state.appearance.splashWallpaper,'');assert.equal(state.appearance.userAvatar,'');assert.equal(state.appearance.aiAvatar,'');
 assignAppearanceImage(state,'userAvatar',photo.data);
 assert.equal(state.appearance.userAvatar,photo.data);assert.equal(state.appearance.aiAvatar,'');assert.equal(state.appearance.wallpaper,photo.data);
 assignAppearanceImage(state,'splashWallpaper',photo.data);assert.equal(state.appearance.wallpaper,photo.data);assert.equal(state.gallery.photos[0].data,photo.data);
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.equal(restored.appearance.wallpaper,photo.data);assert.equal(restored.appearance.splashWallpaper,photo.data);assert.equal(restored.appearance.userAvatar,photo.data);assert.equal(restored.appearance.aiAvatar,'');
 assert.throws(()=>assignAppearanceImage(state,'both',photo.data));assert.equal(state.appearance.aiAvatar,'');
});
