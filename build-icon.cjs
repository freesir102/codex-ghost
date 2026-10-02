// The icon is generated from our existing vector character, not a raster edit.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sharp=require('sharp');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const context={Date,window:{},document:{getElementById:()=>({innerHTML:''})},matchMedia:()=>({matches:false}),requestAnimationFrame:()=>{}};
vm.createContext(context);vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
const ghost=vm.runInContext('ghostComponent(65,"13:41",0,true)',context);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="72 202 464 464" shape-rendering="crispEdges"><rect x="72" y="202" width="464" height="464" fill="#000000"/>${ghost}</svg>`;
const folder=path.join(__dirname,'build','AppIcon.iconset');fs.mkdirSync(folder,{recursive:true});
(async()=>{
 const original=await sharp(Buffer.from(svg)).png().toBuffer();fs.writeFileSync(path.join(__dirname,'icon-preview.png'),original);
 for(const size of [16,32,128,256,512])for(const scale of [1,2])await sharp(original).resize(size*scale,size*scale,{kernel:'nearest'}).png().toFile(path.join(folder,`icon_${size}x${size}${scale===2?'@2x':''}.png`));
})().catch(e=>{console.error(e.message);process.exit(1);});
