import type { HTMLAttributes, ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

/** Teintes canoniques : chaque tone mappe la paire --theme-color-*-soft (fond)
 *  / --theme-color-* (texte), donc le mode sombre suit les variables du thème
 *  sans bloc `.dark` dédié. */
export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Libellé de la pastille (fourni par l'app — aucune chaîne par défaut). */
  children: ReactNode;
  /** Teinte sémantique (défaut : `neutral`). */
  tone?: BadgeTone;
  /** Taille (défaut : `md`). */
  size?: BadgeSize;
  /** Icône optionnelle rendue avant le libellé — ex. `<Check size={12} />`.
   *  Purement décorative (aria-hidden) : le sens vit dans le libellé. */
  icon?: ReactNode;
  /**
   * Re-affirme les valeurs du paquet à spécificité (0,2,0) pour que le
   * `.badge` LOCAL d'une app ne déteigne plus sur le composant.
   *
   * Mesuré : Anonymum déclare `.badge` (coins `$radius-xs`, padding
   * `$space-4 $space-8`, typographie caption) et Profilum/frontend déclare
   * `.badge` + `.badge--success|--warning|--info|--neutral` — mêmes noms que
   * les teintes du paquet. À spécificité égale c'est l'ordre des feuilles qui
   * tranche, et celle de l'app est importée APRÈS : la pastille du paquet
   * repartait avec le padding, le rayon, l'interlettrage ET les couleurs de
   * l'app. Opt-in : sans cette prop, rien ne change.
   */
  isolate?: boolean;
  /** Posé tel quel en `data-testid`. Contrat des suites Playwright des apps
   *  (Monitorum interroge `billing-status-chip` sur cette pastille). */
  testId?: string;
  className?: string;
}

export function Badge({
  children,
  tone = 'neutral',
  size = 'md',
  icon,
  isolate = false,
  testId,
  className = '',
  ...props
}: BadgeProps) {
  // La chaîne de classes garde la forme historique au caractère près quand les
  // nouvelles props sont à leur défaut : le modificateur ajouté porte son
  // propre espace de tête, donc il n'insère rien quand il est absent.
  const classes =
    `badge badge--${tone} badge--${size}` +
    `${isolate ? ' badge--isolated' : ''}` +
    ` ${className}`;

  return (
    <span
      className={classes.trim()}
      {...props}
      // Étalé seulement quand il a une valeur : au défaut, l'élément rendu est
      // exactement celui d'avant (mêmes attributs, même ordre). Placé APRÈS
      // `props` pour que `testId` l'emporte sur un `data-testid` passé en vrac.
      {...(testId !== undefined ? { 'data-testid': testId } : null)}
    >
      {icon && (
        <span className="badge__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="badge__label">{children}</span>
    </span>
  );
}
