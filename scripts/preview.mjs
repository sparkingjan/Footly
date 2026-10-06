import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../public/',import.meta.url));
const config=JSON.parse(await readFile(new URL('../firebase.json',import.meta.url),'utf8'));
if(process.env.EMULATOR_TEST==='1'){
  const csp=config.hosting.headers[0].headers.find(header=>header.key==='Content-Security-Policy');
  csp.value=csp.value.replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:8080 http://127.0.0.1:9099");
}
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.mp4':'video/mp4'};
http.createServer(async(req,res)=>{
  try{
    const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(route==='/'?'/index.html':route));
    const relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Invalid path');
    for(const header of config.hosting.headers[0].headers)res.setHeader(header.key,header.value);
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found')}
}).listen(5173,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:5173'));
