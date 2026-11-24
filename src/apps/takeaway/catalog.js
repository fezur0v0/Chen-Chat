// Fictional shops and menus from the supplied takeaway prototype.
export const PHOTOS = {
 "LUNCH": "assets/takeaway/lunch.jpg",
 "NOODLE": "assets/takeaway/noodle.jpg",
 "TEA": "assets/takeaway/tea.jpg",
 "SWEET": "assets/takeaway/sweet.jpg",
 "SAND": "assets/takeaway/sand.jpg",
 "SALAD": "assets/takeaway/salad.jpg",
 "CHICKEN": "assets/takeaway/chicken.jpg",
 "RICE": "assets/takeaway/rice.jpg",
 "RAMEN": "assets/takeaway/ramen.jpg",
 "CREAM": "assets/takeaway/cream.jpg",
 "DUMP": "assets/takeaway/dump.jpg",
 "MANGO": "assets/takeaway/mango.jpg",
 "COCOA": "assets/takeaway/cocoa.jpg",
 "CAKE": "assets/takeaway/cake.jpg",
 "TOAST": "assets/takeaway/toast.jpg",
 "BOWL": "assets/takeaway/bowl.jpg"
};

export const STORES=[
 {id:'lunch',name:'午后食堂',cuisine:'简餐',eta:'25–35 分钟',etaN:30,min:20,fee:3,rating:'4.8',sales:'月售 800+',km:'0.6 km',cover:'LUNCH',blurb:'米饭和沙拉分开装。评分、月售和距离都是演示。',items:[
  {id:'l1',cat:'米饭',name:'酱汁鸡腿饭',price:32,sales:'月售 320+',img:'CHICKEN',desc:'鸡腿、时蔬、米饭。',groups:[{label:'饭量',choices:[['n','正常',0],['s','少饭',0]]},{label:'辣度',choices:[['0','不辣',0],['1','微辣',0]]}]},
  {id:'l2',cat:'米饭',name:'豌豆蛋炒饭',price:28,sales:'月售 210+',img:'RICE',desc:'鸡蛋、豌豆、胡萝卜。',groups:[{label:'份量',choices:[['n','正常',0],['l','大份',4]]}]},
  {id:'l3',cat:'沙拉',name:'生菜沙拉碗',price:26,sales:'月售 160+',img:'SALAD',desc:'生菜、谷物、酸奶油。',groups:[{label:'酱',choices:[['y','拌上',0],['n','酱另放',0]]}]},
  {id:'l4',cat:'沙拉',name:'当季蔬菜碗',price:24,sales:'月售 90+',img:'BOWL',desc:'混合蔬菜，不配米饭。',groups:[{label:'份量',choices:[['n','正常',0],['l','大份',4]]}]}
 ]},
 {id:'noodle',name:'一碗面',cuisine:'面食',eta:'30–40 分钟',etaN:35,min:25,fee:4,rating:'4.9',sales:'月售 1200+',km:'0.9 km',cover:'NOODLE',blurb:'汤面和小食。时间不是实时计算。',items:[
  {id:'n1',cat:'汤面',name:'虾仁汤面',price:36,sales:'月售 540+',img:'NOODLE',desc:'虾、蛋、青豆。',groups:[{label:'面量',choices:[['n','正常',0],['l','加面',3]]},{label:'辣度',choices:[['0','不辣',0],['1','微辣',0]]}]},
  {id:'n2',cat:'汤面',name:'叉烧蛋面',price:34,sales:'月售 430+',img:'RAMEN',desc:'叉烧、糖心蛋、笋。',groups:[{label:'面量',choices:[['n','正常',0],['l','加面',3]]},{label:'辣度',choices:[['0','不辣',0],['1','微辣',0]]}]},
  {id:'n3',cat:'汤面',name:'椰香鸡丝面',price:33,sales:'月售 260+',img:'CREAM',desc:'椰奶汤底和鸡丝。',groups:[{label:'辣度',choices:[['0','不辣',0],['1','微辣',0]]}]},
  {id:'n4',cat:'小食',name:'鲜虾水饺',price:22,sales:'月售 180+',img:'DUMP',desc:'三只，配黑芝麻。',groups:[{label:'醋',choices:[['y','要',0],['n','不要',0]]}]}
 ]},
 {id:'tea',name:'云朵茶',cuisine:'奶茶',eta:'20–30 分钟',etaN:25,min:15,fee:2,rating:'4.7',sales:'月售 2000+',km:'0.4 km',cover:'TEA',blurb:'冰沙和果饮，不是连锁店。',items:[
  {id:'t1',cat:'冰沙',name:'可可奶昔',price:18,sales:'月售 860+',img:'COCOA',desc:'可可、奶昔、饼干碎。',groups:[{label:'冰量',choices:[['n','正常冰',0],['l','少冰',0],['0','去冰',0]]},{label:'糖',choices:[['n','正常糖',0],['l','少糖',0],['0','无糖',0]]}]},
  {id:'t2',cat:'果饮',name:'芒果气泡',price:16,sales:'月售 640+',img:'MANGO',desc:'芒果、冰块、青柠。',groups:[{label:'冰量',choices:[['n','正常冰',0],['l','少冰',0]]},{label:'糖',choices:[['n','正常糖',0],['l','少糖',0]]}]},
  {id:'t3',cat:'冰沙',name:'芒果冰沙',price:17,sales:'月售 410+',img:'MANGO',desc:'芒果果昔。',groups:[{label:'冰量',choices:[['n','正常冰',0],['l','少冰',0]]}]}
 ]},
 {id:'sweet',name:'小甜柜',cuisine:'甜点',eta:'35–45 分钟',etaN:40,min:20,fee:5,rating:'4.8',sales:'月售 600+',km:'1.1 km',cover:'SWEET',blurb:'杯甜和切片，送达前不加热。',items:[
  {id:'s1',cat:'杯甜',name:'巧克力杯',price:22,sales:'月售 300+',img:'SWEET',desc:'慕斯和饼干。',groups:[{label:'规格',choices:[['n','标准',0],['s','小份',-4]]}]},
  {id:'s2',cat:'蛋糕',name:'奶油蛋糕切片',price:26,sales:'月售 220+',img:'CAKE',desc:'一份切片。',groups:[{label:'餐具',choices:[['y','要叉',0],['n','不要',0]]}]},
  {id:'s3',cat:'蛋糕',name:'厚切吐司',price:20,sales:'月售 150+',img:'TOAST',desc:'烤吐司，酱可另放。',groups:[{label:'酱',choices:[['y','淋上',0],['n','另放',0]]}]}
 ]},
 {id:'press',name:'街角热压',cuisine:'简餐',eta:'18–28 分钟',etaN:22,min:18,fee:3,rating:'4.6',sales:'月售 400+',km:'0.5 km',cover:'SAND',blurb:'热压三明治。仍是演示菜单。',items:[
  {id:'p1',cat:'热压',name:'玉米热压三明治',price:24,sales:'月售 190+',img:'SAND',desc:'吐司、玉米和酱。',groups:[{label:'酱',choices:[['a','全套',0],['k','不要番茄酱',0]]},{label:'温度',choices:[['y','热的',0],['n','放凉',0]]}]},
  {id:'p2',cat:'配菜',name:'配菜沙拉',price:16,sales:'月售 70+',img:'SALAD',desc:'可跟三明治一起送。',groups:[{label:'酱',choices:[['y','要',0],['n','不要',0]]}]}
 ]}
];
export const STATUSES=['商家已接单','制作中','骑手取餐','配送中','已送达'];
