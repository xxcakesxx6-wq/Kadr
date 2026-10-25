import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const meta=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(meta.version!=='1.0.0')throw Error('The first public release must be 1.0.0');
const excluded=new Set(['node_modules','.git','dist','release']);
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(excluded.has(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else files.push(file);}}
walk(root);
let checked=0;
for(const file of files){
 const relative=path.relative(root,file).replaceAll('\\','/');
 if(/\.(?:exe|dll|asar|bak|log|zip|pdb)$/i.test(file))throw Error('Generated/private file in source tree: '+relative);
 if(/\.(?:js|mjs|cjs)$/.test(file)){execFileSync(process.execPath,['--check',file],{stdio:'pipe'});checked++;}
 if(/\.(?:js|mjs|cjs|json|html|css|md|yml)$/.test(file)){
  const text=fs.readFileSync(file,'utf8');
  const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/,/sk-(?:proj-)[A-Za-z0-9_-]{30,}/,/[A-Z]:[\\/]+Users[\\/]+[^\\/"\r\n]+[\\/]/i];
  if(patterns.some(re=>re.test(text)))throw Error('Potential private credential/path in '+relative);
  if(relative.startsWith('src/')&&!relative.startsWith('src/plugins/')&&/Кадр\s+0\.\d|КАДР \/ DESKTOP · 0\./.test(text))throw Error('Old product version in '+relative);
 }
}
const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)){
 const ref=match[1].split('?')[0];if(/^(?:https?:|data:|#)/.test(ref))continue;
 if(!fs.existsSync(path.resolve(root,'src',ref)))throw Error('Missing HTML asset: '+ref);
}
for(const name of ['README.md','LICENSE','THIRD_PARTY_NOTICES.md','package-lock.json','docs/RELEASE-1.0.0.md'])if(!fs.existsSync(path.join(root,name)))throw Error('Missing '+name);
console.log(`OK: ${files.length} source files; ${checked} JavaScript files parse; required assets and notices present; no targeted private-key/token/path patterns found.`);
