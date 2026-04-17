import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Trash2, Download, Settings2, PenTool, Eye, EyeOff } from 'lucide-react';

const CANVAS_SIZE = 800;
const COLORS = {
  paper: '#fdfaf5', 
  grid: '#e8e2d8',
  graphite: '#1c1917', 
  brass: '#92400e',    
  guideMed: 'rgba(28, 25, 23, 0.2)', 
  sidebarBg: '#f3f1ed', 
};

const gcd = (a, b) => b ? gcd(b, a % b) : a;

const SpirographStudio = () => {
  const [outerRadius, setOuterRadius] = useState(250);
  const [innerRadius, setInnerRadius] = useState(105);
  const [isEpicycloid, setIsEpicycloid] = useState(false);
  const [speed, setSpeed] = useState(0.06);
  const [pens, setPens] = useState([
    { id: 1, offset: 0.7, color: '#1c1917', active: true, width: 1.0 },
    { id: 2, offset: 0.4, color: '#44403c', active: false, width: 1.0 },
    { id: 3, offset: 0.9, color: '#92400e', active: false, width: 1.0 },
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
    
    // Only show guides if playing or if we haven't started/finished yet
    const target = getTargetAngle();
    if (!showGuides || (angleRef.current >= target && !isPlaying)) return;

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
    overlayCtx.lineWidth = 1;
    overlayCtx.stroke();
    overlayCtx.setLineDash([]);

    overlayCtx.beginPath();
    overlayCtx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    overlayCtx.strokeStyle = COLORS.brass;
    overlayCtx.lineWidth = 2;
    overlayCtx.stroke();

    pens.forEach(pen => {
      if (!pen.active) return;
      const px = cx + (innerRadius * pen.offset) * Math.cos(rotation);
      const py = cy + (innerRadius * pen.offset) * Math.sin(rotation);
      overlayCtx.beginPath();
      overlayCtx.arc(px, py, 4, 0, Math.PI * 2);
      overlayCtx.fillStyle = pen.color;
      overlayCtx.fill();
    });
  }, [showGuides, isPlaying, outerRadius, innerRadius, isEpicycloid, pens, getTargetAngle]);

  useEffect(() => {
    const ctx = mainCanvasRef.current.getContext('2d');
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawGuides();
  }, []); // Only run once on mount

  const animate = useCallback(() => {
    if (!isPlaying) return;
    
    const target = getTargetAngle();
    if (angleRef.current >= target) {
      setIsPlaying(false);
      // We don't clear the main canvas here anymore!
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
    setIsPlaying(false);
    drawGuides();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden text-stone-900 bg-stone-300/30">
      <aside className="w-96 h-full border-r border-stone-400 bg-stone-100 shadow-2xl overflow-y-auto p-8 flex flex-col gap-10 z-10">
        <header>
          <h1 className="text-2xl font-bold tracking-widest uppercase text-stone-800 italic">Analytical Spiro</h1>
          <div className="h-1 w-16 bg-stone-800 mt-2"></div>
        </header>

        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-stone-600">
            <Settings2 size={20} />
            <h2 className="text-sm font-black uppercase tracking-widest">Mechanism</h2>
          </div>
          <div className="space-y-8">
            <ControlGroup label="Fixed Radius" value={outerRadius} min={10} max={380} onChange={setOuterRadius} />
            <ControlGroup label="Moving Radius" value={innerRadius} min={5} max={380} onChange={setInnerRadius} />
            <ControlGroup label="Velocity" value={speed} min={0.01} max={1.5} step={0.01} onChange={setSpeed} />
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-stone-600">
            <PenTool size={20} />
            <h2 className="text-sm font-black uppercase tracking-widest">Pen Configuration</h2>
          </div>
          {pens.map((pen, idx) => (
            <div key={pen.id} className={`p-5 rounded-xl border-2 transition-all ${pen.active ? 'border-stone-400 bg-white shadow-sm' : 'border-transparent opacity-40'}`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-tighter">Probe {idx + 1}</span>
                <input type="checkbox" className="w-4 h-4 accent-stone-800 cursor-pointer" checked={pen.active} onChange={(e) => {
                  const newPens = [...pens];
                  newPens[idx].active = e.target.checked;
                  setPens(newPens);
                }} />
              </div>
              {pen.active && (
                <div className="space-y-6">
                  <ControlGroup label="Offset Ratio" value={pen.offset} min={0} max={3} step={0.01} onChange={(v) => {
                    const newPens = [...pens];
                    newPens[idx].offset = v;
                    setPens(newPens);
                  }} />
                  <input type="color" value={pen.color} className="w-full h-8 cursor-pointer rounded border border-stone-200" onChange={(e) => {
                    const newPens = [...pens];
                    newPens[idx].color = e.target.value;
                    setPens(newPens);
                  }} />
                </div>
              )}
            </div>
          ))}
        </section>

        <button onClick={() => setShowGuides(!showGuides)} className={`mt-auto w-full flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${showGuides ? 'bg-stone-800 text-white shadow-lg' : 'bg-white border-2 border-stone-400 text-stone-600'}`}>
          {showGuides ? <Eye size={20} /> : <EyeOff size={20} />}
          Guides {showGuides ? 'Enabled' : 'Disabled'}
        </button>
      </aside>

      <main className="flex-1 relative flex items-center justify-center p-8">
        <div className="relative shadow-2xl rounded-sm bg-white border-[12px] border-white">
          <canvas ref={mainCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
          <canvas ref={overlayCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="absolute top-0 left-0 pointer-events-none" />
        </div>
        
        <div className="absolute bottom-10 flex items-center gap-6 px-8 py-4 bg-stone-900 text-white rounded-2xl shadow-2xl">
          <button onClick={handleClear} className="p-2 hover:text-red-400 transition-colors"><Trash2 size={24} /></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-14 h-14 flex items-center justify-center rounded-full bg-white text-stone-900 hover:scale-105 transition-transform">
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="ml-1" fill="currentColor" />}
          </button>
          <button onClick={() => {
            const link = document.createElement('a');
            link.download = 'analysis.png';
            link.href = mainCanvasRef.current.toDataURL();
            link.click();
          }} className="p-2 hover:text-blue-400 transition-colors"><Download size={24} /></button>
        </div>
      </main>
    </div>
  );
};

const ControlGroup = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-center text-[10px] font-black uppercase text-stone-500 tracking-wider">
      <label>{label}</label>
      <span className="font-mono bg-stone-200 px-2 py-0.5 rounded text-stone-800">{value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-stone-800 h-1.5 bg-stone-300 rounded-lg appearance-none cursor-pointer" />
  </div>
);

export default SpirographStudio;
