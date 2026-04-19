import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Trash2, Download } from 'lucide-react';

const CANVAS_SIZE = 800;

const COLORS = {
  paper: '#fdfaf5',
  graphite: '#1c1917',
  brass: '#92400e',
  guideMed: 'rgba(28, 25, 23, 0.2)',
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

const ControlGroup = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-[9px] font-bold uppercase text-stone-400">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-stone-800 h-1 bg-stone-300 appearance-none cursor-pointer"
    />
  </div>
);

export default function SpirographStudio() {
  const [outerRadius, setOuterRadius] = useState(250);
  const [innerRadius, setInnerRadius] = useState(105);
  const [isEpicycloid, setIsEpicycloid] = useState(false);
  const [speed, setSpeed] = useState(0.06);
  const [pens, setPens] = useState([
    { id: 1, offset: 0.7, color: '#1c1917', active: true, width: 1.5 },
    { id: 2, offset: 0.4, color: '#44403c', active: false, width: 1.0 },
    { id: 3, offset: 0.9, color: '#92400e', active: false, width: 1.0 },
  ]);
  const [showGuides, setShowGuides] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const mainCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const requestRef = useRef(null);
  const angleRef = useRef(0);

  const getMainCtx = () => mainCanvasRef.current?.getContext('2d') ?? null;
  const getOverlayCtx = () => overlayCanvasRef.current?.getContext('2d') ?? null;

  const clearMainCanvas = useCallback(() => {
    const ctx = getMainCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }, []);

  const getTargetAngle = useCallback(() => {
    const r1 = Math.round(outerRadius);
    const r2 = Math.round(innerRadius);

    if (r1 <= 0 || r2 <= 0) return 0;

    const common = gcd(r1, r2);
    const circuits = r2 / common;
    return circuits * Math.PI * 2;
  }, [outerRadius, innerRadius]);

  const drawGuides = useCallback(() => {
    const overlayCtx = getOverlayCtx();
    if (!overlayCtx) return;

    overlayCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (!showGuides) return;

    const target = getTargetAngle();
    if (angleRef.current >= target && !isPlaying) return;

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const angle = angleRef.current;

    const d = isEpicycloid
      ? outerRadius + innerRadius
      : outerRadius - innerRadius;

    const cx = centerX + d * Math.cos(angle);
    const cy = centerY + d * Math.sin(angle);

    const rotation = isEpicycloid
      ? angle * (outerRadius / innerRadius)
      : -(angle * (outerRadius / innerRadius));

    overlayCtx.lineWidth = 1;

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

    overlayCtx.strokeStyle = COLORS.brass;
    overlayCtx.lineWidth = 1;

    for (let i = 0; i < 4; i++) {
      const sAngle = rotation + (i * Math.PI / 2);
      overlayCtx.beginPath();
      overlayCtx.moveTo(cx, cy);
      overlayCtx.lineTo(
        cx + innerRadius * Math.cos(sAngle),
        cy + innerRadius * Math.sin(sAngle)
      );
      overlayCtx.stroke();
    }
  }, [showGuides, isPlaying, outerRadius, innerRadius, isEpicycloid, getTargetAngle]);

  const animate = useCallback(() => {
    if (!isPlaying) return;

    const mainCtx = getMainCtx();
    if (!mainCtx) return;

    const target = getTargetAngle();

    if (angleRef.current >= target) {
      setIsPlaying(false);
      drawGuides();
      return;
    }

    const steps = 15;

    for (let s = 0; s < steps; s++) {
      if (angleRef.current >= target) break;

      const prevAngle = angleRef.current;
      angleRef.current += speed / steps;

      const d = isEpicycloid
        ? outerRadius + innerRadius
        : outerRadius - innerRadius;

      pens.forEach((pen) => {
        if (!pen.active) return;

        const getPos = (a) => {
          const rot = isEpicycloid
            ? a * (outerRadius / innerRadius)
            : -(a * (outerRadius / innerRadius));

          return {
            x:
              CANVAS_SIZE / 2 +
              d * Math.cos(a) +
              innerRadius * pen.offset * Math.cos(rot),
            y:
              CANVAS_SIZE / 2 +
              d * Math.sin(a) +
              innerRadius * pen.offset * Math.sin(rot),
          };
        };

        const p1 = getPos(prevAngle);
        const p2 = getPos(angleRef.current);

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
  }, [
    isPlaying,
    outerRadius,
    innerRadius,
    isEpicycloid,
    speed,
    pens,
    drawGuides,
    getTargetAngle,
  ]);

  useEffect(() => {
    clearMainCanvas();
    drawGuides();
  }, [clearMainCanvas, drawGuides]);

  useEffect(() => {
    if (!isPlaying) return;

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);

  const resetDrawing = () => {
    angleRef.current = 0;
    setIsPlaying(false);
    clearMainCanvas();
    drawGuides();
  };

  const downloadPNG = () => {
    if (!mainCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'math-spiro.png';
    link.href = mainCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex h-screen w-full bg-stone-200 font-sans text-stone-900 overflow-hidden">
      <aside className="w-80 h-full bg-stone-100 border-r border-stone-400 p-6 flex flex-col gap-8 overflow-y-auto">
        <h1 className="text-xl font-bold uppercase tracking-tighter">Spiro.Math</h1>

        <section className="space-y-6">
          <ControlGroup
            label="Fixed R"
            value={outerRadius}
            min={10}
            max={380}
            onChange={setOuterRadius}
          />
          <ControlGroup
            label="Moving r"
            value={innerRadius}
            min={5}
            max={380}
            onChange={setInnerRadius}
          />
          <ControlGroup
            label="Speed"
            value={speed}
            min={0.01}
            max={0.2}
            step={0.01}
            onChange={setSpeed}
          />

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase text-stone-500">Placement</span>
            <div className="flex bg-stone-300 p-1 rounded-md">
              <button
                onClick={() => setIsEpicycloid(false)}
                className={`flex-1 py-1.5 text-xs rounded ${!isEpicycloid ? 'bg-white shadow' : ''}`}
              >
                Inside
              </button>
              <button
                onClick={() => setIsEpicycloid(true)}
                className={`flex-1 py-1.5 text-xs rounded ${isEpicycloid ? 'bg-white shadow' : ''}`}
              >
                Outside
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <span className="text-[10px] font-bold uppercase text-stone-500">Probe Configuration</span>

          {pens.map((pen, idx) => (
            <div
              key={pen.id}
              className={`p-4 rounded-lg border ${pen.active ? 'bg-white border-stone-400' : 'opacity-40'}`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold">Pen {idx + 1}</span>
                <input
                  type="checkbox"
                  checked={pen.active}
                  onChange={(e) => {
                    const next = [...pens];
                    next[idx].active = e.target.checked;
                    setPens(next);
                  }}
                />
              </div>

              {pen.active && (
                <div className="space-y-4">
                  <ControlGroup
                    label="Offset"
                    value={pen.offset}
                    min={0}
                    max={3}
                    step={0.01}
                    onChange={(v) => {
                      const next = [...pens];
                      next[idx].offset = v;
                      setPens(next);
                    }}
                  />
                  <ControlGroup
                    label="Thickness"
                    value={pen.width}
                    min={0.1}
                    max={10}
                    step={0.1}
                    onChange={(v) => {
                      const next = [...pens];
                      next[idx].width = v;
                      setPens(next);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </section>

        <button
          onClick={() => setShowGuides(!showGuides)}
          className="mt-auto py-3 bg-stone-800 text-white text-xs font-bold uppercase rounded-md tracking-widest"
        >
          {showGuides ? 'Hide Mechanics' : 'Show Mechanics'}
        </button>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center p-12 min-w-0">
        <div className="relative bg-white shadow-2xl border-8 border-white max-w-full max-h-full">
          <canvas
            ref={mainCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="block w-[min(80vw,800px)] h-[min(80vw,800px)]"
          />
          <canvas
            ref={overlayCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="absolute top-0 left-0 pointer-events-none block w-[min(80vw,800px)] h-[min(80vw,800px)]"
          />
        </div>

        <div className="mt-8 flex items-center gap-8 bg-stone-900 px-6 py-3 rounded-full text-white">
          <button onClick={resetDrawing}>
            <Trash2 size={20} />
          </button>

          <button
            onClick={() => setIsPlaying((v) => !v)}
            className="w-12 h-12 bg-white text-stone-900 rounded-full flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} className="ml-1" fill="currentColor" />
            )}
          </button>

          <button onClick={downloadPNG}>
            <Download size={20} />
          </button>
        </div>
      </main>
    </div>
  );
}
