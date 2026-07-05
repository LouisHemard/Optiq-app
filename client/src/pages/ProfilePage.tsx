import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProfile, toggleFollow } from '../services/api';
import type { UserProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PhotoCard } from '../components/PhotoCard';
import {
  Loader2,
  Settings,
  UserPlus,
  UserMinus,
  Clock,
  Lock,
  Camera,
  Users,
  User as UserIcon,
} from 'lucide-react';

type FollowState = 'none' | 'following' | 'requested';

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followState, setFollowState] = useState<FollowState>('none');
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProfile(id)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          if (data.isFollowing) setFollowState('following');
          else if (data.hasPendingRequest) setFollowState('requested');
          else setFollowState('none');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Utilisateur introuvable');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const handleFollow = () => {
    if (!id) return;
    setFollowLoading(true);

    toggleFollow(id)
      .then((res) => {
        switch (res.status) {
          case 'following':
            setFollowState('following');
            break;
          case 'requested':
            setFollowState('requested');
            break;
          case 'request_cancelled':
          case 'unfollowed':
            setFollowState('none');
            break;
        }
      })
      .catch(() => {})
      .finally(() => setFollowLoading(false));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
        <Loader2 className="w-10 h-10 text-gray-400 animate-spin" aria-hidden="true" />
        <span className="sr-only">Chargement du profil</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 text-center" role="alert">
        <p className="text-red-400">{error ?? 'Utilisateur introuvable'}</p>
      </div>
    );
  }

  const isOwner = profile.isOwner;
  const canSeePhotos = !profile.isPrivate || isOwner || followState === 'following';

  const followButton = (() => {
    if (isOwner) {
      return (
        <Link
          to="/settings"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-700 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
          Modifier le profil
        </Link>
      );
    }
    if (!currentUser) return null;

    switch (followState) {
      case 'following':
        return (
          <button
            type="button"
            onClick={handleFollow}
            disabled={followLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm font-medium hover:bg-red-900/30 hover:text-red-400 hover:border-red-800 transition-colors disabled:opacity-50"
          >
            <UserMinus className="w-4 h-4" />
            Abonné
          </button>
        );
      case 'requested':
        return (
          <button
            type="button"
            onClick={handleFollow}
            disabled={followLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-400 text-sm font-medium hover:bg-amber-900/50 transition-colors disabled:opacity-50"
          >
            <Clock className="w-4 h-4" />
            En attente
          </button>
        );
      default:
        return (
          <button
            type="button"
            onClick={handleFollow}
            disabled={followLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            S'abonner
          </button>
        );
    }
  })();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-start gap-6 mb-10">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={`Photo de profil de ${profile.username}`}
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-700 shrink-0"
          />
        ) : (
          <div
            role="img"
            aria-label={`${profile.username} n'a pas défini de photo de profil`}
            className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center shrink-0"
          >
            <UserIcon className="w-12 h-12 text-gray-500" aria-hidden="true" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
            {profile.isPrivate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 text-xs">
                <Lock className="w-3 h-3" />
                Privé
              </span>
            )}
          </div>

          {profile.bio && (
            <p className="text-gray-400 text-sm mb-4 max-w-md">{profile.bio}</p>
          )}

          <div className="flex items-center gap-6 text-sm text-gray-400 mb-4">
            <span className="flex items-center gap-1.5">
              <Camera className="w-4 h-4" />
              <strong className="text-white">{profile._count.photos}</strong> photos
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <strong className="text-white">{profile._count.followers}</strong> abonnés
            </span>
            <span className="flex items-center gap-1.5">
              <strong className="text-white">{profile._count.following}</strong> abonnements
            </span>
          </div>

          <div className="flex items-center gap-3">
            {followButton}
          </div>
        </div>
      </div>

      {canSeePhotos ? (
        profile.photos.length === 0 ? (
          <p className="text-gray-500 text-center py-12">Aucune photo pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} />
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-16">
          <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium mb-1">Ce compte est privé</p>
          <p className="text-gray-500 text-sm">Abonnez-vous pour voir ses photos.</p>
        </div>
      )}
    </div>
  );
}
