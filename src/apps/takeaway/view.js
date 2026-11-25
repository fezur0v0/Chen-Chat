import {escape as esc} from '../../ui.js';
import {STORES, STATUSES} from './catalog.js';
import {demoAddress,findStore,findItem,subtotal as money,cartCount} from './model.js';
import {takeawayIcon as icon,foodIllustration as art} from './icons.js';
import {addressButton,addressSheet} from './address-view.js';

const categories=[['全部',''],['简餐','LUNCH'],['面食','NOODLE'],['奶茶','TEA'],['甜点','SWEET']];
const sorts=[['mix','综合排序'],['distance','距离优先'],['price','低价优先']];

const yuan=amount=>'¥'+amount;
const orderDate=new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
const recordedAt=order=>order.created?orderDate.format(order.created):'本机记录';
export function takeawayView({data,ui,draft,pending,userName}){
 const count=()=>cartCount(data.cart);
 function shops(){
  const query=ui.query.trim().toLowerCase();
  const matches=STORES.filter(store=>(ui.cuisine==='全部'||store.cuisine===ui.cuisine)&&
   [store.name,store.cuisine,...store.items.map(item=>item.name)].some(text=>text.toLowerCase().includes(query)));
  if(ui.sort==='distance')matches.sort((a,b)=>parseFloat(a.km)-parseFloat(b.km));
  if(ui.sort==='price')matches.sort((a,b)=>a.min-b.min||a.fee-b.fee);
  return matches;
 }
 const qtyOf=(storeId,itemId)=>data.cart?.storeId===storeId
  ? data.cart.lines.filter(line=>line.itemId===itemId).reduce((sum,line)=>sum+line.qty,0)
  : 0;
 function heart(id){const on=data.favs.includes(id);return `<button class="heart ${on?'on':''}" data-take-action="fav" data-id="${id}" aria-label="${on?'取消收藏':'收藏'}" aria-pressed="${on}">${icon('heart')}</button>`;}
 function listHtml(){
   const list=shops();
   if(!list.length)return '<div class="empty" data-take-feed><strong>没有这家店</strong>换个词，或看看全部分类。</div>';
   return `<div class="shop-list" data-take-feed>${list.map(s=>`<article class="shop"><button class="open" data-take-action="open" data-id="${s.id}" aria-label="进入${esc(s.name)}">${art(s.cover)}<div><h2>${esc(s.name)}</h2><div class="sub"><b>${s.rating}</b><span>${esc(s.sales)}</span><span>${esc(s.cuisine)}</span></div><div class="sub"><span>起送 ${yuan(s.min)}</span><span>配送 ${yuan(s.fee)}</span><span class="eta">${esc(s.km)} · ${esc(s.eta)}</span></div></div></button>${heart(s.id)}</article>`).join('')}</div>`;
 }
 function food(){
   const bag=data.cart&&data.cart.lines.length?`<button class="hint" data-take-action="open" data-id="${data.cart.storeId}" style="display:block;width:100%;text-align:left;color:var(--ink)">购物袋里还有${esc(findStore(data.cart.storeId).name)}的 ${count()} 件</button>`:'';
   return `${addressButton(data)}
    <label class="search">${icon('search')}<input type="search" maxlength="60" data-take-search value="${esc(ui.query)}" placeholder="搜索店铺或菜品" aria-label="搜索店铺或菜品"></label>
    <div class="cats" role="group" aria-label="餐品分类">${categories.map(([label,picture])=>`<button class="cat" data-take-action="cuisine" data-id="${label}" aria-pressed="${ui.cuisine===label}">${art(picture)}<span>${label}</span></button>`).join('')}</div>
    <div class="sorts" role="group" aria-label="店铺排序">${sorts.map(([id,label])=>`<button data-take-action="sort" data-id="${id}" aria-pressed="${ui.sort===id}">${label}</button>`).join('')}</div>
    <p class="hint shop-hint">模拟外卖 · 价格、时间及距离均为示例</p>${bag}${listHtml()}`;
 }
 function catsOf(s){return ['推荐',...new Set(s.items.map(i=>i.cat))];}
 function dishRow(s,i){
   const q=qtyOf(s.id,i.id);
   const ctrl=q?`<div class="adder"><button class="minus" data-take-action="dec" data-id="${i.id}" aria-label="减少${esc(i.name)}">${icon('minus')}</button><b>${q}</b><button data-take-action="spec" data-id="${i.id}" aria-label="再加${esc(i.name)}">${icon('plus')}</button></div>`:`<div class="adder"><button data-take-action="spec" data-id="${i.id}" aria-label="选择${esc(i.name)}">${icon('plus')}</button></div>`;
   return `<div class="dish">${art(i.img)}<div><strong>${esc(i.name)}</strong><small>${esc(i.sales)} · 演示</small><div class="row"><span class="price">${yuan(i.price)}</span>${ctrl}</div></div></div>`;
 }
 function storeView(){
   const s=findStore(ui.storeId);if(!s)return food();
   const rec=s.items.slice(0,3);
   const groups=catsOf(s);
   const sections=groups.map(c=>{
     const items=c==='推荐'?rec:s.items.filter(i=>i.cat===c);
     return `<section class="sec" data-section="${esc(c)}"><h3>${esc(c)}</h3>${items.map(i=>dishRow(s,i)).join('')}</section>`;
   }).join('');
   return `<div class="store-card">${art(s.cover)}<div><h2>${esc(s.name)}</h2><div class="sub"><b>${s.rating}</b><span>${esc(s.sales)}</span><span>${esc(s.cuisine)}</span></div><div class="sub"><span>${esc(s.eta)}</span><span>起送 ${yuan(s.min)}</span><span>配送 ${yuan(s.fee)}</span></div><p>${esc(s.blurb)}</p></div></div><div class="reco">${rec.map(i=>`<button data-take-action="spec" data-id="${i.id}" aria-label="推荐${esc(i.name)}">${art(i.img)}<span>${esc(i.name)}</span><b>${yuan(i.price)}</b></button>`).join('')}</div><div class="split"><nav class="rail" aria-label="菜品分类">${groups.map((c,idx)=>`<button data-take-action="cat" data-id="${esc(c)}" class="${idx===0?'on':''}">${esc(c)}</button>`).join('')}</nav><div>${sections}</div></div>`;
 }
 function checkout(){
   const s=findStore(data.cart?.storeId);if(!s)return food();
   const sub=money(data.cart.lines),total=sub+s.fee,lack=Math.max(0,s.min-sub);
   return `<p class="hint">本机模拟。不会付款，不收集卡号，也不会发给商家。</p><h2 style="margin:8px 0">${esc(s.name)}</h2>${addressButton(data,"送到")}${data.cart.lines.map(l=>`<div class="between"><span>${esc(l.name)} × ${l.qty}<br><small style="color:var(--muted)">${esc(l.spec)}${l.note?' · '+esc(l.note):''}</small></span><b>${yuan(l.unit*l.qty)}</b></div>`).join('')}<div class="between"><span>配送费</span><b>${yuan(s.fee)}</b></div><div class="between"><span>演示合计</span><b>${yuan(total)}</b></div><label class="hint">备注<textarea data-take-order-note maxlength="80" placeholder="例如少辣、放门口">${esc(ui.orderNote)}</textarea></label>${lack?`<p class="hint">还差 ${yuan(lack)} 到起送。</p>`:`<button class="full" data-take-action="place">提交模拟订单</button>`}`;
 }
 function success(){
   const o=data.orders.find(x=>x.id===ui.orderId);
   return `<div class="center"><div class="ok">${icon('check')}</div><h2>演示下单成功</h2><p class="big">${o?yuan(money(o.lines)+o.fee):''}</p><p class="hint">不会扣款。预计时间只是演示。</p><div class="between"><span>订单号</span><span>${esc(o?o.id:'')}</span></div><div class="between"><span>送到</span><span class="order-address">${esc(o?.address?.street||demoAddress.street)}</span></div><div class="actions"><button class="alt" data-take-action="tab" data-id="food">返回外卖</button><button class="full" style="margin:0" data-take-action="see">查看订单</button></div></div>`;
 }
 function orderCards(list){
   return list.map(o=>{
     const s=findStore(o.storeId);
     const name=s?s.name:o.storeId;
     const lines=Array.isArray(o.lines)?o.lines:[];
     const first=lines[0];
     const item=s&&first&&findItem(s,first.itemId);
     const pieces=lines.reduce((n,l)=>n+(Number(l.qty)||0),0);
     const full=lines.map(l=>l.name+(l.qty>1?' ×'+l.qty:'')).join('、')||'演示商品';
     const head=first?(first.name+(first.qty>1?' ×'+first.qty:'')):'演示商品';
     const more=lines.length>1?'等'+lines.length+'样':'';
     const live=Number(o.status)<4;
     const pic=art(item?.img||s?.cover),coverPic=art(s?.cover);
     return `<article class="ocard"><div class="ocard-top"><button class="shopgo" data-take-action="openback" data-id="${esc(o.storeId)}" aria-label="进入${esc(name)}">${coverPic}<strong title="${esc(name)}">${esc(name)}</strong></button><span class="st ${live?'live':''}">${esc(STATUSES[o.status]||'已记录')}<span class="demo-tag">演示</span></span></div><button class="ogoods" data-take-action="order" data-id="${esc(o.id)}" aria-label="查看订单详情">${pic}<span class="oname"><b title="${esc(full)}">${esc(head)}</b>${more?`<small>${more}</small>`:''}</span><span class="omoney"><b>${yuan(money(lines)+(Number(o.fee)||0))}</b><small>共${pieces}件</small></span></button><div class="oacts">${live?`<button class="go" data-take-action="order" data-id="${esc(o.id)}">查看进度</button>`:`<button data-take-action="reorder" data-id="${esc(o.id)}">再来一单</button><button data-take-action="openback" data-id="${esc(o.storeId)}">进入店铺</button>`}</div></article>`;
   }).join('');
 }
 function orders(){
   const tab=ui.orderTab||'all';
   const list=data.orders.filter(order=>tab==='all'||(tab==='active'?order.status<4:order.status===4));
   const empty=tab==='active'?'没有配送中的订单':tab==='done'?'没有已送达的订单':'还没有订单';
   const filters=[['all','全部订单'],['active','进行中'],['done','已送达']];
   return `<div class="orders-page"><div class="filters" role="group" aria-label="订单筛选">${filters.map(([id,label])=>`<button data-take-action="otab" data-id="${id}" aria-pressed="${tab===id}">${label}</button>`).join('')}</div>${list.length?orderCards(list):`<div class="empty"><strong>${empty}</strong>${tab==='all'?'从「外卖」挑一家店，走一遍本机模拟。':'模拟订单会按进度出现在这里。'}</div>`}</div>`;
 }
 function etaText(status){return ['约 32 分钟','约 24 分钟','约 16 分钟','约 8 分钟','已送达'][status]||'';}
 function riderPos(status){return ['28%,40%','40%,48%','52%,58%','68%,68%','78%,74%'][status]||'40%,48%';}
 function delivery(){
   const o=data.orders.find(x=>x.id===ui.orderId);if(!o)return orders();
   const s=findStore(o.storeId);
   return `<p class="hint">演示进度，不是真实骑手位置。</p><div class="center"><div class="hint">${esc(s?s.name:'')}</div><div class="big">${etaText(o.status)}</div></div><div class="steps">${STATUSES.map((name,i)=>`<span class="${i<=o.status?'on':''}"><i></i>${name}</span>`).join('')}</div><div class="map" aria-label="配送示意图"><div class="road h"></div><div class="road v"></div><span class="dot shop" title="店"></span><span class="dot rider" style="left:${riderPos(o.status).split(',')[0]};top:${riderPos(o.status).split(',')[1]}"></span><span class="dot home" title="收"></span></div><div class="feed">${['模拟订单已生成','厨房正在制作','骑手已取餐','正在配送','模拟配送完成'].slice(0,o.status+1).map((t,i)=>`<div>${t}<small>${esc(recordedAt(o))} · 演示</small></div>`).join('')}</div>${o.status<4?'<button class="full" data-take-action="advance">推进演示</button>':''}<section class="order-summary" aria-label="订单菜品"><h3>订单菜品</h3><p class="hint order-address">送到 ${esc(o.address?.street||demoAddress.street)}</p>${o.lines.map(line=>`<div class="between"><span>${esc(line.name)} × ${line.qty}<br><small>${esc(line.spec)}${line.note?' · '+esc(line.note):''}</small></span><b>${yuan(line.unit*line.qty)}</b></div>`).join('')}${o.note?`<p class="hint">备注 ${esc(o.note)}</p>`:''}<div class="between"><span>配送费</span><b>${yuan(o.fee)}</b></div><div class="between"><span>演示合计</span><b>${yuan(money(o.lines)+o.fee)}</b></div></section>`;
 }
 function me(){
   const favs=data.favs.map(findStore).filter(Boolean);
   const prefs=[['mild','少辣'],['lessIce','少冰'],['noCilantro','不要香菜']];
   return `<div class="me"><div class="avatar">${esc(userName.slice(0,1))}</div><div><b>${esc(userName)}</b><div class="hint">外卖偏好与收藏</div></div></div><div class="profile-address">${addressButton(data)}</div><div class="block">${prefs.map(([k,label])=>`<button class="sw ${data.prefs[k]?'on':''}" data-take-action="pref" data-id="${k}" aria-pressed="${!!data.prefs[k]}"><span>${label}</span><i></i></button>`).join('')}</div><div class="block"><div class="between"><b>收藏的店</b></div>${favs.length?favs.map(s=>`<button data-take-action="open-favorite" data-id="${s.id}"><span>${esc(s.name)}</span><small>${esc(s.cuisine)}</small></button>`).join(''):'<p class="hint">在店铺右边点爱心。</p>'}</div><div class="block"><button data-take-action="ask-reset">重置演示数据</button></div><p class="hint">外卖订单仅用于本机模拟。</p>`;
 }
 function view(){
   if(ui.tab==='orders')return ui.route==='delivery'?delivery():orders();
   if(ui.tab==='me')return me();
   if(ui.route==='store')return storeView();
   if(ui.route==='checkout')return checkout();
   if(ui.route==='success')return success();
   return food();
 }
 function dock(){
   return [['food','首页','home'],['orders','订单','orders'],['me','我的','me']].map(([id,label,name])=>
    `<button type="button" data-take-action="tab" data-id="${id}" ${ui.tab===id?'aria-current="page"':''}>
     <span class="dock-icon">${icon(name)}</span><span>${label}</span>
    </button>`).join('');
 }
 function cartbar(){
   const s=findStore(ui.storeId);
   if(!(ui.tab==='food'&&ui.route==='store'&&s))return '';
   const mine=data.cart&&data.cart.storeId===s.id?data.cart:null;
   const n=mine?mine.lines.reduce((a,l)=>a+l.qty,0):0;
   const sub=mine?money(mine.lines):0;
   const ok=sub>=s.min;
   return `<span>${n?n+' 件 · '+yuan(sub):'购物袋是空的'}</span><button data-take-action="gocart" ${n?'':'disabled'}>${ok?'去结算':n?'查看购物袋':yuan(s.min)+'起送'}</button>`;
 }
 function layers(){
   if(ui.layer==='spec'&&draft){
     const s=findStore(draft.storeId),item=findItem(s,draft.itemId);
     const extra=Object.values(draft.picked).reduce((n,c)=>n+c.add,0);
     return `<div class="panel"><h3>${esc(item.name)}</h3><p class="hint">${esc(item.desc)} 演示价 ${yuan(item.price+extra)}</p>${item.groups.map(g=>`<div><b>${esc(g.label)}</b><div class="opts">${g.choices.map(c=>`<button class="opt" data-take-action="pick" data-group="${esc(g.label)}" data-id="${c[0]}" aria-pressed="${draft.picked[g.label].id===c[0]}">${esc(c[1])}${c[2]?` ${c[2]>0?'+':''}${c[2]}`:''}</button>`).join('')}</div></div>`).join('')}<label class="hint">备注<textarea data-take-item-note maxlength="40">${esc(draft.note)}</textarea></label><div class="between"><div class="step"><button data-take-action="sq" data-id="-1" aria-label="减少">${icon('minus')}</button><b>${draft.qty}</b><button data-take-action="sq" data-id="1" aria-label="增加">${icon('plus')}</button></div><b>${yuan((item.price+extra)*draft.qty)}</b></div><button class="full" data-take-action="add">放入购物袋</button></div>`;
   }
   if(ui.layer==='cart'&&data.cart){
     const s=findStore(data.cart.storeId);
     return `<div class="panel"><h3>${esc(s.name)}</h3>${data.cart.lines.map((l,i)=>`<div class="line">${art(findItem(s,l.itemId)?.img||s.cover)}<div><b>${esc(l.name)}</b><div class="hint">${esc(l.spec)}${l.note?' · '+esc(l.note):''}</div><div class="between"><div class="step"><button data-take-action="lq" data-id="${i}" data-q="-1" aria-label="减少">${icon('minus')}</button><b>${l.qty}</b><button data-take-action="lq" data-id="${i}" data-q="1" aria-label="增加">${icon('plus')}</button></div><span>${yuan(l.unit*l.qty)}</span></div></div></div>`).join('')}<button class="full" data-take-action="gocheck">去确认</button></div>`;
   }
   if(ui.layer==='switch'){
     const from=findStore(data.cart.storeId),to=findStore(pending);
     return `<div class="panel"><h3>购物袋还在${esc(from.name)}</h3><p>有 ${count()} 件。继续后将替换购物袋里的菜品，目标店铺为「${esc(to.name)}」。</p><button class="full" data-take-action="stay">先不换</button><button class="full alt" data-take-action="swap" style="background:var(--soft);color:var(--ink)">确认并进入店铺</button></div>`;
   }
   if(ui.layer==='addr')return addressSheet(data,ui);
   if(ui.layer==='reset')return `<div class="panel"><h3>重置演示数据？</h3><p>会清掉这份外卖演示里的订单、收货地址、收藏和购物袋。口味偏好将恢复默认。</p><button class="full" data-take-action="do-reset">确认重置</button><button class="full" data-take-action="close" style="background:var(--soft);color:var(--ink)">取消</button></div>`;
   return '';
 }
 return {view,listHtml,dock,cartbar,layers,heart};
}
