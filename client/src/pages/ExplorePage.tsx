import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getExplorePhotos, searchUsers } from '../services/api';
import { PhotoCard } from '../components/PhotoCard';
import type { Photo, User } from '../types';
import { Loader2, Trophy, Search, User as UserIcon } from 'lucide-react';

export function ExplorePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getExplorePhotos()
      .then((data) => {
        if (!cancelled) setPhotos(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Erreur lors du chargement');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchUsers(query.trim())
        .then((data) => {
          setResults(data);
          setShowResults(true);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="p-6">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-yellow-400" aria-hidden="true" />
          <h1 className="text-3xl font-bold text-white">Meilleures photos de la semaine</h1>
          <Trophy className="w-8 h-8 text-yellow-400" aria-hidden="true" />
        </div>
        <p className="text-gray-400 text-sm">
          Les photos les plus appréciées de ces 7 derniers jours.
        </p>
      </div>

      <div className="max-w-md mx-auto mb-10" ref={searchRef}>
        <div className="relative" role="search">
          <label htmlFor="user-search" className="sr-only">
            Rechercher un photographe
          </label>
          <Search
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
          />
          <input
            id="user-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowResults(true); }}
            placeholder="Trouver un photographe..."
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-expanded={showResults}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          {searching && (
            <>
              <Loader2
                aria-hidden="true"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin"
              />
              <span className="sr-only" role="status">Recherche en cours</span>
            </>
          )}
        </div>

        {showResults && (
          <div
            id="search-results"
            role="listbox"
            aria-label="Suggestions de photographes"
            className="absolute mt-1 w-full max-w-md rounded-xl bg-gray-800 border border-gray-700 shadow-2xl shadow-black/40 overflow-hidden z-50"
          >
            {results.length === 0 ? (
              <p className="text-gray-500 text-sm px-4 py-3" role="status">Aucun résultat</p>
            ) : (
              results.map((u) => (
                <Link
                  key={u.id}
                  to={`/profile/${u.id}`}
                  role="option"
                  aria-selected="false"
                  aria-label={`Voir le profil de ${u.username}`}
                  onClick={() => { setShowResults(false); setQuery(''); }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/60 transition-colors focus:outline-none focus:bg-gray-700/60"
                >
                  {u.avatarUrl ? (
                    <img
                      src={u.avatarUrl}
                      alt=""
                      aria-hidden="true"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div aria-hidden="true" className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                  <span className="text-sm text-white font-medium">{u.username}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-live="polite">
          <Loader2 className="w-10 h-10 text-gray-400 animate-spin" aria-hidden="true" />
          <span className="sr-only">Chargement du tableau d'honneur</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-[40vh]" role="alert">
          <p className="text-red-400">{error}</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-gray-400">Aucune photo pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo, i) => (
            <div key={photo.id} className="relative">
              {i < 3 && (
                <div
                  aria-label={`Classée ${i + 1}${i === 0 ? 're' : 'e'} de la semaine`}
                  className="absolute -top-3 -left-3 z-10 w-8 h-8 rounded-full bg-yellow-500 text-black font-bold text-sm flex items-center justify-center shadow-lg"
                >
                  {i + 1}
                </div>
              )}
              <PhotoCard photo={photo} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
