import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  TabletSmartphone,
  Shield,
  LockKeyhole,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MODES = {
  worker: {
    title: 'Worker login',
    subtitle: 'Use the phone number tied to the registered profile.',
    button: 'Open profile',
  },
  admin: {
    title: 'Admin login',
    subtitle: 'Use the prototype admin code to unlock the insurer view.',
    button: 'Open admin',
  },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWorker, loginAdmin, session } = useAuth();
  const [mode, setMode] = useState('worker');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    phone: '',
    adminCode: '',
  });

  useEffect(() => {
    if (session?.type === 'worker') {
      navigate('/profile', { replace: true });
    }

    if (session?.type === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [navigate, session]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'worker') {
        await loginWorker({ phone: formData.phone });
        navigate('/profile', { replace: true });
      } else {
        await loginAdmin(formData.adminCode);
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeMode = MODES[mode];

  return (
    <main className="clean-page clean-auth-page">
      <section className="clean-auth-grid clean-auth-grid--reverse">
        <div className="clean-auth-copy">
          <span className="clean-eyebrow">SIGN IN</span>
          <h1 className="clean-auth-title">Resume the EasyKavach workspace.</h1>
          <p className="clean-auth-text">
            Worker login opens the personal profile. Admin login opens the insurer dashboard and
            the live operations view.
          </p>

          <div className="clean-auth-badges">
            <span className="clean-pill">Phone-based worker login</span>
            <span className="clean-pill">Prototype admin code</span>
            <span className="clean-pill">Session persists locally</span>
          </div>

          <div className="clean-auth-summary">
            <div className="clean-summary-card">
              <span>Worker</span>
              <strong>Profile + payouts</strong>
              <p>View policy, claims, and ML predictions.</p>
            </div>
            <div className="clean-summary-card">
              <span>Admin</span>
              <strong>Overview + heatmap</strong>
              <p>See portfolio stats, trigger state, and claims flow.</p>
            </div>
          </div>
        </div>

        <div className="clean-auth-panel">
          <div className="clean-auth-switch">
            <button
              type="button"
              className={`clean-switch ${mode === 'worker' ? 'is-active' : ''}`}
              onClick={() => setMode('worker')}
            >
              <TabletSmartphone size={14} />
              Worker
            </button>
            <button
              type="button"
              className={`clean-switch ${mode === 'admin' ? 'is-active' : ''}`}
              onClick={() => setMode('admin')}
            >
              <Shield size={14} />
              Admin
            </button>
          </div>

          <form className="clean-form-card" onSubmit={handleSubmit}>
            <div className="clean-form-head">
              <span className="clean-status-tag">
                <ShieldCheck size={14} />
                {activeMode.title}
              </span>
              <span className="clean-clock">Secure access</span>
            </div>

            <p className="clean-form-subtitle">{activeMode.subtitle}</p>

            {error ? <div className="clean-form-alert">{error}</div> : null}

            {mode === 'worker' ? (
              <label className="clean-field">
                <span>
                  <UserRound size={14} />
                  Phone number
                </span>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </label>
            ) : (
              <label className="clean-field">
                <span>
                  <LockKeyhole size={14} />
                  Admin code
                </span>
                <input
                  type="password"
                  value={formData.adminCode}
                  onChange={(event) => setFormData((current) => ({ ...current, adminCode: event.target.value }))}
                  placeholder="Enter admin code"
                />
              </label>
            )}

            <button
              type="submit"
              className="clean-primary-button clean-form-button"
              disabled={isLoading || (mode === 'worker' ? !formData.phone : !formData.adminCode)}
            >
              {isLoading ? <Loader2 size={16} className="clean-spin" /> : <Sparkles size={16} />}
              {activeMode.button}
              <ArrowRight size={16} />
            </button>

            <p className="clean-form-footnote">
              New here? <Link to="/register">Create a worker profile</Link>.
            </p>
          </form>

          <aside className="clean-side-card">
            <span className="clean-eyebrow">WHAT OPENS NEXT</span>
            <h2 className="clean-side-title">
              {mode === 'worker' ? 'Profile dashboard' : 'Insurer control room'}
            </h2>
            <p className="clean-side-text">
              {mode === 'worker'
                ? 'Policy, claims, and payout activity tied to the live worker session.'
                : 'System-wide analytics, trigger state, and multi-zone risk visibility.'}
            </p>

            <div className="clean-preview-grid">
              <div>
                <span>Context</span>
                <strong>{mode === 'worker' ? 'Delivery partner' : 'Admin'}</strong>
              </div>
              <div>
                <span>Access</span>
                <strong>Instant</strong>
              </div>
              <div>
                <span>Session</span>
                <strong>Local</strong>
              </div>
              <div>
                <span>Routes</span>
                <strong>{mode === 'worker' ? '/profile' : '/admin'}</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
