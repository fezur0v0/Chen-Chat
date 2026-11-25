import {avatar,escape as esc} from '../../ui.js';
import {appIcon} from '../icons.js';
import {takeawayIcon as icon} from '../takeaway/icons.js';
import {products} from './catalog.js';
import {findProduct,selectedLines,total} from './model.js';

export const titles={home:'尘选',cart:'购物车',me:'我的'};
const action=(name,value='')=>`data-shop-action="${name}" data-value="${esc(String(value))}"`;
const image=p=>`<img src="./assets/shopping/${p.img}.jpg" alt="${esc(p.alt)}" style="object-position:${p.pos}" loading="lazy">`;
const card=p=>`<button class="shop-tile" ${action('product',p.id)}>${image(p)}<strong>${esc(p.name)}</strong><small>${esc(p.material)}</small><b>¥${p.price}</b></button>`;
export function productGrid(ui){
 const term=ui.query.trim().toLowerCase();
 const list=products.filter(p=>(ui.category==='全部'||p.cat===ui.category)&&[p.name,p.material,p.cat,p.blurb].join(' ').toLowerCase().includes(term));
 return list.map(card).join('')||'<p class="hint">没有找到匹配的商品。</p>';
}
export function homeView(ui){
 const categories=['全部',...new Set(products.map(p=>p.cat))];
 return `<label class="search">${icon('search')}<input type="search" data-shop-search placeholder="搜索商品或材质" aria-label="搜索商品或材质" value="${esc(ui.query)}"></label>
 <button class="shop-hero" data-shop-action="product" data-value="ceramic" aria-label="本周器物，查看雾白杯组"><img src="./assets/shopping/hero.jpg" alt=""><strong>本周器物</strong></button>
 <div class="shop-options" aria-label="商品分类">${categories.map(c=>`<button ${action('category',c)} aria-pressed="${ui.category===c}">${esc(c)}</button>`).join('')}</div>
 <div class="shop-grid">${productGrid(ui)}</div>`;
}
export function detailView(p,ui){
 return `<div class="shop-detail">${image(p)}<h2>${esc(p.name)}</h2><small>${esc(p.material)}</small><b>¥${p.price}</b><p>${esc(p.blurb)}</p>
 <h3>${esc(p.options.name)}</h3><div class="shop-options">${p.options.values.map(v=>`<button ${action('option',v)} aria-pressed="${ui.option===v}">${esc(v)}</button>`).join('')}</div>
 <p>${esc(p.story)}</p><details><summary>商品规格</summary><dl>${p.specs.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></details></div>`;
}
export function dockView(ui){
 return Object.entries(titles).map(([key,title])=>`<button ${action('tab',key)} aria-label="${title}" ${key===ui.tab?'aria-current="page"':''}><span class="dock-icon">${key==='cart'?appIcon('shopping'):icon(key==='home'?'home':'me')}</span></button>`).join('');
}
export function cartView(data){
 if(!data.cart.length)return '<div class="shop-empty"><p>购物车是空的</p><button class="shop-primary" data-shop-action="browse">去逛逛</button></div>';
 return `<label class="shop-select"><input type="checkbox" ${action('all')} ${data.cart.every(i=>i.checked)?'checked':''}>全选</label>${data.cart.map((line,i)=>{
  const p=findProduct(line.id);
  return `<article class="shop-line"><input type="checkbox" ${action('select',i)} aria-label="选择${esc(p.name+line.option)}" ${line.checked?'checked':''}>
  <button class="shop-thumb" ${action('product',p.id)} aria-label="${esc(p.name)}">${image(p)}</button>
  <div><strong>${esc(p.name)}</strong><small>${esc(line.option)} · ¥${p.price}</small>
  <div class="shop-quantity"><button ${action('minus',i)} aria-label="减少数量" ${line.qty===1?'disabled':''}>${icon('minus')}</button><span>${line.qty}</span><button ${action('plus',i)} aria-label="增加数量" ${line.qty===99?'disabled':''}>${icon('plus')}</button></div></div>
  <button class="shop-icon" ${action('remove',i)} aria-label="移除${esc(p.name)}">${icon('delete')}</button></article>`;
 }).join('')}`;
}
export function profileView(state){
 const data=state.shopping;
 return `<div class="me">${avatar(state,'user')}<b>${esc(state.home.userName)}</b></div><h2 class="shop-heading">收藏</h2>
 ${data.favorites.length?`<div class="shop-grid">${data.favorites.map(id=>card(findProduct(id))).join('')}</div>`:'<p class="hint">还没有收藏的商品。</p>'}
 <h2 class="shop-heading" id="shopping-orders" tabindex="-1">我的订单</h2>${data.orders.map(order=>`<article class="shop-order"><small>${esc(new Date(order.at).toLocaleDateString())} · 模拟订单</small>${order.items.map(i=>`<p>${esc(i.name)} · ${esc(i.option)} × ${i.qty}</p>`).join('')}<b>¥${total(order.items)}</b></article>`).join('')||'<p class="hint">还没有订单。</p>'}
 <button class="shop-reset" ${action('ask-reset')}>重置购物数据</button>`;
}
export function barView(ui,data){
 if(ui.productId){
  const saved=data.favorites.includes(ui.productId);
  return `<button class="shop-icon" ${action('favorite')} aria-label="收藏商品" aria-pressed="${saved}">${icon('heart')}</button><button class="shop-icon" ${action('tab','cart')} aria-label="查看购物车">${appIcon('shopping')}</button><button class="shop-primary" ${action('add')}>加入购物车</button>`;
 }
 if(ui.tab==='cart'&&data.cart.length){
  const selected=selectedLines(data);
  return `<strong>合计 ¥${total(selected)}</strong><button class="shop-primary" ${action('checkout')} ${selected.length?'':'disabled'}>结算</button>`;
 }
 return '';
}
export function sheetView(layer,data){
 const confirm=layer==='checkout',done=layer==='done';
 const title=confirm?'模拟结算':done?'订单已保存':'重置购物数据';
 const content=confirm?selectedLines(data).map(i=>`<p>${esc(findProduct(i.id).name)} · ${esc(i.option)} × ${i.qty}</p>`).join('')+`<b>合计 ¥${total(selectedLines(data))}</b><p class="hint">仅在本机记录订单，无需付款。</p>`:done?'':'<p>将清空购物车、收藏和购物订单。</p>';
 return `<div class="panel"><h3 id="shopping-sheet-title">${title}</h3>${content}<div class="shop-sheet-buttons"><button ${action('close')}>${done?'关闭':'取消'}</button><button class="shop-primary" ${action(confirm?'confirm':done?'orders':'reset')}>${confirm?'确认下单':done?'查看订单':'确认重置'}</button></div></div>`;
}
