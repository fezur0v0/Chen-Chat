import {products} from './catalog.js';

export const findProduct=id=>products.find(p=>p.id===id);
export const total=lines=>lines.reduce((sum,line)=>sum+line.qty*line.price,0);
export const selectedLines=data=>data.cart.filter(line=>line.checked);

export function normalizeShopping(value){
 const data={cart:[],favorites:[],orders:[]};
 if(!value || typeof value!=='object')return data;
 if(Array.isArray(value.favorites))data.favorites=products.filter(p=>value.favorites.includes(p.id)).map(p=>p.id);
 if(Array.isArray(value.cart))for(const line of value.cart){
  const p=findProduct(line?.id);
  if(!p?.options.values.includes(line.option)||!Number.isInteger(line.qty)||line.qty<1)continue;
  if(data.cart.some(item=>item.id===p.id&&item.option===line.option))continue;
  data.cart.push({id:p.id,option:line.option,qty:Math.min(line.qty,99),checked:line.checked!==false,price:p.price});
 }
 if(Array.isArray(value.orders))for(const order of value.orders){
  if(typeof order?.id!=='string'||!order.id||!Number.isFinite(order.at)||Math.abs(order.at)>8.64e15||!Array.isArray(order.items))continue;
  const items=order.items.slice(0,100).filter(i=>typeof i?.name==='string'&&typeof i.option==='string'&&Number.isInteger(i.qty)&&i.qty>0&&i.qty<=99&&Number.isFinite(i.price)&&i.price>=0)
   .map(i=>({name:i.name.slice(0,100),option:i.option.slice(0,100),qty:i.qty,price:i.price}));
  if(items.length)data.orders.push({id:order.id.slice(0,80),at:order.at,items});
 }
 return data;
}

export function addItem(data,id,option){
 const product=findProduct(id);
 if(!product?.options.values.includes(option))return false;
 const line=data.cart.find(item=>item.id===id&&item.option===option);
 if(line){
  if(line.qty>=99)return false;
  line.qty++;
 }else data.cart.push({id,option,price:product.price,qty:1,checked:true});
 return true;
}

export function checkout(data){
 const selected=selectedLines(data);
 if(!selected.length)return false;
 const items=selected.map(({id,qty,option,price})=>({name:findProduct(id).name,qty,option,price}));
 data.orders.unshift({id:crypto.randomUUID(),at:Date.now(),items});
 data.cart=data.cart.filter(line=>!line.checked);
 return true;
}
