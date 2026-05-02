import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const goToLogin = () => {
    navigate('/auth', { state: { from: location.pathname } });
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      {/* Logo */}
      <Link to="/" className="text-base font-bold" style={{ color: '#4338ca' }}>
        AskBetter
      </Link>

      {/* Auth controls */}
      <div className="flex items-center gap-3">
        {loading ? null : user ? (
          <>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
              <User className="w-3.5 h-3.5" />
              {user.email}
            </span>
            <button
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </>
        ) : (
          <button
            onClick={goToLogin}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: '#4338ca' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3730a3')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4338ca')}
          >
            <LogIn className="w-3.5 h-3.5" />
            Log in
          </button>
        )}
      </div>
    </header>
  );
}
