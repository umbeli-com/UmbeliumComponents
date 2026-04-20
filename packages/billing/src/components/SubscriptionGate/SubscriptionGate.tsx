import { useState, useEffect, useCallback } from 'react';
import { Sparkles, ArrowRight, CreditCard, RefreshCw, ExternalLink, LogOut, Check, Zap } from 'lucide-react';

export interface SubscriptionGatePlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  description: string;
  features?: string[];
  popular?: boolean;
}

export interface SubscriptionGateProps {
  /** Display name of the SaaS app (e.g. "Dialum", "Socialum") */
  appName: string;
  /** Short tagline shown under the heading */
  appTagline?: string;
  /** Currently authenticated user's email */
  userEmail?: string;
  /** Available billing plans */
  plans: SubscriptionGatePlan[];
  /** Number of free trial days (default: 14) */
  trialDays?: number;
  /** Called when user clicks "Start free trial" */
  onStartTrial: () => Promise<void>;
  /** Called when user selects a paid plan */
  onSelectPlan: (planId: string) => Promise<void>;
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
  appTagline,
  userEmail,
  plans,
  trialDays = 14,
  onStartTrial,
  onSelectPlan,
  onRefreshStatus,
  onOpenPortal,
  onSignOut,
  statusLoading = false,
  error: externalError = null,
}: SubscriptionGateProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const error = localError || externalError;

  useEffect(() => {
    // Stagger the entrance animation
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleTrial = useCallback(async () => {
    setTrialLoading(true);
    setLocalError(null);
    try {
      await onStartTrial();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Impossible de demarrer l'essai");
    } finally {
      setTrialLoading(false);
    }
  }, [onStartTrial]);

  const handleCheckout = useCallback(async (planId: string) => {
    setLoadingPlan(planId);
    setLocalError(null);
    try {
      await onSelectPlan(planId);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Erreur lors de la redirection');
    } finally {
      setLoadingPlan(null);
    }
  }, [onSelectPlan]);

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

  const formatPrice = (price: number, interval: 'month' | 'year') => {
    return { amount: `${price}€`, period: interval === 'month' ? '/mois' : '/an' };
  };

  const isAnyLoading = trialLoading || loadingPlan !== null || portalLoading;

  return (
    <div className="subgate">
      <div className={`subgate__container ${mounted ? 'subgate__container--visible' : ''}`}>
        {/* Header */}
        <div className="subgate__header" style={{ transitionDelay: '0.1s' }}>
          <span className="subgate__eyebrow">
            <Sparkles size={13} />
            Activation requise
          </span>

          <h1 className="subgate__title">
            Activez <span className="subgate__title-accent">{appName}</span>
          </h1>

          {appTagline && (
            <p className="subgate__tagline">{appTagline}</p>
          )}

          {userEmail && (
            <p className="subgate__email">
              Connecte en tant que <strong>{userEmail}</strong>
            </p>
          )}
        </div>

        {/* Free Trial CTA */}
        <div className="subgate__trial" style={{ transitionDelay: '0.2s' }}>
          <div className="subgate__trial-content">
            <div className="subgate__trial-icon">
              <Zap size={20} />
            </div>
            <div className="subgate__trial-text">
              <h2 className="subgate__trial-title">Essai gratuit</h2>
              <p className="subgate__trial-desc">
                Explorez {appName} pendant {trialDays} jours, sans engagement.
              </p>
            </div>
          </div>
          <button
            className="subgate__trial-btn"
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
                Demarrer l'essai gratuit
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Plan Cards */}
        <div className="subgate__plans" style={{ transitionDelay: '0.3s' }}>
          <p className="subgate__plans-label">Ou choisissez un plan</p>
          <div className="subgate__plans-grid">
            {plans.map((plan, index) => {
              const { amount, period } = formatPrice(plan.price, plan.interval);
              return (
                <div
                  key={plan.id}
                  className={`subgate__plan ${plan.popular ? 'subgate__plan--popular' : ''}`}
                  style={{ transitionDelay: `${0.35 + index * 0.08}s` }}
                >
                  {plan.popular && (
                    <span className="subgate__plan-badge">Populaire</span>
                  )}
                  <div className="subgate__plan-head">
                    <h3 className="subgate__plan-name">{plan.name}</h3>
                    <div className="subgate__plan-price">
                      <span className="subgate__plan-amount">{amount}</span>
                      <span className="subgate__plan-period">{period}</span>
                    </div>
                  </div>
                  <p className="subgate__plan-desc">{plan.description}</p>

                  {plan.features && plan.features.length > 0 && (
                    <ul className="subgate__plan-features">
                      {plan.features.map((feat, i) => (
                        <li key={i}>
                          <Check size={14} />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    className={`subgate__plan-btn ${plan.popular ? 'subgate__plan-btn--primary' : ''}`}
                    disabled={isAnyLoading}
                    onClick={() => handleCheckout(plan.id)}
                  >
                    {loadingPlan === plan.id ? (
                      <span className="subgate__btn-loading">
                        <span className="subgate__spinner" />
                        Redirection...
                      </span>
                    ) : (
                      <>
                        <CreditCard size={15} />
                        Choisir ce plan
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="subgate__error">
            <p>{error}</p>
          </div>
        )}

        {/* Secondary Actions */}
        <div className="subgate__actions" style={{ transitionDelay: '0.45s' }}>
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
