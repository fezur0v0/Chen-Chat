// A small, bounded document format. Never trust imported HTML or editor attributes.
const marks=new Set(['bold','italic','underline','strike']);
export const NOTE_SIZES=[16,18,20,24,36,48,64,72];
export const NOTE_COLORS=['#3e3e3e','#e5484d','#f28c28','#d9a400','#2e9b61','#2ba9d4','#273a8b'];
export const NOTE_HIGHLIGHT='#f6e38a';
export const noteSize=value=>NOTE_SIZES.includes(Number(value))?Number(value):null;
export function noteColor(value){
 let color=typeof value==='string'?value.trim().toLowerCase():'';
 const rgb=/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(color);
 if(rgb)color='#'+rgb.slice(1).map(v=>Number(v).toString(16).padStart(2,'0')).join('');
 return NOTE_COLORS.includes(color)?color:null;
}
function cleanMarks(values){
 const result=[],seen=new Set();
 for(const m of values.slice(0,16)){
  if(!m||seen.has(m.type))continue;
  if(marks.has(m.type))result.push({type:m.type});
  else if(m.type==='textStyle'){
   const fontSize=noteSize(m.attrs?.fontSize),color=noteColor(m.attrs?.color),attrs={...(fontSize?{fontSize}:{}),...(color?{color}:{})};
   if(Object.keys(attrs).length)result.push({type:'textStyle',attrs});
  }else if(m.type==='highlight'&&(!m.attrs?.color||m.attrs.color===NOTE_HIGHLIGHT))result.push({type:'highlight',attrs:{color:NOTE_HIGHLIGHT}});
  seen.add(m.type);
 }
 return result;
}
const blocks=new Set(['paragraph','heading','blockquote','bulletList','orderedList','listItem','horizontalRule','hardBreak']);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function normalizeRichText(value){
 if(value?.type!=='doc'||!Array.isArray(value.content)||value.content.length>6000)return null;
 let count=0,chars=0,invalid=false;
 function node(v,depth){
  if(!v||typeof v!=='object'||depth>20||++count>6000){invalid=true;return null;}
  if(v.type==='text'){
   if(typeof v.text!=='string'||!v.text)return null;chars+=v.text.length;if(chars>12000){invalid=true;return null;}
   const clean={type:'text',text:v.text};
   if(Array.isArray(v.marks)){const chosen=cleanMarks(v.marks);if(chosen.length)clean.marks=chosen;}
   return clean;
  }
  if(!blocks.has(v.type))return null;
  const clean={type:v.type};
  if(v.type==='heading')clean.attrs={level:v.attrs?.level===3?3:2};
  if(['paragraph','heading'].includes(v.type)&&['left','center','right'].includes(v.attrs?.textAlign))clean.attrs={...clean.attrs,textAlign:v.attrs.textAlign};
  if(v.type==='orderedList')clean.attrs={start:Math.max(1,Math.min(9999,Number.isInteger(v.attrs?.start)?v.attrs.start:1))};
  if(!['hardBreak','horizontalRule'].includes(v.type)){
   if(Array.isArray(v.content)&&v.content.length>6000){invalid=true;return null;}
   const children=(Array.isArray(v.content)?v.content:[]).map(c=>node(c,depth+1)).filter(Boolean);
   clean.content=children.filter(c=>['paragraph','heading'].includes(v.type)?['text','hardBreak'].includes(c.type):['bulletList','orderedList'].includes(v.type)?c.type==='listItem':!['text','hardBreak','listItem'].includes(c.type));
   if(['blockquote','listItem'].includes(v.type)&&!clean.content.length)clean.content=[{type:'paragraph',content:[]}];
  }
  return clean;
 }
 const content=value.content.map(v=>node(v,0)).filter(v=>v&&!['text','hardBreak','listItem'].includes(v.type));
 return invalid?null:{type:'doc',content:content.length?content:[{type:'paragraph',content:[]}]};
}
export function richPlain(doc){
 function visit(n){if(n.type==='text')return n.text;if(n.type==='hardBreak')return '\n';if(n.type==='horizontalRule')return '';return (n.content||[]).map(visit).join(['paragraph','heading'].includes(n.type)?'':'\n');}
 return visit(doc||{type:'doc'});
}
export function plainDocument(text=''){return {type:'doc',content:String(text).split('\n').map(line=>({type:'paragraph',content:line?[{type:'text',text:line}]:[]}))};}
export function richField(value,content){const doc=normalizeRichText(value);return doc&&richPlain(doc).trim()===String(content).trim()?{richText:doc}:{};}
export function renderRichText(value){
 const doc=normalizeRichText(value);if(!doc)return '';
 function render(n){
  if(n.type==='text'){let html=esc(n.text);for(const mark of n.marks||[]){if(mark.type==='textStyle'){const style=[mark.attrs.fontSize?`font-size:${mark.attrs.fontSize}px`:'',mark.attrs.color?`color:${mark.attrs.color}`:''].filter(Boolean).join(';');html=`<span style="${style}">${html}</span>`;}else if(mark.type==='highlight')html=`<mark class="diary-highlight">${html}</mark>`;else{const tag={bold:'strong',italic:'em',underline:'u',strike:'s'}[mark.type];html=`<${tag}>${html}</${tag}>`;}}return html;}
  if(n.type==='hardBreak')return '<br>';
  if(n.type==='horizontalRule')return '<hr>';
  const tag={doc:'div',paragraph:'p',heading:n.attrs?.level===3?'h3':'h2',blockquote:'blockquote',bulletList:'ul',orderedList:'ol',listItem:'li'}[n.type];
  const align=n.attrs?.textAlign?` class="diary-align-${n.attrs.textAlign}"`:'';
  return `<${tag}${align}${n.type==='orderedList'?` start="${n.attrs.start}"`:''}>${(n.content||[]).map(render).join('')||(['paragraph','heading'].includes(n.type)?'<br>':'')}</${tag}>`;
 }
 return render(doc);
}
