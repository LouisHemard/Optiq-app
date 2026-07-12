import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { Photo } from '../types';

interface Props {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Lightbox({ photos, index, onClose, onPrev, onNext }: Props) {
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo : ${photo.title}`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer la lightbox"
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/80 text-white hover:bg-gray-700 transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {photos.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Photo précédente"
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-800/80 text-white hover:bg-gray-700 transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      <div
        className="flex flex-col items-center gap-4 max-w-4xl w-full px-16 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.imageUrl}
          alt={photo.title}
          className="max-h-[75vh] max-w-full object-contain rounded-lg"
        />
        <div className="flex items-center justify-between w-full">
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{photo.title}</p>
            {photo.description && (
              <p className="text-gray-400 text-sm mt-0.5 truncate">{photo.description}</p>
            )}
          </div>
          <Link
            to={`/photos/${photo.id}`}
            onClick={onClose}
            className="shrink-0 ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Voir la photo
          </Link>
        </div>
        {photos.length > 1 && (
          <p className="text-gray-500 text-xs">{index + 1} / {photos.length}</p>
        )}
      </div>

      {photos.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Photo suivante"
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-800/80 text-white hover:bg-gray-700 transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
