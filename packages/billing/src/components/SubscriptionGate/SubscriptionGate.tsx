import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, RefreshCw, ExternalLink, LogOut, Check } from 'lucide-react';

export interface SubscriptionGatePlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  description: string;
  /** Badge text shown on this plan (e.g. "2 mois gratuits") */
  badge?: string;
}

export interface SubscriptionGateProps {
  appName: string;
  userEmail?: string;
  plans: SubscriptionGatePlan[];
  /** Shared feature bullets shown below plans */
  features?: string[];
  trialDays?: number;
  onStartTrial: (planId: string) => Promise<void>;
  onRefreshStatus: () => Promise<void>;
  onOpenPortal: () => Promise<void>;
  onSignOut: () => Promise<void>;
  statusLoading?: boolean;
  error?: string | null;
}

export function SubscriptionGate({
  appName,
  userEmail,
  plans,
  features = [],
  trialDays = 14,
  onStartTrial,
  onRefreshStatus,
  onOpenPortal,
  onSignOut,
  statusLoading = false,
  error: externalError = null,
}: SubscriptionGateProps) {
  // Default to the plan with a badge, or the last one (typically annual)
  const defaultPlan = plans.find(p => p.badge) || plans[plans.length - 1];
  const [selectedId, setSelectedId] = useState(defaultPlan?.id ?? '');
  const [trialLoading, setTrialLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const error = localError || externalError;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleTrial = useCallback(async () => {
    setTrialLoading(true);
    setLocalError(null);
    try {
      await onStartTrial(selectedId);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Impossible de demarrer l'essai");
    } finally {
      setTrialLoading(false);
    }
  }, [onStartTrial, selectedId]);

  const handleRefresh = useCallback(async () => {
    setLocalError(null);
    try { await onRefreshStatus(); }
    catch (err) { setLocalError(err instanceof Error ? err.message : 'Erreur'); }
  }, [onRefreshStatus]);

  const handlePortal = useCallback(async () => {
    setPortalLoading(true);
    setLocalError(null);
    try { await onOpenPortal(); }
    catch (err) { setLocalError(err instanceof Error ? err.message : 'Erreur'); }
    finally { setPortalLoading(false); }
  }, [onOpenPortal]);

  const isLoading = trialLoading || portalLoading;

  return (
    <div className="subgate">
      <div className={`subgate__card ${mounted ? 'subgate__card--visible' : ''}`}>

        <button className="subgate__close" onClick={onSignOut} aria-label="Fermer">&times;</button>

        {/* Header */}
        <div className="subgate__header">
          <h1 className="subgate__title">
            Essayez <span className="subgate__accent">{appName}</span> gratuitement
          </h1>
          {userEmail && (
            <p className="subgate__subtitle">
              Connecte en tant que <strong>{userEmail}</strong>
            </p>
          )}
        </div>

        {/* Plan selector — cards side by side */}
        <div className="subgate__plans">
          {plans.map((plan) => {
            const selected = plan.id === selectedId;
            const priceStr = `${plan.price}€`;
            const periodStr = plan.interval === 'month' ? '/mois' : '/an';

            return (
              <button
                key={plan.id}
                type="button"
                className={`subgate__plan ${selected ? 'subgate__plan--selected' : ''}`}
                onClick={() => setSelectedId(plan.id)}
              >
                {plan.badge && <span className="subgate__plan-badge">{plan.badge}</span>}
                <span className="subgate__plan-name">{plan.name}</span>
                <span className="subgate__plan-pricing">
                  <span className="subgate__plan-price">{priceStr}</span>
                  <span className="subgate__plan-period">{periodStr}</span>
                </span>
                <span className="subgate__plan-desc">{plan.description}</span>
                <span className={`subgate__plan-check ${selected ? 'subgate__plan-check--on' : ''}`}>
                  {selected && <Check size={14} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Features */}
        {features.length > 0 && (
          <ul className="subgate__features">
            {features.map((f, i) => (
              <li key={i}><Check size={15} /><span>{f}</span></li>
            ))}
          </ul>
        )}

        {/* Error */}
        {error && (
          <div className="subgate__error"><p>{error}</p></div>
        )}

        {/* CTA */}
        <button className="subgate__cta" onClick={handleTrial} disabled={isLoading}>
          {trialLoading ? (
            <span className="subgate__cta-loading"><span className="subgate__spinner" />Creation...</span>
          ) : (
            <>
              Demarrer {trialDays} jours gratuits
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <p className="subgate__fine-print">
          Aucun paiement requis. Annulez a tout moment.
        </p>

        {/* Secondary links */}
        <div className="subgate__links">
          <button className="subgate__link" onClick={handleRefresh} disabled={statusLoading}>
            <RefreshCw size={13} className={statusLoading ? 'subgate__spin' : ''} />
            {statusLoading ? 'Verification...' : "Deja abonne? Verifier l'acces"}
          </button>
          <span className="subgate__link-sep" />
          <button className="subgate__link" onClick={handlePortal} disabled={portalLoading}>
            <ExternalLink size={13} />
            Facturation
          </button>
          <span className="subgate__link-sep" />
          <button className="subgate__link subgate__link--muted" onClick={onSignOut}>
            <LogOut size={13} />
            Deconnexion
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionGate;
