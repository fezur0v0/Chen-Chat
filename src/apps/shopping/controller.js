import {backButton,escape} from '../../ui.js';
import {addItem,checkout,findProduct,normalizeShopping} from './model.js';
import {barView,cartView,detailView,dockView,homeView,productGrid,profileView,sheetView,titles} from './view.js';

const initial=()=>({tab:'home',productId:null,option:'',category:'全部',query:'',listTop:0});
export function createShoppingApp({app,getState,persist,notify}){
 const root=document.createElement('div');
 root.className='takeaway-surface shopping-surface';
 root.innerHTML='<header class="desktop-app-header app-topbar"></header><div class="takeaway-scroll"></div><div class="shop-bar"></div><nav class="dock" aria-label="购物导航"></nav><dialog class="takeaway-dialog" aria-labelledby="shopping-sheet-title"></dialog>';
 const header=root.querySelector('header'),scroll=root.querySelector('.takeaway-scroll');
 const bar=root.querySelector('.shop-bar'),dock=root.querySelector('nav'),dialog=root.querySelector('dialog');
 let ui=initial(),layer=null;
 const data=()=>getState().shopping;
 function paint(y=scroll.scrollTop){
  const product=findProduct(ui.productId);
  const back=product||ui.tab!=='home'?backButton('back','返回上一级',{actionAttribute:'data-shop-action'}):backButton('home','返回桌面');
  header.innerHTML=back+'<h1 tabindex="-1">'+escape(product?'商品详情':titles[ui.tab])+'</h1><span></span>';
  scroll.innerHTML=product?detailView(product,ui):ui.tab==='cart'?cartView(data()):ui.tab==='me'?profileView(getState()):homeView(ui);
  dock.innerHTML=dockView(ui);
  root.classList.toggle('no-dock',!!product);
  bar.innerHTML=barView(ui,data());
  bar.hidden=!bar.firstElementChild;
  scroll.scrollTop=y;
 }
 function save(change){
  const state=getState(),next=structuredClone(state.shopping);
  if(change(next)===false)return false;
  const prev=state.shopping;
  state.shopping=next;
  if(persist())return true;
  state.shopping=prev;
  return false;
 }
 function show(next){
  layer=next;
  dialog.innerHTML=sheetView(next,data());
  if(!dialog.open)dialog.showModal();
 }
 function close(){
  layer=null;
  if(dialog.open)dialog.close();
 }
 function tab(key){
  ui.tab=key;ui.productId=null;paint(0);
 }
 root.addEventListener('input',event=>{
  if(!event.target.matches('[data-shop-search]'))return;
  ui.query=event.target.value;
  scroll.querySelector('.shop-grid').innerHTML=productGrid(ui);
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 root.addEventListener('click',event=>{
  if(event.target===dialog){close();return;}
  const button=event.target.closest('[data-shop-action]');
  if(!button||button.disabled)return;
  const {shopAction:action,value}=button.dataset;
  const id=ui.productId;
  switch(action){
   case 'back':
    if(id){ui.productId=null;paint(ui.listTop);}
    else tab('home');
    break;
   case 'tab':tab(value);break;
   case 'browse':tab('home');break;
   case 'category':ui.category=value;paint();break;
   case 'product':
    ui.listTop=scroll.scrollTop;ui.productId=value;ui.option=findProduct(value).options.values[0];paint(0);break;
   case 'option':
    ui.option=value;
    for(const option of scroll.querySelectorAll('[data-shop-action=option]'))option.setAttribute('aria-pressed',String(option===button));
    break;
   case 'favorite':
    if(save(d=>{d.favorites=d.favorites.includes(id)?d.favorites.filter(f=>f!==id):[id,...d.favorites];})){
     button.setAttribute('aria-pressed',String(data().favorites.includes(id)));
    }
    break;
   case 'add':
    if(data().cart.some(l=>l.id===id&&l.option===ui.option&&l.qty>=99)){notify('这个规格最多可加入 99 件');break;}
    if(save(d=>addItem(d,id,ui.option)))notify('已加入购物车');
    break;
   case 'all':case 'select':case 'minus':case 'plus':case 'remove':
    save(d=>{
     if(action==='all'){for(const item of d.cart)item.checked=button.checked;return;}
     const index=Number(value),line=d.cart[index];
     if(!line)return false;
     if(action==='select')line.checked=button.checked;
     else if(action==='remove')d.cart.splice(index,1);
     else line.qty=Math.max(1,Math.min(99,line.qty+(action==='plus'?1:-1)));
    });
    paint();break;
   case 'checkout':show('checkout');break;
   case 'ask-reset':show('reset');break;
   case 'close':close();break;
   case 'confirm':
    if(layer==='checkout'&&save(checkout)){paint();show('done');}
    break;
   case 'orders':close();tab('me');scroll.querySelector('#shopping-orders')?.focus();break;
   case 'reset':
    if(layer==='reset'&&save(d=>Object.assign(d,normalizeShopping()))){close();tab('home');}
    break;
  }
 });
 return {
  openHome(){close();ui=initial();},
  sync(){
   const slot=app.querySelector('[data-app-page=app-shopping]');
   if(!slot||slot.contains(root))return;
   slot.append(root);paint();
  }
 };
}
