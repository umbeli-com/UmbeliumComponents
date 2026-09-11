import { forwardRef, type TextareaHTMLAttributes } from 'react';
import type { ControlSize } from './Input';
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
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { size = 'md', invalid = false, className = '', 'aria-invalid': ariaInvalid, ...props },
  ref
) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={['textarea', `textarea--${size}`, invalid ? 'is-invalid' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
    />
  );
});
