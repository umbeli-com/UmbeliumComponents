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
       (les specs font page.locator('#email')) — et fullName pour le champ
       unique de `signUpFields.fullName` (UmbeliumManager cible #fullName) ;
     · autocomplete email / current-password (connexion) / new-password
       (inscription) ; given-name / family-name sur la paire prénom/nom,
       name sur le champ unique ;
     · JAMAIS de minlength en CONNEXION — un compte existant doit pouvoir
       entrer quel que soit son mot de passe ;
     · le bascule de mode est un <button> dont le nom accessible est
       exactement « Créer un compte » / « Se connecter » ;
     · l'erreur de validation locale sort dans .auth-page__error.

   ── TRANSPARENCE À LA PEAU DE L'APP (ajouts 2026-09, tous OPTIONNELS) ───────
   Le rendu par défaut ne bouge pas d'un pixel ; ces échappatoires existent
   pour que le comportement soit adoptable SANS hériter du chrome :

     · `modeToggleHref` / `renderModeToggle` : la bascule de mode devient une
       ANCRE (role=link, deep-link ?mode= ouvrable en nouvel onglet) — ou du
       markup entièrement fourni par l'app. `renderModeToggle` REMPLACE le
       pied `<p class="auth-page__footer">`, il ne s'y ajoute pas (à la
       différence de `footer`, qui reste un ajout EN DESSOUS).
     · `forgotPasswordMode="inline"` : « Mot de passe oublié ? » envoie le
       mail avec l'email déjà saisi SANS changer d'écran (UX Dialum / Webum /
       Socialum) au lieu de basculer vers le mode `'forgot'`.
     · `resetRedirectTo` : URL de retour du lien de réinitialisation,
       transmise au handler — les apps sans route /auth/reset-password
       renvoient vers /auth/callback.
     · `signUpFields` : masque firstName / lastName / confirmPassword pour les
       apps dont l'inscription n'a que 2 champs (Servum).
     · `signUpFields.fullName` : UN champ « Nom complet » (id=fullName,
       autocomplete=name) À LA PLACE de la paire prénom/nom (Webum,
       UmbeliumManager). La valeur remonte dans `payload.fullName`, jamais
       dans `firstName` : un `given-name` recyclé ferait autoremplir le seul
       PRÉNOM par le navigateur, qui finirait dans `full_name`.
     · `classNames` + `showCard` : renomme ou retire le chrome du package.
     · `authFormLabelsEn` : la copie anglaise complète, prête à passer en
       `labels`.
   ══════════════════════════════════════════════════════════════════════════ */

/** ⚠️ Union FIGÉE : des apps en font des `Record<AuthFormMode, …>` (Monitorum),
 *  y ajouter une valeur casserait leur typage. L'« oubli en ligne » est donc
 *  une OPTION (`forgotPasswordMode`), pas un mode de plus. */
export type AuthFormMode = 'signin' | 'signup' | 'forgot';

/**
 * Écran rendu : les trois modes BASCULABLES, plus `'reset'` — « nouveau mot
 * de passe + confirmation », sans email, pour la page ouverte depuis le lien de
 * récupération (session établie par `PASSWORD_RECOVERY`). Mesuré au Manager
 * (`pages/ResetPassword.tsx`, 100 lignes recopiées à la main).
 *
 * Type SÉPARÉ plutôt qu'un élargissement d'`AuthFormMode` : `onModeChange`
 * reste typé sur les trois modes (on n'arrive jamais sur `'reset'` par la
 * bascule, seulement par un lien), donc un `useState<'signin' | 'signup' |
 * 'forgot'>` passé tel quel à `onModeChange` compile toujours.
 */
export type AuthFormScreen = AuthFormMode | 'reset';

/** Charge utile d'inscription — `firstName`/`lastName` sont déjà trimés
 *  (chaîne vide quand le champ est masqué via `signUpFields`, donc aussi en
 *  mode `signUpFields.fullName`). */
export interface AuthSignUpPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /**
   * Nom complet trimé, saisi dans le champ unique — PRÉSENT UNIQUEMENT quand
   * `signUpFields.fullName` est actif. Hors de ce mode la clé est ABSENTE (pas
   * `''`) : le payload historique garde exactement ses 4 clés, même pour une
   * app qui l'étalerait dans ses métadonnées. Se passe tel quel à
   * `useAuth().signUp(email, password, { fullName })`.
   */
  fullName?: string;
}

/** Deuxième argument de `onForgotPassword` — ignorable (une fonction
 *  `(email) => …` reste assignable). */
export interface AuthForgotPasswordOptions {
  /** `resetRedirectTo` tel quel : à passer en `redirectTo` de
   *  `resetPasswordForEmail`. `undefined` = l'app décide (et
   *  `useAuth().resetPassword` retombe sur `getResetPasswordUrl()`). */
  redirectTo?: string;
  /** `true` quand l'envoi vient du bouton EN LIGNE (l'écran ne change pas) —
   *  permet une copie de confirmation différente de celle du mode dédié. */
  inline: boolean;
}

/** Ce que reçoit `renderModeToggle` pour rebâtir le pied à sa main. */
export interface AuthFormModeToggle {
  /** Écran affiché actuellement (`'reset'` compris). */
  mode: AuthFormScreen;
  /** Mode vers lequel bascule le contrôle (`'signup'` depuis la connexion,
   *  `'signin'` depuis l'inscription ET depuis l'écran d'oubli). */
  target: AuthFormMode;
  /** Amorce du pied (« Pas encore de compte ? ») — `''` en mode `'forgot'`. */
  prompt: string;
  /** Libellé du contrôle (« Créer un compte », « Se connecter », …). */
  label: string;
  /** `modeToggleHref(target)` s'il est fourni, sinon `undefined`. */
  href?: string;
  /** `busy` du formulaire : à reporter sur le contrôle rendu. */
  busy: boolean;
  /** Bascule le mode (remet la validation locale à zéro et replace le focus
   *  dans le formulaire, comme le bouton du package). */
  switchTo: (mode: AuthFormMode) => void;
  /** Classe canonique du pied, déjà passée par `classNames`. */
  footerClassName: string;
  /** Classe canonique du lien accentué, déjà passée par `classNames`. */
  linkClassName: string;
}

/** Champs d'inscription affichés. Tout est à `true` par défaut : le
 *  formulaire à 5 champs de la suite ne bouge pas. */
export interface AuthSignUpFields {
  /** @default true — ignoré quand `fullName` est actif. */
  firstName?: boolean;
  /** @default true — ignoré quand `fullName` est actif. */
  lastName?: boolean;
  /**
   * UN champ « Nom complet » À LA PLACE de la paire prénom/nom (Webum,
   * UmbeliumManager) : `id="fullName"` (passé par `idPrefix`),
   * `autocomplete="name"`, libellés `labels.fullName` /
   * `labels.fullNamePlaceholder`, valeur dans `payload.fullName`.
   * `firstName` / `lastName` sont alors IGNORÉS — jamais trois champs de nom —
   * et remontent `''`.
   *
   * ⚠️ Ne pas l'imiter avec `lastName: false` + `labels.firstName` : le champ
   * garderait `id="firstName"` et `autocomplete="given-name"`, le navigateur
   * n'y autoremplirait que le PRÉNOM, et c'est lui qui finirait dans
   * `full_name`.
   * @default false
   */
  fullName?: boolean;
  /** @default true — à `false`, la validation « mots de passe identiques »
   *  ne s'exécute plus (il n'y a plus rien à comparer). */
  confirmPassword?: boolean;
}

/** Classes émises par le formulaire. Passer `''` retire la classe sans
 *  retirer l'élément ; `undefined` garde le défaut du package. */
export interface AuthFormClassNames {
  card: string;
  divider: string;
  form: string;
  error: string;
  info: string;
  row: string;
  field: string;
  label: string;
  input: string;
  hint: string;
  forgot: string;
  /** Lien discret (« Mot de passe oublié ? »). */
  link: string;
  /** Lien accentué (bascule de mode). */
  linkAccent: string;
  terms: string;
  submit: string;
  footer: string;
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
  /** Champ unique « Nom complet » (`signUpFields.fullName` uniquement). */
  fullName: string;
  fullNamePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  /** `{min}` est remplacé par `minPasswordLength`. */
  passwordHint: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  forgotPassword: string;
  /** Libellé du lien « Mot de passe oublié ? » pendant l'envoi EN LIGNE
   *  (`forgotPasswordMode="inline"` uniquement). */
  forgotPasswordBusy: string;
  /** Erreur locale quand on clique « Mot de passe oublié ? » EN LIGNE sans
   *  avoir saisi d'email. */
  forgotEmailRequired: string;
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
  /** Pied en mode mot de passe oublié (et en mode `reset`). */
  backToSignIn: string;
  /** Mode `reset` : libellé du champ mot de passe. */
  newPassword: string;
  resetSubmit: string;
  resetSubmitBusy: string;
  /** Erreurs de validation locale (avant tout aller-retour réseau). */
  passwordMismatch: string;
  /** `{min}` est remplacé par `minPasswordLength`. */
  passwordTooShort: string;
}

export interface AuthFormProps {
  /** Mode courant — le parent le possède (composant contrôlé). `'reset'` :
   *  écran « nouveau mot de passe », voir `AuthFormScreen`. */
  mode: AuthFormScreen;
  /** Appelé quand l'utilisateur clique « Créer un compte » / « Se connecter »
   *  / « Mot de passe oublié ? ». */
  onModeChange: (mode: AuthFormMode) => void;
  onSignIn: (email: string, password: string) => void | Promise<void>;
  /**
   * Mode `'reset'` : reçoit le nouveau mot de passe, APRÈS la validation locale
   * (longueur `minPasswordLength` + correspondance avec la confirmation). Se
   * branche sur `supabase.auth.updateUser({ password })`. Sans lui, le submit
   * du mode `reset` ne fait rien.
   */
  onResetPassword?: (password: string) => void | Promise<void>;
  onSignUp: (payload: AuthSignUpPayload) => void | Promise<void>;
  /** Le 2e argument est OPTIONNEL côté implémentation : un handler
   *  `(email) => …` écrit avant `resetRedirectTo` reste valide. */
  onForgotPassword: (
    email: string,
    options: AuthForgotPasswordOptions,
  ) => void | Promise<void>;
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
  /** Contenu libre sous le pied de bascule (ex. « Retour à l'accueil »).
   *  AJOUTE un bloc — pour REMPLACER le pied, voir `renderModeToggle`. */
  footer?: ReactNode;
  /** Préfixe des id/htmlFor — à ne changer QUE si deux formulaires coexistent
   *  sur la page : les specs E2E de la suite ciblent #email / #password. */
  idPrefix?: string;
  labels?: Partial<AuthFormLabels>;

  // ── Transparence (tout est optionnel, défaut = rendu historique) ──────────

  /**
   * Rend la bascule de mode en ANCRE (`role=link`) plutôt qu'en `<button>`,
   * avec cette `href` — le clic garde la bascule en place (preventDefault),
   * mais le lien reste lisible et ouvrable dans un nouvel onglet.
   *
   * Réf. Dialum/Anonymum/Scrapium : `(target) => \`?mode=${target}\``, ciblé
   * par `getByRole('link', { name: /^Créer un compte$/i })`.
   *
   * Seul le clic gauche NU est intercepté : ⌘/Ctrl/⇧/⌥-clic et clic non
   * primaire laissent le navigateur ouvrir l'onglet/la fenêtre (l'app doit
   * donc savoir lire `?mode=` au chargement).
   *
   * Comme l'ancre de référence, elle n'est PAS désactivée pendant `busy`
   * (un `<a>` n'a pas d'état `disabled`).
   */
  modeToggleHref?: (target: AuthFormMode) => string;
  /**
   * REMPLACE tout le pied de bascule (`<p class="auth-page__footer">…</p>`)
   * par ce que l'app rend — un `<Link>` de router, deux paragraphes, rien du
   * tout (`null`). Prioritaire sur `modeToggleHref`.
   */
  renderModeToggle?: (toggle: AuthFormModeToggle) => ReactNode;
  /**
   * `'screen'` (défaut) : « Mot de passe oublié ? » bascule vers le mode
   * `'forgot'`, qui a son propre écran et son propre submit.
   * `'inline'` : le lien envoie le mail avec l'email DÉJÀ SAISI et l'écran de
   * connexion ne bouge pas (UX Dialum / Webum / Socialum). Le libellé passe à
   * `labels.forgotPasswordBusy` le temps de la promesse ; un email vide sort
   * `labels.forgotEmailRequired` dans `.auth-page__error`.
   */
  forgotPasswordMode?: 'screen' | 'inline';
  /**
   * URL de retour du lien de réinitialisation, transmise au handler dans
   * `options.redirectTo` — elle PREND LE PAS sur le `/auth/reset-password`
   * de `getResetPasswordUrl()`, que six apps ne routent pas (le lien y
   * tomberait sur la page de vente). Typiquement `getAuthCallbackUrl()`.
   */
  resetRedirectTo?: string;
  /** Champs affichés à l'inscription (défaut : les 5 champs de la suite) —
   *  `{ fullName: true }` pour un champ unique « Nom complet ». */
  signUpFields?: AuthSignUpFields;
  /**
   * Rendre les `<label>` visibles (défaut `true`). `false` : aucun élément
   * `<label>` — chaque champ garde son nom accessible par `aria-label` (même
   * texte, sans la marque de requis). Servum (login à placeholders seuls) :
   * `classNames.label: ''` ne retirait que la classe, le texte restait.
   */
  showLabels?: boolean;
  /**
   * Position du bouton Google par rapport au formulaire (défaut `'before'`,
   * historique). `'after'` : sous le bouton d'envoi — la page de Servum.
   */
  oauthPosition?: 'before' | 'after';
  /** Séparateur « ou » entre OAuth et formulaire (défaut `true`). */
  showOAuthDivider?: boolean;
  /** Lien « Mot de passe oublié ? » en connexion (défaut `true`). */
  showForgotPassword?: boolean;
  /** Rend la carte `.auth-page__card` autour du formulaire. Passer `false`
   *  quand l'app fournit son propre chrome. @default true */
  showCard?: boolean;
  /** Surcharge des classes émises (`''` = aucune classe). */
  classNames?: Partial<AuthFormClassNames>;
}

const defaultLabels: AuthFormLabels = {
  google: 'Continuer avec Google',
  or: 'ou',
  firstName: 'Prénom',
  firstNamePlaceholder: 'Jean',
  lastName: 'Nom',
  lastNamePlaceholder: 'Dupont',
  fullName: 'Nom complet',
  fullNamePlaceholder: 'Jean Dupont',
  email: 'Email',
  emailPlaceholder: 'vous@exemple.com',
  password: 'Mot de passe',
  passwordPlaceholder: '••••••••',
  passwordHint: 'Minimum {min} caractères',
  confirmPassword: 'Confirmer le mot de passe',
  confirmPasswordPlaceholder: '••••••••',
  forgotPassword: 'Mot de passe oublié ?',
  forgotPasswordBusy: 'Envoi...',
  forgotEmailRequired:
    'Entrez d\'abord votre email ci-dessus, puis cliquez sur « Mot de passe oublié ? ».',
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
  newPassword: 'Nouveau mot de passe',
  resetSubmit: 'Mettre à jour le mot de passe',
  resetSubmitBusy: 'Mise à jour...',
  passwordMismatch: 'Les mots de passe ne correspondent pas',
  passwordTooShort: 'Le mot de passe doit contenir au moins {min} caractères',
};

/** Copie ANGLAISE complète (Servum, Noesium EN…) : `labels={authFormLabelsEn}`
 *  suffit, aucune chaîne du formulaire ne reste en français. */
export const authFormLabelsEn: AuthFormLabels = {
  google: 'Continue with Google',
  or: 'or',
  firstName: 'First name',
  firstNamePlaceholder: 'Jane',
  lastName: 'Last name',
  lastNamePlaceholder: 'Doe',
  fullName: 'Full name',
  fullNamePlaceholder: 'Jane Doe',
  email: 'Email',
  emailPlaceholder: 'you@example.com',
  password: 'Password',
  passwordPlaceholder: '••••••••',
  passwordHint: 'At least {min} characters',
  confirmPassword: 'Confirm password',
  confirmPasswordPlaceholder: '••••••••',
  forgotPassword: 'Forgot password?',
  forgotPasswordBusy: 'Sending...',
  forgotEmailRequired: 'Enter your email above first, then click “Forgot password?”.',
  requiredMark: ' *',
  signInSubmit: 'Sign in',
  signInSubmitBusy: 'Signing in...',
  signUpSubmit: 'Create account',
  signUpSubmitBusy: 'Creating...',
  forgotSubmit: 'Send the link',
  forgotSubmitBusy: 'Sending...',
  noAccountPrompt: 'Need an account? ',
  createAccountAction: 'Sign up',
  haveAccountPrompt: 'Already have an account? ',
  signInAction: 'Sign in',
  backToSignIn: 'Back to sign in',
  newPassword: 'New password',
  resetSubmit: 'Update password',
  resetSubmitBusy: 'Updating...',
  passwordMismatch: 'Passwords do not match',
  passwordTooShort: 'Password must be at least {min} characters',
};

const defaultClassNames: AuthFormClassNames = {
  card: 'auth-page__card',
  divider: 'auth-page__divider',
  form: 'auth-page__form',
  error: 'auth-page__error',
  info: 'auth-page__info',
  row: 'auth-page__row',
  field: 'auth-page__field',
  label: 'auth-page__label',
  input: 'auth-page__input',
  hint: 'auth-page__hint',
  forgot: 'auth-page__forgot',
  link: 'auth-page__link',
  linkAccent: 'auth-page__link auth-page__link--accent',
  terms: 'auth-page__terms',
  submit: 'auth-page__submit',
  footer: 'auth-page__footer',
};

/** `''` est une valeur VOULUE (retirer la classe) ; seul `undefined` retombe
 *  sur le défaut du package. */
function mergeClassNames(overrides: Partial<AuthFormClassNames>): AuthFormClassNames {
  const merged = { ...defaultClassNames };
  (Object.keys(merged) as (keyof AuthFormClassNames)[]).forEach((key) => {
    const value = overrides[key];
    if (typeof value === 'string') merged[key] = value;
  });
  return merged;
}

interface AuthFormValues {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const emptyValues: AuthFormValues = {
  firstName: '',
  lastName: '',
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export function AuthForm({
  mode,
  onModeChange,
  onSignIn,
  onResetPassword,
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
  modeToggleHref,
  renderModeToggle,
  forgotPasswordMode = 'screen',
  resetRedirectTo,
  signUpFields,
  showLabels = true,
  oauthPosition = 'before',
  showOAuthDivider = true,
  showForgotPassword = true,
  showCard = true,
  classNames = {},
}: AuthFormProps) {
  const [values, setValues] = useState<AuthFormValues>(emptyValues);
  /** Erreur produite ICI (validation locale ou promesse rejetée par le
   *  parent). Prioritaire sur `error` : c'est la plus récente. */
  const [localError, setLocalError] = useState<string | null>(null);
  /** Envoi EN LIGNE en cours : le parent ne bascule pas `busy` puisqu'il n'y a
   *  pas de changement d'écran — le lien porte lui-même son état. */
  const [inlineForgotBusy, setInlineForgotBusy] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  /** Armé par nos propres boutons de bascule : un changement de mode venu du
   *  parent (deep-link ?mode=, retour en connexion après inscription) ne doit
   *  pas voler le focus. */
  const claimFocusRef = useRef(false);

  const t = { ...defaultLabels, ...labels };
  const c = mergeClassNames(classNames);
  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';
  /** Écrans qui CRÉENT un mot de passe : règles de l'inscription (longueur
   *  minimale, `new-password`, indice). */
  const choosesPassword = isSignUp || isReset;
  const withMin = (text: string) => text.replace('{min}', String(minPasswordLength));
  const fieldId = (name: string) => `${idPrefix}${name}`;
  const shownError = localError ?? error;
  /** Le champ unique REMPLACE la paire prénom/nom : leurs drapeaux sont alors
   *  ignorés (jamais trois champs de nom à l'écran). */
  const showFullName = signUpFields?.fullName ?? false;
  const showFirstName = !showFullName && (signUpFields?.firstName ?? true);
  const showLastName = !showFullName && (signUpFields?.lastName ?? true);
  const showConfirmPassword = signUpFields?.confirmPassword ?? true;

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

  const switchMode = (next: AuthFormMode) => {
    setLocalError(null);
    claimFocusRef.current = true;
    onModeChange(next);
  };

  const onSwitchMode = (next: AuthFormMode) => () => switchMode(next);

  /** « Mot de passe oublié ? » EN LIGNE : on envoie le mail sans quitter
   *  l'écran de connexion. Le message de succès appartient au parent (`info`) ;
   *  seul l'échec local (email vide, promesse rejetée) sort d'ici. */
  const sendForgotInline = () => {
    setLocalError(null);

    const email = values.email.trim();
    if (!email) {
      setLocalError(t.forgotEmailRequired);
      return;
    }

    const returned = onForgotPassword(email, { redirectTo: resetRedirectTo, inline: true });
    if (!returned) return;

    setInlineForgotBusy(true);
    Promise.resolve(returned)
      .catch((err: unknown) => {
        setLocalError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setInlineForgotBusy(false);
      });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const email = values.email.trim();

    if (isForgot) {
      run(onForgotPassword(email, { redirectTo: resetRedirectTo, inline: false }));
      return;
    }

    if (isReset) {
      if (values.password !== values.confirmPassword) {
        setLocalError(t.passwordMismatch);
        return;
      }
      if (values.password.length < minPasswordLength) {
        setLocalError(withMin(t.passwordTooShort));
        return;
      }
      if (onResetPassword) run(onResetPassword(values.password));
      return;
    }

    if (isSignUp) {
      if (showConfirmPassword && values.password !== values.confirmPassword) {
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
          // Un champ masqué ne doit jamais remonter une valeur résiduelle
          // (l'app peut basculer `signUpFields` après une première saisie).
          firstName: showFirstName ? values.firstName.trim() : '',
          lastName: showLastName ? values.lastName.trim() : '',
          // Clé AJOUTÉE seulement en mode champ unique : hors de ce mode, le
          // payload garde exactement ses 4 clés historiques.
          ...(showFullName ? { fullName: values.fullName.trim() } : {}),
        }),
      );
      return;
    }

    run(onSignIn(email, values.password));
  };

  const submitLabel = isReset
    ? busy
      ? t.resetSubmitBusy
      : t.resetSubmit
    : isForgot
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

  /** `<label>` d'un champ — ou rien avec `showLabels={false}`. Au défaut,
   *  l'élément d'hier au caractère près. */
  const fieldLabel = (name: string, text: string) =>
    showLabels ? (
      <label htmlFor={fieldId(name)} className={c.label}>
        {text}
        {t.requiredMark}
      </label>
    ) : null;
  /** Sans `<label>`, le nom accessible passe par `aria-label`. */
  const nameWithoutLabel = (text: string) => (showLabels ? null : { 'aria-label': text });

  const firstNameField = (
    <div className={c.field}>
      {fieldLabel('firstName', t.firstName)}
      <input
        id={fieldId('firstName')}
        {...nameWithoutLabel(t.firstName)}
        type="text"
        value={values.firstName}
        onChange={setField('firstName')}
        className={c.input}
        placeholder={t.firstNamePlaceholder}
        autoComplete="given-name"
        required
        disabled={busy}
      />
    </div>
  );

  const lastNameField = (
    <div className={c.field}>
      {fieldLabel('lastName', t.lastName)}
      <input
        id={fieldId('lastName')}
        {...nameWithoutLabel(t.lastName)}
        type="text"
        value={values.lastName}
        onChange={setField('lastName')}
        className={c.input}
        placeholder={t.lastNamePlaceholder}
        autoComplete="family-name"
        required
        disabled={busy}
      />
    </div>
  );

  /** Champ unique : `autocomplete="name"` fait autoremplir le nom ENTIER
   *  (« Jean Dupont »), là où `given-name` n'aurait donné que « Jean ». */
  const fullNameField = (
    <div className={c.field}>
      {fieldLabel('fullName', t.fullName)}
      <input
        id={fieldId('fullName')}
        {...nameWithoutLabel(t.fullName)}
        type="text"
        value={values.fullName}
        onChange={setField('fullName')}
        className={c.input}
        placeholder={t.fullNamePlaceholder}
        autoComplete="name"
        required
        disabled={busy}
      />
    </div>
  );

  /** Champ unique → pleine largeur ; les deux champs → la rangée 1fr 1fr
   *  historique ; un seul → pleine largeur (la grille laisserait une colonne
   *  vide) ; aucun → rien. */
  const nameFields = showFullName ? (
    fullNameField
  ) : showFirstName && showLastName ? (
    <div className={c.row}>
      {firstNameField}
      {lastNameField}
    </div>
  ) : showFirstName ? (
    firstNameField
  ) : showLastName ? (
    lastNameField
  ) : null;

  /** OAuth + séparateur. Avant le formulaire (défaut, historique) : bouton
   *  puis « ou » ; après (`oauthPosition="after"`) : « ou » puis bouton, le
   *  séparateur restant ENTRE les deux blocs. */
  const showOAuth = Boolean(onGoogle) && !isForgot && !isReset;
  const oauthButton = showOAuth ? (
    <GoogleOAuthButton
      onClick={() => {
        setLocalError(null);
        if (onGoogle) run(onGoogle());
      }}
      disabled={busy}
      label={t.google}
    />
  ) : null;
  const oauthDivider = showOAuth && showOAuthDivider ? (
    <div className={c.divider}>
      <span>{t.or}</span>
    </div>
  ) : null;
  const oauthBlock = showOAuth ? (
    oauthPosition === 'after' ? (
      <>
        {oauthDivider}
        {oauthButton}
      </>
    ) : (
      <>
        {oauthButton}
        {oauthDivider}
      </>
    )
  ) : null;

  const body = (
    <>
      {/* Pas d'OAuth sur l'écran « mot de passe oublié » : il n'y a rien à
          connecter, juste un email à envoyer. */}
      {oauthPosition === 'before' ? oauthBlock : null}

      <form ref={formRef} onSubmit={handleSubmit} className={c.form} aria-busy={busy}>
        {shownError ? (
          <div className={c.error} role="alert">
            {shownError}
          </div>
        ) : null}

        {info ? (
          <div className={c.info} role="status">
            {info}
          </div>
        ) : null}

        {isSignUp ? nameFields : null}

        {/* `reset` : la session vient du lien de récupération, l'email est
            déjà connu — le redemander serait un champ mort. */}
        {!isReset ? (
        <div className={c.field}>
          {fieldLabel('email', t.email)}
          <input
            id={fieldId('email')}
            {...nameWithoutLabel(t.email)}
            type="email"
            value={values.email}
            onChange={setField('email')}
            className={c.input}
            placeholder={t.emailPlaceholder}
            autoComplete="email"
            required
            disabled={busy}
          />
        </div>
        ) : null}

        {!isForgot ? (
          <div className={c.field}>
            {fieldLabel('password', isReset ? t.newPassword : t.password)}
            <input
              id={fieldId('password')}
              {...nameWithoutLabel(isReset ? t.newPassword : t.password)}
              type="password"
              value={values.password}
              onChange={setField('password')}
              className={c.input}
              placeholder={t.passwordPlaceholder}
              autoComplete={choosesPassword ? 'new-password' : 'current-password'}
              required
              disabled={busy}
              // minLength seulement quand on CHOISIT un mot de passe : en
              // CONNEXION, un compte existant doit pouvoir se connecter quel que
              // soit son mot de passe.
              minLength={choosesPassword ? minPasswordLength : undefined}
              aria-describedby={choosesPassword ? fieldId('password-hint') : undefined}
            />
            {choosesPassword ? (
              <span id={fieldId('password-hint')} className={c.hint}>
                {withMin(t.passwordHint)}
              </span>
            ) : null}
          </div>
        ) : null}

        {(isSignUp && showConfirmPassword) || isReset ? (
          <div className={c.field}>
            {fieldLabel('confirmPassword', t.confirmPassword)}
            <input
              id={fieldId('confirmPassword')}
              {...nameWithoutLabel(t.confirmPassword)}
              type="password"
              value={values.confirmPassword}
              onChange={setField('confirmPassword')}
              className={c.input}
              placeholder={t.confirmPasswordPlaceholder}
              autoComplete="new-password"
              required
              disabled={busy}
            />
          </div>
        ) : null}

        {!isSignUp && !isForgot && !isReset && showForgotPassword ? (
          <div className={c.forgot}>
            <button
              type="button"
              className={c.link}
              onClick={
                forgotPasswordMode === 'inline' ? sendForgotInline : onSwitchMode('forgot')
              }
              disabled={busy || inlineForgotBusy}
            >
              {inlineForgotBusy ? t.forgotPasswordBusy : t.forgotPassword}
            </button>
          </div>
        ) : null}

        {isSignUp && termsNotice ? <p className={c.terms}>{termsNotice}</p> : null}

        <button type="submit" className={c.submit} disabled={busy}>
          {submitLabel}
        </button>
      </form>
      {oauthPosition === 'after' ? oauthBlock : null}
    </>
  );

  /** `reset` se comporte comme `forgot` pour le pied : un seul retour. */
  const backOnly = isForgot || isReset;
  const toggleTarget: AuthFormMode = isSignUp || backOnly ? 'signin' : 'signup';
  const togglePrompt = backOnly ? '' : isSignUp ? t.haveAccountPrompt : t.noAccountPrompt;
  const toggleLabel = backOnly
    ? t.backToSignIn
    : isSignUp
      ? t.signInAction
      : t.createAccountAction;
  const toggleHref = modeToggleHref?.(toggleTarget);

  /** `<button>` par défaut (contrat historique) ; `<a>` dès que
   *  `modeToggleHref` est fourni — `role=link`, deep-link ouvrable. */
  const toggleControl =
    toggleHref === undefined ? (
      <button
        type="button"
        className={c.linkAccent}
        onClick={onSwitchMode(toggleTarget)}
        disabled={busy}
      >
        {toggleLabel}
      </button>
    ) : (
      // Ancre : ?mode= reste lisible et ouvrable en nouvel onglet, le clic
      // bascule en place sans rechargement (réf. Dialum/Anonymum).
      <a
        href={toggleHref}
        className={c.linkAccent}
        onClick={(event) => {
          // ⚠️ On n'intercepte QUE le clic gauche nu. Un clic avec modificateur
          // (⌘/Ctrl/⇧/⌥) ou avec un autre bouton, c'est « ouvrir dans un
          // nouvel onglet / une nouvelle fenêtre » : un preventDefault
          // inconditionnel annulerait cette ouverture ET basculerait quand même
          // l'onglet courant — les deux à la fois. C'est exactement ce que
          // `modeToggleHref` promet de préserver.
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }
          event.preventDefault();
          switchMode(toggleTarget);
        }}
      >
        {toggleLabel}
      </a>
    );

  const modeToggle = renderModeToggle ? (
    renderModeToggle({
      mode,
      target: toggleTarget,
      prompt: togglePrompt,
      label: toggleLabel,
      href: toggleHref,
      busy,
      switchTo: switchMode,
      footerClassName: c.footer,
      linkClassName: c.linkAccent,
    })
  ) : (
    <p className={c.footer}>
      {backOnly ? (
        toggleControl
      ) : (
        <>
          {togglePrompt}
          {toggleControl}
        </>
      )}
    </p>
  );

  return (
    <>
      {showCard ? <div className={c.card}>{body}</div> : body}

      {modeToggle}

      {footer}
    </>
  );
}
