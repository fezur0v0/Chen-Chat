export function normalizeMusicEndpoint(value){
 try{
  const url=new URL(value.trim());
  const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if((url.protocol!=='https:'&&!(url.protocol==='http:'&&loopback))||url.username||url.password||url.search||url.hash)return '';
  return url.href.replace(/\/+$/,'');
 }catch{return '';}
}

export function neteaseId(value){
 return /^(?:[1-9]\d{0,15})$/.test(String(value))?String(value):'';
}

function secureMedia(value){
 try{
  const url=new URL(value);
  if(!/^(?:[a-z0-9-]+\.)*music\.126\.net$/i.test(url.hostname)||url.username||url.password||url.port)return '';
  if(url.protocol==='http:')url.protocol='https:';
  return url.protocol==='https:'?url.href:'';
 }catch{return '';}
}

async function musicRequest(base,route,params={},options={}){
 const {cookie,signal,qr=false}=options;
 const endpoint=normalizeMusicEndpoint(base);
 if(!endpoint)throw new Error('请先填写网易云服务地址。');
 const timed=signal?AbortSignal.any([signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000);
 const query=cookie?{requestId:crypto.randomUUID()}:qr?{...params,requestId:crypto.randomUUID()}:params;
 const url=`${endpoint}/${route}?${new URLSearchParams(query)}`;
 const request=cookie?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...params,cookie})}:{};
 let response;
 try{
  response=await fetch(url,{...request,credentials:'omit',redirect:'error',cache:'no-store',signal:timed});
 }catch{throw new Error('无法连接网易云服务，请检查地址和跨域配置。');}
 if(!response.ok)throw new Error('网易云服务暂时无法使用，请稍后重试。');
 const data=await response.json().catch(()=>null);
 if(!data||(!qr&&(data.code??data.data?.code)!==200))throw new Error('网易云服务未返回有效结果，请稍后再试。');
 return data;
}

function tracks(songs){
 if(!Array.isArray(songs))return [];
 const seen=new Set();
 return songs.slice(0,50).flatMap(song=>{
  const id=neteaseId(song?.id);
  if(!id||seen.has(id)||typeof song.name!=='string')return [];
  seen.add(id);
  return [{id:`netease:${id}`,neteaseId:id,title:song.name.slice(0,120),
   artist:Array.isArray(song.ar)?song.ar.map(a=>a?.name).filter(a=>typeof a==='string').join(' / ').slice(0,120):'',
   duration:Number.isFinite(song.dt)?Math.max(0,song.dt/1000):0}];
 });
}

export async function searchNetease(base,query,options){
 const data=await musicRequest(base,'cloudsearch',{keywords:query,type:1,limit:20},options);
 return tracks(data.result?.songs);
}

export async function neteasePlayback(base,id,cookie){
 const data=await musicRequest(base,'song/url/v1',{id,level:'standard'},{cookie});
 const item=Array.isArray(data.data)?data.data.find(song=>String(song?.id)===id):null;
 const url=secureMedia(item?.url);
 if(!url)throw new Error('这首歌当前没有可播放的音源。');
 return {url,preview:Boolean(item.freeTrialInfo)};
}

export async function neteaseLyrics(base,id){
 const data=await musicRequest(base,'lyric',{id});
 const text=typeof data.lrc?.lyric==='string'?data.lrc.lyric:'';
 return text.slice(0,18000).split(/\r?\n/).map(line=>line.replace(/^(?:\[[^\]]*\])+/,'').trim()).filter(Boolean).join('\n');
}

export async function neteaseQr(base,signal){
 const {data}=await musicRequest(base,'login/qr/key',{}, {qr:true,signal});
 const key=data?.unikey;
 if(typeof key!=='string'||!key||key.length>256)throw new Error('生成网易云登录二维码失败。');
 const result=await musicRequest(base,'login/qr/create',{key,qrimg:'true'}, {qr:true,signal});
 const image=result.data?.qrimg;
 if(typeof image!=='string'||image.length>200000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image))throw new Error('网易云未返回可用的二维码。');
 return {key,image};
}

export async function neteaseCheckQr(base,key,signal){
 const result=await musicRequest(base,'login/qr/check',{key}, {qr:true,signal});
 const cookie=typeof result.cookie==='string'?/(?:^|;\s*)(MUSIC_U=[^;\r\n]{1,4096})(?:;|$)/.exec(result.cookie)?.[1]:'';
 if(result.code===803&&!cookie)throw new Error('登录确认后未收到网易云会话，请重试。');
 return {code:result.code,cookie};
}

export async function neteaseAccount(base,cookie,signal){
 const {data}=await musicRequest(base,'login/status',{}, {cookie,signal});
 const id=neteaseId(data?.profile?.userId);
 if(!id)throw new Error('没有读取到网易云账号，请重新扫码。');
 return {id,name:String(data.profile.nickname||'我的网易云').slice(0,120)};
}

export async function neteasePlaylists(base,account,cookie,offset,signal){
 const data=await musicRequest(base,'user/playlist',{uid:account.id,limit:50,offset},{cookie,signal});
 const items=(Array.isArray(data.playlist)?data.playlist:[]).slice(0,50);
 return {items:items.filter(item=>neteaseId(item?.id)&&typeof item.name==='string').map(item=>({id:String(item.id),title:item.name.slice(0,120)})),more:data.more===true,offset:offset+items.length};
}

export async function neteasePlaylistTracks(base,id,cookie,offset,signal){
 const data=await musicRequest(base,'playlist/track/all',{id,limit:50,offset},{cookie,signal});
 const items=Array.isArray(data.songs)?data.songs:[];
 return {songs:tracks(items),more:items.length>=50,offset:offset+items.length};
}
