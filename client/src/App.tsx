import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Upload, LogIn, LogOut, User as UserIcon, Trophy } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationDropdown } from './components/NotificationDropdown';
import { Home } from './pages/Home';
import { PhotoPage } from './pages/PhotoPage';
import { UploadPage } from './pages/UploadPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ExplorePage } from './pages/ExplorePage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  return (
    <nav
      aria-label="Navigation principale"
      className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-6">
        <Link
          to="/"
          aria-label="OPTIQ — retour à l'accueil"
          className="hover:opacity-80 transition-opacity"
        >
          <svg width="130" height="32" viewBox="0 0 130 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="16" cy="16" r="10.5" fill="none" stroke="#4F46E5" strokeWidth="1.2"/>
            <circle cx="16" cy="16" r="6.5" fill="none" stroke="#818CF8" strokeWidth="0.8"/>
            <circle cx="16" cy="16" r="2" fill="#4F46E5"/>
            <line x1="16" y1="5.5" x2="16" y2="9.5" stroke="#4F46E5" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="16" y1="22.5" x2="16" y2="26.5" stroke="#4F46E5" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="5.5" y1="16" x2="9.5" y2="16" stroke="#4F46E5" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="22.5" y1="16" x2="26.5" y2="16" stroke="#4F46E5" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="8.5" y1="8.5" x2="11.1" y2="11.1" stroke="#818CF8" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="20.9" y1="20.9" x2="23.5" y2="23.5" stroke="#818CF8" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="23.5" y1="8.5" x2="20.9" y2="11.1" stroke="#818CF8" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="11.1" y1="20.9" x2="8.5" y2="23.5" stroke="#818CF8" strokeWidth="0.8" strokeLinecap="round"/>
            <text x="35" y="22" fontFamily="system-ui,-apple-system,'Helvetica Neue',sans-serif" fontSize="17" fontWeight="700" letterSpacing="-0.04em" fill="#FFFFFF">OPTIQ</text>
          </svg>
        </Link>
        <Link
          to="/explore"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-yellow-400 transition-colors"
        >
          <Trophy className="w-4 h-4" aria-hidden="true" />
          Explorer
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link
              to="/upload"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              Nouvelle Photo
            </Link>
            <NotificationDropdown />
            <Link
              to={`/profile/${user.id}`}
              aria-label={`Mon profil (${user.username})`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 text-sm hover:bg-gray-700 transition-colors"
            >
              <UserIcon className="w-4 h-4 text-indigo-400" aria-hidden="true" />
              <span className="text-gray-200 font-medium">{user.username}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors text-sm font-medium"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Connexion
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Inscription
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="bg-gray-900 text-white min-h-screen">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
          >
            Aller au contenu principal
          </a>
          <Navbar />
          <main id="main-content" tabIndex={-1}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/photo/:id" element={<PhotoPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
