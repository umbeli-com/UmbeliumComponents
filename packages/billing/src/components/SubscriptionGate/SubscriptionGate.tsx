import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, RefreshCw, ExternalLink, LogOut, Check } from 'lucide-react';

export interface SubscriptionGatePlan {
  id: string;
  name: string;
  /** Monthly price in EUR */
  monthlyPrice: number;
  /** Annual price in EUR (total for the year) */
  annualPrice: number;
  description: string;
  features?: string[];
}

export interface SubscriptionGateProps {
  /** Display name of the SaaS app (e.g. "Dialum", "Socialum") */
  appName: string;
  /** Currently authenticated user's email */
  userEmail?: string;
  /** Available plan tiers — each with monthly + annual pricing */
  plans: SubscriptionGatePlan[];
  /** Number of free trial days (default: 14) */
  trialDays?: number;
  /** Called when user clicks the trial CTA — receives the selected plan id */
  onStartTrial: (planId: string) => Promise<void>;
  /** Called when user wants to refresh subscription status */
  onRefreshStatus: () => Promise<void>;
  /** Called when user wants to open the billing portal */
  onOpenPortal: () => Promise<void>;
  /** Called when user signs out */
  onSignOut: () => Promise<void>;
  /** Whether the subscription status is currently loading */
  statusLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

export function SubscriptionGate({
  appName,
  userEmail,
  plans,
  trialDays = 14,
  onStartTrial,
  onRefreshStatus,
  onOpenPortal,
  onSignOut,
  statusLoading = false,
  error: externalError = null,
}: SubscriptionGateProps) {
  const [selectedPlan, setSelectedPlan] = useState(plans[0]?.id ?? '');
  const [interval, setInterval] = useState<'annual' | 'monthly'>('annual');
  const [trialLoading, setTrialLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const error = localError || externalError;

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleTrial = useCallback(async () => {
    setTrialLoading(true);
    setLocalError(null);
    try {
      await onStartTrial(selectedPlan);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Impossible de demarrer l'essai");
    } finally {
      setTrialLoading(false);
    }
  }, [onStartTrial, selectedPlan]);

  const handleRefresh = useCallback(async () => {
    setLocalError(null);
    try {
      await onRefreshStatus();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Impossible de rafraichir le statut');
    }
  }, [onRefreshStatus]);

  const handlePortal = useCallback(async () => {
    setPortalLoading(true);
    setLocalError(null);
    try {
      await onOpenPortal();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Impossible d'ouvrir le portail");
    } finally {
      setPortalLoading(false);
    }
  }, [onOpenPortal]);

  const isAnyLoading = trialLoading || portalLoading;

  const computeSavings = (plan: SubscriptionGatePlan) => {
    const fullYearMonthly = plan.monthlyPrice * 12;
    const saved = fullYearMonthly - plan.annualPrice;
    if (saved <= 0) return null;
    const monthsFree = Math.round(saved / plan.monthlyPrice);
    return monthsFree;
  };

  return (
    <div className="subgate">
      <div className={`subgate__container ${mounted ? 'subgate__container--visible' : ''}`}>

        {/* Close / sign-out X */}
        <button className="subgate__close" onClick={onSignOut} aria-label="Fermer">
          &times;
        </button>

        {/* Title */}
        <h1 className="subgate__title">
          Essayez <span className="subgate__title-accent">{appName}</span> gratuitement
        </h1>

        {userEmail && (
          <p className="subgate__email">
            Connecte en tant que <strong>{userEmail}</strong>
          </p>
        )}

        {/* Plan radio selectors */}
        <div className="subgate__plans">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const priceLabel = interval === 'annual'
              ? `0$ CAD pour ${trialDays} jours, puis ${plan.annualPrice}$ CAD/an`
              : `0$ CAD pour ${trialDays} jours, puis ${plan.monthlyPrice}$ CAD/mois`;
            const monthsFree = interval === 'annual' ? computeSavings(plan) : null;

            return (
              <label
                key={plan.id}
                className={`subgate__plan-option ${isSelected ? 'subgate__plan-option--selected' : ''}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <span className={`subgate__radio ${isSelected ? 'subgate__radio--checked' : ''}`} />
                <span className="subgate__plan-info">
                  <span className="subgate__plan-name">
                    {plan.name}
                    {monthsFree && monthsFree > 0 && (
                      <span className="subgate__plan-savings">
                        {monthsFree} mois gratuit{monthsFree > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  <span className="subgate__plan-price">{priceLabel}</span>
                </span>
              </label>
            );
          })}
        </div>

        {/* Interval toggle */}
        <div className="subgate__interval">
          <button
            className={`subgate__interval-btn ${interval === 'monthly' ? 'subgate__interval-btn--active' : ''}`}
            onClick={() => setInterval('monthly')}
          >
            Mensuel
          </button>
          <button
            className={`subgate__interval-btn ${interval === 'annual' ? 'subgate__interval-btn--active' : ''}`}
            onClick={() => setInterval('annual')}
          >
            Annuel
          </button>
        </div>

        {/* Features */}
        {(() => {
          const currentPlan = plans.find(p => p.id === selectedPlan);
          if (!currentPlan) return null;
          const allFeatures = currentPlan.features && currentPlan.features.length > 0
            ? currentPlan.features
            : [currentPlan.description];

          return (
            <div className="subgate__features">
              <p className="subgate__features-label">
                Tout ce dont vous avez besoin pour travailler plus vite et plus intelligemment&nbsp;:
              </p>
              <ul className="subgate__features-list">
                {allFeatures.map((feat, i) => (
                  <li key={i}>
                    <Check size={16} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Error */}
        {error && (
          <div className="subgate__error">
            <p>{error}</p>
          </div>
        )}

        {/* Main CTA */}
        <button
          className="subgate__cta"
          onClick={handleTrial}
          disabled={isAnyLoading}
        >
          {trialLoading ? (
            <span className="subgate__btn-loading">
              <span className="subgate__spinner" />
              Creation...
            </span>
          ) : (
            <>
              <ArrowRight size={16} />
              Essayer gratuitement pendant {trialDays} jours
            </>
          )}
        </button>

        <p className="subgate__disclaimer">
          Nous vous rappellerons avant la fin de l'essai. Annulez a tout moment en quelques clics.
        </p>

        {/* Secondary actions */}
        <div className="subgate__actions">
          <button
            className="subgate__action-btn"
            onClick={handleRefresh}
            disabled={statusLoading}
          >
            <RefreshCw size={14} className={statusLoading ? 'subgate__icon-spin' : ''} />
            {statusLoading ? 'Verification...' : "J'ai deja paye, verifier l'acces"}
          </button>

          <button
            className="subgate__action-btn"
            onClick={handlePortal}
            disabled={portalLoading}
          >
            <ExternalLink size={14} />
            {portalLoading ? 'Ouverture...' : 'Portail de facturation'}
          </button>

          <button
            className="subgate__action-btn subgate__action-btn--danger"
            onClick={onSignOut}
          >
            <LogOut size={14} />
            Deconnexion
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionGate;
