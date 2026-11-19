'use strict';
class WorkshopSound{
  constructor(){this.muted=false;this.ctx=null;this.roomIndex=-1;}
  unlock(){
    if(!this.ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      const c=this.ctx=new AC(),out=this.out=c.createGain();out.gain.value=this.muted?0:.66;
      const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=5;
      out.connect(limiter).connect(c.destination);this.dry=c.createGain();this.dry.gain.value=.88;this.dry.connect(out);
      const buffer=this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate),a=buffer.getChannelData(0);
      let n=1441;const white=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2147483648-1);
      for(let i=0;i<a.length;i++)a[i]=white();
      this.wet=c.createGain();this.wet.gain.value=.25;this.wet.connect(out);this.reverbs=[];
      for(let decay of [.43,.075,.24]){let conv=c.createConvolver(),ir=c.createBuffer(2,Math.ceil(c.sampleRate*decay),c.sampleRate);
        for(let ch=0;ch<2;ch++){let p=ir.getChannelData(ch);for(let i=0;i<p.length;i++)p[i]=white()*Math.exp(-5.6*i/p.length)*(i<c.sampleRate*.011?0:1);}
        conv.buffer=ir;conv.connect(this.wet);this.reverbs.push(conv);}
      this.send=c.createGain();this.send.connect(this.reverbs[0]);this.roomIndex=0;
      this.bus=c.createGain();this.bus.connect(this.dry);this.bus.connect(this.send);
      const src=c.createBufferSource();src.buffer=buffer;src.loop=true;this.rubFilter=c.createBiquadFilter();this.rubFilter.type='bandpass';this.rubFilter.Q.value=.78;
      this.rub=c.createGain();this.rub.gain.value=0;src.connect(this.rubFilter).connect(this.rub).connect(this.bus);src.start();
      const visc=c.createOscillator();visc.type='triangle';this.visc=visc;this.viscGain=c.createGain();this.viscGain.gain.value=0;visc.connect(this.viscGain).connect(this.bus);visc.start();
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
  }
  toggle(){this.unlock();this.muted=!this.muted;if(this.ctx)this.out.gain.setTargetAtTime(this.muted?0:.66,this.ctx.currentTime,.035);return !this.muted;}
  tone(f,amp,len,delay=0,end=f,type='sine'){
    const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+len);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(g).connect(this.bus);o.start(t);o.stop(t+len+.012);o.onended=()=>{o.disconnect();g.disconnect();};}
  burst(f,amp,len,delay=0,q=.9){
    const c=this.ctx,t=c.currentTime+delay,src=c.createBufferSource(),bp=c.createBiquadFilter(),gain=c.createGain();src.buffer=this.noise;bp.type='bandpass';bp.frequency.value=f;bp.Q.value=q;
    gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(amp,t+.003);gain.gain.exponentialRampToValueAtTime(.0001,t+len);src.connect(bp).connect(gain).connect(this.bus);
    src.start(t,Math.random()*.8);src.stop(t+len+.01);src.onended=()=>{src.disconnect();bp.disconnect();gain.disconnect();};}
  play(e){
    if(!this.ctx||this.muted)return;
    if(e.type==='foot'){
      const f=e.tone,k=e.strength;this.tone(75,.13*k,.11,0,42);
      if(e.material==='wood'){this.tone(f,.20*k,.25,0,f*.92);this.tone(f*2.56,.065,.14,.009);this.tone(f*3.82,.047,.18,.014);this.burst(730+e.gloss*390,.13,.07);}
      if(e.material==='gravel'){for(let i=0;i<13;i++){let r=Math.random();this.burst(f*(.6+2.1*r),.17*k*(.6+.4*r),.025+r*.04,Math.random()*.11,1.6+r*2);}this.tone(152,.039,.09,.01,85);}
      if(e.material==='tile'){this.tone(f,.114*k,.092,0,f*.96);this.tone(f*1.62,.043,.065,.003);this.burst(2070,.19,.067,.008);this.tone(570,.063,.09,.048,290);}
      this.burst(500+e.gloss*1900,.065*k,.037+e.slip*1.15,.043,.64);
    }else if(e.type==='chime'){this.tone(e.tone,.10,.54);this.tone(e.tone*2.02,.032,.32,.015);}
    else if(e.type==='dip'){this.tone(112,.14,.21,0,47,'triangle');this.burst(370,.13,.16);}
    else if(e.type==='pour'){this.burst(1170,.12*e.strength,.45);this.tone(415,.05,.19,.03,220);}
    else if(e.type==='ripple'){this.tone(e.tone,.034,.12,0,e.tone*.82);}
    else if(e.type==='grit'){this.burst(1250+Math.random()*1500,.062*e.strength,.06,0,1.3);}
    else if(['shine','garden','alley','home','walk'].includes(e.type)){let notes=e.type==='shine'?[659,988,1318]:e.type==='home'?[784,659,523]:[392,587,784];notes.forEach((n,i)=>this.tone(n,.05-i*.008,.60,i*.115));}
  }
  update(s){
    if(!this.ctx)return;const c=this.ctx,t=c.currentTime,idx=s.stage===2?1:s.stage===3?2:0;
    if(idx!==this.roomIndex){this.send.disconnect();this.send.connect(this.reverbs[idx]);this.roomIndex=idx;}
    const cell=s.cells[Math.min(11,Math.floor(s.strokeX*12))+12*Math.min(3,Math.floor(s.strokeV*4))];
    const friction=s.stage===0?s.force*Math.min(1.6,s.speed):0;
    this.rub.gain.setTargetAtTime(Math.min(.32,friction*.097)*(1-cell.polish*.24),t,.038);
    this.rubFilter.frequency.setTargetAtTime(540+Math.min(2,s.speed)*815+(1-cell.gloss)*450,t,.034);
    this.visc.frequency.setTargetAtTime(49+cell.film*34+s.force*5,t,.054);
    this.viscGain.gain.setTargetAtTime(Math.min(.115,friction*(.015+cell.film*.047+.018*s.clothWet)),t,.052);
  }
}
