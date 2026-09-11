import type { CSSProperties, ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

/**
 * Deux façons de dessiner le même vide. Le paquet ne rendait que la première,
 * les apps ne rendaient que la seconde — d'où sept refus d'adoption.
 *
 *  - `default` : pastille ronde 56px (fond `neutral-surface`) + titre `h2`
 *    1.125rem/600. Rendu HISTORIQUE, inchangé au pixel (Monitorum `.mo-empty`
 *    et Dialum `.dialum-empty-in-card` s'appuient dessus).
 *  - `plain` : icône NUE — aucune pastille, aucun fond, `opacity: .5` — et
 *    titre en texte, pas en `h2`. C'est ce que rendent déjà Anonymum
 *    (`.empty-state-icon` → svg 48px opacity .5), Socialum
 *    (`<Calendar size={32} />` nu), Profilum (`.empty__icon`) et
 *    Profilum/frontend (`<Icon size={48} />` nu).
 */
export type EmptyStateVariant = 'default' | 'plain';

/**
 * Élément du titre. La hiérarchie des titres appartient à la PAGE, pas au
 * composant : Webum admin stylait `.empty-state h2`, Servum un `h2`, Profilum
 * un `h3`, Anonymum front2 un simple `p`. Imposer `h2` cassait leur plan de
 * titres (et donc leur audit a11y) — d'où le choix explicite.
 */
export type EmptyStateTitleTag =
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
 * `data-testid` posés sur chaque partie. Contrat des suites Playwright des
 * apps : Anonymum interroge `front2-empty` sur la RACINE de son état vide
 * (`e2e/ui/front2.spec.ts`), et le jour où une spec vise le titre ou l'action
 * elle doit pouvoir le faire sans re-écrire le composant.
 */
export interface EmptyStateTestIds {
  /** Racine. Équivaut à la prop `testId`, qu'il emporte s'il est fourni. */
  root?: string;
  icon?: string;
  title?: string;
  description?: string;
  action?: string;
}

export interface EmptyStateProps {
  /** Icône optionnelle (décorative) rendue dans la pastille du haut —
   *  ex. `<Inbox size={26} />`. En `variant="plain"`, elle est rendue nue. */
  icon?: ReactNode;
  /** Titre du panneau « rien ici pour l'instant ». Fourni par l'app.
   *  Optionnel depuis la 1.1.2 : Anonymum, Socialum et Scrapium rendent un
   *  vide SANS titre (juste une phrase). Omis ⇒ aucun élément de titre n'est
   *  rendu. Tous les appels existants passent un titre : leur rendu ne bouge
   *  pas. */
  title?: ReactNode;
  /** Phrase d'explication / d'amorçage sous le titre. */
  description?: ReactNode;
  /** Zone d'action (bouton, lien…) — rendue telle quelle, donc le composant
   *  reste agnostique du routeur : passer un `<Link>`/`<Button>` de l'app. */
  action?: ReactNode;
  /** Variante resserrée pour un vide DANS une carte/un panneau. */
  compact?: boolean;
  /** Peau de l'état vide (défaut : `default`, le rendu historique). */
  variant?: EmptyStateVariant;
  /** Élément du titre. Défaut : `h2` en `default`, `p` en `plain`. */
  titleAs?: EmptyStateTitleTag;
  /** Taille imposée à l'icône, en px si nombre. Opt-in : sans elle, aucune
   *  règle de taille n'est écrite et l'icône garde la sienne. Anonymum force
   *  48px en CSS sur des svg déclarés à 40 — `iconSize={48}` reproduit ça
   *  sans toucher aux icônes. */
  iconSize?: number | string;
  /** Contenu libre inséré APRÈS la description et AVANT l'action — la liste
   *  d'étapes de l'état vide front2 d'Anonymum (`<ol>`), par exemple. */
  children?: ReactNode;
  /** Re-affirme les valeurs du paquet à spécificité (0,2,0) — sur la racine
   *  ET sur chaque partie — pour que le `.empty-state` LOCAL d'une app ne
   *  déteigne plus sur le composant.
   *
   *  Mesuré : la racine ne suffisait pas. Les apps ne stylent pas `.empty-state`
   *  seul, elles stylent ses ENFANTS par leur balise — Webum
   *  (`apps/admin/src/styles.css:741`) pose `.empty-state h2 { font-size: 18px;
   *  color: var(--text); margin-bottom: 8px }`, Servum
   *  (`apps/web/src/styles/main.scss:509`) pose `.empty-state h2` ET
   *  `.empty-state p { margin-bottom: 24px }`. Ces sélecteurs valent (0,1,1) et
   *  battent les `.empty-state__title` / `__description` du paquet (0,1,0) quel
   *  que soit l'ordre des feuilles. Le pare-feu couvre donc aussi les parties.
   *
   *  Opt-in : une app qui veut au contraire garder sa peau ne le met pas
   *  (Monitorum `.mo-empty`, Dialum `.dialum-empty-in-card`). */
  isolate?: boolean;
  /** Posé tel quel en `data-testid` sur la racine. Contrat des suites
   *  Playwright des apps. */
  testId?: string;
  /** `data-testid` par partie (la racine reste `testId` si `root` est omis). */
  testIds?: EmptyStateTestIds;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  variant = 'default',
  titleAs,
  iconSize,
  children,
  isolate = false,
  testId,
  testIds,
  className = '',
}: EmptyStateProps) {
  const plain = variant === 'plain';
  const TitleTag = titleAs ?? (plain ? 'p' : 'h2');
  const rootTestId = testIds?.root ?? testId;

  // La chaîne de classes garde la forme historique au caractère près quand les
  // nouvelles props sont à leur défaut : chaque modificateur ajouté porte son
  // propre espace de tête, donc il n'insère rien quand il est absent.
  const classes =
    `empty-state${compact ? ' empty-state--compact' : ''}` +
    `${plain ? ' empty-state--plain' : ''}` +
    `${isolate ? ' empty-state--isolated' : ''}` +
    ` ${className}`;

  return (
    <div
      className={classes.trim()}
      // Étalé seulement quand il a une valeur : au défaut, l'élément rendu est
      // exactement celui d'avant (mêmes attributs, même ordre).
      {...(rootTestId !== undefined ? { 'data-testid': rootTestId } : null)}
    >
      {icon && (
        <div
          className={
            `empty-state__icon${plain ? ' empty-state__icon--plain' : ''}` +
            `${iconSize !== undefined ? ' empty-state__icon--sized' : ''}`
          }
          aria-hidden="true"
          {...(iconSize !== undefined
            ? {
                style: {
                  ['--empty-state-icon-size']:
                    typeof iconSize === 'number' ? `${iconSize}px` : iconSize,
                } as CSSProperties,
              }
            : null)}
          {...(testIds?.icon !== undefined ? { 'data-testid': testIds.icon } : null)}
        >
          {icon}
        </div>
      )}
      {title !== undefined && title !== null && (
        <TitleTag
          className={`empty-state__title${plain ? ' empty-state__title--plain' : ''}`}
          {...(testIds?.title !== undefined ? { 'data-testid': testIds.title } : null)}
        >
          {title}
        </TitleTag>
      )}
      {description && (
        <p
          className="empty-state__description"
          {...(testIds?.description !== undefined
            ? { 'data-testid': testIds.description }
            : null)}
        >
          {description}
        </p>
      )}
      {children}
      {action && (
        <div
          className="empty-state__action"
          {...(testIds?.action !== undefined ? { 'data-testid': testIds.action } : null)}
        >
          {action}
        </div>
      )}
    </div>
  );
}
