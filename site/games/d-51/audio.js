/* Resonant modes, friction noise and motor harmonics, all excited by simulation events. */
const Sound=(()=>{
  let ac=null,out,noise,motor=null,lastRoll=-1,lastDrop=-1,mute=false;
  function unlock(){
    if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
      ac=new A();out=ac.createGain();out.gain.value=mute?0:.63;
      const comp=ac.createDynamicsCompressor();comp.threshold.value=-15;comp.ratio.value=3;out.connect(comp);comp.connect(ac.destination);
      noise=ac.createBuffer(1,ac.sampleRate*1.5,ac.sampleRate);const data=noise.getChannelData(0);let last=0;
      for(let i=0;i<data.length;i++){last=(last+(Math.random()-.5)*.6)*.82;data[i]=last*2}}
    if(ac.state==='suspended')ac.resume().catch(()=>{});
  }
  function toggle(){unlock();mute=!mute;if(out)out.gain.setTargetAtTime(mute?0:.63,ac.currentTime,.035);return !mute}
  function tone(freq,amp,dur,type='sine',delay=0,endFreq=0){
    const start=ac.currentTime+delay,g=ac.createGain(),o=ac.createOscillator();
    o.type=type;o.frequency.setValueAtTime(freq,start);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),start+dur);
    g.gain.setValueAtTime(.00005,start);g.gain.exponentialRampToValueAtTime(Math.max(.0001,amp),start+.0025);g.gain.exponentialRampToValueAtTime(.00005,start+dur);
    o.connect(g);g.connect(out);o.start(start);o.stop(start+dur+.014);o.onended=()=>{g.disconnect();o.disconnect()}
  }
  function friction(hz,amp,dur,q=.9,delay=0){const t=ac.currentTime+delay,src=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();src.buffer=noise;src.loop=true;f.type='bandpass';f.frequency.value=hz;f.Q.value=q;
    g.gain.setValueAtTime(.00005,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,amp),t+.005);g.gain.exponentialRampToValueAtTime(.00005,t+dur);
    src.connect(f);f.connect(g);g.connect(out);src.start(t,Math.random()*.5);src.stop(t+dur+.012);src.onended=()=>{src.disconnect();f.disconnect();g.disconnect()}}
  function metal(mass,speed,base,delay=0){const hz=base*Math.sqrt(.27/mass),amp=Math.min(.28,.027+mass*speed*.18);
    [1,1.622,2.78,4.13].forEach((r,i)=>tone(hz*r,amp/(1+i*1.55),(.13+mass*.62)/(1+i*.15),'sine',delay));
    friction(hz*2,.15*speed,.048,1,delay)}
  function startMotor(mass){const t=ac.currentTime,g=ac.createGain(),a=ac.createOscillator(),b=ac.createOscillator(),f=ac.createBiquadFilter();
    a.type='sawtooth';b.type='triangle';a.frequency.value=47;b.frequency.value=94;f.type='lowpass';f.frequency.value=470;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.052+mass*.03,t+.11);g.gain.setValueAtTime(.051,t+1.10);g.gain.exponentialRampToValueAtTime(.0001,t+1.30);
    a.connect(f);b.connect(f);f.connect(g);g.connect(out);a.start();b.start();a.stop(t+1.31);b.stop(t+1.31);const rec={a,b,f};motor=rec;
    a.onended=()=>{if(motor===rec)motor=null;g.disconnect();f.disconnect();a.disconnect();b.disconnect()}}
  function update(s,events){
    if(!ac||ac.state!=='running')return;
    if(motor&&s.choice>=0){const c=s.coils[s.choice];const f=49+4*Math.abs(c.speed);motor.a.frequency.setTargetAtTime(f,ac.currentTime,.024);motor.b.frequency.setTargetAtTime(f*2.017,ac.currentTime,.024)}
    for(const e of events){switch(e.kind){
      case 'coin':metal(e.mass,e.force,e.contact===1?475:316);if(e.contact===2)tone(870,.05,.14,'sine',.035);break;
      case 'button':tone(e.freq,.095,.081);tone(e.freq*1.49,.022,.054);friction(780,.18,.032);break;
      case 'motor':startMotor(e.mass);break;
      case 'spring':tone(413/Math.sqrt(e.mass/.25),.026,.12,'triangle',0,298);friction(1600,.07,.041);break;
      case 'impact':if(e.material==='rubber'){tone(132,.09*e.force,.13,'sine',0,62);friction(640,.05*e.force,.036)}else{metal(e.mass,e.force,466);tone(107,.10,.18,'sine',0,67)}break;
      case 'roll':if(ac.currentTime-lastRoll>.033){lastRoll=ac.currentTime;friction(e.material==='rubber'?370:1040,Math.min(.28,.06+e.force*.14),.095);if(e.material!=='rubber')tone(240/Math.sqrt(e.mass),.027,.10,'triangle')}break;
      case 'tap':metal(e.mass,.7+e.force,570);break;
      case 'take':friction(640,.20,.17);tone(380,.035,.10,'triangle');break;
      case 'rub':friction(610,.18,.15);break;
      case 'wind':friction(1200,.13,.65,.5);break;
      case 'fabric':friction(1820,.22,.36,.63);break;
      case 'drip':if(ac.currentTime-lastDrop>.065){lastDrop=ac.currentTime;tone(850+2500*e.force,.02,.083,'sine',0,820);friction(2400,.068,.046)}break;
    }}
  }
  return {unlock,toggle,update};
})();
