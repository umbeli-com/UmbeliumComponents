import type { HTMLAttributes, ReactNode } from 'react';
import { Icon } from '../Icon';
import { Skeleton } from '../Skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
// Styles are imported separately via @umbeli-com/ui/styles

/**
 * Tuile de métrique canonique de la suite.
 *
 * Refusée par quatre apps qui rendaient toutes la même tuile à la main, avec
 * quatre manques mesurés :
 *   · Socialum la consomme mais écrit `value={isLoading ? '...' : kpi.value}`
 *     (DashboardPage.tsx) — il manque un ÉTAT DE CHARGEMENT ;
 *   · Dialum (Dashboard.tsx) et Manager (UsageManager.tsx) affichent une ligne
 *     d'appoint sous le chiffre (« sur 128 prospects », « of total capacity »)
 *     — il manque un SOUS-TITRE ;
 *   · Dialum et Manager passent une icône lucide libre, colorée par tuile
 *     (`<Users size={18} style={{ color: accent }} />`) là où le paquet
 *     n'acceptait qu'un NOM d'icône du mapping — il manque une ICÔNE LIBRE ;
 *   · Monitorum (Billing.tsx) pose `data-testid="billing-status"` sur sa tuile,
 *     et `subscription-gate.spec.ts` l'interroge — il manque le TESTID.
 * S'y ajoutent deux mises en page : label+icône puis chiffre puis appoint
 * (Manager) et icône+tendance puis label puis chiffre (Dialum).
 *
 * Tout est ADDITIF : sans nouvelle prop, le rendu est celui d'hier à l'octet
 * près (mêmes classes, même ordre, même espace final).
 */

export type KpiCardTrendDirection = 'up' | 'down' | 'neutral';

export interface KpiCardTrend {
  value: number;
  direction: KpiCardTrendDirection;
  /** Texte affiché à la place de « |value|% » — ex. « +12 pts », « ×1,4 ». */
  label?: ReactNode;
}

/** `inline` (défaut) = rendu historique. `stacked` = icône+tendance, label, chiffre. */
export type KpiCardLayout = 'inline' | 'stacked';
export type KpiCardIconVariant = 'plain' | 'bubble';
export type KpiCardIconPosition = 'start' | 'end';
/** `inherit` : AUCUNE classe du paquet sur le chiffre — typographie et couleur
 *  viennent de `valueClassName` seule (tuiles de Dialum). */
export type KpiCardValueSize = 'md' | 'lg' | 'inherit';
/** `inherit` : aucune classe du paquet sur le libellé (`labelClassName` seule). */
export type KpiCardLabelSize = 'default' | 'inherit';
export type KpiCardPadding = 'sm' | 'md' | 'lg';
export type KpiCardElevation = 'none' | 'sm' | 'md';

export interface KpiCardLabels {
  /** Texte accessible du gabarit de chargement. Défaut : « Chargement… ». */
  loading?: string;
}

const defaultKpiCardLabels: Required<KpiCardLabels> = {
  loading: 'Chargement…',
};

/** `data-testid` des morceaux — contrat des specs Playwright des apps. */
export interface KpiCardTestIds {
  root?: string;
  label?: string;
  value?: string;
  trend?: string;
  subtitle?: string;
}

export interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  /** Nom d'icône du mapping `Icon`. Ignoré si `iconNode` est fourni. */
  icon?: string;
  /** Icône libre — ex. `<Users size={18} style={{ color: accent }} />`. */
  iconNode?: ReactNode;
  /** `bubble` = pastille ronde 36px sur fond `--theme-color-neutral-surface`. */
  iconVariant?: KpiCardIconVariant;
  /** `end` pousse l'icône à droite du label (tuile Manager). */
  iconPosition?: KpiCardIconPosition;
  trend?: KpiCardTrend;
  /** Ligne d'appoint sous le chiffre — « sur 128 prospects ». */
  subtitle?: ReactNode;
  /** Pastille rendue à côté du chiffre (statut d'abonnement, plan…). */
  badge?: ReactNode;
  /** Lien / bouton rendu en pied de tuile. Rendu tel quel : agnostique du routeur. */
  action?: ReactNode;
  /** Contenu libre sous le chiffre — barre de progression, mini-graphe… */
  children?: ReactNode;
  layout?: KpiCardLayout;
  /** Gabarit de chargement à la place du chiffre. */
  loading?: boolean;
  /** `lg` = chiffre à 1.875rem (tuiles de tableau de bord de Dialum). */
  valueSize?: KpiCardValueSize;
  /** Sans valeur : padding historique (1.25rem). Avec : échelle de `Card`. */
  padding?: KpiCardPadding;
  elevation?: KpiCardElevation;
  labels?: KpiCardLabels;
  /** Style du libellé (défaut `default`). */
  labelSize?: KpiCardLabelSize;
  /** Classe ajoutée au libellé (`.kpi-card__label`). */
  labelClassName?: string;
  /** Classe ajoutée au chiffre (`.kpi-card__value`). */
  valueClassName?: string;
  /**
   * Rendre la racine `div.kpi-card` (défaut `true`). `false` : les parties
   * (en-tête, corps, pied) sont rendues en fragment, dans le conteneur de
   * l'app — Dialum pose ses tuiles dans `<Card className="dialum-card-lift">`,
   * et la racine du paquet repeignait fond, padding et élévation par-dessus.
   * Sans racine, `className`, `testId`, les attributs HTML et les
   * modificateurs de racine (`layout`, `valueSize="lg"`, `padding`,
   * `elevation`) sont sans objet — la mise en page vient du conteneur.
   */
  renderRoot?: boolean;
  /** `data-testid` de la racine. */
  testId?: string;
  /** `data-testid` des morceaux (label, chiffre, tendance, sous-titre). */
  testIds?: KpiCardTestIds;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  iconNode,
  iconVariant = 'plain',
  iconPosition = 'start',
  trend,
  subtitle,
  badge,
  action,
  children,
  layout = 'inline',
  loading = false,
  valueSize = 'md',
  padding,
  elevation = 'none',
  labels,
  testId,
  testIds,
  className = '',
  labelSize = 'default',
  labelClassName,
  valueClassName,
  renderRoot = true,
  ...rest
}: KpiCardProps) {
  const t = { ...defaultKpiCardLabels, ...labels };

  const getTrendClass = () => {
    if (!trend) return '';
    return trend.direction === 'up'
      ? 'kpi-card__trend--up'
      : trend.direction === 'down'
        ? 'kpi-card__trend--down'
        : '';
  };

  const renderTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp size={14} />;
    if (trend.direction === 'down') return <TrendingDown size={14} />;
    return <Minus size={14} />;
  };

  // Concaténation « à trous » : au défaut, la chaîne vaut exactement
  // `kpi-card ` + className, espace final compris.
  const modifiers =
    (layout === 'inline' ? '' : ` kpi-card--${layout}`) +
    (valueSize === 'md' || valueSize === 'inherit' ? '' : ` kpi-card--value-${valueSize}`) +
    (padding ? ` kpi-card--padding-${padding}` : '') +
    (elevation === 'none' ? '' : ` kpi-card--elevation-${elevation}`) +
    (loading ? ' kpi-card--loading' : '');

  const iconContent = iconNode ?? (icon ? <Icon name={icon} size={24} /> : null);

  const iconEl = iconContent ? (
    <span className={`kpi-card__icon${iconVariant === 'bubble' ? ' kpi-card__icon--bubble' : ''}`}>
      {iconContent}
    </span>
  ) : null;

  /** Classe d'une partie : celle du paquet (sauf `inherit`) puis celle de
   *  l'app ; au défaut, la chaîne d'hier. Vide ⇒ pas d'attribut `class`. */
  const partClass = (own: string | null, app?: string) => {
    const value = own ? (app ? `${own} ${app}` : own) : (app ?? '');
    return value ? { className: value } : null;
  };

  const labelEl = (
    <span
      {...partClass(labelSize === 'inherit' ? null : 'kpi-card__label', labelClassName)}
      data-testid={testIds?.label}
    >
      {label}
    </span>
  );

  const valueEl = loading ? (
    <Skeleton
      className="kpi-card__skeleton kpi-card__skeleton--value"
      role="status"
      aria-label={t.loading}
      data-testid={testIds?.value}
    />
  ) : (
    <span
      {...partClass(valueSize === 'inherit' ? null : 'kpi-card__value', valueClassName)}
      data-testid={testIds?.value}
    >
      {value}
    </span>
  );

  const trendEl =
    trend && !loading ? (
      <span className={`kpi-card__trend ${getTrendClass()}`} data-testid={testIds?.trend}>
        <span className="kpi-card__trend-icon">{renderTrendIcon()}</span>
        {/* Le fragment garde DEUX enfants texte (nombre puis « % »), comme la
            version historique : même DOM, même `textContent`, même rendu. */}
        <span className="kpi-card__trend-value">
          {trend.label !== undefined ? trend.label : <>{Math.abs(trend.value)}%</>}
        </span>
      </span>
    ) : null;

  // Rendus communs aux deux mises en page, posés après le corps.
  const tail = (
    <>
      {subtitle &&
        (loading ? (
          // Le gabarit porte le MÊME `data-testid` que le sous-titre rendu (le
          // gabarit du chiffre le fait déjà) : sinon le nœud interrogé par une
          // spec disparaissait pendant le chargement pour le sous-titre mais
          // pas pour le chiffre — deux contrats différents dans la même tuile.
          <Skeleton
            className="kpi-card__skeleton kpi-card__skeleton--subtitle"
            aria-hidden="true"
            data-testid={testIds?.subtitle}
          />
        ) : (
          <span className="kpi-card__subtitle" data-testid={testIds?.subtitle}>
            {subtitle}
          </span>
        ))}
      {children}
      {action && <div className="kpi-card__action">{action}</div>}
    </>
  );

  // Sans racine, les parties remontent dans le conteneur de l'app. Fonction
  // d'enveloppe et non composant : un composant déclaré ici changerait
  // d'identité à chaque rendu et remonterait tout le sous-arbre.
  const wrap = (parts: ReactNode) =>
    renderRoot ? (
      <div
        data-testid={testId ?? testIds?.root}
        {...rest}
        className={`kpi-card${modifiers} ${className}`}
      >
        {parts}
      </div>
    ) : (
      <>{parts}</>
    );

  if (layout === 'stacked') {
    return wrap(
      <>
        {(iconEl || trendEl) && (
          <div className="kpi-card__toprow">
            {iconEl}
            {trendEl}
          </div>
        )}
        {labelEl}
        <div className="kpi-card__body">
          {valueEl}
          {badge}
        </div>
        {tail}
      </>,
    );
  }

  return wrap(
    <>
      <div className={`kpi-card__header${iconPosition === 'end' ? ' kpi-card__header--icon-end' : ''}`}>
        {iconPosition === 'end' ? (
          <>
            {labelEl}
            {iconEl}
          </>
        ) : (
          <>
            {iconEl}
            {labelEl}
          </>
        )}
      </div>
      <div className="kpi-card__body">
        {valueEl}
        {trendEl}
        {badge}
      </div>
      {tail}
    </>,
  );
}

KpiCard.displayName = 'KpiCard';

export default KpiCard;
