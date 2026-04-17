import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Trash2, Download, Layers, Settings2, PenTool, Eye, EyeOff } from 'lucide-react';

// --- Constants & Styles ---
const CANVAS_SIZE = 800;
const COLORS = {
  paper: '#fdfaf5', 
  grid: '#e8e2d8',
  graphite: '#2c2c2c',
  brass: '#b5a48b',
  guideLight: 'rgba(44, 44, 44, 0.05)',
  guideMed: 'rgba(44, 44, 44, 0.15)',
  guideFull: 'rgba(181, 164, 139, 0.4)',
};

const SpirographStudio = () => {
  // State: Mechanism
  const [outerRadius, setOuterRadius] = useState(250);
  const [innerRadius, setInnerRadius] = useState(105);
  const [isEpicycloid, setIsEpicycloid] = useState(false);
  const [speed, setSpeed] = useState(0.05);

  // State: Pens
  const [pens, setPens] = useState([
    { id: 1, offset: 0.7, color: '#2c2c2c', active: true, width: 1.2 },
    { id: 2, offset: 0.4, color: '#4a5568', active: false, width: 1.0 },
    { id: 3, offset: 0.9, color: '#b5a48b', active: false, width: 1.5 },
  ]);

  // State: View (Simplified to On/Off, Default ON)
  const [showGuides, setShowGuides] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mainCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const requestRef = useRef();
  const angleRef = useRef(0);

  // --- Logic: Drawing the Mechanical Overlay ---
  
  const drawGuides = useCallback(() => {
    const overlayCtx = overlayCanvasRef.current?.getContext('2d');
    if (!overlayCtx) return;

    overlayCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // If guides are off, we stop here
    if (!showGuides) return;

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const angle = angleRef.current;

    // Calculate moving circle center
    const d = isEpicycloid ? outerRadius + innerRadius : outerRadius - innerRadius;
    const cx = centerX + d * Math.cos(angle);
    const cy = centerY + d * Math.sin(angle);
    
    // Calculate rotation of the inner wheel
    const rotation = isEpicycloid ? (angle * (outerRadius / innerRadius)) : -(angle * (outerRadius / innerRadius));

    // 1. Base Ring (The fixed track)
    overlayCtx.beginPath();
    overlayCtx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    overlayCtx.strokeStyle = COLORS.guideMed;
    overlayCtx.setLineDash([5, 5]);
    overlayCtx.stroke();
    overlayCtx.setLineDash([]);

    // 2. Moving Wheel (The gear)
    overlayCtx.beginPath();
    overlayCtx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    overlayCtx.strokeStyle = COLORS.brass;
    overlayCtx.lineWidth = 1.5;
    overlayCtx.stroke();

    // 3. Mechanical Detail: Rotation marker & Spoke
    overlayCtx.beginPath();
    overlayCtx.moveTo(cx, cy);
    overlayCtx.lineTo(cx + innerRadius * Math.cos(rotation), cy + innerRadius * Math.sin(rotation));
    overlayCtx.strokeStyle = COLORS.brass;
    overlayCtx.stroke();
    
    overlayCtx.beginPath();
    overlayCtx.arc(cx, cy, 4, 0, Math.PI * 2);
    overlayCtx.fillStyle = COLORS.brass;
    overlayCtx.fill();

    // 4. Pen Positions
    pens.forEach(pen => {
      if (!pen.active) return;
      const px = cx + (innerRadius * pen.offset) * Math.cos(rotation);
      const py = cy + (innerRadius * pen.offset) * Math.sin(rotation);

      // Arm from center to pen
      overlayCtx.beginPath();
      overlayCtx.moveTo(cx, cy);
      overlayCtx.lineTo(px, py);
      overlayCtx.strokeStyle = 'rgba(181, 164, 139, 0.2)';
      overlayCtx.stroke();

      // The Pen Nib
      overlayCtx.beginPath();
      overlayCtx.arc(px, py, 4, 0, Math.PI * 2);
      overlayCtx.fillStyle = pen.color;
      overlayCtx.fill();
      overlayCtx.strokeStyle = 'white';
      overlayCtx.lineWidth = 1;
      overlayCtx.stroke();
    });
  }, [showGuides, outerRadius, innerRadius, isEpicycloid, pens]);

  // Update guides whenever parameters change (even if paused)
  useEffect(() => {
    drawGuides();
  }, [drawGuides, outerRadius, innerRadius, isEpicycloid, pens, showGuides]);

  const animate = useCallback(() => {
    if (!isPlaying) return;

    const mainCtx = mainCanvasRef.current.getContext('2d');
    
    const steps = 5; 
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
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, animate]);

  useEffect(() => {
    const ctx = mainCanvasRef.current.getContext('2d');
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawGuides(); // Initial draw on mount
  }, []);

  const handleClear = () => {
    const ctx = mainCanvasRef.current.getContext('2d');
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    angleRef.current = 0;
    drawGuides(); // Ensure guides are redrawn immediately
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.download = 'spirograph-art.png';
    link.href = mainCanvasRef.current.toDataURL();
    link.click();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-slate-800" style={{ backgroundColor: '#f0ede9' }}>
      
      <aside className="w-80 h-full border-r border-stone-300 bg-stone-50/50 backdrop-blur-md overflow-y-auto p-6 flex flex-col gap-8 shadow-xl z-10">
        <header>
          <h1 className="text-xl font-light tracking-widest uppercase text-stone-500">Spirograph Studio</h1>
          <div className="h-px w-12 bg-stone-400 mt-2"></div>
        </header>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-stone-400">
            <Settings2 size={16} />
            <h2 className="text-xs font-bold uppercase tracking-tighter">Mechanism</h2>
          </div>
          
          <div className="space-y-4">
            <ControlGroup label="Base Circle Size" value={outerRadius} min={50} max={350} onChange={setOuterRadius} />
            <ControlGroup label="Moving Circle Size" value={innerRadius} min={10} max={200} onChange={setInnerRadius} />
            
            <div className="flex flex-col gap-2">
              <label className="text-xs text-stone-500 uppercase">Track Type</label>
              <div className="flex p-1 bg-stone-200/50 rounded-md">
                <button 
                  onClick={() => setIsEpicycloid(false)}
                  className={`flex-1 py-1 text-xs rounded transition-all ${!isEpicycloid ? 'bg-white shadow-sm font-bold' : 'text-stone-500'}`}
                >Inside</button>
                <button 
                  onClick={() => setIsEpicycloid(true)}
                  className={`flex-1 py-1 text-xs rounded transition-all ${isEpicycloid ? 'bg-white shadow-sm font-bold' : 'text-stone-500'}`}
                >Outside</button>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-stone-400">
            <PenTool size={16} />
            <h2 className="text-xs font-bold uppercase tracking-tighter">Active Pens</h2>
          </div>
          {pens.map((pen, idx) => (
            <div key={pen.id} className={`p-3 rounded-lg border transition-all ${pen.active ? 'border-stone-300 bg-white' : 'border-transparent opacity-40'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-stone-500">Pen {idx + 1}</span>
                <input 
                  type="checkbox" 
                  checked={pen.active} 
                  className="accent-stone-500"
                  onChange={(e) => {
                    const newPens = [...pens];
                    newPens[idx].active = e.target.checked;
                    setPens(newPens);
                  }}
                />
              </div>
              {pen.active && (
                <div className="space-y-3">
                  <ControlGroup 
                    label="Position" 
                    value={pen.offset} 
                    min={0} max={2} step={0.01} 
                    onChange={(v) => {
                      const newPens = [...pens];
                      newPens[idx].offset = v;
                      setPens(newPens);
                    }} 
                  />
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase text-stone-400">Ink Color</label>
                    <input 
                      type="color" 
                      value={pen.color} 
                      className="w-6 h-6 cursor-pointer border-none bg-transparent"
                      onChange={(e) => {
                        const newPens = [...pens];
                        newPens[idx].color = e.target.value;
                        setPens(newPens);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>

        <section className="mt-auto border-t border-stone-200 pt-6">
          <button 
            onClick={() => setShowGuides(!showGuides)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${showGuides ? 'bg-stone-800 text-white' : 'bg-white border border-stone-300 text-stone-500'}`}
          >
            {showGuides ? <Eye size={16} /> : <EyeOff size={16} />}
            Guides {showGuides ? 'On' : 'Off'}
          </button>
        </section>
      </aside>

      <main className="flex-1 relative flex items-center justify-center p-8">
        <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white border-[12px] border-white">
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{ backgroundImage: `radial-gradient(${COLORS.grid} 1px, transparent 0)`, backgroundSize: '24px 24px' }}
          ></div>
          
          <canvas ref={mainCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="block" />
          <canvas ref={overlayCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="absolute top-0 left-0 pointer-events-none" />
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 bg-stone-900 text-white rounded-full shadow-2xl transition-all hover:scale-[1.02]">
          <button onClick={handleClear} className="p-2 hover:text-red-400 transition-colors" title="Reset Canvas">
            <Trash2 size={20} />
          </button>
          
          <div className="w-px h-6 bg-stone-700 mx-2"></div>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isPlaying ? 'bg-stone-700' : 'bg-white text-stone-900'}`}
          >
            {isPlaying ? <Pause fill="currentColor" /> : <Play className="ml-1" fill="currentColor" />}
          </button>

          <div className="w-px h-6 bg-stone-700 mx-2"></div>

          <button onClick={downloadImage} className="p-2 hover:text-brass transition-colors" title="Export Artwork">
            <Download size={20} />
          </button>
        </div>
      </main>
    </div>
  );
};

const ControlGroup = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between">
      <label className="text-[10px] uppercase tracking-widest text-stone-500">{label}</label>
      <span className="text-[10px] font-mono text-stone-400">{value}</span>
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step}
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-stone-500 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);

export default SpirographStudio;
