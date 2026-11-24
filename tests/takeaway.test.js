import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,normalizeState,exportData} from '../src/store.js';
import {findStore,findItem,recipeDraft,addToCart,subtotal,submitOrder} from '../src/apps/takeaway/model.js';

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
});
