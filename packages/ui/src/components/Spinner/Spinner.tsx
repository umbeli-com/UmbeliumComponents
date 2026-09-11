import type { CSSProperties } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

/** Crans nommés de l'échelle du paquet : 14 / 20 / 32 px. */
export type SpinnerSize = 'sm' | 'md' | 'lg';

/**
 * Ce qu'accepte la prop `size` : un cran nommé OU un diamètre libre en px.
 *
 * Mesuré : les chargeurs des apps ne tombent presque jamais sur l'échelle —
 * UmbeliumManager rend un anneau Tailwind `h-10 w-10` (40px, `ProtectedRoute`
 * et `Profile`), Noesium `.graph-spinner` 22px, Profilum `.spinner` 16px,
 * Dialum a dû écrire `.dialum-page-spinner .spinner__ring { width: 40px }`
 * faute de pouvoir le demander. Les crans nommés restent la valeur juste :
 * `size={14}`, `size={20}` et `size={32}` rendent EXACTEMENT `sm`, `md`
 * et `lg` (diamètre et épaisseur).
 */
export type SpinnerSizeValue = SpinnerSize | number;

/** Chaînes lues par les lecteurs d'écran, surchargeables. Français par
 *  défaut. */
export interface SpinnerLabels {
  /** Texte annoncé pendant le chargement (défaut : « Chargement… »). */
  label?: string;
}

export interface SpinnerProps {
  /** Taille de l'anneau : cran nommé (défaut : `md`) ou diamètre en px. */
  size?: SpinnerSizeValue;
  /** Texte lu par les lecteurs d'écran, masqué visuellement
   *  (défaut FR : « Chargement… »). */
  label?: string;
  /** Même chaîne, sous la forme `labels` des autres composants du paquet
   *  (Toast, Button, PWAUpdatePrompt). `label` reste l'API historique et
   *  continue de fonctionner ; `labels.label` l'emporte s'il est fourni. */
  labels?: SpinnerLabels;
  /**
   * Re-affirme les valeurs du paquet à spécificité (0,2,0) pour que le
   * `.spinner` LOCAL d'une app ne déteigne plus sur le composant.
   *
   * Mesuré : chez Webum admin (`apps/admin/src/styles.css`) et Profilum
   * (`src/styles/_ui.scss`), `.spinner` n'est pas un conteneur mais
   * L'ANNEAU lui-même (`width/height`, `border`, `border-radius: 50%`,
   * `animation: spin`). Cette règle retombait sur l'enveloppe du composant,
   * qui héritait d'un second anneau et d'une rotation autour du vrai. Opt-in :
   * une app qui n'a pas de `.spinner` à elle n'en a pas besoin.
   */
  isolate?: boolean;
  /** Posé tel quel en `data-testid`. Contrat des suites Playwright des apps. */
  testId?: string;
  className?: string;
}

const defaultLabels: Required<SpinnerLabels> = {
  label: 'Chargement…',
};

/** Épaisseur de l'anneau pour un diamètre libre. Reproduit l'échelle nommée —
 *  14 → 2, 20 → 2, 32 → 3 — et reste ≥ 2px, en dessous l'anneau disparaît sur
 *  un écran non-HiDPI. Surchargeable par `--spinner-thickness`. */
function thicknessFor(size: number): number {
  return Math.max(2, Math.round(size / 12));
}

export function Spinner({
  size = 'md',
  label,
  labels,
  isolate = false,
  testId,
  className = '',
}: SpinnerProps) {
  const t = labels?.label ?? label ?? defaultLabels.label;

  // Un diamètre libre doit être un nombre exploitable : un NaN ou un négatif
  // écrirait `NaNpx` dans le style et ferait disparaître l'anneau sans bruit.
  // Dans ce cas on retombe sur le cran `md`, comme si rien n'avait été passé.
  const diameter =
    typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : null;
  const sizeClass = typeof size === 'number' ? (diameter ? 'custom' : 'md') : size;

  // La chaîne de classes garde la forme historique au caractère près quand les
  // nouvelles props sont à leur défaut : le modificateur ajouté porte son
  // propre espace de tête, donc il n'insère rien quand il est absent.
  const classes =
    `spinner spinner--${sizeClass}` +
    `${isolate ? ' spinner--isolated' : ''}` +
    ` ${className}`;

  return (
    <span
      className={classes.trim()}
      role="status"
      aria-busy="true"
      aria-live="polite"
      // Étalés seulement quand ils ont une valeur : au défaut, l'élément rendu
      // est exactement celui d'avant (mêmes attributs, même ordre).
      {...(diameter !== null
        ? {
            style: {
              ['--spinner-size']: `${diameter}px`,
              ['--spinner-thickness']: `${thicknessFor(diameter)}px`,
            } as CSSProperties,
          }
        : null)}
      {...(testId !== undefined ? { 'data-testid': testId } : null)}
    >
      <span className="spinner__ring" aria-hidden="true" />
      <span className="spinner__label">{t}</span>
    </span>
  );
}
