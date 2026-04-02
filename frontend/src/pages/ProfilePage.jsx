import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Activity,
  Clock3,
  Loader2,
  Power,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { analyticsService, claimService, payoutService, policyService, workerService } from '../services/api';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent } from '../utils/formatters';

function MetricCard({ label, value, note }) {
  return (
    <div className="clean-metric-card">
      <span className="clean-metric-label">{label}</span>
      <strong className="clean-metric-value">{value}</strong>
      {note ? <p className="clean-metric-note">{note}</p> : null}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="clean-detail-row clean-detail-row--profile">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { session } = useAuth();
  const workerId = session?.worker?.id;
  const [worker, setWorker] = useState(session?.worker || null);
  const [analytics, setAnalytics] = useState(null);
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (!workerId) {
      return;
    }

    const fetchProfile = async () => {
      setIsRefreshing(true);
      setError('');

      try {
        const [profileRes, analyticsRes, claimsRes, policiesRes, payoutsRes] = await Promise.all([
          workerService.getProfile(workerId),
          analyticsService.getWorkerDashboard(workerId),
          claimService.getWorkerClaims(workerId),
          policyService.getWorkerPolicies(workerId),
          payoutService.getWorkerPayouts(workerId),
        ]);

        setWorker(profileRes.data);
        setAnalytics(analyticsRes.data);
        setClaims(Array.isArray(claimsRes.data) ? claimsRes.data : []);
        setPolicies(Array.isArray(policiesRes.data) ? policiesRes.data : []);
        setPayouts(Array.isArray(payoutsRes.data) ? payoutsRes.data : []);
      } catch (err) {
        setError('Could not load the worker profile right now.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchProfile();
    const timer = window.setInterval(fetchProfile, 30000);

    return () => window.clearInterval(timer);
  }, [workerId]);

  const handleToggleStatus = async () => {
    if (!workerId || !worker) {
      return;
    }

    setIsToggling(true);
    try {
      const nextStatus = !worker.is_online;
      const res = await workerService.updateStatus(workerId, nextStatus);
      setWorker(res.data);
    } catch (err) {
      setError('Could not update online status.');
    } finally {
      setIsToggling(false);
    }
  };

  if (!workerId) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading && !worker) {
    return <main className="clean-page clean-loading-page">Loading profile...</main>;
  }

  const primaryPolicy = policies[0];
  const recentClaims = claims.slice(0, 4);
  const recentPayouts = payouts.slice(0, 4);

  return (
    <main className="clean-page clean-profile-page">
      <section className="clean-profile-hero">
        <div className="clean-profile-copy">
          <span className="clean-eyebrow">WORKER PROFILE</span>
          <h1 className="clean-auth-title">{worker?.name || 'Worker profile'}</h1>
          <p className="clean-auth-text">
            This view ties the live worker session to policy, claims, payouts, and the model
            output that drives weekly cover.
          </p>
          <div className="clean-auth-badges">
            <span className="clean-pill">{worker?.zone_id?.replace('_', ' ')}</span>
            <span className="clean-pill">{worker?.platform_type}</span>
            <span className="clean-pill">{worker?.is_online ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <div className="clean-profile-hero-card">
          <div className="clean-form-head">
            <span className="clean-status-tag">
              <ShieldCheck size={14} />
              Session active
            </span>
            <button className="clean-toggle-button" type="button" onClick={handleToggleStatus}>
              <Power size={14} />
              {isToggling ? 'Updating' : worker?.is_online ? 'Go offline' : 'Go online'}
            </button>
          </div>

          <div className="clean-status-grid">
            <div className="clean-status-row">
              <span>Registered</span>
              <strong>{formatDate(worker?.registered_at)}</strong>
            </div>
            <div className="clean-status-row">
              <span>Last active</span>
              <strong>{formatDateTime(worker?.last_active_at)}</strong>
            </div>
            <div className="clean-status-row">
              <span>Shifts</span>
              <strong>{Array.isArray(worker?.shifts) ? worker.shifts.join(' / ') : 'N/A'}</strong>
            </div>
            <div className="clean-status-row">
              <span>Area type</span>
              <strong>{worker?.area_type?.replace('_', ' ')}</strong>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="clean-form-alert clean-form-alert--wide">{error}</div> : null}

      <section className="clean-facts-grid clean-facts-grid--profile">
        <MetricCard
          label="Protected earnings"
          value={formatCurrency(analytics?.earnings_protected)}
          note="Total payouts credited to this worker."
        />
        <MetricCard
          label="Expected shift earning"
          value={formatCurrency(analytics?.expected_shift_earning)}
          note="Model estimate for the active shift."
        />
        <MetricCard
          label="Predicted hourly wage"
          value={formatCurrency(analytics?.expected_hourly_wage)}
          note="Derived from the shift model."
        />
        <MetricCard
          label="Predicted payout"
          value={formatCurrency(analytics?.predicted_risk_payout_estimate)}
          note="Hourly disruption protection estimate."
        />
      </section>

      <section className="clean-two-up">
        <article className="clean-card">
          <span className="clean-eyebrow">POLICY SNAPSHOT</span>
          <div className="clean-detail-stack">
            <Row label="Policy ID" value={primaryPolicy?.id || 'No policy yet'} />
            <Row label="Status" value={primaryPolicy?.status || 'Pending'} />
            <Row label="Week" value={`${formatDate(primaryPolicy?.week_start)} - ${formatDate(primaryPolicy?.week_end)}`} />
            <Row label="Premium" value={formatCurrency(primaryPolicy?.premium_amount)} />
            <Row label="Expected loss" value={formatCurrency(primaryPolicy?.expected_weekly_loss)} />
            <Row
              label="Risk score"
              value={formatPercent((primaryPolicy?.risk_score || 0) * 100, 1)}
            />
          </div>
          <div className="clean-mini-row clean-mini-row--stacked">
            <span>
              <Activity size={12} /> {analytics?.total_claims ?? 0} total claims
            </span>
            <span>
              <Wallet size={12} /> {recentPayouts.length} recent payouts
            </span>
          </div>
        </article>

        <article className="clean-card">
          <span className="clean-eyebrow">MODEL SIGNALS</span>
          <div className="clean-detail-stack">
            <Row label="Active policy" value={analytics?.active_policy_id || 'None'} />
            <Row label="Recent claims" value={recentClaims.length ? `${recentClaims.length} loaded` : 'No claims yet'} />
            <Row label="Earnings protected" value={formatCurrency(analytics?.earnings_protected)} />
            <Row label="Shift risk" value={formatNumber(analytics?.predicted_disruption_loss, 0)} />
          </div>
          <div className="clean-mini-row clean-mini-row--stacked">
            <span>
              <TrendingUp size={12} /> Route-aware premium
            </span>
            <span>
              <Clock3 size={12} /> Refreshes every 30s
            </span>
          </div>
        </article>
      </section>

      <section className="clean-two-up">
        <article className="clean-card">
          <span className="clean-eyebrow">RECENT CLAIMS</span>
          <div className="clean-list-card">
            {recentClaims.length ? (
              recentClaims.map((claim) => (
                <div className="clean-list-row" key={claim.id}>
                  <div>
                    <strong>{String(claim.disruption_type).replace('_', ' ')}</strong>
                    <p>{formatDateTime(claim.created_at)}</p>
                  </div>
                  <div className="clean-list-meta">
                    <span>{formatCurrency(claim.adjusted_payout)}</span>
                    <em>{claim.status}</em>
                  </div>
                </div>
              ))
            ) : (
              <p className="clean-empty-state">No claims yet. The page will populate as disruptions fire.</p>
            )}
          </div>
        </article>

        <article className="clean-card">
          <span className="clean-eyebrow">RECENT PAYOUTS</span>
          <div className="clean-list-card">
            {recentPayouts.length ? (
              recentPayouts.map((payout) => (
                <div className="clean-list-row" key={payout.id}>
                  <div>
                    <strong>{formatCurrency(payout.amount)}</strong>
                    <p>{formatDateTime(payout.created_at)}</p>
                  </div>
                  <div className="clean-list-meta">
                    <span>{payout.channel || 'UPI'}</span>
                    <em>{payout.status || 'settled'}</em>
                  </div>
                </div>
              ))
            ) : (
              <p className="clean-empty-state">No payouts are linked to this profile yet.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
