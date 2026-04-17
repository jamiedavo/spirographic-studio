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
    { id: 1, offset: 0.8, color: '#ef4444', active: true, width: 1.5 }, 
    { id: 2, offset: 0.5, color: '#3b82f6', active: true, width: 1.0 }, 
    { id: 3, offset: 0.3, color: '#10b981', active: false, width: 0.8 }, 
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
    
    const rotation = isEpicycloid ? (angle * (outerRadius / innerRadius)) : -(angle * (outerRadius / innerRadius));

    overlayCtx.beginPath();
    overlayCtx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    overlayCtx.strokeStyle = COLORS.track;
    overlayCtx.lineWidth = 2;
    overlayCtx.stroke();

    overlayCtx.beginPath();
    overlayCtx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    overlayCtx.strokeStyle = COLORS.gear;
    overlayCtx.lineWidth = 3;
    overlayCtx.stroke();

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
    <div className="flex flex-col lg:flex-row h-screen w-full bg-blue-50 overflow-hidden font-sans">
      {/* Settings - Reduced height on mobile */}
      <aside className="w-full lg:w-80 h-[250px] lg:h-full bg-white border-b-4 lg:border-b-0 lg:border-r-4 border-yellow-400 shadow-2xl p-4 lg:p-6 flex flex-col gap-4 lg:gap-6 z-10 overflow-y-auto">
        <header className="bg-yellow-400 -m-4 lg:-m-6 mb-2 p-4 lg:p-6">
          <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2">
            <Infinity size={24} strokeWidth={3} /> Finley's Studio
          </h1>
        </header>

        <section className="space-y-3">
          <h2 className="text-blue-500 font-black text-[9px] uppercase tracking-widest">Settings</h2>
          <ControlGroup label="Big Circle" value={outerRadius} min={10} max={380} color="bg-red-400" onChange={setOuterRadius} />
          <ControlGroup label="Small Gear" value={innerRadius} min={5} max={380} color="bg-blue-400" onChange={setInnerRadius} />
          <ControlGroup label="Speed" value={speed} min={0.01} max={1.5} step={0.01} color="bg-green-400" onChange={setSpeed} />
        </section>

        <section className="space-y-3">
          <h2 className="text-blue-500 font-black text-[9px] uppercase tracking-widest">Pens</h2>
          {pens.map((pen, idx) => (
            <div key={pen.id} className={`p-2 lg:p-3 rounded-xl border-2 lg:border-4 transition-all ${pen.active ? 'bg-white border-yellow-400 shadow-sm' : 'opacity-40 border-slate-100'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-black text-slate-700 text-[10px]">PEN {idx + 1}</span>
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
                  {/* Capped pen width for crisp lines */}
                  <ControlGroup label="Fatness" value={pen.width} min={0.1} max={6} step={0.1} color="bg-slate-300" onChange={(v) => {
                    const n = [...pens]; n[idx].width = v; setPens(n);
                  }} />
                  <input type="color" value={pen.color} className="w-full h-6 rounded-lg cursor-pointer border border-slate-200" onChange={(e) => {
                    const n = [...pens]; n[idx].color = e.target.value; setPens(n);
