import { useState } from 'react';
import { CreditCard, Zap } from 'lucide-react';

export type BillingInterval = 'monthly' | 'annual';

/**
 * Carte d'upgrade canonique de la page FACTURATION (pendant l'essai) —
 * référence Webum/Anonymum : toggle Mensuel/Annuel (badge « 2 mois offerts »),
 * CTA « Passer au plan payant — {prix} » avec reflet périodique, sous-texte
 * « Débité aujourd'hui — vos N jours d'essai restants… ».
 *
 * CONTRAT DE PAIEMENT (Manager 2026-08) : `onCheckout(interval)` appelle
 * `POST /stripe/app-checkout` qui renvoie TOUJOURS `{ url }` — l'app DOIT
 * rediriger vers cette URL Stripe (`window.location.href = url`), carte
 * enregistrée ou non. Plus JAMAIS de chemin `paid:true` silencieux.
 */
export interface BillingUpgradeCardProps {
  /** Prix affichés (monnaie entière, ex. { monthly: 29, annual: 290 }). */
  prices: { monthly: number; annual: number };
  /** Code devise Intl (défaut 'EUR'). */
  currency?: string;
  /** Locale d'affichage des prix (défaut 'fr-FR'). */
  locale?: string;
  /** Jours d'essai restants — pilote le sous-texte. */
  daysLeft?: number | null;
  /** Lance le checkout : DOIT rediriger vers l'URL Stripe retournée. */
  onCheckout: (interval: BillingInterval) => void | Promise<void>;
  /** Requête en cours → CTA et toggle désactivés, libellé « Activation… ». */
  busy?: boolean;
  /** Intervalle CONTRÔLÉ (sinon état interne, défaut `defaultInterval`). */
  interval?: BillingInterval;
  onIntervalChange?: (interval: BillingInterval) => void;
  /** Intervalle initial en mode non contrôlé (défaut 'annual'). */
  defaultInterval?: BillingInterval;
  /** i18n — défauts en français (copie canonique). */
  labels?: {
    /** défaut : 'Convaincu ? Passez au plan payant dès maintenant' */
    title?: string;
    /** défaut : 'Mensuel' */
    monthly?: string;
    /** défaut : 'Annuel' */
    annual?: string;
    /** défaut : '2 mois offerts' */
    annualBadge?: string;
    /** défaut : 'Passer au plan payant' (le prix est suffixé : « — 29 €/mois ») */
    cta?: string;
    /** défaut : 'Activation…' */
    ctaBusy?: string;
    /** défaut : '/mois' */
    perMonth?: string;
    /** défaut : '/an' */
    perYear?: string;
    /** défaut : (n) => `Débité aujourd'hui — vos ${n} jours d'essai restants sont ajoutés à votre première période` */
    note?: (days: number) => string;
    /** défaut : 'Débité aujourd'hui — votre dernier jour d'essai est ajouté à votre première période' */
    noteOne?: string;
  };
  /** data-testid — défauts Webum ('upgrade-now-card' / 'upgrade-now-cta') ;
   *  surchargables par app (Anonymum : 'billing-upgrade-card'…). */
  testIds?: {
    card?: string;
    cta?: string;
    interval?: (interval: BillingInterval) => string;
  };
  className?: string;
}

const defaultLabels = {
  title: 'Convaincu ? Passez au plan payant dès maintenant',
  monthly: 'Mensuel',
  annual: 'Annuel',
  annualBadge: '2 mois offerts',
  cta: 'Passer au plan payant',
  ctaBusy: 'Activation…',
  perMonth: '/mois',
  perYear: '/an',
  note: (days: number) => `Débité aujourd'hui — vos ${days} jours d'essai restants sont ajoutés à votre première période`,
  noteOne: "Débité aujourd'hui — votre dernier jour d'essai est ajouté à votre première période",
};

const defaultTestIds = {
  card: 'upgrade-now-card',
  cta: 'upgrade-now-cta',
  interval: (interval: BillingInterval) => `billing-upgrade-interval-${interval}`,
};

function fmtPrice(n: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
}

export function BillingUpgradeCard({
  prices,
  currency = 'EUR',
  locale = 'fr-FR',
  daysLeft = null,
  onCheckout,
  busy = false,
  interval: controlledInterval,
  onIntervalChange,
  defaultInterval = 'annual',
  labels,
  testIds,
  className,
}: BillingUpgradeCardProps) {
  const l = { ...defaultLabels, ...labels };
  const tid = { ...defaultTestIds, ...testIds };
  const [internalInterval, setInternalInterval] = useState<BillingInterval>(defaultInterval);
  const interval = controlledInterval ?? internalInterval;

  const selectInterval = (next: BillingInterval) => {
    if (controlledInterval === undefined) setInternalInterval(next);
    onIntervalChange?.(next);
  };

  const price = interval === 'annual' ? prices.annual : prices.monthly;
  const priceLabel = `${fmtPrice(price, currency, locale)}${interval === 'annual' ? l.perYear : l.perMonth}`;
  const note = daysLeft != null && daysLeft > 1 ? l.note(daysLeft) : l.noteOne;

  return (
    <div
      className={['billing-upgrade-card', className || ''].filter(Boolean).join(' ')}
      data-testid={tid.card}
    >
      <div className="billing-upgrade-card__left">
        <div className="billing-upgrade-card__title">
          <Zap size={16} className="billing-upgrade-card__title-icon" />
          {l.title}
        </div>
        <div>
          <div className="billing-upgrade-card__toggle">
            {(['monthly', 'annual'] as const).map((iv) => (
              <button
                key={iv}
                type="button"
                data-testid={tid.interval(iv)}
                className={`billing-upgrade-card__toggle-btn ${interval === iv ? 'is-active' : ''}`}
                onClick={() => selectInterval(iv)}
                disabled={busy}
              >
                {iv === 'monthly' ? l.monthly : l.annual}
                {iv === 'annual' && (
                  <span className="billing-upgrade-card__badge">{l.annualBadge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="billing-upgrade-card__right">
        <button
          type="button"
          className="billing-upgrade-card__cta"
          data-testid={tid.cta}
          onClick={() => { void onCheckout(interval); }}
          disabled={busy}
        >
          <CreditCard size={16} /> {busy ? l.ctaBusy : `${l.cta} — ${priceLabel}`}
        </button>
        <p className="billing-upgrade-card__note">{note}</p>
      </div>
    </div>
  );
}

export default BillingUpgradeCard;
