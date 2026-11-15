import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,addDraftMessage,newSession,normalizeState,exportData,changeMessage} from '../src/store.js';
import {newPreset} from '../src/apps/presets/model.js';
import {buildChatContext,LIVE_OUTPUT_FORMAT,historyStamp,configuredModel} from '../src/chat-api/context.js';
import {chatRequest,chatResponse,generateChat} from '../src/chat-api/transport.js';
import {createChatGeneration} from '../src/chat-api/controller.js';

const fixture=()=>{const state=createState();state.provider={protocol:'deepseek',baseUrl:'',model:'test-model',models:['test-model','second-model']};addDraftMessage(state,'你好');return state;};
const textOf=messages=>messages.map(m=>m.content.filter(p=>p.type==='text').map(p=>p.text).join('\n')).join('\n');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
function harness(options={}){
 let state=fixture(),saved=true,calls=0;const renders=[],pending=deferred();
 const gen=createChatGeneration({getState:()=>state,setState:s=>{state=s},persist:()=>saved,render:id=>renders.push(id),credential:()=>({key:'fake-key'}),...options,request:async(...args)=>{calls++;return options.request?options.request(...args):pending.promise}});
 return {gen,pending,renders,get state(){return state},set state(value){state=value},get calls(){return calls},set saved(value){saved=value}};
}
test('context includes current chat, persona and supported live format, without other chats or unbound worldbooks',()=>{
 const state=fixture(),first=state.active;state.persona={name:'角色甲',prompt:'语气温和'};state.home.userName='用户乙';
 const other=newSession(state);addDraftMessage(state,'Other chat secret');state.active=first;
 state.worldbooks=[{id:'unbound',raw:{entries:{a:{content:'Unbound book secret',key:[],constant:true}}}}];
 const context=buildChatContext(state,first),text=textOf(context.messages);
 assert.match(text,/角色甲/);assert.match(text,/用户乙/);assert.match(text,/语气温和/);assert.match(text,/char：/);assert.match(text,/\[语音\]/);assert.match(text,/你好/);assert.doesNotMatch(text,/Other chat secret|Unbound book secret/);
 assert.equal(context.maxTokens,4096);assert.equal(context.model,'test-model');
 state.sessions.find(s=>s.id===first).model='model-from-other-provider';assert.equal(configuredModel(state.provider,state.sessions.find(s=>s.id===first)),'test-model');
 assert.notEqual(other.id,first);assert(LIVE_OUTPUT_FORMAT.includes('<live>'));
});
test('active preset follows enabled order, expands char/user and supports history depth without executing arbitrary macros',()=>{
 const state=fixture(),preset=newPreset('Test preset');state.promptPresets=[preset];state.activePromptPreset=preset.id;
 preset.raw.prompts.find(p=>p.identifier==='main').content='Rule for {{char}} and {{user}}';
 preset.raw.prompts.push({identifier:'hidden',role:'system',content:'Disabled rule'},{identifier:'injected',role:'system',content:'Depth rule {{unknown}}',injection_position:1,injection_depth:1});
 preset.raw.prompt_order[0].order.push({identifier:'hidden',enabled:false},{identifier:'injected',enabled:true});
 const context=buildChatContext(state,state.active),text=textOf(context.messages);assert.match(text,/Rule for 尘 and 我/);assert.match(text,/Depth rule \{\{unknown\}\}/);assert.doesNotMatch(text,/Disabled rule/);assert.equal(context.maxTokens,1024);
 assert(context.messages.findIndex(m=>textOf([m]).includes('Depth rule'))<context.messages.findIndex(m=>textOf([m])==='你好'));
});
test('context bounds recent messages and images and describes voice/file limitations truthfully',()=>{
 const state=fixture(),s=state.sessions[0];s.messages=[];
 for(let i=0;i<45;i++)addDraftMessage(state,'Message '+i,[{id:'image-'+i,name:'photo',type:'image/png',data:'data:image/png;base64,YQ=='}]);
 const context=buildChatContext(state,s.id),images=context.messages.flatMap(m=>m.content).filter(p=>p.type==='image');assert.equal(images.length,6);assert.doesNotMatch(textOf(context.messages),/Message 0\b/);assert.match(textOf(context.messages),/Message 44/);
 s.messages=[];addDraftMessage(state,'',[{id:'voice',name:'语音',kind:'voice',voice:{fileId:'v',duration:1,transcript:'转写的内容'}},{id:'file',name:'notes.pdf',type:'application/pdf'}]);
 assert.match(textOf(buildChatContext(state,s.id).messages),/转写的内容/);assert.match(textOf(buildChatContext(state,s.id).messages),/notes.pdf.*未提供/);
});
const sample={model:'test-model',maxTokens:1024,messages:[{role:'system',content:[{type:'text',text:'Instructions'}]},{role:'user',content:[{type:'text',text:'Hi'},{type:'image',mediaType:'image/png',data:'YQ=='}]}]};
test('OpenAI/DeepSeek, Anthropic and Gemini build the correct authenticated text/image requests',()=>{
 const deep=chatRequest({protocol:'deepseek',baseUrl:''},sample,'fake-key');assert.equal(deep.url,'https://api.deepseek.com/chat/completions');assert.equal(deep.headers.Authorization,'Bearer fake-key');assert.equal(deep.body.max_tokens,1024);assert.equal(deep.body.stream,false);assert.equal(deep.body.messages[1].content[1].image_url.url,'data:image/png;base64,YQ==');
 const open=chatRequest({protocol:'openai',baseUrl:''},sample,'fake-key');assert.equal(open.url,'https://api.openai.com/v1/chat/completions');assert.equal(open.body.max_completion_tokens,1024);
 const relay=chatRequest({protocol:'openai',baseUrl:'https://example.com/proxy/v1'},sample,'fake-key');assert.equal(relay.url,'https://example.com/proxy/v1/chat/completions');assert.equal(relay.body.max_tokens,1024);
 const ant=chatRequest({protocol:'anthropic',baseUrl:''},sample,'fake-key');assert.equal(ant.url,'https://api.anthropic.com/v1/messages');assert.equal(ant.headers['x-api-key'],'fake-key');assert.equal(ant.body.system,'Instructions');assert.equal(ant.body.messages[0].content[1].source.media_type,'image/png');
 const gem=chatRequest({protocol:'gemini',baseUrl:''},{...sample,model:'models/test-model'},'fake-key');assert.equal(gem.url,'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent');assert.equal(gem.headers['x-goog-api-key'],'fake-key');assert(!gem.url.includes('fake-key'));assert.equal(gem.body.contents[0].parts[1].inlineData.data,'YQ==');
});
test('responses retain displayed text and omit reasoning fields, with safe errors and outer live-fence cleanup',async()=>{
 assert.equal(chatResponse('deepseek',{choices:[{message:{content:'```xml\n<live>\nchar：你好\n</live>\n```',reasoning_content:'private-reasoning'}}]}).text,'<live>\nchar：你好\n</live>');
 assert.equal(chatResponse('anthropic',{content:[{type:'thinking',thinking:'hidden'},{type:'text',text:'Shown'}]}).text,'Shown');
 assert.equal(chatResponse('gemini',{candidates:[{content:{parts:[{thought:true,text:'Hidden'},{text:'Shown'}]}}]}).text,'Shown');
 assert.throws(()=>chatResponse('deepseek',{choices:[{message:{reasoning_content:'hidden'},finish_reason:'length'}]}),/长度限制/);
 assert.throws(()=>chatResponse('anthropic',{content:{bad:true}}),/没有返回/);
 for(const fetcher of [async()=>({ok:false,status:401,text:async()=>'fake-secret'}),async()=>{throw new Error('fake-secret')},async()=>{throw new TypeError('fake-secret')}]){
  try{await generateChat({protocol:'deepseek',baseUrl:''},sample,'fake-secret',{fetcher});assert.fail('Expected error');}catch(error){assert(!error.message.includes('fake-secret'));}
 }
 const stopped=new AbortController();stopped.abort();let called=false;await assert.rejects(generateChat({protocol:'deepseek',baseUrl:''},sample,'fake',{signal:stopped.signal,fetcher:async()=>{called=true}}),/停止/);assert.equal(called,false);
});
test('generation prevents duplicate sends and saves one assistant reply in the original session',async()=>{
 const h=harness(),id=h.state.active,first=h.gen.generate(id);assert.equal(h.gen.busy(id),true);assert.equal(await h.gen.generate(id),false);assert.equal(h.calls,1);
 const other=newSession(h.state);h.pending.resolve({text:'<live>\nchar：你好\n</live>'});assert.equal(await first,true);assert.equal(h.state.sessions.find(s=>s.id===id).messages.length,2);assert.equal(h.state.sessions.find(s=>s.id===other.id).messages.length,0);assert.equal(h.gen.isBusy(),false);assert(h.renders.every(n=>n===id));
});
test('stop, history edit, deleted session and reset reject late replies even if transport ignores abort',async()=>{
 for(const action of ['stop','edit','delete','reset']){
  const h=harness(),id=h.state.active,waiting=h.gen.generate(id);
  if(action==='stop')h.gen.stop(id);
  if(action==='edit'){h.state.sessions[0].messages[0].text='Edited';h.gen.reconcile();}
  if(action==='delete'){h.state.sessions=[];h.gen.reconcile();}
  if(action==='reset')h.gen.reset();
  h.pending.resolve({text:'Must not be inserted'});await waiting;assert.equal(h.state.sessions.flatMap(s=>s.messages).filter(m=>m.role==='assistant').length,0);assert.equal(h.gen.isBusy(),false);
 }
});
test('quota failure keeps the received reply for retry-save without another paid request',async()=>{
 const h=harness(),id=h.state.active;h.saved=false;const waiting=h.gen.generate(id);h.pending.resolve({text:'Received text'});assert.equal(await waiting,false);assert.equal(h.state.sessions[0].messages.length,1);assert.equal(h.gen.view(id).retryLabel,'重试保存');assert.equal(h.gen.pendingText(id),'Received text');h.saved=true;assert.equal(await h.gen.retry(id),true);assert.equal(h.calls,1);assert.equal(h.state.sessions[0].messages.length,2);
});
test('network retry reuses the user message, preview sends nothing, and timeout clears busy state',async()=>{
 let attempt=0;const h=harness({request:async()=>{if(attempt++===0)throw new Error('Temporary failure');return {text:'Recovered'}}}),id=h.state.active;assert.equal(await h.gen.generate(id),false);assert.equal(await h.gen.retry(id),true);assert.equal(h.state.sessions[0].messages.filter(m=>m.role==='user').length,1);assert.equal(h.calls,2);
 const preview=harness({enabled:false,credential:()=>{throw new Error('Must not read credentials')}});assert.equal(await preview.gen.generate(preview.state.active),false);assert.equal(preview.calls,0);assert.deepEqual(preview.gen.view(preview.state.active),{});
 const timeout=harness({timeoutMs:5,request:async(_p,_c,_k,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))});await timeout.gen.generate(timeout.state.active);assert.match(timeout.gen.view(timeout.state.active).error,/超时/);assert.equal(timeout.gen.isBusy(),false);
});
test('long assistant replies survive backup normalization while user text retains its previous bound',()=>{
 const state=fixture();state.sessions[0].messages.push({id:'long-reply',role:'assistant',text:'a'.repeat(40000),time:1,model:'test-model'});const restored=normalizeState(JSON.parse(exportData(state)));assert.equal(restored.sessions[0].messages[1].text.length,40000);assert.equal(restored.sessions[0].messages[1].model,'test-model');changeMessage(restored,restored.sessions[0].messages[0].id,'edit','x'.repeat(15000));assert.equal(restored.sessions[0].messages[0].text.length,12000);
});
