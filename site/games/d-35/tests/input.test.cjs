'use strict';
// Project real scene geometry and exercise Pointer Events in Node.
// The renderer, offline canvas brushes and sound hardware are deliberately inert.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const directory=path.resolve(__dirname,'..');
function test(width,height){
  const drawing=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||(()=>{})});
  function element(){return {clientWidth:width,clientHeight:height,style:{},listeners:{},getContext:()=>drawing,
    addEventListener(k,cb){this.listeners[k]=cb;},getBoundingClientRect:()=>({left:0,top:0,width,height}),
    setPointerCapture(id){this.captured=id;},hasPointerCapture(id){return this.captured===id;},releasePointerCapture(){this.captured=null;}};}
  const elements=Object.fromEntries(['room','chapters','sound','guide','icon'].map(k=>[k,element()]));
  let clock=0,frame,camera;
  const ctx={console,innerWidth:width,innerHeight:height,devicePixelRatio:1,addEventListener(){},
    performance:{now:()=>clock},requestAnimationFrame(fn){frame=fn;},document:{createElement:element,
      getElementById:k=>elements[k],querySelector:()=>elements.icon,addEventListener(){},hidden:false}};
  ctx.window=ctx;vm.createContext(ctx);
  const load=f=>vm.runInContext(fs.readFileSync(path.join(directory,f),'utf8'),ctx,{filename:f});
  load('vendor/three.min.js');
  class View{
    shadowMap={};extensions={has:()=>true};capabilities={maxSamples:2};setSize(){}setPixelRatio(){}setRenderTarget(){}
    render(scene,cam){if(cam.isPerspectiveCamera){camera=cam;scene.updateMatrixWorld(true);}}
  }
  ctx.THREE={...ctx.THREE,WebGLRenderer:View,CubeCamera:class extends ctx.THREE.Object3D{update(){}},
    PMREMGenerator:class{fromCubemap(){return {texture:new ctx.THREE.Texture()};}dispose(){}}};
  for(const name of ['simulation.js','craft.js','room.js','audio.js','play.js'])load(name);
  const game=ctx.__GAME__,room=elements.room;
  const tick=(n=1)=>{for(let i=0;i<n;i++){clock+=50;frame(clock);}};
  const proj=(x,y,z)=>{const p=new ctx.THREE.Vector3(x,y,z).project(camera);return [(1+p.x)*width/2,(1-p.y)*height/2];};
  const pointer=(type,x,y)=>room.listeners[type]({clientX:x,clientY:y,button:0,pointerId:1,pointerType:'touch',preventDefault(){}});
  tick();assert.equal(camera.fov,26);
  pointer('pointerdown',1,height-1);assert.equal(game.getState().held,-1);
  const first=game.getState();
  for(const b of first.bodies){const [x,y]=proj(b.x,b.y,b.z);assert.ok(x>12&&x<width-12&&y>10&&y<height-10,'all buttons accessible');}
  const seen=new Set();let guard=0;
  while(guard++<280){
    const s=game.getState();if(s.serial===4&&s.phase==='play')break;
    if(s.phase!=='play'){tick(9);continue;}
    const b=s.bodies.findLast(o=>o.status==='ready');if(!b){tick(10);continue;}
    const src=proj(b.x,b.y,b.z);
    pointer('pointerdown',...src);
    if(s.chapter===0){
      assert.ok(game.getState().held>=0,'a projected button can be picked');
      const dest=proj(s.jar.x,1.92,s.jar.z);
      pointer('pointermove',...dest);tick(12);pointer('pointerup',...dest);
      assert.equal(game.getState().held,-1);
    }else pointer('pointerup',...src);
    seen.add(s.chapter);tick(s.chapter===2?15:22);
  }
  assert.deepEqual([...seen],[0,1,2,3]);assert.equal(game.getState().serial,4);
  assert.equal(game.getState().phase,'play');assert.equal(game.getState().fill,0);
  console.log(width+' × '+height+' — four chapters and restart passed through projected pointer coordinates.');
}
test(390,844);test(1180,820);
