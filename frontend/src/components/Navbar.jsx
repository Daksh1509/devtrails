import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, LogOut, Shield, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/register', label: 'Register' },
  { to: '/login', label: 'Login' },
  { to: '/profile', label: 'Profile' },
  { to: '/admin', label: 'Admin' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();

  const goHome = () => {
    navigate('/');
  };

  return (
    <header className="clean-topbar">
      <button type="button" className="clean-brand-button" onClick={goHome}>
        <span className="clean-brand-mark">
          <Shield size={18} />
        </span>
        <span>
          <strong>EasyKavach</strong>
          <small>AI-powered parametric insurance</small>
        </span>
      </button>

      <nav className="clean-topnav" aria-label="Primary navigation">
        {LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`clean-topnav-link ${location.pathname === link.to ? 'is-active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="clean-topbar-actions">
        {session ? (
          <span className="clean-session-pill">
            <UserRound size={12} />
            {session.type === 'admin' ? 'Admin' : session.worker?.name || 'Worker'}
          </span>
        ) : (
          <Link className="clean-secondary-button clean-topbar-cta" to="/login">
            Sign in
            <ArrowUpRight size={14} />
          </Link>
        )}

        {session ? (
          <button
            type="button"
            className="clean-icon-button clean-icon-button--ghost"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        ) : null}
      </div>
    </header>
  );
}
