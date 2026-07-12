import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      {status === 'loading' && (
        <>
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Vérification en cours…</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Email vérifié !</h1>
          <p className="text-gray-400 mb-6">Votre adresse email a bien été confirmée.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
          >
            Retour à l'accueil
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Lien invalide</h1>
          <p className="text-gray-400 mb-6">Ce lien est invalide ou a expiré (24h).</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-700 text-white font-medium hover:bg-gray-600 transition-colors"
          >
            Retour à l'accueil
          </Link>
        </>
      )}
    </div>
  );
}
