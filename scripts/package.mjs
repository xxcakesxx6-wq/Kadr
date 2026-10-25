import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {packager} from '@electron/packager';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.platform!=='win32')throw Error('Run the Windows release build on Windows.');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
execFileSync(process.execPath,[path.join(root,'scripts/check.mjs')],{stdio:'inherit'});
const results=await packager({dir:root,name:'Kadr',executableName:'Kadr',platform:'win32',arch:'x64',electronVersion:pkg.devDependencies.electron,
 electronZipDir:process.env.KADR_ELECTRON_ZIP_DIR||undefined,
 out:path.join(root,'dist'),overwrite:true,asar:true,prune:true,icon:path.join(root,'icons/frame.ico'),appVersion:pkg.version,buildVersion:pkg.version,
 win32metadata:{ProductName:'Кадр',FileDescription:'Кадр — каталог кино',CompanyName:'Kadr contributors'},
 ignore:file=>{const top=file.replace(/^[/\\]/,'').split(/[/\\]/)[0];return Boolean(top&&!['src','icons','node_modules','package.json','LICENSE','THIRD_PARTY_NOTICES.md'].includes(top));}
});
const bundle=results[0];fs.mkdirSync(path.join(bundle,'licenses'),{recursive:true});
if(fs.existsSync(path.join(bundle,'LICENSE')))fs.copyFileSync(path.join(bundle,'LICENSE'),path.join(bundle,'licenses/Electron-LICENSE.txt'));
fs.copyFileSync(path.join(root,'LICENSE'),path.join(bundle,'LICENSE'));
fs.copyFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(bundle,'THIRD_PARTY_NOTICES.md'));
fs.writeFileSync(path.join(bundle,'README.txt'),`КАДР ${pkg.version}\r\n\r\nРазработано с помощью OpenAI Codex.\r\n\r\nЗапуск: открой Kadr.exe. Установка не требуется.\r\nWindows 10/11 x64. Для онлайн-возможностей нужен интернет.\r\n\r\nПапки resources, locales, DLL и PAK — части программы.\r\nИзбранное и настройки хранятся в профиле Windows, отдельно от этой папки.\r\nЛицензия: GPL-2.0. Сведения об авторах: THIRD_PARTY_NOTICES.md.\r\n`,'utf8');
const release=path.join(root,'release');fs.mkdirSync(release,{recursive:true});
const zip=path.join(release,`Kadr-${pkg.version}-windows-x64.zip`);
if(fs.existsSync(zip))fs.unlinkSync(zip);
const quote=s=>"'"+s.replaceAll("'","''")+"'";
execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory(${quote(bundle)},${quote(zip)},[System.IO.Compression.CompressionLevel]::Optimal,$true)`],{stdio:'inherit'});
const digest=crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
fs.writeFileSync(path.join(release,'SHA256SUMS.txt'),digest+'  '+path.basename(zip)+'\n');
console.log('Release: '+zip);
