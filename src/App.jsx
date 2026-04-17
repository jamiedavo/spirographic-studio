// Updated drawGuides function to show the "Physics" of the gears
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

  // 1. THE BIG CIRCLE (The Track)
  overlayCtx.beginPath();
  overlayCtx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
  overlayCtx.strokeStyle = '#475569'; // Dark slate color
  overlayCtx.lineWidth = 8;           // Very thick so Finley can see it
  overlayCtx.stroke();
  
  // Add a subtle "inner groove" to the track
  overlayCtx.beginPath();
  overlayCtx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
  overlayCtx.strokeStyle = 'rgba(255,255,255,0.5)';
  overlayCtx.lineWidth = 2;
  overlayCtx.stroke();

  // 2. THE SMALL CIRCLE (The Gear)
  // Draw the main gear body
  overlayCtx.beginPath();
  overlayCtx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  overlayCtx.fillStyle = 'rgba(245, 158, 11, 0.2)'; // Fills the gear with light gold
  overlayCtx.fill();
  overlayCtx.strokeStyle = '#f59e0b'; // Bold Gold
  overlayCtx.lineWidth = 5;
  overlayCtx.stroke();

  // Add "Spokes" to the gear so you can see it ROTATING
  for (let i = 0; i < 4; i++) {
    const spokeAngle = rotation + (i * Math.PI / 2);
    overlayCtx.beginPath();
    overlayCtx.moveTo(cx, cy);
    overlayCtx.lineTo(
      cx + innerRadius * Math.cos(spokeAngle), 
      cy + innerRadius * Math.sin(spokeAngle)
    );
    overlayCtx.strokeStyle = '#f59e0b';
    overlayCtx.lineWidth = 2;
    overlayCtx.stroke();
  }

  // 3. THE CENTER HUB (The "Pivot Point")
  overlayCtx.beginPath();
  overlayCtx.arc(cx, cy, 4, 0, Math.PI * 2);
  overlayCtx.fillStyle = '#f59e0b';
  overlayCtx.fill();

  // 4. THE PEN ARM (Connecting the gear to the drawing point)
  overlayCtx.beginPath();
  overlayCtx.moveTo(cx, cy);
  overlayCtx.lineTo(
    cx + (innerRadius * pens[0].offset) * Math.cos(rotation), 
    cy + (innerRadius * pens[0].offset) * Math.sin(rotation)
  );
  overlayCtx.strokeStyle = '#000';
  overlayCtx.setLineDash([2, 2]);
  overlayCtx.lineWidth = 1;
  overlayCtx.stroke();
  overlayCtx.setLineDash([]);
}, [showGuides, outerRadius, innerRadius, isEpicycloid, getTargetAngle, pens]);
