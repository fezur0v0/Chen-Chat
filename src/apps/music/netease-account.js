import {neteaseAccount,neteaseCheckQr,neteaseQr,neteasePlaylists,neteasePlaylistTracks,searchNetease} from './netease.js';

const initial=()=>({query:'',songs:[],status:'',loading:false,qr:'',account:null,playlists:[],playlist:null,moreLists:false,moreSongs:false});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export function createNeteaseAccount({endpoint,refresh}){
 const ui=initial();
 let cookie='',pending,listsOffset=0,songsOffset=0;
 function reset(){
  pending?.abort();pending=null;cookie='';listsOffset=0;songsOffset=0;
  Object.assign(ui,initial());
 }
 async function run(work){
  pending?.abort();
  const request=new AbortController(),base=endpoint();
  pending=request;ui.status='';ui.loading=true;ui.qr='';refresh();
  try{await work(base,request.signal);}
  catch(error){if(!request.signal.aborted)ui.status=error.message;}
  finally{
   if(pending===request){pending=null;ui.loading=false;ui.qr='';refresh();}
  }
 }
 async function loadLists(base,signal,offset){
  const page=await neteasePlaylists(base,ui.account,cookie,offset,signal);
  if(signal.aborted)return;
  listsOffset=page.offset;ui.moreLists=page.more;
  ui.playlists=[...new Map([...(offset?ui.playlists:[]),...page.items].map(item=>[item.id,item])).values()];
  if(!ui.playlists.length)ui.status='这个账号还没有歌单。';
 }
 function login(){
  return run(async(base,signal)=>{
   const qr=await neteaseQr(base,signal);
   if(signal.aborted)return;
   ui.qr=qr.image;ui.status='用网易云音乐 App 扫码并确认登录。';refresh();
   const until=Date.now()+120000;
   while(!signal.aborted&&Date.now()<until){
    await wait(1800);
    if(signal.aborted)return;
    const result=await neteaseCheckQr(base,qr.key,signal);
    if(signal.aborted)return;
    if(result.code===800)break;
    if(result.code===802){ui.status='已扫码，请在网易云音乐确认。';refresh();}
    if(result.code===803){
     const account=await neteaseAccount(base,result.cookie,signal);
     if(signal.aborted)return;
     cookie=result.cookie;ui.account=account;ui.status='';ui.qr='';
     await loadLists(base,signal,0);return;
    }
   }
   if(!signal.aborted)ui.status='二维码已过期，可以重新生成。';
  });
 }
 function search(query){
  ui.query=query;ui.playlist=null;ui.songs=[];ui.moreSongs=false;
  if(!query){refresh();return;}
  return run(async(base,signal)=>{
   const results=await searchNetease(base,query,{cookie,signal});
   if(signal.aborted)return;
   ui.songs=results;if(!results.length)ui.status='没有找到相关歌曲。';
  });
 }
 function openPlaylist(id,more=false){
  const playlist=ui.playlists.find(item=>item.id===id);
  if(!playlist)return;
  ui.playlist=playlist;
  if(!more){ui.songs=[];ui.moreSongs=false;}
  return run(async(base,signal)=>{
   const page=await neteasePlaylistTracks(base,id,cookie,more?songsOffset:0,signal);
   if(signal.aborted)return;
   songsOffset=page.offset;ui.moreSongs=page.more;
   ui.songs=[...new Map([...(more?ui.songs:[]),...page.songs].map(item=>[item.id,item])).values()];
   if(!ui.songs.length)ui.status='这个歌单还没有歌曲。';
  });
 }
 return {ui,reset,login,search,openPlaylist,moreLists:()=>run((base,signal)=>loadLists(base,signal,listsOffset)),
  cookie:()=>cookie,
  cancel(){pending?.abort();pending=null;ui.loading=false;ui.qr='';ui.status='';refresh();}
 };
}
