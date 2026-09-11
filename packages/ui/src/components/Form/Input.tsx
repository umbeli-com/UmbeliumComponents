import { forwardRef, type InputHTMLAttributes } from 'react';
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
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', invalid = false, className = '', 'aria-invalid': ariaInvalid, ...props },
  ref
) {
  return (
    <input
      {...props}
      ref={ref}
      className={['input', `input--${size}`, invalid ? 'is-invalid' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
    />
  );
});
