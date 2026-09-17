import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

/** Attribut `class` d'un contrôle : la chaîne assemblée, ou RIEN quand elle
 *  est vide (en `unstyled` sans `className`, un `class=""` salirait le DOM).
 *  Partagé par Input, Select, Textarea et Checkbox. */
export function classAttr(parts: Array<string | false | undefined>): { className?: string } {
  const value = parts.filter(Boolean).join(' ');
  return value ? { className: value } : {};
}
// Styles are imported separately via @umbeli-com/ui/styles

/** Taille commune à tous les contrôles de formulaire. */
export type ControlSize = 'sm' | 'md' | 'lg';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Gabarit du contrôle (défaut : `md`, 44px — minimum confortable au pouce).
   *
   *  ⚠️ `size` MASQUE l'attribut HTML natif `<input size>` (nombre de
   *  caractères visibles) : il est retiré du type via `Omit<…, 'size'>`. Ce
   *  attribut natif n'a d'effet que sur les inputs texte non stylés en CSS —
   *  ici la largeur vient toujours de `width: 100%`. Pour le récupérer malgré
   *  tout, passer `{...{ size: 20 } as never}` ou styler via `style`. */
  size?: ControlSize;
  /** Marque le champ en erreur (bordure danger + `aria-invalid`).
   *  `<Field error>` le pose automatiquement — inutile de le doubler. */
  invalid?: boolean;
  /**
   * Icône (ou tout nœud décoratif) posée DANS le champ, à gauche du texte.
   * Mesuré chez Anonymum (/account) : un `<Lock size={14}>` en position absolue
   * plus `paddingLeft: 34` sur l'input, une enveloppe et deux styles en ligne
   * que rien du paquet ne remplaçait.
   *
   * Fournie, l'input est enveloppé dans `span.input-wrap` et reçoit
   * `input--with-leading` (padding gauche réservé) ; la fente est
   * `aria-hidden` et ne prend pas le clic. Absente, le DOM est celui d'hier :
   * l'`<input>` seul, sans enveloppe. Réglages : `--input-leading-inset`
   * (0.625rem) et `--input-leading-padding` (2.125rem).
   */
  leading?: ReactNode;
  /** Classe de l'enveloppe (sans effet sans `leading`). */
  wrapClassName?: string;
  /** Classe de la fente (sans effet sans `leading`). */
  leadingClassName?: string;
  /**
   * NU : aucune classe `input*` n'est émise (`input`, `input--{size}`, `is-invalid`, `input--with-leading`) — ne restent que
   * `className`, transmise telle quelle, et l'attribut `class` disparaît si
   * elle est vide. Le COMPORTEMENT reste : `invalid` → `aria-invalid`, la
   * `ref`, toutes les props natives. Même contrat que `unstyled` de Button et
   * de Field.
   *
   * Mesuré au Manager (10 paires étiquette + champ de ProfileSection et
   * OrganizationManager) : la feuille du paquet est chargée, donc `input
   * input--md` repeignait chaque champ — 38 → 45,19px de haut, police 14 →
   * 16px, 36 écarts relevés. Sans échappatoire, l'adoption était impossible.
   */
  unstyled?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = 'md',
    invalid = false,
    className = '',
    'aria-invalid': ariaInvalid,
    leading,
    wrapClassName = '',
    leadingClassName = '',
    unstyled = false,
    ...props
  },
  ref
) {
  const hasLeading = leading !== undefined && leading !== null && leading !== false && leading !== '';
  const input = (
    <input
      {...props}
      ref={ref}
      {...classAttr(
        unstyled
          ? [className]
          : ['input', `input--${size}`, invalid ? 'is-invalid' : '', hasLeading ? 'input--with-leading' : '', className],
      )}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
    />
  );

  // Sans `leading`, l'élément rendu est exactement celui d'avant — pas
  // d'enveloppe, pas de classe en plus.
  if (!hasLeading) return input;

  return (
    <span className={['input-wrap', wrapClassName].filter(Boolean).join(' ')}>
      <span className={['input__leading', leadingClassName].filter(Boolean).join(' ')} aria-hidden="true">
        {leading}
      </span>
      {input}
    </span>
  );
});
