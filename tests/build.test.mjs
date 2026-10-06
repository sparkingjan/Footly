import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
test('browser assets have valid local links, parseable scripts, and no inline executable handlers',async()=>{
  const files=await readdir('public');
  assert(!files.some(file=>/rules|package|\.py$|\.mjs$|\.json$/.test(file)));
  for(const file of files){
    if(file.endsWith('.js'))execFileSync(process.execPath,['--check','public/'+file],{windowsHide:true});
    if(!file.endsWith('.html'))continue;
    const text=await readFile('public/'+file,'utf8');
    assert(!/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(text),`${file} contains inline JavaScript`);
    assert(!/\bon(?:click|load|error|submit)\s*=/i.test(text),`${file} contains an inline handler`);
    for(const [,value] of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
      if(/^(https?:|data:|#|mailto:)/.test(value))continue;
      await access('public/'+value.split(/[?#]/)[0]);
    }
  }
});
