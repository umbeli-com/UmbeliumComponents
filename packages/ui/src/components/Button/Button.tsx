import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from '../Spinner';
import type { SpinnerSize } from '../Spinner';
// Styles are imported separately via @umbeli-com/ui/styles

/** Intentions visuelles. `danger` = action destructrice (cf. Anonymum
 *  `.btn-danger`), `link` = bouton qui se lit comme un lien, sans fond ni
 *  hauteur imposée (cf. Webum `.btn-link`, Monitorum `.mo-link`). */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';

/** Échelle de hauteurs : 24 / 32 / 40 / 48 / 56 px.
 *  `sm` | `md` | `lg` gardent EXACTEMENT les hauteurs historiques du paquet
 *  (32 / 40 / 48) ; `xs` et `xl` prolongent l'échelle, ils ne la déplacent pas. */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Chaînes lues/affichées, surchargeables. Français par défaut. */
export interface ButtonLabels {
  /** Nom accessible du bouton pendant `loading` EN MODE `iconOnly` — là, et
   *  seulement là, `children` est retiré : sans cette chaîne (ou un `aria-label`
   *  fourni par l'appelant) le bouton n'aurait plus de nom du tout.
   *  Défaut : « Chargement… ». En mode texte, le libellé visible reste le nom
   *  et le spinner ne dit rien (cf. `loading`). */
  loading?: string;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Affiche un `Spinner`, pose `aria-busy="true"` et désactive le bouton.
   *  Le libellé reste visible ET reste le NOM ACCESSIBLE du bouton : le contenu
   *  d'un `<button>` EST son nom, donc le spinner se tait, sinon « Envoyer »
   *  deviendrait « Chargement… Envoyer » et un bouton nommé par son `title`
   *  (le cas de `ThemeToggle`) verrait son nom carrément remplacé, le contenu
   *  primant sur `title`. Les sélecteurs par nom des suites e2e tiennent donc
   *  pendant le chargement.
   *  Le bouton s'élargit du spinner et du `gap` le temps du chargement ; en
   *  `iconOnly` la largeur est figée par la taille, donc rien ne bouge. */
  loading?: boolean;
  /** Bouton carré : largeur = hauteur, aucun padding horizontal. `children` est
   *  alors la seule icône : fournir un `aria-label` (ou un `title`). */
  iconOnly?: boolean;
  /** Posé tel quel en `data-testid`. Contrat des suites Playwright des apps. */
  testId?: string;
  labels?: ButtonLabels;
}

const defaultLabels: Required<ButtonLabels> = {
  loading: 'Chargement…',
};

/** Le spinner suit la taille du bouton sans jamais écraser le texte. */
const spinnerSizeFor: Record<ButtonSize, SpinnerSize> = {
  xs: 'sm',
  sm: 'sm',
  md: 'sm',
  lg: 'md',
  xl: 'md',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  iconOnly = false,
  testId,
  labels,
  className = '',
  ...props
}: ButtonProps) {
  const t = { ...defaultLabels, ...labels };

  // La chaîne de classes garde la forme historique au caractère près quand les
  // nouvelles props sont à leur défaut : chaque modificateur ajouté porte son
  // propre espace de tête, donc il n'insère rien quand il est absent.
  const classes =
    `button button--${variant} button--${size} ${fullWidth ? 'button--full-width' : ''}` +
    `${iconOnly ? ' button--icon-only' : ''}` +
    `${loading ? ' button--loading' : ''}` +
    ` ${className}`;

  return (
    <button
      className={classes}
      {...props}
      // Étalés seulement quand ils ont une valeur : à leur défaut, l'élément
      // rendu est exactement celui d'avant (mêmes attributs, même ordre).
      {...(loading ? ({ disabled: true, 'aria-busy': true } as const) : null)}
      {...(testId !== undefined ? { 'data-testid': testId } : null)}
    >
      {loading && (
        <Spinner
          size={spinnerSizeFor[size]}
          // Le contenu d'un `<button>` EST son nom accessible, et le libellé
          // visuellement masqué du Spinner en fait partie. En mode texte le
          // libellé visible suffit : le spinner se tait (`label=""`) pour ne pas
          // préfixer le nom — `aria-busy` porte déjà l'information d'attente.
          // En `iconOnly`, `children` disparaît : le spinner redevient la seule
          // source de nom, sauf `aria-label` de l'appelant, qui prime.
          label={iconOnly ? t.loading : ''}
          className="button__spinner"
        />
      )}
      {iconOnly && loading ? null : children}
    </button>
  );
}

export default Button;
