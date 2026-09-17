import { forwardRef, type SelectHTMLAttributes } from 'react';
import { classAttr, type ControlSize } from './Input';
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
  /**
   * NU : aucune classe `select*` n'est émise (`select`, `select--{size}`, `is-invalid`) — ne restent que
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

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = 'md', invalid = false, className = '', 'aria-invalid': ariaInvalid, unstyled = false, children, ...props },
  ref
) {
  return (
    <select
      {...props}
      ref={ref}
      {...classAttr(unstyled ? [className] : ['select', `select--${size}`, invalid ? 'is-invalid' : '', className])}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
    >
      {children}
    </select>
  );
});
