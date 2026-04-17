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

  const drawGuides = useCallback(() => {
    const overlayCtx = overlayCanvasRef.current?.getContext('2d');
    if (!overlayCtx) return;

    overlayCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (!showGuides) return;

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

    overlayCtx.beginPath();
    overlayCtx.moveTo(cx, cy);
    overlayCtx.lineTo(cx + innerRadius * Math.cos(rotation), cy + innerRadius * Math.sin(rotation));
    overlayCtx.stroke();

    pens.forEach(pen => {
      if (!pen.active) return;
      const px = cx + (innerRadius * pen.offset) * Math.cos(rotation);
      const py = cy + (innerRadius * pen.offset) * Math.sin(rotation);
      overlayCtx.beginPath();
      overlayCtx.arc(px, py, 5, 0, Math.PI * 2);
      overlayCtx.fillStyle = pen.color;
      overlayCtx.fill();
      overlayCtx.strokeStyle = 'white';
      overlayCtx.lineWidth = 2;
      overlayCtx.stroke();
    });
  }, [showGuides, outerRadius, innerRadius, isEpicycloid, pens]);

  useEffect(() => { drawGuides(); }, [drawGuides, outerRadius, innerRadius, isEpicycloid, pens, showGuides]);

  const animate = useCallback(() => {
    if (!isPlaying) return;
    const mainCtx = mainCanvasRef.current.getContext('2d');
    const steps = 12; 
    for (let s = 0; s < steps; s++) {
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
  }, [isPlaying, outerRadius, innerRadius, isEpicycloid, speed, pens, drawGuides]);

  useEffect(() => {
    if (isPlaying) requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, animate]);

  useEffect(() => {
    const ctx = mainCanvasRef.current.getContext('2d');
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }, []);

  const handleClear = () => {
    const ctx = mainCanvasRef.current.getContext('2d');
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    angleRef.current = 0;
    drawGuides();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden text-stone-900" style={{ backgroundColor: '#e7e5e4' }}>
      <aside className="w-96 h-full border-r border-stone-400 bg-stone-100 shadow-2xl overflow-y-auto p-8 flex flex-col gap-10 z-10">
        <header>
          <h1 className="text-2xl font-bold tracking-widest uppercase text-stone-800">Spirograph Studio</h1>
          <div className="h-1 w-16 bg-stone-800 mt-2"></div>
        </header>

        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-stone-600">
            <Settings2 size={20} />
            <h2 className="text-sm font-black uppercase tracking-widest">Mechanism</h2>
          </div>
          <div className="space-y-8">
            <ControlGroup label="Base Circle" value={outerRadius} min={10} max={380} onChange={setOuterRadius} />
            <ControlGroup label="Moving Circle" value={innerRadius} min={5} max={380} onChange={setInnerRadius} />
            <ControlGroup label="Drawing Speed" value={speed} min={0.01} max={0.5} step={0.01} onChange={setSpeed} />
            
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-600">Track Type</label>
              <div className="flex p-1.5 bg-stone-300 rounded-lg">
                <button onClick={() => setIsEpicycloid(false)} className={`flex-1 py-2 text-sm rounded-md transition-all ${!isEpicycloid ? 'bg-white shadow-md font-bold text-stone-900' : 'text-stone-600 hover:text-stone-800'}`}>Inside</button>
                <button onClick={() => setIsEpicycloid(true)} className={`flex-1 py-2 text-sm rounded-md transition-all ${isEpicycloid ? 'bg-white shadow-md font-bold text-stone-900' : 'text-stone-600 hover:text-stone-800'}`}>Outside</button>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-stone-600">
            <PenTool size={20} />
            <h2 className="text-sm font-black uppercase tracking-widest">Active Pens</h2>
          </div>
          {pens.map((pen, idx) => (
            <div key={pen.id} className={`p-5 rounded-xl border-2 transition-all ${pen.active ? 'border-stone-400 bg-white' : 'border-transparent opacity-50 bg-stone-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-stone-800">Pen {idx + 1}</span>
                <input type="checkbox" className="w-5 h-5 accent-stone-800 cursor-pointer" checked={pen.active} onChange={(e) => {
                  const newPens = [...pens];
                  newPens[idx].active = e.target.checked;
                  setPens(newPens);
                }} />
              </div>
              {pen.active && (
                <div className="space-y-6">
                  <ControlGroup label="Pen Position" value={pen.offset} min={0} max={3} step={0.01} onChange={(v) => {
                    const newPens = [...pens];
                    newPens[idx].offset = v;
                    setPens(newPens);
                  }} />
                  {/* --- NEW DENSITY / WIDTH SLIDER --- */}
                  <ControlGroup label="Line Weight" value={pen.width} min={0.1} max={5} step={0.1} onChange={(v) => {
                    const newPens = [...pens];
                    newPens[idx].width = v;
                    setPens(newPens);
                  }} />
                  <div className="flex justify-between items-center pt-2">
                    <label className="text-xs font-bold uppercase text-stone-500 tracking-tighter">Ink Color</label>
                    <input type="color" value={pen.color} className="w-8 h-8 cursor-pointer rounded overflow-hidden" onChange={(e) => {
                      const newPens = [...pens];
                      newPens[idx].color = e.target.value;
                      setPens(newPens);
                    }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>

        <button onClick={() => setShowGuides(!showGuides)} className={`mt-auto w-full flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${showGuides ? 'bg-stone-800 text-white shadow-lg' : 'bg-white border-2 border-stone-400 text-stone-600'}`}>
          {showGuides ? <Eye size={20} /> : <EyeOff size={20} />}
          Guides {showGuides ? 'Visible' : 'Hidden'}
        </button>
      </aside>

      <main className="flex-1 relative flex items-center justify-center p-8 bg-stone-300/30">
        <div className="relative shadow-[0_0_60px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden bg-white border-[16px] border-white">
          <canvas ref={mainCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
          <canvas ref={overlayCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="absolute top-0 left-0 pointer-events-none" />
        </div>
        
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 px-10 py-5 bg-stone-900 text-white rounded-full shadow-2xl border border-stone-700">
          <button onClick={handleClear} className="p-2 hover:text-red-400 transition-colors" title="Wipe Paper"><Trash2 size={24} /></button>
          <div className="h-8 w-px bg-stone-700"></div>
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 flex items-center justify-center rounded-full bg-white text-stone-900 hover:scale-105 transition-transform shadow-inner">
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="ml-1" fill="currentColor" />}
          </button>
          <div className="h-8 w-px bg-stone-700"></div>
          <button onClick={() => {
            const link = document.createElement('a');
            link.download = 'spirograph.png';
            link.href = mainCanvasRef.current.toDataURL();
            link.click();
          }} className="p-2 hover:text-amber-400 transition-colors" title="Export Design"><Download size={24} /></button>
        </div>
      </main>
    </div>
  );
};

const ControlGroup = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="flex flex-col gap-3">
    <div className="flex justify-between items-center">
      <label className="text-xs font-black uppercase tracking-widest text-stone-700">{label}</label>
      <input 
        type="number" 
        value={value} 
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-16 bg-white border-2 border-stone-300 rounded-md p-1.5 text-sm font-mono text-center focus:outline-none focus:border-stone-800 text-stone-900 shadow-sm"
      />
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))} 
      className="w-full accent-stone-800 h-2 bg-stone-300 rounded-lg appearance-none cursor-pointer" 
    />
  </div>
);

export default SpirographStudio;
