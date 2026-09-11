import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

export interface FieldLabels {
  /** Infobulle et nom accessible de l'astérisque « champ requis »
   *  (défaut : « obligatoire »). */
  required?: string;
}

const defaultLabels: Required<FieldLabels> = {
  required: 'obligatoire',
};

// `process` n'existe pas dans un navigateur : déclaration locale au module et
// accès protégé par try/catch (même motif que I18n/createI18n).
declare const process: { env: { NODE_ENV?: string } };

let devModeCache: boolean | undefined;

function isDev(): boolean {
  if (devModeCache !== undefined) return devModeCache;
  try {
    devModeCache = process.env.NODE_ENV !== 'production';
  } catch {
    devModeCache = false;
  }
  return devModeCache;
}

export interface FieldProps {
  /** Étiquette du champ. Rendue dans un vrai `<label for>`. */
  label?: ReactNode;
  /** `id` du contrôle. Omis → l'`id` que l'enfant porte déjà est réutilisé ;
   *  à défaut un id stable est généré (`useId`) et injecté dans l'enfant, pour
   *  que `<label for>` et `aria-describedby` pointent quand même au bon
   *  endroit. Obligatoire dès que l'enfant n'est pas câblable (voir
   *  `children`), sinon le `<label>` est rendu SANS `for` (et une alerte est
   *  émise en développement). */
  htmlFor?: string;
  /** Aide sous le champ. Liée au contrôle par `aria-describedby`. */
  hint?: ReactNode;
  /** Message d'erreur. Liée par `aria-describedby` ET pose `aria-invalid`
   *  sur le contrôle ; annoncée via `role="alert"`. */
  error?: ReactNode;
  /** Affiche l'astérisque « requis ». N'ajoute PAS `required` au contrôle :
   *  la contrainte de validation reste au contrôle (`<Input required>`). */
  required?: boolean;
  /** Occupe toute la largeur de la `<FormGrid>` parente. */
  wide?: boolean;
  className?: string;
  /** Chaînes émises par le composant lui-même, défauts FR. */
  labels?: FieldLabels;
  /** Le contrôle. Un enfant unique reçoit automatiquement `id`,
   *  `aria-describedby` et `aria-invalid` ; au-delà d'un enfant (ou pour un
   *  Fragment) le câblage doit être fait à la main avec `htmlFor`. */
  children: ReactNode;
}

/** Enveloppe étiquette + aide + erreur d'un contrôle de formulaire. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  wide = false,
  className = '',
  labels = {},
  children,
}: FieldProps) {
  const t = { ...defaultLabels, ...labels };
  const autoId = useId();
  // Une seule alerte par instance de <Field> : pas de spam au re-rendu.
  const warned = useRef(false);

  // Le contrôle est identifié AVANT de fabriquer les ids : si l'enfant porte
  // déjà son propre `id`, c'est lui qui gagne, sinon `<label for>` pointerait
  // dans le vide (bug : `<Field label><Input id="email" /></Field>`).
  const rendered = Children.toArray(children);
  const only = rendered.length === 1 ? rendered[0] : undefined;
  const wirable =
    only !== undefined && isValidElement(only) && only.type !== Fragment
      ? (only as ReactElement<Record<string, unknown>>)
      : undefined;
  const childId = wirable !== undefined && typeof wirable.props.id === 'string'
    ? wirable.props.id
    : undefined;

  const controlId = htmlFor ?? childId ?? `${autoId}field`;
  const hintId = hint != null ? `${controlId}-hint` : undefined;
  const errorId = error != null ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ');

  const control =
    wirable !== undefined ? wire(wirable, controlId, describedBy, error != null) : children;

  // `for` ne doit jamais désigner un id inexistant : sans câblage possible
  // (plusieurs enfants, Fragment, texte nu), il faut un `htmlFor` explicite.
  const labelFor = wirable !== undefined || htmlFor !== undefined ? controlId : undefined;

  if (isDev() && label != null && labelFor === undefined && !warned.current) {
    warned.current = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[@umbeli-com/ui] <Field label> : le câblage a11y est impossible (un seul ' +
        'élément enfant est requis ; ni Fragment ni texte nu). L\'étiquette n\'est ' +
        'liée à aucun contrôle. Passer `htmlFor` et poser le même `id` sur le ' +
        'contrôle, ou aria-describedby à la main.'
    );
  }

  return (
    <div
      className={['field', wide ? 'field--wide' : '', error != null ? 'is-invalid' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {label != null && (
        <label className="field__label" htmlFor={labelFor}>
          {label}
          {required && (
            <abbr className="field__required" title={t.required} aria-label={t.required}>
              *
            </abbr>
          )}
        </label>
      )}
      {control}
      {hint != null && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error != null && (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Injecte le câblage a11y dans le contrôle. `aria-describedby` et
 *  `aria-invalid` posés par l'appelant sont préservés (le premier est
 *  fusionné). `id` vaut toujours `controlId` — qui EST déjà l'id de l'enfant
 *  quand il en a un ; il n'est donc réécrit que si l'appelant a passé un
 *  `htmlFor` différent, cas où l'écraser est précisément ce qui répare le
 *  `<label for>`. */
function wire(
  element: ReactElement<Record<string, unknown>>,
  controlId: string,
  describedBy: string,
  invalid: boolean
): ReactElement {
  const ownDescribedBy = element.props['aria-describedby'];
  const merged = [ownDescribedBy, describedBy].filter(Boolean).join(' ');

  return cloneElement(element, {
    id: controlId,
    'aria-describedby': merged !== '' ? merged : undefined,
    'aria-invalid': element.props['aria-invalid'] ?? (invalid || undefined),
  });
}
