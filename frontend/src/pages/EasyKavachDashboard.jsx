import React, { startTransition, useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient, { analyticsService, claimService } from '../services/api';

const FEATURE_STEPS = [
  {
    step: '01',
    title: 'Register',
    copy: 'Create a worker profile, choose a zone, and start a weekly policy.',
  },
  {
    step: '02',
    title: 'Monitor',
    copy: 'Weather, AQI, flood, and civic signals stay geo-fenced to the zone.',
  },
  {
    step: '03',
    title: 'Approve',
    copy: 'Eligibility and fraud checks run together when a trigger fires.',
  },
  {
    step: '04',
    title: 'Settle',
    copy: 'The payout rail credits protected income without paperwork.',
  },
];

const PARTNERS = ['OPENWEATHER', 'OPEN-METEO', 'BLINKIT', 'RAZORPAY'];

const FALLBACK_DASHBOARD = {
  isLive: false,
  workerName: 'Ravi Kumar',
  zone: 'KORAMANGALA BLR',
  platform: 'BLINKIT',
  protectedEarnings: 8450,
  expectedShiftEarning: 1320,
  hourlyCover: 240,
  activeClaims: 12,
  activePolicies: 112,
  alert: {
    active: true,
    severity: 'HIGH',
    zone: 'KORAMANGALA BLR',
    message: 'SEVERE RAIN DETECTED - ZONE LOCKDOWN',
    details: 'WEATHER 81MM/H // AQI 302 // AUTO SETTLEMENT READY',
  },
  signals: [
    { label: 'WEATHER', value: '81 MM/H', status: 'TRIGGERED' },
    { label: 'AQI', value: '302', status: 'ESCALATING' },
    { label: 'CIVIC', value: 'CLEAR', status: 'STANDBY' },
    { label: 'PAYOUT', value: 'READY', status: 'LIVE' },
  ],
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatZone(zone = '') {
  if (!zone) {
    return 'KORAMANGALA BLR';
  }

  return zone.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}

function formatPlatform(platform = '') {
  return platform ? platform.toUpperCase() : 'BLINKIT';
}

function humanizeTrigger(triggerType = '') {
  const trigger = String(triggerType).toLowerCase();

  if (trigger.includes('rain')) {
    return 'SEVERE RAIN DETECTED';
  }

  if (trigger.includes('aqi')) {
    return 'HAZARDOUS AQI DETECTED';
  }

  if (trigger.includes('heat')) {
    return 'EXTREME HEAT DETECTED';
  }

  if (trigger.includes('civic') || trigger.includes('curfew') || trigger.includes('bandh')) {
    return 'CIVIC DISRUPTION DETECTED';
  }

  return triggerType ? String(triggerType).replace(/_/g, ' ').toUpperCase() : 'DISRUPTION DETECTED';
}

function buildSignals(activeTriggers, analytics) {
  const weatherTrigger = activeTriggers.find(
    (trigger) => trigger.trigger_type?.includes('rain') || trigger.trigger_type?.includes('heat'),
  );
  const aqiTrigger = activeTriggers.find((trigger) => trigger.trigger_type?.includes('aqi'));
  const civicTrigger = activeTriggers.find(
    (trigger) =>
      trigger.trigger_type?.includes('civic') ||
      trigger.trigger_type?.includes('bandh') ||
      trigger.trigger_type?.includes('curfew'),
  );
  const payoutEstimate = analytics?.predicted_risk_payout_estimate || FALLBACK_DASHBOARD.hourlyCover;

  return [
    {
      label: 'WEATHER',
      value: weatherTrigger?.raw_value ? `${Math.round(weatherTrigger.raw_value)} MM/H` : 'WATCHING',
      status: weatherTrigger ? 'TRIGGERED' : 'STANDBY',
    },
    {
      label: 'AQI',
      value: aqiTrigger?.raw_value ? `${Math.round(aqiTrigger.raw_value)} AQI` : 'NOMINAL',
      status: aqiTrigger ? 'ESCALATING' : 'STANDBY',
    },
    {
      label: 'CIVIC',
      value: civicTrigger ? 'LOCKED' : 'CLEAR',
      status: civicTrigger ? 'ACTIVE' : 'STANDBY',
    },
    {
      label: 'PAYOUT',
      value: `${formatCurrency(payoutEstimate)} BUFFER`,
      status: activeTriggers.length ? 'READY' : 'IDLE',
    },
  ];
}

function buildTicker(alert, signals) {
  const base = [
    alert.message,
    alert.details,
    `${signals[0].label} ${signals[0].status}`,
    `${signals[1].label} ${signals[1].status}`,
    `${signals[2].label} ${signals[2].status}`,
    `${signals[3].label} ${signals[3].value}`,
    'AUTO SETTLEMENT LOCKED',
  ];

  return `${base.join(' // ')} // `;
}

function buildDashboardSnapshot({
  featuredWorker,
  workerAnalytics,
  overview,
  activeTriggers,
  claims,
  isLive,
}) {
  const primaryTrigger = activeTriggers[0];
  const workerName = featuredWorker?.name || FALLBACK_DASHBOARD.workerName;
  const zone = formatZone(primaryTrigger?.zone_id || featuredWorker?.zone_id || FALLBACK_DASHBOARD.zone);
  const platform = formatPlatform(featuredWorker?.platform_type || FALLBACK_DASHBOARD.platform);
  const protectedEarnings =
    workerAnalytics?.earnings_protected ||
    overview?.total_payouts_amount ||
    FALLBACK_DASHBOARD.protectedEarnings;
  const expectedShiftEarning =
    workerAnalytics?.expected_shift_earning || FALLBACK_DASHBOARD.expectedShiftEarning;
  const hourlyCover =
    workerAnalytics?.predicted_risk_payout_estimate || FALLBACK_DASHBOARD.hourlyCover;
  const signals = buildSignals(activeTriggers, workerAnalytics);

  const alert = primaryTrigger
    ? {
        active: true,
        severity: (primaryTrigger.severity || 'high').toUpperCase(),
        zone,
        message: `${humanizeTrigger(primaryTrigger.trigger_type)} - ${zone}`,
        details: `${signals[0].label} ${signals[0].value} // ${signals[1].label} ${signals[1].value} // ${signals[2].label} ${signals[2].status}`,
      }
    : FALLBACK_DASHBOARD.alert;

  return {
    isLive,
    workerName,
    zone,
    platform,
    protectedEarnings,
    expectedShiftEarning,
    hourlyCover,
    activeClaims: Array.isArray(claims) ? claims.length : FALLBACK_DASHBOARD.activeClaims,
    activePolicies: overview?.active_policies_count || FALLBACK_DASHBOARD.activePolicies,
    alert,
    signals,
    ticker: buildTicker(alert, signals),
  };
}

function SectionHeader({ eyebrow, title, copy, meta }) {
  return (
    <div className="clean-section-head">
      <div className="clean-section-text">
        <span className="clean-eyebrow">{eyebrow}</span>
        <h2 className="clean-section-title">{title}</h2>
        {copy ? <p className="clean-section-copy">{copy}</p> : null}
      </div>
      {meta ? <div className="clean-section-meta">{meta}</div> : null}
    </div>
  );
}

function StepCard({ step, title, copy }) {
  return (
    <div className="clean-step-card">
      <span className="clean-step-index">{step}</span>
      <div>
        <h3 className="clean-step-title">{title}</h3>
        <p className="clean-step-copy">{copy}</p>
      </div>
    </div>
  );
}

export default function EasyKavachDashboard() {
  const [dashboard, setDashboard] = useState(FALLBACK_DASHBOARD);
  const [clock, setClock] = useState(() => formatTime(new Date()));

  useEffect(() => {
    document.title = 'EasyKavach // Home';
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatTime(new Date()));
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      const [workersRes, insurerRes, triggersRes, claimsRes] = await Promise.allSettled([
        apiClient.get('/workers'),
        analyticsService.getInsurerOverview(),
        apiClient.get('/triggers/active'),
        claimService.list('paid'),
      ]);

      const featuredWorker =
        workersRes.status === 'fulfilled' && Array.isArray(workersRes.value.data)
          ? workersRes.value.data[0]
          : null;

      let workerAnalytics = null;
      if (featuredWorker?.id) {
        try {
          const analyticsRes = await analyticsService.getWorkerDashboard(featuredWorker.id);
          workerAnalytics = analyticsRes.data;
        } catch (error) {
          workerAnalytics = null;
        }
      }

      const overview =
        insurerRes.status === 'fulfilled' ? insurerRes.value.data?.insurer_overview : null;
      const activeTriggers =
        triggersRes.status === 'fulfilled' && Array.isArray(triggersRes.value.data)
          ? triggersRes.value.data
          : [];
      const claims =
        claimsRes.status === 'fulfilled' && Array.isArray(claimsRes.value.data)
          ? claimsRes.value.data
          : [];
      const isLive =
        workersRes.status === 'fulfilled' ||
        insurerRes.status === 'fulfilled' ||
        triggersRes.status === 'fulfilled' ||
        claimsRes.status === 'fulfilled';

      const nextDashboard = buildDashboardSnapshot({
        featuredWorker,
        workerAnalytics,
        overview,
        activeTriggers,
        claims,
        isLive,
      });

      if (!isMounted) {
        return;
      }

      startTransition(() => {
        setDashboard(nextDashboard);
      });
    };

    loadDashboard();
    const interval = window.setInterval(loadDashboard, 45000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const tickerText = dashboard.ticker || buildTicker(dashboard.alert, dashboard.signals);

  return (
    <div className="clean-dashboard">
      <div className="clean-shell">
        <main className="clean-main">
          <section className="clean-hero" id="top">
            <div className="clean-hero-copy">
              <span className="clean-kicker">
                AI-powered parametric income insurance for Blinkit delivery partners
              </span>
              <h1 className="clean-hero-title">
                <span>Easy</span>
                <span>Kavach</span>
              </h1>
              <p className="clean-hero-text">
                EasyKavach protects delivery income when weather, air quality, road access, or
                civic disruption makes the shift impossible. The experience stays focused on the
                worker, the live signal, and the payout.
              </p>
              <p className="clean-hero-note">
                Coverage stays narrow by design: income loss only, auto-detected, auto-processed,
                and auto-settled.
              </p>

              <div className="clean-action-row">
                <Link to="/register" className="clean-primary-button">
                  REGISTER
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <Link to="/login" className="clean-secondary-button">
                  LOGIN
                  <ArrowUpRight size={16} strokeWidth={2.5} />
                </Link>
              </div>

              <div className="clean-mini-row">
                <span>Income loss only</span>
                <span>Weekly dynamic premium</span>
                <span>Instant UPI settlement</span>
              </div>
            </div>

            <aside className="clean-hero-panel">
              <div className="clean-panel-head">
                <span className="clean-status-tag">
                  <ShieldCheck size={14} />
                  {dashboard.isLive ? 'LIVE API' : 'DESIGN SNAPSHOT'}
                </span>
                <span className="clean-clock">{clock}</span>
              </div>

              <div className="clean-status-grid">
                <div className="clean-status-row">
                  <span>Worker</span>
                  <strong>{dashboard.workerName}</strong>
                </div>
                <div className="clean-status-row">
                  <span>Zone</span>
                  <strong>{dashboard.zone}</strong>
                </div>
                <div className="clean-status-row">
                  <span>Platform</span>
                  <strong>{dashboard.platform}</strong>
                </div>
                <div className="clean-status-row">
                  <span>Protected</span>
                  <strong>{formatCurrency(dashboard.protectedEarnings)}</strong>
                </div>
                <div className="clean-status-row">
                  <span>Shift Forecast</span>
                  <strong>{formatCurrency(dashboard.expectedShiftEarning)}</strong>
                </div>
                <div className="clean-status-row">
                  <span>Hourly Shield</span>
                  <strong>{formatCurrency(dashboard.hourlyCover)}</strong>
                </div>
                <div className="clean-status-row">
                  <span>Policies</span>
                  <strong>{dashboard.activePolicies}</strong>
                </div>
                <div className="clean-status-row">
                  <span>Claims</span>
                  <strong>{dashboard.activeClaims}</strong>
                </div>
              </div>

              <div className="clean-alert-card">
                <span className="clean-alert-kicker">ACTIVE STATUS</span>
                <p className="clean-alert-title">{dashboard.alert.message}</p>
                <p className="clean-alert-copy">{dashboard.alert.details}</p>
              </div>
            </aside>
          </section>

          <section className="clean-two-up">
            <article className="clean-card">
              <SectionHeader
                eyebrow="HOW IT WORKS"
                title="Three core actions, one payout path"
                copy="A worker registers, the zone monitor watches live signals, and the payout rail handles the settlement."
              />

              <div className="clean-step-grid">
                {FEATURE_STEPS.map((step) => (
                  <StepCard key={step.step} step={step.step} title={step.title} copy={step.copy} />
                ))}
              </div>
            </article>

            <article
              className={`clean-card clean-monitor-card ${dashboard.alert.active ? 'is-live' : ''}`}
              id="monitor"
            >
              <SectionHeader
                eyebrow="LIVE MONITOR"
                title="Geo-fenced triggers stay on watch"
                copy="Weather, AQI, flood risk, and civic events are shown in one compact panel for quick scanning."
                meta={
                  <span className="clean-inline-tag">
                    {dashboard.alert.severity} / {dashboard.alert.zone}
                  </span>
                }
              />

              <div className="clean-signal-list">
                {dashboard.signals.map((signal) => (
                  <div className="clean-signal-row" key={signal.label}>
                    <span className="clean-signal-name">{signal.label}</span>
                    <span className="clean-signal-value">{signal.value}</span>
                    <span className="clean-signal-state">{signal.status}</span>
                  </div>
                ))}
              </div>

              <div className="clean-ticker" aria-label="Active alert ticker">
                <div className="clean-ticker-track">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <span key={`${tickerText}-${index}`}>{tickerText}</span>
                  ))}
                </div>
              </div>
            </article>
          </section>

          <footer className="clean-footer">
            <div>
              <span className="clean-eyebrow">VERIFICATION &amp; PARTNERS</span>
              <p>
                OpenWeather, Open-Meteo, Blinkit, and Razorpay appear as a concise partner
                strip.
              </p>
            </div>

            <div className="clean-partner-strip" aria-label="Data and payout partners">
              {PARTNERS.map((partner) => (
                <span className="clean-partner-mark" key={partner}>
                  {partner}
                </span>
              ))}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
