import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateMe, getProfile } from '../services/api';
import { Loader2, Settings, LogIn, Save, User as UserIcon } from 'lucide-react';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id)
      .then((profile) => {
        setAvatarUrl(profile.avatarUrl ?? '');
        setBio(profile.bio ?? '');
        setIsPrivate(profile.isPrivate);
      })
      .catch(() => setError('Impossible de charger le profil'))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <h2 className="text-xl font-bold text-white mb-4">Connexion requise</h2>
        <p className="text-gray-400 mb-6">Vous devez être connecté pour accéder aux paramètres.</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
        >
          <LogIn className="w-5 h-5" />
          Se connecter
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    updateMe({
      avatarUrl: avatarUrl.trim() || undefined,
      bio: bio.trim() || undefined,
      isPrivate,
    })
      .then((updated) => {
        updateUser({ avatarUrl: updated.avatarUrl });
        setSuccess(true);
        setTimeout(() => navigate(`/profile/${user.id}`), 800);
      })
      .catch(() => setError('Erreur lors de la sauvegarde'))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
        <Settings className="w-7 h-7" />
        Paramètres du profil
      </h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-gray-800/80 border border-gray-700 p-6 space-y-6"
      >
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">Modifications enregistrées !</p>}

        <div>
          <label htmlFor="avatar" className="block text-sm font-medium text-gray-300 mb-2">
            Photo de profil (URL)
          </label>
          <input
            id="avatar"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://exemple.com/mon-avatar.jpg"
            className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <div className="mt-3 flex items-center gap-3">
            {avatarUrl.trim() ? (
              <img
                src={avatarUrl}
                alt="Aperçu de votre photo de profil"
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}
              />
            ) : (
              <div
                role="img"
                aria-label="Aucune photo de profil définie"
                className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center"
              >
                <UserIcon className="w-8 h-8 text-gray-500" aria-hidden="true" />
              </div>
            )}
            <span className="text-xs text-gray-500" aria-hidden="true">Aperçu en direct</span>
          </div>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Quelques mots sur vous, votre style photo..."
            rows={4}
            maxLength={300}
            className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-1 text-right">{bio.length}/300</p>
        </div>

        <div>
          <span id="privacy-label" className="block text-sm font-medium text-gray-300 mb-3">
            Confidentialité
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            aria-labelledby="privacy-label"
            aria-describedby="privacy-desc"
            onClick={() => setIsPrivate((v) => !v)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <div
              aria-hidden="true"
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isPrivate ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  isPrivate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
            <div className="text-left">
              <p className="text-sm text-white font-medium">
                {isPrivate ? 'Profil privé' : 'Profil public'}
              </p>
              <p id="privacy-desc" className="text-xs text-gray-500">
                {isPrivate
                  ? 'Seuls vos abonnés peuvent voir vos photos'
                  : 'Tout le monde peut voir vos photos'}
              </p>
            </div>
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  );
}
