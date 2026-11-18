// Exercise the shipped script order, camera picking and Pointer Events in Node.
// The renderer is a no-op. No browser, WebGL context or pixel readback is used.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const noop=()=>{};
class NoDrawRenderer{
 constructor(){this.extensions={has:()=>true};this.shadowMap={};this.ratio=1}
 setPixelRatio(n){this.ratio=n}getPixelRatio(){return this.ratio}
 setSize(){}setRenderTarget(){}render(){}
}
function boot(width,height){
 const context2D=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
 const makeElement=()=>({style:{},events:{},getContext:()=>context2D,setPointerCapture:noop,setAttribute:noop,addEventListener(k,f){this.events[k]=f}});
 const elements={},windowEvents={};
 const document={hidden:false,documentElement:{},addEventListener:noop,createElement:makeElement,querySelector:s=>elements[s]??=makeElement(),querySelectorAll:()=>Array.from({length:4},makeElement)};
 const ctx={innerWidth:width,innerHeight:height,devicePixelRatio:1,document,console,requestAnimationFrame:f=>ctx.frame=f,addEventListener:(k,f)=>windowEvents[k]=f};ctx.window=ctx;
 vm.createContext(ctx);
 for(const [,file] of source('index.html').matchAll(/<script src="([^"]+)"/g)){
  assert(!file.includes('://'));vm.runInContext(source(file),ctx,{filename:file});
  if(file==='vendor/three.min.js')ctx.THREE={...ctx.THREE,WebGLRenderer:NoDrawRenderer,CubeCamera:class extends ctx.THREE.CubeCamera{update(){}}};
 }
 const game=ctx.__GAME__,canvas=elements['#world'];ctx.frame(0);
 const tap=(x,y)=>canvas.events.pointerdown({pointerId:1,clientX:x*width,clientY:y*height}),lift=()=>canvas.events.pointerup({pointerId:1});
 tap(.3,.5);game.step(.4);lift();assert(Math.max(...game.getState().temp)>2);
 game.step(4.1);ctx.frame(16);assert(game.getState().hint);assert(+elements['#hint'].style.opacity>0);
 const before=game.getState();tap(.5,.95);game.step(.1);lift();
 assert(Math.max(...game.getState().temp)<=Math.max(...before.temp));
 console.log(width+' × '+height+' — local entry, glass picking, outside rejection and idle hint passed');
}
boot(390,844);boot(1180,820);
// Measure the envelopes scheduled by the actual synthesizer without audio hardware.
const audioCtx={currentTime:1,scheduled:[],createBufferSource(){return audioNode(this,'noise')},createOscillator(){return audioNode(this,'tone')},createGain(){return audioNode(this,'gain')},createBiquadFilter(){return audioNode(this,'filter')}};
function audioNode(ctx,type){
 const param=()=>({setValueAtTime:noop,exponentialRampToValueAtTime:noop,setTargetAtTime:noop});
 return {frequency:param(),gain:param(),Q:param(),connect:n=>n,disconnect:noop,start(t){this.startTime=t},stop(t){ctx.scheduled.push({type,ms:(t-this.startTime)*1000})}};
}
const scope={globalThis:{},window:{},console};vm.createContext(scope);
const engine=vm.runInContext(source('audio.js')+';new WinterSound()',scope);
engine.ctx=audioCtx;engine.master=audioNode(audioCtx,'master');engine.noise={};
for(const k of ['rub','grain','wind'])engine[k]={g:audioNode(audioCtx),f:audioNode(audioCtx)};
engine.update({events:[{type:'crunch',power:.32},{type:'drop'},{type:'bird',pitch:.28}],stage:'grass',windowHeat:0,touchSpeed:0,wind:.04,travel:.99});
const durations=audioCtx.scheduled.map(o=>Math.round(o.ms));assert.deepEqual(durations,[82,45,120,135,70,165,205]);console.log('Scheduled source lifetimes in milliseconds:',durations.join(', '));
