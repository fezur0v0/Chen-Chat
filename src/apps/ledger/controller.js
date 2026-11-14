import { drawerHeader, bindDrawerDismiss } from '../../drawer.js';
import { ledgerImage } from './images.js';
import { loadLedger, saveLedger, parseAmount, catById, catsFor, startOfDay, weekStart, ymd, uid } from './model.js';
import { bindLedger, ledgerBody, ledgerSheet, rangeChoices } from './view.js';
const urls = new Map();
export function createLedgerApp({app,notify,storage = localStorage}) {
 const data = loadLedger(storage);
 const ui = {screen:'bill',selected:startOfDay(new Date()),mode:'month',anchor:startOfDay(new Date())};
 bindLedger(data,ui);
 const sheet = document.createElement('dialog');
 sheet.className = 'ledger-sheet app-sheet bottom-sheet';
 sheet.setAttribute('aria-label','记一笔');
 document.body.append(sheet);
 const dialog = document.createElement('dialog');
 dialog.className = 'ledger-dialog';
 document.body.append(dialog);
 let draft = null, closing = false, confirm = null;
 bindDrawerDismiss(sheet,{panel:() => sheet.open && !closing ? sheet : null,close:() => void closeSheet(),backdrop:true});
 sheet.addEventListener('cancel',event => { event.preventDefault(); void closeSheet(); });
 function paint() {
  const body = app.querySelector('.ledger-app .desktop-app-body');
  if(!body) return;
  const scroller = app.querySelector('.page-content'), top = scroller?.scrollTop || 0;
  body.innerHTML = ledgerBody();
  if(scroller) scroller.scrollTop = top;
  const week = body.querySelector(`[data-week="${ymd(weekStart(ui.selected))}"]`);
  week?.scrollIntoView({inline:'start',block:'nearest'});
  hydrate(body);
 }
 function sync() {
  const body = app.querySelector('.ledger-app .desktop-app-body');
  if(!body) return;
  body.querySelector(`[data-week="${ymd(weekStart(ui.selected))}"]`)?.scrollIntoView({inline:'start',block:'nearest'});
  hydrate(body);
 }
 async function hydrate(root) {
  for(const image of root.querySelectorAll('[data-ledger-photo]')) {
   const id = image.getAttribute('data-ledger-photo');
   try { image.src = await objectUrl(id); } catch { image.remove(); }
  }
 }
 async function objectUrl(id) {
  if(urls.has(id)) return urls.get(id);
  const blob = await ledgerImage(id);
  if(!blob) return '';
  const url = URL.createObjectURL(blob);
  urls.set(id,url);
  return url;
 }
 function persist() {
  try { saveLedger(storage,data); return true; }
  catch { notify('本机空间不够，这笔账没有存下。'); return false; }
 }
 function openSheet(next) {
  draft = next;
  sheet.innerHTML = drawerHeader({title:next.mode === 'edit' ? '改一笔' : '记一笔',action:'close',actionAttribute:'data-ledger-action'}) + ledgerSheet(next);
  if(!sheet.open) sheet.showModal();
  sheet.querySelector('[name=amount]')?.focus({preventScroll:true});
 }
 function closeSheet() {
  if(!sheet.open || closing) return;
  closing = true;
  try { sheet.close(); } catch { /* already closed */ }
  closing = false;
  draft = null;
 }
 function openCreate() {
  const now = new Date(), day = startOfDay(ui.selected);
  openSheet({mode:'create',id:'',type:'expense',category:'food',title:'',amount:'',ts:new Date(day.getFullYear(),day.getMonth(),day.getDate(),now.getHours(),now.getMinutes()).getTime(),images:[]});
 }
 async function openEdit(id) {
  const entry = data.entries.find(item => item.id === id);
  if(!entry) return;
  const images = [];
  for(const imageId of entry.imageIds) {
   try { const blob = await ledgerImage(imageId); if(blob) images.push({id:imageId,url:await objectUrl(imageId),blob,kept:true}); } catch { /* a missing photo should not block editing the amount */ }
  }
  openSheet({mode:'edit',id,type:entry.type,category:entry.category,title:entry.title,amount:(entry.amountCents / 100).toFixed(2),ts:entry.ts,images});
 }
 function showError(message) {
  const error = sheet.querySelector('[data-ledger-error]');
  if(error) { error.hidden = false; error.textContent = message; }
  sheet.querySelector('.ledger-amount')?.classList.add('is-error');
  notify(message);
 }
 async function save() {
  if(!draft) return;
  readDraft();
  const parsed = parseAmount(draft.amount);
  if(!parsed.ok) { showError(parsed.reason); return; }
  const previous = structuredClone(data);
  const imageIds = [];
  try {
   for(const image of draft.images) {
    if(!image.kept) await ledgerImage(image.id,image.blob);
    imageIds.push(image.id);
   }
  } catch(error) { notify(error.message || '图片没有存下，这笔账保持原样。'); return; }
  const removed = (data.entries.find(item => item.id === draft.id)?.imageIds || []).filter(id => !imageIds.includes(id));
  const title = draft.title.trim() || catById(draft.category)?.name || '未分类';
  const next = {id:draft.id || uid(),type:draft.type,category:draft.category,title,amountCents:parsed.cents,ts:draft.ts,imageIds};
  if(draft.mode === 'edit') {
   const index = data.entries.findIndex(item => item.id === draft.id);
   if(index >= 0) data.entries[index] = next;
  } else data.entries.push(next);
  if(!persist()) { data.entries = previous.entries; data.startingBalanceCents = previous.startingBalanceCents; return; }
  for(const id of removed) { urls.delete(id); ledgerImage(id,null).catch(() => {}); }
  ui.selected = startOfDay(new Date(draft.ts));
  ui.anchor = new Date(ui.selected);
  closeSheet();
  paint();
 }
 function readDraft() {
  if(!draft || !sheet.open) return;
  draft.amount = sheet.querySelector('[name=amount]')?.value || '';
  draft.title = sheet.querySelector('[name=title]')?.value || '';
  const when = sheet.querySelector('[name=when]')?.value;
  const match = when?.match(/^(\d+)-(\d+)-(\d+)T(\d+):(\d+)/);
  if(match) draft.ts = new Date(+match[1],+match[2] - 1,+match[3],+match[4],+match[5]).getTime();
 }
 function ask(title,text) {
  dialog.innerHTML = `<h2>${title}</h2><p>${text}</p><div class="ledger-dialog-actions"><button type="button" data-ledger-dialog="no">取消</button><button type="button" class="is-danger" data-ledger-dialog="yes">删除</button></div>`;
  dialog.showModal();
  return new Promise(resolve => { confirm = resolve; });
 }
 async function removeCurrent() {
  if(!draft) return;
  const ok = await ask('删除这笔记录？','删除后无法恢复，附带的图片也会一起去掉。');
  if(!ok) return;
  const entry = data.entries.find(item => item.id === draft.id);
  data.entries = data.entries.filter(item => item.id !== draft.id);
  if(!persist()) { data.entries.push(entry); notify('删除没有保存。'); return; }
  for(const id of entry?.imageIds || []) { urls.delete(id); ledgerImage(id,null).catch(() => {}); }
  closeSheet();
  paint();
 }
 async function addPhotos(files) {
  if(!draft) return;
  const room = 6 - draft.images.length;
  if(room <= 0) { notify('最多添加 6 张图片'); return; }
  const batch = [...files].slice(0,room);
  if(files.length > room) notify('最多 6 张，多出来的没有加入');
  for(const file of batch) {
   try {
    const blob = await compress(file);
    const id = uid();
    const url = URL.createObjectURL(blob);
    draft.images.push({id,url,blob,kept:false});
   } catch(error) { notify(error.message || '这张图片没法读取'); }
  }
  readDraft();
  const scroll = sheet.querySelector('.ledger-sheet-scroll');
  const fresh = document.createElement('template');
  fresh.innerHTML = ledgerSheet(draft);
  const nextScroll = fresh.content.querySelector('.ledger-sheet-scroll');
  const top = scroll?.scrollTop || 0;
  scroll?.replaceWith(nextScroll);
  if(nextScroll) nextScroll.scrollTop = top;
 }
 function openPicker() {
  const items = rangeChoices(ui.mode,ui.anchor);
  const title = ui.mode === 'year' ? '选择年份' : ui.mode === 'week' ? '选择一周' : '选择月份';
  dialog.innerHTML = `<h2>${title}</h2><div class="ledger-choices">${items.map(item => `<button type="button" data-ymd="${item.ymd}" aria-current="${item.current}">${item.label}</button>`).join('')}</div><div class="ledger-dialog-actions"><button type="button" data-ledger-dialog="no">关闭</button></div>`;
  dialog.showModal();
  confirm = () => {};
 }
 function cleanAmount(value) {
  let text = String(value).replace(/[^\d.]/g,'');
  const dot = text.indexOf('.');
  if(dot >= 0) text = text.slice(0,dot + 1) + text.slice(dot + 1).replace(/\./g,'').slice(0,2);
  return text.replace(/^0+(?=\d)/,'');
 }
 function onClick(event) {
  const point = event.target.closest('[data-tip]');
  if(point && point.closest('.ledger-app')) {
   const note = point.closest('.ledger-line')?.querySelector('[data-ledger-tip]');
   if(note) { note.hidden = false; note.textContent = point.getAttribute('data-tip') || ''; }
  }
  const choice = event.target.closest('.ledger-choices button');
  if(choice && dialog.open) {
   const parts = choice.dataset.ymd.split('-').map(Number);
   ui.anchor = new Date(parts[0],parts[1] - 1,parts[2]);
   dialog.close();
   paint();
   return;
  }
  const answer = event.target.closest('[data-ledger-dialog]');
  if(answer && dialog.open) { dialog.close(); confirm?.(answer.dataset.ledgerDialog === 'yes'); confirm = null; return; }
  const target = event.target.closest('[data-ledger-action]');
  if(!target || !target.closest('.ledger-app, .ledger-sheet')) return;
  const action = target.dataset.ledgerAction;
  if(action === 'screen') { ui.screen = target.dataset.screen; paint(); }
  else if(action === 'day') { const parts = target.dataset.ymd.split('-').map(Number); ui.selected = new Date(parts[0],parts[1] - 1,parts[2]); ui.screen = 'bill'; paint(); }
  else if(action === 'add') openCreate();
  else if(action === 'edit') void openEdit(target.dataset.id);
  else if(action === 'close') void closeSheet();
  else if(action === 'type') { readDraft(); draft.type = target.dataset.type; if(!catsFor(draft.type).some(cat => cat.id === draft.category)) draft.category = catsFor(draft.type)[0].id; openSheet(draft); }
  else if(action === 'cat') { readDraft(); draft.category = target.dataset.id; openSheet(draft); }
  else if(action === 'save') void save();
  else if(action === 'delete') void removeCurrent();
  else if(action === 'add-photo') sheet.querySelector('[data-ledger-photos]')?.click();
  else if(action === 'remove-photo') { readDraft(); const image = draft.images.splice(Number(target.dataset.index),1)[0]; if(image && !image.kept) URL.revokeObjectURL(image.url); openSheet(draft); }
  else if(action === 'photo') { const image = draft?.images[Number(target.dataset.index)]; if(image) { dialog.innerHTML = `<img class="ledger-full" src="${image.url}" alt="记录图片"><div class="ledger-dialog-actions"><button type="button" data-ledger-dialog="no">关闭</button></div>`; dialog.showModal(); confirm = () => {}; } }
  else if(action === 'mode') { ui.mode = target.dataset.mode; paint(); }
  else if(action === 'month') { const parts = target.dataset.ymd.split('-').map(Number); ui.anchor = new Date(parts[0],parts[1] - 1,parts[2]); paint(); }
  else if(action === 'pick') openPicker();
  else if(action === 'balance') { dialog.innerHTML = `<h2>起始余额</h2><p>总资产 = 起始余额 + 全部收入 − 全部支出。</p><input name="balance" inputmode="decimal" aria-label="起始余额，单位元" value="${(data.startingBalanceCents / 100).toFixed(2)}"><div class="ledger-dialog-actions"><button type="button" data-ledger-dialog="no">取消</button><button type="button" data-ledger-dialog="yes">保存</button></div>`; dialog.showModal(); confirm = ok => { if(!ok) return; const value = dialog.querySelector('[name=balance]').value.trim(); if(value === '' || /^0(?:\.0{0,2})?$/.test(value)) data.startingBalanceCents = 0; else { const parsed = parseAmount(value); if(!parsed.ok) { notify(parsed.reason); return; } data.startingBalanceCents = parsed.cents; } if(!persist()) return; paint(); }; }
 }
 app.addEventListener('click',onClick);
 sheet.addEventListener('click',onClick);
 dialog.addEventListener('click',onClick);
 sheet.addEventListener('change',event => { if(event.target.matches('[data-ledger-photos]')) { const files = [...event.target.files]; event.target.value = ''; void addPhotos(files); } });
 sheet.addEventListener('input',event => { if(event.target.name === 'amount') event.target.value = cleanAmount(event.target.value); });
 dialog.addEventListener('input',event => { if(event.target.name === 'balance') event.target.value = cleanAmount(event.target.value); });
 const swipe = {x:0,y:0,locked:''};
 app.addEventListener('touchstart',event => { const zone = event.target.closest('[data-ledger-swipe]'); if(!zone) return; swipe.x = event.touches[0].clientX; swipe.y = event.touches[0].clientY; swipe.locked = ''; },{passive:true});
 app.addEventListener('touchend',event => {
  if(!event.target.closest?.('[data-ledger-swipe]')) return;
  const dx = event.changedTouches[0].clientX - swipe.x, dy = event.changedTouches[0].clientY - swipe.y;
  if(Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) return;
  shift(dx < 0 ? 1 : -1);
 },{passive:true});
 function shift(dir) {
  if(ui.mode === 'week') ui.anchor = new Date(ui.anchor.getFullYear(),ui.anchor.getMonth(),ui.anchor.getDate() + dir * 7);
  else if(ui.mode === 'year') ui.anchor = new Date(ui.anchor.getFullYear() + dir,6,1);
  else ui.anchor = new Date(ui.anchor.getFullYear(),ui.anchor.getMonth() + dir,1);
  paint();
 }
 return {sync,paint,ui};
}
async function compress(file) {
 if(!file || !/^image\//.test(file.type || '')) throw new Error('请选择图片');
 const url = URL.createObjectURL(file);
 try {
  const img = await new Promise((resolve,reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('无法读取这张图片')); image.src = url; });
  const edge = 1280, scale = Math.min(1,edge / Math.max(img.naturalWidth,img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1,Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1,Math.round(img.naturalHeight * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(img,0,0,canvas.width,canvas.height);
  let blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',.72));
  if(blob && blob.size > 700000) blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',.5));
  if(!blob) throw new Error('图片压缩失败');
  return blob;
 } finally { URL.revokeObjectURL(url); }
}
