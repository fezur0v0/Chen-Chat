import test from 'node:test';
import assert from 'node:assert/strict';
import {addItem,checkout,normalizeShopping,selectedLines,total} from '../src/apps/shopping/model.js';
import {createState,normalizeState} from '../src/store.js';

test('older desktop layouts gain one shopping entry and an empty shopping bag',()=>{
 const state=createState();
 delete state.shopping;
 state.home.pages=state.home.pages.map(page=>page.filter(id=>id!=='app-shopping'));
 const restored=normalizeState(state);
 assert.deepEqual(restored.shopping,{cart:[],favorites:[],orders:[]});
 assert.equal(restored.home.pages.flat().filter(id=>id==='app-shopping').length,1);
});

test('only selected variants are checked out and retained as order snapshots',()=>{
 const state=createState(),data=state.shopping;
 addItem(data,'ceramic','雾白');
 addItem(data,'ceramic','浅灰');
 addItem(data,'ceramic','浅灰');
 data.cart[0].checked=false;
 assert.equal(total(selectedLines(data)),372);
 assert.equal(checkout(data),true);
 assert.equal(checkout(data),false);
 assert.deepEqual(data.orders[0].items,[{name:'雾白杯组',option:'浅灰',qty:2,price:186}]);
 assert.equal(data.cart[0].option,'雾白');
 assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(state))).shopping,data);
});

test('restoring a bag checks catalog prices, variants and quantities',()=>{
 const data=normalizeShopping({cart:[null,{id:'tea',option:'无',qty:2},{id:'tea',option:'淡蓝',qty:101,price:1}]});
 assert.deepEqual(data.cart,[{id:'tea',option:'淡蓝',qty:99,checked:true,price:128}]);
});
