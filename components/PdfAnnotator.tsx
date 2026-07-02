"use client";

import "@/lib/pdf-worker";
import { useState, useRef, useEffect } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

export type AnnotationType = "text" | "draw";

export interface Annotation {
  id: string;
  type: AnnotationType;
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  fontSize?: number;      // stored as FRACTION of page width, not pixels
  path?: { x: number; y: number }[];
  strokeWidth?: number;   // stored as FRACTION of page width, not pixels
}

interface PdfAnnotatorProps {
  fileUrl: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  readOnly?: boolean;
}

const DRAW_COLORS = ["#1e3a8a", "#7f1d1d", "#14532d", "#000000"];
const ERASER_RADIUS = 0.015;

// ─── TUNE THESE TO ADJUST DEFAULT SIZES ───────────────────────────────────────
// Both are fractions of page width, so they stay visually consistent at any zoom.
// At 800px page width: 0.003 × 800 = 2.4px stroke | 0.018 × 800 ≈ 14px font
const STROKE_WIDTH_FRACTION = 0.003;   // ← change this to make strokes thicker/thinner
const FONT_SIZE_FRACTION    = 0.018;   // ← change this to make text larger/smaller
// ──────────────────────────────────────────────────────────────────────────────

export default function PdfAnnotator({
  fileUrl,
  annotations,
  onAnnotationsChange,
  readOnly = false,
}: PdfAnnotatorProps) {
  const [numPages, setNumPages] = useState(0);
  const [mode, setMode] = useState<"draw" | "text" | "select" | "erase">("select");
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [baseWidth, setBaseWidth] = useState(700);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // History refs must be INSIDE the component, not at module level
  const historyRef = useRef<Annotation[][]>([]);
  const historyIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (containerRef.current) {
      setBaseWidth(Math.min(containerRef.current.clientWidth, 800));
    }
  }, []);

  const pageWidth = Math.round(baseWidth * zoom);

  function adjustZoom(delta: number) {
    setZoom((prev) => Math.min(Math.max(0.5, prev + delta), 3));
  }

  function pushHistory(newAnnotations: Annotation[]) {
    // Discard any "future" states if we undid and then made a new change
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(newAnnotations);
    historyIndexRef.current = historyRef.current.length - 1;
    onAnnotationsChange(newAnnotations);
  }

  function addAnnotation(annotation: Annotation) {
    pushHistory([...annotations, annotation]);
  }

  function updateAnnotation(id: string, updates: Partial<Annotation>) {
    pushHistory(annotations.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }

  function removeAnnotation(id: string) {
    pushHistory(annotations.filter((a) => a.id !== id));
  }

  function undo() {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    onAnnotationsChange(historyRef.current[historyIndexRef.current]);
  }

  function redo() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    onAnnotationsChange(historyRef.current[historyIndexRef.current]);
  }

  function applyEraserToAnnotations(eraserPath: { x: number; y: number }[]) {
    const next = annotations.map((ann) => {
      if (ann.type !== "draw" || !ann.path) return ann;

      let currentSegment: { x: number; y: number }[] = [];
      const segments: { x: number; y: number }[][] = [];

      for (const pt of ann.path) {
        const erased = eraserPath.some((ep) => {
          const dx = pt.x - ep.x;
          const dy = pt.y - ep.y;
          return Math.sqrt(dx * dx + dy * dy) < ERASER_RADIUS;
        });

        if (erased) {
          if (currentSegment.length > 1) segments.push([...currentSegment]);
          currentSegment = [];
        } else {
          currentSegment.push(pt);
        }
      }
      if (currentSegment.length > 1) segments.push(currentSegment);

      if (segments.length === 0) return null;
      if (segments.length === 1) return { ...ann, path: segments[0] };
      return { ...ann, path: segments[0], _extraSegments: segments.slice(1) };
    });

    const expanded: Annotation[] = [];
    for (const ann of next) {
      if (!ann) continue;
      const { _extraSegments, ...clean } = ann as any;
      expanded.push(clean);
      if (_extraSegments) {
        for (const seg of _extraSegments) {
          expanded.push({
            ...clean,
            id: `${clean.id}-split-${Math.random().toString(36).slice(2, 6)}`,
            path: seg,
          });
        }
      }
    }
    // Route through pushHistory so eraser strokes are also undoable
    pushHistory(expanded);
  }

  return (
    <div ref={containerRef}>
      {!readOnly && (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2"
          style={{ position: "sticky", top: 0, zIndex: 50 }}
        >
          <button
            onClick={() => setMode("select")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${mode === "select" ? "bg-gray-700 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
          >
            Select
          </button>
          <button
            onClick={() => setMode("draw")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${mode === "draw" ? "bg-gray-700 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
          >
            ✏️ Draw
          </button>
          <button
            onClick={() => setMode("text")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${mode === "text" ? "bg-gray-700 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
          >
            🔤 Text
          </button>
          <button
            onClick={() => setMode("erase")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${mode === "erase" ? "bg-red-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
          >
            🧹 Erase
          </button>

          <div className="h-6 w-px bg-gray-300" />

          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setDrawColor(c)}
              className={`h-6 w-6 rounded-full border-2 ${drawColor === c ? "border-gray-900" : "border-gray-300"}`}
              style={{ backgroundColor: c }}
            />
          ))}

          <div className="h-6 w-px bg-gray-300" />

          <button
            onClick={() => adjustZoom(-0.25)}
            className="rounded px-2 py-1 text-sm font-medium bg-white text-gray-700 hover:bg-gray-100"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-xs text-gray-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => adjustZoom(0.25)}
            className="rounded px-2 py-1 text-sm font-medium bg-white text-gray-700 hover:bg-gray-100"
          >
            +
          </button>

          <div className="h-6 w-px bg-gray-300" />

          <button
            onClick={undo}
            className="rounded px-2 py-1 text-sm font-medium bg-white text-gray-700 hover:bg-gray-100"
            title="Undo"
          >
            ↩ Undo
          </button>
          <button
            onClick={redo}
            className="rounded px-2 py-1 text-sm font-medium bg-white text-gray-700 hover:bg-gray-100"
            title="Redo"
          >
            Redo ↪
          </button>
        </div>
      )}

      <div style={{ overflowX: "auto", overflowY: "visible", WebkitOverflowScrolling: "touch" }}>
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<p className="p-8 text-gray-500">Loading PDF...</p>}
          error={<p className="p-8 text-red-600">Could not load PDF.</p>}
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <PageWithOverlay
              key={pageNum}
              pageNum={pageNum}
              pageWidth={pageWidth}
              mode={mode}
              drawColor={drawColor}
              readOnly={readOnly}
              annotations={annotations.filter((a) => a.page === pageNum)}
              onAdd={addAnnotation}
              onUpdate={updateAnnotation}
              onRemove={removeAnnotation}
              onModeChange={setMode}
              onErase={applyEraserToAnnotations}
            />
          ))}
        </Document>
      </div>
    </div>
  );
}

interface PageWithOverlayProps {
  pageNum: number;
  pageWidth: number;
  mode: "draw" | "text" | "select" | "erase";
  drawColor: string;
  readOnly: boolean;
  annotations: Annotation[];
  onAdd: (a: Annotation) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onRemove: (id: string) => void;
  onModeChange: (mode: "draw" | "text" | "select" | "erase") => void;
  onErase: (eraserPath: { x: number; y: number }[]) => void;
}

function PageWithOverlay({
  pageNum,
  pageWidth,
  mode,
  drawColor,
  readOnly,
  annotations,
  onAdd,
  onUpdate,
  onRemove,
  onModeChange,
  onErase,
}: PageWithOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [renderedSize, setRenderedSize] = useState({ width: pageWidth, height: pageWidth * 1.4 });
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[] | null>(null);
  const [currentEraserPath, setCurrentEraserPath] = useState<{ x: number; y: number }[] | null>(null);
  const isDrawing = useRef(false);
  const isErasing = useRef(false);

  function getPointFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (readOnly) return;
    if (mode === "draw") {
      isDrawing.current = true;
      setCurrentStroke([getPointFromClient(e.clientX, e.clientY)]);
    } else if (mode === "erase") {
      isErasing.current = true;
      setCurrentEraserPath([getPointFromClient(e.clientX, e.clientY)]);
    } else if (mode === "text") {
      const point = getPointFromClient(e.clientX, e.clientY);
      onAdd({
        id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "text",
        page: pageNum,
        x: point.x,
        y: point.y,
        width: 0.3,
        height: FONT_SIZE_FRACTION * 1.6,
        text: "",
        color: "#000000",
        fontSize: FONT_SIZE_FRACTION,
      });
      setTimeout(() => onModeChange("select"), 100);
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (mode === "draw" && isDrawing.current) {
      setCurrentStroke((prev) => prev ? [...prev, getPointFromClient(e.clientX, e.clientY)] : null);
    } else if (mode === "erase" && isErasing.current) {
      setCurrentEraserPath((prev) => prev ? [...prev, getPointFromClient(e.clientX, e.clientY)] : null);
    }
  }

  function handleMouseUp() {
    if (mode === "draw" && isDrawing.current && currentStroke && currentStroke.length > 1) {
      onAdd({
        id: `draw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "draw",
        page: pageNum,
        x: 0,
        y: 0,
        path: currentStroke,
        color: drawColor,
        strokeWidth: STROKE_WIDTH_FRACTION,
      });
    } else if (mode === "erase" && isErasing.current && currentEraserPath) {
      onErase(currentEraserPath);
    }
    isDrawing.current = false;
    isErasing.current = false;
    setCurrentStroke(null);
    setCurrentEraserPath(null);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (readOnly || e.touches.length !== 1) return;
    if (mode === "draw") {
      e.preventDefault();
      isDrawing.current = true;
      setCurrentStroke([getPointFromClient(e.touches[0].clientX, e.touches[0].clientY)]);
    } else if (mode === "erase") {
      e.preventDefault();
      isErasing.current = true;
      setCurrentEraserPath([getPointFromClient(e.touches[0].clientX, e.touches[0].clientY)]);
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length !== 1) return;
    if (mode === "draw" && isDrawing.current) {
      e.preventDefault();
      setCurrentStroke((prev) => prev ? [...prev, getPointFromClient(e.touches[0].clientX, e.touches[0].clientY)] : null);
    } else if (mode === "erase" && isErasing.current) {
      e.preventDefault();
      setCurrentEraserPath((prev) => prev ? [...prev, getPointFromClient(e.touches[0].clientX, e.touches[0].clientY)] : null);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (mode === "draw" && isDrawing.current) {
      e.preventDefault();
      if (currentStroke && currentStroke.length > 1) {
        onAdd({
          id: `draw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "draw",
          page: pageNum,
          x: 0,
          y: 0,
          path: currentStroke,
          color: drawColor,
          strokeWidth: STROKE_WIDTH_FRACTION,
        });
      }
    } else if (mode === "erase" && isErasing.current) {
      e.preventDefault();
      if (currentEraserPath) onErase(currentEraserPath);
    }
    isDrawing.current = false;
    isErasing.current = false;
    setCurrentStroke(null);
    setCurrentEraserPath(null);
  }

  function pathToPoints(path: { x: number; y: number }[]) {
    return path.map((p) => `${p.x * renderedSize.width},${p.y * renderedSize.height}`).join(" ");
  }

  function resolveStrokeWidth(fraction: number | undefined): number {
    return (fraction ?? STROKE_WIDTH_FRACTION) * renderedSize.width;
  }

  const eraserCursorSize = Math.round(ERASER_RADIUS * renderedSize.width * 2);

  return (
    <div className="relative mb-4" style={{ width: renderedSize.width }}>
      <Page
        pageNumber={pageNum}
        width={pageWidth}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onRenderSuccess={(page) => setRenderedSize({ width: page.width, height: page.height })}
      />

      <div
        ref={overlayRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="absolute left-0 top-0"
        style={{
          width: renderedSize.width,
          height: renderedSize.height,
          zIndex: 10,
          cursor: readOnly
            ? "default"
            : mode === "draw"
            ? "crosshair"
            : mode === "erase"
            ? `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${eraserCursorSize}' height='${eraserCursorSize}'><circle cx='${eraserCursorSize / 2}' cy='${eraserCursorSize / 2}' r='${eraserCursorSize / 2 - 1}' fill='none' stroke='gray' stroke-width='1'/></svg>") ${eraserCursorSize / 2} ${eraserCursorSize / 2}, cell`
            : mode === "text"
            ? "text"
            : "default",
          touchAction: mode === "draw" || mode === "erase" ? "none" : "auto",
        }}
      >
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={renderedSize.width}
          height={renderedSize.height}
          style={{ zIndex: 0 }}
        >
          {annotations.filter((a) => a.type === "draw" && a.path).map((a) => (
            <polyline
              key={a.id}
              points={pathToPoints(a.path!)}
              fill="none"
              stroke={a.color || "#000"}
              strokeWidth={resolveStrokeWidth(a.strokeWidth)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentStroke && (
            <polyline
              points={pathToPoints(currentStroke)}
              fill="none"
              stroke={drawColor}
              strokeWidth={resolveStrokeWidth(STROKE_WIDTH_FRACTION)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {currentEraserPath && (
            <polyline
              points={pathToPoints(currentEraserPath)}
              fill="none"
              stroke="rgba(239,68,68,0.4)"
              strokeWidth={Math.round(ERASER_RADIUS * renderedSize.width * 2)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {annotations.filter((a) => a.type === "text").map((a) => (
          <TextAnnotationBox
            key={a.id}
            annotation={a}
            renderedSize={renderedSize}
            readOnly={readOnly}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

const BORDER_ZONE = 8;

function TextAnnotationBox({
  annotation,
  renderedSize,
  readOnly,
  onUpdate,
  onRemove,
}: {
  annotation: Annotation;
  renderedSize: { width: number; height: number };
  readOnly: boolean;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onRemove: (id: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, boxX: 0, boxY: 0 });
  const [isHoveringMoveZone, setIsHoveringMoveZone] = useState(false);

  useEffect(() => {
    if (!readOnly && annotation.text === "" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const fontSizePx = (annotation.fontSize ?? FONT_SIZE_FRACTION) * renderedSize.width;

  const left  = annotation.x * renderedSize.width;
  const top   = annotation.y * renderedSize.height;
  const width = (annotation.width || 0.3) * renderedSize.width;

  const INNER_PADDING_PX = 16;
  const heightFromFraction = (annotation.height || 0.08) * renderedSize.height;
  const heightMinimum = fontSizePx + INNER_PADDING_PX;
  const height = Math.max(heightFromFraction, heightMinimum);

  function isInBorderZone(localX: number, localY: number): boolean {
    return (
      localX <= BORDER_ZONE ||
      localX >= width - BORDER_ZONE ||
      localY <= BORDER_ZONE ||
      localY >= height - BORDER_ZONE
    );
  }

  function getClientXY(e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) {
    if ("touches" in e) {
      const t = e.touches[0] || (e as TouchEvent).changedTouches?.[0];
      return { clientX: t?.clientX ?? 0, clientY: t?.clientY ?? 0 };
    }
    return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
  }

  function handlePointerMove(e: React.MouseEvent) {
    if (readOnly || isDragging.current || isResizing.current) return;
    const rect = boxRef.current!.getBoundingClientRect();
    setIsHoveringMoveZone(isInBorderZone(e.clientX - rect.left, e.clientY - rect.top));
  }

  function handlePointerLeave() {
    if (!isDragging.current) setIsHoveringMoveZone(false);
  }

  function handlePointerDown(e: React.MouseEvent | React.TouchEvent) {
    if (readOnly) return;
    const rect = boxRef.current!.getBoundingClientRect();
    const { clientX, clientY } = getClientXY(e);
    if (isInBorderZone(clientX - rect.left, clientY - rect.top)) {
      e.stopPropagation();
      startDrag(clientX, clientY);
      return;
    }
    e.stopPropagation();
  }

  function startDrag(startX: number, startY: number) {
    isDragging.current = true;
    setIsHoveringMoveZone(true);
    dragStart.current = { x: startX, y: startY, boxX: annotation.x, boxY: annotation.y };

    function handleMove(ev: MouseEvent | TouchEvent) {
      if (!isDragging.current) return;
      const { clientX, clientY } = getClientXY(ev);
      const widthFrac  = annotation.width  || 0.3;
      const heightFrac = annotation.height || 0.08;
      onUpdate(annotation.id, {
        x: Math.min(Math.max(0, dragStart.current.boxX + (clientX - dragStart.current.x) / renderedSize.width),  1 - widthFrac),
        y: Math.min(Math.max(0, dragStart.current.boxY + (clientY - dragStart.current.y) / renderedSize.height), 1 - heightFrac),
      });
    }

    function handleEnd() {
      isDragging.current = false;
      setIsHoveringMoveZone(false);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup",   handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend",  handleEnd);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup",   handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend",  handleEnd);
  }

  function handleResizeStart(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    isResizing.current = true;
    const { clientX, clientY } = getClientXY(e);
    resizeStart.current = { x: clientX, y: clientY, width, height };

    function handleMove(ev: MouseEvent | TouchEvent) {
      if (!isResizing.current) return;
      const { clientX: cx, clientY: cy } = getClientXY(ev);
      onUpdate(annotation.id, {
        width:  Math.max(60, resizeStart.current.width  + cx - resizeStart.current.x) / renderedSize.width,
        height: Math.max(24, resizeStart.current.height + cy - resizeStart.current.y) / renderedSize.height,
      });
    }

    function handleEnd() {
      isResizing.current = false;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup",   handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend",  handleEnd);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup",   handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend",  handleEnd);
  }

  return (
    <div
      ref={boxRef}
      className="group pointer-events-auto absolute"
      style={{
        left,
        top,
        width,
        height,
        cursor: readOnly ? "default" : isHoveringMoveZone ? "move" : "text",
      }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onTouchStart={handlePointerDown}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded border-2 transition-colors"
        style={{ borderColor: isHoveringMoveZone ? "#3b82f6" : "#93c5fd" }}
      />
{/* 
      {!readOnly && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className="rounded px-1 text-xs text-white shadow"
            style={{ backgroundColor: isHoveringMoveZone ? "#3b82f6" : "#93c5fd" }}
          >
            ✛
          </span>
        </div>
      )} */}

      <textarea
        ref={textareaRef}
        value={annotation.text || ""}
        onChange={(e) => onUpdate(annotation.id, { text: e.target.value })}
        readOnly={readOnly}
        placeholder={readOnly ? "" : "Type here..."}
        style={{
          width: "100%",
          height: "100%",
          fontSize: `${fontSizePx}px`,
          color: annotation.color || "#000000",
          resize: "none",
          overflow: "auto",
          backgroundColor: "transparent",
        }}
        className="rounded border-0 bg-transparent px-1 py-0.5 focus:outline-none"
      />

      {!readOnly && (
        <>
          <button
            onClick={() => onRemove(annotation.id)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              e.stopPropagation();
              onRemove(annotation.id);
            }}
            className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[7px] text-white shadow"
          >
            ✕
          </button>
          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            className="absolute -bottom-1 -right-1 flex h-2 w-2 cursor-nwse-resize items-center justify-center rounded-sm bg-blue-500 shadow"
            title="Drag to resize"
          >
            <span className="text-xs text-white leading-none">⤡</span>
          </div>
        </>
      )}
    </div>
  );
}
