import {icon} from '../../icons.js';
import {avatar,backButton,escape as esc} from '../../ui.js';
import {appIcon} from '../icons.js';
import {records} from './catalog.js';

const apps={
 messages:{title:'消息',glyph:()=>icon('chat'),tone:'sage'},
 tracks:{title:'音乐',glyph:()=>appIcon('music'),tone:'rose',detail:'track'},
 searches:{title:'浏览器',glyph:()=>icon('search'),tone:'sky',detail:'search'},
 notes:{title:'备忘录',glyph:()=>icon('file'),tone:'butter',detail:'note'},
 orders:{title:'购物',glyph:()=>appIcon('shopping'),tone:'peach',detail:'order'},
 videos:{title:'视频',glyph:()=>icon('play'),tone:'blue',detail:'video'},
 posts:{title:'随记',glyph:()=>icon('list'),tone:'lilac',detail:'post'},
 films:{title:'观影',glyph:()=>icon('star'),tone:'plum',detail:'film'},
};
const details={chat:'contacts',...Object.fromEntries(Object.entries(apps).filter(([,app])=>app.detail).map(([key,app])=>[app.detail,key]))};
const record=(screen,id)=>records[details[screen]]?.find(entry=>entry.id===id);
export const validPage=(screen,id)=>Object.hasOwn(apps,screen)||Boolean(record(screen,id));
const open=(screen,id='')=>`data-phone-action="open" data-screen="${screen}" data-id="${esc(id)}"`;

export function headerView(route,wallpaperName){
 const home=route.screen==='home';
 const item=record(route.screen,route.id);
 const title=home?'查手机':apps[route.screen]?.title||item?.name||apps[details[route.screen]]?.title;
 const back=home?backButton('home','返回尘的桌面'):backButton('back','返回上一级',{actionAttribute:'data-phone-action'});
 const wallpaper=`<button class="phone-wallpaper-button" data-phone-action="wallpaper" aria-label="更换角色手机壁纸" aria-pressed="${wallpaperName==='evening'}">${appIcon('gallery')}</button>`;
 return `${back}<h1 tabindex="-1">${esc(title)}</h1>${home?wallpaper:'<span aria-hidden="true"></span>'}`;
}

function desktop(state){
 const note=records.notes[0];
 return `<section class="phone-desktop">
 <div class="phone-owner">${avatar(state,'ai')}<div><strong>${esc(state.persona.name)}的手机</strong><small>虚构预设</small></div></div>
 <div class="phone-clock"><p>11月22日 · 星期日</p><time datetime="12:38">12:38</time></div>
 <button class="phone-note-widget" ${open('note',note.id)}>
  <span class="phone-widget-icon">${icon('file')}</span><span><small>备忘录</small><strong>${esc(note.title)}</strong><span>${esc(note.blurb)}</span></span>${icon('chevron')}
 </button>
 <nav class="phone-grid" aria-label="角色手机应用">${Object.entries(apps).map(([key,app])=>`
  <button ${open(key)}><span class="phone-tile" data-tone="${app.tone}">${app.glyph()}</span><span>${app.title}</span></button>`).join('')}
 </nav></section>`;
}

function messages(tab){
 const tabs=`<nav class="phone-tabs" aria-label="消息类型">${[['chats','聊天'],['moments','动态']].map(([key,label])=>`<button data-phone-action="tab" data-tab="${key}" aria-pressed="${tab===key}">${label}</button>`).join('')}</nav>`;
 if(tab==='moments'){
  return tabs+records.moments.map(m=>`<article class="phone-card phone-moment">
  <header><span class="phone-contact">${esc(m.name[0])}</span><div><strong>${esc(m.name)}</strong><small>${esc(m.time)}</small></div></header>
  <p>${esc(m.text)}</p><div class="phone-comments">${m.comments.map(([name,text])=>`<p><b>${esc(name)}</b> ${esc(text)}</p>`).join('')}</div></article>`).join('');
 }
 return tabs+records.contacts.map(c=>{
  const message=c.messages.at(-1);
  return row('chat',c.id,c.name,message[4]?`语音 · ${message[4]}`:message[3],message[2],`<span class="phone-contact">${esc(c.mark)}</span>`);
 }).join('');
}

function chat(c,state){
 let lastDay='';
 return `<div class="phone-chat">${c.messages.map(([id,who,stamp,text,length])=>{
  const [day,time]=stamp.split(' ');
  const separator=day!==lastDay?`<p class="phone-day">${esc(day)}</p>`:'';
  lastDay=day;
  const face=who==='me'?avatar(state,'ai'):`<span class="phone-contact" title="${esc(c.name)}">${esc(c.mark)}</span>`;
  return separator+`<div class="phone-message" data-sender="${who}">${face}
   <div class="phone-message-copy"><div class="phone-bubble">${length?`<details class="phone-transcript" data-voice="${esc(id)}"><summary aria-label="语音 ${esc(length)}，查看文字">${icon('mic')}<span>语音 ${esc(length)}</span></summary><p>${esc(text)}</p></details>`:`<p>${esc(text)}</p>`}</div><small>${esc(time)}</small></div>
  </div>`;
 }).join('')}</div>`;
}

function row(page,id,title,summary='',meta='',leading=''){
 return `<button class="phone-record" ${open(page,id)}>${leading}<span class="phone-record-copy"><strong>${esc(title)}</strong>${meta?`<small>${esc(meta)}</small>`:''}${summary?`<span>${esc(summary)}</span>`:''}</span>${icon('chevron')}</button>`;
}

function list(screen){
 const items=records[screen],app=apps[screen];
 const rows=list=>list.map(item=>{
  const title=item.title||item.q||item.text;
  const meta=item.artist?`${item.artist} · ${item.time}`:item.status?`${item.date} · ${item.price} · ${item.status}`
   :item.author?`${item.author} · ${item.kind} · ${item.time}`:item.kicker?`${item.kicker} · ${item.time}`:item.meta||item.date||item.time;
  return row(app.detail,item.id,title,item.blurb||item.brief,meta,`<span class="phone-tile phone-tile-small" data-tone="${app.tone}">${app.glyph()}</span>`);
 }).join('');
 if(screen!=='searches')return rows(items);
 return [...new Set(items.map(i=>i.group))].map(group=>`<h2 class="phone-group">${esc(group)}</h2>${rows(items.filter(i=>i.group===group))}`).join('');
}

function detail(screen,item){
 const meta=item.artist?`${item.artist} · ${item.time}`:item.status?`${item.date} · ${item.price} · ${item.status}`
  :item.author?`${item.author} · ${item.time}`:item.meta||[item.kicker||item.kind||item.group,item.date||item.time].filter(Boolean).join(' · ');
 const sections=item.sections||(screen==='film'?[['人物',[item.people]],['关系',[item.bond]],['镜头与情绪',[item.shot]]]:[]);
 return `<article class="phone-paper" data-paper="${screen}">
  <small>${esc(meta)}</small><h2>${esc(item.title||item.q||item.text)}</h2>
  ${item.thought||item.note?`<p>${esc(item.thought||item.note)}</p>`:''}
  ${sections.map(([heading,paragraphs])=>`<section><h3>${esc(heading)}</h3>${paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('')}
 </article>`;
}

export function pageView(route,state){
 const {screen,id,tab}=route;
 if(screen==='home')return desktop(state);
 if(screen==='messages')return messages(tab);
 if(screen==='chat')return chat(record(screen,id),state);
 if(Object.hasOwn(apps,screen))return list(screen);
 return detail(screen,record(screen,id));
}
