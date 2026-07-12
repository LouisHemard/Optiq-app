import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/api';
import { Loader2, Lock, ArrowLeft, CheckCircle } from 'lucide-react';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    resetPassword(token, newPassword)
      .then(() => {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2500);
      })
      .catch((err) =>
        setError(err.response?.data?.message ?? 'Lien invalide ou expiré.')
      )
      .finally(() => setLoading(false));
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <p className="text-red-400">Lien invalide.</p>
        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à la connexion
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Nouveau mot de passe</h1>
        <p className="text-gray-400">Choisissez un nouveau mot de passe pour votre compte.</p>
      </div>

      {success ? (
        <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-6 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-green-400 font-medium">Mot de passe modifié !</p>
          <p className="text-gray-400 text-sm mt-1">Redirection vers la connexion…</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-gray-800/80 border border-gray-700 p-6 space-y-5"
        >
          {error && (
            <p className="text-red-400 text-sm" role="alert">{error}</p>
          )}
          <div>
            <label htmlFor="rp-password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Nouveau mot de passe
            </label>
            <input
              id="rp-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="rp-confirm" className="block text-sm font-medium text-gray-300 mb-1.5">
              Confirmer le mot de passe
            </label>
            <input
              id="rp-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !newPassword || !confirm}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
            Réinitialiser le mot de passe
          </button>
        </form>
      )}
    </div>
  );
}
