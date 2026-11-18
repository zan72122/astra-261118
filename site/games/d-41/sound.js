'use strict';
function makeSound(){
  let ctx,master,rubber,voice,wood,air,hiss,burr,woodFilter,airFilter,fund,edgeArmed=true,previousRing=0,lastMode='',lastWind=0;
  const rand=WindowPhysics.random(3481);
  function start(){
    if(ctx){if(ctx.state!=='running')ctx.resume().catch(()=>{});return;}
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    ctx=new Audio();master=ctx.createGain();master.gain.value=.47;master.connect(ctx.destination);
    const len=Math.floor(ctx.sampleRate*2.79),b=ctx.createBuffer(1,len,ctx.sampleRate),a=b.getChannelData(0);let brown=0;
    for(let i=0;i<len;i++){const n=rand()*2-1;brown=.973*brown+.027*n;a[i]=brown*2.5+n*.25;}
    const src=ctx.createBufferSource();src.buffer=b;src.loop=true;src.start();
    function band(type,hz,q){const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=hz;f.Q.value=q;src.connect(f);return f;}
    function gain(node){const g=ctx.createGain();g.gain.value=0;node.connect(g);g.connect(master);return g;}
    hiss=band('bandpass',155,1.1);rubber=gain(hiss);
    woodFilter=band('bandpass',270,2.3);wood=gain(woodFilter);
    airFilter=band('lowpass',550,.5);air=gain(airFilter);
    fund=ctx.createOscillator();fund.type='triangle';fund.frequency.value=78;
    burr=ctx.createOscillator();burr.type='sine';burr.frequency.value=17;const fm=ctx.createGain();fm.gain.value=5;burr.connect(fm);fm.connect(fund.frequency);voice=gain(fund);burr.start();fund.start();
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function note(hz,amp,decay,end=hz,type='sine'){
    if(!ctx||ctx.state!=='running')return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(end,t+decay*.8);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,amp),t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+decay);o.connect(g);g.connect(master);o.start(t);o.stop(t+decay+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function update(s){
    if(!ctx||ctx.state!=='running')return;
    const t=ctx.currentTime,f=s.sound,wet=s.tool.wet,p=s.tool.force;
    const set=(param,v,tau=.035)=>param.setTargetAtTime(v,t,tau);
    set(hiss.frequency,f.pitch*(1.26+.56*(1-wet)));set(hiss.Q,1+.21*p);
    set(rubber.gain,Math.min(.87,f.rub*1.06));set(voice.gain,.047*Math.min(1,f.rub)*(.45+p/7));
    set(fund.frequency,f.pitch);set(burr.frequency,11+7*p+4*Math.min(3,s.tool.speed));
    if(f.edge>.75&&edgeArmed){note(f.edgeHz,.063,f.edgeSeconds,375,'triangle');edgeArmed=false;}if(f.edge<.2)edgeArmed=true;
    set(wood.gain,Math.min(.48,f.wood*.58));set(woodFilter.frequency,f.woodHz);
    const wind=Math.abs(s.air[3].u);set(air.gain,(.006+.085*s.walk)*(.45+wind),.27);set(airFilter.frequency,350+480*wind,.23);
    if(s.ripples.length&&s.ripples[s.ripples.length-1]!==previousRing){
      previousRing=s.ripples[s.ripples.length-1];
      if(s.stage===0&&s.pump>.23&&rand()<.20)note(670+440*rand(),.019+.016*s.pump,.115,420);
    }
    if(lastMode!==s.mode){
      if(s.mode==='opening'){note(226,.085,.12,104,'triangle');note(101,.055,.19,72);}
      if(s.mode==='delivery')note(530,.045,.22,410,'triangle');
      if(s.mode==='garden')note(740,.033,.51,690);
      lastMode=s.mode;
    }
    const cloth=s.cloth[115];if(s.mode==='outside'&&Math.abs(cloth.v)>.13&&t-lastWind>.25){set(air.gain,.16,.05);lastWind=t;}
  }
  return {start,update,splash:()=>{note(285,.075,.26,155);note(681,.034,.14,382);},chime:()=>{note(924,.055,.9);note(1386,.022,.7);}};
}
