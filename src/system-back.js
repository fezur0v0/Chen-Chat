// Android Back follows the same close / back controls as the visible UI.
export function createBackNavigation({app,getPage,goHome,doc=app.ownerDocument}){
 let serial=0;const order=new WeakMap();
 const remember=()=>{for(const dialog of doc.querySelectorAll('dialog[open]'))if(!order.has(dialog))order.set(dialog,++serial);};
 remember();
 const observe=records=>{for(const record of records)if(record.type==='attributes'&&record.target.tagName==='DIALOG'){if(record.target.open)order.set(record.target,++serial);else order.delete(record.target);}remember();};
 const observer=new MutationObserver(observe);observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 const visible=node=>node&&!node.disabled&&node.getClientRects().length&&!node.closest('[hidden],[inert]');
 const click=selector=>{const button=[...app.querySelectorAll(selector)].find(visible);if(!button)return false;button.click();return true;};
 function escape(target){const event=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true});target.dispatchEvent(event);return event.defaultPrevented;}
 function back(){
  observe(observer.takeRecords());
  const dialogs=[...doc.querySelectorAll('dialog[open]')].sort((a,b)=>(order.get(a)||0)-(order.get(b)||0)),dialog=dialogs.at(-1);
  if(dialog){
   const active=dialog.contains(doc.activeElement)?doc.activeElement:dialog;
   if(escape(active)||!dialog.open)return true;
   const cancel=new Event('cancel',{cancelable:true});dialog.dispatchEvent(cancel);
   if(!cancel.defaultPrevented&&dialog.open)dialog.close();
   return true;
  }
  if(click('[data-note-format-close]'))return true;
  if(click('[data-gallery-action="close-select"]'))return true;
  if(click('[data-home-action="done"]'))return true;
  // Preserve existing Escape handling for trays, quote drafts and canvas tools.
  const target=app.contains(doc.activeElement)?doc.activeElement:app;
  if(escape(target))return true;
  const headerBack=app.querySelector('.app-topbar .nav-back');
  if(headerBack&&headerBack.getClientRects().length){if(!headerBack.disabled)headerBack.click();return true;}
  if(getPage()!=='home'){goHome();return true;}
  return false;
 }
 return {back,destroy:()=>observer.disconnect()};
}

export async function connectAndroidBack({capacitor=globalThis.Capacitor,back,onError=()=>{}}){
 if(!capacitor||capacitor.getPlatform?.()!=='android')return {connected:false,reason:'not-android'};
 const nativeApp=capacitor.Plugins?.App;
 if(!nativeApp?.addListener)return {connected:false,reason:'missing-app-plugin'};
 let busy=false;
 try{
  const listener=await nativeApp.addListener('backButton',async()=>{
   if(busy)return;busy=true;
   try{if(!back())await nativeApp.minimizeApp();}
   catch{onError();}
   finally{busy=false;}
  });
  return {connected:true,remove:()=>listener.remove()};
 }catch{onError();return {connected:false,reason:'registration-failed'};}
}

export async function bindAndroidBack(options){
 if(globalThis.Capacitor?.getPlatform?.()!=='android')return {connected:false,reason:'not-android'};
 const navigation=createBackNavigation(options);
 const result=await connectAndroidBack({back:navigation.back,onError:options.onError});
 if(!result.connected)navigation.destroy();
 return {...result,destroy(){navigation.destroy();return result.remove?.();}};
}
