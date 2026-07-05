import { useState, useEffect, useCallback } from 'react';
import { getFeed } from '../services/api';
import { PhotoCard } from '../components/PhotoCard';
import type { Photo } from '../types';
import { Loader2, SlidersHorizontal, Search, X } from 'lucide-react';

export function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [cameraModel, setCameraModel] = useState('');
  const [lensModel, setLensModel] = useState('');
  const [minIso, setMinIso] = useState('');
  const [maxIso, setMaxIso] = useState('');

  const fetchPhotos = useCallback((params?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    getFeed(params)
      .then(setPhotos)
      .catch((err) => setError(err.message ?? 'Erreur lors du chargement du feed'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleSearch = () => {
    const params: Record<string, string> = {};
    if (cameraModel.trim()) params.cameraModel = cameraModel.trim();
    if (lensModel.trim()) params.lensModel = lensModel.trim();
    if (minIso.trim()) params.minIso = minIso.trim();
    if (maxIso.trim()) params.maxIso = maxIso.trim();
    fetchPhotos(Object.keys(params).length > 0 ? params : undefined);
  };

  const handleReset = () => {
    setCameraModel('');
    setLensModel('');
    setMinIso('');
    setMaxIso('');
    fetchPhotos();
  };

  const hasActiveFilters = cameraModel || lensModel || minIso || maxIso;

  return (
    <div className="p-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>
      )}
    </div>
  );
}
