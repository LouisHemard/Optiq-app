import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    forgotPassword(email.trim())
      .then(() => setSent(true))
      .catch(() => setError('Une erreur est survenue. Réessayez.'))
      .finally(() => setLoading(false));
  };

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
        <h1 className="text-3xl font-bold text-white mb-2">Mot de passe oublié</h1>
        <p className="text-gray-400">
          Entrez votre email et nous vous enverrons un lien de réinitialisation.
        </p>
      </div>

      {sent ? (
        <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-6 text-center">
          <Mail className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-green-400 font-medium mb-1">Email envoyé !</p>
          <p className="text-gray-400 text-sm">
            Si un compte existe avec cette adresse, vous recevrez un lien valable <strong className="text-gray-300">1 heure</strong>.
          </p>
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
            <label htmlFor="fp-email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <input
              id="fp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
            Envoyer le lien
          </button>
        </form>
      )}
    </div>
  );
}
