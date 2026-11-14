// Receipt photos stay in their own database, apart from chat voice and music files.
let database;
function openDatabase() {
 if(!database) database = new Promise((resolve,reject) => {
  const request = indexedDB.open('chenxin.ledger.images.v1',1);
  request.onupgradeneeded = () => request.result.createObjectStore('images');
  request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); database = undefined; }; resolve(db); };
  request.onerror = () => { database = undefined; reject(new Error('本机图片存储不可用。')); };
  request.onblocked = () => reject(new Error('请关闭其他打开的页面后再保存图片。'));
 });
 return database;
}
export async function ledgerImage(id,file) {
 const db = await openDatabase();
 return new Promise((resolve,reject) => {
  const transaction = db.transaction('images',file === undefined ? 'readonly' : 'readwrite'), store = transaction.objectStore('images');
  const request = file === undefined ? store.get(id) : file === null ? store.delete(id) : store.put(file,id);
  transaction.oncomplete = () => resolve(request.result);
  transaction.onerror = transaction.onabort = () => reject(new Error('图片没有存下，本机空间可能不够。'));
 });
}
