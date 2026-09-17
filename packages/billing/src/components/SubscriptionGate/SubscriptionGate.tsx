import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ArrowRight, RefreshCw, ExternalLink, LogOut, Check } from 'lucide-react';

export interface SubscriptionGatePlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  description: string;
  /** Badge text shown on this plan (e.g. "2 mois gratuits") */
  badge?: string;
}

/**
 * Raison du blocage, en mode paywall — choisit le sous-titre.
 * - `canceled`   : abonnement résilié
 * - `expired`    : abonnement expiré
 * - `trial-used` : essai gratuit déjà consommé
 *
 * Fournir `reason` implique le mode paywall (comme `trialUsed`) : CTA
 * « S'abonner » au lieu du CTA d'essai.
 */
export type SubscriptionGateReason = 'canceled' | 'expired' | 'trial-used';

/** Contexte passé aux libellés interpolés. */
export interface SubscriptionGateCopyContext {
  appName: string;
  trialDays: number;
}

/** i18n — défauts en français (copie canonique, cf. `defaultLabels`). */
export interface SubscriptionGateLabels {
  /** Titre en mode essai. défaut : (c) => `Essayez ${c.appName} gratuitement` */
  title?: (copy: SubscriptionGateCopyContext) => string;
  /** Titre en mode paywall. défaut : 'Votre essai gratuit est terminé' */
  titleTrialUsed?: (copy: SubscriptionGateCopyContext) => string;
  /** défaut : 'Connecté en tant que' (l'e-mail suit, en `<strong>`) */
  account?: string;
  /**
   * Sous-titre paywall HISTORIQUE (`trialUsed` sans `reason`).
   * Sans surcharge : « Abonnez-vous pour continuer à utiliser <strong>{appName}</strong>. ».
   * Avec surcharge : rendu tel quel. Une chaîne reste une chaîne (plus de
   * `<strong>`) ; depuis la 1.3, un nœud React est accepté pour garder la mise en
   * valeur — le paywall de Monitorum écrit « … utiliser <strong>Monitorum</strong>
   * avec le compte <strong>{email}</strong>. » (passer alors `userEmail` à
   * `undefined` pour ne pas répéter le compte sur sa propre ligne).
   * Ignoré dès que `reason` est fourni — c'est alors `reason*` qui décide.
   */
  trialUsedSubtitle?: (copy: SubscriptionGateCopyContext) => ReactNode;
  /** reason='canceled'. défaut : 'Votre abonnement a été résilié. Pour continuer à utiliser {app}, …' */
  reasonCanceled?: (copy: SubscriptionGateCopyContext) => string;
  /** reason='expired'. défaut : 'Votre abonnement a expiré. Pour continuer à utiliser {app}, …' */
  reasonExpired?: (copy: SubscriptionGateCopyContext) => string;
  /** reason='trial-used'. défaut : 'Votre essai gratuit de {N} jours a déjà été utilisé. …' */
  reasonTrialUsed?: (copy: SubscriptionGateCopyContext) => string;
  /** Prix d'un plan. défaut : (p) => `${p.price}€` */
  price?: (plan: SubscriptionGatePlan) => string;
  /** défaut : '/mois' */
  perMonth?: string;
  /** défaut : '/an' */
  perYear?: string;
  /** CTA essai. défaut : (c) => `Démarrer ${c.trialDays} jours gratuits` */
  trialCta?: (copy: SubscriptionGateCopyContext) => string;
  /** défaut : 'Création...' */
  trialCtaLoading?: string;
  /** CTA paywall. défaut : "S'abonner" */
  subscribeCta?: string;
  /** défaut : 'Redirection...' */
  subscribeCtaLoading?: string;
  /** défaut : 'Aucun paiement requis. Annulez à tout moment.' */
  finePrintTrial?: string;
  /** défaut : 'Paiement sécurisé par Stripe. Vous pouvez annuler à tout moment.' */
  finePrintSubscribe?: string;
  /** défaut : "Déjà abonné? Vérifier l'accès" */
  refresh?: string;
  /** défaut : 'Vérification...' */
  refreshLoading?: string;
  /** défaut : 'Facturation' (Anonymum/Dialum/Monitorum : 'Gérer l’abonnement') */
  portal?: string;
  /** défaut : 'Déconnexion' */
  signOut?: string;
  /** aria-label de la croix. défaut : 'Fermer' */
  close?: string;
  /** Repli d'erreur du CTA d'essai. défaut : "Impossible de démarrer l'essai" */
  errorTrial?: string;
  /** Repli d'erreur du CTA d'abonnement. défaut : "Impossible d'ouvrir le paiement" */
  errorSubscribe?: string;
  /** Repli d'erreur des liens secondaires. défaut : 'Erreur' */
  errorGeneric?: string;
  /** CTA quand `soldOut`. défaut : 'Offre complète' */
  soldOutCta?: string;
  /** Titre de l'écran d'activation (`activating`). défaut : 'Activation en cours' */
  activatingTitle?: string;
  /** Ligne sous ce titre. défaut : 'Votre accès s'ouvre dans quelques secondes…' */
  activatingSubtitle?: string;
}

/**
 * data-testid transmis au DOM. AUCUN défaut : sans cette prop, le composant
 * n'émet aucun attribut `data-testid` (rendu par défaut inchangé). Les apps
 * y remettent les identifiants dont leurs specs Playwright dépendent
 * (Anonymum : root='subgate-paywall', cta='paywall-subscribe' ;
 *  Dialum : card='trial-used-paywall').
 */
export interface SubscriptionGateTestIds {
  /** `.subgate` (racine plein écran) */
  root?: string;
  /** `.subgate__card` */
  card?: string;
  /** croix de fermeture */
  close?: string;
  /** une tuile de plan, par id */
  plan?: (planId: string) => string;
  /** bloc d'erreur */
  error?: string;
  /** second bloc d'erreur (`secondaryError`) */
  secondaryError?: string;
  /** bloc d'attente d'activation (`activating`) */
  activating?: string;
  /** CTA principal (essai OU abonnement) */
  cta?: string;
  /** lien « Vérifier l'accès » */
  refresh?: string;
  /** lien portail de facturation */
  portal?: string;
  /** lien déconnexion */
  signOut?: string;
}

export interface SubscriptionGateProps {
  appName: string;
  userEmail?: string;
  plans: SubscriptionGatePlan[];
  /** Shared feature bullets shown below plans */
  features?: string[];
  trialDays?: number;
  /** True when the free trial was already consumed (and no live subscription):
   *  the gate then offers a paid checkout ("S'abonner") instead of a new trial. */
  trialUsed?: boolean;
  /** Classic paid checkout for the selected plan — required when trialUsed is used. */
  onStartTrial: (planId: string) => Promise<void>;
  onSubscribe?: (planId: string) => Promise<void>;
  onRefreshStatus: () => Promise<void>;
  onOpenPortal: () => Promise<void>;
  onSignOut: () => Promise<void>;
  statusLoading?: boolean;
  error?: string | null;
  /**
   * Mode paywall détaillé — choisit le sous-titre (résilié / expiré / essai
   * consommé) et implique `trialUsed` (CTA « S'abonner »).
   *
   * ⚠️ Fournir `reason` réordonne aussi l'en-tête : titre → « Connecté en tant
   * que … » → sous-titre de raison, l'ordre qu'ont écrit les paywalls locaux
   * d'app. Sans `reason`, l'ordre historique est conservé à l'identique.
   */
  reason?: SubscriptionGateReason;
  /**
   * Mot du titre mis en valeur dans un `<span class="subgate__accent">`
   * (dégradé animé). Le titre est découpé sur la PREMIÈRE occurrence ; si le
   * mot n'y figure pas, le titre est rendu tel quel.
   *
   * Sans cette prop, l'accent implicite n'existe QUE pour le titre d'essai par
   * défaut : il est alors posé à la position d'interpolation d'`appName`, pas
   * retrouvé par recherche (cf. `renderTitle`). En mode paywall, ou dès que
   * `labels.title` est surchargé, il n'y a aucun accent implicite — passez
   * `accent` explicitement.
   */
  accent?: string;
  /** i18n — défauts en français (copie canonique). */
  labels?: SubscriptionGateLabels;
  /** data-testid transmis au DOM. Aucun défaut. */
  testIds?: SubscriptionGateTestIds;
  /** Classes additionnelles sur la racine `.subgate` (ex. 'subgate--paywall'). */
  className?: string;
  /**
   * Afficher le lien « Facturation » / portail dans les liens secondaires
   * (défaut `true`). `false` : le lien ET le séparateur qui le précède
   * disparaissent — le paywall « essai consommé » de Monitorum n'a que
   * « Vérifier l'accès » et « Déconnexion ».
   */
  showPortal?: boolean;
  /**
   * Tuiles de plan CLIQUABLES (défaut `true`). `false` : chaque tuile est un
   * `<div>` non focalisable, sans coche ni état `--selected`, et le CTA part
   * avec le plan par défaut — la forme d'une offre UNIQUE (licence fondateurs),
   * où un `<button>` sélectionnable promet un choix qui n'existe pas.
   */
  selectablePlans?: boolean;
  /**
   * Garder l'aspect « mise en avant » (filet et lueur de `--selected`) sur une
   * tuile INERTE — `selectablePlans={false}` la rendait grise.
   *
   * Mesuré chez Anonymum : la licence fondateurs est une offre unique, donc
   * inerte, mais l'app la rendait `subgate__plan--selected` (filet 2px
   * `#5b56ff`, fond `rgba(91,86,255,.02)`, lueur `0 0 0 3px`). Sans
   * échappatoire, adopter le composant effaçait l'encadré violet sur quatre
   * écrans. Ni curseur de clic, ni soulèvement au survol, ni coche : seule
   * la peau « choisie » revient. Sans effet quand `selectablePlans` vaut `true`
   * (la sélection réelle pilote alors `--selected`).
   */
  highlightPlan?: boolean;
  /**
   * Classe ajoutée à CHAQUE tuile de plan (`.subgate__plan`), quel que soit le
   * mode. Pour un habillage que ni `highlightPlan` ni les jetons ne couvrent.
   */
  planClassName?: string;
  /**
   * Peindre soi-même le bloc d'attente d'activation, à la place de
   * `div.subgate__activating` (spinner + titre + sous-titre).
   *
   * Mesuré chez Anonymum : sa ligne d'attente vit DANS l'en-tête
   * (`span.subgate__cta-loading` à côté du titre), pas dans un bloc centré
   * sous lui — aucune combinaison de props ne rendait cette forme. Reçoit les
   * libellés résolus ; renvoyer `null` n'émet rien. Sans effet hors
   * `activating`.
   */
  renderActivating?: (state: { title: string; subtitle: string }) => ReactNode;
  /**
   * Offre épuisée (plafond atteint) : le CTA affiche `labels.soldOutCta` et
   * reste inerte, sans spinner. Mesuré sur le paywall fondateurs (plafond de
   * 100 licences), qui n'avait aucun moyen de désactiver le CTA autrement que
   * pendant un chargement.
   */
  soldOut?: boolean;
  /**
   * Paiement encaissé, accès pas encore ouvert : à la place des plans, des
   * fonctions, du CTA et de la mention, l'écran rend un titre, une ligne et un
   * spinner (`labels.activatingTitle` / `activatingSubtitle`). Les liens
   * secondaires — dont « Vérifier l'accès » — restent, puisque c'est
   * exactement ce que l'utilisateur doit pouvoir faire.
   */
  activating?: boolean;
  /**
   * SECOND bloc d'erreur, sous le premier (délai d'activation dépassé, par
   * exemple). `error` reste la voie normale ; celui-ci existe parce que le
   * paywall fondateurs affiche deux causes distinctes en même temps.
   */
  secondaryError?: ReactNode;
  /**
   * Afficher le sélecteur de plans (défaut `true`). `false` : ni tuiles, ni
   * conteneur `.subgate__plans` — la forme « essai consommé → abonnement
   * seul » d'une app à plan unique (Monitorum : checkout `pro_monthly`, 115
   * lignes de `.subgate` recopiées pour retirer ce seul bloc). Les CTA
   * reçoivent alors le plan par défaut (celui à badge, sinon le dernier), ou
   * `''` si `plans` est vide.
   */
  showPlans?: boolean;
}

/**
 * Segments du titre d'essai par défaut — source UNIQUE, partagée par le libellé
 * `title` (qui les aplatit en chaîne) et par le rendu accentué (qui les garde
 * séparés). Les garder ici évite que les deux dérivent l'un de l'autre.
 */
const TRIAL_TITLE_PREFIX = 'Essayez ';
const TRIAL_TITLE_SUFFIX = ' gratuitement';

const defaultLabels = {
  title: ({ appName }: SubscriptionGateCopyContext) =>
    `${TRIAL_TITLE_PREFIX}${appName}${TRIAL_TITLE_SUFFIX}`,
  titleTrialUsed: (_copy: SubscriptionGateCopyContext) => 'Votre essai gratuit est terminé',
  account: 'Connecté en tant que',
  reasonCanceled: ({ appName }: SubscriptionGateCopyContext) =>
    `Votre abonnement a été résilié. Pour continuer à utiliser ${appName}, abonnez-vous — votre accès est rétabli immédiatement après le paiement.`,
  reasonExpired: ({ appName }: SubscriptionGateCopyContext) =>
    `Votre abonnement a expiré. Pour continuer à utiliser ${appName}, abonnez-vous — votre accès est rétabli immédiatement après le paiement.`,
  reasonTrialUsed: ({ appName, trialDays }: SubscriptionGateCopyContext) =>
    `Votre essai gratuit de ${trialDays} jours a déjà été utilisé. Pour continuer à utiliser ${appName}, abonnez-vous — votre accès est rétabli immédiatement après le paiement.`,
  price: (plan: SubscriptionGatePlan) => `${plan.price}€`,
  perMonth: '/mois',
  perYear: '/an',
  trialCta: ({ trialDays }: SubscriptionGateCopyContext) => `Démarrer ${trialDays} jours gratuits`,
  trialCtaLoading: 'Création...',
  subscribeCta: "S'abonner",
  subscribeCtaLoading: 'Redirection...',
  finePrintTrial: 'Aucun paiement requis. Annulez à tout moment.',
  finePrintSubscribe: 'Paiement sécurisé par Stripe. Vous pouvez annuler à tout moment.',
  refresh: "Déjà abonné? Vérifier l'accès",
  refreshLoading: 'Vérification...',
  portal: 'Facturation',
  signOut: 'Déconnexion',
  close: 'Fermer',
  errorTrial: "Impossible de démarrer l'essai",
  errorSubscribe: "Impossible d'ouvrir le paiement",
  errorGeneric: 'Erreur',
  soldOutCta: 'Offre complète',
  activatingTitle: 'Activation en cours',
  activatingSubtitle: 'Votre accès s\'ouvre dans quelques secondes…',
  // `trialUsedSubtitle` n'a VOLONTAIREMENT pas de défaut ici : son repli est du
  // JSX (`<strong>{appName}</strong>`), rendu en ligne dans l'en-tête.
} satisfies Omit<Required<SubscriptionGateLabels>, 'trialUsedSubtitle'>;

/**
 * Découpe le titre sur la première occurrence de `accent` et enveloppe celle-ci.
 * Réservé à l'`accent` EXPLICITE : la recherche ne sait pas distinguer le mot
 * accentué de la même suite de lettres présente dans l'habillage du titre
 * (« Essayez a gratuitement ».indexOf('a') tombe dans « Essayez »). L'accent
 * par défaut passe donc par le rendu structurel, pas par ici.
 */
function renderTitle(title: string, accent?: string): ReactNode {
  if (!accent) return title;
  const at = title.indexOf(accent);
  if (at === -1) return title;
  return (
    <>
      {title.slice(0, at)}
      <span className="subgate__accent">{accent}</span>
      {title.slice(at + accent.length)}
    </>
  );
}

export function SubscriptionGate({
  appName,
  userEmail,
  plans,
  features = [],
  trialDays = 14,
  trialUsed = false,
  onStartTrial,
  onSubscribe,
  onRefreshStatus,
  onOpenPortal,
  onSignOut,
  statusLoading = false,
  error: externalError = null,
  reason,
  accent,
  labels,
  testIds,
  className,
  showPlans = true,
  showPortal = true,
  selectablePlans = true,
  highlightPlan = false,
  planClassName,
  renderActivating,
  soldOut = false,
  activating = false,
  secondaryError,
}: SubscriptionGateProps) {
  const l = { ...defaultLabels, ...labels };
  const tid: SubscriptionGateTestIds = testIds ?? {};
  const copy: SubscriptionGateCopyContext = { appName, trialDays };
  // `reason` implique le paywall : pas de CTA d'essai derrière « abonnement résilié ».
  const isPaywall = trialUsed || reason !== undefined;

  // Default to the plan with a badge, or the last one (typically annual)
  const defaultPlan = plans.find(p => p.badge) || plans[plans.length - 1];
  const [selectedId, setSelectedId] = useState(defaultPlan?.id ?? '');
  const [trialLoading, setTrialLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const error = localError || externalError;
  // Primitifs stables → pas de churn des useCallback à cause du merge de `labels`.
  const { errorTrial, errorSubscribe, errorGeneric } = l;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleTrial = useCallback(async () => {
    setTrialLoading(true);
    setLocalError(null);
    try {
      await onStartTrial(selectedId);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : errorTrial);
    } finally {
      setTrialLoading(false);
    }
  }, [onStartTrial, selectedId, errorTrial]);

  // Classic paid checkout — used instead of the trial when the trial was already consumed.
  const handleSubscribe = useCallback(async () => {
    setTrialLoading(true);
    setLocalError(null);
    try {
      // `trialUsed` ET `reason` imposent le CTA « S'abonner » alors que
      // `onSubscribe` reste optionnel : sans handler, le clic était un no-op
      // silencieux (spinner puis rien). On rend l'impasse visible.
      if (onSubscribe) await onSubscribe(selectedId);
      else setLocalError(errorSubscribe);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : errorSubscribe);
    } finally {
      setTrialLoading(false);
    }
  }, [onSubscribe, selectedId, errorSubscribe]);

  const handleRefresh = useCallback(async () => {
    setLocalError(null);
    try { await onRefreshStatus(); }
    catch (err) { setLocalError(err instanceof Error ? err.message : errorGeneric); }
  }, [onRefreshStatus, errorGeneric]);

  const handlePortal = useCallback(async () => {
    setPortalLoading(true);
    setLocalError(null);
    try { await onOpenPortal(); }
    catch (err) { setLocalError(err instanceof Error ? err.message : errorGeneric); }
    finally { setPortalLoading(false); }
  }, [onOpenPortal, errorGeneric]);

  const isLoading = trialLoading || portalLoading;

  const title = isPaywall ? l.titleTrialUsed(copy) : l.title(copy);
  // Historiquement : le nom d'app est l'accent du titre d'essai, le paywall n'en
  // a pas. L'accent par défaut est posé À LA POSITION D'INTERPOLATION, jamais
  // retrouvé par `indexOf` — sinon un `appName` dont le texte réapparaît dans
  // l'habillage (« a », « ez », « Ess », « Essayez »…) serait découpé au mauvais
  // endroit, et le balisage historique cassé pour ces noms.
  const titleNode: ReactNode =
    accent !== undefined
      ? renderTitle(title, accent)
      : !isPaywall && !labels?.title
        ? <>{TRIAL_TITLE_PREFIX}<span className="subgate__accent">{appName}</span>{TRIAL_TITLE_SUFFIX}</>
        : title;

  const reasonSubtitle = reason === 'canceled'
    ? l.reasonCanceled(copy)
    : reason === 'expired'
      ? l.reasonExpired(copy)
      : reason === 'trial-used'
        ? l.reasonTrialUsed(copy)
        : null;

  const accountLine = userEmail ? (
    <p className="subgate__subtitle">
      {`${l.account} `}<strong>{userEmail}</strong>
    </p>
  ) : null;

  return (
    <div className={['subgate', className || ''].filter(Boolean).join(' ')} data-testid={tid.root}>
      <div
        className={`subgate__card ${mounted ? 'subgate__card--visible' : ''}`}
        data-testid={tid.card}
      >

        <button type="button" className="subgate__close" onClick={onSignOut} aria-label={l.close} data-testid={tid.close}>&times;</button>

        {/* Header — trial offer, or "trial over" paywall (trialUsed / reason) */}
        <div className="subgate__header">
          <h1 className="subgate__title">{titleNode}</h1>
          {reasonSubtitle !== null ? (
            <>
              {/* Mode `reason` : le compte d'abord, puis la raison du blocage. */}
              {accountLine}
              <p className="subgate__subtitle">{reasonSubtitle}</p>
            </>
          ) : (
            <>
              {isPaywall && (
                labels?.trialUsedSubtitle ? (
                  <p className="subgate__subtitle">{labels.trialUsedSubtitle(copy)}</p>
                ) : (
                  <p className="subgate__subtitle">
                    Abonnez-vous pour continuer à utiliser <strong>{appName}</strong>.
                  </p>
                )
              )}
              {accountLine}
            </>
          )}
        </div>

        {/* Plan selector — cards side by side */}
        {showPlans && !activating && (
        <div className="subgate__plans">
          {plans.map((plan) => {
            const selected = plan.id === selectedId;
            const priceStr = l.price(plan);
            const periodStr = plan.interval === 'month' ? l.perMonth : l.perYear;
            // Une offre unique n'est pas un choix : la tuile devient un bloc
            // inerte, sans coche ni état sélectionné (voir `selectablePlans`).
            const Tile = selectablePlans ? 'button' : 'div';

            return (
              <Tile
                key={plan.id}
                {...(selectablePlans
                  ? {
                      type: 'button' as const,
                      className: `subgate__plan ${selected ? 'subgate__plan--selected' : ''}${planClassName ? ` ${planClassName}` : ''}`,
                      onClick: () => setSelectedId(plan.id),
                    }
                  : {
                      // `--static` retire le chrome de choix (curseur, focus) ;
                      // `highlightPlan` remet l'aspect « mis en avant », qu'une
                      // offre unique garde souvent (mesuré chez Anonymum : la
                      // licence fondateurs perdait son encadré violet).
                      className: `subgate__plan subgate__plan--static${
                        highlightPlan ? ' subgate__plan--selected' : ''
                      }${planClassName ? ` ${planClassName}` : ''}`,
                    })}
                data-testid={tid.plan?.(plan.id)}
              >
                {plan.badge && <span className="subgate__plan-badge">{plan.badge}</span>}
                <span className="subgate__plan-name">{plan.name}</span>
                <span className="subgate__plan-pricing">
                  <span className="subgate__plan-price">{priceStr}</span>
                  <span className="subgate__plan-period">{periodStr}</span>
                </span>
                <span className="subgate__plan-desc">{plan.description}</span>
                {selectablePlans && (
                  <span className={`subgate__plan-check ${selected ? 'subgate__plan-check--on' : ''}`}>
                    {selected && <Check size={14} />}
                  </span>
                )}
              </Tile>
            );
          })}
        </div>
        )}

        {/* Features */}
        {features.length > 0 && !activating && (
          <ul className="subgate__features">
            {features.map((f, i) => (
              <li key={i}><Check size={15} /><span>{f}</span></li>
            ))}
          </ul>
        )}

        {/* Error */}
        {error && (
          <div className="subgate__error" data-testid={tid.error}><p>{error}</p></div>
        )}

        {/* Second bloc d'erreur (voir `secondaryError`) */}
        {secondaryError && (
          <div className="subgate__error" data-testid={tid.secondaryError}><p>{secondaryError}</p></div>
        )}

        {/* Paiement encaissé, accès pas encore ouvert (voir `activating`) */}
        {activating &&
          (renderActivating ? (
            renderActivating({ title: l.activatingTitle, subtitle: l.activatingSubtitle })
          ) : (
            <div className="subgate__activating" data-testid={tid.activating}>
              <span className="subgate__activating-spinner" />
              <p className="subgate__activating-title">{l.activatingTitle}</p>
              <p className="subgate__activating-subtitle">{l.activatingSubtitle}</p>
            </div>
          ))}

        {/* CTA — trial start, or paid checkout when the trial was consumed */}
        {!activating && (
        <button
          type="button"
          className="subgate__cta"
          onClick={isPaywall ? handleSubscribe : handleTrial}
          disabled={isLoading || soldOut}
          data-testid={tid.cta}
        >
          {soldOut ? (
            l.soldOutCta
          ) : trialLoading ? (
            <span className="subgate__cta-loading">
              <span className="subgate__spinner" />
              {isPaywall ? l.subscribeCtaLoading : l.trialCtaLoading}
            </span>
          ) : isPaywall ? (
            <>
              {l.subscribeCta}
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              {l.trialCta(copy)}
              <ArrowRight size={16} />
            </>
          )}
        </button>
        )}

        {!activating && (
          <p className="subgate__fine-print">
            {isPaywall ? l.finePrintSubscribe : l.finePrintTrial}
          </p>
        )}

        {/* Secondary links */}
        <div className="subgate__links">
          <button type="button" className="subgate__link" onClick={handleRefresh} disabled={statusLoading} data-testid={tid.refresh}>
            <RefreshCw size={13} className={statusLoading ? 'subgate__spin' : ''} />
            {statusLoading ? l.refreshLoading : l.refresh}
          </button>
          {showPortal && (
            <>
              <span className="subgate__link-sep" />
              <button type="button" className="subgate__link" onClick={handlePortal} disabled={portalLoading} data-testid={tid.portal}>
                <ExternalLink size={13} />
                {l.portal}
              </button>
            </>
          )}
          <span className="subgate__link-sep" />
          <button type="button" className="subgate__link subgate__link--muted" onClick={onSignOut} data-testid={tid.signOut}>
            <LogOut size={13} />
            {l.signOut}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionGate;
