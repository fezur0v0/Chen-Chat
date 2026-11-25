// Tabler Icons v3.35.0, MIT. See assets/licenses/tabler-icons.txt.
const paths = {
 tools: "<path d=\"M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12zm0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3\"/>",
 lunch: "<path d=\"M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1z\"/><path d=\"M19 7l-14 1\"/><path d=\"M19 2l-14 3\"/>",
 noodles: "<path d=\"M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1z\"/><path d=\"M12 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2\"/><path d=\"M16 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2\"/><path d=\"M8 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2\"/>",
 tea: "<path d=\"M5 11h14v-3h-14z\"/><path d=\"M17.5 11l-1.5 10h-8l-1.5 -10\"/><path d=\"M6 8v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1\"/><path d=\"M15 5v-2\"/>",
 dessert: "<path d=\"M3 20h18v-8a3 3 0 0 0 -3 -3h-12a3 3 0 0 0 -3 3v8z\"/><path d=\"M3 14.803c.312 .135 .654 .204 1 .197a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1c.35 .007 .692 -.062 1 -.197\"/><path d=\"M12 4l1.465 1.638a2 2 0 1 1 -3.015 .099l1.55 -1.737z\"/>",
 sandwich: "<path d=\"M4 15h16a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z\"/><path d=\"M12 4c3.783 0 6.953 2.133 7.786 5h-15.572c.833 -2.867 4.003 -5 7.786 -5z\"/><path d=\"M5 12h14\"/>",
 salad: "<path d=\"M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1z\"/><path d=\"M18.5 11c.351 -1.017 .426 -2.236 .5 -3.714v-1.286h-2.256c-2.83 0 -4.616 .804 -5.64 2.076\"/><path d=\"M5.255 11.008a12.204 12.204 0 0 1 -.255 -2.008v-1h1.755c.98 0 1.801 .124 2.479 .35\"/><path d=\"M8 8l1 -4l4 2.5\"/><path d=\"M13 11v-.5a2.5 2.5 0 1 0 -5 0v.5\"/>",
 chicken: "<path d=\"M13.62 8.382l1.966 -1.967a2 2 0 1 1 3.414 -1.415a2 2 0 1 1 -1.413 3.414l-1.82 1.821\"/><path d=\"M5.904 18.596c2.733 2.734 5.9 4 7.07 2.829c1.172 -1.172 -.094 -4.338 -2.828 -7.071c-2.733 -2.734 -5.9 -4 -7.07 -2.829c-1.172 1.172 .094 4.338 2.828 7.071z\"/><path d=\"M7.5 16l1 1\"/><path d=\"M12.975 21.425c3.905 -3.906 4.855 -9.288 2.121 -12.021c-2.733 -2.734 -8.115 -1.784 -12.02 2.121\"/>",
 dumpling: "<path d=\"M5.532 5.532a2.53 2.53 0 0 1 2.56 -.623a2.532 2.532 0 0 1 4.604 -.717q .146 -.24 .356 -.45a2.532 2.532 0 0 1 4.318 1.637a2.53 2.53 0 0 1 2.844 .511l.358 .358c1.384 1.385 -.7 5.713 -4.655 9.669c-3.956 3.955 -8.284 6.04 -9.669 4.655l-.358 -.358l-.114 -.122a2.53 2.53 0 0 1 -.398 -2.724a2.532 2.532 0 0 1 -1.186 -4.675a2.532 2.532 0 0 1 .718 -4.603a2.53 2.53 0 0 1 .622 -2.558\"/>",
 shake: "<path d=\"M17 10a5 5 0 0 0 -10 0\"/><path d=\"M6 10m0 1a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1z\"/><path d=\"M7 13l1.81 7.243a1 1 0 0 0 .97 .757h4.44a1 1 0 0 0 .97 -.757l1.81 -7.243\"/><path d=\"M12 5v-2\"/>",
 toast: "<path d=\"M18 4a3 3 0 0 1 2 5.235v8.765a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-8.764a3 3 0 0 1 1.824 -5.231h12.176v-.005z\"/>",
 pin: "<path d=\"M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0\"/><path d=\"M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z\"/>",
 down: "<path d=\"M6 9l6 6l6 -6\"/>",
 edit: "<path d=\"M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4\"/><path d=\"M13.5 6.5l4 4\"/>",
 delete: "<path d=\"M4 7l16 0\"/><path d=\"M10 11l0 6\"/><path d=\"M14 11l0 6\"/><path d=\"M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12\"/><path d=\"M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3\"/>",
 plus: "<path d=\"M12 5l0 14\"/><path d=\"M5 12l14 0\"/>",
 minus: "<path d=\"M5 12l14 0\"/>",
 check: "<path d=\"M5 12l5 5l10 -10\"/>",
 search: "<path d=\"M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0\"/><path d=\"M21 21l-6 -6\"/>",
 heart: "<path d=\"M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572\"/>",
 me: "<path d=\"M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0\"/><path d=\"M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2\"/>",
 orders: "<path d=\"M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2\"/>",
 close: "<path d=\"M18 6l-12 12\"/><path d=\"M6 6l12 12\"/>"
};

export function takeawayIcon(name){
 return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.tools}</svg>`;
}

const foodArt = {
 LUNCH:['lunch','peach'], RICE:['lunch','peach'], CHICKEN:['chicken','peach'],
 NOODLE:['noodles','blue'], RAMEN:['noodles','blue'], CREAM:['noodles','blue'], DUMP:['dumpling','blue'],
 TEA:['tea','lilac'], MANGO:['tea','lilac'], COCOA:['shake','lilac'],
 SWEET:['dessert','rose'], CAKE:['dessert','rose'], TOAST:['toast','rose'],
 SAND:['sandwich','butter'], SALAD:['salad','mint'], BOWL:['salad','mint'],
};

export function foodIllustration(kind){
 const [icon,tone]=foodArt[kind] || ['tools','mint'];
 return `<span class="food-illustration" data-tone="${tone}" aria-hidden="true">${takeawayIcon(icon)}</span>`;
}
