import {backButton,escape} from '../../ui.js';
import {takeawayIcon as icon} from './icons.js';
import {STATUSES} from './catalog.js';
import {
 addToCart,changeQuantity,emptyTakeaway,findItem,findStore,MAX_ADDRESSES,MAX_ORDERS,
 recipeDraft,removeAddress,saveAddress,submitOrder
} from './model.js';
import {takeawayView} from './view.js';

const home = () => ({tab:'food',route:'list',storeId:null,orderId:null,returnTab:'food',
 query:'',cuisine:'全部',sort:'mix',orderTab:'all',layer:null,addressPage:'list',addressId:'',orderNote:''});
const tabTitles = {food:'外卖',orders:'订单',me:'我的'};
const layerTitles = {addr:'收货地址',cart:'购物袋',spec:'规格和备注',switch:'更换购物袋',reset:'重置外卖数据'};

export function createTakeawayApp({app,getState,persist,notify}){
 const root=document.createElement('div');
 root.className='takeaway-surface';
 root.innerHTML='<header class="desktop-app-header app-topbar"></header><div class="takeaway-scroll"></div><nav class="dock" aria-label="外卖导航"></nav><div class="cartbar"></div><dialog class="takeaway-dialog"></dialog>';
 const header=root.querySelector('header'),scroller=root.querySelector('.takeaway-scroll');
 const dock=root.querySelector('.dock'),bag=root.querySelector('.cartbar'),dialog=root.querySelector('dialog');
 let ui=home(),draft=null,pending=null,opener=null;
 const data=()=>getState().takeaway;
 const views=()=>takeawayView({state:getState(),ui,draft,pending:pending?.storeId});

 function sizeAddressSheet(){
  if(ui.layer!=='addr')return;
  const viewport=window.visualViewport;
  if(!viewport)return;
  const bottom=Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop);
  dialog.style.setProperty('--address-keyboard',`${bottom}px`);
  dialog.style.setProperty('--address-viewport',`${viewport.height}px`);
 }
 window.visualViewport?.addEventListener('resize',sizeAddressSheet);
 window.visualViewport?.addEventListener('scroll',sizeAddressSheet);

 function commit(change){
  const state=getState(),previous=structuredClone(state.takeaway);
  const result=change(state.takeaway);
  if(!result)return result;
  if(persist())return result;
  state.takeaway=previous;
  return null;
 }

 function drawLayer(){
  if(!ui.layer){
   if(dialog.open)dialog.close();
   if(opener?.isConnected)opener.focus({preventScroll:true});
   opener=null;
   return;
  }
  const address=ui.layer==='addr';
  dialog.classList.toggle('is-centered',['switch','reset'].includes(ui.layer));
  dialog.classList.toggle('is-address',address);
  if(address)sizeAddressSheet();
  dialog.setAttribute('aria-label',layerTitles[ui.layer]);
  const content=views().layers();
  if(!content)return;
  const temp=document.createElement('template');
  temp.innerHTML=content;
  if(!address)temp.content.firstElementChild?.insertAdjacentHTML('afterbegin',
   '<button type="button" class="takeaway-close" data-take-action="close" aria-label="关闭">'+icon('close')+'</button>');
  const next=temp.content.firstElementChild;
  const panel=dialog.firstElementChild;
  if(dialog.open && address){
   dialog.replaceChildren(next);
   next.querySelector('h3')?.focus({preventScroll:true});
  }else if(dialog.open && panel){
   const scroll=panel.scrollTop,focus=document.activeElement;
   const key=focus instanceof HTMLButtonElement ? {...focus.dataset} : null;
   panel.replaceChildren(...next.childNodes);
   panel.scrollTop=scroll;
   if(key)Array.from(panel.querySelectorAll('button')).find(button =>
    Object.entries(key).every(([name,value])=>button.dataset[name]===value))?.focus({preventScroll:true});
  }else{
   dialog.replaceChildren(next);
   opener=document.activeElement;
   dialog.showModal();
  }
 }

 function paint(resetScroll=false){
  const current=views(),store=findStore(ui.storeId),y=scroller.scrollTop;
  const title={store:store?.name,checkout:'确认订单',success:'模拟订单',delivery:'配送详情'}[ui.route]||tabTitles[ui.tab];
  const back=ui.route==='list'&&ui.tab==='food'
   ?backButton('home','返回桌面')
   :backButton('back','返回上一级',{actionAttribute:'data-take-action'});
  header.innerHTML=back+'<h1 tabindex="-1">'+escape(title)+'</h1>'+
   (ui.route==='store'&&store?current.heart(store.id):'<span aria-hidden="true"></span>');
  root.classList.toggle('in-store',ui.route==='store');
  root.classList.toggle('no-dock',ui.route!=='list');
  root.classList.toggle('orders-list',ui.route==='list'&&ui.tab==='orders');
  scroller.innerHTML=current.view();
  dock.innerHTML=current.dock();
  bag.innerHTML=current.cartbar();
  scroller.scrollTop=resetScroll?0:y;
  drawLayer();
  if(resetScroll&&!dialog.open&&root.isConnected)header.querySelector('h1').focus({preventScroll:true});
 }

 function closeLayer(){
  ui.layer=null;
  ui.addressPage='list';
  ui.addressId='';
  pending=null;
  draft=null;
  drawLayer();
 }

 function showLayer(layer){
  ui.layer=layer;
  drawLayer();
 }

 function showAddressPage(page,id=''){
  ui.addressPage=page;
  ui.addressId=id;
  drawLayer();
 }

 function backLayer(){
  if(ui.layer==='addr'&&ui.addressPage!=='list')showAddressPage('list');
  else closeLayer();
 }

 function updateAddress(change,close=false){
  if(!commit(change))return;
  if(close)closeLayer();
  else{
   ui.addressPage='list';
   ui.addressId='';
  }
  paint();
  const trigger=scroller.querySelector('[data-take-action=addr]');
  if(close)trigger?.focus({preventScroll:true});
  else opener=trigger;
 }

 function showList(tab){
  closeLayer();
  ui.tab=tab;
  ui.route='list';
  ui.returnTab=tab;
  paint(true);
 }

 function showStore(storeId,returnTab){
  closeLayer();
  ui.tab='food';
  ui.route='store';
  ui.storeId=storeId;
  ui.returnTab=returnTab;
  ui.orderNote=data().cart?.note||'';
  paint(true);
 }

 function openStore(storeId,returnTab='food',order=null){
  if(!findStore(storeId))return;
  const cart=data().cart;
  if(cart && (cart.storeId!==storeId || order)){
   pending={storeId,returnTab,order};
   showLayer('switch');
   return;
  }
  if(order && !commit(state=>replaceCart(state,order)))return;
  showStore(storeId,returnTab);
 }

 function replaceCart(state,order){
  state.cart=order ? {storeId:order.storeId,lines:order.lines.map(line=>({...line})),note:order.note} : null;
  return true;
 }

 function back(){
  if(ui.layer){backLayer();return;}
  if(ui.route==='checkout'){ui.route='store';paint(true);return;}
  if(ui.route==='store'){showList(ui.returnTab);return;}
  showList(ui.route==='success'||ui.route==='delivery'?'orders':'food');
 }

 function openSpec(id){
  const store=findStore(ui.storeId),item=findItem(store,id);
  if(!item)return;
  draft=recipeDraft(store,item,data().prefs);
  showLayer('spec');
 }

 function submit(){
  if(!data().cart)return;
  if(data().orders.length>=MAX_ORDERS){notify('订单已达本机保存上限。');return;}
  const order=commit(state=>submitOrder(state,ui.orderNote));
  if(!order)return;
  ui.orderId=order.id;
  ui.route='success';
  paint(true);
 }

 function adjust(index,delta){
  if(!commit(state=>changeQuantity(state,index,delta)))return;
  if(!data().cart)closeLayer();
  paint();
 }

 root.addEventListener('click',event=>{
  if(event.target===dialog){
   const bounds=dialog.getBoundingClientRect();
   if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closeLayer();
   return;
  }
  const button=event.target.closest('[data-take-action]');
  if(!button || button.disabled)return;
  const {takeAction:action,id}=button.dataset;
  switch(action){
   case 'tab':showList(id);break;
   case 'back':back();break;
   case 'close':case 'stay':closeLayer();break;
   case 'cuisine':ui.cuisine=id;paint();break;
   case 'sort':ui.sort=id;paint();break;
   case 'open':openStore(id);break;
   case 'openback':openStore(id,'orders');break;
   case 'open-favorite':openStore(id,'me');break;
   case 'fav':
    if(commit(state=>{state.favs=state.favs.includes(id)?state.favs.filter(value=>value!==id):[...state.favs,id];return true;}))paint();
    break;
   case 'cat':{
    const section=Array.from(scroller.querySelectorAll('[data-section]')).find(node=>node.dataset.section===id);
    if(section)scroller.scrollTo({top:section.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop-8,
     behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    break;
   }
   case 'spec':openSpec(id);break;
   case 'pick':{
    if(!draft)break;
    const group=findItem(findStore(draft.storeId),draft.itemId)?.groups.find(g=>g.label===button.dataset.group);
    const choice=group?.choices.find(value=>value[0]===id);
    if(choice){draft.picked[group.label]={id:choice[0],name:choice[1],add:choice[2]};drawLayer();}
    break;
   }
   case 'sq':
    if(draft){draft.qty=Math.max(1,Math.min(9,draft.qty+Number(id)));drawLayer();}
    break;
   case 'add':
    if(draft && commit(state=>addToCart(state,draft))){closeLayer();paint();notify('已放入购物袋');}
    break;
   case 'dec':{
    const lines=data().cart?.lines||[];
    adjust(lines.findLastIndex(line=>line.itemId===id),-1);
    break;
   }
   case 'gocart':if(data().cart)showLayer('cart');break;
   case 'lq':adjust(Number(id),Number(button.dataset.q));break;
   case 'gocheck':if(data().cart){closeLayer();ui.route='checkout';paint(true);}break;
   case 'place':submit();break;
   case 'see':case 'order':
    ui.tab='orders';ui.route='delivery';ui.orderId=id||ui.orderId;paint(true);break;
   case 'otab':ui.orderTab=id;paint();break;
   case 'reorder':{
    const order=data().orders.find(value=>value.id===id);
    if(order)openStore(order.storeId,'orders',order);
    break;
   }
   case 'advance':{
    const status=commit(state=>{
     const order=state.orders.find(value=>value.id===ui.orderId);
     if(!order || order.status>=STATUSES.length-1)return 0;
     return ++order.status;
    });
    if(status){paint();notify(STATUSES[status]);}
    break;
   }
   case 'pref':
    if(commit(state=>{state.prefs[id]=!state.prefs[id];return true;}))paint();
    break;
   case 'addr':showLayer('addr');break;
   case 'address-new':
    if(data().addresses.length<MAX_ADDRESSES)showAddressPage('edit');
    break;
   case 'address-edit':showAddressPage('edit',id);break;
   case 'address-delete':showAddressPage('delete',id);break;
   case 'address-list':showAddressPage('list');break;
   case 'address-remove':updateAddress(state=>removeAddress(state,id));break;
   case 'address-use':
    updateAddress(state=>{
     if(!state.addresses.some(address=>address.id===id))return false;
     state.addressId=id;
     return true;
    },true);
    break;
   case 'ask-reset':showLayer('reset');break;
   case 'do-reset':
    if(commit(state=>{Object.assign(state,emptyTakeaway());return true;})){showList('me');notify('外卖数据已重置');}
    break;
   case 'swap':{
    const choice=pending;
    if(choice&&commit(state=>replaceCart(state,choice.order)))showStore(choice.storeId,choice.returnTab);
    break;
   }
  }
 });

 dialog.addEventListener('submit',event=>{
  const form=event.target;
  if(!form.matches('[data-take-address-form]'))return;
  event.preventDefault();
  for(const field of form.querySelectorAll('[required]')){
   if(field.value.trim())continue;
   field.value='';
   field.reportValidity();
   return;
  }
  const fields=Object.fromEntries(new FormData(form));
  updateAddress(state=>saveAddress(state,ui.addressId,fields));
 });

 root.addEventListener('input',event=>{
  const target=event.target;
  if(target.hasAttribute('data-take-search')){
   ui.query=target.value;
   scroller.querySelector('[data-take-feed]').outerHTML=views().listHtml();
  }
  if(target.hasAttribute('data-take-item-note')&&draft)draft.note=target.value;
  if(target.hasAttribute('data-take-order-note'))ui.orderNote=target.value;
 });
 scroller.addEventListener('scroll',()=>{
  if(ui.route!=='store')return;
  const sections=Array.from(scroller.querySelectorAll('[data-section]'));
  const top=scroller.getBoundingClientRect().top+40;
  const current=sections.filter(section=>section.getBoundingClientRect().top<=top).at(-1)||sections[0];
  for(const category of scroller.querySelectorAll('[data-take-action=cat]')){
   category.classList.toggle('on',category.dataset.id===current?.dataset.section);
  }
 },{passive:true});
 dialog.addEventListener('cancel',event=>{event.preventDefault();backLayer();});

 return {
  openHome(){closeLayer();ui=home();},
  sync(){
   const slot=app.querySelector('.takeaway-app');
   if(!slot || slot.contains(root))return;
   slot.append(root);
   paint(true);
  }
 };
}
