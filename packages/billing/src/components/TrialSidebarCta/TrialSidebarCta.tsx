import { MouseEvent } from 'react';
import { Zap } from 'lucide-react';

/**
 * Carte d'essai canonique de la SIDEBAR (référence Webum, pixel-audit 2026-08
 * gelé) : « Essai — N jours restants » + bouton « Passer au plan payant ».
 *
 * Le CTA est un LIEN vers la page Facturation DE L'APP (`to`) — jamais
 * directement vers Stripe : c'est la page Facturation qui possède le choix
 * Mensuel/Annuel et le checkout (BillingUpgradeCard → POST /stripe/app-checkout
 * → redirection vers l'URL Stripe retournée).
 *
 * À rendre dans le `upgradeSlot` de SidebarNav (@umbeli-com/layout), sous les
 * toggles thème/langue. Replié (`collapsed`) → bouton-icône éclair 34×34.
 *
 * Styles : `.sidebar-upgrade*` — livrés par les styles de CE package
 * (`@umbeli-com/billing/styles`) et par `@umbeli-com/layout` (mêmes valeurs).
 */
export interface TrialSidebarCtaProps {
  /** Jours d'essai restants (≤ 1 → libellé « 1 jour restant »). */
  daysLeft: number;
  /** Route Facturation de l'app (ex. `/app/billing`). */
  to: string;
  /** Navigation SPA (router de l'app) — le clic est intercepté
   *  (preventDefault) et `onNavigate(to)` est appelé ; sans lui, le lien
   *  navigue en pleine page. */
  onNavigate?: (to: string) => void;
  /** Sidebar repliée → icône éclair seule (34×34, fond accent). */
  collapsed?: boolean;
  /** i18n — défauts en français (copie canonique Webum). */
  labels?: {
    /** défaut : (n) => `Essai — ${n} jours restants` */
    days?: (days: number) => string;
    /** défaut : 'Essai — 1 jour restant' */
    one?: string;
    /** défaut : 'Passer au plan payant' */
    cta?: string;
  };
  /** Classes additionnelles sur la carte (état déplié). */
  className?: string;
  /** Classes additionnelles sur le lien CTA (ex. classes bouton de l'app). */
  ctaClassName?: string;
}

const defaultLabels = {
  days: (days: number) => `Essai — ${days} jours restants`,
  one: 'Essai — 1 jour restant',
  cta: 'Passer au plan payant',
};

export function TrialSidebarCta({
  daysLeft,
  to,
  onNavigate,
  collapsed = false,
  labels,
  className,
  ctaClassName,
}: TrialSidebarCtaProps) {
  const l = { ...defaultLabels, ...labels };
  const daysLabel = daysLeft <= 1 ? l.one : l.days(daysLeft);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    if (event.defaultPrevented) return;
    // Laisser les ouvertures « nouvel onglet » (cmd/ctrl/middle-click) au navigateur.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onNavigate(to);
  };

  if (collapsed) {
    return (
      <a
        href={to}
        onClick={handleClick}
        className={['sidebar-upgrade-collapsed', ctaClassName || ''].filter(Boolean).join(' ')}
        data-testid="trial-banner-upgrade"
        title={l.cta}
        aria-label={l.cta}
      >
        <Zap size={16} />
      </a>
    );
  }

  return (
    <div
      className={['sidebar-upgrade', className || ''].filter(Boolean).join(' ')}
      data-testid="trial-banner"
      role="status"
    >
      <span className="sidebar-upgrade__days">{daysLabel}</span>
      <a
        href={to}
        onClick={handleClick}
        className={['sidebar-upgrade__cta', ctaClassName || ''].filter(Boolean).join(' ')}
        data-testid="trial-banner-upgrade"
      >
        <Zap size={16} /> {l.cta}
      </a>
    </div>
  );
}

export default TrialSidebarCta;
