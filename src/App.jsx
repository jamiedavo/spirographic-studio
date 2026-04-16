import { useState, useRef, useCallback, useEffect } from "react";

const CW = 800, CH = 800, CX = 400, CY = 400;

const PALETTE = {
  charcoal: '#1A1816', copper: '#9E4E28', slate: '#304F62',
  wine:     '#612030', forest: '#244816', indigo:'#222A52',
  brass:    '#6E5016',
};
const PALETTE_LABELS = {
  charcoal:'Charcoal', copper:'Copper', slate:'Slate',
  wine:'Wine', forest:'Forest', indigo:'Indigo', brass:'Brass',
};

const PARCHMENT='#EFEAD8', PANEL='#E6E0CC', BORDER='rgba(42,36,24,0.13)';
const TXT='#2A2418', TXT_M='#8A7E6A', BRASS_UI='#785A18';

function penXY(t,R,r,dFrac,track){
  const d=dFrac*r;
  if(track==='inner'){const k=(R-r)/r; return{x:CX+(R-r)*Math.cos(t)+d*Math.cos(k*t),y:CY+(R-r)*Math.sin(t)-d*Math.sin(k*t)};}
  const k=(R+r)/r; return{x:CX+(R+r)*Math.cos(t)-d*Math.cos(k*t),y:CY+(R+r)*Math.sin(t)-d*Math.sin(k*t)};
}
function wcenter(t,R,r,track){
  const dist=track==='inner'?R-r:R+r;
  return{x:CX+dist*Math.cos(t),y:CY+dist*Math.sin(t)};
}
function wspin(t,R,r,track){
  return track==='inner'?t*R/r:-t*(R+r)/r;
}

function teethPath(ctx,cx,cy,ri,th,n,rot){
  const s=(Math.PI*2)/n;
  ctx.beginPath();
  for(let i=0;i<n;i++){
    const a=rot+i*s,a1=a+s*.3,a2=a+s*.7,a3=a+s;
    const p=(g,r_)=>[cx+r_*Math.cos(g),cy+r_*Math.sin(g)];
    const [x0,y0]=p(a,ri),[x1,y1]=p(a1,ri+th),[x2,y2]=p(a2,ri+th),[x3,y3]=p(a3,ri);
    i===0?ctx.moveTo(x0,y0):ctx.lineTo(x0,y0);
    ctx.lineTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineTo(x3,y3);
  }
  ctx.closePath();
}

function drawGrid(ctx){
  ctx.clearRect(0,0,CW,CH);
  ctx.strokeStyle='rgba(130,115,88,0.1)';ctx.lineWidth=0.5;
  for(let x=0;x<=CW;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,CH);ctx.stroke();}
  for(let y=0;y<=CH;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(CW,y);ctx.stroke();}
}

function renderGuide(ctx,t,R,r,pens,track,mode){
  ctx.clearRect(0,0,CW,CH);
  if(mode==='off') return;
  const wc=wcenter(t,R,r,track), spin=wspin(t,R,r,track);
  const full=mode==='full', mech=mode==='mechanism';

  if(mode==='minimal'){
    ctx.save();ctx.strokeStyle='rgba(42,36,24,0.17)';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.arc(wc.x,wc.y,r,0,Math.PI*2);ctx.stroke();ctx.restore();
    for(const pen of pens){
      if(!pen.active)continue;
      const p=penXY(t,R,r,pen.dFrac,track);
      ctx.save();ctx.fillStyle=PALETTE[pen.color];ctx.globalAlpha=.88;
      ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    return;
  }

  if(full){
    const nb=Math.max(22,Math.round(R*.44));
    ctx.save();ctx.strokeStyle='rgba(42,36,24,0.2)';ctx.lineWidth=0.72;
    teethPath(ctx,CX,CY,R-6,7,nb,0);ctx.stroke();ctx.restore();
    const orb=track==='inner'?R-r:R+r;
    ctx.save();ctx.strokeStyle='rgba(118,86,30,0.22)';ctx.lineWidth=0.72;ctx.setLineDash([4,7]);
    ctx.beginPath();ctx.arc(CX,CY,orb,0,Math.PI*2);ctx.stroke();ctx.restore();
    ctx.save();ctx.strokeStyle='rgba(118,86,30,0.28)';ctx.lineWidth=0.75;ctx.setLineDash([3,6]);
    ctx.beginPath();ctx.moveTo(CX,CY);ctx.lineTo(wc.x,wc.y);ctx.stroke();ctx.restore();
    ctx.save();
    ctx.fillStyle='rgba(118,86,30,0.11)';ctx.strokeStyle='rgba(118,86,30,0.62)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(CX,CY,10,0,Math.PI*2);ctx.fill();ctx.stroke();
    for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.strokeStyle='rgba(118,86,30,0.38)';ctx.lineWidth=0.62;
      ctx.beginPath();ctx.moveTo(CX-Math.cos(a)*5,CY-Math.sin(a)*5);ctx.lineTo(CX+Math.cos(a)*5,CY+Math.sin(a)*5);ctx.stroke();}
    ctx.restore();
    const cpx=CX+R*Math.cos(t),cpy=CY+R*Math.sin(t);
    ctx.save();ctx.fillStyle='rgba(118,86,30,0.76)';ctx.beginPath();ctx.arc(cpx,cpy,3.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(118,86,30,0.28)';ctx.lineWidth=0.8;ctx.beginPath();ctx.arc(cpx,cpy,7,0,Math.PI*2);ctx.stroke();ctx.restore();
  }

  ctx.save();ctx.strokeStyle=full?'rgba(42,36,24,0.46)':'rgba(42,36,24,0.35)';ctx.lineWidth=full?1.5:1.2;
  ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.stroke();ctx.restore();

  if(full){
    const nw=Math.max(10,Math.round(r*.42));
    ctx.save();ctx.strokeStyle='rgba(42,36,24,0.4)';ctx.lineWidth=0.85;
    teethPath(ctx,wc.x,wc.y,r-3,4,nw,spin);ctx.stroke();ctx.restore();
    ctx.save();ctx.fillStyle='rgba(236,228,210,0.35)';ctx.beginPath();ctx.arc(wc.x,wc.y,r,0,Math.PI*2);ctx.fill();ctx.restore();
    for(let i=0;i<4;i++){const sa=spin+i*Math.PI/2;
      ctx.save();ctx.strokeStyle='rgba(42,36,24,0.22)';ctx.lineWidth=0.68;
      ctx.beginPath();ctx.moveTo(wc.x+Math.cos(sa)*5,wc.y+Math.sin(sa)*5);ctx.lineTo(wc.x+Math.cos(sa)*(r-4),wc.y+Math.sin(sa)*(r-4));ctx.stroke();ctx.restore();}
    ctx.save();ctx.fillStyle='rgba(42,36,24,0.1)';ctx.strokeStyle='rgba(42,36,24,0.48)';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(wc.x,wc.y,6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
  }

  ctx.save();ctx.strokeStyle=full?'rgba(42,36,24,0.6)':'rgba(42,36,24,0.5)';ctx.lineWidth=full?1.4:1.2;
  ctx.beginPath();ctx.arc(wc.x,wc.y,r,0,Math.PI*2);ctx.stroke();ctx.restore();

  if(mech){
    ctx.save();ctx.strokeStyle='rgba(118,86,30,0.7)';ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(wc.x,wc.y);ctx.lineTo(wc.x+Math.cos(spin)*(r-2),wc.y+Math.sin(spin)*(r-2));ctx.stroke();
    ctx.fillStyle='rgba(42,36,24,0.46)';ctx.beginPath();ctx.arc(wc.x,wc.y,2.5,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  for(const pen of pens){
    if(!pen.active)continue;
    const p=penXY(t,R,r,pen.dFrac,track), col=PALETTE[pen.color];
    ctx.save();ctx.strokeStyle=col;ctx.globalAlpha=.55;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(wc.x,wc.y);ctx.lineTo(p.x,p.y);ctx.stroke();
    ctx.fillStyle=col;ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=col;ctx.lineWidth=0.8;ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
}

export default function SpirographStudio(){
  const artRef=useRef(null), guideRef=useRef(null);
  const [status,setStatus]=useState('idle');
  const [tDisp,setTDisp]=useState(0);
  const [params,setParams]=useState({R:265,r:98,speed:0.018,track:'inner',dir:1});
  const [pens,setPens]=useState([
    {id:0,color:'charcoal',width:1.0,dFrac:0.75,active:true},
    {id:1,color:'copper',  width:0.7,dFrac:0.42,active:false},
    {id:2,color:'slate',   width:0.55,dFrac:1.1,active:false},
  ]);
  const [guide,setGuide]=useState('mechanism');
  const [layers,setLayers]=useState([]);
  const L=useRef({playing:false,t:0,prev:{},rafId:null,params:null,pens:null,guide:'mechanism',frame:0});

  useEffect(()=>{L.current.guide=guide;},[guide]);

  useEffect(()=>{
    if(artRef.current) drawGrid(artRef.current.getContext('2d'));
  },[]);

  useEffect(()=>{
    if(status==='playing') return;
    const ctx=guideRef.current?.getContext('2d');
    if(ctx) renderGuide(ctx,L.current.t,params.R,params.r,pens,params.track,guide);
  },[status,params,pens,guide]);

  const animate=useCallback(()=>{
    const lp=L.current;
    if(!lp.playing) return;
    const{R,r,speed,track,dir}=lp.params;
    lp.t+=speed*dir; lp.frame++;
    const ac=artRef.current?.getContext('2d');
    if(ac){
      ac.lineCap='round';ac.lineJoin='round';
      for(const pen of lp.pens){
        if(!pen.active)continue;
        const curr=penXY(lp.t,R,r,pen.dFrac,track);
        const prev=lp.prev[pen.id];
        if(prev){ac.beginPath();ac.moveTo(prev.x,prev.y);ac.lineTo(curr.x,curr.y);
          ac.strokeStyle=PALETTE[pen.color];ac.lineWidth=pen.width;ac.stroke();}
        lp.prev[pen.id]=curr;
      }
    }
    const gc=guideRef.current?.getContext('2d');
    if(gc) renderGuide(gc,lp.t,R,r,lp.pens,track,lp.guide);
    if(lp.frame%30===0) setTDisp(lp.t);
    lp.rafId=requestAnimationFrame(animate);
  },[]);

  const handlePlay=useCallback(()=>{
    const lp=L.current;if(lp.playing)return;
    lp.playing=true;lp.params={...params};lp.pens=pens.map(p=>({...p}));
    lp.guide=guide;lp.prev={};lp.frame=0;
    for(const pen of lp.pens) if(pen.active) lp.prev[pen.id]=penXY(lp.t,params.R,params.r,pen.dFrac,params.track);
    setStatus('playing');
    lp.rafId=requestAnimationFrame(animate);
  },[params,pens,guide,animate]);

  const handlePause=useCallback(()=>{
    const lp=L.current;lp.playing=false;
    if(lp.rafId) cancelAnimationFrame(lp.rafId);
    setTDisp(lp.t);setStatus('paused');
  },[]);

  const handleResume=useCallback(()=>{
    const lp=L.current;if(lp.playing)return;
    lp.playing=true;setStatus('playing');
    lp.rafId=requestAnimationFrame(animate);
  },[animate]);

  const handleStop=useCallback(()=>{
    const lp=L.current;lp.playing=false;
    if(lp.rafId) cancelAnimationFrame(lp.rafId);
    const cvs=artRef.current;
    if(cvs){const th=cvs.toDataURL('image/jpeg',0.4);
      setLayers(prev=>{const n=prev.length+1;return[...prev,{id:n,thumb:th,label:`Layer ${n}`}];});}
    lp.t=0;lp.prev={};setTDisp(0);setStatus('idle');
    const gc=guideRef.current?.getContext('2d');
    if(gc) renderGuide(gc,0,params.R,params.r,pens,params.track,guide);
  },[params,pens,guide]);

  const handleClear=useCallback(()=>{
    const lp=L.current;lp.t=0;lp.prev={};
    const ac=artRef.current?.getContext('2d');
    if(ac) drawGrid(ac);
    setLayers([]);setTDisp(0);setStatus('idle');
  },[]);

  const handleExport=useCallback(()=>{
    const a=document.createElement('a');a.href=artRef.current.toDataURL('image/png');
    a.download='spirograph-studio.png';a.click();
  },[]);

  const setP=(k,v)=>setParams(p=>({...p,[k]:v}));
  const onSpeed=v=>{setP('speed',v);if(L.current.params)L.current.params.speed=v;};
  const locked=status==='playing';
  const turns=(tDisp/(Math.PI*2)).toFixed(1);

  return(
    <div style={S.root}>
      <style>{CSS}</style>
      <aside style={S.panel}>
        <div style={S.scroll}>
          <div style={S.logo}>
            <span style={S.logoA}>Spirograph</span>
            <span style={S.logoB}>Studio</span>
          </div>

          <Sec title="Mechanism">
            <Row label="Base Circle">
              <Sli min={100} max={360} step={2} val={params.R} dis={locked} on={v=>setP('R',v)} fmt={v=>`${v}`}/>
            </Row>
            <Row label="Moving Circle">
              <Sli min={18} max={params.R-10} step={1} val={params.r} dis={locked} on={v=>setP('r',v)} fmt={v=>`${v}`}/>
            </Row>
            <Row label="Track Type">
              <Tog opts={[{v:'inner',l:'Inner'},{v:'outer',l:'Outer'}]} val={params.track} dis={locked} on={v=>setP('track',v)}/>
            </Row>
            <Row label="Direction">
              <Tog opts={[{v:1,l:'Forward'},{v:-1,l:'Reverse'}]} val={params.dir} dis={locked} on={v=>setP('dir',v)}/>
            </Row>
          </Sec>

          <Sec title="Run">
            <Row label="Drawing Speed">
              <Sli min={0.004} max={0.055} step={0.001} val={params.speed} on={onSpeed} fmt={v=>`${Math.round(v*1000)}`}/>
            </Row>
          </Sec>

          <Sec title="Pens">
            {pens.map((pen,i)=>(
              <PenCard key={pen.id} pen={pen} index={i} locked={locked}
                on={u=>setPens(ps=>ps.map(p=>p.id===pen.id?u:p))}/>
            ))}
          </Sec>

          <Sec title="Guide Visibility">
            <div style={S.gGrid}>
              {[['off','Off','Artwork only'],['minimal','Minimal','Circle & pen'],['mechanism','Mechanism','Working parts'],['full','Full','Full theatre']].map(([v,l,d])=>(
                <button key={v} style={{...S.gBtn,...(guide===v?S.gBtnOn:{})}} onClick={()=>setGuide(v)}>
                  <span style={S.gL}>{l}</span>
                  <span style={S.gD}>{d}</span>
                </button>
              ))}
            </div>
          </Sec>

          <Sec title="Layers">
            {layers.length===0?(
              <p style={S.note}>No layers yet. Stop a run to save one.</p>
            ):(
              <>
                <div style={S.lList}>
                  {[...layers].reverse().map(l=>(
                    <div key={l.id} style={S.lItem}>
                      <img src={l.thumb} alt={l.label} style={S.lThumb}/>
                      <span style={S.lName}>{l.label}</span>
                    </div>
                  ))}
                </div>
                <button style={S.clearBtn} onClick={handleClear}>Clear canvas</button>
              </>
            )}
          </Sec>

          <Sec title="Export" last>
            <button style={S.expBtn} onClick={handleExport}>Export PNG</button>
          </Sec>
        </div>
      </aside>

      <main style={S.main}>
        <div style={S.wrap}>
          <canvas ref={artRef} width={CW} height={CH} style={S.art}/>
          <canvas ref={guideRef} width={CW} height={CH} style={S.gui}/>
        </div>
      </main>

      <footer style={S.dock}>
        <div style={S.dStats}>
          <Stat label="Base" val={params.R}/>
          <Stat label="Wheel" val={params.r}/>
          <Stat label="Ratio" val={(params.R/params.r).toFixed(3)}/>
        </div>
        <div style={S.transport}>
          {status==='idle'&&<TBtn label="▶  Play" kind="play" on={handlePlay}/>}
          {status==='playing'&&<><TBtn label="⏸  Pause" kind="pause" on={handlePause}/><TBtn label="■  Stop" kind="stop" on={handleStop}/></>}
          {status==='paused'&&<><TBtn label="▶  Resume" kind="play" on={handleResume}/><TBtn label="■  Stop" kind="stop" on={handleStop}/></>}
        </div>
        <div style={S.dStats}>
          <Stat label="Track" val={params.track}/>
          <Stat label="Turns" val={turns}/>
          <Stat label="State" val={status} accent={status==='playing'}/>
        </div>
      </footer>
    </div>
  );
}

function Sec({title,children,last}){
  return(
    <div style={{...S.sec,...(last?{borderBottom:'none',paddingBottom:24}:{})}}>
      <div style={S.secT}>{title}</div>
      {children}
    </div>
  );
}
function Row({label,children}){
  return(
    <div style={S.row}>
      <span style={S.rLabel}>{label}</span>
      <div style={S.rRight}>{children}</div>
    </div>
  );
}
function Sli({min,max,step,val,on,fmt,dis}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
      <input type="range" className="sli" min={min} max={max} step={step} value={val}
        disabled={dis} onChange={e=>on(+e.target.value)}
        style={{flex:1,opacity:dis?.45:1}}/>
      <span style={S.rVal}>{fmt(val)}</span>
    </div>
  );
}
function Tog({opts,val,on,dis}){
  return(
    <div style={{display:'flex',gap:2}}>
      {opts.map(o=>(
        <button key={String(o.v)} disabled={dis} onClick={()=>on(o.v)}
          style={{...S.togBtn,...(val===o.v?S.togOn:{}),...(dis?{opacity:.44,cursor:'default'}:{})}}>
          {o.l}
        </button>
      ))}
    </div>
  );
}
function PenCard({pen,index,on,locked}){
  const cols=Object.keys(PALETTE);
  return(
    <div style={{...S.penWrap,...(!pen.active?{opacity:.5}:{})}}>
      <div style={S.penHead}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:9,height:9,borderRadius:'50%',background:PALETTE[pen.color],flexShrink:0}}/>
          <span style={S.penN}>Pen {index+1}</span>
        </div>
        <button disabled={locked} onClick={()=>on({...pen,active:!pen.active})}
          style={{...S.penTog,...(pen.active?S.penTogOn:{})}}>
          {pen.active?'On':'Off'}
        </button>
      </div>
      {pen.active&&(
        <div style={S.penBody}>
          <div style={S.swRow}>
            {cols.map(c=>(
              <button key={c} title={PALETTE_LABELS[c]} onClick={()=>on({...pen,color:c})}
                style={{...S.sw,background:PALETTE[c],
                  boxShadow:pen.color===c?`0 0 0 2px ${PANEL}, 0 0 0 3.5px ${PALETTE[c]}`:'none'}}/>
            ))}
          </div>
          <MiniSli label="Width" min={0.3} max={3} step={0.1} val={pen.width}
            on={v=>on({...pen,width:v})} fmt={v=>v.toFixed(1)}/>
          <MiniSli label="Position" min={0.05} max={1.45} step={0.01} val={pen.dFrac}
            on={v=>on({...pen,dFrac:v})} fmt={v=>v.toFixed(2)}/>
        </div>
      )}
    </div>
  );
}
function MiniSli({label,min,max,step,val,on,fmt}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:5}}>
      <span style={{...S.rLabel,fontSize:11,minWidth:46}}>{label}</span>
      <input type="range" className="sli" min={min} max={max} step={step} value={val}
        onChange={e=>on(+e.target.value)} style={{flex:1}}/>
      <span style={{...S.rVal,minWidth:28}}>{fmt(val)}</span>
    </div>
  );
}
function TBtn({label,kind,on}){
  const v={play:{background:'#334E22',color:'#DDE8D0'},pause:{background:BRASS_UI,color:'#EDE5CE'},stop:{background:'rgba(42,36,24,0.08)',color:TXT,border:`1px solid ${BORDER}`}};
  return <button onClick={on} style={{...S.tBtn,...v[kind]}}>{label}</button>;
}
function Stat({label,val,accent}){
  return(
    <div style={S.statWrap}>
      <span style={S.statL}>{label}</span>
      <span style={{...S.statV,...(accent?{color:'#3D6A28'}:{})}}>{val}</span>
    </div>
  );
}

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Inconsolata:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-thumb{background:rgba(42,36,24,0.16);border-radius:2px;}
input.sli{-webkit-appearance:none;width:100%;height:2px;background:rgba(42,36,24,0.16);border-radius:1px;outline:none;cursor:pointer;}
input.sli::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:${BRASS_UI};border:2px solid ${PANEL};box-shadow:0 0 0 1px ${BRASS_UI};cursor:pointer;}
input.sli:disabled::-webkit-slider-thumb{background:rgba(42,36,24,0.22);box-shadow:none;}
`;

const S={
  root:{display:'grid',gridTemplateColumns:'264px 1fr',gridTemplateRows:'1fr 66px',
    gridTemplateAreas:'"panel main""panel dock"',height:'100vh',
    background:PARCHMENT,fontFamily:"'Cormorant Garamond',Georgia,serif",color:TXT,overflow:'hidden'},
  panel:{gridArea:'panel',background:PANEL,borderRight:`1px solid ${BORDER}`,display:'flex',flexDirection:'column',overflow:'hidden'},
  scroll:{flex:1,overflowY:'auto',overflowX:'hidden',paddingBottom:20},
  logo:{padding:'18px 20px 14px',borderBottom:`1px solid ${BORDER}`},
  logoA:{display:'block',fontWeight:600,fontSize:20,letterSpacing:'.04em',lineHeight:1.1},
  logoB:{display:'block',fontFamily:"'Inconsolata',monospace",fontWeight:300,fontSize:9.5,
    letterSpacing:'.24em',color:TXT_M,textTransform:'uppercase',marginTop:2},
  sec:{padding:'13px 20px 12px',borderBottom:`1px solid ${BORDER}`},
  secT:{fontFamily:"'Inconsolata',monospace",fontSize:9,letterSpacing:'.2em',textTransform:'uppercase',
    color:TXT_M,marginBottom:11},
  row:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:9,gap:8},
  rLabel:{fontSize:12.5,fontWeight:400,color:TXT,flexShrink:0,minWidth:80},
  rRight:{display:'flex',alignItems:'center',gap:8,flex:1},
  rVal:{fontFamily:"'Inconsolata',monospace",fontSize:10.5,color:BRASS_UI,minWidth:28,textAlign:'right'},
  togBtn:{fontFamily:"'Cormorant Garamond',serif",fontSize:11.5,padding:'3px 9px',
    background:'transparent',border:`1px solid ${BORDER}`,borderRadius:2,cursor:'pointer',color:TXT_M},
  togOn:{background:BRASS_UI,border:`1px solid ${BRASS_UI}`,color:'#EDE5CE'},
  penWrap:{marginBottom:8,background:'rgba(42,36,24,0.04)',borderRadius:4,
    border:`1px solid ${BORDER}`,overflow:'hidden',transition:'opacity .2s'},
  penHead:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px'},
  penN:{fontSize:12.5,fontWeight:500},
  penTog:{fontFamily:"'Inconsolata',monospace",fontSize:9.5,letterSpacing:'.08em',
    padding:'2px 8px',background:'transparent',border:`1px solid rgba(42,36,24,0.2)`,
    borderRadius:2,cursor:'pointer',color:TXT_M},
  penTogOn:{background:'rgba(120,90,24,0.1)',border:`1px solid rgba(120,90,24,0.38)`,color:BRASS_UI},
  penBody:{padding:'0 10px 10px'},
  swRow:{display:'flex',gap:5,flexWrap:'wrap',marginBottom:4},
  sw:{width:17,height:17,borderRadius:'50%',border:'none',cursor:'pointer',flexShrink:0},
  gGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4},
  gBtn:{display:'flex',flexDirection:'column',alignItems:'flex-start',padding:'7px 10px',
    background:'transparent',border:`1px solid ${BORDER}`,borderRadius:3,cursor:'pointer'},
  gBtnOn:{background:'rgba(120,90,24,0.09)',border:`1px solid rgba(120,90,24,0.38)`},
  gL:{fontFamily:"'Cormorant Garamond',serif",fontSize:12.5,fontWeight:500,lineHeight:1.2},
  gD:{fontFamily:"'Inconsolata',monospace",fontSize:8.5,color:TXT_M,marginTop:1},
  note:{fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontSize:12,color:TXT_M,lineHeight:1.5},
  lList:{display:'flex',flexDirection:'column',gap:5,maxHeight:160,overflowY:'auto',marginBottom:8},
  lItem:{display:'flex',alignItems:'center',gap:8},
  lThumb:{width:38,height:38,objectFit:'cover',borderRadius:2,border:`1px solid ${BORDER}`},
  lName:{fontFamily:"'Cormorant Garamond',serif",fontSize:11.5,color:TXT_M},
  clearBtn:{fontFamily:"'Inconsolata',monospace",fontSize:9.5,letterSpacing:'.1em',
    padding:'5px 12px',background:'transparent',border:`1px solid rgba(42,36,24,0.2)`,
    borderRadius:2,cursor:'pointer',color:TXT_M,width:'100%'},
  expBtn:{fontFamily:"'Inconsolata',monospace",fontSize:9.5,letterSpacing:'.15em',textTransform:'uppercase',
    padding:'8px 16px',background:BRASS_UI,border:'none',borderRadius:2,cursor:'pointer',
    color:'#EDE5CE',width:'100%'},
  main:{gridArea:'main',display:'flex',alignItems:'center',justifyContent:'center',
    background:PARCHMENT,overflow:'hidden',padding:16},
  wrap:{position:'relative',width:CW,height:CH,background:'#EDE8D6',
    border:`1px solid rgba(42,36,24,0.1)`,
    boxShadow:'0 2px 36px rgba(42,36,24,0.1), inset 0 0 0 1px rgba(42,36,24,0.04)'},
  art:{position:'absolute',top:0,left:0,width:CW,height:CH},
  gui:{position:'absolute',top:0,left:0,width:CW,height:CH,pointerEvents:'none'},
  dock:{gridArea:'dock',display:'flex',alignItems:'center',justifyContent:'space-between',
    padding:'0 22px',background:PANEL,borderTop:`1px solid ${BORDER}`,gap:16},
  dStats:{display:'flex',gap:18,flex:1},
  transport:{display:'flex',gap:8,alignItems:'center'},
  tBtn:{fontFamily:"'Cormorant Garamond',serif",fontWeight:500,fontSize:13.5,letterSpacing:'.04em',
    padding:'8px 20px',borderRadius:2,border:'none',cursor:'pointer',minWidth:96,transition:'opacity .15s'},
  statWrap:{display:'flex',flexDirection:'column'},
  statL:{fontFamily:"'Inconsolata',monospace",fontSize:7.5,letterSpacing:'.2em',
    textTransform:'uppercase',color:TXT_M,lineHeight:1},
  statV:{fontFamily:"'Inconsolata',monospace",fontSize:13,fontWeight:400,color:TXT,lineHeight:1.4,marginTop:2},
};
