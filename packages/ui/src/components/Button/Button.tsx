import {
  forwardRef,
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type ComponentType,
  type CSSProperties,
  type ElementType,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { Spinner } from '../Spinner';
import type { SpinnerSize } from '../Spinner';
// Styles are imported separately via @umbeli-com/ui/styles

/** Intentions visuelles. `danger` = action destructrice (cf. Anonymum
 *  `.btn-danger`), `link` = bouton qui se lit comme un lien, sans fond ni
 *  hauteur imposée (cf. Webum `.btn-link`, Monitorum `.mo-link`).
 *
 *  `ghost` et `ghost-plain` sont DEUX fantômes différents, et c'est voulu :
 *  `ghost` (historique) = fond transparent + filet + encre neutre ;
 *  `ghost-plain` = fond transparent, AUCUN filet, encre de marque — le
 *  `.btn-ghost` d'Anonymum (`src/styles/components/_button.scss:60-68`) et le
 *  `.btn-ghost-light` de Scrapium. Adopter `ghost` dans ces apps ajoutait un
 *  cadre et repeignait le texte : d'où la valeur séparée, `ghost` n'ayant pas
 *  bougé d'un pixel. */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'ghost-plain'
  | 'danger'
  | 'link';

/** Échelle de hauteurs : 24 / 32 / 40 / 48 / 56 px.
 *  `sm` | `md` | `lg` gardent EXACTEMENT les hauteurs historiques du paquet
 *  (32 / 40 / 48) ; `xs` et `xl` prolongent l'échelle, ils ne la déplacent pas.
 *  Hors échelle : la prop `height` (px libres). */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Ce qu'accepte `inheritFont` : un booléen OU une graisse.
 *
 * `true`  → le paquet n'impose plus RIEN : `font-family: inherit` et
 *           `font-weight: inherit`, le bouton prend la typographie de la page.
 * nombre  → même chose pour la famille, mais la graisse est celle demandée
 *           (`inheritFont={600}`). C'est le cas mesuré d'Anonymum : la police
 *           vient de la page (`src/styles/_reset.scss:19`) et les boutons sont
 *           en 600 (`$font-weight-semibold`, `_variables.scss:50`), alors que
 *           le paquet impose `'Manrope'` + 500.
 * `false` (défaut) → rendu historique, Manrope 500.
 *
 * Garde-fou, identique à celui de `height` : un nombre qui n'est pas une
 * graisse CSS exploitable (NaN, 0, négatif, hors [1,1000]) est traité comme
 * `false` — la prop est ignorée EN ENTIER, famille comprise. Une valeur qui ne
 * veut rien dire ne doit pas libérer la police à moitié.
 *
 * Même forme que le `size` du Spinner (cran nommé OU valeur libre) : une
 * seule prop, une seule question — qui décide de la typo, le paquet ou l'app.
 */
export type ButtonInheritFont = boolean | number;

/** Chaînes lues/affichées, surchargeables. Français par défaut. */
export interface ButtonLabels {
  /** Nom accessible du bouton pendant `loading` EN MODE `iconOnly` — là, et
   *  seulement là, `children` est retiré : sans cette chaîne (ou un `aria-label`
   *  fourni par l'appelant) le bouton n'aurait plus de nom du tout.
   *  Défaut : « Chargement… ». En mode texte, le libellé visible reste le nom
   *  et le spinner ne dit rien (cf. `loading`).
   *  Sans usage en `unstyled` : aucun spinner n'y est rendu et `children`
   *  n'y est jamais retiré, donc le nom ne change pas. */
  loading?: string;
}

/** Props PROPRES au composant — celles qui ne dépendent pas de l'élément rendu.
 *  Elles sont retirées des props natives de l'élément (cf. `ButtonProps`), donc
 *  aucune collision possible avec un attribut HTML du même nom. */
export interface ButtonOwnProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Affiche un `Spinner`, pose `aria-busy="true"` et désactive le bouton.
   *  Le libellé reste visible ET reste le NOM ACCESSIBLE du bouton : le contenu
   *  d'un `<button>` EST son nom, donc le spinner se tait, sinon « Envoyer »
   *  deviendrait « Chargement… Envoyer » et un bouton nommé par son `title`
   *  (le cas de `ThemeToggle`) verrait son nom carrément remplacé, le contenu
   *  primant sur `title`. Les sélecteurs par nom des suites e2e tiennent donc
   *  pendant le chargement.
   *  Le bouton s'élargit du spinner et du `gap` le temps du chargement ; en
   *  `iconOnly` la largeur est figée par la taille, donc rien ne bouge.
   *  Sur un élément qui n'est PAS un `<button>` (cf. `as`), `disabled` n'existe
   *  pas dans le DOM : il devient `aria-disabled="true"` + clic neutralisé.
   *  En `unstyled`, tout cela reste vrai SAUF le spinner, qui n'est pas rendu :
   *  l'indicateur d'attente appartient alors à l'app (cf. `unstyled`). */
  loading?: boolean;
  /**
   * Bouton inactif. Sur un `<button>` c'est l'attribut natif, inchangé.
   *
   * Déclaré ici plutôt que laissé aux props natives parce qu'un `<a>` et un
   * `<Link>` n'ont PAS de `disabled` : sans cette ligne, `<Button as="a"
   * disabled>` ne compilait pas alors que le composant sait le traiter (il le
   * traduit en `aria-disabled="true"`, retire le `href` et neutralise le clic).
   * Même type que l'attribut natif — le contrat du `<button>` ne bouge pas.
   */
  disabled?: boolean;
  /** Bouton carré : largeur = hauteur, aucun padding horizontal. `children` est
   *  alors la seule icône : fournir un `aria-label` (ou un `title`). */
  iconOnly?: boolean;
  /** Posé tel quel en `data-testid`. Contrat des suites Playwright des apps. */
  testId?: string;
  labels?: ButtonLabels;
  /**
   * Rend la typographie du bouton transparente à celle de l'app.
   *
   * Mesuré : le paquet pose `font-family: 'Manrope', sans-serif` et
   * `font-weight: 500` sur `.button`. Anonymum hérite la police de la page et
   * écrit ses 75 boutons en 600 — adopter le composant tel quel les repeignait
   * tous. Défaut `false` : rien ne change.
   *
   * ⚠️ `true`/un nombre libèrent la FAMILLE (elle est héritée). Pour garder
   * Manrope tout en changeant la graisse, passer `style={{ fontWeight: 600 }}`.
   */
  inheritFont?: ButtonInheritFont;
  /**
   * Hauteur libre en px, hors échelle `size` — même esprit que le diamètre
   * libre du `Spinner` (`size={40}`).
   *
   * Mesuré : Anonymum pose `$button-height: 52px` (`_variables.scss:98`) sur
   * son `.btn` sans classe de taille ; aucun cran du paquet ne tombe dessus
   * (32/40/48, plus 24 et 56). `height={52}` donne exactement cette hauteur,
   * et la largeur en mode `iconOnly` suit.
   *
   * Le padding horizontal et la taille de police continuent de venir de `size`
   * (rien n'est deviné à partir d'une hauteur) : choisir le cran le plus proche
   * et corriger le padding chez soi si besoin. Valeur non finie ou ≤ 0 :
   * ignorée, la hauteur du cran s'applique.
   */
  height?: number;
  /**
   * Cible d'un bouton qui est en fait un lien. Fourni SEUL (sans `as`), il
   * fait rendre un `<a>` — c'est le cas de Scrapium (`src/SalesLanding.tsx:155`
   * et `:423`) et de Webum (`pages/Agencies.tsx:333`, un `mailto:`). Avec `as`,
   * `as` décide de l'élément et `href` est simplement transmis.
   */
  href?: string;
  /**
   * NU : le composant garde le COMPORTEMENT et rend l'APPARENCE à l'app. Il
   * n'émet AUCUNE classe `button*` — ni `button`, ni `button--{variant}` /
   * `button--{size}`, ni `--full-width`, `--icon-only`, `--loading`,
   * `--inherit-font`, `--custom-weight`, `--custom-height`, ni
   * `button__spinner`. Il ne reste que `className`, transmise TELLE QUELLE ;
   * vide ou absente, l'attribut `class` n'est pas écrit du tout (même règle
   * que `DragDropUpload`). Même idée que `unstyledTitle` de `PageHeader`, à
   * l'échelle du composant entier.
   *
   * Mesuré : l'admin de Webum ne charge PAS `@umbeli-com/ui/styles`
   * (`apps/admin/src/main.tsx:8-14` n'importe que sa feuille, billing et
   * layout) ; il peint ses boutons avec son propre `.btn`
   * (`apps/admin/src/styles.css:454-477`, 145 `className="btn …"` dans
   * `apps/admin/src`). Adopter `<Button className="btn …">`
   * ajoutait `button button--primary button--md`, que rien n'y stylise,
   * pendant que `.btn` continuait de peindre ; et `as`/`href` ne servait à rien
   * à ses boutons-liens (`components/PublishBar.tsx:124`,
   * `pages/Dashboard.tsx:93`…) tant que la classe du paquet s'ajoutait. Avec :
   *
   *   <Button as="a" unstyled className="btn btn--ghost btn--sm" href={url}>
   *
   * le DOM est exactement `<a class="btn btn--ghost btn--sm" href="…">`.
   *
   * RESTE géré par le composant :
   * - l'élément rendu (`as`, `href`), la `ref`, `testId` et toutes les props
   *   natives (`style`, `title`, `aria-*`, `onClick`…) ;
   * - `disabled` : attribut natif sur un `<button>` ; ailleurs
   *   `aria-disabled="true"`, `href` retiré d'un `<a>`, clic neutralisé ;
   * - `loading` : `disabled` + `aria-busy="true"` sur un `<button>` ; ailleurs
   *   `aria-busy="true"` + la même inertie.
   *
   * SE TAIT — c'est de la peau, désormais celle de l'app :
   * - `variant`, `size`, `fullWidth`, `iconOnly`, `inheritFont`, `height` :
   *   aucune classe, et aucune variable CSS inline (`--button-height`,
   *   `--button-font-weight`) — pas de `style` écrit pour une peau absente ;
   * - le `Spinner` de `loading` n'est PAS rendu, et `children` n'est jamais
   *   retiré, même en `iconOnly`. Le spinner est lui aussi de la peau du paquet
   *   (classes `spinner*`, servies par la feuille que l'app ne charge pas) et,
   *   chez Webum, `.spinner` EST l'anneau (`styles.css:41`) : il retomberait
   *   sur l'enveloppe du composant (cf. `Spinner.isolate`) et le libellé
   *   « Chargement… » n'y serait plus masqué. L'indicateur d'attente reste
   *   donc celui de l'app, dans `children`, comme aujourd'hui
   *   (`<Loader className="spin" />`, « Enregistrement… »).
   *
   * Défaut `false` : rendu historique, au caractère près. Seul `true` active le
   * mode — comme `inheritFont`, une valeur venue de JS qui n'est pas `true`
   * (`"false"`, `1`) laisse la peau en place. Consommée par le composant :
   * jamais transmise à l'élément rendu, ni au DOM ni à un `as={Composant}`.
   */
  unstyled?: boolean;
  className?: string;
}

/**
 * Props publiques. `E` est l'élément rendu (défaut `'button'`), ce qui donne
 * les props natives de CET élément : `<Button as="a" target="_blank">` et
 * `<Button as={Link} to="/pricing">` sont typés, `<Button as="a" formAction>`
 * (propre au `<button>`) et `<Button target="_blank">` (propre au `<a>`) sont
 * refusés. Attention, `type` n'est PAS un discriminant : l'attribut existe sur
 * les deux éléments (type MIME côté `<a>`), donc `as="a" type="submit"` passe
 * le typage — c'est le DOM qui en décide, pas nous.
 *
 * `ButtonProps` sans paramètre reste exactement l'ancien contrat
 * (`ButtonHTMLAttributes<HTMLButtonElement>` + les props propres).
 */
export type ButtonProps<E extends ElementType = 'button'> = ButtonOwnProps & {
  /**
   * Élément (ou composant) rendu à la place de `<button>`.
   *
   * Mesuré : Webum rend des `<Link>` react-router (`pages/Tech.tsx:82`,
   * `pages/Landing.tsx:438`) et un `<a mailto:>` (`pages/Agencies.tsx:333`),
   * Scrapium deux `<a>` (`src/SalesLanding.tsx:155` et `:423`) — tous avec les
   * classes `.btn …`. Un composant qui rend un `<button>` en dur ne pouvait pas
   * les remplacer : naviguer n'est pas cliquer (cmd-clic, « ouvrir dans un
   * onglet », crawl, rôle ARIA).
   */
  as?: E;
} & Omit<ComponentPropsWithoutRef<E>, 'as' | keyof ButtonOwnProps>;

const defaultLabels: Required<ButtonLabels> = {
  loading: 'Chargement…',
};

/** Le spinner suit la taille du bouton sans jamais écraser le texte. */
const spinnerSizeFor: Record<ButtonSize, SpinnerSize> = {
  xs: 'sm',
  sm: 'sm',
  md: 'sm',
  lg: 'md',
  xl: 'md',
};

/** Graisse CSS valide : 1 → 1000. Hors bornes (ou NaN), on ne pose rien plutôt
 *  que d'écrire une déclaration invalide qui ferait retomber le bouton sur
 *  `inherit` sans bruit. */
function isUsableWeight(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 1000;
}

/** Props vues par le rendu : les props propres, plus le petit sous-ensemble de
 *  props natives que le composant doit LIRE (jamais deviner). Le reste voyage
 *  dans le rest et n'est pas inspecté. */
type ButtonRenderProps = ButtonOwnProps & {
  as?: ElementType;
  style?: CSSProperties;
};

function ButtonRender(
  {
    children,
    as,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    iconOnly = false,
    inheritFont = false,
    height,
    unstyled = false,
    testId,
    labels,
    className = '',
    ...props
  }: ButtonRenderProps,
  ref: Ref<Element>
) {
  const t = { ...defaultLabels, ...labels };

  // Élément rendu. `as` prime ; à défaut un `href` fait un lien ; sinon
  // `<button>`, le défaut historique — aucune des deux nouvelles props n'étant
  // fournie dans le cas courant, on repasse exactement par l'ancien chemin.
  const element: ElementType = as ?? (props.href !== undefined ? 'a' : 'button');
  const isNativeButton = element === 'button';

  // `unstyled` : comportement gardé, peau rendue à l'app (cf. la prop). Seul
  // `true` l'active — même règle que `inheritFont === true` plus bas : un
  // `"false"` venu de JS ne doit pas retirer la peau sans bruit. Au défaut,
  // `bare` vaut `false` et chaque garde qui le lit ci-dessous se neutralise :
  // on repasse exactement par le chemin historique.
  const bare = unstyled === true;

  // `inheritFont` : `false`/absent = rien ne change ; `true` = famille ET
  // graisse héritées ; un nombre EXPLOITABLE = famille héritée + cette
  // graisse-là.
  // Un nombre inexploitable (NaN, 0, négatif, > 1000) retombe sur `false` : la
  // prop est ignorée en entier, exactement comme une `height` invalide. Sans
  // cette symétrie, `inheritFont={NaN}` posait quand même `--inherit-font`,
  // donc `font-family: inherit` ET `font-weight: inherit` — le contraire du
  // garde-fou annoncé, et une typographie changée sans bruit.
  // Toute autre valeur qu'un booléen ou un nombre (un `'600'` venu de JS) suit
  // la même règle : elle n'est pas `true`, donc elle ne libère rien.
  // En `unstyled`, `customWeight` et `customHeight` tombent à `false` : les
  // variables `--button-font-weight` / `--button-height` n'alimentent que des
  // classes qui ne sont plus émises, les poser écrirait un `style` pour rien.
  const customWeight =
    !bare && typeof inheritFont === 'number' && isUsableWeight(inheritFont);
  const inheritsFont =
    typeof inheritFont === 'number' ? customWeight : inheritFont === true;
  // Même garde que le diamètre libre du Spinner : un NaN ou un négatif
  // écrirait `NaNpx` et ferait disparaître le bouton sans bruit.
  const customHeight =
    !bare && typeof height === 'number' && Number.isFinite(height) && height > 0;

  // La chaîne de classes garde la forme historique au caractère près quand les
  // nouvelles props sont à leur défaut : chaque modificateur ajouté porte son
  // propre espace de tête, donc il n'insère rien quand il est absent.
  const classes =
    `button button--${variant} button--${size} ${fullWidth ? 'button--full-width' : ''}` +
    `${iconOnly ? ' button--icon-only' : ''}` +
    `${loading ? ' button--loading' : ''}` +
    `${inheritsFont ? ' button--inherit-font' : ''}` +
    `${customWeight ? ' button--custom-weight' : ''}` +
    `${customHeight ? ' button--custom-height' : ''}` +
    ` ${className}`;

  // Attribut `class` réellement posé. Hors `unstyled` : la chaîne ci-dessus,
  // toujours, à la même place qu'avant. En `unstyled` : la `className` de
  // l'app SEULE et TELLE QUELLE — rien d'ajouté, rien de normalisé — et, vide
  // ou absente, pas d'attribut du tout plutôt qu'un `class=""`.
  const classProps = bare
    ? className !== ''
      ? { className }
      : null
    : { className: classes };

  // Valeurs libres passées en variables CSS inline et consommées par la
  // feuille, comme `--spinner-size` : l'app garde la main dessus en CSS, et
  // aucune déclaration n'est posée quand la prop est absente.
  const cssVars: Record<string, string> = {};
  if (customWeight) cssVars['--button-font-weight'] = String(inheritFont);
  if (customHeight) cssVars['--button-height'] = `${height}px`;
  const styleProps =
    customWeight || customHeight
      ? { style: { ...props.style, ...cssVars } as CSSProperties }
      : null;

  // ── Ce qui dépend de l'élément rendu ──────────────────────────────────────
  // `<button>` : chemin historique, intact — `loading` pose l'attribut natif
  // `disabled` et `aria-busy`, rien d'autre.
  // Autre élément : `disabled` n'existe pas sur un `<a>`/`<Link>`. Le laisser
  // passer produirait un attribut inerte et le lien naviguerait quand même. On
  // le traduit donc en `aria-disabled="true"` (l'état est annoncé, l'élément
  // reste focusable, conformément aux pratiques ARIA), on retire le `href` d'un
  // `<a>` — sans href ce n'est plus un lien, donc plus de cmd-clic ni de
  // « ouvrir dans un onglet » — et on neutralise le clic, ce qui couvre aussi
  // les composants de routeur qui naviguent depuis `to` (`as={Link}`).
  let rest: Record<string, unknown>;
  let stateProps: Record<string, unknown> | null;

  if (isNativeButton) {
    rest = props as Record<string, unknown>;
    stateProps = loading ? { disabled: true, 'aria-busy': true } : null;
  } else {
    const { disabled, ...forwarded } = props;
    const inert = disabled === true || loading;
    rest = forwarded as Record<string, unknown>;
    stateProps = {
      ...(loading ? { 'aria-busy': true } : null),
      ...(inert
        ? {
            'aria-disabled': true,
            ...(element === 'a' ? { href: undefined } : null),
            onClick: (event: MouseEvent<Element>) => {
              event.preventDefault();
              event.stopPropagation();
            },
          }
        : null),
    };
  }

  // Le type rendu est décidé à l'exécution : TypeScript ne peut pas vérifier un
  // élément dont la nature dépend d'une prop. Le contrat typé vit dans
  // `ButtonProps<E>` / `ButtonComponent` ci-dessous ; cette ligne est le seul
  // point d'élargissement, et il est borné à l'appel JSX qui suit.
  const Component = element as unknown as ComponentType<Record<string, unknown>>;

  return (
    <Component
      {...classProps}
      {...rest}
      // Étalés seulement quand ils ont une valeur : à leur défaut, l'élément
      // rendu est exactement celui d'avant (mêmes attributs, même ordre).
      {...stateProps}
      {...styleProps}
      {...(testId !== undefined ? { 'data-testid': testId } : null)}
      {...(ref ? { ref } : null)}
    >
      {/*
        `unstyled` : ni spinner, ni retrait de `children`. Le spinner est de la
        peau (classes `spinner*` d'une feuille que l'app ne charge pas) ; sans
        lui, retirer l'icône en `iconOnly` laisserait un bouton vide. L'état
        d'attente reste annoncé par `aria-busy`, posé plus haut dans les deux
        modes.
      */}
      {loading && !bare && (
        <Spinner
          size={spinnerSizeFor[size]}
          // Le contenu d'un `<button>` EST son nom accessible, et le libellé
          // visuellement masqué du Spinner en fait partie. En mode texte le
          // libellé visible suffit : le spinner se tait (`label=""`) pour ne pas
          // préfixer le nom — `aria-busy` porte déjà l'information d'attente.
          // En `iconOnly`, `children` disparaît : le spinner redevient la seule
          // source de nom, sauf `aria-label` de l'appelant, qui prime.
          label={iconOnly ? t.loading : ''}
          className="button__spinner"
        />
      )}
      {iconOnly && loading && !bare ? null : children}
    </Component>
  );
}

/** Signature publique : générique sur l'élément rendu, `ref` typée sur CET
 *  élément (`HTMLButtonElement` par défaut, `HTMLAnchorElement` avec
 *  `as="a"`…). Le `forwardRef` est nouveau et purement additif : sans `ref`,
 *  rien n'est posé sur l'élément. */
export interface ButtonComponent {
  <E extends ElementType = 'button'>(
    props: ButtonProps<E> & { ref?: ComponentPropsWithRef<E>['ref'] }
  ): ReactElement | null;
  displayName?: string;
}

export const Button = forwardRef(ButtonRender) as unknown as ButtonComponent;

Button.displayName = 'Button';

export default Button;
