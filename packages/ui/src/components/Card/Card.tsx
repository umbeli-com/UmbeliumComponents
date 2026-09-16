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

/**
 * Taille du titre.
 *
 * `inherit` (ajout) n'écrit AUCUNE typographie : le composant n'émet alors
 * aucune classe `card__header-title--*`, donc ni `font-size`, ni `line-height`,
 * ni `font-weight`, ni `letter-spacing` ne viennent du paquet. C'est ce qui
 * permet à `titleClassName` de brancher la typographie de l'app SANS dépendre
 * de l'ordre des feuilles : à valeurs égales de spécificité (0,1,0), une
 * déclaration qui n'existe pas ne peut pas gagner.
 *
 * PORTÉE EXACTE de cette garantie : les QUATRE propriétés ci-dessus, et elles
 * seules. La classe de base `.card__header-title` reste émise dans tous les cas
 * et continue de déclarer `margin: 0` et `color: var(--theme-color-neutral-text)`.
 * Ces deux-là sont à spécificité ÉGALE (0,1,0) avec la classe de l'app : elles
 * se tranchent à l'ordre des feuilles, pas par absence. La convention de la
 * suite charge le paquet AVANT l'app (`Anonymum/src/main.tsx` : `@umbeli-com/ui/styles`
 * ligne 5, puis `./styles/index.scss` ligne 7), donc l'app gagne — mais une app
 * qui inverserait cet ordre hériterait de la couleur et de la marge du paquet.
 * `.anonymium-card-title` redéclare `color`, donc le cas est réel.
 */
export type CardHeaderTitleSize = 'sm' | 'md' | 'lg' | 'inherit';

/**
 * Balise du titre. La hiérarchie des titres appartient à la PAGE, pas au
 * composant — même raisonnement que `EmptyStateTitleTag`. Anonymum rend `h3`
 * dans ses six panneaux (`InputPanel.tsx:27`, `OutputPanel.tsx:65`,
 * `RulesPanel.tsx:67`, `MappingPanel.tsx:28`, `SettingsPanel.tsx:121`,
 * `RestorePanel.tsx:42`) mais `h4` dans `DetectionsPreview.tsx:41` ; `p` /
 * `div` / `span` servent aux barres d'outils où le libellé n'est pas un titre
 * de plan.
 */
export type CardHeaderTitleTag =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'div'
  | 'span';

/**
 * Répartition de l'en-tête.
 *
 * `center` / `start` = axe VERTICAL (`align-items`), rendu historique.
 * `between` = axe HORIZONTAL (`justify-content: space-between`), repris à
 * l'identique de `CardFooterProps['align']`. Indispensable dès que l'en-tête
 * est rendu par `children` et non par `title` + `actions` : sans lui, le
 * libellé et l'action se touchent (`.card__header` n'a que `display: flex` +
 * `gap: .75rem`). Manager le contournait déjà à la main —
 * `UmbeliumManager/front/src/components/saas/ActivityLog.tsx:35` :
 * `<Card.Header className="flex-wrap justify-between">`.
 *
 * ATTENTION — cette énumération MÉLANGE DEUX AXES, contrairement à celle de
 * `CardFooter` qui n'en touche qu'un. `start` et `between` sont donc exclusifs
 * alors qu'ils sont orthogonaux en CSS : il n'existe pas de valeur qui donne à
 * la fois `align-items: flex-start` et `space-between`. Pour ce cas, combiner
 * `align="between"` avec `className="card__header--align-start"` (les deux
 * classes sont indépendantes), ou passer par les utilitaires de l'app.
 *
 * `between` ne se contente pas d'ajouter `justify-content` : le SCSS neutralise
 * aussi, SOUS CETTE SEULE CLASSE, le `flex: 1` de `.card__header-text` et le
 * `margin-left: auto` de `.card__header-actions`. Sans cela il n'y aurait aucun
 * espace libre à répartir et `between` serait un no-op silencieux (cf. le
 * commentaire de `.card__header--align-between > …` dans `Card.scss`).
 */
export type CardHeaderAlign = 'center' | 'start' | 'between';

/**
 * Espace SOUS l'en-tête, pour la carte à padding unique dont l'en-tête n'est
 * pas séparé par un filet mais par de l'air : `.anonymium-card-header`
 * (`Anonymum/src/styles/components/_card.scss:12-14`) est un `flex-between`
 * SANS trait avec `margin-bottom: $space-20` (= 20px,
 * `Anonymum/src/styles/_variables.scss:67`). `md` vaut exactement ces 20px.
 *
 * Volontairement SANS défaut, et non déduit de `divider={false}` : déduire
 * repeindrait le rendu de tout appel `divider={false}` existant, ce que la
 * règle de non-rupture interdit. Compagnon explicite de `divider={false}`.
 *
 * Cette marge S'AJOUTE au `padding` de l'en-tête, elle ne le remplace pas. La
 * recette qui reproduit vraiment `.anonymium-card-header` est donc le TRIO
 * `<Card padding="md">` + `<Card.Header padding="none" divider={false}
 * spacing="md">` : sans `padding="none"`, on cumule les 16px du
 * `card__header--padding-md` et les 20px de `spacing`.
 *
 * `none` n'émet aucune classe — c'est un synonyme explicite du défaut (aucune
 * marge), pas un `margin-bottom: 0` capable d'annuler une marge posée ailleurs.
 */
export type CardHeaderSpacing = 'none' | 'sm' | 'md' | 'lg';

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
  /** `sm` 14px/600 · `md` 15px/600 (défaut) · `lg` 24px/700 · `inherit` : le
   *  paquet n'écrit aucune typographie, l'app la pose via `titleClassName`. */
  titleSize?: CardHeaderTitleSize;
  /** Niveau du titre (défaut 3). Ignoré si `titleAs` est fourni. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Balise du titre. Prioritaire sur `headingLevel` — seule façon de rendre
   *  un titre qui n'est pas un `h*` (`p`, `div`, `span`). */
  titleAs?: CardHeaderTitleTag;
  /** Classe ajoutée APRÈS `card__header-title[--size]` sur l'élément de titre.
   *  C'est le branchement de la typographie de l'app : Anonymum passe
   *  `titleClassName="anonymium-card-title"` (`typography-h3` : 24px/32px/700/
   *  -0.01em + `--color-text-primary`), Manager passerait ses utilitaires.
   *  À combiner avec `titleSize="inherit"` pour que le paquet n'écrive aucune
   *  TYPOGRAPHIE (`margin` et `color` restent déclarés par la classe de base :
   *  cf. `CardHeaderTitleSize`). Le rang dans l'attribut `class` n'a aucun effet
   *  sur la cascade — « APRÈS » ne décrit que la lisibilité de la chaîne. */
  titleClassName?: string;
  /** Idem pour le sous-titre (`.anonymium-card-subtitle` côté Anonymum).
   *
   *  ASYMÉTRIE ASSUMÉE : il n'existe PAS d'équivalent de `titleSize="inherit"`
   *  pour le sous-titre. `.card__header-subtitle` est toujours émis et déclare
   *  sans condition `font-size: .75rem`, `line-height: 1.125rem`, `color` et
   *  `margin: .125rem 0 0` — les quatre que `.anonymium-card-subtitle`
   *  (14px/22px, `--color-text-muted`, `margin-top: 4px`) doit justement
   *  battre. Cette classe ne gagne donc PAS par absence comme le titre : elle
   *  gagne à spécificité égale (0,1,0) par l'ORDRE DES FEUILLES, et seulement
   *  si l'app charge son SCSS après `@umbeli-com/ui/styles` — ce qu'impose la
   *  convention de la suite (`Anonymum/src/main.tsx` lignes 5 puis 7).
   *  Découper la base pour lui offrir le même `inherit` changerait la chaîne de
   *  classes de TOUS les sous-titres déjà rendus : écarté ici. */
  subtitleClassName?: string;
  /** `start` aligne en haut quand l'en-tête est haut (défaut `center`) ;
   *  `between` répartit horizontalement, comme `CardFooter`. */
  align?: CardHeaderAlign;
  /** Espace sous l'en-tête. Sans valeur : aucune marge (rendu historique). */
  spacing?: CardHeaderSpacing;
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
  titleAs,
  titleClassName,
  subtitleClassName,
  align = 'center',
  spacing,
  className = '',
  testId,
  children,
  ...rest
}: CardHeaderProps) {
  const Heading: CardHeaderTitleTag =
    titleAs ?? (`h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6');
  // `align` : même forme que `CardFooter` — rien pour la valeur par défaut, une
  // classe sinon. Pour `center` et `start`, la chaîne produite est au caractère
  // près celle d'hier (`''` / `'card__header--align-start'`).
  const classes = [
    'card__header',
    `card__header--padding-${padding}`,
    divider ? '' : 'card__header--no-divider',
    align === 'center' ? '' : `card__header--align-${align}`,
    spacing === undefined || spacing === 'none' ? '' : `card__header--spacing-${spacing}`,
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
            <Heading
              className={
                `card__header-title${
                  titleSize === 'inherit' ? '' : ` card__header-title--${titleSize}`
                }${titleClassName ? ` ${titleClassName}` : ''}`
              }
            >
              {title}
            </Heading>
          )}
          {subtitle && (
            <p
              className={`card__header-subtitle${
                subtitleClassName ? ` ${subtitleClassName}` : ''
              }`}
            >
              {subtitle}
            </p>
          )}
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
