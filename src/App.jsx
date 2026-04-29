import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Trash2, Download, 
  EyeOff, Eye, Settings2, PenTool, 
  Sparkles, ChevronRight, Bookmark, RotateCcw,
  RotateCw, Plus, Minus
} from 'lucide-react';

const CANVAS_SIZE = 1200;
const CENTER = CANVAS_SIZE / 2;

const BG_THEMES = [
  { id: 'blueprint', name: 'Blueprint', bg: '#0f172a', grid: true, gridColor: 'rgba(255,255,255,0.07)', spacing: 40 },
  { id: 'dark',      name: 'Dark Studio', bg: '#171717', grid: true, gridColor: 'rgba(255,255,255,0.03)', spacing: 40 },
  { id: 'midnight',  name: 'Midnight Void', bg: '#020205', grid: false },
  { id: 'paper',     name: 'Drafting Paper', bg: '#fdfaf5', grid: false },
];

const BLEND_MODES = [
  { id: 'source-over', label: 'Normal' },
  { id: 'screen',      label: 'Screen' },
  { id: 'lighter',     label: 'Glow'   },
  { id: 'overlay',     label: 'Overlay'},
  { id: 'multiply',    label: 'Burn'   },
];

// Symmetry options: number of rotational folds
const SYMMETRY_OPTIONS = [1, 2, 3, 4, 6, 8];

const PRESETS = [
  {
    name: "Stellar Bloom",
    config: {
      outer: 300, inner: 180, satellite: 60, isEpi: false, symmetry: 6,
      pens: [
        { offset: 0.9, color: '#fcd34d', active: true, width: 1.5, rainbow: false, phase: 0,   opacity: 0.9, blendMode: 'screen',       attachment: 'satellite' },
        { offset: 1.2, color: '#f472b6', active: true, width: 1.0, rainbow: false, phase: 120, opacity: 0.7, blendMode: 'screen',       attachment: 'satellite' },
        { offset: 0.6, color: '#818cf8', active: true, width: 1.0, rainbow: false, phase: 240, opacity: 0.6, blendMode: 'lighter',      attachment: 'rotor'     },
      ]
    }
  },
  {
    name: "Atomic Orbit",
    config: {
      outer: 240, inner: 235, satellite: 40, isEpi: true, symmetry: 1,
      pens: [
        { offset: 2.5, color: '#60a5fa', active: true, width: 2.0, rainbow: false, phase: 0,  opacity: 1.0, blendMode: 'source-over', attachment: 'satellite' },
        { offset: 0.5, color: '#34d399', active: true, width: 1.0, rainbow: false, phase: 60, opacity: 0.8, blendMode: 'screen',       attachment: 'rotor'     },
      ]
    }
  },
  {
    name: "Chaos Rose",
    config: {
      outer: 380, inner: 112, satellite: 95, isEpi: false, symmetry: 1,
      pens: [
        { offset: 0.8, color: '#ffffff', active: true, width: 1.0, rainbow: true,  phase: 0,   opacity: 0.85, blendMode: 'screen',  attachment: 'satellite' },
        { offset: 1.5, color: '#a855f7', active: true, width: 0.5, rainbow: false, phase: 180, opacity: 0.6,  blendMode: 'lighter', attachment: 'rotor'     },
      ]
    }
  },
  {
    name: "Neon Mandala",
    config: {
      outer: 300, inner: 60, satellite: 30, isEpi: false, symmetry: 8,
      pens: [
        { offset: 1.5, color: '#a855f7', active: true, width: 2.0, rainbow: false, phase: 0,  opacity: 1.0, blendMode: 'screen',  attachment: 'satellite' },
        { offset: 0.8, color: '#22d3ee', active: true, width: 1.0, rainbow: false, phase: 45, opacity: 0.8, blendMode: 'lighter', attachment: 'satellite' },
      ]
    }
  },
  {
    name: "Dual Orbit",
    config: {
      outer: 350, inner: 150, satellite: 70, isEpi: false, symmetry: 3,
      pens: [
        { offset: 1.0, color: '#f97316', active: true, width: 2.0, rainbow: false, phase: 0,   opacity: 0.9, blendMode: 'source-over', attachment: 'satellite' },
        { offset: 0.6, color: '#0ea5e9', active: true, width: 1.5, rainbow: false, phase: 0,   opacity: 0.9, blendMode: 'screen',       attachment: 'rotor'     },
        { offset: 0.3, color: '#10b981', active: true, width: 1.0, rainbow: true,  phase: 180, opacity: 0.7, blendMode: 'lighter',      attachment: 'satellite' },
      ]
    }
  },
];

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

const ControlGroup = ({ label, value, min, max, step = 1, onChange, unit = "" }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
      <span>{label}</span>
      <span className="text-neutral-200">{typeof value === 'number' && step < 1 ? value.toFixed(2) : value}{unit}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
    />
  </div>
);

const DEFAULT_PEN = (id, color = '#60a5fa', phase = 0) => ({
  id,
  offset: 0.8,
  color,
  active: true,
  width: 1.5,
  rainbow: false,
  phase,           // 0–360° — shifts start angle so pens trace genuinely different paths
  opacity: 0.9,    // 0.1–1.0
  blendMode: 'source-over',
  attachment: 'satellite', // 'satellite' | 'rotor' — two distinct gear-path levels
});

const PEN_COLORS = ['#60a5fa','#f472b6','#34d399','#a855f7','#f97316','#eab308'];

export default function App() {
  // Gear state
  const [outerRadius,    setOuterRadius]    = useState(300);
  const [innerRadius,    setInnerRadius]    = useState(125);
  const [satelliteRadius,setSatelliteRadius]= useState(50);
  const [isEpicycloid,   setIsEpicycloid]   = useState(false);
  const [speed,          setSpeed]          = useState(0.08);
  const [symmetry,       setSymmetry]       = useState(1);

  // UI state
  const [activePanel, setActivePanel] = useState('gears');
  const [themeId,     setThemeId]     = useState('blueprint');
  const activeTheme = BG_THEMES.find(t => t.id === themeId);

  // Pen state
  const [pens, setPens] = useState([
    DEFAULT_PEN(1, '#60a5fa', 0),
    { ...DEFAULT_PEN(2, '#f472b6', 0), active: false },
    { ...DEFAULT_PEN(3, '#34d399', 0), active: false },
  ]);
  const nextId = useRef(4);

  const [showGuides, setShowGuides] = useState(true);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [progress,   setProgress]   = useState(0);

  const mainCanvasRef    = useRef(null);
  const overlayCanvasRef = useRef(null);
  const requestRef       = useRef(null);
  const angleRef         = useRef(0);

  // ─── Math helpers ───────────────────────────────────────────────

  const MAX_DRAW_ROTATIONS = 30;

const getTargetAngle = useCallback(() => {
  const r1 = Math.round(outerRadius);
  const r2 = Math.round(innerRadius);
  const r3 = Math.round(satelliteRadius);

  const common = gcd(r1, gcd(r2, r3)) || 1;
  const mathematicalTarget = (r2 * r3 / common) * Math.PI * 0.5;
  const visualTarget = Math.PI * 2 * MAX_DRAW_ROTATIONS;

  return Math.min(mathematicalTarget, visualTarget);
}, [outerRadius, innerRadius, satelliteRadius]);

  // Returns gear hub positions for a given drive angle
  const getGearPositions = useCallback((angle) => {
    const d1 = isEpicycloid ? outerRadius + innerRadius : outerRadius - innerRadius;
    const rotorX = CENTER + d1 * Math.cos(angle);
    const rotorY = CENTER + d1 * Math.sin(angle);
    const rotorRot = isEpicycloid ? angle * (outerRadius / innerRadius) : -(angle * (outerRadius / innerRadius));
    const d2 = innerRadius - satelliteRadius;
    const satX = rotorX + d2 * Math.cos(rotorRot);
    const satY = rotorY + d2 * Math.sin(rotorRot);
    const satRot = rotorRot * (innerRadius / satelliteRadius);
    return { rotorX, rotorY, rotorRot, satX, satY, satRot };
  }, [outerRadius, innerRadius, satelliteRadius, isEpicycloid]);

  // Returns the x,y tip of a specific pen at a given drive angle
  // Phase shifts the effective angle so each pen draws a distinct curve
  const getPenPosition = useCallback((angle, pen) => {
    const effectiveAngle = angle + ((pen.phase || 0) * Math.PI / 180);
    const { rotorX, rotorY, rotorRot, satX, satY, satRot } = getGearPositions(effectiveAngle);
    if (pen.attachment === 'rotor') {
      return {
        x: rotorX + innerRadius * pen.offset * Math.cos(rotorRot),
        y: rotorY + innerRadius * pen.offset * Math.sin(rotorRot),
      };
    }
    return {
      x: satX + satelliteRadius * pen.offset * Math.cos(satRot),
      y: satY + satelliteRadius * pen.offset * Math.sin(satRot),
    };
  }, [getGearPositions, innerRadius, satelliteRadius]);

  // Draws one line segment, repeated `symmetry` times by rotating around CENTER
  const drawSymLine = useCallback((ctx, x1, y1, x2, y2) => {
    for (let i = 0; i < symmetry; i++) {
      const a = (i / symmetry) * Math.PI * 2;
      ctx.save();
      ctx.translate(CENTER, CENTER);
      ctx.rotate(a);
      ctx.translate(-CENTER, -CENTER);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }
  }, [symmetry]);

  // ─── Guide overlay ──────────────────────────────────────────────

  const drawGuides = useCallback(() => {
    const ctx = overlayCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (!showGuides) return;

    const { rotorX, rotorY, satX, satY } = getGearPositions(angleRef.current);
    const gearCol = activeTheme.id === 'paper' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';

    ctx.strokeStyle = gearCol;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    [[CENTER, CENTER, outerRadius], [rotorX, rotorY, innerRadius], [satX, satY, satelliteRadius]].forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.setLineDash([]);

    pens.forEach(pen => {
      if (!pen.active) return;
      const pp = getPenPosition(angleRef.current, pen);
      const ax = pen.attachment === 'rotor' ? rotorX : satX;
      const ay = pen.attachment === 'rotor' ? rotorY : satY;
      const hue = (angleRef.current * 50) % 360;
      ctx.strokeStyle = pen.rainbow ? `hsla(${hue},70%,60%,0.4)` : pen.color + '66';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(pp.x, pp.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = pen.rainbow ? `hsl(${hue},70%,60%)` : pen.color;
      ctx.fill();
    });
  }, [showGuides, outerRadius, innerRadius, satelliteRadius, pens, activeTheme, getGearPositions, getPenPosition]);

  useEffect(() => {
  drawGuides();
}, [drawGuides]);

  // ─── Animation ──────────────────────────────────────────────────

  const animate = useCallback(() => {
    if (!isPlaying) return;
    const ctx = mainCanvasRef.current?.getContext('2d');
    const target = getTargetAngle();

    if (angleRef.current >= target) {
      setIsPlaying(false); setProgress(100); drawGuides(); return;
    }

    const steps = 40;
    for (let s = 0; s < steps; s++) {
      if (angleRef.current >= target) break;
      const prev = angleRef.current;
      angleRef.current += speed / steps;

      pens.forEach(pen => {
        if (!pen.active) return;
        const p1 = getPenPosition(prev, pen);
        const p2 = getPenPosition(angleRef.current, pen);

        ctx.globalCompositeOperation = pen.blendMode || 'source-over';
        ctx.globalAlpha   = pen.opacity ?? 1;
        ctx.lineWidth     = pen.width;
        ctx.lineCap       = 'round';
        ctx.strokeStyle   = pen.rainbow
          ? `hsl(${(angleRef.current * 60) % 360},80%,60%)`
          : pen.color;

        drawSymLine(ctx, p1.x, p1.y, p2.x, p2.y);
      });

      // Reset blend state after each batch
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    setProgress((angleRef.current / target) * 100);
    drawGuides();
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, speed, pens, drawGuides, getTargetAngle, getPenPosition, drawSymLine]);

  useEffect(() => {
    if (isPlaying) requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, animate]);

  // ─── Actions ────────────────────────────────────────────────────

  const clearCanvas = useCallback(() => {
    const ctx = mainCanvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    angleRef.current = 0; setProgress(0); drawGuides();
  }, [drawGuides]);

  const loadPreset = (preset) => {
    const ctx = mainCanvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    angleRef.current = 0; setProgress(0); setIsPlaying(false);
    setOuterRadius(preset.config.outer);
    setInnerRadius(preset.config.inner);
    setSatelliteRadius(preset.config.satellite);
    setIsEpicycloid(preset.config.isEpi);
    setSymmetry(preset.config.symmetry ?? 1);
    // Rebuild pen list to match preset
    const newPens = preset.config.pens.map((cfg, i) => ({
      ...DEFAULT_PEN(i + 1, cfg.color, cfg.phase),
      ...cfg,
      id: i + 1,
    }));
    nextId.current = newPens.length + 1;
    setPens(newPens);
  };

  const addPen = () => {
    if (pens.length >= 6) return;
    const id    = nextId.current++;
    const color = PEN_COLORS[(id - 1) % PEN_COLORS.length];
    const phase = (pens.length * 60) % 360;
    setPens(prev => [...prev, DEFAULT_PEN(id, color, phase)]);
  };

  const removePen = (id) => {
    if (pens.length <= 1) return;
    setPens(prev => prev.filter(p => p.id !== id));
  };

  const updatePen = (id, updates) =>
    setPens(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

  const downloadPNG = () => {
    const exp = document.createElement('canvas');
    exp.width = exp.height = CANVAS_SIZE;
    const ctx = exp.getContext('2d');
    ctx.fillStyle = activeTheme.bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(mainCanvasRef.current, 0, 0);
    const a = document.createElement('a');
    a.download = `Spirograph-${Date.now()}.png`;
    a.href = exp.toDataURL('image/png');
    a.click();
  };

  // ─── Render ─────────────────────────────────────────────────────

  const NAV_TABS = [
    ['gears',   'Gears',   RotateCw],
    ['pens',    'Pens',    PenTool ],
    ['presets', 'Vault',   Bookmark],
  ];

  return (
    <div className="flex h-[100dvh] w-full bg-neutral-950 text-neutral-200 overflow-hidden font-sans flex-col md:flex-row">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="order-2 md:order-1 w-full md:w-80 h-[46dvh] md:h-full bg-neutral-900 border-t md:border-t-0 md:border-r border-white/5 flex flex-col z-20 shadow-2xl shrink-0">

        <div className="px-5 py-3 md:p-6 border-b border-white/5 flex items-center justify-between">
          <h1 className="text-xs font-black tracking-[0.2em] text-white flex items-center gap-2">
            <Settings2 size={16} className="text-indigo-400" />
            ENGINE<span className="text-neutral-600">.V4</span>
          </h1>
        </div>

        <div className="flex border-b border-white/5">
          {NAV_TABS.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setActivePanel(id)}
              className={`flex-1 py-2.5 md:py-3 text-[10px] font-bold uppercase transition-colors flex flex-col items-center gap-1 ${activePanel === id ? 'text-indigo-400' : 'text-neutral-500'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 md:p-6 space-y-5 md:space-y-6 scrollbar-hide">

          {/* ── GEARS panel ── */}
          {activePanel === 'gears' && (
            <div className="space-y-5 md:space-y-6">
              <div className="flex bg-black/40 p-1 rounded-lg">
                <button onClick={() => setIsEpicycloid(false)}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded ${!isEpicycloid ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}>Hypo</button>
                <button onClick={() => setIsEpicycloid(true)}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded ${isEpicycloid ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}>Epi</button>
              </div>

              <ControlGroup label="Main Stator"  value={outerRadius}     min={50}  max={450} onChange={setOuterRadius} />
              <ControlGroup label="Inner Rotor"  value={innerRadius}     min={10}  max={450} onChange={setInnerRadius} />
              <ControlGroup label="Satellite"    value={satelliteRadius} min={5}   max={300} onChange={setSatelliteRadius} />
              <ControlGroup label="Motor Speed"  value={speed}           min={0.01} max={0.5} step={0.01} onChange={setSpeed} />

              {/* Symmetry folds */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Symmetry Folds</div>
                <div className="flex gap-1">
                  {SYMMETRY_OPTIONS.map(n => (
                    <button key={n} onClick={() => setSymmetry(n)}
                      className={`flex-1 py-2 text-[10px] font-black rounded transition-all ${symmetry === n ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}>
                      {n === 1 ? '×1' : `${n}×`}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-neutral-600 leading-relaxed">
                  ×1 off · ×4 quad · ×8 mandala — rotates every stroke around the canvas centre
                </p>
              </div>
            </div>
          )}

          {/* ── PENS panel ── */}
          {activePanel === 'pens' && (
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex gap-3 text-[9px] text-neutral-500 bg-black/30 rounded-lg p-2.5 leading-relaxed">
                <span>🔵 <b className="text-neutral-300">Satellite</b> = deep gear path</span>
                <span>🟣 <b className="text-neutral-300">Rotor</b> = outer gear path</span>
              </div>

              {pens.map((pen, idx) => (
                <div key={pen.id}
                  className={`p-4 rounded-xl border transition-all ${pen.active ? 'bg-white/5 border-white/10 shadow-lg' : 'opacity-30 border-transparent'}`}>

                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                        style={{ background: pen.color, boxShadow: `0 0 8px ${pen.color}80` }} />
                      <span className="text-[10px] font-bold uppercase text-indigo-400">Head {idx + 1}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${pen.attachment === 'rotor' ? 'bg-violet-900/50 text-violet-300' : 'bg-blue-900/50 text-blue-300'}`}>
                        {pen.attachment || 'satellite'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pens.length > 1 && (
                        <button onClick={() => removePen(pen.id)}
                          className="text-neutral-600 hover:text-rose-400 transition-colors"><Minus size={11} /></button>
                      )}
                      <input type="checkbox" checked={pen.active}
                        onChange={e => updatePen(pen.id, { active: e.target.checked })}
                        className="w-4 h-4 rounded bg-neutral-800 accent-indigo-500" />
                    </div>
                  </div>

                  {pen.active && (
                    <div className="space-y-3">

                      {/* Gear attachment tier */}
                      <div>
                        <div className="text-[9px] uppercase font-bold text-neutral-500 mb-1">Gear Path</div>
                        <div className="flex bg-black/40 p-0.5 rounded-lg">
                          {['satellite','rotor'].map(tier => (
                            <button key={tier} onClick={() => updatePen(pen.id, { attachment: tier })}
                              className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded transition-all ${(pen.attachment || 'satellite') === tier ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                              {tier}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Blend mode */}
                      <div>
                        <div className="text-[9px] uppercase font-bold text-neutral-500 mb-1">Blend Mode</div>
                        <div className="flex gap-1 flex-wrap">
                          {BLEND_MODES.map(bm => (
                            <button key={bm.id} onClick={() => updatePen(pen.id, { blendMode: bm.id })}
                              className={`px-2 py-1 text-[8px] font-bold uppercase rounded transition-all ${pen.blendMode === bm.id ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-500 hover:text-white'}`}>
                              {bm.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Rainbow / colour */}
                      <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                        <span className="text-[9px] uppercase font-bold text-neutral-500">Rainbow Ink</span>
                        <button onClick={() => updatePen(pen.id, { rainbow: !pen.rainbow })}
                          className={`p-1 rounded ${pen.rainbow ? 'bg-indigo-500 text-white' : 'bg-neutral-800 text-neutral-500'}`}>
                          <Sparkles size={12} />
                        </button>
                      </div>
                      {!pen.rainbow && (
                        <input type="color" value={pen.color}
                          onChange={e => updatePen(pen.id, { color: e.target.value })}
                          className="w-full h-5 rounded overflow-hidden bg-transparent border-0 cursor-pointer" />
                      )}

                      <ControlGroup label="Arm Offset"   value={pen.offset}        min={0.1} max={4}   step={0.05} onChange={v => updatePen(pen.id, { offset: v })} />
                      <ControlGroup label="Phase Offset" value={pen.phase ?? 0}    min={0}   max={360} step={1}    onChange={v => updatePen(pen.id, { phase: v })}  unit="°" />
                      <ControlGroup label="Opacity"      value={pen.opacity ?? 1}  min={0.1} max={1}   step={0.05} onChange={v => updatePen(pen.id, { opacity: v })} />
                      <ControlGroup label="Line Width"   value={pen.width}         min={0.5} max={5}   step={0.5}  onChange={v => updatePen(pen.id, { width: v })}  unit="px" />
                    </div>
                  )}
                </div>
              ))}

              {pens.length < 6 && (
                <button onClick={addPen}
                  className="w-full py-2.5 border border-dashed border-white/10 rounded-xl text-neutral-500 hover:text-white hover:border-indigo-500/60 transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase">
                  <Plus size={12} /> Add Pen Head
                </button>
              )}
            </div>
          )}

          {/* ── PRESETS panel ── */}
          {activePanel === 'presets' && (
            <div className="space-y-2">
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => loadPreset(p)}
                  className="w-full p-3 bg-neutral-800/50 hover:bg-neutral-800 border border-white/5 rounded-lg text-left transition-all group flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide">{p.name}</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">
                      {p.config.pens.filter(p => p.active).length} pens · {p.config.symmetry ?? 1}× sym
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {p.config.pens.filter(pen => pen.active).map((pen, i) => (
                        <div key={i} className="w-2 h-2 rounded-full" style={{ background: pen.color }} />
                      ))}
                    </div>
                    <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="p-4 md:p-6 bg-black/20 border-t border-white/5 space-y-2">
          <button onClick={() => setIsPlaying(!isPlaying)}
            className={`w-full py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${isPlaying ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-indigo-600 text-white shadow-xl hover:bg-indigo-500'}`}>
            {isPlaying ? 'PAUSE' : 'ENGAGE'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={clearCanvas}
              className="p-3 bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-400 hover:text-rose-400 transition-colors">
              <Trash2 size={16} />
            </button>
            <button onClick={() => { angleRef.current = 0; setProgress(0); drawGuides(); }}
              className="p-3 bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Canvas area ─────────────────────────────────────────── */}
      <main className="order-1 md:order-2 flex-1 min-h-0 relative flex flex-col items-center justify-center p-4 md:p-8"
        style={{ backgroundColor: activeTheme.bg }}>

        {activeTheme.grid && (
          <div className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: `linear-gradient(${activeTheme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${activeTheme.gridColor} 1px, transparent 1px)`,
              backgroundSize: `${activeTheme.spacing}px ${activeTheme.spacing}px`,
            }} />
        )}

        {/* Top-right toolbar */}
        <div className="absolute top-3 right-3 left-3 md:top-8 md:right-8 md:left-auto flex items-center justify-end gap-2 md:gap-4 z-10 scale-90 md:scale-100 origin-top-right">
          <div className="flex bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-2xl">
            {BG_THEMES.map(t => (
              <button key={t.id} onClick={() => setThemeId(t.id)}
                className={`w-7 h-7 md:w-8 md:h-8 rounded-full transition-all ${themeId === t.id ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2 ring-offset-neutral-900' : 'opacity-40 hover:opacity-100'}`}
                style={{ background: t.bg }} />
            ))}
          </div>
          <button onClick={() => setShowGuides(!showGuides)}
            className="p-2 md:p-2.5 bg-neutral-900 border border-white/10 rounded-full text-white hover:bg-neutral-800 shadow-xl">
            {showGuides ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button onClick={downloadPNG}
            className="bg-white text-black px-3 md:px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
            Export
          </button>
        </div>

        {/* Canvas stack */}
        <div className="relative w-[min(92vw,48dvh)] md:w-full md:max-w-[85vh] aspect-square">
          <canvas ref={mainCanvasRef}    width={CANVAS_SIZE} height={CANVAS_SIZE}
            className="absolute inset-0 w-full h-full drop-shadow-[0_0_80px_rgba(0,0,0,0.6)]" />
          <canvas ref={overlayCanvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE}
            className="absolute inset-0 w-full h-full pointer-events-none" />
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-3 left-4 right-4 md:bottom-12 md:left-auto md:right-auto md:w-80 flex flex-col gap-2">
          <div className="flex justify-between text-[8px] font-black uppercase text-neutral-500 tracking-tighter">
            <span>Sequence Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
      </main>
    </div>
  );
}
