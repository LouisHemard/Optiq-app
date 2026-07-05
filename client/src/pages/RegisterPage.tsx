import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createUser } from '../services/api';
import { Loader2, UserPlus, LogIn } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !username.trim() || !password.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await createUser({ email: email.trim(), username: username.trim(), password });
      await loginUser(email.trim(), password);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? 'Erreur lors de la création du compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Créer un compte</h1>
        <p className="text-gray-400">Rejoignez la communauté de photographes</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-gray-800/80 border border-gray-700 p-6 space-y-5"
      >
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300 mb-1.5">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label htmlFor="reg-username" className="block text-sm font-medium text-gray-300 mb-1.5">
            Nom d'utilisateur
          </label>
          <input
            id="reg-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="photographe"
            required
            autoComplete="username"
            className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300 mb-1.5">
            Mot de passe
          </label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim() || !username.trim() || !password.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="w-5 h-5" aria-hidden="true" />
          )}
          Créer mon compte
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-500 text-sm">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            <LogIn className="w-4 h-4 inline-block mr-1" />
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
