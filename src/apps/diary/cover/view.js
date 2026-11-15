import {escape,backButton} from '../../../ui.js';
import {icon} from '../../../icons.js';
import {drawerHeader} from '../../../drawer.js';
import {DIARY_OWNERS,diaryOwner,diaryRole,normalizeDiaryCover} from './model.js';

export function diaryHeader(state,ui={}){
 const owner=diaryOwner(ui.owner),cover=ui.screen==='cover',profile=normalizeDiaryCover(state.diaryCover)[owner];
 return `<header class="desktop-app-header app-topbar">${cover?backButton('home','返回桌面'):backButton('back','返回日记封面',{actionAttribute:'data-diary-cover-action'})}<h1 tabindex="-1">${escape(cover?'日记':profile.name||diaryRole(owner))}</h1><button type="button" class="dc-config" data-diary-cover-action="edit" aria-label="编辑日记封面">${icon('edit')}</button></header>`;
}
export function diaryCover(state,ui={}){
 const profiles=normalizeDiaryCover(state.diaryCover);
 return `<div class="diary-cover"><div class="dc-stage" aria-label="选择日记入口">${DIARY_OWNERS.map(owner=>{
  const p=profiles[owner],selected=ui.coverSelected===owner,role=diaryRole(owner);
  return `<button type="button" class="dc-entry dc-${owner} ${selected?'is-selected':''}" data-diary-cover-action="select" data-owner="${owner}" aria-pressed="${selected}" aria-label="${escape(p.name||role)}，${selected?'再次轻触进入':'轻触选中'}">
   <span class="dc-dot-patch dc-material dc-material-dots" aria-hidden="true"></span><span class="dc-back-paper" aria-hidden="true"></span>
   <span class="dc-profile"><span class="dc-profile-body"><span class="dc-profile-head">${p.avatar?`<img class="dc-avatar" alt="" src="${escape(p.avatar)}">`:'<span class="dc-avatar dc-empty-avatar" aria-hidden="true"></span>'}<span class="dc-profile-title"><span class="dc-name ${p.name?'':'is-empty'}">${escape(p.name||role)}</span></span></span><span class="dc-sign">${escape(p.signature)}</span></span></span>
   <span class="dc-tape" aria-hidden="true"></span><span class="dc-bow dc-material dc-material-bow" aria-hidden="true"></span>
   <span class="dc-portrait">${p.portrait?`<img alt="" src="${escape(p.portrait)}" draggable="false">`:`<span class="dc-empty-portrait" aria-hidden="true"><span>${icon('plus')}</span><small>立绘留白</small></span>`}</span>
   <span class="dc-flower dc-material dc-material-flower" aria-hidden="true"></span><span class="dc-star dc-material dc-material-sparkle" aria-hidden="true"></span>
   <span class="dc-caption">${selected?'再轻触，翻开日记':role}<span aria-hidden="true">↗</span></span>
   <span class="dc-fx" aria-hidden="true">${Array.from({length:4},()=>`<i class="dc-material dc-material-${owner==='self'?'flower':'sparkle'}"></i>`).join('')}</span>
  </button>`;
 }).join('')}</div></div>`;
}
export function coverEditor(draft,owner='self'){
 const selected=diaryOwner(owner),p=draft[selected];
 return `${drawerHeader({title:'编辑日记封面',action:'cancel',actionAttribute:'data-diary-cover-action'})}<div class="drawer-scroll dc-editor-scroll"><form id="diary-cover-form"><p class="dc-error" role="alert" hidden></p><div class="dc-owner-tabs" role="group" aria-label="选择要编辑的封面">${DIARY_OWNERS.map(id=>`<button type="button" data-diary-cover-action="owner" data-owner="${id}" aria-pressed="${id===selected}">${diaryRole(id)}</button>`).join('')}</div><label class="field"><span>名称</span><input name="cover-name" maxlength="40" autocomplete="off" placeholder="留空也可以" value="${escape(p.name)}"></label><label class="field"><span>个性签名</span><textarea name="cover-signature" maxlength="160" rows="3" placeholder="写一句属于自己的话，也可以留白">${escape(p.signature)}</textarea></label>${['avatar','portrait'].map(kind=>`<section class="dc-image-field"><span>${kind==='avatar'?'头像':'立绘'}${kind==='portrait'?'<small>PNG / WebP 可保留透明背景</small>':''}</span><div class="dc-image-row"><div class="dc-image-preview ${kind}">${p[kind]?`<img src="${escape(p[kind])}" alt="${kind==='avatar'?'头像':'立绘'}预览">`:'<span aria-hidden="true">＋</span>'}</div><label class="upload-label">选择图片<input type="file" accept="image/png,image/jpeg,image/webp" data-cover-upload="${kind}" class="sr-only"></label><button type="button" class="dc-clear-image" data-diary-cover-action="clear" data-kind="${kind}" ${p[kind]?'':'disabled'}>清空</button></div></section>`).join('')}</form></div><footer class="dc-editor-footer"><button type="button" class="secondary touch-ripple-button" data-diary-cover-action="cancel">取消</button><button type="submit" form="diary-cover-form" class="primary touch-ripple-button">保存</button></footer>`;
}
