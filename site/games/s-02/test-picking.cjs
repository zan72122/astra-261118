'use strict';
// Exercise the game's actual projection, geometry and ray intersections in Node.
// The renderer stub has no WebGL context, canvas drawing or render method.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const assert=require('node:assert/strict');
const canvas={
  addEventListener(){},setAttribute(){},
  getBoundingClientRect(){return {left:0,top:0,width:world.innerWidth,height:world.innerHeight};}
};
const world={console,assert,innerWidth:390,innerHeight:844,devicePixelRatio:1,
  addEventListener(){},requestAnimationFrame(){},setTimeout(){},
  document:{querySelector:()=>canvas,addEventListener(){}}};
world.window=world;
const context=vm.createContext(world);
function run(code,filename){return vm.runInContext(code,context,{filename});}
for(const file of ['vendor/three.min.js','model.js','studio.js','kitchen.js','food.js','play.js']){
  if(file==='studio.js')run(`THREE={...THREE,WebGLRenderer:class {
    constructor(){this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>1};}
    setPixelRatio(){} setSize(){} getPixelRatio(){return 1;}
  }}`,'renderer-stub');
  run(fs.readFileSync(path.join(__dirname,file),'utf8'),file);
}
run(`
function tick(seconds){
  for(let i=0;i<Math.round(seconds/.05);i++){window.__GAME__.step(.05);objects();}
  scene.updateMatrixWorld(true);
}
function stroke(v,tool,dx,dz,seconds){
  const q=v.clone().project(camera);
  assert(Math.abs(q.x)<1 && Math.abs(q.y)<1,tool+' outside viewport');
  const hit=pick({clientX:(q.x+1)*innerWidth/2,clientY:(1-q.y)*innerHeight/2,pointerId:1});
  assert.equal(hit?.tool,tool);
  const n=Math.round(seconds/.05);
  for(let i=1;i<=n;i++){game.move(hit.rx+dx*i/n,hit.rz+dz*i/n);window.__GAME__.step(.05);}
  game.up();tick(.05);
}
for(const [width,height] of [[390,844],[1180,820]]){
  innerWidth=width;innerHeight=height;resizeScene();tick(1.5);
  assert.equal(pick({clientX:1,clientY:1}),null);
  for(let i=0;i<4&&game.s.phase==='spread';i++){
    stroke(V(centerX(),layout.floor+game.cells[0].thick+.01,layout.z),'dough',1.22,.03,.65);tick(.8);
  }
  stroke(strawberry.localToWorld(V(.04,.67,.05)),'berry',-.9,1.4,.5);tick(2.7);
  for(let i=0;i<12&&game.s.phase==='fold';i++){
    const r=nextRim(),index=(Math.round(Math.atan2(r.z,r.x)/TAU*N)+N)%N;
    const v=V().fromBufferAttribute(doughGeo.attributes.position,6*N+index);
    stroke(mound.localToWorld(v),'rim',-r.x*.98,-r.z*.98,.8);tick(.9);
  }
  assert.equal(game.s.phase,'roll');tick(1.6);
  stroke(V(centerX(),layout.floor+game.H-.22,layout.z+.10),'seam',1.57,0,1.2);tick(2);
  stroke(V(centerX(),layout.floor+game.H-.19,layout.z+.1),'turn',1.7,0,.9);tick(.7);
  stroke(loopPoints[7],'loop',-.35,1.55,1.3);tick(2.5);
  stroke(halves[0].localToWorld(V(.1,.77,.03)),'half',-.8,-.9,.5);tick(5.1);
  assert.equal(game.s.phase,'spread');
  console.log(width+' × '+height+' — seven interaction targets reachable, batch '+game.s.cycle+' delivered');
}
`,'ray-intersection-tests');
