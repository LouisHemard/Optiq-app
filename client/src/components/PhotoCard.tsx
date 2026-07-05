import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, CircleDot, Timer, Gauge, Focus, MessageCircle, Aperture, Heart } from 'lucide-react';
import { toggleLike } from '../services/api';
import { formatShutterSpeed, EXIF_TOOLTIPS } from '../utils/exif';
import { ExifBadge } from './ExifBadge';
import type { Photo } from '../types';

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIj48cmVjdCBmaWxsPSIjMzc0MTUxIiB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjI0Ij5QaG90byBPcHRpcTwvdGV4dD48L3N2Zz4=';

interface PhotoCardProps {
  photo: Photo;
}

export function PhotoCard({ photo }: PhotoCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [liked, setLiked] = useState(photo.isLikedByMe ?? false);
  const [likesCount, setLikesCount] = useState(photo._count?.likes ?? 0);

  const goToProfile = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/profile/${photo.user.id}`);
  };

  const handleLike = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked((v) => !v);
    setLikesCount((c) => (liked ? c - 1 : c + 1));
    toggleLike(photo.id).catch(() => {
      setLiked((v) => !v);
      setLikesCount((c) => (liked ? c + 1 : c - 1));
    });
  };
  const exif = [
    photo.cameraModel && { icon: Camera, label: photo.cameraModel, tooltip: EXIF_TOOLTIPS.camera },
    photo.lensModel && { icon: Aperture, label: photo.lensModel, tooltip: EXIF_TOOLTIPS.lens },
    photo.aperture != null && { icon: CircleDot, label: `f/${photo.aperture}`, tooltip: EXIF_TOOLTIPS.aperture },
    photo.shutterSpeed && { icon: Timer, label: formatShutterSpeed(photo.shutterSpeed), tooltip: EXIF_TOOLTIPS.shutterSpeed },
    photo.iso != null && { icon: Gauge, label: `ISO ${photo.iso}`, tooltip: EXIF_TOOLTIPS.iso },
    photo.focalLength != null && { icon: Focus, label: `${photo.focalLength}mm`, tooltip: EXIF_TOOLTIPS.focalLength },
  ].filter(Boolean) as { icon: typeof Camera; label: string; tooltip: { title: string; description: string } }[];

  return (
    <Link
      to={`/photo/${photo.id}`}
      aria-label={`Voir la photo « ${photo.title} » de ${photo.user.username}`}
      className="group flex flex-col h-full rounded-xl overflow-hidden bg-gray-800/80 border border-gray-700 hover:border-gray-500 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div className="aspect-[4/3] bg-gray-900 overflow-hidden flex items-center justify-center">
        <img
          src={imgError ? PLACEHOLDER_IMAGE : photo.imageUrl}
          alt={imgError ? `Image indisponible pour la photo « ${photo.title} »` : photo.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImgError(true)}
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <h3 className="font-semibold text-white truncate mb-1">{photo.title}</h3>
          {photo.description && (
            <p className="text-sm text-gray-400 line-clamp-2 mb-3">{photo.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {exif.map(({ icon, label, tooltip }, i) => (
              <ExifBadge key={i} icon={icon} label={label} tooltip={tooltip} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
          <span
            role="link"
            tabIndex={0}
            aria-label={`Voir le profil de ${photo.user.username}`}
            onClick={goToProfile}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToProfile(e as unknown as MouseEvent);
              }
            }}
            className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          >
            {photo.user.avatarUrl ? (
              <img
                src={photo.user.avatarUrl}
                alt=""
                aria-hidden="true"
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-gray-400 font-medium"
              >
                {photo.user.username.charAt(0).toUpperCase()}
              </span>
            )}
            {photo.user.username}
          </span>
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLike}
              aria-label={liked ? "Retirer le j'aime" : "Aimer cette photo"}
              aria-pressed={liked}
              className="flex items-center gap-1 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
            >
              <Heart
                className={`w-3.5 h-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`}
                aria-hidden="true"
              />
              <span aria-label={`${likesCount} j'aime`}>{likesCount}</span>
            </button>
            <span className="flex items-center gap-1" aria-label={`${photo._count?.reviews ?? 0} critiques`}>
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              {photo._count?.reviews ?? 0}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
