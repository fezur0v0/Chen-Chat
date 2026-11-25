import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,exportData} from '../src/store.js';
import {
 findStore,findItem,recipeDraft,addToCart,subtotal,submitOrder,saveAddress,removeAddress,selectedAddress
} from '../src/apps/takeaway/model.js';

test('takeaway keeps separate specifications and an unchanged order snapshot through backup',()=>{
 const state=createState(),data=state.takeaway,store=findStore('lunch');
 const draft=recipeDraft(store,findItem(store,'l2'),data.prefs);
 draft.picked['份量']={id:'l',name:'大份',add:4};
 assert(addToCart(data,draft));
 assert(addToCart(data,{...draft,note:'少油'}));
 assert.equal(data.cart.lines.length,2);
 assert.equal(subtotal(data.cart.lines),64);
 const order=submitOrder(data,'放门口');
 assert.equal(data.cart,null);
 assert.equal(order.fee,3);
 assert.deepEqual(normalizeState(JSON.parse(exportData(state))).takeaway,data);
 assert.equal(submitOrder(data,''),null);
});

test('old backups gain the launcher and malformed takeaway data is bounded without losing chats',()=>{
 const state=createState();
 state.home.pages=state.home.pages.map(page=>page.filter(id=>id!=='app-takeaway'));
 delete state.takeaway;
 const restored=normalizeState(state);
 assert(restored.home.pages.flat().includes('app-takeaway'));
 assert.deepEqual(restored.takeaway.orders,[]);
 state.takeaway={favs:['lunch','unknown','lunch'],cart:{storeId:'unknown',lines:[{}]},orders:[null,
  {id:'kept',storeId:'lunch',lines:[{itemId:'l1',qty:1000,unit:-9,name:'changed'}],status:99}]};
 const cleaned=normalizeState(state);
 assert.equal(cleaned.active,state.active);
 assert.equal(cleaned.takeaway.cart,null);
 assert.deepEqual(cleaned.takeaway.favs,['lunch']);
 assert.deepEqual(cleaned.takeaway.orders[0].lines.map(({qty,unit,name})=>[qty,unit,name]),[[99,32,'酱汁鸡腿饭']]);
 assert.equal(cleaned.takeaway.orders[0].status,0);
 assert.equal(cleaned.takeaway.orders[0].address.street,'延南洞 12-3');
});

test('takeaway addresses survive backup and edits leave existing deliveries unchanged',()=>{
 const state=createState(),data=state.takeaway;
 assert.equal(selectedAddress(data).street,'延南洞 12-3');
 assert.equal(saveAddress(data,'',{name:' ',street:'书店二楼'}),false);
 assert(saveAddress(data,'',{name:'小尘',phone:'123',street:'书店二楼'}));
 const id=data.addressId;
 assert(saveAddress(data,'',{name:'小尘',street:'花店门口'}));
 const store=findStore('lunch');
 assert(addToCart(data,recipeDraft(store,findItem(store,'l1'),data.prefs)));
 const order=submitOrder(data,'');
 assert.deepEqual(order.address,{name:'小尘',phone:'123',street:'书店二楼'});
 assert(saveAddress(data,id,{name:'小尘',street:'书店一楼'}));
 assert.equal(selectedAddress(data).street,'书店一楼');
 assert(removeAddress(data,id));
 assert.equal(selectedAddress(data).street,'花店门口');
 assert.equal(order.address.street,'书店二楼');
 assert.deepEqual(normalizeState(JSON.parse(exportData(state))).takeaway,data);
});
