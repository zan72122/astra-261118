(() => {
  'use strict';
  const sim=GardenSimulation.create(), canvas=document.getElementById('garden');
  const s=sim.state;
  window.__GAME__={step:dt=>sim.step(dt),getState:()=>sim.getState()};
  const trail=document.getElementById('trail'),button=document.getElementById('sound'),hand=document.getElementById('hand');
  const palette={ink:'#536967',active:'#fff4cf',pale:'#c9c5a4'};
  const badges=[];
  for(let i=0;i<4;i++){
    if(i){const dot=document.createElement('i');dot.className='dot';trail.appendChild(dot);}
    const wrap=document.createElement('span'),icon=document.createElement('canvas');
    wrap.className='stage';icon.width=icon.height=72;wrap.appendChild(icon);trail.appendChild(wrap);badges.push({wrap,icon});
  }
  function drawIcon(canvas,type,active,muted=false){
    const c=canvas.getContext('2d');c.setTransform(3,0,0,3,0,0);c.clearRect(0,0,24,24);
    c.lineWidth=1.55;c.strokeStyle=c.fillStyle=active?palette.active:palette.ink;c.lineJoin=c.lineCap='round';
    const path=(p,fill=false)=>{const pp=new Path2D(p);fill?c.fill(pp):c.stroke(pp);};
    const circ=(x,y,r,fill=false)=>{c.beginPath();c.arc(x,y,r,0,2*Math.PI);fill?c.fill():c.stroke();};
    if(type===0){
      circ(12,12,4.2,true);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(12+Math.cos(a)*6.7,12+Math.sin(a)*6.7);c.lineTo(12+Math.cos(a)*9,12+Math.sin(a)*9);c.stroke();}
    }else if(type===1){
      path('M12 2.7 C10.5 6.3 5.7 10.4 5.7 14.2 A6.3 6.3 0 0 0 18.3 14.2 C18.3 10.6 13.5 6 12 2.7Z');
      path('M8.3 14.4 Q8.5 17.1 11.3 17.8');
    }else if(type===2){
      path('M9.8 15.4 C8.8 12.9 5.3 11.2 5.3 7.5 C5.3 .8 18.7 .8 18.7 7.5 C18.7 11.2 15 13.5 14.2 15.4Z');
      path('M10.6 14.9 Q7.7 7.6 11.4 3.3 M13.2 14.9 Q16 7.5 12.6 3.3 M9.8 16.5 L10.7 19.2 M14.2 16.5 L13.3 19.2 M10.3 19.5 L13.8 19.5 L13.4 21.4 L10.6 21.4Z');
    }else if(type===3){
      path('M15.1 3.3 C7.4 3.3 3.6 8.1 4.6 13.7 C5.9 21.1 15.2 22.2 19.7 16.1 C12.4 17.3 8.8 10 15.1 3.3Z');
      path('M18.6 3.5 Q18.9 6.1 21 6.5 Q19 7 18.6 9.3 Q18 7 16.2 6.5 Q18.2 6 18.6 3.5Z',true);
    }else{
      path('M3.2 9.1 L7.1 9.1 L12.2 5 L12.2 19 L7.1 14.9 L3.2 14.9Z',true);
      if(!muted){path('M15.2 8.3 Q18.6 12 15.2 15.8 M18.1 5.8 Q23.6 12 18.1 18.3');}
      else path('M16.1 9.6 L20.7 14.4 M20.7 9.6 L16.1 14.4');
    }
  }
  {
    const c=hand.getContext('2d');c.scale(2,2);c.fillStyle='#fff6d9';c.strokeStyle='#7d775f';c.lineWidth=1.55;c.lineJoin='round';
    const p=new Path2D('M16 44 C12 41 10 36 7 32 L3 26 Q1 22 4 21 Q6 20 9 23 L13 27 L5 8 Q3.4 3.8 6.9 2.8 Q9.7 2 11.4 6.3 L17.4 19 L16.7 16.5 Q16 12 19.2 12 Q21.6 12 23.2 15.7 Q22.7 12.4 25.9 12.9 Q28.4 13.2 29.6 17 Q30 14.7 32.8 15.6 Q35.4 16.2 37.2 22.9 Q39.5 32 36 39 L34.7 43 L21.4 48 Z');
    c.fill(p);c.stroke(p);
  }
  const world=buildGarden(canvas);
  let audio=null,muted=false;
  function initAudio(){
    if(!audio){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      const ctx=new AC(),master=ctx.createGain();master.gain.value=muted?0:.46;master.connect(ctx.destination);
      const n=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),dd=n.getChannelData(0);let mem=0;
      for(let i=0;i<dd.length;i++){mem=.965*mem+.035*(Math.random()*2-1);dd[i]=mem*3.3;}
      const air=ctx.createBufferSource();air.buffer=n;air.loop=true;
      const filter=ctx.createBiquadFilter(),volume=ctx.createGain();filter.type='bandpass';filter.frequency.value=760;filter.Q.value=.52;
      volume.gain.value=0;air.connect(filter).connect(volume).connect(master);air.start();
      audio={ctx,master,filter,volume};
    }
    if(audio.ctx.state!=='running')audio.ctx.resume().catch(()=>{});
  }
  function tone(f,end,duration,level,type='sine',delay=0){
    if(!audio||muted)return;
    const {ctx,master}=audio,now=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(end,now+duration*.67);
    g.gain.setValueAtTime(.00001,now);g.gain.exponentialRampToValueAtTime(level,now+.012);g.gain.exponentialRampToValueAtTime(.00001,now+duration);
    o.connect(g).connect(master);o.start(now);o.stop(now+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  let lastEvent=0,previousStage=-1,previousLit=0;
  function soundUpdate(){
    if(audio&&audio.ctx.state==='running'){
      const now=audio.ctx.currentTime;
      audio.volume.gain.setTargetAtTime(.011+s.wind[4].speed*.024+s.flow*.13,now,.09);
      audio.filter.frequency.setTargetAtTime(680+s.flow*1600+s.height*95,now,.14);
      const lit=s.lamps.filter(p=>p.filament>.38).length;
      if(lit>previousLit){const notes=[523,659,784,880,1047];tone(notes[(lit-1)%5],notes[(lit-1)%5],1.15,.038);}
      previousLit=lit;
      if(s.event.id!==lastEvent){
        const f=142+s.targetHeight*30;
        if(s.event.kind==='launch'){tone(f,f*1.85,.37,.21);tone(f*2.13,f*2.7,.45,.047,'triangle');}
        if(s.event.kind==='land'){tone(122,80,.26,.115);tone(265,178,.16,.035);}
        if(s.event.kind==='touch')tone(s.pressed==='water'?710:220,s.pressed==='water'?440:148,.12,.042);
        if(s.event.kind==='discover'){[392,494,587].forEach((n,i)=>tone(n,n,.8,.065,'sine',i*.105));}
      }
    }
    lastEvent=s.event.id;
  }
  function paintHud(){
    if(s.stage!==previousStage){
      badges.forEach(({wrap,icon},i)=>{wrap.classList.toggle('active',s.stage===i);drawIcon(icon,i,s.stage===i);});
      previousStage=s.stage;
    }
    hand.style.opacity=(s.hand.visibility*.90).toFixed(2);
    if(s.hand.visibility>.005){
      const p=world.guidePoint(s),phase=s.hand.phase;
      const down=Math.min(1,Math.max(0,(phase-.32)*4))*Math.min(1,Math.max(0,(1.70-phase)*4));
      hand.style.transform='translate('+(p.x+6*(1-down)-6)+'px,'+(p.y-23*(1-down)-3)+'px) rotate('+(-9+down*9)+'deg) scale('+(1.08-.12*down)+')';
    }
  }
  drawIcon(button.firstElementChild,4,false);
  button.addEventListener('click',()=>{initAudio();muted=!muted;if(audio)audio.master.gain.setTargetAtTime(muted?0:.46,audio.ctx.currentTime,.06);
    button.setAttribute('aria-label',muted?'音を出す':'音を消す');button.setAttribute('aria-pressed',String(muted));drawIcon(button.firstElementChild,4,false,muted);});
  let owner=null,startX=0,startZ=0,fromX=0,fromY=0;
  canvas.addEventListener('pointerdown',e=>{
    if(owner!==null||e.button!==0)return;
    const hit=world.hitTest(e.clientX,e.clientY,s);if(!hit)return;
    e.preventDefault();initAudio();
    if(sim.press(hit.x,hit.z,hit.target,hit.index)){
      owner=e.pointerId;startX=hit.x;startZ=hit.z;fromX=e.clientX;fromY=e.clientY;canvas.setPointerCapture(owner);
    }
  });
  canvas.addEventListener('pointermove',e=>{
    if(owner===e.pointerId)sim.move(startX+(e.clientX-fromX)/canvas.clientWidth*3,startZ+(e.clientY-fromY)/canvas.clientHeight*3);
    else if(e.pointerType==='mouse')canvas.style.cursor=world.hitTest(e.clientX,e.clientY,s)?'pointer':'default';
  });
  function finish(e){if(owner!==null&&(!e||e.pointerId===owner)){owner=null;sim.release();}}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,finish);
  window.addEventListener('blur',()=>finish());
  let prev=0,frame=0;
  function draw(now){
    if(prev)sim.step(Math.min(.075,(now-prev)/1000));prev=now;
    world.render(s);paintHud();soundUpdate();frame=requestAnimationFrame(draw);
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){finish();cancelAnimationFrame(frame);if(audio)audio.ctx.suspend().catch(()=>{});}
    else{prev=0;if(audio&&!muted)audio.ctx.resume().catch(()=>{});frame=requestAnimationFrame(draw);}
  });
  frame=requestAnimationFrame(draw);
})();
