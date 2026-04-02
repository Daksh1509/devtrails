import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { analyticsService, claimService, payoutService, triggerService, workerService } from '../services/api';
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '../utils/formatters';

function MetricCard({ label, value, note }) {
  return (
    <div className="clean-metric-card">
      <span className="clean-metric-label">{label}</span>
      <strong className="clean-metric-value">{value}</strong>
      {note ? <p className="clean-metric-note">{note}</p> : null}
    </div>
  );
}

function SimpleListRow({ title, value, note, badge }) {
  return (
    <div className="clean-list-row">
      <div>
        <strong>{title}</strong>
        <p>{note}</p>
      </div>
      <div className="clean-list-meta">
        <span>{value}</span>
        {badge ? <em>{badge}</em> : null}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [overview, setOverview] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const fetchAdminData = async () => {
      setIsRefreshing(true);
      setError('');

      try {
        const [overviewRes, workersRes, claimsRes, payoutsRes, triggersRes] = await Promise.all([
          analyticsService.getInsurerOverview(),
          workerService.listWorkers(),
          claimService.list(),
          payoutService.list(),
          triggerService.listEvents(),
        ]);

        setOverview(overviewRes.data?.insurer_overview || null);
        setWorkers(Array.isArray(workersRes.data) ? workersRes.data : []);
        setClaims(Array.isArray(claimsRes.data) ? claimsRes.data : []);
        setPayouts(Array.isArray(payoutsRes.data) ? payoutsRes.data : []);
        setTriggers(Array.isArray(triggersRes.data) ? triggersRes.data : []);
      } catch (err) {
        setError('Could not load the admin console right now.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchAdminData();
    const timer = window.setInterval(fetchAdminData, 30000);

    return () => window.clearInterval(timer);
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <main className="clean-page clean-loading-page">
        <Loader2 className="clean-spin" size={18} />
        Loading admin console...
      </main>
    );
  }

  const heatmaps = overview ? overview.zone_heatmaps || [] : [];
  const topWorkers = workers.slice(0, 6);
  const recentClaims = claims.slice(0, 6);
  const recentPayouts = payouts.slice(0, 6);
  const activeTriggers = triggers.slice(0, 5);

  return (
    <main className="clean-page clean-admin-page">
      <section className="clean-auth-grid">
        <div className="clean-auth-copy">
          <span className="clean-eyebrow">ADMIN CONSOLE</span>
          <h1 className="clean-auth-title">System overview and portfolio control.</h1>
          <p className="clean-auth-text">
            The insurer view keeps the portfolio, zone risk, live triggers, claims, and payouts in
            one calm control room.
          </p>

          <div className="clean-auth-badges">
            <span className="clean-pill">Portfolio risk</span>
            <span className="clean-pill">Live triggers</span>
            <span className="clean-pill">Claims and payouts</span>
          </div>
        </div>

        <div className="clean-auth-panel">
          <div className="clean-form-head">
            <span className="clean-status-tag">
              <ShieldCheck size={14} />
              Admin unlocked
            </span>
            <span className="clean-clock">{isRefreshing ? 'Refreshing' : 'Live view'}</span>
          </div>

          <div className="clean-status-grid">
            <div className="clean-status-row">
              <span>Workers</span>
              <strong>{overview?.total_workers ?? workers.length}</strong>
            </div>
            <div className="clean-status-row">
              <span>Active policies</span>
              <strong>{overview?.active_policies_count ?? 0}</strong>
            </div>
            <div className="clean-status-row">
              <span>Total payouts</span>
              <strong>{formatCurrency(overview?.total_payouts_amount)}</strong>
            </div>
            <div className="clean-status-row">
              <span>Loss ratio</span>
              <strong>{formatPercent((overview?.loss_ratio || 0) * 100, 1)}</strong>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="clean-form-alert clean-form-alert--wide">{error}</div> : null}

      <section className="clean-facts-grid clean-facts-grid--admin">
        <MetricCard
          label="Claims processed"
          value={formatNumber(claims.length)}
          note="All claims currently visible in the system."
        />
        <MetricCard
          label="Fraud rate"
          value={formatPercent((overview?.fraud_rate || 0) * 100, 1)}
          note="Portfolio-level fraud signal."
        />
        <MetricCard
          label="Active triggers"
          value={formatNumber(activeTriggers.length)}
          note="Live geo-fenced disruption signals."
        />
        <MetricCard
          label="Payouts"
          value={formatNumber(payouts.length)}
          note="Settlements already moved through the rail."
        />
      </section>

      <section className="clean-two-up">
        <article className="clean-card">
          <span className="clean-eyebrow">ZONE RISK</span>
          <div className="clean-zone-grid">
            {heatmaps.slice(0, 6).map((zone) => {
              const riskLevel = Math.max(0, Math.min(1, Number(zone.risk_score || 0)));

              return (
                <div className="clean-zone-card" key={zone.zone_id}>
                  <div className="clean-zone-head">
                    <strong>{zone.zone_name}</strong>
                    <span>{formatPercent(riskLevel * 100, 0)}</span>
                  </div>
                  <div className="clean-zone-bar">
                    <div className="clean-zone-fill" style={{ width: `${riskLevel * 100}%` }} />
                  </div>
                  <div className="clean-zone-meta">
                    <span>{zone.active_disruptions_count} disruptions</span>
                    <span>{zone.total_claims_count} claims</span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="clean-card">
          <span className="clean-eyebrow">LIVE TRIGGERS</span>
          <div className="clean-list-card">
            {activeTriggers.length ? (
              activeTriggers.map((trigger) => (
                <SimpleListRow
                  key={trigger.id}
                  title={String(trigger.trigger_type).replace('_', ' ')}
                  note={`${trigger.zone_id?.replace('_', ' ') || 'Unknown zone'} · ${formatDateTime(trigger.created_at)}`}
                  value={trigger.status || 'ACTIVE'}
                  badge={trigger.severity || 'HIGH'}
                />
              ))
            ) : (
              <p className="clean-empty-state">No active trigger events right now.</p>
            )}
          </div>
        </article>
      </section>

      <section className="clean-two-up">
        <article className="clean-card">
          <span className="clean-eyebrow">WORKER ROSTER</span>
          <div className="clean-list-card">
            {topWorkers.length ? (
              topWorkers.map((worker) => (
                <SimpleListRow
                  key={worker.id}
                  title={worker.name}
                  note={`${String(worker.zone_id || '').replace('_', ' ')} · ${worker.platform_type}`}
                  value={worker.is_online ? 'Online' : 'Offline'}
                  badge={Array.isArray(worker.shifts) ? worker.shifts.join(' / ') : 'No shifts'}
                />
              ))
            ) : (
              <p className="clean-empty-state">No workers in the roster yet.</p>
            )}
          </div>
        </article>

        <article className="clean-card">
          <span className="clean-eyebrow">RECENT PAYOUTS</span>
          <div className="clean-list-card">
            {recentPayouts.length ? (
              recentPayouts.map((payout) => (
                <SimpleListRow
                  key={payout.id}
                  title={formatCurrency(payout.amount)}
                  note={formatDateTime(payout.created_at)}
                  value={payout.channel || 'UPI'}
                  badge={payout.status || 'settled'}
                />
              ))
            ) : (
              <p className="clean-empty-state">No payouts to show yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="clean-two-up">
        <article className="clean-card">
          <span className="clean-eyebrow">RECENT CLAIMS</span>
          <div className="clean-list-card">
            {recentClaims.length ? (
              recentClaims.map((claim) => (
                <SimpleListRow
                  key={claim.id}
                  title={String(claim.disruption_type).replace('_', ' ')}
                  note={formatDateTime(claim.created_at)}
                  value={formatCurrency(claim.adjusted_payout)}
                  badge={claim.status}
                />
              ))
            ) : (
              <p className="clean-empty-state">No claims have been created yet.</p>
            )}
          </div>
        </article>

        <article className="clean-card">
          <span className="clean-eyebrow">CLAIM MIX</span>
          <div className="clean-chip-grid clean-chip-grid--wrap">
            {Object.entries(overview?.claims_by_type || {}).map(([type, count]) => (
              <span className="clean-pill" key={type}>
                {String(type).replace('_', ' ')} · {count}
              </span>
            ))}
            {!Object.keys(overview?.claims_by_type || {}).length ? (
              <span className="clean-empty-state">No claim mix yet.</span>
            ) : null}
          </div>
          <div className="clean-mini-row clean-mini-row--stacked">
            <span>
              <AlertTriangle size={12} /> Manual review queue stays visible
            </span>
            <span>
              <Users size={12} /> Zone-based portfolio control
            </span>
            <span>
              <Wallet size={12} /> Payout stream is traceable
            </span>
          </div>
        </article>
      </section>
    </main>
  );
}
