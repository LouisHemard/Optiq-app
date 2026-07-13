import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="mb-8">
        <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="mx-auto mb-6 opacity-40">
          <circle cx="40" cy="40" r="26" fill="none" stroke="#4F46E5" strokeWidth="3"/>
          <circle cx="40" cy="40" r="16" fill="none" stroke="#818CF8" strokeWidth="2"/>
          <circle cx="40" cy="40" r="5" fill="#4F46E5"/>
          <line x1="40" y1="14" x2="40" y2="24" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round"/>
          <line x1="40" y1="56" x2="40" y2="66" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round"/>
          <line x1="14" y1="40" x2="24" y2="40" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round"/>
          <line x1="56" y1="40" x2="66" y2="40" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <p className="text-8xl font-bold text-indigo-500 mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-3">Page introuvable</h1>
        <p className="text-gray-400 max-w-sm">
          Cette page n'existe pas ou a été déplacée.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          Accueil
        </Link>
        <Link
          to="/explore"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors text-sm"
        >
          <Search className="w-4 h-4" />
          Explorer
        </Link>
      </div>
    </div>
  );
}
