import {escape} from './ui.js';

const SECRET_KEY='chenxin.api-credential.v1';
const defaults={openai:'https://api.openai.com/v1',deepseek:'https://api.deepseek.com',anthropic:'https://api.anthropic.com/v1',gemini:'https://generativelanguage.googleapis.com/v1beta'};
export const PROVIDER_PROTOCOLS=Object.freeze(Object.keys(defaults));
let volatileCredential=null;
const modelLists=new WeakMap(),selections=new WeakMap();

export function selectedModels(provider){
 return [...new Set([provider.model,...(Array.isArray(provider.models)?provider.models:[])].filter(id=>typeof id==='string'&&id.trim()&&id.length<=200))].slice(0,500);
}

export function providerChoices(provider,current){
 const models=selectedModels({...provider,models:[...(provider.models||[]),current]});
 return models.length?models.map(id=>`<button class="model-choice" data-action="select-model" data-model="${escape(id)}"><span>${escape(id)}<small>${id===(current||provider.model)?'当前选择':id===provider.model?'默认模型':'常用模型'} · 对话尚未接入</small></span></button>`).join(''):'<p class="hint">还没有配置模型。</p>';
}

function openModelPicker(form){
 const dialog=document.createElement('dialog');
 dialog.className='glass provider-picker';
 dialog.setAttribute('aria-labelledby','provider-picker-title');
 const selected=new Set(selections.get(form)||[]);let current=form.elements.model.value.trim();
 if(current)selected.add(current);
 const available=[...new Set([...selected,...(modelLists.get(form)||[])])];
 dialog.innerHTML=`<header><div><p class="provider-eyebrow">MODEL LIBRARY</p><h2 id="provider-picker-title">选择常用模型</h2></div><button type="button" data-picker-close aria-label="关闭模型选择">×</button></header><p class="hint">可以多选，再为其中一个设为默认。完成后记得保存配置。</p><label class="field"><span>搜索或添加模型 ID</span><input type="search" data-picker-search placeholder="搜索模型…" autocomplete="off"></label><div class="provider-picker-tools"><span data-picker-count role="status" aria-live="polite"></span><button type="button" data-picker-add>添加此模型</button></div><div class="provider-picker-list"></div><footer><button type="button" data-picker-close>取消</button><button type="button" class="primary" data-picker-done>完成选择</button></footer>`;
 const list=dialog.querySelector('.provider-picker-list'),search=dialog.querySelector('[data-picker-search]');
 const draw=()=>{
  const matches=available.filter(id=>id.toLowerCase().includes(search.value.trim().toLowerCase()));
  list.innerHTML=matches.length?matches.map(id=>`<div class="provider-picker-row ${selected.has(id)?'is-selected':''}"><label><input type="checkbox" data-picker-model value="${escape(id)}" ${selected.has(id)?'checked':''}><span>${escape(id)}</span></label><button type="button" data-picker-default="${escape(id)}" aria-pressed="${current===id}">${current===id?'默认':'设为默认'}</button></div>`).join(''):'<p class="hint provider-picker-empty">没有找到模型。可以先检测列表，或输入 ID 手动添加。</p>';
  dialog.querySelector('[data-picker-count]').textContent=`已选 ${selected.size} 个 · 共 ${available.length} 个`;
 };
 const dismiss=()=>dialog.close();
 dialog.addEventListener('close',()=>{dialog.remove();if(form.isConnected)form.querySelector('[data-provider-picker]')?.focus({preventScroll:true});});
 dialog.addEventListener('click',event=>{
  if(event.target.closest('[data-picker-close]'))return dismiss();
  if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dismiss();return;}
  const choice=event.target.closest('[data-picker-default]');
  if(choice){current=choice.dataset.pickerDefault;selected.add(current);draw();return;}
  if(event.target.closest('[data-picker-add]')){
   const id=search.value.trim();if(!id||id.length>200)return;
   if(!available.includes(id))available.unshift(id);selected.add(id);if(!current)current=id;search.value='';draw();return;
  }
  if(event.target.closest('[data-picker-done]')){
   selections.set(form,[...selected]);form.elements.model.value=selected.has(current)?current:[...selected][0]||'';
   form.querySelector('[data-provider-selection]').textContent=selected.size?`已选择 ${selected.size} 个常用模型`:'尚未选择常用模型';
   dismiss();
  }
 });
 dialog.addEventListener('change',event=>{
  if(!event.target.matches('[data-picker-model]'))return;
  const id=event.target.value;
  if(event.target.checked)selected.add(id);else selected.delete(id);
  if(!selected.has(current))current=[...selected][0]||'';
  draw();
 });
 search.addEventListener('input',draw);
 document.body.append(dialog);draw();dialog.showModal();search.focus();
}

export function normalizeEndpoint(value,protocol='openai'){
 const url=new URL(value.trim()||defaults[protocol]);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('请填写不含账号、密钥、查询参数的 HTTPS 基础地址。');
 url.pathname=url.pathname.replace(/\/+$/,'');
 if(/\/(models|messages|chat\/completions)$/.test(url.pathname))throw new Error('请填写基础地址，不要填写 models 或聊天请求的完整路径。');
 if(!url.pathname||url.pathname==='/')url.pathname=protocol==='deepseek'?'':protocol==='gemini'?'/v1beta':'/v1';
 return url.href.replace(/\/+$/,'');
}

export function credentialFor(provider,storage=globalThis.localStorage){
 try{
  const item=volatileCredential||JSON.parse(storage.getItem(SECRET_KEY)||'null');
  if(item?.protocol===provider.protocol&&item?.baseUrl===normalizeEndpoint(provider.baseUrl,provider.protocol))return item;
 }catch{}
 return null;
}

export function storeCredential(provider,key,remember,storage=globalThis.localStorage){
 const item={protocol:provider.protocol,baseUrl:normalizeEndpoint(provider.baseUrl,provider.protocol),key};
 // Credentials live separately from app state and are never part of backups.
 if(remember)storage.setItem(SECRET_KEY,JSON.stringify({...item,remember:true}));
 else storage.removeItem(SECRET_KEY);
 volatileCredential={...item,remember};
}

export async function detectModels(provider,key,{fetcher=globalThis.fetch,signal}={}){
 const base=normalizeEndpoint(provider.baseUrl,provider.protocol);
 if(!key.trim())throw new Error('请先填写 API 密钥。');
 const headers=provider.protocol==='gemini'?{'x-goog-api-key':key.trim()}:provider.protocol==='anthropic'?{'x-api-key':key.trim(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'}:{Authorization:`Bearer ${key.trim()}`};
 const models=[],seen=new Set();let cursor='';
 try{
  for(let page=0;page<20;page++){
   const url=new URL(base+'/models');
   if(provider.protocol==='gemini'){url.searchParams.set('pageSize','1000');if(cursor)url.searchParams.set('pageToken',cursor);}
   if(provider.protocol==='anthropic'){url.searchParams.set('limit','1000');if(cursor)url.searchParams.set('after_id',cursor);}
   const response=await fetcher(url.href,{headers,signal,redirect:'error',credentials:'omit',cache:'no-store'});
   if(!response.ok)throw new Error(({401:'密钥无效或已过期。',403:'服务商拒绝访问，请检查密钥权限和地区限制。',404:'找不到模型列表接口，请检查基础地址；也可手动填写模型 ID。',429:'请求过于频繁或额度受限，请稍后再试。'})[response.status]||`服务返回 HTTP ${response.status}，请稍后再试。`);
   const body=await response.json(),items=provider.protocol==='gemini'?body.models:body.data;
   if(!Array.isArray(items))throw new Error('返回的内容不是模型列表，请检查接口类型和基础地址。');
   for(const item of items){
    const id=provider.protocol==='gemini'?item?.name?.replace(/^models\//,''):item?.id;
    if(typeof id==='string'&&id&&id.length<=200&&!seen.has(id)){seen.add(id);models.push(id);}
   }
   const next=provider.protocol==='gemini'?body.nextPageToken:provider.protocol==='anthropic'&&body.has_more?body.last_id:'';
   if(!next||next===cursor)break;cursor=next;
   if(page===19)throw new Error('模型列表分页过多，请手动填写模型 ID。');
  }
  return models.sort((a,b)=>a.localeCompare(b));
 }catch(error){
  if(signal?.aborted)throw new Error('检测超时或已取消，请检查网络后重试。');
  if(error instanceof TypeError)throw new Error('无法访问服务：请检查网络、地址，以及服务商是否允许浏览器跨域访问（CORS）。');
  if(error instanceof SyntaxError)throw new Error('服务返回的内容不是有效 JSON。');
  throw error;
 }
}

export function providerForm(provider){
 const credential=credentialFor(provider);
 return `<form id="provider-form">
 <label class="field"><span>接口类型</span><select name="protocol">${Object.entries({openai:'OpenAI 兼容',deepseek:'DeepSeek',anthropic:'Anthropic',gemini:'Google Gemini'}).map(([id,name])=>`<option value="${id}" ${provider.protocol===id?'selected':''}>${name}</option>`).join('')}</select></label>
 <label class="field"><span>API 基础地址</span><input type="url" name="baseUrl" value="${escape(provider.baseUrl)}" placeholder="${escape(defaults[provider.protocol]||defaults.openai)}" autocomplete="off"></label>
 <label class="field"><span>API 密钥</span><input type="password" name="apiKey" value="${escape(credential?.key||'')}" autocomplete="off" spellcheck="false"></label>
 <label class="provider-remember"><input type="checkbox" name="rememberKey" ${credential?.remember?'checked':''}><span>在此设备记住密钥</span></label>
 <p class="hint">默认仅本次打开使用；勾选后保存在此设备，未加密，不会随聊天备份导出。只向你填写的服务地址发送密钥。</p>
 <button type="button" class="primary" data-provider-detect>检测模型列表</button>
 <p class="hint" role="status" aria-live="polite" data-provider-status>检测只读取模型列表，不发送聊天内容；不代表每个模型都能生成回复。</p>
 <button type="button" class="provider-model-trigger" data-provider-picker data-selected-models="${escape(JSON.stringify(selectedModels(provider)))}" aria-haspopup="dialog"><span><strong>常用模型</strong><small data-provider-selection>${selectedModels(provider).length?`已选择 ${selectedModels(provider).length} 个常用模型`:'点击选择，可多选'}</small></span><span aria-hidden="true">＋</span></button>
 <label class="field"><span>默认模型 ID</span><input name="model" maxlength="200" value="${escape(provider.model)}" placeholder="在弹窗中指定，或手动填写" autocomplete="off"></label>
 <p class="hint">使用中转站时请选择它要求的接口类型，例如 OpenAI 兼容，而不是按模型品牌选择。</p>
 <button class="primary" type="submit">保存配置</button>
 <p class="hint">本次接入配置和模型检测；对话发送仍为本机预览。</p></form>`;
}

export function bindProvider(root,{getState,persist,notify}){
 let active=null;
 const status=(form,message)=>{const el=form.querySelector('[data-provider-status]');if(el)el.textContent=message;};
 root.addEventListener('change',event=>{
  const select=event.target;if(!select.matches('#provider-form select[name=protocol]')||select.disabled)return;
  const form=select.form,protocol=select.value;if(!PROVIDER_PROTOCOLS.includes(protocol))return;
  active?.abort();
  const current=form.elements.baseUrl.value.trim().replace(/\/+$/,'');
  const official=Object.values(defaults).some(url=>current===url||current===new URL(url).origin)||current==='https://api.deepseek.com/v1';
  if(!current||official)form.elements.baseUrl.value=defaults[protocol];
  form.elements.baseUrl.placeholder=defaults[protocol];
  modelLists.delete(form);selections.set(form,[]);form.elements.model.value='';
  const picker=form.querySelector('[data-provider-picker]');picker.dataset.selectedModels='[]';
  form.querySelector('[data-provider-selection]').textContent='点击选择，可多选';
  const credential=credentialFor({protocol,baseUrl:form.elements.baseUrl.value});
  form.elements.apiKey.value=credential?.key||'';form.elements.rememberKey.checked=credential?.remember===true;
  status(form,'接口类型已切换，请填写对应密钥，再检测或手动选择模型；保存前原配置保持不变。');
 });
 const read=form=>{
  const data=new FormData(form),protocol=String(data.get('protocol'));
  const model=String(data.get('model')).trim(),models=selectedModels({model,models:selections.get(form)||JSON.parse(form.querySelector('[data-provider-picker]').dataset.selectedModels)});
  return {provider:{protocol,baseUrl:normalizeEndpoint(String(data.get('baseUrl')),protocol),model,models},key:String(data.get('apiKey')).trim(),remember:data.has('rememberKey')};
 };
 root.addEventListener('submit',event=>{
  const form=event.target;if(form.id!=='provider-form')return;
  event.preventDefault();event.stopImmediatePropagation();
  try{
   const {provider,key,remember}=read(form);
   if(!provider.model)throw new Error('请选择或手动填写默认模型 ID。');
   const state=getState(),previous=state.provider;
   state.provider=provider;if(!persist()){state.provider=previous;return;}
   storeCredential(provider,key,remember);
   form.elements.baseUrl.value=provider.baseUrl;
   status(form,'配置已保存。密钥不会包含在聊天备份中。');notify('API 配置已保存。');
  }catch(error){status(form,error.message);}
 },true);
 root.addEventListener('click',async event=>{
  const picker=event.target.closest('[data-provider-picker]');
  if(picker){const form=picker.closest('form');if(!selections.has(form))selections.set(form,JSON.parse(picker.dataset.selectedModels));openModelPicker(form);return;}
  const button=event.target.closest('[data-provider-detect]');if(!button)return;
  const form=button.closest('form');active?.abort();active=new AbortController();
  const controller=active,timer=setTimeout(()=>controller.abort(),20000);
  button.disabled=true;button.textContent='正在检测…';form.setAttribute('aria-busy','true');
  const fields=[...form.querySelectorAll('input,select,button[type=submit]')];
  try{
   const {provider,key}=read(form);fields.forEach(el=>el.disabled=true);
   status(form,'正在向指定服务读取模型列表…');
   const models=await detectModels(provider,key,{signal:controller.signal});
   if(!form.isConnected)return;
   modelLists.set(form,models);
   status(form,models.length?`检测到 ${models.length} 个模型。打开「常用模型」多选，再保存配置。`:'接口可访问，但没有返回模型；可手动添加模型 ID 后保存。');
  }catch(error){if(form.isConnected)status(form,error.message);}
  finally{clearTimeout(timer);fields.forEach(el=>el.disabled=false);button.disabled=false;button.textContent='检测模型列表';form.removeAttribute('aria-busy');}
 });
}
