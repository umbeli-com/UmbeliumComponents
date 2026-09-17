import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { classAttr, type ControlSize } from './Input';
// Styles are imported separately via @umbeli-com/ui/styles

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Texte cliquable rendu à droite de la case. Fourni par l'app (donc déjà
   *  dans sa langue) : le composant lui-même n'émet aucune chaîne. */
  label?: ReactNode;
  /** Gabarit (défaut : `md`).
   *
   *  ⚠️ `size` MASQUE l'attribut HTML natif `<input size>` : il est retiré du
   *  type via `Omit<…, 'size'>`. `type` est retiré lui aussi — il vaut
   *  toujours `"checkbox"` ; pour un bouton radio, utiliser un `<Input
   *  type="radio">`. */
  size?: ControlSize;
  /** Marque la case en erreur (contour danger + `aria-invalid`). */
  invalid?: boolean;
  /** Classe posée sur le `<label>` enveloppant (pas sur l'`<input>`).
   *  ⚠️ Sans `label`, il n'y a PAS de `<label>` enveloppant : la classe est
   *  alors ignorée — utiliser `inputClassName`. */
  className?: string;
  /** Classe posée sur l'`<input>` lui-même. */
  inputClassName?: string;
  /** Classe posée sur le texte de l'étiquette (`.checkbox__label`), seule en
   *  `unstyled`. Sans effet sans `label`. */
  labelClassName?: string;
  /**
   * NU : aucune classe `checkbox*` n'est émise (`checkbox`, `checkbox--{size}`, `is-disabled`, `checkbox__input`, `checkbox__input--{size}`, `is-invalid`) — ne restent que
   * les classes de l'app, telles quelles, et l'attribut `class` disparaît si
   * elles sont vides. Le COMPORTEMENT reste (`invalid` → `aria-invalid`, la
   * `ref`, les props natives). Même contrat que `unstyled` de Button et Field.
   */
  unstyled?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    size = 'md',
    invalid = false,
    className = '',
    inputClassName = '',
    labelClassName = '',
    'aria-invalid': ariaInvalid,
    unstyled = false,
    disabled,
    ...props
  },
  ref
) {
  const control = (
    <input
      {...props}
      ref={ref}
      type="checkbox"
      disabled={disabled}
      // Le gabarit est porté par l'input lui-même, pas par le `<label>` :
      // sans `label` (le cas normal sous `<Field>`) il n'y a pas d'enveloppe,
      // et `size` serait sinon silencieusement sans effet.
      {...classAttr(
        unstyled
          ? [inputClassName]
          : ['checkbox__input', `checkbox__input--${size}`, invalid ? 'is-invalid' : '', inputClassName],
      )}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
    />
  );

  // Sans `label`, on rend l'input nu : l'étiquette vient alors de <Field
  // label>, qui pointe déjà dessus via htmlFor — un second <label> ferait
  // double emploi pour les lecteurs d'écran.
  if (label == null) return control;

  return (
    <label
      {...classAttr(
        unstyled ? [className] : ['checkbox', `checkbox--${size}`, disabled ? 'is-disabled' : '', className],
      )}
    >
      {control}
      <span {...classAttr(unstyled ? [labelClassName] : ['checkbox__label', labelClassName])}>{label}</span>
    </label>
  );
});
