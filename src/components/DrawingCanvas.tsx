import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DrawStroke, NormalizedPoint } from '../types/game';
import { Eraser, Trash2, Undo, Lock, Palette } from 'lucide-react';

interface DrawingCanvasProps {
  isDrawer: boolean;
  strokes: DrawStroke[];
  onAddStroke?: (stroke: DrawStroke) => void;
  onClearCanvas?: () => void;
  drawerName?: string;
  secretWord?: string;
  isHost?: boolean;
}

const PRESET_COLORS = [
  '#000000', // Black
  '#dc2626', // Red
  '#2563eb', // Blue
  '#16a34a', // Green
  '#ca8a04', // Amber/Yellow
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#db2777', // Pink
  '#78716c', // Stone
  '#0891b2', // Cyan
];

const STROKE_WIDTHS = [2, 4, 8, 14];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isDrawer,
  strokes,
  onAddStroke,
  onClearCanvas,
  drawerName,
  secretWord,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedColor, setSelectedColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPointsRef = useRef<NormalizedPoint[]>([]);

  // Redraw canvas whenever strokes or canvas dimensions change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Render grid pattern subtle background
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    const gridSize = 24;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw all strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.strokeWidth;
      ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color;

      if (stroke.points.length === 1) {
        const pt = stroke.points[0];
        ctx.fillStyle = stroke.isEraser ? '#ffffff' : stroke.color;
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, stroke.strokeWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        const start = stroke.points[0];
        ctx.moveTo(start.x * w, start.y * h);

        for (let i = 1; i < stroke.points.length; i++) {
          const pt = stroke.points[i];
          ctx.lineTo(pt.x * w, pt.y * h);
        }
        ctx.stroke();
      }
      ctx.restore();
    });

    // Draw active stroke being dragged right now
    if (currentPointsRef.current.length > 0) {
      const activePts = currentPointsRef.current;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = isEraser ? '#ffffff' : selectedColor;

      ctx.beginPath();
      ctx.moveTo(activePts[0].x * w, activePts[0].y * h);
      for (let i = 1; i < activePts.length; i++) {
        ctx.lineTo(activePts[i].x * w, activePts[i].y * h);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [strokes, strokeWidth, selectedColor, isEraser]);

  // Sync canvas pixel resolution with CSS container resolution
  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      redraw();
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Convert client pointer event into 0.0 -> 1.0 normalized coordinates
  const getNormalizedPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): NormalizedPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;

    const nx = Math.max(0, Math.min(1, rawX / rect.width));
    const ny = Math.max(0, Math.min(1, rawY / rect.height));

    return {
      x: Number(nx.toFixed(4)),
      y: Number(ny.toFixed(4)),
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    setIsDrawing(true);
    currentPointsRef.current = [pt];
    redraw();
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawing) return;
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    currentPointsRef.current.push(pt);
    redraw();
  };

  const handlePointerUp = () => {
    if (!isDrawer || !isDrawing) return;
    setIsDrawing(false);

    if (currentPointsRef.current.length > 0 && onAddStroke) {
      const newStroke: DrawStroke = {
        id: 'stroke_' + Math.random().toString(36).substring(2, 8),
        points: [...currentPointsRef.current],
        color: isEraser ? '#ffffff' : selectedColor,
        strokeWidth: strokeWidth,
        isEraser,
      };
      onAddStroke(newStroke);
    }

    currentPointsRef.current = [];
    redraw();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      {/* Canvas Top Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 text-xs">
        <div className="flex items-center gap-2">
          {isDrawer ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LƯỢT BẠN VẼ
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Khóa nét vẽ (Đang xem: {drawerName || 'Chờ...'})
            </span>
          )}

          {isDrawer && secretWord && (
            <span className="bg-amber-400/10 text-amber-300 px-2 py-0.5 rounded border border-amber-400/20 font-medium">
              Từ khóa của bạn: <strong className="text-amber-200">{secretWord}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span>Chuẩn hóa: <strong>0.0000 → 1.0000</strong></span>
          <span>•</span>
          <span>Nét vẽ: {strokes.length}</span>
        </div>
      </div>

      {/* Main Canvas Drawing Area */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-white cursor-crosshair select-none touch-none overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        {!isDrawer && (
          <div className="pointer-events-none absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            Nhận nét vẽ qua WebSocket (LAN Sync)
          </div>
        )}
      </div>

      {/* Drawer Tool Palette */}
      {isDrawer && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-slate-800 border-t border-slate-700">
          {/* Colors */}
          <div className="flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-slate-400 mr-1" />
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setSelectedColor(c);
                  setIsEraser(false);
                }}
                className={`w-6 h-6 rounded-full transition-transform ${
                  selectedColor === c && !isEraser
                    ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-800 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          {/* Stroke Widths & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-700/60 p-1 rounded-lg border border-slate-600">
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setStrokeWidth(w)}
                  className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                    strokeWidth === w ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Độ dày ${w}px`}
                >
                  <div
                    className="rounded-full bg-current"
                    style={{ width: Math.max(3, w), height: Math.max(3, w) }}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsEraser(!isEraser)}
              className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs font-medium ${
                isEraser
                  ? 'bg-amber-500 text-slate-900 border-amber-400'
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
              }`}
              title="Cục tẩy"
            >
              <Eraser className="w-4 h-4" />
              Tẩy
            </button>

            <button
              type="button"
              onClick={() => onClearCanvas && onClearCanvas()}
              className="p-1.5 rounded-lg border bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30 transition-colors flex items-center gap-1 text-xs font-medium"
              title="Xóa toàn bộ canvas"
            >
              <Trash2 className="w-4 h-4" />
              Xóa bảng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
