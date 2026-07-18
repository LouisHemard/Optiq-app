import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Check, User as UserIcon } from 'lucide-react';
import { getUserSuggestions, toggleFollow, type SuggestedUser } from '../services/api';

export function SuggestedUsers() {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  useEffect(() => {
    getUserSuggestions().then(setSuggestions).catch(() => {});
  }, []);

  if (suggestions.length === 0) return null;

  const handleFollow = (userId: string) => {
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    toggleFollow(userId).catch(() => {
      setFollowed((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });
    });
  };

  return (
    <div className="rounded-xl bg-gray-800/80 border border-gray-700 p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Suggestions
      </h2>
      <ul className="space-y-3">
        {suggestions.map((user) => {
          const isFollowed = followed.has(user.id);
          return (
            <li key={user.id} className="flex items-center gap-3">
              <Link to={`/profile/${user.id}`} className="shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </Link>
              <Link
                to={`/profile/${user.id}`}
                className="flex-1 min-w-0 text-sm font-medium text-white hover:text-indigo-400 transition-colors truncate"
              >
                {user.username}
              </Link>
              <button
                type="button"
                onClick={() => handleFollow(user.id)}
                aria-label={isFollowed ? `Se désabonner de ${user.username}` : `Suivre ${user.username}`}
                className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isFollowed
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                {isFollowed ? (
                  <><Check className="w-3 h-3" /> Suivi</>
                ) : (
                  <><UserPlus className="w-3 h-3" /> Suivre</>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
