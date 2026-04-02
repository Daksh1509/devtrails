import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { policyService, workerService } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/formatters';

const SHIFT_OPTIONS = ['morning', 'afternoon', 'evening', 'night'];
const AREA_OPTIONS = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'college', label: 'College' },
  { value: 'residential', label: 'Residential' },
  { value: 'low_density', label: 'Low density' },
];

const emptyForm = {
  name: '',
  phone: '',
  upi_id: '',
  zone_id: '',
  area_type: 'commercial',
  warehouse_distance_km: 1.0,
  platform_type: 'Blinkit',
  shifts: ['evening'],
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerWorker, session } = useAuth();
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await workerService.listZones();
        const nextZones = Array.isArray(res.data) ? res.data : [];
        setZones(nextZones);
        if (!formData.zone_id && nextZones[0]?.id) {
          setFormData((current) => ({ ...current, zone_id: nextZones[0].id }));
        }
      } catch (err) {
        setError('Could not load zone list. Please try again.');
      }
    };

    fetchZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (session?.type === 'worker') {
      navigate('/profile', { replace: true });
    }
    if (session?.type === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [navigate, session]);

  const toggleShift = (shift) => {
    setFormData((current) => {
      const exists = current.shifts.includes(shift);
      if (exists && current.shifts.length === 1) {
        return current;
      }
      return {
        ...current,
        shifts: exists
          ? current.shifts.filter((item) => item !== shift)
          : [...current.shifts, shift],
      };
    });
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    const selectedZone = zones.find((zone) => zone.id === formData.zone_id);
    if (!selectedZone) {
      return;
    }

    setFormData((current) => {
      const nextAreaType = selectedZone.default_area_type || current.area_type;
      const nextWarehouseDistance =
        selectedZone.default_warehouse_distance_km ?? current.warehouse_distance_km;

      if (
        current.area_type === nextAreaType &&
        current.warehouse_distance_km === nextWarehouseDistance
      ) {
        return current;
      }

      return {
        ...current,
        area_type: nextAreaType,
        warehouse_distance_km: nextWarehouseDistance,
      };
    });
  }, [formData.zone_id, zones]);

  useEffect(() => {
    if (!formData.zone_id || !formData.shifts.length) {
      setQuote(null);
      return undefined;
    }

    let isMounted = true;
    const timer = window.setTimeout(async () => {
      setIsQuoteLoading(true);
      try {
        const res = await policyService.quote({
          zone_id: formData.zone_id,
          platform_type: formData.platform_type,
          shifts: formData.shifts,
        });
        if (isMounted) {
          setQuote(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setQuote(null);
        }
      } finally {
        if (isMounted) {
          setIsQuoteLoading(false);
        }
      }
    }, 220);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [
    formData.platform_type,
    formData.shifts,
    formData.zone_id,
    zones,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const nextSession = await registerWorker({
        ...formData,
        phone: formData.phone.trim(),
        upi_id: formData.upi_id.trim(),
        name: formData.name.trim(),
      });

      navigate(nextSession?.worker?.id ? '/profile' : '/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedZone = zones.find((zone) => zone.id === formData.zone_id);
  const primaryShiftForecast =
    quote?.shift_forecasts?.find((forecast) => forecast.shift === quote?.recommended_shift) ||
    quote?.shift_forecasts?.[0] ||
    null;

  return (
    <main className="clean-page clean-auth-page">
      <section className="clean-auth-grid">
        <div className="clean-auth-copy">
          <span className="clean-eyebrow">WORKER ONBOARDING</span>
          <h1 className="clean-auth-title">Register a Blinkit partner profile.</h1>
          <p className="clean-auth-text">
            One registration creates the worker record, runs the pricing model, and activates the
            first weekly policy immediately.
          </p>

          <div className="clean-auth-badges">
            <span className="clean-pill">Live policy creation</span>
            <span className="clean-pill">Zone aware premium</span>
            <span className="clean-pill">Instant dashboard access</span>
          </div>

          <div className="clean-auth-summary">
            <div className="clean-summary-card">
              <span>Step 1</span>
              <strong>Profile</strong>
              <p>Name, phone, UPI, and worker type.</p>
            </div>
            <div className="clean-summary-card">
              <span>Step 2</span>
              <strong>ML pricing</strong>
              <p>The earnings model estimates shift income and payout floor.</p>
            </div>
            <div className="clean-summary-card">
              <span>Step 3</span>
              <strong>Zone</strong>
              <p>Choose the delivery zone the model should track.</p>
            </div>
            <div className="clean-summary-card">
              <span>Step 4</span>
              <strong>Policy</strong>
              <p>Auto-create the first weekly cover immediately.</p>
            </div>
          </div>
        </div>

        <div className="clean-auth-panel">
          <form className="clean-form-card" onSubmit={handleSubmit}>
            <div className="clean-form-head">
              <span className="clean-status-tag">
                <ShieldCheck size={14} />
                Secure onboarding
              </span>
              <span className="clean-clock">Prototype flow</span>
            </div>

            {error ? <div className="clean-form-alert">{error}</div> : null}

            <label className="clean-field">
              <span>
                <UserRound size={14} />
                Full name
              </span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ravi Kumar"
              />
            </label>

            <div className="clean-field-grid">
              <label className="clean-field">
                <span>
                  <Phone size={14} />
                  Phone number
                </span>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label className="clean-field">
                <span>
                  <Wallet size={14} />
                  UPI ID
                </span>
                <input
                  type="text"
                  value={formData.upi_id}
                  onChange={(event) => updateField('upi_id', event.target.value)}
                  placeholder="ravi@upi"
                />
              </label>
            </div>

            <div className="clean-field-grid">
              <label className="clean-field">
                <span>
                  <MapPin size={14} />
                  Zone
                </span>
                <select
                  value={formData.zone_id}
                  onChange={(event) => updateField('zone_id', event.target.value)}
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} · {zone.city}
                    </option>
                  ))}
                </select>
              </label>

              <label className="clean-field">
                <span>
                  <Briefcase size={14} />
                  Area type
                </span>
                <select
                  value={formData.area_type}
                  onChange={(event) => updateField('area_type', event.target.value)}
                >
                  {AREA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="clean-field-grid">
              <label className="clean-field">
                <span>
                  <Briefcase size={14} />
                  Zone area
                </span>
                <input
                  type="text"
                  value={(selectedZone?.default_area_type || formData.area_type).replace('_', ' ')}
                  readOnly
                />
              </label>

              <label className="clean-field">
                <span>
                  <Briefcase size={14} />
                  Platform
                </span>
                <input type="text" value={formData.platform_type} readOnly />
              </label>
            </div>

            <div className="clean-shift-stack">
              <span className="clean-field-label">
                <Zap size={14} />
                Shifts
              </span>
              <div className="clean-chip-grid">
                {SHIFT_OPTIONS.map((shift) => (
                  <button
                    key={shift}
                    type="button"
                    className={`clean-chip ${formData.shifts.includes(shift) ? 'is-active' : ''}`}
                    onClick={() => toggleShift(shift)}
                  >
                    {shift}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="clean-primary-button clean-form-button"
              disabled={
                isLoading ||
                !formData.name ||
                !formData.phone ||
                !formData.upi_id ||
                !formData.zone_id
              }
            >
              {isLoading ? <Loader2 size={16} className="clean-spin" /> : <Sparkles size={16} />}
              Create profile
              <ArrowRight size={16} />
            </button>

            <p className="clean-form-footnote">
              Already registered? <Link to="/login">Log in here</Link>.
            </p>
          </form>

          <aside className="clean-side-card">
            <span className="clean-eyebrow">LIVE PREVIEW</span>
            <h2 className="clean-side-title">{formData.name || 'Worker profile'}</h2>
            <p className="clean-side-text">
              {selectedZone
                ? `${selectedZone.name}, ${selectedZone.city}`
                : 'Select a zone to see the first policy context.'}
            </p>

            <div className="clean-preview-grid">
              <div>
                <span>Zone risk</span>
                <strong>
                  {quote
                    ? `${formatNumber((quote.risk_score || 0) * 100, 0)} / 100`
                    : selectedZone?.base_risk_score?.toFixed?.(1) || '0.0'}
                </strong>
              </div>
              <div>
                <span>Weekly premium</span>
                <strong>{quote ? formatCurrency(quote.premium_amount) : 'Loading'}</strong>
              </div>
              <div>
                <span>Shift earning</span>
                <strong>
                  {primaryShiftForecast
                    ? formatCurrency(primaryShiftForecast.expected_shift_earning)
                    : 'N/A'}
                </strong>
              </div>
              <div>
                <span>Hourly floor</span>
                <strong>{quote ? formatCurrency(quote.hourly_income_floor) : 'N/A'}</strong>
              </div>
            </div>

            <div className="clean-mini-row clean-mini-row--stacked">
              <span>
                {quote?.model_enabled ? 'Random Forest model is live' : 'Formula fallback is active'}
              </span>
              <span>
                {quote
                  ? `${formData.shifts.length} shift${formData.shifts.length > 1 ? 's' : ''} quoted for this worker`
                  : 'Preparing quote'}
              </span>
              <span>
                {quote
                  ? `${formatCurrency(quote.expected_weekly_loss)} expected weekly loss`
                  : 'Policy created on success'}
              </span>
            </div>

            {isQuoteLoading ? (
              <p className="clean-side-text">Refreshing onboarding quote...</p>
            ) : quote ? (
              <div className="clean-detail-stack">
                <div className="clean-detail-row clean-detail-row--profile">
                  <strong>Pricing mode</strong>
                  <span>{quote.pricing_mode.replace('_', ' ')}</span>
                </div>
                <div className="clean-detail-row clean-detail-row--profile">
                  <strong>Recommended shift</strong>
                  <span>{quote.recommended_shift}</span>
                </div>
                <div className="clean-detail-row clean-detail-row--profile">
                  <strong>Daily cover basis</strong>
                  <span>{formatCurrency(quote.expected_daily_earning)}</span>
                </div>
                <div className="clean-detail-row clean-detail-row--profile">
                  <strong>Weekly earning forecast</strong>
                  <span>{formatCurrency(quote.expected_weekly_earning)}</span>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
