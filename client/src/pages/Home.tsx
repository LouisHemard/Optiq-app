import { useState, useEffect, useCallback, useRef } from 'react';
import { getFeed, FEED_LIMIT } from '../services/api';
import { PhotoCard } from '../components/PhotoCard';
import { SuggestedUsers } from '../components/SuggestedUsers';
import { useAuth } from '../context/AuthContext';
import type { Photo } from '../types';
import { Loader2, SlidersHorizontal, Search, X } from 'lucide-react';

export function Home() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [cameraModel, setCameraModel] = useState('');
  const [lensModel, setLensModel] = useState('');
  const [minIso, setMinIso] = useState('');
  const [maxIso, setMaxIso] = useState('');

  const activeFiltersRef = useRef<Record<string, string>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (p: number, filters: Record<string, string>, append: boolean) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const params: Record<string, string | number> = { ...filters, page: p, limit: FEED_LIMIT };
      const data = await getFeed(params);
      setPhotos((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === FEED_LIMIT);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Erreur lors du chargement du feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1, {}, false);
  }, [loadPage]);

  useEffect(() => {
    if (page === 1) return;
    loadPage(page, activeFiltersRef.current, true);
  }, [page, loadPage]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  const handleSearch = () => {
    const filters: Record<string, string> = {};
    if (cameraModel.trim()) filters.cameraModel = cameraModel.trim();
    if (lensModel.trim()) filters.lensModel = lensModel.trim();
    if (minIso.trim()) filters.minIso = minIso.trim();
    if (maxIso.trim()) filters.maxIso = maxIso.trim();
    activeFiltersRef.current = filters;
    setPage(1);
    loadPage(1, filters, false);
  };

  const handleReset = () => {
    setCameraModel('');
    setLensModel('');
    setMinIso('');
    setMaxIso('');
    activeFiltersRef.current = {};
    setPage(1);
    loadPage(1, {}, false);
  };

  const hasActiveFilters = cameraModel || lensModel || minIso || maxIso;

  return (
    <div className="flex h-[calc(100vh-65px)]">
      {/* Colonne gauche — feed scrollable (65%) */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="filters-panel"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filtersOpen || hasActiveFilters
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            Filtres avancés
            {hasActiveFilters && (
              <span aria-label="Filtres actifs" className="ml-1 w-2 h-2 rounded-full bg-white" />
            )}
          </button>

          {filtersOpen && (
            <div
              id="filters-panel"
              role="region"
              aria-label="Filtres de recherche"
              className="mt-3 rounded-xl bg-gray-800/80 border border-gray-700 p-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="filter-camera" className="block text-xs text-gray-400 mb-1">Boîtier</label>
                  <input
                    id="filter-camera"
                    type="text"
                    value={cameraModel}
                    onChange={(e) => setCameraModel(e.target.value)}
                    placeholder="Canon EOS R5..."
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="filter-lens" className="block text-xs text-gray-400 mb-1">Objectif</label>
                  <input
                    id="filter-lens"
                    type="text"
                    value={lensModel}
                    onChange={(e) => setLensModel(e.target.value)}
                    placeholder="RF 50mm..."
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="filter-iso-min" className="block text-xs text-gray-400 mb-1">ISO min</label>
                  <input
                    id="filter-iso-min"
                    type="number"
                    value={minIso}
                    onChange={(e) => setMinIso(e.target.value)}
                    placeholder="100"
                    min={0}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="filter-iso-max" className="block text-xs text-gray-400 mb-1">ISO max</label>
                  <input
                    id="filter-iso-max"
                    type="number"
                    value={maxIso}
                    onChange={(e) => setMaxIso(e.target.value)}
                    placeholder="6400"
                    min={0}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                  Rechercher
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-live="polite">
            <Loader2 className="w-10 h-10 text-gray-400 animate-spin" aria-hidden="true" />
            <span className="sr-only">Chargement des photos</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-[40vh]" role="alert">
            <p className="text-red-400">{error}</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <p className="text-gray-400">
              {hasActiveFilters ? 'Aucune photo ne correspond à ces filtres.' : 'Aucune photo pour le moment.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-6 max-w-xl mx-auto">
              {photos.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} />
              ))}
            </div>

            <div ref={sentinelRef} className="flex items-center justify-center py-8">
              {loadingMore && (
                <>
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Chargement de la suite</span>
                </>
              )}
              {!hasMore && photos.length > 0 && (
                <p className="text-gray-600 text-sm">Vous avez tout vu !</p>
              )}
            </div>
          </>
        )}
        </div>
      </div>

      {/* Colonne droite — ne scroll PAS, hauteur = viewport - navbar */}
      {user && (
        <aside className="hidden lg:flex w-[35%] flex-shrink-0 border-l border-gray-800 px-6 py-6 overflow-y-auto">
          <div className="w-full">
            <SuggestedUsers />
          </div>
        </aside>
      )}
    </div>
  );
}
