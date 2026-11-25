import {headerView,pageView,validPage} from './view.js';

const home=()=>({screen:'home',tab:'chats',y:0});

export function createPhoneApp({app,getState,persist}){
 const root=document.createElement('div');
 root.className='phone-surface';
 root.innerHTML='<header class="desktop-app-header app-topbar"></header><div class="phone-scroll"></div><footer class="phone-foot"><button data-phone-action="desktop" aria-label="返回角色的手机桌面"></button></footer>';
 const header=root.querySelector('header'),scroll=root.querySelector('.phone-scroll');
 let stack=[home()];
 const transcripts=new Set();

 function paint(focus=false){
  const route=stack.at(-1);
  const state=getState();
  root.dataset.screen=route.screen;
  root.dataset.wallpaper=state.phoneWallpaper;
  header.innerHTML=headerView(route,state.phoneWallpaper);
  scroll.innerHTML=pageView(route,state);
  for(const entry of scroll.querySelectorAll('[data-voice]'))entry.open=transcripts.has(entry.dataset.voice);
  scroll.scrollTop=route.y??scroll.scrollHeight;
  if(focus)header.querySelector('h1').focus({preventScroll:true});
 }
 function desktop(){
  stack=[home()];
  paint(true);
 }
 root.addEventListener('toggle',event=>{
  const {voice}=event.target.dataset;
  if(!voice)return;
  if(event.target.open)transcripts.add(voice);
  else transcripts.delete(voice);
 },true);
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-phone-action]');
  if(!button)return;
  const {phoneAction,screen,id,tab}=button.dataset;
  const route=stack.at(-1);
  switch(phoneAction){
   case 'wallpaper': {
    const state=getState(),previous=state.phoneWallpaper;
    state.phoneWallpaper=previous==='evening'?'black':'evening';
    if(!persist())state.phoneWallpaper=previous;
    root.dataset.wallpaper=state.phoneWallpaper;
    button.setAttribute('aria-pressed',String(state.phoneWallpaper==='evening'));
    break;
   }
   case 'desktop':desktop();break;
   case 'back':
    if(stack.length>1){stack.pop();paint(true);}
    break;
   case 'tab':
    route.tab=tab;route.y=0;paint();
    scroll.querySelector('[aria-pressed=true]')?.focus({preventScroll:true});
    break;
   case 'open':
    if(!validPage(screen,id))return;
    route.y=scroll.scrollTop;
    stack.push({screen,id,tab:'chats',y:screen==='chat'?null:0});
    paint(true);
    break;
  }
 });
 return {
  openHome(){stack=[home()];},
  sync(){
   const slot=app.querySelector('[data-app-page=app-phone]');
   if(!slot||slot.contains(root))return;
   slot.append(root);paint();
  }
 };
}
