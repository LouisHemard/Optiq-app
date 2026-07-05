import { useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImg, Rect, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import useImage from 'use-image';

const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const MIN_DISTANCE = 6;
const RDP_EPSILON = 4;

function perpendicularDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function rdp(pts: number[], start: number, end: number, epsilon: number, out: number[]): void {
  if (end - start < 2) return;
  let maxDist = 0;
  let maxIdx = start;
  const ax = pts[start * 2], ay = pts[start * 2 + 1];
  const bx = pts[end * 2], by = pts[end * 2 + 1];
  for (let i = start + 1; i < end; i++) {
    const d = perpendicularDistance(pts[i * 2], pts[i * 2 + 1], ax, ay, bx, by);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    rdp(pts, start, maxIdx, epsilon, out);
    out.push(pts[maxIdx * 2], pts[maxIdx * 2 + 1]);
    rdp(pts, maxIdx, end, epsilon, out);
  }
}

function simplify(flatPoints: number[], epsilon: number): number[] {
  const n = flatPoints.length / 2;
  if (n < 3) return flatPoints;
  const result = [flatPoints[0], flatPoints[1]];
  rdp(flatPoints, 0, n - 1, epsilon, result);
  result.push(flatPoints[(n - 1) * 2], flatPoints[(n - 1) * 2 + 1]);
  return result;
}

export type DrawTool = 'rectangle' | 'freehand';

export interface NewAnnotation {
  type: string;
  data: Record<string, unknown>;
  color: string;
  comment?: string;
}

export interface ReviewCanvasProps {
  imageUrl: string;
  pendingAnnotations?: NewAnnotation[];
  nextColor?: string;
  tool?: DrawTool;
  onDrawEnd?: (annotation: NewAnnotation) => void;
}

export function ReviewCanvas({
  imageUrl,
  pendingAnnotations = [],
  nextColor = '#ff0000',
  tool = 'rectangle',
  onDrawEnd,
}: ReviewCanvasProps) {
  const [image, imageStatus] = useImage(imageUrl);

  const { stageW, stageH } = useMemo(() => {
    if (!image || !image.naturalWidth || !image.naturalHeight) {
      return { stageW: MAX_WIDTH, stageH: MAX_HEIGHT };
    }
    const ratio = image.naturalWidth / image.naturalHeight;
    let w = MAX_WIDTH;
    let h = Math.round(w / ratio);
    if (h > MAX_HEIGHT) {
      h = MAX_HEIGHT;
      w = Math.round(h * ratio);
    }
    return { stageW: w, stageH: h };
  }, [image]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);
  const [rectCurrent, setRectCurrent] = useState<{ x: number; y: number } | null>(null);
  const [freePoints, setFreePoints] = useState<number[]>([]);

  const getPos = (e: KonvaEventObject<MouseEvent>) => e.target.getStage()?.getPointerPosition() ?? null;

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!onDrawEnd) return;
      const pos = getPos(e);
      if (!pos) return;
      setIsDrawing(true);
      if (tool === 'rectangle') {
        setRectStart(pos);
        setRectCurrent(pos);
      } else {
        setFreePoints([pos.x, pos.y]);
      }
    },
    [onDrawEnd, tool],
  );

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isDrawing) return;
      const pos = getPos(e);
      if (!pos) return;
      if (tool === 'rectangle') {
        setRectCurrent(pos);
      } else {
        setFreePoints((prev) => {
          if (prev.length >= 2) {
            const dx = pos.x - prev[prev.length - 2];
            const dy = pos.y - prev[prev.length - 1];
            if (Math.hypot(dx, dy) < MIN_DISTANCE) return prev;
          }
          return [...prev, pos.x, pos.y];
        });
      }
    },
    [isDrawing, tool],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !onDrawEnd) {
      setIsDrawing(false);
      setRectStart(null);
      setRectCurrent(null);
      setFreePoints([]);
      return;
    }

    if (tool === 'rectangle' && rectStart && rectCurrent) {
      const x = Math.min(rectStart.x, rectCurrent.x);
      const y = Math.min(rectStart.y, rectCurrent.y);
      const w = Math.abs(rectCurrent.x - rectStart.x);
      const h = Math.abs(rectCurrent.y - rectStart.y);
      if (w > 4 && h > 4) {
        onDrawEnd({
          type: 'rectangle',
          data: { x: x / stageW, y: y / stageH, width: w / stageW, height: h / stageH },
          color: nextColor,
        });
      }
    } else if (tool === 'freehand' && freePoints.length >= 6) {
      const simplified = simplify(freePoints, RDP_EPSILON);
      const normalized: number[] = simplified.map((v, i) => i % 2 === 0 ? v / stageW : v / stageH);
      onDrawEnd({
        type: 'freehand',
        data: { points: normalized },
        color: nextColor,
      });
    }

    setIsDrawing(false);
    setRectStart(null);
    setRectCurrent(null);
    setFreePoints([]);
  }, [isDrawing, onDrawEnd, tool, rectStart, rectCurrent, freePoints, nextColor, stageW, stageH]);

  const currentRect =
    tool === 'rectangle' && rectStart && rectCurrent
      ? {
          x: Math.min(rectStart.x, rectCurrent.x),
          y: Math.min(rectStart.y, rectCurrent.y),
          width: Math.abs(rectCurrent.x - rectStart.x),
          height: Math.abs(rectCurrent.y - rectStart.y),
        }
      : null;

  if (imageStatus === 'loading' || !image) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-gray-700 bg-gray-900 flex items-center justify-center"
        style={{ width: MAX_WIDTH, height: MAX_HEIGHT }}
      >
        <div aria-hidden="true" className="w-8 h-8 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
        <span className="sr-only">Chargement de l'image</span>
      </div>
    );
  }

  if (imageStatus === 'failed') {
    return (
      <div
        role="alert"
        className="rounded-xl border border-gray-700 bg-gray-800 flex items-center justify-center"
        style={{ width: MAX_WIDTH, height: MAX_HEIGHT }}
      >
        <span className="text-gray-500 text-sm">Impossible de charger l'image</span>
      </div>
    );
  }

  return (
    <div
      role={onDrawEnd ? 'application' : 'img'}
      aria-label={
        onDrawEnd
          ? `Zone d'annotation. Outil actif : ${tool === 'rectangle' ? 'rectangle' : 'forme libre'}. Cliquez-glissez sur l'image pour dessiner.`
          : 'Image de la photo critiquée'
      }
      className="rounded-xl overflow-hidden border border-gray-700 bg-black"
      style={{ cursor: onDrawEnd ? 'crosshair' : 'default' }}
    >
      <Stage
        width={stageW}
        height={stageH}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Layer>
          <KonvaImg image={image} width={stageW} height={stageH} listening={false} />

          {pendingAnnotations.map((ann, i) => {
            if (ann.type === 'rectangle') {
              const d = ann.data as { x?: number; y?: number; width?: number; height?: number };
              return (
                <Rect
                  key={i}
                  x={(d.x ?? 0) * stageW}
                  y={(d.y ?? 0) * stageH}
                  width={(d.width ?? 0) * stageW}
                  height={(d.height ?? 0) * stageH}
                  stroke={ann.color || '#ff0000'}
                  strokeWidth={2}
                  fill={ann.color || '#ff0000'}
                  opacity={0.85}
                  listening={false}
                />
              );
            }
            if (ann.type === 'freehand') {
              const d = ann.data as { points: number[] };
              const pts = d.points.flatMap((v, idx) => idx % 2 === 0 ? v * stageW : v * stageH);
              return (
                <Line
                  key={i}
                  points={pts}
                  stroke={ann.color || '#ff0000'}
                  strokeWidth={2.5}
                  fill={ann.color || '#ff0000'}
                  opacity={0.85}
                  fillEnabled={true}
                  lineCap="round"
                  lineJoin="round"
                  tension={0.4}
                  closed={true}
                  listening={false}
                />
              );
            }
            return null;
          })}

          {currentRect && (
            <Rect
              x={currentRect.x}
              y={currentRect.y}
              width={currentRect.width}
              height={currentRect.height}
              stroke={nextColor}
              strokeWidth={2}
              fill={nextColor}
              opacity={0.6}
              listening={false}
            />
          )}

          {tool === 'freehand' && isDrawing && freePoints.length >= 4 && (
            <Line
              points={freePoints}
              stroke={nextColor}
              strokeWidth={2.5}
              fill={nextColor}
              fillEnabled={freePoints.length >= 8}
              opacity={0.6}
              lineCap="round"
              lineJoin="round"
              tension={0.4}
              closed={true}
              listening={false}
            />
          )}

        </Layer>
      </Stage>
    </div>
  );
}
