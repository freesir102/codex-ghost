import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
let callback; const element={innerHTML:''};
const ctx={Date,window:{},document:{getElementById:()=>element},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>callback=fn};
vm.createContext(ctx);vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const api=ctx.window.pixelTerminal, run=s=>vm.runInContext(s,ctx);
callback(100);assert.match(element.innerHTML,/data-component="date"/);
assert.match(element.innerHTML,/data-pattern="dash-dot" data-phase="1"/);
callback(200);assert.match(element.innerHTML,/data-pattern="dash-dot" data-phase="2"/);
for(const [p,expected] of [[0,'apple'],[49,'apple'],[50,'floating'],[79,'floating'],[80,'flag'],[99,'flag'],[100,'celebrating']])assert.equal(api.progressState(p),expected);
for(const [t,expected] of [['06:59','night'],['07:00','day'],['19:59','day'],['20:00','night']])assert.equal(api.timeState(t),expected);
for(const p of [30,65,85,100])for(const time of ['13:41','23:41']){
 const svg=api.render({progress:p,date:'2026-9-30',time},2.1);
 assert.match(svg,new RegExp(`data-posture="${api.progressState(p)}"`));
 assert.equal(svg.includes('data-accessory="apple"'),p===30);
 assert.equal(svg.includes('data-accessory="flag"'),p===85);
 assert.equal(svg.includes('data-accessory="star"'),p===100);
 assert.doesNotMatch(svg,/data-accessory="(?:cup|steam)"|#71c97a/);
 if(p===30)assert.match(svg,/data-expression="kiss"/);
 assert.notEqual(run(`ghostComponent(${p},"${time}",0)`),run(`ghostComponent(${p},"${time}",1)`));
 assert.equal(run(`ghostComponent(${p},"${time}",0,true)`),run(`ghostComponent(${p},"${time}",1,true)`));
}
assert.notEqual(run('heart(450,330,0)'),run('heart(450,330,.8)'));
assert.equal(run('heart(450,330,0,true)'),run('heart(450,330,.8,true)'));
for(let phase=0;phase<16;phase++){
 const svg=run(`daylightComponent("13:41",${phase*.5})`);
 assert.equal((svg.match(/<rect /g)||[]).length,5); // fixed center plus four rays
}
assert.notEqual(run('daylightComponent("13:41",0)'),run('daylightComponent("13:41",.6)'));
assert.equal(run('daylightComponent("13:41",0,true)'),run('daylightComponent("13:41",.6,true)'));
assert.equal(run('daylightComponent("23:41",0)'),run('daylightComponent("23:41",.6)'));
// Exercise the real renderer connection, not just the independent frame helper.
const sample={progress:48,date:'2026-9-30',time:'13:41'};
const first=api.render(sample,0),second=api.render(sample,1.6);
const digits=svg=>[...svg.matchAll(/<g data-component="digits">(.*?)<\/g>/g)].map(x=>x[1]);
assert.equal((second.match(/data-pattern="dash-dot"/g)||[]).length,2);
assert.deepEqual(digits(first),digits(second));
assert.notEqual(run('pixelFrame(layout.percent,0)'),run('pixelFrame(layout.percent,.1)'));
assert.equal(run('pixelFrame(layout.percent,0)'),run('pixelFrame(layout.percent,72.2)'));
assert.equal(api.render(sample,0,true),api.render(sample,42,true));
for(const box of ['percent','time'])for(const t of [0,.1,2.7,8.3,16.6,27.8,36.1,44.4,55.6,64.2,72.1]){
 const b=run(`layout.${box}`),border=run(`pixelFrame(layout.${box},${t})`);
 assert.doesNotMatch(border,/<(?:path|circle)|stroke|filter/);
 assert.match(border,/fill="#28e4eb"/);
 const cells=[...border.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
 assert.ok(cells.length>100);
 for(const cell of cells){
  const [x,y,w,h]=cell.slice(1).map(Number);
  assert.ok(x>=b.x&&x+w<=b.x+b.w&&y>=b.y&&y+h<=b.y+b.h);
  assert.ok(x<b.x+14||x+w>b.x+b.w-14||y<b.y+14||y+h>b.y+b.h-14,'frame must stay outside the number area');
  assert.ok([x-b.x,y-b.y,w,h].every(n=>n%2===0),'explicit 2px grid');
 }
}
api.setState({progress:85});const before=JSON.stringify(api.getState());
for(const bad of [{progress:101},{progress:-1},{progress:30.5},{date:'2026-2-30'},{time:'25:00'}]){assert.throws(()=>api.setState(bad));assert.equal(JSON.stringify(api.getState()),before);}
api.setState({progress:null});assert.match(api.render(api.getState()),/data-component="percent"/);
console.log('PASS: actual frame callback, 8 states, quota thresholds, day/night boundaries, apple/kiss, sun orbit, heart pulse, flowing dash-dot frames, stable digits, frame bounds/grid/cycle, reduced motion, atomic input rejection');
