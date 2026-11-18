'use strict';
function gardenSound(){
  let ctx,master,friction,teeth,wind,frictionGain,teethGain,windGain,muted=false,lastCrunch=0,lastPoured=0,previousContact=0;
  const rand=Autumn.seedRandom(8833);
  function noiseSource(){
    const n=ctx.sampleRate*3,buf=ctx.createBuffer(1,n,ctx.sampleRate),d=buf.getChannelData(0);
    let colored=0;for(let i=0;i<n;i++){const white=rand()*2-1;colored=(colored+.046*white)/1.046;d[i]=white*.57+colored*1.9;}
    const node=ctx.createBufferSource();node.buffer=buf;node.loop=true;return node;
  }
  function band(type,hz,q){
    const source=noiseSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    filter.type=type;filter.frequency.value=hz;filter.Q.value=q;gain.gain.value=0;source.connect(filter).connect(gain).connect(master);source.start();return [filter,gain];
  }
  function unlock(){
    if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      ctx=new C();master=ctx.createGain();master.gain.value=muted?0:.56;
      const limit=ctx.createDynamicsCompressor();limit.threshold.value=-15;limit.ratio.value=5;master.connect(limit).connect(ctx.destination);
      [friction,frictionGain]=band('bandpass',2300,.65);[teeth,teethGain]=band('bandpass',520,1.6);[wind,windGain]=band('lowpass',470,.5);
    }if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function grain(hz,amp,length,q=1.0){
    const n=Math.ceil(ctx.sampleRate*length),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);
    let last=0;for(let i=0;i<n;i++){const t=i/n;last=.35*last+.65*(rand()*2-1);d[i]=last*Math.min(1,t*35)*Math.exp(-t*5);}
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=b;f.type='bandpass';f.frequency.value=hz;f.Q.value=q;g.gain.value=amp;
    src.connect(f).connect(g).connect(master);src.start();src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};
  }
  function update(s,dt){
    if(!ctx||ctx.state!=='running')return;const now=ctx.currentTime,f=s.fx;
    const set=(a,v,t)=>a.setTargetAtTime(v,now,t);
    set(friction.frequency,f.pitch,.06);set(frictionGain.gain,f.rustle*1.04,.045);
    set(teeth.frequency,f.toothHz,.045);set(teethGain.gain,f.scrape*.62,.025);
    set(wind.frequency,320+f.breeze*930,.3);set(windGain.gain,.014+f.breeze*.52+Math.abs(s.cells[3].du)*.03,.15);
    const atPile=Math.exp(-Math.hypot(s.rake.x-Autumn.PILE.x,s.rake.z-Autumn.PILE.z)*3.5)*s.rake.press;
    if((f.crunch>.50&&lastCrunch<=.50)||(atPile>.47&&previousContact<=.47)){grain(f.crunchHz,.97,.43,.63);grain(730,.56,.22);grain(1850,.32,.095);}
    if(s.water.poured>lastPoured){grain(1040,.16,.075,3);
      const osc=ctx.createOscillator(),g=ctx.createGain();osc.frequency.setValueAtTime(690+rand()*135,now);osc.frequency.exponentialRampToValueAtTime(390,now+.052);
      g.gain.setValueAtTime(.027,now);g.gain.exponentialRampToValueAtTime(.0001,now+.085);osc.connect(g).connect(master);osc.start(now);osc.stop(now+.09);osc.onended=()=>{osc.disconnect();g.disconnect();};}
    if(rand()<dt*(2+f.rustle*38)&&f.rustle>.025)grain(f.pitch*(.58+rand()),.08+f.rustle*.38,.025+rand()*.075);
    if(s.act==='nut'&&s.nut.vy>.24&&rand()<dt*4)grain(620,.24,.14,3);
    if(Math.abs(s.door.v)>.13&&rand()<dt*5)grain(175+Math.abs(s.door.v)*200,.12,.12,3);
    previousContact=atPile;lastCrunch=f.crunch;lastPoured=s.water.poured;
  }
  function toggle(){muted=!muted;unlock();if(ctx)master.gain.setTargetAtTime(muted?0:.56,ctx.currentTime,.045);return muted;}
  return {unlock,update,toggle};
}
