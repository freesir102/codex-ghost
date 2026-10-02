// Generate review assets from the real renderer; never edit or install the App.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sharp=require('sharp');
(async()=>{
 const variants=[
  {kind:'apple-bite',name:'偷咬苹果',progress:30,time:'13:41'},
  {kind:'shy-kiss',name:'害羞亲亲',progress:30,time:'13:41'},
  {kind:'sleepy-yawn',name:'困困打哈欠',progress:65,time:'23:41'},
  {kind:'little-wave',name:'轻轻挥手',progress:65,time:'13:41'},
  {kind:'playful-wink',name:'调皮挤眼',progress:65,time:'13:41'}
 ];
 const source=path.resolve(__dirname,'../index.html'),html=fs.readFileSync(source,'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].split('const root=document.getElementById')[0];
 const ctx={Date,window:{}};vm.createContext(ctx);vm.runInContext(script,ctx);
 const components=vm.runInContext('({ghost:ghostComponent,heart,rect,colors:color})',ctx);
 ctx.renderPreviewMoment=vm.runInContext('renderMomentGhost',ctx);ctx.previewKind='apple-bite';
 const momentState=vm.runInContext('momentState',ctx);
 const api={render:(state,seconds=0,reduced=false)=>ctx.window.pixelTerminal.renderMoment(state,ctx.previewKind,seconds,reduced)},date='2026-10-2';
 assert.throws(()=>momentState('unknown',0));
 for(const bad of [-1,NaN,Infinity])assert.throws(()=>momentState('apple-bite',bad));
 const digits=svg=>[...svg.matchAll(/<g data-component="digits">(.*?)<\/g>/g)].map(x=>x[1]);
 for(const variant of variants){
  const {kind,progress,time}=variant;ctx.previewKind=kind;const state={progress,date,time};
  const idle=api.render(state,0),active=api.render(state,2.5);
  assert.match(active,new RegExp('data-moment="'+kind+'"'));
  assert.equal((active.match(/data-accessory="heart"/g)||[]).length,1);
  assert.equal((active.match(/data-accessory="apple"/g)||[]).length,progress===30?1:0);
  assert.doesNotMatch(active,/data-accessory="(?:cup|steam)"|#71c97a/);
  assert.deepEqual(digits(idle),digits(active));
  assert.equal(api.render(state,0,true),api.render(state,3,true));
  assert.equal(ctx.renderPreviewMoment(kind,progress,time,6),components.ghost(progress,time,6));
  assert.equal(ctx.renderPreviewMoment(kind,100,time,2.5),components.ghost(100,time,2.5));
  assert.equal(ctx.renderPreviewMoment(kind,null,time,2.5),components.ghost(null,time,2.5));
  for(const t of [1,1.6,2,2.5,3,3.6,4.2,5.9]){
   const output=api.render(state,t);assert.equal((output.match(/<g(?: |>|$)/g)||[]).length,(output.match(/<\/g>/g)||[]).length);
   assert.deepEqual(digits(idle),digits(output));
  }
 }
 assert.equal(momentState('apple-bite',2).bite,true);assert.equal(momentState('apple-bite',3).stage,'chew');
 assert.equal(momentState('shy-kiss',2).kiss,true);assert.equal(momentState('shy-kiss',2).heartUnit,14);
 assert.equal(momentState('sleepy-yawn',2.5).wide,true);
 assert.equal(ctx.renderPreviewMoment('sleepy-yawn',65,'13:41',2.5),components.ghost(65,'13:41',2.5));
 assert.match(ctx.renderPreviewMoment('little-wave',65,'13:41',2.1),/data-moment-arm="2"/);
 assert.equal(momentState('playful-wink',2).stage,'squeeze');
 assert.match(ctx.renderPreviewMoment('playful-wink',65,'13:41',2),/data-moment-face="squeeze"/);
 const squeezedFace=ctx.renderPreviewMoment('playful-wink',65,'13:41',2).match(/<g data-moment-face="squeeze">(.*?)<\/g>/)[1];
 for(const [x,y]of [[9,8],[11,10],[21,8],[19,10]])assert.ok(squeezedFace.includes(components.rect(x,y,1,1,'#000000')),'Both eye tips face toward the middle');
 for(const [x,y]of [[11,8],[9,10],[19,8],[21,10]])assert.ok(!squeezedFace.includes(components.rect(x,y,1,1,'#000000')),'Outward-facing eye pixels are absent');
 const out=path.resolve(__dirname,'../build/moments-preview');fs.mkdirSync(out,{recursive:true});
 const wrap=s=>`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" shape-rendering="crispEdges">${s}</svg>`;
 for(const variant of variants){
  const {kind,progress,time}=variant;ctx.previewKind=kind;const frames=[],details=[],state={progress,date,time};
  for(let i=0;i<80;i++){
   const svg=Buffer.from(wrap(api.render(state,i/10)));
   frames.push(await sharp(svg).resize(960,540,{kernel:'nearest'}).ensureAlpha().raw().toBuffer());
   details.push(await sharp(svg).extract({left:72,top:165,width:480,height:440}).ensureAlpha().raw().toBuffer());
  }
  for(const [suffix,buffers,width,height]of[['',frames,960,540],['-detail',details,480,440]]){
   await sharp(Buffer.concat(buffers),{raw:{width,height:height*80,channels:4,pageHeight:height}}).gif({delay:Array(80).fill(100),loop:0,effort:7}).toFile(path.join(out,kind+suffix+'.gif'));
  }
  await sharp(Buffer.from(wrap(api.render(state,2.5)))).png().toFile(path.join(out,kind+'.png'));
 }
 const figures=variants.map(v=>`<figure><figcaption>${v.name} · 仅设计预览</figcaption><svg id="${v.kind}" viewBox="0 0 1280 720"></svg></figure>`).join('');
 const previewHTML=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>小幽灵 · 五种动作设计预览</title><style>*{box-sizing:border-box}body{margin:0;background:#000;color:#fff;font:16px system-ui}main{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px}figure{margin:0}figcaption{text-align:center;margin-bottom:20px;color:#ddd}svg{width:100%;display:block;shape-rendering:crispEdges;image-rendering:pixelated}@media(max-width:900px){main{grid-template-columns:1fr}}</style><main>${figures}</main><script>${script}</script><script>const variants=${JSON.stringify(variants)},start=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let previous=-1000;function tick(ts){if(ts-previous>=100){const elapsed=(ts-start)/1000;for(const v of variants){document.getElementById(v.kind).innerHTML=window.pixelTerminal.renderMoment({progress:v.progress,date:'${date}',time:v.time},v.kind,elapsed,reduced);}previous=ts;}requestAnimationFrame(tick);}requestAnimationFrame(tick);</script></html>`;
 fs.writeFileSync(path.join(out,'moments.html'),previewHTML);
 // Execute the standalone HTML's real frame callback, with the DOM synthesized.
 for(const reduced of [false,true]){
  const elements=Object.fromEntries(variants.map(v=>[v.kind,{innerHTML:''}]));let callback;
  const environment={Date,window:{},performance:{now:()=>0},matchMedia:()=>({matches:reduced}),document:{getElementById:id=>elements[id]},requestAnimationFrame:fn=>callback=fn};vm.createContext(environment);
  for(const match of previewHTML.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))vm.runInContext(match[1],environment);
  callback(0);const idle=Object.fromEntries(variants.map(v=>[v.kind,elements[v.kind].innerHTML]));callback(2500);
  for(const v of variants){if(reduced)assert.equal(idle[v.kind],elements[v.kind].innerHTML);else assert.match(elements[v.kind].innerHTML,new RegExp('data-moment="'+v.kind+'"'));}
  callback(6500);for(const v of variants)assert.doesNotMatch(elements[v.kind].innerHTML,/data-moment=/);
 }
 const results=[];
 for(const {kind}of variants){
  const meta=await sharp(path.join(out,kind+'-detail.gif'),{animated:true}).metadata();
  // GIF encoders coalesce identical frames; sample by playback time, not page number.
  assert.ok(meta.pages>1);assert.equal(meta.delay.length,meta.pages);assert.equal(meta.delay.reduce((a,b)=>a+b,0),8000);
  const {data,info}=await sharp(path.join(out,kind+'-detail.gif'),{animated:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const bytes=info.width*info.pageHeight*4;
  const frameAt=ms=>{let end=0;for(let i=0;i<meta.pages;i++){end+=meta.delay[i];if(ms<end)return data.subarray(i*bytes,(i+1)*bytes);}throw Error('GIF playback time outside loop');};
  const mask=(frame,box,color)=>{const bits=[];for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){const p=(y*info.width+x)*4;bits.push(color(frame[p],frame[p+1],frame[p+2]));}return Buffer.from(bits);};
  const sum=bits=>bits.reduce((a,b)=>a+b,0),black=(r,g,b)=>r<20&&g<20&&b<20?1:0,white=(r,g,b)=>r>240&&g>240&&b>240?1:0;
  const red=(r,g,b)=>r>180&&g<100&&b<120?1:0,pink=(r,g,b)=>r>200&&g>65&&g<170&&b>100?1:0;
  const first=frameAt(0),active=frameAt(2500);
  assert.ok(!first.equals(active));
  if(kind==='apple-bite'){
   const box=[30,75,390,435];
   assert.ok(sum(mask(frameAt(2000),box,red))<sum(mask(first,box,red)),'Apple actually loses bite pixels');
   assert.equal(sum(mask(frameAt(6500),box,red)),sum(mask(first,box,red)),'Apple restores after moment');
  }else if(kind==='shy-kiss'){
   const box=[365,140,480,255];assert.ok(sum(mask(active,box,pink))>sum(mask(first,box,pink)),'Kiss heart actually grows');
  }else if(kind==='sleepy-yawn'){
   const box=[195,220,255,290];assert.ok(sum(mask(active,box,black))>sum(mask(first,box,black)),'Yawn mouth actually opens wider');
  }else if(kind==='little-wave'){
   const box=[310,170,390,310];assert.ok(!mask(first,box,white).equals(mask(frameAt(2100),box,white)),'Existing white arm actually moves');
  }else if(kind==='playful-wink'){
   const box=[135,182,306,226];assert.ok(!mask(first,box,black).equals(mask(active,box,black)),'Wink changes the eye pixels');
  }
  results.push({kind,source_frames:80,encoded_frames:meta.pages,duration_ms:8000,actual_action_pixels:'PASS'});
 }
 fs.writeFileSync(path.join(out,'preview-check.json'),JSON.stringify({preview_only:true,generated_at:new Date().toISOString(),renderer_and_standalone_callback:'PASS',reduced_motion:'PASS',incompatible_postures_and_daytime_yawn:'PASS',stable_digits:'PASS',five_animations:results,native_app:'NOT_APPLIED',github:'NOT_PUSHED'},null,2)+'\n');
 console.log(JSON.stringify({preview_only:true,render_tests:'PASS',animations:5,output:out,installed_app_unchanged:true,github_not_pushed:true}));
})().catch(e=>{console.error(e.message.slice(0,1200));process.exit(1);});
