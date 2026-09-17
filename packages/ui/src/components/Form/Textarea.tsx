import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { classAttr, type ControlSize } from './Input';
// Styles are imported separately via @umbeli-com/ui/styles

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Gabarit du contrôle (défaut : `md`). Pilote la hauteur minimale ; la
   *  hauteur réelle reste redimensionnable verticalement par l'utilisateur.
   *
   *  Note : `<textarea>` n'a PAS d'attribut natif `size` (il utilise
   *  `rows`/`cols`), donc rien de réel n'est masqué ici ; le `Omit<…, 'size'>`
   *  est purement défensif, pour que les quatre primitives aient exactement la
   *  même forme. `rows` et `cols` restent disponibles. */
  size?: ControlSize;
  /** Marque le champ en erreur (bordure danger + `aria-invalid`). */
  invalid?: boolean;
  /**
   * NU : aucune classe `textarea*` n'est émise (`textarea`, `textarea--{size}`, `is-invalid`) — ne restent que
   * les classes de l'app, telles quelles, et l'attribut `class` disparaît si
   * elles sont vides. Le COMPORTEMENT reste (`invalid` → `aria-invalid`, la
   * `ref`, les props natives). Même contrat que `unstyled` de Button et Field.
   */
  unstyled?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { size = 'md', invalid = false, className = '', 'aria-invalid': ariaInvalid, unstyled = false, ...props },
  ref
) {
  return (
    <textarea
      {...props}
      ref={ref}
      {...classAttr(unstyled ? [className] : ['textarea', `textarea--${size}`, invalid ? 'is-invalid' : '', className])}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
    />
  );
});
