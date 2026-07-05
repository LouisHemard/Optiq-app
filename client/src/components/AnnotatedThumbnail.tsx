import type { Annotation } from '../types';

interface AnnotatedThumbnailProps {
  imageUrl: string;
  annotations: Annotation[];
}

export function AnnotatedThumbnail({ imageUrl, annotations }: AnnotatedThumbnailProps) {
  const hasAny = annotations.length > 0;
  if (!hasAny) return null;

  const rects = annotations.filter((a) => a.type === 'rectangle');
  const freehand = annotations.filter((a) => a.type === 'freehand');

  const total = rects.length + freehand.length;

  return (
    <figure
      role="img"
      aria-label={`Miniature de la photo avec ${total} annotation${total > 1 ? 's' : ''} du critique`}
      className="relative overflow-hidden rounded-md border border-gray-600 m-0"
    >
      <img src={imageUrl} className="w-full h-auto block" alt="" aria-hidden="true" />

      {rects.map((ann, i) => {
        const d = ann.data as { x?: number; y?: number; width?: number; height?: number };
        return (
          <div
            key={ann.id ?? `r-${i}`}
            className="absolute pointer-events-none"
            style={{
              border: `2px solid ${ann.color || '#ff0000'}`,
              backgroundColor: `${ann.color || '#ff0000'}40`,
              left: `${(d.x ?? 0) * 100}%`,
              top: `${(d.y ?? 0) * 100}%`,
              width: `${(d.width ?? 0) * 100}%`,
              height: `${(d.height ?? 0) * 100}%`,
            }}
          />
        );
      })}

      {freehand.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
        >
          {freehand.map((ann, i) => {
            const d = ann.data as { points?: number[] };
            const pts = d.points ?? [];
            if (pts.length < 4) return null;
            const svgPoints = [];
            for (let j = 0; j < pts.length - 1; j += 2) {
              svgPoints.push(`${pts[j]},${pts[j + 1]}`);
            }
              return (
              <polygon
                key={ann.id ?? `f-${i}`}
                points={svgPoints.join(' ')}
                fill={ann.color || '#ff0000'}
                fillOpacity={0.25}
                stroke={ann.color || '#ff0000'}
                strokeWidth="0.004"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>
      )}
    </figure>
  );
}
