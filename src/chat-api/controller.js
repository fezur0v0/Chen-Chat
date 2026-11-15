import {credentialFor} from '../provider.js';
import {buildChatContext,historyStamp} from './context.js';
import {generateChat} from './transport.js';

export function createChatGeneration({getState,setState,persist,render,enabled=true,request=generateChat,credential=credentialFor,timeoutMs=180000}){
 const jobs=new Map(),outcomes=new Map();
 const session=id=>getState().sessions.find(s=>s.id===id);
 function valid(id,stamp){const s=session(id);return s&&historyStamp(s)===stamp;}
 function reconcile(){
  for(const [id,job]of jobs)if(!valid(id,job.stamp)){jobs.delete(id);job.controller.abort();}
  for(const [id,value]of outcomes)if(!valid(id,value.stamp))outcomes.delete(id);
 }
 function view(id){
  if(!enabled)return {};
  const job=jobs.get(id),value=outcomes.get(id),s=session(id);
  if(job)return {busy:true,model:job.model};
  if(value)return {error:value.error||'',notice:value.notice||'',canRetry:!value.notice,retryLabel:value.pending?'重试保存':value.stopped?'重新生成':'重试',hasUnsaved:!!value.pending};
  return s?.messages.at(-1)?.role==='user'?{notice:'这条消息还没有 AI 回复。',canRetry:true,retryLabel:'生成回复'}:{};
 }
 function saveReply(id,result,stamp){
  if(!valid(id,stamp))return false;
  const snapshot=structuredClone(getState()),s=session(id);
  const message=result.message||{id:crypto.randomUUID(),role:'assistant',text:result.text,time:Date.now(),status:'local',model:result.model||result.requestedModel,attachments:[]};
  s.messages.push(message);
  try{if(!persist())throw new Error('save failed');}
  catch{
   setState(snapshot);outcomes.set(id,{stamp,pending:{...result,message},error:'回复已生成，但本机没有保存成功。可以重试保存或先复制回复。'});render(id);return false;
  }
  if(result.limited)outcomes.set(id,{stamp:historyStamp(session(id)),notice:'这次回复达到了模型的长度上限，可能尚未说完。'});else outcomes.delete(id);
  render(id);return true;
 }
 async function generate(id){
  if(!enabled||jobs.has(id))return false;
  const s=session(id);if(!s||s.messages.at(-1)?.role!=='user')return false;
  const stamp=historyStamp(s);let context,provider,key;
  try{
   provider=structuredClone(getState().provider);context=buildChatContext(getState(),id);key=credential(provider)?.key;
   if(!key?.trim())throw new Error('请先在 API 设置中填写当前厂商和地址对应的密钥，再重试。');
  }catch(error){outcomes.set(id,{stamp,error:error.message});render(id);return false;}
  const controller=new AbortController(),job={controller,stamp,model:context.model,timedOut:false};
  jobs.set(id,job);outcomes.delete(id);render(id);
  const timer=setTimeout(()=>{job.timedOut=true;controller.abort();},timeoutMs);
  try{
   const result=await request(provider,context,key,{signal:controller.signal});
   if(jobs.get(id)!==job)return false;
   if(!valid(id,stamp)){jobs.delete(id);render(id);return false;}
   if(controller.signal.aborted)throw new Error('请求已停止。');
   jobs.delete(id);return saveReply(id,{...result,requestedModel:context.model},stamp);
  }catch(error){
   if(jobs.get(id)!==job)return false;
   jobs.delete(id);
   if(valid(id,stamp))outcomes.set(id,{stamp,error:job.timedOut?'等待回复超时，可以稍后手动重试。':error.message||'生成失败，请稍后手动重试。'});
   render(id);return false;
  }finally{clearTimeout(timer);}
 }
 function stop(id){const job=jobs.get(id);if(!job)return;jobs.delete(id);job.controller.abort();outcomes.set(id,{stamp:job.stamp,stopped:true,error:'已停止等待这次回复。'});render(id);}
 function retry(id){
  const value=outcomes.get(id);
  if(value?.pending){if(!valid(id,value.stamp))return false;return saveReply(id,value.pending,value.stamp);}
  return generate(id);
 }
 return {generate,retry,stop,view,reconcile,isBusy:()=>jobs.size>0,busy:id=>jobs.has(id),pendingText:id=>outcomes.get(id)?.pending?.text||'',reset(){for(const job of jobs.values())job.controller.abort();jobs.clear();outcomes.clear();}};
}
