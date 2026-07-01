"use client";

import "@/lib/pdf-worker";
import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";


export type AnnotationType = "text" | "draw";

export interface Annotation {
  id: string;
  type: AnnotationType;
  page: number;
  x: number;      // fraction 0-1
  y: number;      // fraction 0-1
  width?: number;  // fraction, for text boxes
  height?: number; // fraction, for text boxes
  text?: string;
  color?: string;
  fontSize?: number;
  path?: { x: number; y: number }[]; // fractions, for drawings
  strokeWidth?: number;
}

interface PdfAnnotatorProps {
  fileUrl: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  readOnly?: boolean;
}

const DRAW_COLORS = ["#1e3a8a", "#7f1d1d", "#14532d", "#000000"];

export default function PdfAnnotator({
  fileUrl,
  annotations,
  onAnnotationsChange,
  readOnly = false,
}: PdfAnnotatorProps) {
  const [numPages, setNumPages] = useState(0);
  const [mode, setMode] = useState<"draw" | "text" | "select">("select");
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [pageWidth, setPageWidth] = useState(700);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure available width once, so the PDF scales to fit the container
  useEffect(() => {
    if (containerRef.current) {
      setPageWidth(Math.min(containerRef.current.clientWidth, 800));
    }
  }, []);

  function addAnnotation(annotation: Annotation) {
    onAnnotationsChange([...annotations, annotation]);
  }

  function updateAnnotation(id: string, updates: Partial<Annotation>) {
    onAnnotationsChange(
      annotations.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }

  function removeAnnotation(id: string) {
    onAnnotationsChange(annotations.filter((a) => a.id !== id));
  }

  return (
    <div ref={containerRef}>
      {!readOnly && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2">
          <button
            onClick={() => setMode("select")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              mode === "select" ? "bg-gray-700 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Select
          </button>
          <button
            onClick={() => setMode("draw")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              mode === "draw" ? "bg-gray-700 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            ✏️ Draw
          </button>
          <button
            onClick={() => setMode("text")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              mode === "text" ? "bg-gray-700 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            🔤 Text
          </button>

          <div className="h-6 w-px bg-gray-300" />

          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setDrawColor(c)}
              className={`h-6 w-6 rounded-full border-2 ${
                drawColor === c ? "border-gray-900" : "border-gray-300"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

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
          />
        ))}
      </Document>
    </div>
  );
}

interface PageWithOverlayProps {
  pageNum: number;
  pageWidth: number;
  mode: "draw" | "text" | "select";
  drawColor: string;
  readOnly: boolean;
  annotations: Annotation[];
  onAdd: (a: Annotation) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onRemove: (id: string) => void;
  onModeChange: (mode: "draw" | "text" | "select") => void;
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
}: PageWithOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [renderedSize, setRenderedSize] = useState({ width: pageWidth, height: pageWidth * 1.4 });
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[] | null>(null);
  const isDrawing = useRef(false);

  // Convert a mouse event into a FRACTION (0-1) of the page's current rendered size.
  // This is the one function every coordinate in this component flows through.
  function getRelativePoint(e: React.MouseEvent): { x: number; y: number } {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (readOnly) return;

    if (mode === "draw") {
      isDrawing.current = true;
      setCurrentStroke([getRelativePoint(e)]);

    } else if (mode === "text") {
        const point = getRelativePoint(e);
        const id = `txt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const singleLineHeightPx = 24;
        onAdd({
          id,
          type: "text",
          page: pageNum,
          x: point.x,
          y: point.y,
          width: 0.3,
          height: singleLineHeightPx / renderedSize.height,
          text: "",
          color: "#000000",
          fontSize: 14,
        });
        setTimeout(() => onModeChange("select"), 100);
      }
          
  }


  function handleMouseMove(e: React.MouseEvent) {
    if (mode === "draw" && isDrawing.current && currentStroke) {
      setCurrentStroke([...currentStroke, getRelativePoint(e)]);
    }
  }

  function handleMouseUp() {
    if (mode === "draw" && isDrawing.current && currentStroke && currentStroke.length > 1) {
      const id = `draw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      onAdd({
        id,
        type: "draw",
        page: pageNum,
        x: 0,
        y: 0,
        path: currentStroke,
        color: drawColor,
        strokeWidth: 2,
      });
    }
    isDrawing.current = false;
    setCurrentStroke(null);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (readOnly || mode !== "draw") return;
    if (e.touches.length !== 1) return; // two fingers = scroll, ignore
    e.preventDefault();
    const touch = e.touches[0];
    const rect = overlayRef.current!.getBoundingClientRect();
    const point = {
      x: (touch.clientX - rect.left) / rect.width,
      y: (touch.clientY - rect.top) / rect.height,
    };
    isDrawing.current = true;
    setCurrentStroke([point]);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDrawing.current || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = overlayRef.current!.getBoundingClientRect();
    const point = {
      x: (touch.clientX - rect.left) / rect.width,
      y: (touch.clientY - rect.top) / rect.height,
    };
    setCurrentStroke((prev) => (prev ? [...prev, point] : [point]));
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!isDrawing.current) return;
    e.preventDefault();
    if (currentStroke && currentStroke.length > 1) {
      const id = `draw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      onAdd({
        id,
        type: "draw",
        page: pageNum,
        x: 0,
        y: 0,
        path: currentStroke,
        color: drawColor,
        strokeWidth: 3, // slightly thicker than mouse strokes for finger drawing
      });
    }
    isDrawing.current = false;
    setCurrentStroke(null);
  }

  // Convert a fraction-based path into an SVG points string using the CURRENT rendered size
  function pathToPoints(path: { x: number; y: number }[]) {
    return path
      .map((p) => `${p.x * renderedSize.width},${p.y * renderedSize.height}`)
      .join(" ");
  }

  return (
    <div className="relative mb-4" style={{ width: renderedSize.width }}>
      <Page
        pageNumber={pageNum}
        width={pageWidth}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onRenderSuccess={(page) => {
          setRenderedSize({ width: page.width, height: page.height });
        }}
      />

      {/* Single overlay div contains EVERYTHING interactive —
          SVG strokes, text boxes, and the event handlers.
          Text boxes are children so their stopPropagation works. */}
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
          cursor: readOnly ? "default" : mode === "draw" ? "crosshair" : mode === "text" ? "text" : "default",
          touchAction: mode === "draw" ? "none" : "auto",
        }}
      >
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={renderedSize.width}
          height={renderedSize.height}
          style={{ zIndex: 0 }}
        >
          {annotations
            .filter((a) => a.type === "draw" && a.path)
            .map((a) => (
              <polyline
                key={a.id}
                points={pathToPoints(a.path!)}
                fill="none"
                stroke={a.color || "#000"}
                strokeWidth={a.strokeWidth || 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          {currentStroke && (
            <polyline
              points={pathToPoints(currentStroke)}
              fill="none"
              stroke={drawColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {annotations
          .filter((a) => a.type === "text")
          .map((a) => (
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

  const left = annotation.x * renderedSize.width;
  const top = annotation.y * renderedSize.height;
  const width = (annotation.width || 0.3) * renderedSize.width;
  const height = (annotation.height || 0.08) * renderedSize.height;

  function isInBorderZone(localX: number, localY: number): boolean {
    const nearLeft = localX <= BORDER_ZONE;
    const nearRight = localX >= width - BORDER_ZONE;
    const nearTop = localY <= BORDER_ZONE;
    const nearBottom = localY >= height - BORDER_ZONE;
    return nearLeft || nearRight || nearTop || nearBottom;
  }

  function getClientPoint(e: React.MouseEvent | React.TouchEvent): { clientX: number; clientY: number } {
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { clientX: touch.clientX, clientY: touch.clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
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
    const { clientX, clientY } = getClientPoint(e);
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    if (isInBorderZone(localX, localY)) {
      e.stopPropagation();
      startDrag(clientX, clientY);
      return;
    }

    e.stopPropagation();
  }

  function startDrag(clientX: number, clientY: number) {
    isDragging.current = true;
    setIsHoveringMoveZone(true);
    dragStart.current = { x: clientX, y: clientY, boxX: annotation.x, boxY: annotation.y };

    function handleMove(moveEvent: MouseEvent | TouchEvent) {
      if (!isDragging.current) return;
      const point = "touches" in moveEvent ? moveEvent.touches[0] : moveEvent;
      const deltaX = point.clientX - dragStart.current.x;
      const deltaY = point.clientY - dragStart.current.y;

      const widthFrac = annotation.width || 0.3;
      const heightFrac = annotation.height || 0.08;
      let newX = dragStart.current.boxX + deltaX / renderedSize.width;
      let newY = dragStart.current.boxY + deltaY / renderedSize.height;
      newX = Math.min(Math.max(0, newX), 1 - widthFrac);
      newY = Math.min(Math.max(0, newY), 1 - heightFrac);

      onUpdate(annotation.id, { x: newX, y: newY });
    }

    function handleEnd() {
      isDragging.current = false;
      setIsHoveringMoveZone(false);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
  }

  function handleResizeStart(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    isResizing.current = true;
    const { clientX, clientY } = getClientPoint(e);
    resizeStart.current = { x: clientX, y: clientY, width, height };

    function handleMove(moveEvent: MouseEvent | TouchEvent) {
      if (!isResizing.current) return;
      const point = "touches" in moveEvent ? moveEvent.touches[0] : moveEvent;
      const deltaX = point.clientX - resizeStart.current.x;
      const deltaY = point.clientY - resizeStart.current.y;
      const newWidthPx = Math.max(60, resizeStart.current.width + deltaX);
      const newHeightPx = Math.max(24, resizeStart.current.height + deltaY);
      onUpdate(annotation.id, {
        width: newWidthPx / renderedSize.width,
        height: newHeightPx / renderedSize.height,
      });
    }

    function handleEnd() {
      isResizing.current = false;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
  }

  return (
    <div
      ref={boxRef}
      className="group pointer-events-auto absolute"
      style={{ left, top, width, height, cursor: readOnly ? "default" : isHoveringMoveZone ? "move" : "text" }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onTouchStart={handlePointerDown}
    >
      {/* Border highlight — confirms the move zone is active */}
      <div
        className={`pointer-events-none absolute inset-0 rounded border-2 transition-colors ${
          isHoveringMoveZone ? "border-blue-500" : "border-transparent group-hover:border-blue-300"
        }`}
      />

      {/* 4-direction move icon, shown while hovering/dragging the border */}
      {isHoveringMoveZone && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded bg-gray-400 px-1 text-xs text-white shadow mt-4">&#x2723;</span>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={annotation.text || ""}
        onChange={(e) => onUpdate(annotation.id, { text: e.target.value })}
        readOnly={readOnly}
        placeholder={readOnly ? "" : "Type here..."}
        style={{
          width: "100%",
          height: "100%",
          fontSize: annotation.fontSize || 14,
          color: annotation.color || "#000000",
          resize: "none",
          overflow: "auto",
        }}
        className="rounded border border-blue-300 bg-transparent px-1 py-0.5 focus:border-blue-500 focus:outline-none"
      />

      {!readOnly && (
        <>
          <button
            onClick={() => onRemove(annotation.id)}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute -right-2 -top-2 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white group-hover:flex"
          >
            ✕
          </button>

          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            className="absolute -right-1 -bottom-1 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-blue-500 opacity-0 group-hover:opacity-100"
            title="Drag to resize"
          />
        </>
      )}
    </div>
  );
}
