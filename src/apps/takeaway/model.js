import {STORES, STATUSES} from './catalog.js';

export const MAX_ORDERS = 200;
export const MAX_CART_LINES = 40;
export const MAX_QUANTITY = 99;
export const MAX_ADDRESSES = 20;
export const demoAddress = {name:'', phone:'', street:'延南洞 12-3'};
export const defaultPreferences = {mild:false, lessIce:true, noCilantro:false};
export const findStore = id => STORES.find(store => store.id === id);
export const findItem = (store,id) => store?.items.find(item => item.id === id);
export const subtotal = lines => lines.reduce((total,line) => total + line.unit * line.qty,0);
export const cartCount = cart => cart?.lines.reduce((total,line) => total + line.qty,0) || 0;
const text = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : '';

export function emptyTakeaway(){
 return {favs:[], prefs:{...defaultPreferences}, cart:null, orders:[], addresses:[], addressId:''};
}

function addressFields(value){
 return {name:text(value?.name,30),phone:text(value?.phone,24),street:text(value?.street,120)};
}

export function selectedAddress(data){
 return data.addresses.find(address=>address.id===data.addressId) || demoAddress;
}

export function saveAddress(data,id,value){
 const fields=addressFields(value);
 if(!fields.name || !fields.street)return false;
 if(id){
  const index=data.addresses.findIndex(address=>address.id===id);
  if(index<0)return false;
  data.addresses[index]={id,...fields};
 }else{
  if(data.addresses.length>=MAX_ADDRESSES)return false;
  const newId=crypto.randomUUID();
  data.addresses.push({id:newId,...fields});
  if(!data.addressId)data.addressId=newId;
 }
 return true;
}

export function removeAddress(data,id){
 const index=data.addresses.findIndex(address=>address.id===id);
 if(index<0)return false;
 data.addresses.splice(index,1);
 if(data.addressId===id)data.addressId=data.addresses[0]?.id || '';
 return true;
}

function normalizeLines(lines,store){
 if(!Array.isArray(lines))return [];
 return lines.slice(0,MAX_CART_LINES).flatMap(line => {
  const item=findItem(store,line?.itemId);
  if(!item || !Number.isInteger(line.qty) || line.qty<1)return [];
  const allowedPrices=item.groups.reduce((prices,group) =>
   prices.flatMap(price => group.choices.map(choice => price + choice[2])),[item.price]);
  const unit=allowedPrices.includes(line.unit) ? line.unit : item.price;
  const spec=text(line.spec,120),note=text(line.note,40);
  return [{key:JSON.stringify([item.id,spec,note,unit]),itemId:item.id,name:item.name,
   qty:Math.min(line.qty,MAX_QUANTITY),unit,spec,note}];
 });
}

export function normalizeTakeaway(value){
 const clean=emptyTakeaway();
 if(!value || typeof value!=='object')return clean;
 const addressIds=new Set();
 if(Array.isArray(value.addresses))for(const address of value.addresses.slice(0,MAX_ADDRESSES)){
  const id=text(address?.id,80),fields=addressFields(address);
  if(!id || addressIds.has(id) || !fields.name || !fields.street)continue;
  addressIds.add(id);
  clean.addresses.push({id,...fields});
 }
 clean.addressId=addressIds.has(value.addressId) ? value.addressId : clean.addresses[0]?.id || '';
 if(Array.isArray(value.favs))clean.favs=STORES.filter(store=>value.favs.includes(store.id)).map(store=>store.id);
 for(const key of Object.keys(clean.prefs)){
  if(typeof value.prefs?.[key]==='boolean')clean.prefs[key]=value.prefs[key];
 }
 const cartStore=findStore(value.cart?.storeId);
 const cartLines=normalizeLines(value.cart?.lines,cartStore);
 if(cartLines.length)clean.cart={storeId:cartStore.id,lines:cartLines,note:text(value.cart.note,80)};
 const seen=new Set();
 if(Array.isArray(value.orders))for(const order of value.orders.slice(0,MAX_ORDERS)){
  const id=text(order?.id,80),store=findStore(order?.storeId);
  const lines=normalizeLines(order?.lines,store);
  if(!id||seen.has(id)||!lines.length)continue;
  seen.add(id);
  const address=addressFields(order.address);
  clean.orders.push({id,storeId:store.id,lines,fee:store.fee,note:text(order.note,80),
   address:address.street ? address : {...demoAddress},
   created:Number.isFinite(order.created)&&Math.abs(order.created)<=8.64e15 ? order.created : 0,
   status:Number.isInteger(order.status)&&STATUSES[order.status]?order.status:0});
 }
 return clean;
}

export function recipeDraft(store,item,prefs){
 const picked={};
 for(const group of item.groups){
  const preference=group.label==='辣度'&&prefs.mild?'不辣':group.label==='冰量'&&prefs.lessIce?'少冰':'';
  const [id,name,add]=group.choices.find(choice=>choice[1]===preference)||group.choices[0];
  picked[group.label]={id,name,add};
 }
 return {storeId:store.id,itemId:item.id,qty:1,picked,note:prefs.noCilantro?'不要香菜':''};
}

export function addToCart(data,draft){
 const store=findStore(draft.storeId),item=findItem(store,draft.itemId);
 if(!item || (data.cart && data.cart.storeId!==store.id))return false;
 const note=text(draft.note,40);
 const spec=Object.entries(draft.picked).map(([label,choice])=>label+' '+choice.name).join(' / ');
 const unit=item.price+Object.values(draft.picked).reduce((sum,choice)=>sum+choice.add,0);
 const key=JSON.stringify([item.id,spec,note,unit]);
 const cart=data.cart||{storeId:store.id,lines:[],note:''};
 const existing=cart.lines.find(line=>line.key===key);
 if(existing){
  if(existing.qty+draft.qty>MAX_QUANTITY)return false;
  existing.qty+=draft.qty;
 }else{
  if(cart.lines.length>=MAX_CART_LINES)return false;
  cart.lines.push({key,itemId:item.id,name:item.name,qty:draft.qty,unit,spec,note});
 }
 data.cart=cart;
 return true;
}

export function changeQuantity(data,index,delta){
 const line=data.cart?.lines[index];
 if(!line||line.qty+delta>MAX_QUANTITY)return false;
 line.qty+=delta;
 if(line.qty<=0)data.cart.lines.splice(index,1);
 if(!data.cart.lines.length)data.cart=null;
 return true;
}

export function submitOrder(data,note){
 const cart=data.cart,store=findStore(cart?.storeId);
 if(!store || !cart.lines.length || subtotal(cart.lines)<store.min)return null;
 const order={id:'SD-'+crypto.randomUUID().slice(0,8).toUpperCase(),storeId:store.id,
  lines:cart.lines.map(line=>({...line})),fee:store.fee,note:text(note,80),
  address:addressFields(selectedAddress(data)),created:Date.now(),status:0};
 if(data.orders.length>=MAX_ORDERS)return null;
 data.orders.unshift(order);
 data.cart=null;
 return order;
}
