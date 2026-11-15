import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEndpoint,detectModels,storeCredential,credentialFor,providerForm,selectedModels,providerChoices} from '../src/provider.js';
import {createState,exportData,normalizeState} from '../src/store.js';

test('endpoint normalization keeps custom prefixes and rejects unsafe URLs',()=>{
 assert.equal(normalizeEndpoint('https://example.com/'),'https://example.com/v1');
 assert.equal(normalizeEndpoint('https://example.com/proxy/v1/'),'https://example.com/proxy/v1');
 for(const url of ['http://example.com','https://user:secret@example.com','https://example.com?key=secret','https://example.com/v1/chat/completions'])assert.throws(()=>normalizeEndpoint(url));
});
test('OpenAI-compatible detection authenticates without exposing keys in URL and deduplicates',async()=>{
 const models=await detectModels({protocol:'openai',baseUrl:'https://example.com'},'fake-secret',{fetcher:async(url,options)=>{
  assert.equal(url,'https://example.com/v1/models');
  assert.equal(options.headers.Authorization,'Bearer fake-secret');
  assert.equal(options.redirect,'error');
  return {ok:true,json:async()=>({data:[{id:'b'},{id:'a'},{id:'a'},{id:null}]})};
 }});
 assert.deepEqual(models,['a','b']);
});
test('Gemini pagination and names are normalized',async()=>{
 let page=0;
 const models=await detectModels({protocol:'gemini',baseUrl:''},'fake',{fetcher:async(url,options)=>{
  assert.equal(options.headers['x-goog-api-key'],'fake');
  assert.ok(!url.includes('fake'));
  page++;if(page===2)assert.ok(url.includes('pageToken=next'));
  return {ok:true,json:async()=>({models:[{name:'models/model-'+page}],...(page===1?{nextPageToken:'next'}:{})})};
 }});
 assert.deepEqual(models,['model-1','model-2']);
});
test('Anthropic authentication and pagination',async()=>{
 let page=0;
 await detectModels({protocol:'anthropic',baseUrl:''},'fake',{fetcher:async(url,options)=>{
  assert.equal(options.headers['x-api-key'],'fake');
  page++;if(page===2)assert.ok(url.includes('after_id=first'));
  return {ok:true,json:async()=>({data:[{id:'model'}],has_more:page===1,last_id:'first'})};
 }});
 assert.equal(page,2);
});
test('errors do not echo sensitive upstream bodies',async()=>{
 await assert.rejects(detectModels({protocol:'openai',baseUrl:''},'fake',{fetcher:async()=>({ok:false,status:401,text:async()=>'fake-secret'})}),/密钥无效/);
 await assert.rejects(detectModels({protocol:'openai',baseUrl:''},'fake',{fetcher:async()=>({ok:true,json:async()=>({wrong:[]})})}),/不是模型列表/);
 await assert.rejects(detectModels({protocol:'openai',baseUrl:''},'fake',{fetcher:async()=>{throw new TypeError('fetch failed');}}),/CORS/);
});
test('credentials stay separate from exported app state and can be removed',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const state=createState();state.provider={protocol:'openai',baseUrl:'https://example.com/v1',model:'test'};
 storeCredential(state.provider,'fake-secret',true,storage);
 assert.ok([...map.values()][0].includes('fake-secret'));
 assert.equal(credentialFor(state.provider,storage).key,'fake-secret');
 assert.ok(!exportData(state).includes('fake-secret'));
 assert.deepEqual(normalizeState(state).provider,{...state.provider,models:['test']});
 storeCredential(state.provider,'',false,storage);assert.equal(map.size,0);
});
test('provider form escapes configuration and offers manual model entry',()=>{
 const html=providerForm({protocol:'openai',baseUrl:'https://example.com',model:'"><script>'});
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('data-provider-detect'));
 assert.ok(html.includes('type="password"'));assert.ok(html.includes('name="model"'));
});

test('selected model collection migrates old defaults and round-trips through backup',()=>{
 const state=createState();state.provider.model='default';state.provider.models=['extra','extra',null,''];
 assert.deepEqual(selectedModels(state.provider),['default','extra']);
 const restored=normalizeState(JSON.parse(exportData(state)));
 assert.deepEqual(restored.provider.models,['default','extra']);
 assert.ok(providerChoices(restored.provider,'extra').includes('data-model="extra"'));
 assert.ok(!providerChoices({model:'<script>',models:[]},'').includes('<script>'));
});

test('DeepSeek defaults to its official root models endpoint and retains explicit custom paths',async()=>{
 assert.equal(normalizeEndpoint('','deepseek'),'https://api.deepseek.com');
 assert.equal(normalizeEndpoint('https://api.deepseek.com/','deepseek'),'https://api.deepseek.com');
 assert.equal(normalizeEndpoint('https://api.deepseek.com/v1/','deepseek'),'https://api.deepseek.com/v1');
 assert.equal(normalizeEndpoint('https://example.com/proxy/v1/','deepseek'),'https://example.com/proxy/v1');
 let requests=0;
 const models=await detectModels({protocol:'deepseek',baseUrl:''},' test-deepseek-key ',{fetcher:async(url,options)=>{
  requests++;assert.equal(url,'https://api.deepseek.com/models');assert.equal(options.headers.Authorization,'Bearer test-deepseek-key');
  assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  return {ok:true,json:async()=>({object:'list',data:[{id:'model-b'},{id:'model-a'},{id:'model-a'},{id:null}]})};
 }});
 assert.equal(requests,1);assert.deepEqual(models,['model-a','model-b']);
});
test('DeepSeek configuration and selected models persist, with credentials isolated from other protocols and backups',()=>{
 const state=createState();state.provider={protocol:'deepseek',baseUrl:'https://api.deepseek.com',model:'model-a',models:['model-a','model-b']};
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 storeCredential(state.provider,'fake-deepseek-key',true,storage);
 assert.equal(credentialFor(state.provider,storage).key,'fake-deepseek-key');
 assert.equal(credentialFor({...state.provider,protocol:'openai'},storage),null);
 assert.deepEqual(normalizeState(JSON.parse(exportData(state))).provider,state.provider);
 assert.doesNotMatch(exportData(state),/fake-deepseek-key/);
 assert.match(providerForm(state.provider),/<option value="deepseek" selected>DeepSeek<\/option>/);
 storeCredential(state.provider,'',false,storage);
});
