/* Each source is placed across the stereo field. Water noise follows discharge,
   wheel knocks follow individual paddle crossings, throats follow lung pressure. */
class TerraceAudio {
  constructor(){this.ctx=null;this.enabled=true;this.next=0;this.grains=0;this.wheelHit=0;this.calls=[0,0,0];}
  unlock(){
    if(!this.ctx){
      const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
      const c=this.ctx=new A();this.master=c.createGain();this.master.gain.value=this.enabled?.63:0;
      const limiter=c.createDynamicsCompressor();this.master.connect(limiter);limiter.connect(c.destination);
      this.noise=c.createBuffer(1,c.sampleRate*3,c.sampleRate);const a=this.noise.getChannelData(0);let last=0;
      const rand=Tanada.generator(931);for(let i=0;i<a.length;i++){last=(last*.44+(rand()*2-1)*.56);a[i]=last;}
      this.beds=[[-.33,2100],[.43,1350],[-.64,970],[.53,1550],[-.19,2900]].map(([pan,hz],i)=>{
        const n=c.createBufferSource();n.buffer=this.noise;n.loop=true;n.playbackRate.value=.82+i*.17;
        const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=hz;f.Q.value=.52;
        const g=c.createGain();g.gain.value=0;n.connect(f);f.connect(g);g.connect(this.pan(pan));n.start(0,i*.39);return g;
      });
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
  }
  pan(x){const c=this.ctx;if(!c.createStereoPanner)return this.master;const p=c.createStereoPanner();p.pan.value=x;p.connect(this.master);return p;}
  hit(hz,end,len,vol,pan,kind='sine',offset=0){
    const c=this.ctx,t=c.currentTime+offset,g=c.createGain(),p=this.pan(pan);
    const o=kind==='soil'?c.createBufferSource():c.createOscillator();
    if(kind==='soil'){o.buffer=this.noise;const f=c.createBiquadFilter();f.frequency.setValueAtTime(hz,t);f.frequency.exponentialRampToValueAtTime(end,t+len);o.connect(f);f.connect(g);}
    else{o.type=kind;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(end,t+len);o.connect(g);}
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+len);
    g.connect(p);o.onended=()=>{o.disconnect();g.disconnect();if(p!==this.master)p.disconnect();};o.start(t);o.stop(t+len+.01);
  }
  update(s){
    const c=this.ctx;if(!c||c.state!=='running')return;
    this.master.gain.setTargetAtTime(this.enabled?.63:0,c.currentTime,.05);
    this.beds.forEach((g,i)=>g.gain.setTargetAtTime(i===4 ? .035+.024*s.spring.head : Math.min(.40,s.channels[i].splash*1.35),c.currentTime,.10));
    if(!this.enabled)return;
    if(s.gritCount!==this.grains){this.grains=s.gritCount;this.hit(1650-s.soil[2].wet*800,140,.15,.34,-.26,'soil');this.hit(177,56,.095,.12,-.25);}
    const k=Math.floor(s.wheel.angle*12/(Math.PI*2));
    if(k!==this.wheelHit){this.wheelHit=k;this.hit(k%2?315:247,116,.09,.055+s.wheel.speed*.055,-.62,'triangle');}
    if(s.time>this.next){const i=Math.floor(s.spring.pulse*83)%4,q=s.channels[i].q;
      this.hit(860+i*147,1450+i*120,.068,.011+q*.5,[-.32,.4,-.6,.38][i]);this.next=s.time+.32+.84*(.5+.5*Math.sin(s.spring.pulse*33.7));}
    s.frogs.forEach((f,i)=>{if(this.calls[i]!==f.calls){this.calls[i]=f.calls;if(!f.calls)return;for(let k=0;k<4;k++){this.hit(185+i*47,99+i*30,.086,.085,[-.60,.18,.56][i],'triangle',k*.073);this.hit(475+i*65,316+i*58,.074,.038,[-.60,.18,.56][i],'sine',k*.073);}}});
  }
}
