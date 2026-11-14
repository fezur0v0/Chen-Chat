// Ledger metadata stays in its own key so chat backups and chenxin.frontend.v1 stay untouched.
export const LEDGER_KEY = 'chenxin.ledger.v1';
export const EXPENSE_CATS = [
 {id:'food',name:'餐饮',icon:'utensils'},
 {id:'transport',name:'交通',icon:'train'},
 {id:'shopping',name:'购物',icon:'bag'},
 {id:'daily',name:'日用',icon:'box'},
 {id:'fun',name:'娱乐',icon:'film'},
 {id:'medical',name:'医疗',icon:'heart'},
 {id:'housing',name:'住房',icon:'house'},
 {id:'other',name:'其他',icon:'ellipsis'}
];
export const INCOME_CATS = [
 {id:'salary',name:'工资',icon:'wallet'},
 {id:'bonus',name:'奖金',icon:'gift'},
 {id:'invest',name:'理财',icon:'trend'},
 {id:'other_in',name:'其他',icon:'ellipsis'}
];
const pad = n => n < 10 ? '0' + n : String(n);
export const catById = id => EXPENSE_CATS.concat(INCOME_CATS).find(cat => cat.id === id);
export const catsFor = type => type === 'income' ? INCOME_CATS : EXPENSE_CATS;
export function emptyLedger() { return {v:1,startingBalanceCents:0,entries:[]}; }
function entry(raw) {
 if(!raw || typeof raw.id !== 'string' || (raw.type !== 'income' && raw.type !== 'expense')) return null;
 const amount = Math.round(Number(raw.amountCents));
 const ts = Number(raw.ts);
 if(!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(ts)) return null;
 return {id:raw.id.slice(0,80),type:raw.type,category:String(raw.category || 'other').slice(0,40),title:String(raw.title || '').slice(0,40),amountCents:amount,ts,imageIds:Array.isArray(raw.imageIds) ? raw.imageIds.filter(id => typeof id === 'string' && id).slice(0,6) : []};
}
export function loadLedger(storage) {
 try {
  const raw = storage.getItem(LEDGER_KEY);
  if(!raw) return emptyLedger();
  const parsed = JSON.parse(raw);
  if(!parsed || !Array.isArray(parsed.entries)) return emptyLedger();
  const starting = Number.isFinite(parsed.startingBalanceCents) ? Math.round(parsed.startingBalanceCents) : 0;
  return {v:1,startingBalanceCents:starting,entries:parsed.entries.map(entry).filter(Boolean)};
 } catch { return emptyLedger(); }
}
export function saveLedger(storage,data) { storage.setItem(LEDGER_KEY,JSON.stringify({v:1,startingBalanceCents:data.startingBalanceCents,entries:data.entries})); }
export function parseAmount(value) {
 const text = String(value ?? '').trim().replace(/[,¥￥\s]/g,'');
 if(!text) return {ok:false,reason:'请输入金额'};
 if(!/^\d+(\.\d{0,2})?$/.test(text)) return {ok:false,reason:'请输入数字金额，最多两位小数'};
 const [yuan,fraction = ''] = text.split('.');
 const cents = (parseInt(yuan,10) || 0) * 100 + parseInt((fraction + '00').slice(0,2),10);
 if(!cents) return {ok:false,reason:'金额不能为 0'};
 return {ok:true,cents};
}
export function formatYuan(cents,opts = {}) {
 const sign = cents < 0 ? '-' : opts.plus && cents > 0 ? '+' : '';
 const abs = Math.abs(Math.round(cents));
 return sign + '¥' + Math.floor(abs / 100).toLocaleString('zh-CN') + '.' + pad(abs % 100);
}
export function formatCompact(cents) {
 if(!cents) return '0';
 const sign = cents < 0 ? '-' : '+';
 const abs = Math.abs(cents);
 if(abs % 100 === 0) return sign + abs / 100;
 if(abs % 10 === 0) return sign + (abs / 100).toFixed(1);
 return sign + (abs / 100).toFixed(2);
}
export function startOfDay(date) { return new Date(date.getFullYear(),date.getMonth(),date.getDate()); }
export function weekStart(date) { const day = startOfDay(date); day.setDate(day.getDate() - day.getDay()); return day; }
export function addDays(date,count) { const next = new Date(date); next.setDate(next.getDate() + count); return next; }
export function ymd(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
export function daysInMonth(year,month) { return new Date(year,month + 1,0).getDate(); }
export function sameDay(a,b) { return ymd(a) === ymd(b); }
export function rangeOf(mode,anchor) {
 const day = startOfDay(anchor);
 if(mode === 'week') {
  const start = weekStart(day), end = addDays(start,6);
  return {start,end,label:(start.getMonth() + 1) + '月' + start.getDate() + '日 – ' + (end.getMonth() + 1) + '月' + end.getDate() + '日'};
 }
 if(mode === 'year') return {start:new Date(day.getFullYear(),0,1),end:new Date(day.getFullYear(),11,31),label:day.getFullYear() + '年'};
 const start = new Date(day.getFullYear(),day.getMonth(),1);
 return {start,end:new Date(day.getFullYear(),day.getMonth(),daysInMonth(day.getFullYear(),day.getMonth())),label:day.getFullYear() + '年' + (day.getMonth() + 1) + '月'};
}
export function entriesBetween(entries,start,end) {
 const from = startOfDay(start).getTime(), to = addDays(startOfDay(end),1).getTime();
 return entries.filter(item => item.ts >= from && item.ts < to);
}
export function sumEntries(entries) {
 return entries.reduce((sum,item) => {
  if(item.type === 'income') sum.income += item.amountCents; else sum.expense += item.amountCents;
  sum.net = sum.income - sum.expense;
  return sum;
 },{income:0,expense:0,net:0});
}
export function dayExpense(entries,day) {
 const key = ymd(day);
 return entries.reduce((sum,item) => sum + (ymd(new Date(item.ts)) === key && item.type === 'expense' ? item.amountCents : 0),0);
}
export function categoryBreakdown(entries) {
 const map = {};
 entries.forEach(item => {
  if(item.type !== 'expense') return;
  if(!map[item.category]) map[item.category] = {id:item.category,cents:0,count:0};
  map[item.category].cents += item.amountCents;
  map[item.category].count += 1;
 });
 return Object.values(map).map(item => ({...item,...(catById(item.id) || {name:'其他',icon:'ellipsis'})})).sort((a,b) => b.cents - a.cents);
}
export function totals(data) {
 const flow = sumEntries(data.entries);
 return {...flow,assets:data.startingBalanceCents + flow.income - flow.expense};
}
export function uid() { return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
