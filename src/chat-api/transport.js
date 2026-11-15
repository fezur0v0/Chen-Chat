import {normalizeEndpoint,PROVIDER_PROTOCOLS} from '../provider.js';

export class ChatAPIError extends Error{}
const textParts=parts=>parts.filter(p=>p.type==='text').map(p=>p.text).join('\n\n');
function mergeTurns(messages,convert){
 const turns=[];
 for(const m of messages.filter(m=>m.role!=='system')){
  const content=m.content.map(convert).filter(Boolean),last=turns.at(-1);
  if(last?.role===m.role)last.content.push(...content);else turns.push({role:m.role,content});
 }
 return turns;
}
export function chatRequest(provider,{model,messages,maxTokens=4096},key){
 if(!PROVIDER_PROTOCOLS.includes(provider.protocol))throw new ChatAPIError('不支持这个接口类型。');
 if(!key?.trim())throw new ChatAPIError('请先在 API 设置中填写对应的密钥。');
 const base=normalizeEndpoint(provider.baseUrl,provider.protocol),system=messages.filter(m=>m.role==='system').map(m=>textParts(m.content)).join('\n\n');
 let url,body,headers={'Content-Type':'application/json'};
 if(provider.protocol==='anthropic'){
  url=base+'/messages';headers={...headers,'x-api-key':key.trim(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
  body={model,max_tokens:maxTokens,stream:false,system,messages:mergeTurns(messages,p=>p.type==='image'?{type:'image',source:{type:'base64',media_type:p.mediaType,data:p.data}}:{type:'text',text:p.text})};
 }else if(provider.protocol==='gemini'){
  url=base+'/models/'+encodeURIComponent(model.replace(/^models\//,''))+':generateContent';headers['x-goog-api-key']=key.trim();
  body={systemInstruction:{parts:[{text:system}]},contents:mergeTurns(messages,p=>p.type==='image'?{inlineData:{mimeType:p.mediaType,data:p.data}}:{text:p.text}).map(m=>({role:m.role==='assistant'?'model':'user',parts:m.content})),generationConfig:{maxOutputTokens:maxTokens}};
 }else{
  url=base+'/chat/completions';headers.Authorization=`Bearer ${key.trim()}`;
  const officialOpenAI=provider.protocol==='openai'&&new URL(base).hostname==='api.openai.com';
  body={model,stream:false,[officialOpenAI?'max_completion_tokens':'max_tokens']:maxTokens,messages:messages.map(m=>({role:m.role,content:m.content.some(p=>p.type==='image')?m.content.map(p=>p.type==='image'?{type:'image_url',image_url:{url:`data:${p.mediaType};base64,${p.data}`}}:{type:'text',text:p.text}):textParts(m.content)}))};
 }
 return {url,headers,body};
}
export function chatResponse(protocol,body){
 let text='',reason='',model=typeof body?.model==='string'?body.model.slice(0,200):'';
 if(protocol==='anthropic'){text=(Array.isArray(body?.content)?body.content:[]).filter(p=>p.type==='text').map(p=>p.text||'').join('\n');reason=body?.stop_reason;}
 else if(protocol==='gemini'){
  const candidate=body?.candidates?.[0];text=(Array.isArray(candidate?.content?.parts)?candidate.content.parts:[]).filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('');reason=candidate?.finishReason;
  if(!text&&body?.promptFeedback?.blockReason)throw new ChatAPIError('服务方未返回回复，请调整消息内容后重试。');
 }else{
  const choice=body?.choices?.[0],content=choice?.message?.content;
  text=typeof content==='string'?content:Array.isArray(content)?content.filter(p=>p.type==='text').map(p=>p.text||'').join(''):choice?.message?.refusal||'';reason=choice?.finish_reason;
 }
 if(typeof text!=='string'||!text.trim())throw new ChatAPIError(['length','max_tokens','MAX_TOKENS'].includes(reason)?'回复达到了长度限制但没有正文，请提高预设的回复上限或换一个模型。':'模型没有返回可显示的文字，请检查模型能力或稍后重试。');
 const wrapped=/^```(?:text|xml|html)?\s*\n(<live>[\s\S]*<\/live>)\s*```$/i.exec(text.trim());text=(wrapped?.[1]||text).trim();
 if(text.length>60000)throw new ChatAPIError('回复超过单条消息容量，请降低回复上限后重试。');
 return {text,model,limited:['length','max_tokens','MAX_TOKENS'].includes(reason)};
}
export async function generateChat(provider,context,key,{signal,fetcher=globalThis.fetch}={}){
 const request=chatRequest(provider,context,key);
 try{
  if(signal?.aborted)throw new ChatAPIError('请求已停止。');
  const response=await fetcher(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(request.body),signal,credentials:'omit',redirect:'error',cache:'no-store'});
  if(!response.ok)throw new ChatAPIError(({400:'请求参数或模型能力不匹配，请检查模型 ID、图片支持和回复上限。',401:'密钥无效或已过期，请重新填写。',403:'服务方拒绝访问，请检查密钥权限和地区限制。',404:'找不到对话接口或模型，请检查基础地址和模型 ID。',413:'这次消息或图片过大，请减少附件后重试。',429:'请求过于频繁或额度受限，请稍后手动重试。'})[response.status]||`服务暂时不可用（HTTP ${response.status}），请稍后手动重试。`);
  const body=await response.json();if(signal?.aborted)throw new ChatAPIError('请求已停止。');
  return chatResponse(provider.protocol,body);
 }catch(error){
  if(signal?.aborted)throw new ChatAPIError('请求已停止。');
  if(error instanceof SyntaxError)throw new ChatAPIError('服务返回的内容不是有效 JSON，请检查接口地址。');
  if(error instanceof TypeError)throw new ChatAPIError('无法连接服务，请检查网络、基础地址及服务方的跨域访问支持（CORS）。');
  if(error instanceof ChatAPIError)throw error;throw new ChatAPIError('服务请求失败，请稍后手动重试。');
 }
}
