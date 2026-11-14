import { escape } from '../../ui.js';
import { ledgerIcon } from './icons.js';
import { EXPENSE_CATS, INCOME_CATS, catById, catsFor, formatYuan, formatCompact, weekStart, addDays, ymd, sameDay, daysInMonth, rangeOf, entriesBetween, sumEntries, dayExpense, categoryBreakdown, totals, startOfDay } from './model.js';
const DOW = ['S','M','T','W','T','F','S'];
const DOW_CN = ['日','一','二','三','四','五','六'];
const PATTERNS = ['#2a2a2e','#4a4a50','#6a6a70','#8d8d92','#3f3f44','#55555a','#737378','#1c1c1f'];
function clock(date) { return String(date.getHours()).padStart(2,'0') + ':' + String(date.getMinutes()).padStart(2,'0'); }
function heatLevel(cents) {
 if(cents <= 0) return 0;
 if(cents < 5000) return 1;
 if(cents < 10000) return 2;
 if(cents < 20000) return 3;
 if(cents < 40000) return 4;
 return 5;
}
function niceMax(value) {
 if(value <= 10000) return 10000;
 const mag = 10 ** Math.floor(Math.log10(value)), n = value / mag;
 return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}
function yuanTick(cents) {
 const yuan = cents / 100;
 if(yuan >= 10000) return (yuan / 10000).toFixed(yuan % 10000 ? 1 : 0).replace(/\.0$/,'') + '万';
 if(yuan >= 1000) return Math.round(yuan).toLocaleString('zh-CN');
 return String(Math.round(yuan));
}
let bound = null;
export function bindLedger(data,ui) { bound = {data,ui}; }
export function ledgerBody() {
 if(!bound) return '';
 return bound.ui.screen === 'stats' ? statsView(bound.data,bound.ui) : billView(bound.data,bound.ui);
}
function billView(data,ui) {
 const selected = startOfDay(ui.selected), today = startOfDay(new Date());
 const assets = totals(data);
 const weeks = [];
 let cursor = weekStart(addDays(selected,-56));
 const last = weekStart(addDays(selected,14));
 data.entries.forEach(item => { const start = weekStart(new Date(item.ts)); if(start < cursor) cursor = addDays(weekStart(start),-21); if(start > last) last.setTime(start.getTime()); });
 for(let day = new Date(cursor); day <= last; day = addDays(day,7)) weeks.push(new Date(day));
 const dayItems = data.entries.filter(item => ymd(new Date(item.ts)) === ymd(selected)).sort((a,b) => a.ts - b.ts);
 const net = dayItems.reduce((sum,item) => sum + (item.type === 'income' ? item.amountCents : -item.amountCents),0);
 return `<button class="ledger-card" type="button" data-ledger-action="balance" aria-label="编辑起始余额，当前总资产 ${formatYuan(assets.assets)}"><span class="ledger-rings" aria-hidden="true"></span><span class="ledger-chip" aria-hidden="true"></span><span class="ledger-card-label">总资产</span><span class="ledger-card-amount">${formatYuan(assets.assets)}</span><span class="ledger-card-name">尘 · 记账卡</span></button>
 <div class="ledger-weeks" tabindex="0" aria-label="按周浏览，左右滑动切换">${weeks.map(start => `<div class="ledger-week" data-week="${ymd(start)}">${Array.from({length:7},(_,i) => {
  const day = addDays(start,i), chosen = sameDay(day,selected), spent = data.entries.some(item => ymd(new Date(item.ts)) === ymd(day));
  const flow = data.entries.filter(item => ymd(new Date(item.ts)) === ymd(day)).reduce((sum,item) => sum + (item.type === 'income' ? item.amountCents : -item.amountCents),0);
  return `<button type="button" class="ledger-day${chosen ? ' is-selected' : ''}" data-ledger-action="day" data-ymd="${ymd(day)}" aria-pressed="${chosen}"><span class="ledger-dow">${DOW[i]}</span><span class="ledger-dom">${day.getDate()}</span><span class="ledger-dnet">${spent ? formatCompact(flow) : ''}</span></button>`;
 }).join('')}</div>`).join('')}</div>
 <div class="ledger-day-head"><h2>${sameDay(selected,today) ? 'TODAY · ' : ''}${selected.getMonth() + 1}月${selected.getDate()}日</h2><span ${net === 0 ? 'class="ledger-balance-face" aria-label="收支持平"' : ''}>${net < 0 ? '净支出 ' + formatYuan(-net) : net > 0 ? '净收入 ' + formatYuan(net) : '¯꒳¯'}</span></div>
 <div class="ledger-list">${dayItems.length ? dayItems.map(entryRow).join('') : '<div class="ledger-empty"><strong>这一天还没有记账</strong>点中间的加号，记一笔吧</div>'}</div>
 <nav class="ledger-tabbar" aria-label="记账导航"><button type="button" class="ledger-tab is-active" data-ledger-action="screen" data-screen="bill" aria-current="page">${ledgerIcon('list',20)}账单</button><div class="ledger-fab-slot"><button type="button" class="ledger-fab" data-ledger-action="add" aria-label="记一笔">${ledgerIcon('plus',26)}</button></div><button type="button" class="ledger-tab" data-ledger-action="screen" data-screen="stats">${ledgerIcon('chart',20)}统计</button></nav>`;
}
function entryRow(item) {
 const cat = catById(item.category) || {name:'其他',icon:'ellipsis'};
 const signed = item.type === 'income' ? item.amountCents : -item.amountCents;
 const mark = item.imageIds?.[0] ? `<img class="ledger-mark" data-ledger-photo="${escape(item.imageIds[0])}" alt="${item.imageIds.length > 1 ? item.imageIds.length + '张图片' : '1张图片'}">` : '';
 return `<button type="button" class="ledger-entry" data-ledger-action="edit" data-id="${escape(item.id)}"><span class="ledger-entry-icon">${ledgerIcon(cat.icon,22)}</span><span class="ledger-entry-body"><span class="ledger-entry-title">${escape(item.title || cat.name)}</span><span class="ledger-entry-meta">${escape(cat.name)} · ${clock(new Date(item.ts))}${item.imageIds?.length > 1 ? ' · ' + item.imageIds.length + '张图' : ''}</span></span><span class="ledger-entry-side">${mark}<span class="ledger-amt">${formatYuan(signed,{plus:true})}</span></span></button>`;
}
function statsView(data,ui) {
 const bounds = rangeOf(ui.mode,ui.anchor), list = entriesBetween(data.entries,bounds.start,bounds.end), flow = sumEntries(list);
 const titles = {week:'本周支出',month:'本月支出',year:'本年支出'};
 return `<div class="ledger-stats-head"><div class="ledger-seg" role="group" aria-label="统计范围">${['week','month','year'].map((mode,index) => `<button type="button" data-ledger-action="mode" data-mode="${mode}" aria-pressed="${ui.mode === mode}">${['周','月','年'][index]}</button>`).join('')}</div><button type="button" class="ledger-filter" data-ledger-action="pick" aria-haspopup="dialog" aria-label="筛选统计时间：${bounds.label}" title="${bounds.label}">${ledgerIcon('filter',20)}</button></div>
 <div class="ledger-stats" data-ledger-swipe><section class="ledger-summary"><div><h3>${titles[ui.mode]}</h3><strong>${formatYuan(flow.expense)}</strong></div><p>收入 ${formatYuan(flow.income)} · 结余 ${formatYuan(flow.net,{plus:true})}</p></section>
 ${ui.mode === 'month' ? bars(data,ui) : ''}${heat(data,ui,bounds)}${donut(list,ui.mode)}${lineChart(data,ui,bounds)}${catTable(list)}
 </div>
 <nav class="ledger-tabbar" aria-label="记账导航"><button type="button" class="ledger-tab" data-ledger-action="screen" data-screen="bill">${ledgerIcon('list',20)}账单</button><div class="ledger-fab-slot"><button type="button" class="ledger-fab" data-ledger-action="add" aria-label="记一笔">${ledgerIcon('plus',26)}</button></div><button type="button" class="ledger-tab is-active" data-ledger-action="screen" data-screen="stats" aria-current="page">${ledgerIcon('chart',20)}统计</button></nav>`;
}
function bars(data,ui) {
 const months = Array.from({length:6},(_,index) => { const date = new Date(ui.anchor.getFullYear(),ui.anchor.getMonth() - (5 - index),1); const end = new Date(date.getFullYear(),date.getMonth(),daysInMonth(date.getFullYear(),date.getMonth())); return {date,sum:sumEntries(entriesBetween(data.entries,date,end))}; });
 const max = Math.max(1,...months.map(item => item.sum.expense));
 return `<section class="ledger-block"><h3>近6个月支出</h3><div class="ledger-bars">${months.map(item => { const current = item.date.getFullYear() === ui.anchor.getFullYear() && item.date.getMonth() === ui.anchor.getMonth(); return `<button type="button" class="ledger-bar${current ? ' is-current' : ''}" data-ledger-action="month" data-ymd="${ymd(item.date)}" aria-label="${item.date.getFullYear()}年${item.date.getMonth() + 1}月支出 ${formatYuan(item.sum.expense)}"><span style="height:${Math.max(4,Math.round(item.sum.expense / max * 64))}px"></span><small>${item.date.getMonth() + 1}月</small></button>`; }).join('')}</div></section>`;
}
function heat(data,ui,bounds) {
 if(ui.mode === 'week') {
  const cells = Array.from({length:7},(_,i) => { const day = addDays(bounds.start,i), exp = dayExpense(data.entries,day); return `<button type="button" class="ledger-heat lv-${heatLevel(exp)}" data-ledger-action="day" data-ymd="${ymd(day)}" aria-label="${day.getMonth() + 1}月${day.getDate()}日，支出 ${formatYuan(exp)}"><span>${day.getDate()}</span><small>${DOW[i]}</small></button>`; });
  return `<section class="ledger-block"><h3>这 7 天</h3><div class="ledger-week-heat">${cells.join('')}</div></section>`;
 }
 if(ui.mode === 'year') {
  const year = bounds.start.getFullYear(), gridStart = weekStart(new Date(year,0,1)), last = new Date(year,11,31);
  const labels = [], cols = [];
  for(let cursor = new Date(gridStart); cursor <= last; cursor = addDays(cursor,7)) {
   let label = '';
   const days = Array.from({length:7},(_,i) => { const day = addDays(cursor,i); if(day.getFullYear() !== year) return '<span class="ledger-dot is-pad"></span>'; if(day.getDate() === 1) label = (day.getMonth() + 1) + '月'; const exp = dayExpense(data.entries,day); return `<button type="button" class="ledger-dot lv-${heatLevel(exp)}" data-ledger-action="day" data-ymd="${ymd(day)}" aria-label="${day.getMonth() + 1}月${day.getDate()}日，支出 ${formatYuan(exp)}"></button>`; });
   labels.push(`<span>${label}</span>`); cols.push(`<div>${days.join('')}</div>`);
  }
  return `<section class="ledger-block"><h3>全年热力图</h3><div class="ledger-year" tabindex="0" aria-label="全年按天支出，可左右滑动"><div class="ledger-year-dows">${DOW_CN.map(day => `<span>${day}</span>`).join('')}</div><div><div class="ledger-year-months">${labels.join('')}</div><div class="ledger-year-cols">${cols.join('')}</div></div></div><p class="ledger-note">左右滑动查看全年，点某一天回到账单。</p></section>`;
 }
 const first = bounds.start, blanks = first.getDay(), count = daysInMonth(first.getFullYear(),first.getMonth());
 const cells = Array.from({length:blanks},() => '<span class="ledger-cal is-empty"></span>').concat(Array.from({length:count},(_,index) => { const day = new Date(first.getFullYear(),first.getMonth(),index + 1), exp = dayExpense(data.entries,day); return `<button type="button" class="ledger-cal lv-${heatLevel(exp)}" data-ledger-action="day" data-ymd="${ymd(day)}" aria-label="${index + 1}日，支出 ${formatYuan(exp)}">${index + 1}</button>`; }));
 return `<section class="ledger-block"><h3>日历热力图</h3><div class="ledger-cal-head">${DOW_CN.map(day => `<span>${day}</span>`).join('')}</div><div class="ledger-cal-grid">${cells.join('')}</div></section>`;
}
function donut(entries,mode) {
 const items = categoryBreakdown(entries), total = items.reduce((sum,item) => sum + item.cents,0);
 const empty = mode === 'week' ? '这周' : mode === 'year' ? '这一年' : '这个月';
 if(!total) return `<section class="ledger-block"><h3>支出构成</h3><div class="ledger-empty">${empty}还没有支出记录</div></section>`;
 let angle = -Math.PI / 2;
 const arcs = items.map((item,index) => { const next = index === items.length - 1 ? Math.PI * 1.5 : angle + item.cents / total * Math.PI * 2; const path = annular(70,70,40,62,angle,Math.max(angle + 0.002,next)); angle = next; return `<path d="${path}" fill="${PATTERNS[index % PATTERNS.length]}"></path>`; }).join('');
 const top = items[0], pct = Math.round(top.cents / total * 100);
 return `<section class="ledger-block"><h3>支出构成</h3><div class="ledger-donut"><svg viewBox="0 0 140 140" role="img" aria-label="支出构成">${arcs}<text x="70" y="66" text-anchor="middle">${pct}%</text><text x="70" y="84" text-anchor="middle">${escape(top.name)}</text></svg><div>${items.map((item,index) => `<div class="ledger-leg"><i style="background:${PATTERNS[index % PATTERNS.length]}"></i><span>${escape(item.name)} · ${item.count} 笔</span><b>${formatYuan(item.cents)} ${Math.round(item.cents / total * 100)}%</b></div>`).join('')}</div></div></section>`;
}
function annular(cx,cy,r0,r1,a0,a1) {
 if(a1 - a0 >= Math.PI * 2 - 0.001) return annular(cx,cy,r0,r1,a0,a0 + Math.PI) + annular(cx,cy,r0,r1,a0 + Math.PI,a1 - 0.001);
 const large = a1 - a0 > Math.PI ? 1 : 0, pt = (r,a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
 const p0 = pt(r1,a0), p1 = pt(r1,a1), p2 = pt(r0,a1), p3 = pt(r0,a0);
 return `M${p0.join(' ')} A${r1} ${r1} 0 ${large} 1 ${p1.join(' ')} L${p2.join(' ')} A${r0} ${r0} 0 ${large} 0 ${p3.join(' ')} Z`;
}
function lineSeries(data,ui,bounds) {
 if(ui.mode === 'year') return Array.from({length:12},(_,month) => { const start = new Date(bounds.start.getFullYear(),month,1), end = new Date(start.getFullYear(),month,daysInMonth(start.getFullYear(),month)), sum = sumEntries(entriesBetween(data.entries,start,end)); return {label:String(month + 1),expense:sum.expense,income:sum.income,tip:(month + 1) + '月 支出 ' + formatYuan(sum.expense) + ' 收入 ' + formatYuan(sum.income)}; });
 const days = ui.mode === 'week' ? 7 : daysInMonth(bounds.start.getFullYear(),bounds.start.getMonth());
 return Array.from({length:days},(_,index) => { const day = ui.mode === 'week' ? addDays(bounds.start,index) : new Date(bounds.start.getFullYear(),bounds.start.getMonth(),index + 1); const items = data.entries.filter(item => ymd(new Date(item.ts)) === ymd(day)); const expense = items.reduce((sum,item) => sum + (item.type === 'expense' ? item.amountCents : 0),0), income = items.reduce((sum,item) => sum + (item.type === 'income' ? item.amountCents : 0),0); return {label:ui.mode === 'week' ? (day.getMonth() + 1) + '/' + day.getDate() : String(index + 1),expense,income,tip:(day.getMonth() + 1) + '/' + day.getDate() + ' 支出 ' + formatYuan(expense) + ' 收入 ' + formatYuan(income)}; });
}
function lineChart(data,ui,bounds) {
 const series = lineSeries(data,ui,bounds), n = series.length, w = 320, h = 168, left = 36, right = 12, top = 16, bottom = 22;
 const max = niceMax(Math.max(1,...series.map(item => item.expense)));
 const x = i => left + (n === 1 ? 0 : i / (n - 1) * (w - left - right));
 const y = value => top + (1 - value / max) * (h - top - bottom);
 const poly = series.map((item,index) => x(index) + ',' + y(item.expense)).join(' ');
 const grid = [0,.5,1].map(step => { const yy = y(max * step); return `<line x1="${left}" y1="${yy}" x2="${w - right}" y2="${yy}"></line><text x="${left - 4}" y="${yy + 3}" text-anchor="end">${yuanTick(max * step)}</text>`; }).join('');
 const labels = series.map((item,index) => (ui.mode !== 'month' || item.label === '1' || index === n - 1 || Number(item.label) % 5 === 0) ? `<text class="ledger-axis" x="${x(index)}" y="${h - 4}" text-anchor="middle">${item.label}</text>` : '').join('');
 return `<section class="ledger-block"><h3>${ui.mode === 'year' ? '每月趋势' : '每日趋势'}</h3><div class="ledger-line"><svg viewBox="0 0 ${w} ${h}" data-ledger-line role="img" aria-label="${ui.mode === 'year' ? '每月支出' : '每日支出'}">${grid}<polyline points="${poly}"></polyline>${series.map((item,index) => `<circle data-tip="${escape(item.tip)}" cx="${x(index)}" cy="${y(item.expense)}" r="8"></circle>`).join('')}${labels}</svg><p class="ledger-tip" data-ledger-tip hidden></p></div></section>`;
}
function catTable(entries) {
 const items = categoryBreakdown(entries), total = items.reduce((sum,item) => sum + item.cents,0);
 if(!total) return '<section class="ledger-block"><h3>分类统计</h3><div class="ledger-empty">暂无分类数据</div></section>';
 return `<section class="ledger-block"><h3>分类统计</h3>${items.map(item => { const pct = Math.round(item.cents / total * 100); return `<div class="ledger-cat"><span>${ledgerIcon(item.icon,18)}</span><b>${escape(item.name)}</b><strong>${formatYuan(item.cents)} ${pct}%</strong><i><em style="width:${pct}%"></em></i><small>${item.count} 笔</small></div>`; }).join('')}</section>`;
}
export function ledgerSheet(draft) {
 const cats = catsFor(draft.type);
 return `<div class="ledger-sheet-scroll drawer-scroll"><div class="ledger-seg" role="tablist" aria-label="收支类型"><button type="button" data-ledger-action="type" data-type="expense" aria-pressed="${draft.type === 'expense'}">支出</button><button type="button" data-ledger-action="type" data-type="income" aria-pressed="${draft.type === 'income'}">收入</button></div>
 <label class="ledger-amount"><span aria-hidden="true">¥</span><input name="amount" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" maxlength="12" placeholder="0.00" aria-label="金额，单位元" value="${escape(draft.amount)}"></label>
 <p class="ledger-error" data-ledger-error hidden>请输入大于 0 的金额</p>
 <label class="ledger-title"><span>内容</span><input name="title" type="text" maxlength="40" placeholder="记一下…" value="${escape(draft.title)}" autocomplete="off"></label>
 <p class="ledger-label">分类</p><div class="ledger-chips">${cats.map(cat => `<button type="button" data-ledger-action="cat" data-id="${cat.id}" aria-pressed="${draft.category === cat.id}">${ledgerIcon(cat.icon,16)}${escape(cat.name)}</button>`).join('')}</div>
 <p class="ledger-label">时间</p><label class="ledger-time">${ledgerIcon('clock',16)}<span>${(new Date(draft.ts).getMonth() + 1)}月${new Date(draft.ts).getDate()}日 ${clock(new Date(draft.ts))}</span><input name="when" type="datetime-local" aria-label="选择时间" value="${toLocal(draft.ts)}"></label>
 <p class="ledger-label">图片</p><div class="ledger-photos">${draft.images.map((image,index) => `<div><button type="button" data-ledger-action="photo" data-index="${index}" aria-label="查看第${index + 1}张图片"><img src="${escape(image.url)}" alt=""></button><button type="button" data-ledger-action="remove-photo" data-index="${index}" aria-label="删除第${index + 1}张图片">${ledgerIcon('x',18)}</button></div>`).join('')}</div>
 <button type="button" class="ledger-add-photo" data-ledger-action="add-photo">${ledgerIcon('imageplus',16)}添加图片</button><input data-ledger-photos type="file" accept="image/*" multiple hidden>
 ${draft.mode === 'edit' ? `<button type="button" class="ledger-delete" data-ledger-action="delete">${ledgerIcon('trash',16)}删除这笔</button>` : ''}</div>
 <button type="button" class="ledger-save" data-ledger-action="save">保存</button>`;
}
function toLocal(ts) { const date = new Date(ts); return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0') + 'T' + String(date.getHours()).padStart(2,'0') + ':' + String(date.getMinutes()).padStart(2,'0'); }
export function rangeChoices(mode,anchor) {
 const current = startOfDay(anchor);
 if(mode === 'year') return [0,1,2].map(offset => { const year = current.getFullYear() - offset; return {label:year + '年',ymd:year + '-07-01',current:offset === 0}; });
 if(mode === 'week') {
  const items = [];
  for(let cursor = weekStart(current), guard = 0; guard < 20; guard++, cursor = addDays(cursor,-7)) {
   const end = addDays(cursor,6);
   items.push({label:(cursor.getMonth() + 1) + '月' + cursor.getDate() + '日 – ' + (end.getMonth() + 1) + '月' + end.getDate() + '日',ymd:ymd(cursor),current:ymd(cursor) === ymd(weekStart(current))});
  }
  return items;
 }
 return Array.from({length:18},(_,index) => { const date = new Date(current.getFullYear(),current.getMonth() - index,1); return {label:date.getFullYear() + '年' + (date.getMonth() + 1) + '月',ymd:ymd(date),current:index === 0}; });
}
export { EXPENSE_CATS, INCOME_CATS };
