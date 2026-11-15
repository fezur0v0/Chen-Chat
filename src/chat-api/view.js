import {escape} from '../ui.js';
export function generationNote(state={}){
 if(state.busy)return '<div class="chat-generation-note is-busy" role="status" aria-live="polite"><span>正在等待回复…</span><button type="button" data-action="generation-stop">停止</button></div>';
 if(!state.error&&!state.notice)return '';
 return `<div class="chat-generation-note ${state.error?'is-error':''}" role="status" aria-live="polite"><span>${escape(state.error||state.notice)}</span>${state.canRetry?`<button type="button" data-action="generation-retry">${escape(state.retryLabel||'重试')}</button>`:''}${state.hasUnsaved?'<button type="button" data-action="generation-copy">复制回复</button>':''}${state.error?'<button type="button" data-action="configure-model">API 设置</button>':''}</div>`;
}
