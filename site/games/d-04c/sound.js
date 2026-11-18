const HarborSound=(()=>{
  let ctx,master,filter,bed,bedGain,noiseBuf,muted=false,lastWater=-2;
  function init(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:.72;
      const limit=ctx.createDynamicsCompressor();limit.threshold.value=-15;limit.ratio.value=4;
      master.connect(limit);limit.connect(ctx.destination);
      noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
      const samples=noiseBuf.getChannelData(0);
      let last=0;for(let i=0;i<samples.length;i++){last=.64*last+(Math.random()*2-1)*.36;samples[i]=last;}
      bed=ctx.createBufferSource();bed.buffer=noiseBuf;bed.loop=true;filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=620;
      bedGain=ctx.createGain();bedGain.gain.value=.033;bed.connect(filter);filter.connect(bedGain);bedGain.connect(master);bed.start();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function pan(dest,x){
    if(!ctx.createStereoPanner){dest.connect(master);return;}
    const p=ctx.createStereoPanner();p.pan.value=Math.max(-.7,Math.min(.7,x*.066));dest.connect(p);p.connect(master);
    return p;
  }
  function tone(type,f0,f1,vol,dur,x,delay=0,attack=.009){
    if(!ctx||vol<.0001)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;
    o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur*.79);
    g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(vol,t+attack);
    g.gain.exponentialRampToValueAtTime(.00001,t+dur);o.connect(g);const p=pan(g,x);
    o.start(t);o.stop(t+dur+.025);o.onended=()=>{o.disconnect();g.disconnect();p?.disconnect();};
  }
  function noise(freq,vol,dur,x,mode='bandpass'){
    const t=ctx.currentTime,n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=noiseBuf;
    f.type=mode;f.frequency.setValueAtTime(freq,t);f.frequency.exponentialRampToValueAtTime(freq*.45,t+dur);
    f.Q.value=.7;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.026);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    n.connect(f);f.connect(g);const p=pan(g,x);n.start(t,Math.random()*.6);n.stop(t+dur+.02);
    n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();p?.disconnect();};
  }
  function play(e){
    if(!ctx||ctx.state!=='running'||muted)return;
    const x=e.x,v=e.power;
    if(e.kind==='bell'){
      for(const [ratio,gain,life] of [[1,.14,1.65],[2.42,.045,1.04],[3.97,.021,.61],[5.34,.012,.25]])
        tone('sine',684*ratio,681*ratio,gain*v,life,x);
      tone('sine',1018,1015,.031,1.45,x,.17);
    }else if(e.kind==='water' && ctx.currentTime-lastWater>.095){
      lastWater=ctx.currentTime;noise(1240+v*1650,.16+v*.36,.26+v*.75,x);
      tone('sine',320+v*120,151,.020+v*.04,.13+v*.09,x,.045);
    }else if(e.kind==='splash'){noise(2800,.50*v,.84,x);noise(610,.24*v,.49,x);}
    else if(e.kind==='wood'){
      tone('triangle',257,138,.17*v,.126,x);tone('sine',483,348,.076*v,.085,x);noise(1410,.16*v,.083,x);
    }else if(e.kind==='horn'){
      for(const [f,g] of [[192,.092],[242,.066],[384,.034],[575,.017]])
        tone('sine',f*.97,f,g*v,2.45,x,0,.29);
    }else if(e.kind==='gull'){
      tone('sine',1120,1610,.069*v,.24,x,0,.065);tone('sine',1590,980,.075*v,.38,x,.14,.06);
    }else if(e.kind==='phase'&&v===1){tone('triangle',136,203,.036,1.6,3,.06,.32);noise(720,.17,1.3,3);}
  }
  function ambience(st,objects){
    if(!ctx||muted)return;
    const speed=objects.reduce((s,b)=>s+Math.abs(b.vy),0);
    bedGain.gain.setTargetAtTime(.025+.022*st.gust+.047*Math.min(speed,1.2),ctx.currentTime,.30);
    filter.frequency.setTargetAtTime(390+st.gust*530+Math.min(speed,1.5)*830,ctx.currentTime,.4);
  }
  function toggle(){init();muted=!muted;if(ctx)master.gain.setTargetAtTime(muted?0:.72,ctx.currentTime,.045);return muted;}
  return {init,play,ambience,toggle};
})();
