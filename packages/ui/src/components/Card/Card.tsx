import type { HTMLAttributes, ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

/**
 * Carte canonique de la suite.
 *
 * Version padding-only à l'origine : un `<div>` blanc, un filet, un rayon, et
 * c'est tout. Les quatre apps qui l'ont refusée ne rendaient pas ça — elles
 * rendaient des COMPOSITES (`.anonymium-card` + `-header`/`-body`/`-footer`,
 * `.mgr-card` en `padding: 0` avec un en-tête `border-b`, `.card__header` /
 * `__footer` de Profilum et Socialum), avec une ombre (`--shadow-sm`) et un
 * trait plus marqué que `--theme-color-neutral-border`.
 *
 * Tout ce qui suit est ADDITIF : sans nouvelle prop, le rendu est celui d'hier,
 * à l'octet près (mêmes classes, même ordre, même espace final).
 */

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardVariant = 'default' | 'muted' | 'subtle';
/** `none` = aucune ombre (défaut, rendu historique). */
export type CardElevation = 'none' | 'sm' | 'md';
export type CardBorder = 'default' | 'strong' | 'none';
/** Padding des sections d'un composite (en-tête / corps / pied). */
export type CardSectionPadding = CardPadding;
export type CardBodyGap = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  /** `none` sert aux composites : le padding vit alors dans les sections. */
  padding?: CardPadding;
  /**
   * `muted` est un NO-OP historique (même fond que `default`) : quatre apps le
   * passent déjà en production, le corriger repeindrait leur écran. `subtle`
   * est le fond en retrait réel (`--theme-color-neutral-surface-muted`).
   */
  variant?: CardVariant;
  /** Ombre. Défaut `none` = rendu actuel. `md` reprend l'ombre des apps. */
  elevation?: CardElevation;
  /** Trait. `strong` = `--theme-color-neutral-border-strong`, `none` = sans. */
  border?: CardBorder;
  /** `false` rend `overflow: visible` (menus/tooltips qui doivent déborder). */
  clip?: boolean;
  /** Affordance cliquable (curseur, survol, anneau de focus). */
  interactive?: boolean;
  /** `data-testid` de la racine — contrat des specs Playwright des apps. */
  testId?: string;
}

export function Card({
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  elevation = 'none',
  border = 'default',
  clip = true,
  interactive = false,
  testId,
  ...rest
}: CardProps) {
  // Concaténation volontairement « à trous » : quand tout est au défaut, la
  // chaîne produite est exactement `card card--padding-md card--default ` +
  // className, espace final compris (cf. proof de non-régression).
  const modifiers =
    (elevation === 'none' ? '' : ` card--elevation-${elevation}`) +
    (border === 'default' ? '' : ` card--border-${border}`) +
    (clip ? '' : ' card--no-clip') +
    (interactive ? ' card--interactive' : '');

  return (
    <div
      data-testid={testId}
      {...rest}
      className={`card card--padding-${padding} card--${variant}${modifiers} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Sections du composite ───────────────────────────────────────────────────
// Aucune app ne les rend aujourd'hui : ce sont des composants NEUFS, donc
// libres de tout contrat pixel. Ils reproduisent le trio que les apps
// réécrivaient à la main, filet de séparation compris.

export type CardHeaderTitleSize = 'sm' | 'md' | 'lg';

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Titre. Rendu en `<h{headingLevel}>` (défaut `<h3>`). */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Icône libre rendue avant le titre — décorative (`aria-hidden`). */
  icon?: ReactNode;
  /** Zone d'actions poussée à droite (bouton, select, menu…). */
  actions?: ReactNode;
  /** Filet sous l'en-tête (défaut `true`). */
  divider?: boolean;
  padding?: CardSectionPadding;
  /** `sm` 14px/600 · `md` 15px/600 (défaut) · `lg` 24px/700. */
  titleSize?: CardHeaderTitleSize;
  /** Niveau du titre (défaut 3). */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** `start` aligne en haut quand l'en-tête est haut (défaut `center`). */
  align?: 'center' | 'start';
  className?: string;
  testId?: string;
  children?: ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  icon,
  actions,
  divider = true,
  padding = 'md',
  titleSize = 'md',
  headingLevel = 3,
  align = 'center',
  className = '',
  testId,
  children,
  ...rest
}: CardHeaderProps) {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const classes = [
    'card__header',
    `card__header--padding-${padding}`,
    divider ? '' : 'card__header--no-divider',
    align === 'start' ? 'card__header--align-start' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div data-testid={testId} {...rest} className={classes}>
      {icon && (
        <span className="card__header-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {(title || subtitle) && (
        <div className="card__header-text">
          {title && (
            <Heading className={`card__header-title card__header-title--${titleSize}`}>{title}</Heading>
          )}
          {subtitle && <p className="card__header-subtitle">{subtitle}</p>}
        </div>
      )}
      {children}
      {actions && <div className="card__header-actions">{actions}</div>}
    </div>
  );
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardSectionPadding;
  /** Empile les enfants en colonne avec un espace constant (défaut `none`). */
  gap?: CardBodyGap;
  className?: string;
  testId?: string;
  children?: ReactNode;
}

export function CardBody({
  padding = 'md',
  gap = 'none',
  className = '',
  testId,
  children,
  ...rest
}: CardBodyProps) {
  const classes = [
    'card__body',
    `card__body--padding-${padding}`,
    gap === 'none' ? '' : `card__body--gap-${gap}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div data-testid={testId} {...rest} className={classes}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Filet au-dessus du pied (défaut `true`). */
  divider?: boolean;
  padding?: CardSectionPadding;
  /** Répartition horizontale (défaut `between`, ce que rendent les apps). */
  align?: 'start' | 'between' | 'end';
  className?: string;
  testId?: string;
  children?: ReactNode;
}

export function CardFooter({
  divider = true,
  padding = 'md',
  align = 'between',
  className = '',
  testId,
  children,
  ...rest
}: CardFooterProps) {
  const classes = [
    'card__footer',
    `card__footer--padding-${padding}`,
    divider ? '' : 'card__footer--no-divider',
    align === 'between' ? '' : `card__footer--align-${align}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div data-testid={testId} {...rest} className={classes}>
      {children}
    </div>
  );
}

Card.displayName = 'Card';
CardHeader.displayName = 'Card.Header';
CardBody.displayName = 'Card.Body';
CardFooter.displayName = 'Card.Footer';

// `Card.Header` / `Card.Body` / `Card.Footer` en plus des exports nommés : les
// deux formes d'appel marchent, l'app choisit.
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
