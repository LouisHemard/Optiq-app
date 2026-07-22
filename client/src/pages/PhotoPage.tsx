import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPhotoById, getPhotoReviews, createReview, updatePhoto, deletePhoto, updateReview, deleteReview, toggleLike, incrementPerfect } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ReviewCanvas, type NewAnnotation, type DrawTool } from '../components/ReviewCanvas';
import { AnnotatedThumbnail } from '../components/AnnotatedThumbnail';
import type { Photo, Review } from '../types';
import {
  Camera,
  Aperture,
  CircleDot,
  Timer,
  Gauge,
  Focus,
  Loader2,
  Pencil,
  Send,
  LogIn,
  Trash2,
  X,
  Heart,
  Star,
  Check,
  User as UserIcon,
  Square,
  PenLine,
} from 'lucide-react';
import { formatShutterSpeed, EXIF_TOOLTIPS } from '../utils/exif';
import { ExifBadge } from '../components/ExifBadge';

export function PhotoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [drawMode, setDrawMode] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>('rectangle');
  const [pendingAnnotations, setPendingAnnotations] = useState<NewAnnotation[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [votedPerfect, setVotedPerfect] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const handleLike = () => {
    if (!id) return;
    setLiked((v) => !v);
    setLikesCount((c) => (liked ? c - 1 : c + 1));
    toggleLike(id).catch(() => {
      setLiked((v) => !v);
      setLikesCount((c) => (liked ? c + 1 : c - 1));
    });
  };

  const handleEditPhotoStart = () => {
    if (!photo) return;
    setEditTitle(photo.title);
    setEditDescription(photo.description ?? '');
    setEditingPhoto(true);
  };

  const handleEditPhotoSave = () => {
    if (!id || !editTitle.trim()) return;
    setSavingPhoto(true);
    updatePhoto(id, { title: editTitle.trim(), description: editDescription.trim() || undefined })
      .then((updated) => {
        setPhoto((p) => p ? { ...p, title: updated.title, description: updated.description } : p);
        setEditingPhoto(false);
      })
      .catch(() => setError('Erreur lors de la modification'))
      .finally(() => setSavingPhoto(false));
  };

  const handleEditReviewStart = (review: Review) => {
    setEditingReviewId(review.id);
    setEditContent(review.content);
  };

  const handleEditReviewSave = (reviewId: string) => {
    if (!editContent.trim()) return;
    setSavingReview(true);
    updateReview(reviewId, editContent.trim())
      .then((updated) => {
        setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, content: updated.content } : r));
        setEditingReviewId(null);
      })
      .catch(() => setError('Erreur lors de la modification'))
      .finally(() => setSavingReview(false));
  };

  const handlePerfect = () => {
    if (!id || !user || isOwner || votedPerfect) return;
    setVotedPerfect(true);
    setPerfectCount((c) => c + 1);
    incrementPerfect(id).catch((err) => {
      if (err?.response?.status === 409) return;
      setVotedPerfect(false);
      setPerfectCount((c) => c - 1);
    });
  };

  const handleDelete = () => {
    if (!id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    deletePhoto(id)
      .then(() => navigate('/'))
      .catch(() => setError('Erreur lors de la suppression'))
      .finally(() => setDeleting(false));
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getPhotoById(id), getPhotoReviews(id)])
      .then(([photoData, reviewsData]) => {
        if (!cancelled) {
          setPhoto(photoData);
          setReviews(reviewsData);
          setLiked(photoData.isLikedByMe ?? false);
          setLikesCount(photoData._count?.likes ?? 0);
          setPerfectCount(photoData.perfectCount ?? 0);
          setVotedPerfect(photoData.hasVotedPerfect ?? false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Erreur chargement');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const ANNOTATION_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899'];
  const MAX_ANNOTATIONS = ANNOTATION_COLORS.length;
  const nextColor = ANNOTATION_COLORS[pendingAnnotations.length] ?? ANNOTATION_COLORS[0];

  const handleDrawEnd = (annotation: NewAnnotation) => {
    setPendingAnnotations((prev) => {
      const updated = [...prev, annotation];
      if (updated.length >= MAX_ANNOTATIONS) setDrawMode(false);
      return updated;
    });
  };

  const handlePublish = () => {
    if (!id || !user || (!content.trim() && pendingAnnotations.length === 0)) return;
    setSubmitting(true);
    createReview({
      photoId: id,
      content: content.trim() || 'Critique visuelle',
      annotations: pendingAnnotations.map(({ type, data, color, comment }) => ({
        type,
        data,
        color: color ?? '#ff0000',
        comment,
      })),
    })
      .then((newReview) => {
        setReviews((prev) => [newReview, ...prev]);
        setContent('');
        setPendingAnnotations([]);
      })
      .catch(() => setError('Erreur lors de la publication'))
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
        <Loader2 className="w-10 h-10 text-gray-400 animate-spin" aria-hidden="true" />
        <span className="sr-only">Chargement de la photo</span>
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div className="p-6 text-red-400" role="alert">
        {error ?? 'Photo introuvable'}
      </div>
    );
  }

  const exif = [
    photo.cameraModel && { icon: Camera, label: photo.cameraModel, tooltip: EXIF_TOOLTIPS.camera },
    photo.lensModel && { icon: Aperture, label: photo.lensModel, tooltip: EXIF_TOOLTIPS.lens },
    photo.aperture != null && { icon: CircleDot, label: `f/${photo.aperture}`, tooltip: EXIF_TOOLTIPS.aperture },
    photo.shutterSpeed && { icon: Timer, label: formatShutterSpeed(photo.shutterSpeed), tooltip: EXIF_TOOLTIPS.shutterSpeed },
    photo.iso != null && { icon: Gauge, label: `ISO ${photo.iso}`, tooltip: EXIF_TOOLTIPS.iso },
    photo.focalLength != null && { icon: Focus, label: `${photo.focalLength}mm`, tooltip: EXIF_TOOLTIPS.focalLength },
  ].filter(Boolean) as { icon: typeof Camera; label: string; tooltip: { title: string; description: string } }[];

  const isOwner = user?.id === photo.userId;
  const canVotePerfect = !!user && !isOwner && !votedPerfect;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">{photo.title}</h1>
          <Link
            to={`/profile/${photo.user.id}`}
            aria-label={`Voir le profil de ${photo.user.username}`}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors"
          >
            {photo.user.avatarUrl ? (
              <img src={photo.user.avatarUrl} alt="" aria-hidden="true" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <span aria-hidden="true" className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                <UserIcon className="w-3.5 h-3.5 text-gray-500" />
              </span>
            )}
            {photo.user.username}
          </Link>
          <button
            type="button"
            onClick={handleLike}
            aria-label={liked ? "Retirer le j'aime" : 'Aimer cette photo'}
            aria-pressed={liked}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} aria-hidden="true" />
            <span aria-label={`${likesCount} j'aime`}>{likesCount}</span>
          </button>
          <button
            type="button"
            onClick={handlePerfect}
            disabled={!canVotePerfect}
            aria-label={votedPerfect ? 'Vous avez voté photo parfaite' : 'Voter pour photo parfaite'}
            aria-pressed={votedPerfect}
            title={isOwner ? 'Vous ne pouvez pas voter pour votre propre photo' : !user ? 'Connectez-vous pour voter' : votedPerfect ? 'Vous avez déjà voté' : 'Photo parfaite !'}
            className={`flex items-center gap-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 rounded disabled:cursor-not-allowed ${
              votedPerfect ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'
            }`}
          >
            <Star className={`w-5 h-5 ${votedPerfect ? 'fill-amber-400 text-amber-400' : ''}`} aria-hidden="true" />
            <span>{perfectCount}</span>
          </button>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEditPhotoStart}
              aria-label="Modifier le titre et la description"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
              Modifier
            </button>
            <button
              type="button"
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
              disabled={deleting}
              aria-label={confirmDelete ? 'Confirmer la suppression de la photo' : 'Supprimer la photo'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                confirmDelete
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-gray-800 text-red-400 hover:bg-gray-700'
              } disabled:opacity-50`}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              )}
              {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
            </button>
          </div>
        )}
      </div>

      {editingPhoto && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleEditPhotoSave(); }}
          className="rounded-xl bg-gray-800/80 border border-indigo-500/40 p-4 mb-6 space-y-3"
        >
          <div>
            <label htmlFor="edit-title" className="block text-xs font-medium text-gray-400 mb-1">Titre</label>
            <input
              id="edit-title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-desc" className="block text-xs font-medium text-gray-400 mb-1">Description (optionnel)</label>
            <textarea
              id="edit-desc"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={savingPhoto || !editTitle.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {savingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setEditingPhoto(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">
              {drawMode
                ? `Dessinez un rectangle (${pendingAnnotations.length}/${MAX_ANNOTATIONS})`
                : 'Cliquez sur "Mode dessin" pour annoter'}
            </span>
            <div className="flex items-center gap-3">
              {drawMode && (
                <div
                  role="radiogroup"
                  aria-label="Outil de dessin"
                  className="flex items-center gap-1 rounded-lg bg-gray-900 border border-gray-700 p-1"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={drawTool === 'rectangle'}
                    onClick={() => setDrawTool('rectangle')}
                    aria-label="Outil rectangle"
                    title="Rectangle"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      drawTool === 'rectangle'
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5" aria-hidden="true" />
                    Rectangle
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={drawTool === 'freehand'}
                    onClick={() => setDrawTool('freehand')}
                    aria-label="Outil forme libre"
                    title="Forme libre"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      drawTool === 'freehand'
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
                    Forme libre
                  </button>
                </div>
              )}
              <div
                className="flex items-center gap-1.5"
                role="list"
                aria-label="Annotations en cours"
              >
                  {pendingAnnotations.map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      role="listitem"
                      aria-label={`Supprimer l'annotation ${i + 1}`}
                      title="Supprimer cette annotation"
                      onClick={() => setPendingAnnotations((prev) => prev.filter((_, idx) => idx !== i))}
                      className="w-3.5 h-3.5 rounded-full border-2 border-gray-500 hover:border-white hover:scale-125 transition-all cursor-pointer relative group/dot focus:outline-none focus:ring-2 focus:ring-white"
                      style={{ backgroundColor: a.color }}
                    >
                      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/dot:opacity-100 text-white text-[8px] font-bold leading-none">
                        ×
                      </span>
                    </button>
                  ))}
                  {pendingAnnotations.length < MAX_ANNOTATIONS && (
                    <span
                      aria-hidden="true"
                      className="w-3.5 h-3.5 rounded-full border border-dashed border-gray-500 bg-gray-800"
                      style={{ borderColor: ANNOTATION_COLORS[pendingAnnotations.length] + '80' }}
                    />
                  )}
                </div>
              <button
                type="button"
                onClick={() => setDrawMode((v) => !v)}
                disabled={!drawMode && pendingAnnotations.length >= MAX_ANNOTATIONS}
                aria-pressed={drawMode}
                aria-label={drawMode ? 'Désactiver le mode dessin' : 'Activer le mode dessin'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  drawMode
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Pencil className="w-4 h-4" aria-hidden="true" />
                Mode dessin
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <ReviewCanvas
              imageUrl={photo.imageUrl}
              authorUsername={photo.user.username}
              pendingAnnotations={pendingAnnotations}
              nextColor={nextColor}
              tool={drawTool}
              onDrawEnd={drawMode ? handleDrawEnd : undefined}
            />
          </div>
        </div>

        <div className="space-y-6">
          {exif.length > 0 && (
            <div className="rounded-xl bg-gray-800/80 border border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">EXIF</h2>
              <div className="flex flex-wrap gap-2">
                {exif.map(({ icon, label, tooltip }, i) => (
                  <ExifBadge key={i} icon={icon} label={label} tooltip={tooltip} />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-gray-800/80 border border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Critiques</h2>
            <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune critique pour l'instant.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="group rounded-lg bg-gray-700/40 p-3">
                    {editingReviewId === review.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          autoFocus
                          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-indigo-500/50 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditReviewSave(review.id)}
                            disabled={savingReview || !editContent.trim()}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                          >
                            {savingReview ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingReviewId(null)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-600 text-gray-300 text-xs font-medium hover:bg-gray-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-sm">{review.content}</p>
                          <Link
                            to={`/profile/${review.userId}`}
                            className="text-gray-500 text-xs mt-1 inline-block hover:text-indigo-400 transition-colors"
                          >
                            — {review.author.username}
                          </Link>
                        </div>
                        {user?.id === review.userId && (
                          <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              aria-label="Modifier cette critique"
                              title="Modifier cette critique"
                              onClick={() => handleEditReviewStart(review)}
                              className="p-1 rounded text-gray-500 hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label="Supprimer cette critique"
                              title="Supprimer cette critique"
                              onClick={() => {
                                deleteReview(review.id).then(() =>
                                  setReviews((prev) => prev.filter((r) => r.id !== review.id)),
                                );
                              }}
                              className="p-1 rounded text-gray-500 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400"
                            >
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {editingReviewId !== review.id && review.annotations.length > 0 && (
                      <div className="mt-2 max-w-[12rem]">
                        <AnnotatedThumbnail imageUrl={photo.imageUrl} annotations={review.annotations} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl bg-gray-800/80 border border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Ajouter une critique</h2>
            {user ? (
              <>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Commentaire global..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                />
                {pendingAnnotations.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    {pendingAnnotations.length} annotation(s) en attente
                  </p>
                )}
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={submitting || (!content.trim() && pendingAnnotations.length === 0)}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publier la Review
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors text-sm"
              >
                <LogIn className="w-4 h-4" />
                Connectez-vous pour critiquer
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
