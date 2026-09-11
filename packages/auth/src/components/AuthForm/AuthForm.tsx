import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { GoogleOAuthButton } from '../GoogleOAuthButton';

/* ════════════════════════════════════════════════════════════════════════════
   CANONIQUE @umbeli-com/auth — LE FORMULAIRE de la page de connexion.

   Le package livrait déjà le décor (AuthPageLayout + AuthHeader +
   GoogleOAuthButton) mais PAS le formulaire : les dix apps l'avaient donc
   recopié à l'identique. Ce composant est l'extraction de cette copie
   (référence : Monitorum/src/components/Login.tsx, identique à Dialum,
   Anonymum, Scrapium).

   AUCUN CSS PROPRE : tout passe par les classes .auth-page__* de
   styles/AuthPages.css, déjà chargées par AuthPageLayout. Si un rendu doit
   changer, il change LÀ-BAS (puis re-sync vendor), jamais ici.

   CONTRATS FIGÉS PAR LES SPECS E2E DE LA SUITE — ne pas « améliorer » :
     · id des champs : email, password, firstName, lastName, confirmPassword
       (les specs font page.locator('#email')) ;
     · autocomplete email / current-password (connexion) / new-password
       (inscription) ;
     · JAMAIS de minlength en CONNEXION — un compte existant doit pouvoir
       entrer quel que soit son mot de passe ;
     · le bascule de mode est un <button> dont le nom accessible est
       exactement « Créer un compte » / « Se connecter » ;
     · l'erreur de validation locale sort dans .auth-page__error.
   ══════════════════════════════════════════════════════════════════════════ */

export type AuthFormMode = 'signin' | 'signup' | 'forgot';

/** Charge utile d'inscription — `firstName`/`lastName` sont déjà trimés. */
export interface AuthSignUpPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Copie canonique FR de la suite. Chaque chaîne est surchargeable via
 *  `labels` (convention maison : cf. `translations` de SidebarNav). */
export interface AuthFormLabels {
  /** Bouton OAuth — défaut hérité de GoogleOAuthButton. */
  google: string;
  /** Séparateur entre OAuth et email/mot de passe. */
  or: string;
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  /** `{min}` est remplacé par `minPasswordLength`. */
  passwordHint: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  forgotPassword: string;
  /** Suffixe des libellés de champs requis (passer '' pour le retirer). */
  requiredMark: string;
  signInSubmit: string;
  signInSubmitBusy: string;
  signUpSubmit: string;
  signUpSubmitBusy: string;
  forgotSubmit: string;
  forgotSubmitBusy: string;
  /** Pied en mode connexion : « Pas encore de compte ? » + « Créer un compte ». */
  noAccountPrompt: string;
  createAccountAction: string;
  /** Pied en mode inscription : « Déjà un compte ? » + « Se connecter ». */
  haveAccountPrompt: string;
  signInAction: string;
  /** Pied en mode mot de passe oublié. */
  backToSignIn: string;
  /** Erreurs de validation locale (avant tout aller-retour réseau). */
  passwordMismatch: string;
  /** `{min}` est remplacé par `minPasswordLength`. */
  passwordTooShort: string;
}

export interface AuthFormProps {
  /** Mode courant — le parent le possède (composant contrôlé). */
  mode: AuthFormMode;
  /** Appelé quand l'utilisateur clique « Créer un compte » / « Se connecter »
   *  / « Mot de passe oublié ? ». */
  onModeChange: (mode: AuthFormMode) => void;
  onSignIn: (email: string, password: string) => void | Promise<void>;
  onSignUp: (payload: AuthSignUpPayload) => void | Promise<void>;
  onForgotPassword: (email: string) => void | Promise<void>;
  /** Omis → pas de bouton Google. Le standard de la suite est de le fournir
   *  (pas d'accès invité, OAuth Google présent). */
  onGoogle?: () => void | Promise<void>;
  /** Verrouille tous les contrôles pendant un appel réseau. */
  busy?: boolean;
  /** Erreur venue du parent (Supabase…). Rendue dans .auth-page__error. */
  error?: string | null;
  /** Message de succès//information (« Email de réinitialisation envoyé… »). */
  info?: string | null;
  /** Longueur minimale à l'INSCRIPTION uniquement (défaut 8). */
  minPasswordLength?: number;
  /** Mention CGU rendue au-dessus du bouton en mode inscription. */
  termsNotice?: ReactNode;
  /** Contenu libre sous le pied de bascule (ex. « Retour à l'accueil »). */
  footer?: ReactNode;
  /** Préfixe des id/htmlFor — à ne changer QUE si deux formulaires coexistent
   *  sur la page : les specs E2E de la suite ciblent #email / #password. */
  idPrefix?: string;
  labels?: Partial<AuthFormLabels>;
}

const defaultLabels: AuthFormLabels = {
  google: 'Continuer avec Google',
  or: 'ou',
  firstName: 'Prénom',
  firstNamePlaceholder: 'Jean',
  lastName: 'Nom',
  lastNamePlaceholder: 'Dupont',
  email: 'Email',
  emailPlaceholder: 'vous@exemple.com',
  password: 'Mot de passe',
  passwordPlaceholder: '••••••••',
  passwordHint: 'Minimum {min} caractères',
  confirmPassword: 'Confirmer le mot de passe',
  confirmPasswordPlaceholder: '••••••••',
  forgotPassword: 'Mot de passe oublié ?',
  requiredMark: ' *',
  signInSubmit: 'Se connecter',
  signInSubmitBusy: 'Connexion...',
  signUpSubmit: 'Créer mon compte',
  signUpSubmitBusy: 'Création...',
  forgotSubmit: 'Envoyer le lien',
  forgotSubmitBusy: 'Envoi...',
  noAccountPrompt: 'Pas encore de compte ? ',
  createAccountAction: 'Créer un compte',
  haveAccountPrompt: 'Déjà un compte ? ',
  signInAction: 'Se connecter',
  backToSignIn: 'Retour à la connexion',
  passwordMismatch: 'Les mots de passe ne correspondent pas',
  passwordTooShort: 'Le mot de passe doit contenir au moins {min} caractères',
};

interface AuthFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const emptyValues: AuthFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export function AuthForm({
  mode,
  onModeChange,
  onSignIn,
  onSignUp,
  onForgotPassword,
  onGoogle,
  busy = false,
  error = null,
  info = null,
  minPasswordLength = 8,
  termsNotice,
  footer,
  idPrefix = '',
  labels = {},
}: AuthFormProps) {
  const [values, setValues] = useState<AuthFormValues>(emptyValues);
  /** Erreur produite ICI (validation locale ou promesse rejetée par le
   *  parent). Prioritaire sur `error` : c'est la plus récente. */
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  /** Armé par nos propres boutons de bascule : un changement de mode venu du
   *  parent (deep-link ?mode=, retour en connexion après inscription) ne doit
   *  pas voler le focus. */
  const claimFocusRef = useRef(false);

  const t = { ...defaultLabels, ...labels };
  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';
  const withMin = (text: string) => text.replace('{min}', String(minPasswordLength));
  const fieldId = (name: string) => `${idPrefix}${name}`;
  const shownError = localError ?? error;

  // Un changement de mode repart d'une ardoise propre côté validation locale.
  useEffect(() => {
    setLocalError(null);

    // Le contrôle cliqué (« Mot de passe oublié ? », « Créer un compte »)
    // vient d'être démonté ou remplacé : sans replacement explicite, le focus
    // retombe sur <body> et l'utilisateur au clavier perd sa place dans un
    // formulaire dont le contenu vient de changer.
    if (!claimFocusRef.current) return;
    claimFocusRef.current = false;
    formRef.current?.querySelector<HTMLInputElement>('input:not([disabled])')?.focus();
  }, [mode]);

  /** Le parent possède `busy`/`error` ; on ne rattrape que le rejet nu, pour
   *  qu'une promesse non gérée n'avale pas le message à l'écran. */
  const run = (returned: void | Promise<void>) => {
    // `Promise.resolve` plutôt que `instanceof Promise` : un thenable (client
    // Supabase, promesse venue d'une autre realm) n'est pas une instance de
    // Promise et son rejet passerait à travers.
    if (!returned) return;
    Promise.resolve(returned).catch((err: unknown) => {
      setLocalError(err instanceof Error ? err.message : String(err));
    });
  };

  const setField =
    (key: keyof AuthFormValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setValues((prev) => ({ ...prev, [key]: value }));
    };

  const switchMode = (next: AuthFormMode) => () => {
    setLocalError(null);
    claimFocusRef.current = true;
    onModeChange(next);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const email = values.email.trim();

    if (isForgot) {
      run(onForgotPassword(email));
      return;
    }

    if (isSignUp) {
      if (values.password !== values.confirmPassword) {
        setLocalError(t.passwordMismatch);
        return;
      }
      if (values.password.length < minPasswordLength) {
        setLocalError(withMin(t.passwordTooShort));
        return;
      }
      run(
        onSignUp({
          email,
          password: values.password,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
        }),
      );
      return;
    }

    run(onSignIn(email, values.password));
  };

  const submitLabel = isForgot
    ? busy
      ? t.forgotSubmitBusy
      : t.forgotSubmit
    : isSignUp
      ? busy
        ? t.signUpSubmitBusy
        : t.signUpSubmit
      : busy
        ? t.signInSubmitBusy
        : t.signInSubmit;

  return (
    <>
      <div className="auth-page__card">
        {/* Pas d'OAuth sur l'écran « mot de passe oublié » : il n'y a rien à
            connecter, juste un email à envoyer. */}
        {onGoogle && !isForgot ? (
          <>
            <GoogleOAuthButton
              onClick={() => {
                setLocalError(null);
                run(onGoogle());
              }}
              disabled={busy}
              label={t.google}
            />
            <div className="auth-page__divider">
              <span>{t.or}</span>
            </div>
          </>
        ) : null}

        <form ref={formRef} onSubmit={handleSubmit} className="auth-page__form" aria-busy={busy}>
          {shownError ? (
            <div className="auth-page__error" role="alert">
              {shownError}
            </div>
          ) : null}

          {info ? (
            <div className="auth-page__info" role="status">
              {info}
            </div>
          ) : null}

          {isSignUp ? (
            <div className="auth-page__row">
              <div className="auth-page__field">
                <label htmlFor={fieldId('firstName')} className="auth-page__label">
                  {t.firstName}
                  {t.requiredMark}
                </label>
                <input
                  id={fieldId('firstName')}
                  type="text"
                  value={values.firstName}
                  onChange={setField('firstName')}
                  className="auth-page__input"
                  placeholder={t.firstNamePlaceholder}
                  autoComplete="given-name"
                  required
                  disabled={busy}
                />
              </div>

              <div className="auth-page__field">
                <label htmlFor={fieldId('lastName')} className="auth-page__label">
                  {t.lastName}
                  {t.requiredMark}
                </label>
                <input
                  id={fieldId('lastName')}
                  type="text"
                  value={values.lastName}
                  onChange={setField('lastName')}
                  className="auth-page__input"
                  placeholder={t.lastNamePlaceholder}
                  autoComplete="family-name"
                  required
                  disabled={busy}
                />
              </div>
            </div>
          ) : null}

          <div className="auth-page__field">
            <label htmlFor={fieldId('email')} className="auth-page__label">
              {t.email}
              {t.requiredMark}
            </label>
            <input
              id={fieldId('email')}
              type="email"
              value={values.email}
              onChange={setField('email')}
              className="auth-page__input"
              placeholder={t.emailPlaceholder}
              autoComplete="email"
              required
              disabled={busy}
            />
          </div>

          {!isForgot ? (
            <div className="auth-page__field">
              <label htmlFor={fieldId('password')} className="auth-page__label">
                {t.password}
                {t.requiredMark}
              </label>
              <input
                id={fieldId('password')}
                type="password"
                value={values.password}
                onChange={setField('password')}
                className="auth-page__input"
                placeholder={t.passwordPlaceholder}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                disabled={busy}
                // minLength seulement à l'inscription : en CONNEXION, un compte
                // existant doit pouvoir se connecter quel que soit son mot de passe.
                minLength={isSignUp ? minPasswordLength : undefined}
                aria-describedby={isSignUp ? fieldId('password-hint') : undefined}
              />
              {isSignUp ? (
                <span id={fieldId('password-hint')} className="auth-page__hint">
                  {withMin(t.passwordHint)}
                </span>
              ) : null}
            </div>
          ) : null}

          {isSignUp ? (
            <div className="auth-page__field">
              <label htmlFor={fieldId('confirmPassword')} className="auth-page__label">
                {t.confirmPassword}
                {t.requiredMark}
              </label>
              <input
                id={fieldId('confirmPassword')}
                type="password"
                value={values.confirmPassword}
                onChange={setField('confirmPassword')}
                className="auth-page__input"
                placeholder={t.confirmPasswordPlaceholder}
                autoComplete="new-password"
                required
                disabled={busy}
              />
            </div>
          ) : null}

          {!isSignUp && !isForgot ? (
            <div className="auth-page__forgot">
              <button
                type="button"
                className="auth-page__link"
                onClick={switchMode('forgot')}
                disabled={busy}
              >
                {t.forgotPassword}
              </button>
            </div>
          ) : null}

          {isSignUp && termsNotice ? (
            <p className="auth-page__terms">{termsNotice}</p>
          ) : null}

          <button type="submit" className="auth-page__submit" disabled={busy}>
            {submitLabel}
          </button>
        </form>
      </div>

      <p className="auth-page__footer">
        {isForgot ? (
          <button
            type="button"
            className="auth-page__link auth-page__link--accent"
            onClick={switchMode('signin')}
            disabled={busy}
          >
            {t.backToSignIn}
          </button>
        ) : (
          <>
            {isSignUp ? t.haveAccountPrompt : t.noAccountPrompt}
            <button
              type="button"
              className="auth-page__link auth-page__link--accent"
              onClick={switchMode(isSignUp ? 'signin' : 'signup')}
              disabled={busy}
            >
              {isSignUp ? t.signInAction : t.createAccountAction}
            </button>
          </>
        )}
      </p>

      {footer}
    </>
  );
}
