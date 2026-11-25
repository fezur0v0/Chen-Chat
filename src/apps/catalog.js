// Page IDs are also desktop IDs. Keep them stable for saved layouts/backups.
export const APPS = [
 {id:'app-diary',name:'日记',icon:'diary',subtitle:'把普通的日子，慢慢记下来。'},
 {id:'app-music',name:'音乐',icon:'music',subtitle:'留一点旋律，陪着日常。'},
 {id:'app-gallery',name:'图库',icon:'gallery',subtitle:'喜欢的画面，放在这里。'},
 {id:'app-presets',name:'预设',icon:'presets',subtitle:'保存你喜欢的相处方式。'},
 {id:'app-worldbook',name:'世界书',icon:'worldbook',subtitle:'一起构建，属于你们的世界。'},
 {id:'app-archives',name:'档案',icon:'archives',subtitle:'关于你，也关于陪伴你的 TA。'},
 {id:'app-ledger',name:'记账',icon:'ledger',subtitle:'把每一笔，轻轻记下。'},
 {id:'app-phone',name:'查手机',icon:'phone',subtitle:'角色的虚构手机桌面'},
 {id:'app-shopping',name:'购物',icon:'shopping',subtitle:'尘选'},
 {id:'app-takeaway',name:'外卖',icon:'takeaway',subtitle:'选一家店，点一顿喜欢的。'},
 {id:'app-memory',desktop:false,name:'记忆',icon:'memory',subtitle:'把珍贵的日常，慢慢留下。'},
 {id:'app-appearance',desktop:false,name:'外观',icon:'appearance',subtitle:'让这个小世界，更像你。'}
];
export const APP_TYPES = APPS.map(app=>app.id);
// Dock-only Apps keep their route and legacy layout IDs, without a desktop copy.
export const DESKTOP_APP_TYPES = APPS.filter(app=>app.desktop!==false).map(app=>app.id);
export const findApp = id => APPS.find(app=>app.id===id);
