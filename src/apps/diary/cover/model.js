export const DIARY_OWNERS=['self','partner'];
export const diaryOwner=value=>value==='partner'?'partner':'self';
export const diaryRole=value=>diaryOwner(value)==='self'?'我的日记':'TA 的日记';
export const emptyDiaryCover=()=>Object.fromEntries(DIARY_OWNERS.map(owner=>[owner,{name:'',signature:'',avatar:'',portrait:''}]));
const text=(value,limit)=>typeof value==='string'?value.trim().slice(0,limit):'';
export function coverImage(value){return typeof value==='string'&&value.length<=900000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)?value:'';}
export function normalizeDiaryCover(value){
 return Object.fromEntries(DIARY_OWNERS.map(owner=>{const p=value?.[owner]||{};return [owner,{name:text(p.name,40),signature:text(p.signature,160),avatar:coverImage(p.avatar),portrait:coverImage(p.portrait)}];}));
}
export function saveDiaryCover(state,value){state.diaryCover=normalizeDiaryCover(value);return state.diaryCover;}

// Keep transparent portraits transparent; no white JPEG backing is added.
export async function readCoverImage(file,kind){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('请选择 PNG、JPG 或 WebP 图片。');
 if(file.size>15*1024*1024)throw new Error('图片超过 15MB，请先缩小后再试。');
 const url=URL.createObjectURL(file);
 try{
  const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('这张图片无法读取。'));img.src=url;});
  let edge=kind==='avatar'?256:1280;
  for(let attempt=0;attempt<4;attempt++){
   const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   const value=canvas.toDataURL('image/webp',.88-attempt*.06);
   if(coverImage(value))return value;
   edge=Math.floor(edge*.75);
  }
  throw new Error('这张图片仍然过大，请先压缩后再试。');
 }finally{URL.revokeObjectURL(url);}
}
