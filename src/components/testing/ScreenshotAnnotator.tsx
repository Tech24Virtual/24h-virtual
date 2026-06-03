/**
 * ScreenshotAnnotator
 * -------------------
 * Modal that lets the user draw on a captured screenshot before it gets
 * downloaded + saved. Tools: arrow, circle, rectangle, freehand, text.
 * Returns the annotated PNG blob via onConfirm.
 */
import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  ArrowUpRight, Circle, Square, Pencil, Type as TypeIcon,
  Undo2, Trash2, Check, X,
} from "lucide-react";

type Tool = "arrow" | "circle" | "rect" | "pen" | "text";

interface Shape {
  tool: Tool;
  color: string;
  width: number;
  x1: number; y1: number; x2: number; y2: number;
  points?: Array<{ x: number; y: number }>;
  text?: string;
}

const COLORS = ["#E74A3E", "#FFD400", "#22C55E", "#005FB4", "#111827", "#FFFFFF"];

export function ScreenshotAnnotator({
  open,
  source,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  source: Blob | null;
  onCancel: () => void;
  onConfirm: (annotated: Blob) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [drawing, setDrawing] = useState<Shape | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  // Load source blob into an Image
  useEffect(() => {
    if (!open || !source) return;
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setShapes([]);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [open, source]);

  // Redraw on changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgSize) return;
    canvas.width = imgSize.w;
    canvas.height = imgSize.h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    [...shapes, ...(drawing ? [drawing] : [])].forEach((s) => drawShape(ctx, s));
  }, [shapes, drawing, imgSize]);

  function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (s.tool === "rect") {
      ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
    } else if (s.tool === "circle") {
      const cx = (s.x1 + s.x2) / 2;
      const cy = (s.y1 + s.y2) / 2;
      const rx = Math.abs(s.x2 - s.x1) / 2;
      const ry = Math.abs(s.y2 - s.y1) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.tool === "arrow") {
      drawArrow(ctx, s.x1, s.y1, s.x2, s.y2, s.width);
    } else if (s.tool === "pen" && s.points?.length) {
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else if (s.tool === "text" && s.text) {
      ctx.font = `${Math.max(20, s.width * 8)}px Inter, sans-serif`;
      ctx.textBaseline = "top";
      // Outline for legibility
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeText(s.text, s.x1, s.y1);
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, s.x1, s.y1);
    }
    ctx.restore();
  }

  function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number) {
    const head = Math.max(14, w * 4);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 7), y2 - head * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 7), y2 - head * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fill();
  }

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = getPos(e);
    if (tool === "text") {
      const text = window.prompt("Annotation text");
      if (!text) return;
      setShapes((s) => [...s, {
        tool, color, width: 3, x1: p.x, y1: p.y, x2: p.x, y2: p.y, text,
      }]);
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrawing({
      tool, color,
      width: tool === "pen" ? 4 : 5,
      x1: p.x, y1: p.y, x2: p.x, y2: p.y,
      points: tool === "pen" ? [p] : undefined,
    });
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const p = getPos(e);
    setDrawing((d) => {
      if (!d) return d;
      if (d.tool === "pen") return { ...d, x2: p.x, y2: p.y, points: [...(d.points ?? []), p] };
      return { ...d, x2: p.x, y2: p.y };
    });
  }

  function onPointerUp() {
    if (drawing) {
      setShapes((s) => [...s, drawing]);
      setDrawing(null);
    }
  }

  function undo() {
    setShapes((s) => s.slice(0, -1));
  }

  function clearAll() {
    setShapes([]);
  }

  function confirm() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((b) => { if (b) onConfirm(b); }, "image/png");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Annotate Screenshot</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-b pb-3">
          <Toggle pressed={tool === "arrow"} onPressedChange={() => setTool("arrow")} aria-label="Arrow"><ArrowUpRight className="h-4 w-4" /></Toggle>
          <Toggle pressed={tool === "circle"} onPressedChange={() => setTool("circle")} aria-label="Circle"><Circle className="h-4 w-4" /></Toggle>
          <Toggle pressed={tool === "rect"} onPressedChange={() => setTool("rect")} aria-label="Rectangle"><Square className="h-4 w-4" /></Toggle>
          <Toggle pressed={tool === "pen"} onPressedChange={() => setTool("pen")} aria-label="Pen"><Pencil className="h-4 w-4" /></Toggle>
          <Toggle pressed={tool === "text"} onPressedChange={() => setTool("text")} aria-label="Text"><TypeIcon className="h-4 w-4" /></Toggle>

          <div className="mx-2 h-6 w-px bg-border" />

          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-border"}`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={undo} disabled={shapes.length === 0}>
              <Undo2 className="h-4 w-4 mr-1" /> Undo
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={shapes.length === 0}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto rounded-md bg-muted/40 p-2">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="block w-full h-auto cursor-crosshair touch-none rounded shadow"
            style={{ maxWidth: "100%" }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1.5" /> Cancel
          </Button>
          <Button onClick={confirm}>
            <Check className="h-4 w-4 mr-1.5" /> Save & Attach
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
