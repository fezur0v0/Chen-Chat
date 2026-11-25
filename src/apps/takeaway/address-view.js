import {escape as esc} from '../../ui.js';
import {takeawayIcon as icon} from './icons.js';
import {MAX_ADDRESSES, selectedAddress} from './model.js';

export function addressButton(data,label='收货地址'){
 const address=selectedAddress(data);
 return `<button type="button" class="addr" data-take-action="addr" aria-label="${label}，${esc(address.street)}">
  <span class="addr-pin">${icon('pin')}</span>
  <span class="addr-label"><small>${label}</small><b>${esc(address.street)}</b></span>
  ${icon('down')}
 </button>`;
}

function addressList(data){
 const rows=data.addresses.map(address=>{
  const active=address.id===data.addressId,id=esc(address.id),name=esc(address.name);
  return `<li class="address-card${active?' selected':''}">
   <button type="button" class="address-select" data-take-action="address-use" data-id="${id}" ${active?'aria-current="true"':''}>
    <b>${esc(address.street)}</b>
    <span>${name}${address.phone?' · '+esc(address.phone):''} ${active?'<em>默认</em>':''}</span>
   </button>
   <button type="button" class="address-icon" data-take-action="address-edit" data-id="${id}" aria-label="编辑 ${esc(address.street)}">${icon('edit')}</button>
   <button type="button" class="address-icon is-delete" data-take-action="address-delete" data-id="${id}" aria-label="删除 ${esc(address.street)}">${icon('delete')}</button>
  </li>`;
 }).join('');
 return `${rows?`<ul class="address-list">${rows}</ul>`:'<p class="address-hint">还没有保存地址，目前使用示例地址「延南洞 12-3」。</p>'}
  <button type="button" class="address-add" data-take-action="address-new" ${data.addresses.length>=MAX_ADDRESSES?'disabled':''}>
   ${icon('plus')}${data.addresses.length>=MAX_ADDRESSES?'已达到地址保存上限':'添加收货地址'}
  </button>
  <p class="address-hint">地址保存在 App 内，用于模拟配送。</p>`;
}

export function addressSheet(data,ui){
 const address=data.addresses.find(value=>value.id===ui.addressId);
 let title='收货地址',body;
 if(ui.addressPage==='edit'){
  title=address?'编辑收货地址':'添加收货地址';
  body=`<form class="address-form" data-take-address-form>
   <label>收货人<input name="name" maxlength="30" value="${esc(address?.name||'')}" placeholder="怎么称呼你" required></label>
   <label>联系电话（选填）<input name="phone" type="tel" maxlength="24" value="${esc(address?.phone||'')}" placeholder="填写联系电话"></label>
   <label>详细地址<textarea name="street" rows="2" maxlength="120" placeholder="街道、门牌号" required>${esc(address?.street||'')}</textarea></label>
   <div class="address-actions">
    <button type="button" data-take-action="address-list">取消</button>
    <button type="submit" class="address-primary">保存地址</button>
   </div>
  </form>`;
 }else if(ui.addressPage==='delete'&&address){
  title='删除收货地址？';
  body=`<p class="address-hint address-delete-note">${esc(address.street)}</p>
   <div class="address-actions"><button type="button" data-take-action="address-list">取消</button>
   <button type="button" class="address-danger" data-take-action="address-remove" data-id="${esc(address.id)}">删除</button></div>`;
 }else body=addressList(data);
 return `<section class="address-sheet">
  <header class="address-header">
   <h3 tabindex="-1">${title}</h3>
   <button type="button" class="address-icon" data-take-action="close" aria-label="关闭收货地址">${icon('close')}</button>
  </header>
  <div class="address-body">${body}</div>
 </section>`;
}
