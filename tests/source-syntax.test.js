import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

// New modules are checked automatically, without changing package.json for each file.
const root=fileURLToPath(new URL('../',import.meta.url));
function sourceFiles(directory){
 if(!existsSync(directory))return [];
 return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const path=join(directory,entry.name);
  return entry.isDirectory()?sourceFiles(path):entry.isFile()&&/\.(?:js|mjs|cjs)$/.test(entry.name)?[path]:[];
 }).sort();
}
test('all application and tooling JavaScript passes syntax checks',()=>{
 const files=['src','scripts'].flatMap(name=>sourceFiles(join(root,name)));
 assert(files.length>0,'No JavaScript sources were found.');
 for(const path of files){
  const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,`${relative(root,path)}\n${result.error?.message||result.stderr||result.stdout}`);
 }
});
