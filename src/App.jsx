import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Trash2, Download, Settings2, PenTool, Infinity } from 'lucide-react';

const CANVAS_SIZE = 800;
const COLORS = {
  paper: '#ffffff', 
  track: '#d3d3d3', 
  gear: '#f59e0b',  
};

const gcd = (a, b) => b ? gcd(b, a % b) : a;

const FinleySpiralStudio = () => {
  const [outerRadius, setOuterRadius] = useState(250);
  const [innerRadius, setInnerRadius] = useState(105);
  const [isEpicycloid, setIsEpicycloid] = useState(false);
  const [speed, setSpeed] = useState(0.1);
  const [pens, setPens] = useState([
    { id: 1, offset: 0.8, color: '#ef4444', active: true, width: 2.5 }, 
    { id: 2, offset: 0.5, color: '#3b82f6', active: true, width: 2.0 }, 
    { id: 3, offset: 0.3, color: '#10b981', active: false, width: 1.5 }, 
  ]);

  const [showGuides, setShowGuides] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mainCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const requestRef = useRef();
  const angleRef = useRef(0);

  const getTargetAngle = useCallback(() => {
    const r1 = Math.round(outerRadius);
    const r2 = Math.round(innerRadius);
    if (r1 === 0 || r2 === 0) return 0;
    const common = gcd(r1, r2);
    const circuits = r2 / common;
    return circuits * Math.PI * 2;
  }, [outerRadius, innerRadius]);

  const drawGuides = useCallback(() => {
    const overlayCtx = overlayCanvasRef.current?.getContext('2d');
    if (!overlayCtx) return;
    overlayCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    if (!showGuides || angleRef.current >= getTargetAngle()) return;

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const angle = angleRef.current;
    const d = isEpicycloid ? outerRadius + innerRadius : outerRadius - innerRadius;
    const cx = centerX + d * Math.cos(angle);
    const cy = centerY + d * Math.sin(angle);
    
    // Exact same rotation logic as the pen
    const rotation = isEpicycloid ? (angle * (outerRadius / innerRadius)) : -(angle * (outerRadius / innerRadius));

    // Big Track
    overlayCtx.beginPath();
    overlayCtx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    overlayCtx.strokeStyle = COLORS.track;
    overlayCtx.lineWidth = 2;
    overlayCtx.stroke();

    // Moving Gear Outline
    overlayCtx.beginPath();
    overlayCtx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    overlayCtx.strokeStyle = COLORS.gear;
    overlayCtx.lineWidth = 3;
    overlayCtx.stroke();

    // Yellow Spokes (Center of the Gear)
    for (let i = 0; i < 4; i++) {
      const spokeAngle = rotation + (i * Math.PI / 2);
      overlayCtx.beginPath();
      overlayCtx.moveTo(cx, cy);
      overlayCtx.lineTo(cx + innerRadius * Math.cos(spokeAngle), cy + innerRadius * Math.sin(spokeAngle));
      overlayCtx.strokeStyle = COLORS.gear;
      overlayCtx.lineWidth = 2;
      overlayCtx.stroke();
    }
  }, [showGuides, outerRadius, innerRadius, isEpicycloid, getTargetAngle]);

  useEffect(() => {
    const ctx = mainCanvasRef.current.getContext('2d');
    if (angleRef.current === 0) {
      ctx.fillStyle = COLORS.paper;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
    drawGuides();
  }, [drawGuides]);

  const animate = useCallback(() => {
    if (!isPlaying) return;
    const target = getTargetAngle();
    if (angleRef.current >= target) {
      setIsPlaying(false);
      drawGuides(); 
      return;
    }

    const mainCtx = mainCanvasRef.current.getContext('2d');
    const steps = 15; 
    for (let s = 0; s < steps; s++) {
      if (angleRef.current >= target) break;
      const prevAngle = angleRef.current;
      angleRef.current += speed / steps;
      const currentAngle = angleRef.current;
      const d = isEpicycloid ? outerRadius + innerRadius : outerRadius - innerRadius;
      
      pens.forEach((pen) => {
        if (!pen.active) return;
        const getPos = (a) => {
          const rot = isEpicycloid ? (a * (outerRadius / innerRadius)) : -(a * (outerRadius / innerRadius));
          // If pen.offset is 0, this mathematically becomes exactly cx and cy
          return {
            x: CANVAS_SIZE / 2 + d * Math.cos(a) + (innerRadius * pen.offset) * Math.cos(rot),
            y: CANVAS_SIZE / 2 + d * Math.sin(a) + (innerRadius * pen.offset) * Math.sin(rot)
          };
        };
        const p1 = getPos(prevAngle);
        const p2 = getPos(currentAngle);
        mainCtx.beginPath();
        mainCtx.moveTo(p1.x, p1.y);
        mainCtx.lineTo(p2.x, p2.y);
        mainCtx.strokeStyle = pen.color;
        mainCtx.lineWidth = pen.width;
        mainCtx.lineCap = 'round';
        mainCtx.stroke();
      });
    }
    drawGuides();
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, outerRadius, innerRadius, isEpicycloid, speed, pens, drawGuides, getTargetAngle]);

  useEffect(() => {
    if (isPlaying) requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, animate]);

  const handleClear = () => {
    const ctx = mainCanvasRef.current.getContext('2d');
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    angleRef.current = 0;
    setIsPlaying(false);
    drawGuides();
  };

  return (
    <div className="flex h-screen w-full bg-blue-50 overflow-hidden font-sans">
      <aside className="w-80 h-full bg-white border-r-4 border-yellow-400 shadow-2xl p-6 flex flex-col gap-6 z-10 overflow-y-auto">
        <header className="bg-yellow-400 -m-6 mb-2 p-6">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
            <Infinity size={28} strokeWidth={3} /> Finley's Studio
          </h1>
          <p className="text-blue-800 font-bold text-[10px] mt-1 tracking-widest uppercase">
            Try and make a fun colourful pattern
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-blue-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">Settings</h2>
          <ControlGroup label="Big Circle" value={outerRadius} min={10} max={380} color="bg-red-400" onChange={setOuterRadius} />
          <ControlGroup label="Small Gear" value={innerRadius} min={5} max={380} color="bg-blue-400" onChange={setInnerRadius} />
          <ControlGroup label="Speed" value={speed} min={0.01} max={1.5} step={0.01} color="bg-green-400" onChange={setSpeed} />
        </section>

        <section className="space-y-4">
          <h2 className="text-blue-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">Pens</h2>
          {pens.map((pen, idx) => (
            <div key={pen.id} className={`p-3 rounded-xl border-4 transition-all ${pen.active ? 'bg-white border-yellow-400 shadow-md' : 'opacity-40 border-slate-100'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-black text-slate-700 text-xs">PEN {idx + 1}</span>
                <input type="checkbox" checked={pen.active} onChange={(e) => {
                  const newPens = [...pens];
                  newPens[idx].active = e.target.checked;
                  setPens(newPens);
                }} className="w-4 h-4 rounded-full accent-yellow-500" />
              </div>
              {pen.active && (
                <div className="space-y-2">
                  <ControlGroup label="Wobble" value={pen.offset} min={0} max={3} step={0.01} color="bg-slate-300" onChange={(v) => {
                    const n = [...pens]; n[idx].offset = v; setPens(n);
                  }} />
                  <ControlGroup label="Fatness" value={pen.width} min={0.1} max={15} step={0.1} color="bg-slate-300" onChange={(v) => {
                    const n = [...pens]; n[idx].width = v; setPens(n);
                  }} />
                  <input type="color" value={pen.color} className="w-full h-8 rounded-lg cursor-pointer border-2 border-slate-200" onChange={(e) => {
                    const n = [...pens]; n[idx].color = e.target.value; setPens(n);
                  }} />
                </div>
              )}
            </div>
          ))}
        </section>

        <button onClick={() => setShowGuides(!showGuides)} className="mt-auto py-3 rounded-xl bg-slate-100 border-2 border-slate-200 text-[10px] font-black uppercase text-slate-500 hover:bg-white transition-all">
          {showGuides ? 'Hide the Gears' : 'Show the Gears'}
        </button>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <div className="bg-white p-4 shadow-2xl rounded-xl border-4 border-white relative max-w-full max-h-[80vh] aspect-square">
          <canvas ref={mainCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="rounded-lg w-full h-full" />
          <canvas ref={overlayCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="absolute top-4 left-4 pointer-events-none w-full h-full" />
        </div>

        <div className="mt-6 flex items-center gap-6 bg-white px-8 py-4 rounded-3xl shadow-xl border-4 border-yellow-400">
          <button onClick={handleClear} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={24}/></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-all">
            {isPlaying ? <Pause size={30} fill="white"/> : <Play size={30} className="ml-1" fill="white"/>}
          </button>
          <button onClick={() => {
            const link = document.createElement('a');
            link.download = `Finley-Art.png`;
            link.href = mainCanvasRef.current.toDataURL();
            link.click();
          }} className="text-slate-400 hover:text-blue-500 transition-colors"><Download size={24}/></button>
        </div>
      </main>
    </div>
  );
};

const ControlGroup = ({ label, value, min, max, step = 1, color, onChange }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
      <span>{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${color}`} />
  </div>
);

export default FinleySpiralStudio;
