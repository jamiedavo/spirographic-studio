import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Trash2, Download, Settings2, PenTool, Eye, EyeOff, Star } from 'lucide-react';

const CANVAS_SIZE = 800;
const COLORS = {
  paper: '#fdfaf5', 
  graphite: '#1c1917', 
  brass: '#92400e',    
  guideMed: 'rgba(28, 25, 23, 0.15)', 
};

// Math Helper: Greatest Common Divisor
const gcd = (a, b) => b ? gcd(b, a % b) : a;

const FinleySpiralStudio = () => {
  const [outerRadius, setOuterRadius] = useState(360);
  const [innerRadius, setInnerRadius] = useState(147);
  const [isEpicycloid, setIsEpicycloid] = useState(false);
  const [speed, setSpeed] = useState(0.4);
  const [pens, setPens] = useState([
    { id: 1, offset: 0.95, color: '#8ef0e5', active: true, width: 0.3 },
    { id: 2, offset: 0.98, color: '#355dfd', active: true, width: 0.3 },
    { id: 3, offset: 0.50, color: '#bc01d5', active: true, width: 0.4 },
  ]);

  const [showGuides, setShowGuides] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mainCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const requestRef = useRef();
  const angleRef = useRef(0);

  // Calculate closure: Total rotations needed to finish the loop
  const getTargetAngle = useCallback(() => {
    const common = gcd(Math.round(outerRadius), Math.round(innerRadius));
    const circuits = Math.round(innerRadius) / common;
    return circuits * Math.PI * 2;
  }, [outerRadius, innerRadius]);

  const drawGuides = useCallback(() => {
    const overlayCtx = overlayCanvasRef.current?.getContext('2d');
    if (!overlayCtx) return;
    overlayCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Auto-hide guides if finished or explicitly toggled off
    if (!showGuides || angleRef.current >= getTargetAngle()) return;

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const angle = angleRef.current;
    const d = isEpicycloid ? outerRadius + innerRadius : outerRadius - innerRadius;
    const cx = centerX + d * Math.cos(angle);
    const cy = centerY + d * Math.sin(angle);
    const rotation = isEpicycloid ? (angle * (outerRadius / innerRadius)) : -(angle * (outerRadius / innerRadius));

    overlayCtx.beginPath();
    overlayCtx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    overlayCtx.strokeStyle = COLORS.guideMed;
    overlayCtx.setLineDash([5, 5]);
    overlayCtx.stroke();
    overlayCtx.setLineDash([]);

    overlayCtx.beginPath();
    overlayCtx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    overlayCtx.strokeStyle = COLORS.brass;
    overlayCtx.lineWidth = 2;
    overlayCtx.stroke();

    overlayCtx.beginPath();
    overlayCtx.moveTo(cx, cy);
    overlayCtx.lineTo(cx + innerRadius * Math.cos(rotation), cy + innerRadius * Math.sin(rotation));
    overlayCtx.stroke();
  }, [showGuides, outerRadius, innerRadius, isEpicycloid, getTargetAngle]);

  const animate = useCallback(() => {
    if (!isPlaying) return;
    
    const target = getTargetAngle();
    if (angleRef.current >= target) {
      setIsPlaying(false);
      setShowGuides(false); // Hide guides when finished
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
          const rotation = isEpicycloid ? (a * (outerRadius / innerRadius)) : -(a * (outerRadius / innerRadius));
          return {
            x: CANVAS_SIZE / 2 + d * Math.cos(a) + (innerRadius * pen.offset) * Math.cos(rotation),
            y: CANVAS_SIZE / 2 + d * Math.sin(a) + (innerRadius * pen.offset) * Math.sin(rotation)
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
    setShowGuides(true);
    drawGuides();
  };

  const loadGrandadsFavorite = () => {
    handleClear();
    setOuterRadius(360);
    setInnerRadius(147);
    setIsEpicycloid(false);
    setSpeed(0.4);
    setPens([
      { id: 1, offset: 0.95, color: '#8ef0e5', active: true, width: 0.3 },
      { id: 2, offset: 0.98, color: '#355dfd', active: true, width: 0.3 },
      { id: 3, offset: 0.50, color: '#bc01d5', active: true, width: 0.4 },
    ]);
  };

  return (
    <div className="flex h-screen w-full bg-stone-200 overflow-hidden text-stone-900">
      <aside className="w-96 h-full bg-stone-100 border-r-2 border-stone-300 shadow-xl p-8 flex flex-col gap-8 z-10 overflow-y-auto">
        <header>
          <h1 className="text-3xl font-black tracking-tighter text-stone-800 uppercase leading-none">
            Finley's <span className="text-blue-600">Spiral</span> Studio
          </h1>
          <p className="text-[10px] mt-2 font-bold uppercase tracking-[0.3em] text-stone-400">Co-Pilot: Mum</p>
        </header>

        <button onClick={loadGrandadsFavorite} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 transition-all">
          <Star size={18} fill="currentColor" /> Grandad's Neon Dream
        </button>

        <section className="space-y-6">
          <div className="flex items-center gap-2 text-stone-400 uppercase text-[10px] font-black tracking-widest">
            <Settings2 size={14} /> Mechanism
          </div>
          <ControlGroup label="Base Gear" value={outerRadius} min={10} max={380} onChange={setOuterRadius} />
          <ControlGroup label="Moving Gear" value={innerRadius} min={5} max={380} onChange={setInnerRadius} />
          <ControlGroup label="Drawing Speed" value={speed} min={0.01} max={1.0} step={0.01} onChange={setSpeed} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-stone-400 uppercase text-[10px] font-black tracking-widest">
            <PenTool size={14} /> Active Pens
          </div>
          {pens.map((pen, idx) => (
            <div key={pen.id} className={`p-4 rounded-xl border-2 transition-all ${pen.active ? 'bg-white border-stone-300 shadow-sm' : 'opacity-40 border-transparent'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase">Pen {idx + 1}</span>
                <input type="checkbox" checked={pen.active} onChange={(e) => {
                  const newPens = [...pens];
                  newPens[idx].active = e.target.checked;
                  setPens(newPens);
                }} className="w-4 h-4 accent-stone-800" />
              </div>
              {pen.active && (
                <div className="space-y-3">
                  <ControlGroup label="Position" value={pen.offset} min={0} max={3} step={0.01} onChange={(v) => {
                    const newPens = [...pens];
                    newPens[idx].offset = v;
                    setPens(newPens);
                  }} />
                  <ControlGroup label="Weight" value={pen.width} min={0.1} max={5} step={0.1} onChange={(v) => {
                    const newPens = [...pens];
                    newPens[idx].width = v;
                    setPens(newPens);
                  }} />
                  <input type="color" value={pen.color} className="w-full h-6 rounded cursor-pointer mt-1" onChange={(e) => {
                    const newPens = [...pens];
                    newPens[idx].color = e.target.value;
                    setPens(newPens);
                  }} />
                </div>
              )}
            </div>
          ))}
        </section>

        <button onClick={() => setShowGuides(!showGuides)} className="mt-auto py-3 rounded-lg border-2 border-stone-300 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
          {showGuides ? 'Hide Blueprint Guides' : 'Show Blueprint Guides'}
        </button>
      </aside>

      <main className="flex-1 flex items-center justify-center p-12 bg-stone-300/50 relative">
        <div className="bg-white p-4 shadow-2xl rounded-sm relative">
          <canvas ref={mainCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} style={{ backgroundColor: COLORS.paper }} />
          <canvas ref={overlayCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="absolute top-4 left-4 pointer-events-none" />
        </div>

        <div className="absolute bottom-10 flex items-center gap-6 bg-stone-900 px-8 py-4 rounded-full shadow-2xl">
          <button onClick={handleClear} className="text-stone-400 hover:text-red-400 transition-colors"><Trash2 size={20}/></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-stone-900 hover:scale-105 transition-all">
            {isPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} className="ml-1" fill="currentColor"/>}
          </button>
          <button onClick={() => {
            const link = document.createElement('a');
            link.download = `Finley-Art-${Date.now()}.png`;
            link.href = mainCanvasRef.current.toDataURL();
            link.click();
          }} className="text-stone-400 hover:text-blue-400 transition-colors"><Download size={20}/></button>
        </div>
      </main>
    </div>
  );
};

const ControlGroup = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-[9px] font-black uppercase text-stone-500 tracking-tighter">
      <span>{label}</span>
      <span className="font-mono text-stone-800">{value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-stone-800 h-1.5 bg-stone-300 rounded-lg cursor-pointer" />
  </div>
);

export default FinleySpiralStudio;
