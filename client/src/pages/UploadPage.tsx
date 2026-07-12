import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { uploadPhoto } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { POPULAR_CAMERAS } from '../constants/cameras';
import { Loader2, Upload, ImageIcon, LogIn } from 'lucide-react';

export function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [customCamera, setCustomCamera] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <h2 className="text-xl font-bold text-white mb-4">Connexion requise</h2>
        <p className="text-gray-400 mb-6">Vous devez être connecté pour publier une photo.</p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/login"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Se connecter
          </Link>
          <Link
            to="/register"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-700 text-white font-medium hover:bg-gray-600 transition-colors"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      setError('Veuillez sélectionner une image et renseigner un titre.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    if (description.trim()) formData.append('description', description.trim());

    if (selectedCamera === 'OTHER' && customCamera.trim()) {
      formData.append('cameraModel', customCamera.trim());
    } else if (selectedCamera && selectedCamera !== 'OTHER') {
      formData.append('cameraModel', selectedCamera);
    }

    uploadPhoto(formData)
      .then(() => navigate('/'))
      .catch((err) => {
        setError(err.response?.data?.message ?? err.message ?? "Erreur lors de l'upload");
        setSubmitting(false);
      });
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
        <Upload className="w-7 h-7" />
        Nouvelle photo
      </h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-gray-800/80 border border-gray-700 p-6 space-y-6"
      >
        {error && (
          <p className="text-red-400 text-sm" role="alert">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="file-input" className="block text-sm font-medium text-gray-300 mb-2">
            Image (JPEG ou PNG) *
          </label>
          <label
            htmlFor="file-input"
            className="flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-gray-600 hover:border-gray-500 focus-within:border-indigo-500 bg-gray-900/50 cursor-pointer transition-colors"
          >
            <input
              id="file-input"
              type="file"
              accept="image/jpeg, image/png"
              required
              aria-describedby="file-help"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <span className="text-gray-300">{file.name}</span>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-gray-500 mb-2" aria-hidden="true" />
                <span className="text-gray-500 text-sm">Cliquez ou glissez une image</span>
              </>
            )}
          </label>
          <p id="file-help" className="sr-only">
            Formats acceptés : JPEG ou PNG. Taille maximum 50 Mo.
          </p>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
            Titre *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Coucher de soleil sur le port"
            required
            className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Description (optionnel)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexte, lieu, intention..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label htmlFor="camera" className="block text-sm font-medium text-gray-300 mb-2">
            Appareil photo
          </label>
          <select
            id="camera"
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent appearance-none"
          >
            <option value="">Sélectionner un appareil...</option>
            {POPULAR_CAMERAS.map((cam) => (
              <option key={cam} value={cam}>{cam}</option>
            ))}
            <option value="OTHER">Autre appareil (préciser)...</option>
          </select>
          {selectedCamera === 'OTHER' && (
            <input
              type="text"
              value={customCamera}
              onChange={(e) => setCustomCamera(e.target.value)}
              placeholder="Nom de votre appareil..."
              className="mt-3 w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !file || !title.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-700 text-white font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Extraction des EXIFs et Upload en cours...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Publier la photo
            </>
          )}
        </button>
      </form>
    </div>
  );
}
