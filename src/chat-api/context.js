import {selectedModels} from '../provider.js';
import {promptOrder} from '../apps/presets/model.js';

export const LIVE_OUTPUT_FORMAT=`【尘 App 正文格式】
你在和用户对话。默认的手机聊天写进 <live> 与 </live> 之间；若需要现实中的动作、环境等叙述，写在标签外。可以交替使用。不要用 Markdown 代码围栏包裹整条回复，不要输出 HTML、CSS 或脚本。
<live> 内每条新消息另起一行，以 char：开头，char 是你扮演的角色。消息内换行不重复前缀。不要用角色名字代替 char。不要替用户编造台词、决定或操作。
仅当用户明确要求测试双侧消息，或以“$线上聊天：”指示发送某条消息时，才能用 user：复现其明确给定的内容；不要自行扩展用户的发言。
支持以下写法，多个字段用 | 分隔：
char：普通文字
char：[语音] 语音的文字内容|6秒
char：[图片] 图片描述
char：[转账] 52|备注
char：[转账] 52|备注|已收款（或已退还）
char：[引用] 被引用原话|回复内容
user：[拉黑] 用户明确给出的消息
下列内容单独成行、不加发送人：[时间] 时间、[系统] 提示、[拍一拍] 文本、[撤回] 文本。
[已读] 单独成行，放在对应 user 消息之后。
不要生成尚不支持的定位、音乐、链接、红包等卡片。不要输出头像地址或图片网址；图片和语音类型仅表达剧情中的描述／文字，不表示真实图片生成或语音合成。
例：
<live>
char：到家了吗？
char：[语音] 外面有点凉，记得带外套。|5秒
</live>
收到的附件若只有文件名或“无转写”说明，就没有对应文件内容，不能假装已经读取。`;

export function configuredModel(provider,session={}){
 const models=selectedModels(provider);
 return models.includes(session.model)?session.model:provider.model?.trim()||'';
}
export function historyStamp(session){
 return JSON.stringify([session.messages.length,...session.messages.slice(-40).map(m=>[m.id,m.role,m.text,m.replyTo?.text,(m.attachments||[]).map(a=>[a.id,a.data?.length,a.voice?.transcript])])]);
}
const imagePattern=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
function messageContent(message,images){
 const parts=[],notes=[];
 if(message.replyTo?.text)notes.push(`【引用 ${message.replyTo.author||'对方'} 的消息】${message.replyTo.text}`);
 if(message.text?.trim())notes.push(message.text);
 for(const a of message.attachments||[]){
  if(a.kind==='voice'){notes.push(a.voice?.transcript?`【语音转写】${a.voice.transcript}`:'【用户发送了语音，但没有文字转写；当前无法读取音频内容】');continue;}
  if(a.kind==='sticker'){notes.push(`【表情包描述】${a.note||a.name||'未提供描述'}`);continue;}
  const image=message.role==='user'&&typeof a.data==='string'&&a.data.length<1200000?imagePattern.exec(a.data):null;
  if(image&&images.remaining>0){images.remaining--;parts.push({type:'image',mediaType:`image/${image[1]}`,data:image[2]});}
  else notes.push(image?'【较早的图片未附入本次上下文】':`【附件名称】${a.name||'文件'}（未提供可读取的文件内容）`);
 }
 if(notes.length)parts.unshift({type:'text',text:notes.join('\n\n')});
 return parts.length?parts:[{type:'text',text:'（空消息）'}];
}
export function buildChatContext(state,sessionId){
 const session=state.sessions.find(s=>s.id===sessionId);if(!session)throw new Error('这段会话已不存在。');
 const model=configuredModel(state.provider,session);if(!model)throw new Error('请先在 API 设置中选择默认模型并保存。');
 const preset=state.promptPresets?.find(p=>p.id===state.activePromptPreset),raw=preset?.raw;
 const user=state.home?.userName||'用户',char=state.persona?.name||'角色';
 const expand=value=>String(value||'').replace(/\{\{\s*(char|user)\s*\}\}/gi,(_,key)=>key.toLowerCase()==='char'?char:user);
 const images={remaining:6};let chars=0;
 // Select recent context from the end, so recent messages/images win the budget.
 const history=[];
 for(const message of session.messages.slice(-40).reverse()){
  const content=messageContent(message,images),length=content.reduce((n,p)=>n+(p.text?.length||0),0);
  if(chars+length>60000&&history.length)break;
  chars+=length;history.unshift({role:message.role==='assistant'?'assistant':'user',content});
 }
 if(!history.length||history.at(-1).role!=='user')throw new Error('请先发送一条用户消息，再生成回复。');
 const before=[],injections=[];let hasHistory=false;
 for(const [index,item]of (preset?promptOrder(preset):[]).entries()){
  if(item.enabled===false)continue;
  const prompt=raw.prompts.find(p=>p.identifier===item.identifier);if(!prompt)continue;
  if(prompt.marker){if(prompt.identifier==='chatHistory'&&!hasHistory){before.push({history:true});hasHistory=true;}continue;}
  const content=expand(prompt.content).trim();if(!content)continue;
  const message={role:['system','user','assistant'].includes(prompt.role)?prompt.role:'system',content:[{type:'text',text:content}]};
  if(Number(prompt.injection_position)===1)injections.push({message,index,depth:Math.max(0,Math.min(100,Number(prompt.injection_depth)||0)),order:Number(prompt.injection_order)||0});
  else before.push(message);
 }
 const augmented=[];
 for(let i=0;i<=history.length;i++){
  augmented.push(...injections.filter(p=>Math.max(0,history.length-p.depth)===i).sort((a,b)=>a.order-b.order||a.index-b.index).map(p=>p.message));
  if(i<history.length)augmented.push(history[i]);
 }
 const identity=`角色称呼：${char}\n用户称呼：${user}${state.persona?.prompt?.trim()?`\n角色设定：\n${expand(state.persona.prompt)}`:''}`;
 const messages=[{role:'system',content:[{type:'text',text:identity+'\n\n'+LIVE_OUTPUT_FORMAT}]},...before.flatMap(m=>m.history?augmented:[m]),...(!hasHistory?augmented:[])];
 const promptChars=messages.reduce((sum,m)=>sum+m.content.reduce((n,p)=>n+(p.text?.length||0),0),0);
 if(promptChars>100000)throw new Error('角色设定或预设过长，请精简后再发送。');
 const tokenValue=Number(raw?.openai_max_tokens);
 return {model,messages,maxTokens:Number.isFinite(tokenValue)&&tokenValue>0?Math.min(8192,Math.floor(tokenValue)):4096};
}
