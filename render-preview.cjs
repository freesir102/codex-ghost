// Render the actual component implementation without browser or network access.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sharp=require('sharp');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');let raf;
const root={innerHTML:''};const ctx={Date,window:{},document:{getElementById(){return root;}},matchMedia(){return{matches:false};},requestAnimationFrame(fn){raf=fn;}};
vm.createContext(ctx);vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const run=s=>vm.runInContext(s,ctx),api=ctx.window.pixelTerminal;
raf(100);assert.match(root.innerHTML,/data-component="date"/);
for(const [n,posture]of[[0,'apple'],[49,'apple'],[50,'floating'],[79,'floating'],[80,'flag'],[99,'flag'],[100,'celebrating']])assert.equal(api.progressState(n),posture);
for(const [time,state]of[['06:59','night'],['07:00','day'],['19:59','day'],['20:00','night']])assert.equal(api.timeState(time),state);
for(const p of [30,65,85,100])for(const time of ['13:41','23:41']){const s=api.render({progress:p,date:'2026-9-30',time},0);assert.match(s,new RegExp(`data-posture="${api.progressState(p)}"`));assert.match(s,new RegExp(`data-time-state="${api.timeState(time)}"`));assert.match(s,new RegExp(`data-symbol="${time==='13:41'?'sun':'moon'}"`));assert.equal(s.includes('data-accessory="flag"'),p===85);assert.equal(s.includes('data-accessory="star"'),p===100);assert.equal(s.includes('data-accessory="apple"'),p===30);assert.equal(s.includes('data-accessory="sleep-cap"'),time==='23:41');if(p===85)assert.ok(s.includes('#ef4545'));}
api.setState({progress:85});const before=JSON.stringify(api.getState());assert.throws(()=>api.setState({progress:101}));assert.equal(JSON.stringify(api.getState()),before);assert.throws(()=>api.setState({date:'2026-2-30'}));assert.throws(()=>api.setState({time:'25:00'}));
assert.match(api.render({progress:null,date:null,time:null}),/data-component="percent"/);
assert.match(run('ghostComponent(30,"23:41",2.1)'),/data-expression="kiss"/);
for(const time of ['13:41','23:41'])for(const p of [30,65,85,100]){const svg=api.render({progress:p,date:'2026-9-30',time},2.1);assert.doesNotMatch(svg,/data-accessory="(?:cup|steam)"|data-wisps=/);if(p===30){assert.match(svg,/data-accessory="apple"/);assert.match(svg,/#ef4545/);}}
assert.match(run('ghostComponent(30,"13:41",2.1)'),/data-expression="kiss"/);
assert.doesNotMatch(run('ghostComponent(30,"13:41",2.1)'),/data-wisps="2"/);
for(const time of ['13:41','23:41']){
assert.doesNotMatch(run(`ghostComponent(30,"${time}",0)`),/data-expression="kiss"/);
assert.doesNotMatch(run(`ghostComponent(30,"${time}",2.1,true)`),/data-expression="kiss"/);
}
for(const p of [30,65,85,100])for(const time of ['13:41','23:41']){assert.notEqual(run(`ghostComponent(${p},"${time}",0)`),run(`ghostComponent(${p},"${time}",1)`));assert.equal(run(`ghostComponent(${p},"${time}",0,true)`),run(`ghostComponent(${p},"${time}",1,true)`));}
// Independent motion respects the same reduced-motion flag as the ghost.
assert.notEqual(run('heart(450,330,0)'),run('heart(450,330,.8)'));
assert.equal(run('heart(450,330,0,true)'),run('heart(450,330,.8,true)'));
assert.notEqual(run('daylightComponent("13:41",0)'),run('daylightComponent("13:41",.6)'));
assert.equal(run('daylightComponent("13:41",0,true)'),run('daylightComponent("13:41",.6,true)'));
assert.equal(run('daylightComponent("23:41",0)'),run('daylightComponent("23:41",.6)'));
assert.doesNotMatch(run('ghostComponent(30,"13:41",2.1)'),/#71c97a/);
const wrap=s=>`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" shape-rendering="crispEdges">${s}</svg>`;
(async()=>{
const svg=wrap(api.render({progress:65,date:'2026-9-30',time:'13:41'},0));fs.writeFileSync(path.join(__dirname,'preview.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,'preview.png'));
for(const p of [85,100])await sharp(Buffer.from(wrap(api.render({progress:p,date:'2026-9-30',time:'13:41'},0)))).png().toFile(path.join(__dirname,`state-${p}.png`));
const variants=[];for(const p of [30,65,85,100])for(const time of ['13:41','23:41'])variants.push(await sharp(Buffer.from(wrap(api.render({progress:p,date:'2026-9-30',time},0)))).png().toBuffer());
await sharp({create:{width:1280,height:720,channels:3,background:'#000'}}).composite(await Promise.all(variants.map(async(b,i)=>({input:await sharp(b).resize(320,360,{fit:'contain',background:'#000',kernel:'nearest'}).toBuffer(),left:(Math.floor(i/2))*320,top:(i%2)*360})))).png().toFile(path.join(__dirname,'states.png'));
if(process.argv.includes('--hero')){const frames=[];for(let i=0;i<56;i++){frames.push(await sharp(Buffer.from(wrap(api.render({progress:30,date:'2026-9-30',time:'13:41'},i/10)))).resize(960,540,{kernel:'nearest'}).ensureAlpha().raw().toBuffer());}await sharp(Buffer.concat(frames),{raw:{width:960,height:540*56,channels:4,pageHeight:540}}).gif({delay:Array(56).fill(100),loop:0,effort:7}).toFile(path.join(__dirname,'docs','demo.gif'));}
else if(process.argv.includes('--frames')){const frames=[];for(let i=0;i<60;i++){
const views=[];for(const p of [30,65,85,100])for(const time of ['13:41','23:41'])views.push(await sharp(Buffer.from(wrap(api.render({progress:p,date:'2026-9-30',time},i/10)))).resize(320,360,{fit:'contain',background:'#000',kernel:'nearest'}).png().toBuffer());
frames.push((await sharp({create:{width:1280,height:720,channels:3,background:'#000'}}).composite(views.map((input,j)=>({input,left:Math.floor(j/2)*320,top:(j%2)*360}))).png().toBuffer()).toString('base64'));}process.stdout.write(JSON.stringify(frames));}
else console.log('PASS: actual render callback, state thresholds, day/night boundaries, 8 posture/time combinations, independent updates, invalid input atomic rejection, reduced motion; PNG/SVG and state contact sheet rendered.');
})().catch(e=>{console.error(e.message);process.exit(1);});
