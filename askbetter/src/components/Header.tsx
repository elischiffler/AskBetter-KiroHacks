import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, LogOut, User, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const goToLogin = () => {
    navigate('/auth', { state: { from: location.pathname } });
  };

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4"
      style={{
        backgroundColor: 'rgba(15, 10, 30, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        className="text-sm font-black uppercase tracking-widest"
        style={{ color: '#f5f3ff' }}
      >
        Ask<span style={{ color: '#7c3aed' }}>Better</span>
      </Link>

      {/* Auth controls */}
      <div className="flex items-center gap-3">
        {loading ? null : user ? (
          <>
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                color: '#a78bfa',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#7c3aed';
                e.currentTarget.style.color = '#f5f3ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.35)';
                e.currentTarget.style.color = '#a78bfa';
              }}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <span
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium"
              style={{ color: '#a78bfa' }}
            >
              <User className="w-3.5 h-3.5" />
              {user.email}
            </span>
            <button
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                color: '#a78bfa',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#7c3aed';
                e.currentTarget.style.color = '#f5f3ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.35)';
                e.currentTarget.style.color = '#a78bfa';
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            {/* Log in — ghost style */}
            <button
              onClick={goToLogin}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                color: '#a78bfa',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#7c3aed';
                e.currentTarget.style.color = '#f5f3ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.35)';
                e.currentTarget.style.color = '#a78bfa';
              }}
            >
              <LogIn className="w-3.5 h-3.5" />
              Log in
            </button>

            {/* Sign up — filled style */}
            <button
              onClick={() => navigate('/auth?mode=signup')}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-lg transition-all"
              style={{ backgroundColor: '#7c3aed', color: '#f5f3ff' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6d28d9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
            >
              Sign up
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
