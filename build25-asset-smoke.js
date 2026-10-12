'use strict';
// Run from repository root: node build25-asset-smoke.js
const fs=require('fs');
const crypto=require('crypto');
const html=fs.readFileSync('index.html','utf8');
const tiles=fs.readFileSync('tiles.png');
function check(cond,msg){if(!cond){console.error('FAIL: '+msg);process.exitCode=1;}else console.log('PASS: '+msg);}
const size={width:tiles.readUInt32BE(16),height:tiles.readUInt32BE(20)};
check(tiles.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'PNG signature');
check(size.width===2048&&size.height===2048,'2048x2048 sprite sheet');
const m=html.match(/"assets\/tiles\.png"\s*:\s*"data:image\/png;base64,([A-Za-z0-9+/=]+)"/);
check(!!m,'embedded sprite sheet exists');
if(m){const inner=Buffer.from(m[1],'base64');check(crypto.createHash('sha256').update(inner).digest('hex')===crypto.createHash('sha256').update(tiles).digest('hex'),'embedded and external sprite sheet match');}
for(const [id,name] of [[918,'Elf Hat'],[929,'Bengal Tiger'],[930,'White Tiger'],[931,'Unloved Dog'],[981,'Turkey']])check(html.includes(name),'item '+id+' '+name+' exists');
if(!process.exitCode)console.log('Static assets passed; visual equip/rig test still required.');
