import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Trash2, Download, Settings2, PenTool, Eye, EyeOff, Sparkles } from 'lucide-react';

const CANVAS_SIZE = 800;
const COLORS = {
  paper: '#ffffff', 
  brass: '#f59e0b', // Bright Gold for the gear
  guideMed: 'rgba(59, 130, 246, 0.2)', // Friendly blue guides
};

const gcd = (a, b) => b ? gcd(b, a % b) : a;

const FinleySpiralStudio = () => {
  const [outerRadius, setOuterRadius] = useState(250);
  const [innerRadius, setInnerRadius] = useState(105);
  const [isEpicycloid, setIsEpicycloid] = useState(false);
  const [speed, setSpeed] = useState(0.1);
  const [pens, setPens] = useState([
    { id: 1, offset: 0.8, color: '#ef4444', active: true, width: 2.0 }, // Candy Red
    { id: 2, offset: 0.5, color: '#3b82f6', active: true, width: 1.5 }, // Sky Blue
    { id: 3, offset: 0.3, color: '#10b981', active: false, width: 1.0 }, // Grass Green
  ]);

  const [showGuides, setShowGuides] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mainCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const requestRef = useRef();
  const angleRef = useRef(0);

  // Math to find the end of the loop
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
    
    // Auto-hide guides if finished or hidden
    if (!showGuides || angleRef.current >= getTargetAngle()) return;

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const angle = angleRef.current;
    const d = isEpicycloid ? outerRadius + innerRadius : outerRadius - innerRadius;
    const cx = centerX + d * Math.cos(angle);
    const cy = centerY + d * Math.sin(angle);
    const rotation = isEpicycloid ? (angle * (outerRadius / innerRadius)) : -(angle * (outerRadius / innerRadius));

    // Outer Circle
    overlayCtx.beginPath();
    overlayCtx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    overlayCtx.strokeStyle = COLORS.guideMed;
    overlayCtx.setLineDash([8, 4]);
    overlayCtx.lineWidth = 2;
    overlayCtx.stroke();
    overlayCtx.setLineDash([]);

    // Moving Gear
    overlayCtx.beginPath();
    overlayCtx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    overlayCtx.strokeStyle = COLORS.brass;
    overlayCtx.lineWidth = 4;
    overlayCtx.stroke();

    // Pen Arm
    overlayCtx.beginPath();
    overlayCtx.moveTo(cx, cy);
    overlayCtx.lineTo(cx + innerRadius * Math.cos(rotation), cy + innerRadius * Math.sin(rotation));
    overlayCtx.strokeStyle = '#94a3b8';
    overlayCtx.lineWidth = 2;
    overlayCtx.stroke();
  }, [showGuides, outerRadius, innerRadius, isEpicycloid, getTargetAngle]);

  const animate = useCallback(() => {
    if (!isPlaying) return;
    
    const target = getTargetAngle();
    if (angleRef.current >= target) {
      setIsPlaying(false);
      setShowGuides(false); // Drawing is done! Hide the tools.
      return;
    }

    const mainCtx = mainCanvasRef.current.getContext('2d');
    const steps = 12; 
    
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

  return (
    <div className="flex h-screen w-full bg-blue-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-96 h-full bg-white border-r-4 border-yellow-400 shadow-2xl p-8 flex flex-col gap-8 z-10 overflow-y-auto">
        <header className="bg-yellow-400 -m-8 mb-4 p-8">
          <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2">
            <Sparkles fill="white" /> Finley's Studio
          </h1>
          <p className="text-blue-800 font-bold text-xs mt-1 tracking-widest uppercase">Mum's Geometry Fun</p>
        </header>

        <section className="space-y-6">
          <h2 className="text-blue-500 font-black text-xs uppercase tracking-widest flex items-center gap-2">
            <Settings2 size={16} /> Gear Settings
          </h2>
          <ControlGroup label="Big Circle" value={outerRadius} min={10} max={380} color="bg-red-400" onChange={setOuterRadius} />
          <ControlGroup label="Small Circle" value={innerRadius} min={5} max={380} color="bg-blue-400" onChange={setInnerRadius} />
          <ControlGroup label="Turbo Speed" value={speed} min={0.01} max={1.5} step={0.01} color="bg-green-400" onChange={setSpeed} />
        </section>

        <section className="space-y-4">
          <h2 className="text-blue-500 font-black text-xs uppercase tracking-widest flex items-center gap-2">
            <PenTool size={16} /> Pick Your Pens
          </h2>
          {pens.map((pen, idx) => (
            <div key={pen.id} className={`p-4 rounded-2xl border-4 transition-all ${pen.active ? 'bg-white border-yellow-400 shadow-lg' : 'opacity-40 border-slate-100'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-slate-700">PEN {idx + 1}</span>
                <input type="checkbox" checked={pen.active} onChange={(e) => {
                  const newPens = [...pens];
                  newPens[idx].active = e.target.checked;
                  setPens(newPens);
                }} className="w-6 h-6 rounded-full accent-yellow-500" />
              </div>
              {pen.active && (
                <div className="space-y-3">
                  <ControlGroup label="Wobble" value={pen.offset} min={0} max={3} step={0.01} color="bg-slate-300" onChange={(v) => {
                    const newPens = [...pens];
                    newPens[idx].offset = v;
                    setPens(newPens);
                  }} />
                  <ControlGroup label="Fatness" value={pen.width} min={0.1} max={10} step={0.1} color="bg-slate-300" onChange={(v) => {
                    const newPens = [...pens];
                    newPens[idx].width = v;
                    setPens(newPens);
                  }} />
                  <input type="color" value={pen.color} className="w-full h-10 rounded-xl cursor-pointer border-2 border-slate-200" onChange={(e) => {
                    const newPens = [...pens];
                    newPens[idx].color = e.target.value;
                    setPens(newPens);
                  }} />
                </div>
              )}
            </div>
          ))}
        </section>

        <button onClick={() => setShowGuides(!showGuides)} className="mt-auto py-4 rounded-2xl bg-slate-100 border-2 border-slate-200 text-xs font-black uppercase text-slate-500 hover:bg-white transition-all">
          {showGuides ? 'Hide the Blueprints' : 'Show the Blueprints'}
        </button>
      </aside>

      {/* Drawing Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-12 relative">
        <div className="bg-white p-6 shadow-2xl rounded-xl border-8 border-white relative">
          <canvas ref={mainCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="rounded-lg" />
          <canvas ref={overlayCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="absolute top-6 left-6 pointer-events-none" />
        </div>

        {/* Controls Bar */}
        <div className="mt-8 flex items-center gap-8 bg-white px-10 py-6 rounded-3xl shadow-xl border-4 border-yellow-400">
          <button onClick={handleClear} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={28}/></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-all">
            {isPlaying ? <Pause size={36} fill="white"/> : <Play size={36} className="ml-2" fill="white"/>}
          </button>
          <button onClick={() => {
            const link = document.createElement('a');
            link.download = `Finley-Art.png`;
            link.href = mainCanvasRef.current.toDataURL();
            link.click();
          }} className="text-slate-400 hover:text-blue-500 transition-colors"><Download size={28}/></button>
        </div>
      </main>
    </div>
  );
};

const ControlGroup = ({ label, value, min, max, step = 1, color, onChange }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
      <span>{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))} 
      className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${color}`} 
    />
  </div>
);

export default FinleySpiralStudio;
