import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Trash2, Download, 
  EyeOff, Eye, Layers, Settings2, PenTool, 
  Sparkles, ChevronRight, Bookmark, RotateCcw,
  RotateCw
} from 'lucide-react';

const CANVAS_SIZE = 1200;

const BG_THEMES = [
  { id: 'blueprint', name: 'Blueprint', bg: '#0f172a', grid: true, gridColor: 'rgba(255,255,255,0.07)', spacing: 40 },
  { id: 'dark', name: 'Dark Studio', bg: '#171717', grid: true, gridColor: 'rgba(255,255,255,0.03)', spacing: 40 },
  { id: 'midnight', name: 'Midnight Void', bg: '#020205', grid: false },
  { id: 'paper', name: 'Drafting Paper', bg: '#fdfaf5', grid: false },
];

const PRESETS = [
  {
    name: "Golden Nebula",
    config: { outer: 300, inner: 180, satellite: 60, isEpi: false, pens: [
      { id: 1, offset: 0.9, color: '#fcd34d', active: true, width: 1.5, rainbow: false },
      { id: 2, offset: 1.2, color: '#f472b6', active: true, width: 1, rainbow: true },
    ]}
  },
  {
    name: "Atomic Orbit",
    config: { outer: 240, inner: 235, satellite: 40, isEpi: true, pens: [
      { id: 1, offset: 2.5, color: '#60a5fa', active: true, width: 2, rainbow: false },
      { id: 2, offset: 0.5, color: '#34d399', active: true, width: 1, rainbow: false },
    ]}
  },
  {
    name: "The Chaos Rose",
    config: { outer: 380, inner: 112, satellite: 95, isEpi: false, pens: [
      { id: 1, offset: 0.8, color: '#ffffff', active: true, width: 1, rainbow: true },
    ]}
  },
  {
    name: "Neon Star",
    config: { outer: 300, inner: 60, satellite: 30, isEpi: false, pens: [
      { id: 1, offset: 1.5, color: '#a855f7', active: true, width: 3, rainbow: false },
      { id: 2, offset: 0.8, color: '#22d3ee', active: true, width: 1.5, rainbow: false },
    ]}
  }
];

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

const ControlGroup = ({ label, value, min, max, step = 1, onChange, unit = "" }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
      <span>{label}</span>
      <span className="text-neutral-200">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
    />
  </div>
);

export default function App() {
  // Gear State
  const [outerRadius, setOuterRadius] = useState(300);
  const [innerRadius, setInnerRadius] = useState(125);
  const [satelliteRadius, setSatelliteRadius] = useState(50);
  const [isEpicycloid, setIsEpicycloid] = useState(false);
  const [speed, setSpeed] = useState(0.08);
  
  // UI State
  const [activePanel, setActivePanel] = useState('gears');
  const [themeId, setThemeId] = useState('blueprint');
  const activeTheme = BG_THEMES.find(t => t.id === themeId);

  // Pen State
  const [pens, setPens] = useState([
    { id: 1, offset: 0.8, color: '#60a5fa', active: true, width: 2, rainbow: false },
    { id: 2, offset: 0.4, color: '#f472b6', active: false, width: 2, rainbow: false },
    { id: 3, offset: 1.2, color: '#34d399', active: false, width: 2, rainbow: false },
  ]);

  const [showGuides, setShowGuides] = useState(true);
  const [autoHide, setAutoHide] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const mainCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const requestRef = useRef(null);
  const angleRef = useRef(0);

  const getTargetAngle = useCallback(() => {
    const r1 = Math.round(outerRadius);
    const r2 = Math.round(innerRadius);
    const r3 = Math.round(satelliteRadius);
    const common = gcd(r1, gcd(r2, r3)) || 1;
    const circuits = (r2 * r3) / common; 
    return Math.min(circuits * Math.PI * 0.5, Math.PI * 250); 
  }, [outerRadius, innerRadius, satelliteRadius]);

  const getFullPosition = useCallback((angle, penOffset) => {
    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    
    const d1 = isEpicycloid ? outerRadius + innerRadius : outerRadius - innerRadius;
    const rotorX = centerX + d1 * Math.cos(angle);
    const rotorY = centerY + d1 * Math.sin(angle);
    const rotorRotation = isEpicycloid ? angle * (outerRadius / innerRadius) : -(angle * (outerRadius / innerRadius));

    const d2 = innerRadius - satelliteRadius; 
    const satX = rotorX + d2 * Math.cos(rotorRotation);
    const satY = rotorY + d2 * Math.sin(rotorRotation);
    const satRotation = rotorRotation * (innerRadius / satelliteRadius);

    return {
      x: satX + satelliteRadius * penOffset * Math.cos(satRotation),
      y: satY + satelliteRadius * penOffset * Math.sin(satRotation),
      rotorX, rotorY, satX, satY
    };
  }, [outerRadius, innerRadius, satelliteRadius, isEpicycloid]);

  const drawGuides = useCallback(() => {
    const ctx = overlayCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const target = getTargetAngle();
    const currentAngle = angleRef.current;
    
    if (!showGuides || (currentAngle >= target && autoHide && !isPlaying)) return;

    const pos = getFullPosition(currentAngle, 0);
    const gearCol = activeTheme.id === 'paper' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';

    ctx.beginPath();
    ctx.arc(CANVAS_SIZE/2, CANVAS_SIZE/2, outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = gearCol;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(pos.rotorX, pos.rotorY, innerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pos.satX, pos.satY, satelliteRadius, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.stroke();

    pens.forEach(pen => {
      if (!pen.active) return;
      const pPos = getFullPosition(currentAngle, pen.offset);
      ctx.beginPath();
      ctx.moveTo(pos.satX, pos.satY);
      ctx.lineTo(pPos.x, pPos.y);
      ctx.strokeStyle = pen.rainbow ? `hsla(${(currentAngle * 50) % 360}, 70%, 60%, 0.4)` : pen.color + '66';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pPos.x, pPos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = pen.rainbow ? `hsl(${(currentAngle * 50) % 360}, 70%, 60%)` : pen.color;
      ctx.fill();
    });
  }, [showGuides, autoHide, isPlaying, outerRadius, innerRadius, satelliteRadius, pens, activeTheme, getTargetAngle, getFullPosition]);

  const animate = useCallback(() => {
    if (!isPlaying) return;
    const mainCtx = mainCanvasRef.current?.getContext('2d');
    const target = getTargetAngle();

    if (angleRef.current >= target) {
      setIsPlaying(false);
      setProgress(100);
      drawGuides();
      return;
    }

    const steps = 40;
    for (let s = 0; s < steps; s++) {
      if (angleRef.current >= target) break;
      const prevA = angleRef.current;
      angleRef.current += speed / steps;

      pens.forEach(pen => {
        if (!pen.active) return;
        const p1 = getFullPosition(prevA, pen.offset);
        const p2 = getFullPosition(angleRef.current, pen.offset);

        mainCtx.beginPath();
        mainCtx.moveTo(p1.x, p1.y);
        mainCtx.lineTo(p2.x, p2.y);
        mainCtx.lineWidth = pen.width;
        mainCtx.lineCap = 'round';
        mainCtx.strokeStyle = pen.rainbow ? `hsl(${(angleRef.current * 60) % 360}, 80%, 60%)` : pen.color;
        mainCtx.stroke();
      });
    }

    setProgress((angleRef.current / target) * 100);
    drawGuides();
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, speed, pens, drawGuides, getTargetAngle, getFullPosition]);

  useEffect(() => {
    if (isPlaying) requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, animate]);

  const clearCanvas = () => {
    const ctx = mainCanvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    angleRef.current = 0;
    setProgress(0);
    drawGuides();
  };

  const loadPreset = (preset) => {
    clearCanvas();
    setOuterRadius(preset.config.outer);
    setInnerRadius(preset.config.inner);
    setSatelliteRadius(preset.config.satellite);
    setIsEpicycloid(preset.config.isEpi);
    setPens(prev => prev.map((p, i) => preset.config.pens[i] ? { ...p, ...preset.config.pens[i] } : { ...p, active: false }));
  };

  const downloadPNG = () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = CANVAS_SIZE;
    exportCanvas.height = CANVAS_SIZE;
    const ctx = exportCanvas.getContext('2d');
    ctx.fillStyle = activeTheme.bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(mainCanvasRef.current, 0, 0);
    
    const link = document.createElement('a');
    link.download = `Spirograph-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex h-screen w-full bg-neutral-950 text-neutral-200 overflow-hidden font-sans">
      <aside className="w-80 h-full bg-neutral-900 border-r border-white/5 flex flex-col z-20 shadow-2xl shrink-0">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h1 className="text-xs font-black tracking-[0.2em] text-white flex items-center gap-2">
            <Settings2 size={16} className="text-indigo-400" />
            ENGINE<span className="text-neutral-600">.V3</span>
          </h1>
        </div>

        <div className="flex border-b border-white/5">
          <button onClick={() => setActivePanel('gears')} className={`flex-1 py-3 text-[10px] font-bold uppercase transition-colors flex flex-col items-center gap-1 ${activePanel === 'gears' ? 'text-indigo-400' : 'text-neutral-500'}`}>
            <RotateCw size={14} /> Gears
          </button>
          <button onClick={() => setActivePanel('pens')} className={`flex-1 py-3 text-[10px] font-bold uppercase transition-colors flex flex-col items-center gap-1 ${activePanel === 'pens' ? 'text-indigo-400' : 'text-neutral-500'}`}>
            <PenTool size={14} /> Pens
          </button>
          <button onClick={() => setActivePanel('presets')} className={`flex-1 py-3 text-[10px] font-bold uppercase transition-colors flex flex-col items-center gap-1 ${activePanel === 'presets' ? 'text-indigo-400' : 'text-neutral-500'}`}>
            <Bookmark size={14} /> Vault
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {activePanel === 'gears' && (
            <div className="space-y-6">
              <div className="flex bg-black/40 p-1 rounded-lg">
                <button onClick={() => setIsEpicycloid(false)} className={`flex-1 py-2 text-[9px] font-black uppercase rounded ${!isEpicycloid ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500'}`}>Hypo</button>
                <button onClick={() => setIsEpicycloid(true)} className={`flex-1 py-2 text-[9px] font-black uppercase rounded ${isEpicycloid ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500'}`}>Epi</button>
              </div>
              <ControlGroup label="Main Stator" value={outerRadius} min={50} max={450} onChange={setOuterRadius} />
              <ControlGroup label="Inner Rotor" value={innerRadius} min={10} max={450} onChange={setInnerRadius} />
              <ControlGroup label="Satellite" value={satelliteRadius} min={5} max={300} onChange={setSatelliteRadius} />
              <ControlGroup label="Motor Speed" value={speed} min={0.01} max={0.5} step={0.01} onChange={setSpeed} />
            </div>
          )}

          {activePanel === 'pens' && (
            <div className="space-y-4">
              {pens.map((pen, idx) => (
                <div key={pen.id} className={`p-4 rounded-xl border transition-all ${pen.active ? 'bg-white/5 border-white/10 shadow-lg' : 'opacity-30 border-transparent'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold uppercase text-indigo-400">Head {idx + 1}</span>
                    <input type="checkbox" checked={pen.active} onChange={(e) => {
                      const n = [...pens]; n[idx].active = e.target.checked; setPens(n);
                    }} className="w-4 h-4 rounded bg-neutral-800 border-white/10 accent-indigo-500" />
                  </div>
                  {pen.active && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                         <span className="text-[9px] uppercase font-bold text-neutral-500">Rainbow Ink</span>
                         <button onClick={() => { const n = [...pens]; n[idx].rainbow = !n[idx].rainbow; setPens(n); }}
                          className={`p-1 rounded ${pen.rainbow ? 'bg-indigo-500 text-white' : 'bg-neutral-800 text-neutral-500'}`}>
                          <Sparkles size={12} />
                         </button>
                      </div>
                      {!pen.rainbow && <input type="color" value={pen.color} onChange={e => {
                        const n = [...pens]; n[idx].color = e.target.value; setPens(n);
                      }} className="w-full h-5 rounded overflow-hidden bg-transparent border-0 cursor-pointer" />}
                      <ControlGroup label="Arm Offset" value={pen.offset} min={0.1} max={4} step={0.05} onChange={v => { const n = [...pens]; n[idx].offset = v; setPens(n); }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activePanel === 'presets' && (
            <div className="space-y-2">
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => loadPreset(p)} className="w-full p-3 bg-neutral-800/50 hover:bg-neutral-800 border border-white/5 rounded-lg text-left transition-all group flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide">{p.name}</span>
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-black/20 border-t border-white/5 space-y-2">
          <button onClick={() => setIsPlaying(!isPlaying)} className={`w-full py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${isPlaying ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-indigo-600 text-white shadow-xl hover:bg-indigo-500'}`}>
            {isPlaying ? 'PAUSE' : 'ENGAGE'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={clearCanvas} className="p-3 bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-400 hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
            <button onClick={() => { angleRef.current = 0; setProgress(0); drawGuides(); }} className="p-3 bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white transition-colors"><RotateCcw size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col items-center justify-center p-8" style={{ backgroundColor: activeTheme.bg }}>
        {activeTheme.grid && (
          <div className="absolute inset-0 pointer-events-none opacity-40" 
            style={{ backgroundImage: `linear-gradient(${activeTheme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${activeTheme.gridColor} 1px, transparent 1px)`, backgroundSize: `${activeTheme.spacing}px ${activeTheme.spacing}px` }}
          />
        )}

        <div className="absolute top-8 right-8 flex items-center gap-4 z-10 scale-90 md:scale-100">
          <div className="flex bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-2xl">
            {BG_THEMES.map(t => (
              <button key={t.id} onClick={() => setThemeId(t.id)} className={`w-8 h-8 rounded-full transition-all ${themeId === t.id ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2 ring-offset-neutral-900' : 'opacity-40 hover:opacity-100'}`} style={{ background: t.bg }} />
            ))}
          </div>
          <button onClick={() => setShowGuides(!showGuides)} className="p-2.5 bg-neutral-900 border border-white/10 rounded-full text-white hover:bg-neutral-800 shadow-xl">{showGuides ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          <button onClick={downloadPNG} className="bg-white text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">Export</button>
        </div>

        <div className="relative w-full max-w-[85vh] aspect-square">
          <canvas ref={mainCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="absolute inset-0 w-full h-full drop-shadow-[0_0_80px_rgba(0,0,0,0.6)]" />
          <canvas ref={overlayCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="absolute inset-0 w-full h-full pointer-events-none" />
        </div>

        <div className="absolute bottom-12 w-80 flex flex-col gap-2">
           <div className="flex justify-between text-[8px] font-black uppercase text-neutral-500 tracking-tighter">
              <span>Sequence Progress</span>
              <span>{Math.round(progress)}%</span>
           </div>
           <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.8)]" style={{ width: `${progress}%` }} />
           </div>
        </div>
      </main>
    </div>
  );
}
