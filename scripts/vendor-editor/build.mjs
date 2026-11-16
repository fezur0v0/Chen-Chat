import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
const output=path.resolve('../../src/vendor');
fs.mkdirSync(output,{recursive:true});
const result=await build({entryPoints:['entry.js'],bundle:true,format:'esm',target:'es2020',minify:true,outfile:path.join(output,'tiptap.js'),legalComments:'inline',metafile:true});
const packages=new Map();
for(const input of Object.keys(result.metafile.inputs)){if(!input.includes('node_modules/'))continue;let dir=path.dirname(path.resolve(input));while(!fs.existsSync(path.join(dir,'package.json'))&&dir!==path.dirname(dir))dir=path.dirname(dir);if(!fs.existsSync(path.join(dir,'package.json')))continue;const pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));if(packages.has(pkg.name))continue;const license=['LICENSE','LICENSE.md','LICENSE.txt','license','license.md'].find(n=>fs.existsSync(path.join(dir,n)));packages.set(pkg.name,{version:pkg.version,text:license?fs.readFileSync(path.join(dir,license),'utf8'):'License: '+pkg.license});}
fs.writeFileSync(path.join(output,'editor-LICENSES.txt'),[...packages].map(([name,p])=>`${name}@${p.version}\n${p.text}`).join('\n\n----------------\n\n'));
console.log('Bundled',fs.statSync(path.join(output,'tiptap.js')).size,'bytes;',packages.size,'licensed dependencies.');
