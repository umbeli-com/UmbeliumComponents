import { forwardRef, type SelectHTMLAttributes } from 'react';
import type { ControlSize } from './Input';
// Styles are imported separately via @umbeli-com/ui/styles

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Gabarit du contrôle (défaut : `md`).
   *
   *  ⚠️ `size` MASQUE l'attribut HTML natif `<select size>` (nombre de lignes
   *  affichées, qui transforme la liste déroulante en liste à défilement) : il
   *  est retiré du type via `Omit<…, 'size'>`. Pour une vraie liste multi-
   *  lignes, utiliser `multiple` ou styler le contrôle soi-même. */
  size?: ControlSize;
  /** Marque le champ en erreur (bordure danger + `aria-invalid`). */
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = 'md', invalid = false, className = '', 'aria-invalid': ariaInvalid, children, ...props },
  ref
) {
  return (
    <select
      {...props}
      ref={ref}
      className={['select', `select--${size}`, invalid ? 'is-invalid' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
    >
      {children}
    </select>
  );
});
