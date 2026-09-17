import { useState, type CSSProperties, type ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

/**
 * Onglets.
 *
 * Deux régimes, au choix de l'app — c'est le contrat React classique :
 *
 * - NON CONTRÔLÉ (historique) : `defaultTab` pose l'onglet de départ, le
 *   composant retient la sélection. Rien ne change pour les apps existantes.
 * - CONTRÔLÉ : dès que `activeTab` est fourni, le composant n'a PLUS d'état
 *   interne ; il affiche ce que l'app lui dit et se contente de signaler les
 *   clics via `onChange`. C'est ce qui manquait à Anonymum (Front3Page) et à
 *   Monitorum (VisionBoard) : leur onglet actif est une donnée de page
 *   (`mode`, `display`), lue et écrite ailleurs que dans la barre d'onglets.
 *
 * Le panneau est optionnel (`renderPanel={false}`) : une barre d'onglets qui
 * ne pilote pas la boîte juste en dessous — parce que le contenu vit dans une
 * autre zone de la page — reste un onglet, pas un composant à réécrire.
 *
 * Restait le CHROME, et c'est lui qui bloquait la dernière adoption : le
 * comportement convenait, l'apparence non. Trois leviers, tous facultatifs,
 * rendent la barre transparente à la peau de l'app :
 *
 * - `variant="bare"` : le composant ne pose plus AUCUNE de ses classes (ni
 *   `.tabs`, ni `.tabs__list`, ni `.tabs__tab`…). Il ne reste que le
 *   comportement — sélection, rôles ARIA, `data-testid` — et les classes que
 *   l'app fournit. Aucun fond, aucune bordure, aucun `padding`, aucune marge,
 *   aucun `box-shadow` d'onglet actif ne peut donc s'inviter.
 * - `renderRoot={false}` : pas de `<div class="tabs">` autour de la barre.
 *   La barre EST la racine, et c'est elle qui reçoit `className` — une app
 *   dont la barre porte `margin-left: auto` pour se pousser à droite peut
 *   enfin poser cette classe sur l'élément qui se pousse, sans hériter au
 *   passage du fond/de la bordure/du `padding` d'une classe de liste.
 * - `activeClassName` : les apps marquent l'onglet actif avec LEUR classe
 *   (`.is-active` presque partout) ; le composant la pose en plus — ou à la
 *   place, en `bare`.
 *
 * Et le rôle ARIA se choisit (`listRole` / `tabRole`) : le même commutateur
 * compact est tantôt un `tablist`, tantôt un `radiogroup` (Anonymum
 * DocumentsPanel : qualité de rendu standard/haute). Un `radiogroup` dont les
 * boutons annoncent `role="tab"` ment au lecteur d'écran ; l'app n'avait
 * alors d'autre choix que de réécrire la barre.
 */

/** Chaînes lues/affichées, surchargeables. Français par défaut. */
export interface TabsLabels {
  /**
   * Nom accessible de la barre (`aria-label` du `role="tablist"`) —
   * ex. « Mode », « Affichage ». Non posé tant qu'il n'est pas fourni : le
   * DOM par défaut reste celui d'avant, au caractère près.
   */
  tablist?: string;
}

export interface Tab {
  id: string;
  /**
   * Libellé. `ReactNode` depuis la 1.4 (une chaîne reste le cas courant, et
   * son rendu est inchangé) : Webum pose un repère « connecté » dans le
   * libellé de ses onglets d'intégrations. Pour un élément APRÈS le texte,
   * hors de l'enveloppe du libellé, préférer `trailing`.
   */
  label: ReactNode;
  icon?: ReactNode;
  /**
   * Rendu APRÈS le libellé, dans le bouton — la pastille verte « connecté » de
   * Webum (Settings.tsx:108). `icon` ne convient pas : il se place AVANT le
   * texte. Enveloppé dans `<span class="tabs__tab-trailing">` (sans classe en
   * `bare`) ; absent, rien n'est émis.
   */
  trailing?: ReactNode;
  /**
   * Panneau de cet onglet. OPTIONNEL depuis `renderPanel={false}` : une app
   * qui place son contenu ailleurs n'a plus à inventer un `content` bidon
   * pour satisfaire le type. Le rendu du panneau, lui, est inchangé.
   */
  content?: ReactNode;
  /** Posé tel quel en `data-testid` sur le bouton de CET onglet.
   *  Contrat des suites Playwright des apps (ex. `f2-mode-text`). */
  testId?: string;
  /** Classe de CET onglet, après `tabClassName` et la classe d'état. Socialum
   *  (ThumbnailSelector) donne à chaque plateforme sa propre classe. */
  className?: string;
  /** Style de CET onglet — ex. `{ '--platform-color': '#1877f2' }` (Socialum). */
  style?: CSSProperties;
}

/**
 * Apparence. `bare` = NU : aucune classe du paquet n'est posée, nulle part.
 * `plain` = STRUCTURE SEULE : les classes de base (`.tabs__list`,
 * `.tabs__tab`, `-icon`, `-label`) restent émises — donc leur mise en place
 * (flex, alignement, curseur, `nowrap`, icône centrée) et les sélecteurs que la
 * peau de l'app accroche déjà — mais AUCUNE règle de variante ne s'applique :
 * ni survol, ni aplat actif. Monitorum (VisionBoard) habille `.tabs__tab` et
 * devait annuler le survol du `segmented` ; `bare` lui retirait la structure
 * dont sa peau dépend. `default`, `pills` et `segmented` sont inchangées.
 */
export type TabsVariant = 'default' | 'pills' | 'segmented' | 'plain' | 'bare';

/** Rôle ARIA de la barre. `null` = aucun attribut `role`. */
export type TabsListRole = 'tablist' | 'radiogroup' | 'group';

/** Rôle ARIA d'un onglet. `null` = aucun attribut `role`. */
export type TabsTabRole = 'tab' | 'radio' | 'button';

// Le rôle des boutons se DÉDUIT de celui de la barre : c'est la paire qui a un
// sens pour un lecteur d'écran (`tablist`/`tab`, `radiogroup`/`radio`). Un
// simple `group` ne contraint rien : ses enfants restent des boutons.
const TAB_ROLE_FOR_LIST: Record<TabsListRole, TabsTabRole | null> = {
  tablist: 'tab',
  radiogroup: 'radio',
  group: null,
};

/**
 * L'attribut qui dit « c'est celui-ci », par rôle. Chaque famille a le sien :
 * `aria-selected` n'existe pas sur un `radio`, `aria-checked` n'existe pas sur
 * un `tab`. Sans rôle explicite, il reste `aria-current`, valable partout et
 * posé sur le seul élément actif.
 */
function selectionAttribute(
  role: TabsTabRole | null,
  isActive: boolean,
): Record<string, boolean | 'true'> | null {
  if (role === 'tab') return { 'aria-selected': isActive };
  if (role === 'radio') return { 'aria-checked': isActive };
  if (role === 'button') return { 'aria-pressed': isActive };
  return isActive ? { 'aria-current': 'true' } : null;
}

export interface TabsProps {
  tabs: Tab[];
  /** Onglet ouvert au montage, régime NON CONTRÔLÉ. Ignoré si `activeTab`. */
  defaultTab?: string;
  /**
   * Onglet actif, régime CONTRÔLÉ. Fourni ⇒ aucun état interne : ce que l'app
   * passe est ce qui s'affiche, et un clic ne change rien tant que l'app n'a
   * pas mis sa propre valeur à jour.
   */
  activeTab?: string;
  onChange?: (tabId: string) => void;
  /** `segmented` = bascule compacte façon interrupteur (Anonymum
   *  `.f2docs-switch`, Monitorum `.mo-display-toggle`).
   *  `bare` = NU : aucune classe du paquet, donc aucune peinture — l'app
   *  habille la barre entièrement avec les siennes. */
  variant?: TabsVariant;
  /** Rendre la boîte de contenu sous la barre. Défaut : `true` (historique).
   *  `false` ⇒ la barre est seule, l'app place le contenu où elle veut. */
  renderPanel?: boolean;
  /**
   * Rendre la racine `<div class="tabs">` autour de la barre. Défaut : `true`
   * (historique). `false` ⇒ la barre EST la racine : `className` atterrit sur
   * ELLE, et c'est elle qui porte `testId`. Indispensable quand la classe de
   * l'app place la barre (`margin-left: auto`, `align-self`…) : sur la racine
   * la mise en place fonctionne mais le fond/la bordure/le `padding` de cette
   * même classe font alors un second cadre autour du premier.
   *
   * À N'UTILISER QU'AVEC `variant="bare"`. Les variantes peintes accrochent
   * TOUTES leurs règles à la racine (`.tabs--segmented .tabs__list`,
   * `.tabs--default .tabs__tab--active`, `.tabs--no-panel .tabs__list`), et
   * cette racine n'existe plus ici : il ne reste que les règles de base de
   * `.tabs__list` / `.tabs__tab` — donc la pilule par défaut (fond, bordure,
   * `padding: 4px`) ET le `margin-bottom: 24px` que `.tabs--no-panel` était
   * seul à annuler. C'est l'inverse du résultat recherché. Aucune combinaison
   * de classes ne peut rattraper ça côté composant : un sélecteur descendant
   * sans ancêtre ne s'applique pas.
   */
  renderRoot?: boolean;
  className?: string;
  /** Classe posée sur la barre elle-même (`.tabs__list`) — utile quand la
   *  barre doit se placer dans un en-tête (`margin-left: auto`…).
   *  Avec `renderRoot={false}`, `className` s'y ajoute. */
  listClassName?: string;
  /** Classe posée sur CHAQUE onglet, en plus de `.tabs__tab`. */
  tabClassName?: string;
  /** Classe posée sur l'onglet ACTIF, en plus de `.tabs__tab--active` — et
   *  seule à le marquer en `bare`. Les apps utilisent presque toutes
   *  `.is-active` ; le paquet n'a pas à leur imposer son nom. */
  activeClassName?: string;
  /**
   * Classe posée sur chaque onglet INACTIF — le pendant d'`activeClassName`.
   * Webum peint l'inactif en `btn--ghost` et l'actif en `btn--accent` ; or
   * `.btn--ghost` est déclaré APRÈS `.btn--accent` dans sa feuille : posée sur
   * tous les onglets via `tabClassName`, elle repeignait l'actif en fantôme.
   * N'être émise que sur les inactifs supprime le conflit.
   */
  inactiveClassName?: string;
  /** Classe posée sur le panneau (`.tabs__content`). */
  panelClassName?: string;
  /** Classe de l'enveloppe d'icône (en plus de `.tabs__tab-icon`, seule en
   *  `bare`) — Socialum `thumbnail-selector__platform-icon`. */
  iconClassName?: string;
  /** Classe de l'enveloppe du libellé (en plus de `.tabs__tab-label`, seule
   *  en `bare`) — Socialum `planification-page__filter-label`. */
  labelClassName?: string;
  /**
   * Envelopper icône, libellé et `trailing` dans des `<span>` (défaut `true`,
   * historique). `false` : ils sont posés tels quels, en enfants DIRECTS du
   * bouton — `iconClassName` / `labelClassName` sont alors sans objet.
   * Mesuré chez Servum (bascule Graph/Editor) : même sans classe, le `<span>`
   * autour du `<svg>` en fait une boîte inline posée sur la ligne de base, et
   * le bouton passait de 34 à 37px de haut.
   */
  wrapContent?: boolean;
  /**
   * Rendre le conteneur de la barre (défaut `true`). `false` : les boutons
   * sont rendus en fragment, enfants directs de l'élément de l'app — les deux
   * bascules de Servum vivent dans la MÊME rangée flex que le bouton Re-scan.
   * À combiner avec `renderRoot={false}` et `renderPanel={false}`.
   *
   * Sans conteneur il n'y a plus de `tablist` : le rôle des onglets n'est plus
   * déduit de `listRole` (un `tab` orphelin serait invalide) et retombe sur
   * `aria-current` à l'actif — sauf `tabRole` explicite (`'button'` →
   * `aria-pressed`). `labels.tablist` et le `testId` de barre sont sans objet.
   */
  renderList?: boolean;
  /**
   * Attribut `type` des boutons d'onglet. Défaut : AUCUN attribut — c'est ce
   * que le composant a toujours rendu. Les barres écrites à la main dans les
   * apps posent, elles, `type="button"` ; sans ce réglage, adopter le
   * composant DANS un `<form>` transformerait un changement d'onglet en envoi
   * du formulaire (`type` vaut `submit` par défaut en HTML).
   */
  tabType?: 'button' | 'submit' | 'reset';
  /**
   * Rôle ARIA de la barre. Défaut : `'tablist'` (historique). `'radiogroup'`
   * pour un choix exclusif qui n'ouvre pas de panneau (une qualité de rendu,
   * un niveau de zoom…). `null` : aucun attribut `role`.
   */
  listRole?: TabsListRole | null;
  /**
   * Rôle ARIA de chaque onglet. Déduit de `listRole` quand il n'est pas
   * fourni (`tablist`→`tab`, `radiogroup`→`radio`, `group`→aucun). L'attribut
   * de sélection suit le rôle : `aria-selected`, `aria-checked`,
   * `aria-pressed`, ou `aria-current` sur l'actif quand il n'y a pas de rôle.
   */
  tabRole?: TabsTabRole | null;
  /** Posé en `data-testid` sur la racine ; la barre et le panneau reçoivent
   *  alors `<testId>-list` et `<testId>-panel`. Les onglets, eux, portent
   *  leur propre `Tab.testId` — les apps ont des noms non dérivables.
   *  Sans racine (`renderRoot={false}`), c'est la barre qui porte `testId`. */
  testId?: string;
  labels?: TabsLabels;
}

export function Tabs({
  tabs,
  defaultTab,
  activeTab,
  onChange,
  variant = 'default',
  renderPanel = true,
  renderRoot = true,
  className = '',
  listClassName = '',
  tabClassName = '',
  activeClassName = '',
  inactiveClassName = '',
  panelClassName = '',
  iconClassName = '',
  labelClassName = '',
  wrapContent = true,
  renderList = true,
  tabType,
  listRole = 'tablist',
  tabRole,
  testId,
  labels,
}: TabsProps) {
  // `activeTab` fourni = l'app tient la vérité. On garde quand même le
  // `useState` monté (les Hooks ne se conditionnent pas) ; il n'est simplement
  // plus lu ni écrit.
  const isControlled = activeTab !== undefined;
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.id);
  const currentTab = isControlled ? activeTab : internalTab;

  const t = { ...labels };

  const handleTabClick = (tabId: string) => {
    if (!isControlled) setInternalTab(tabId);
    onChange?.(tabId);
  };

  const activeContent = tabs.find(tab => tab.id === currentTab)?.content;

  // ── Classes ───────────────────────────────────────────────────────────────
  // Les chaînes de classes gardent la forme historique au caractère près quand
  // les nouvelles props sont à leur défaut : chaque modificateur ajouté porte
  // son propre espace de tête, donc il n'insère rien quand il est absent. En
  // `bare`, il ne reste que ce que l'app fournit — et quand elle ne fournit
  // rien, l'attribut `class` n'est pas écrit du tout.
  const bare = variant === 'bare';

  // `plain` produit `tabs tabs--plain` : aucune règle de la feuille ne vise
  // ce modificateur, donc seules les règles de BASE s'appliquent.
  const rootClass = bare
    ? className
    : `tabs tabs--${variant}${renderPanel ? '' : ' tabs--no-panel'}${className ? ` ${className}` : ''}`;

  // Sans racine, la barre en tient lieu : `className` la rejoint, devant
  // `listClassName` (l'ordre d'écriture ne change rien en CSS, il rend juste
  // le DOM lisible : classe de l'app d'abord).
  const listOwn = renderRoot
    ? listClassName
    : [className, listClassName].filter(Boolean).join(' ');
  const listClass = bare ? listOwn : `tabs__list${listOwn ? ` ${listOwn}` : ''}`;

  const tabClassFor = (isActive: boolean, own?: string) => {
    const extra = `${tabClassName ? ` ${tabClassName}` : ''}${
      isActive && activeClassName ? ` ${activeClassName}` : ''
    }${!isActive && inactiveClassName ? ` ${inactiveClassName}` : ''}${own ? ` ${own}` : ''}`;
    if (bare) return extra.slice(1);
    return `tabs__tab ${isActive ? 'tabs__tab--active' : ''}${extra}`;
  };

  const panelClass = bare
    ? panelClassName
    : `tabs__content${panelClassName ? ` ${panelClassName}` : ''}`;

  // ── Rôles ARIA ────────────────────────────────────────────────────────────
  // Sans conteneur, pas de `tablist`/`radiogroup` pour porter la paire : le
  // rôle n'est plus déduit (cf. `renderList`).
  const effectiveListRole = renderList ? listRole : null;
  const resolvedTabRole: TabsTabRole | null =
    tabRole !== undefined
      ? tabRole
      : effectiveListRole !== null
        ? TAB_ROLE_FOR_LIST[effectiveListRole]
        : null;
  // Un `tabpanel` n'a de sens qu'en face d'un `tablist` : hors de ce régime le
  // panneau redevient une simple boîte.
  const panelRole = effectiveListRole === 'tablist' ? 'tabpanel' : null;

  // Sans racine, c'est la barre qui porte l'identifiant de test : elle EST la
  // racine. Le suffixe `-list` n'existe que lorsqu'il y a les deux éléments à
  // distinguer.
  const listTestId = testId === undefined ? undefined : renderRoot ? `${testId}-list` : testId;

  /** Classe d'une enveloppe : celle du paquet (sauf en `bare`) puis celle de
   *  l'app ; vide ⇒ pas d'attribut `class`, comme hier en `bare`. */
  const partClass = (own: string, app: string) => {
    const value = bare ? app : app ? `${own} ${app}` : own;
    return value ? { className: value } : null;
  };

  const buttons = tabs.map(tab => {
    const isActive = currentTab === tab.id;
    const buttonClass = tabClassFor(isActive, tab.className);
    const hasTrailing = tab.trailing !== undefined && tab.trailing !== null;
    return (
      <button
        key={tab.id}
        {...(tabType !== undefined ? { type: tabType } : null)}
        {...(buttonClass ? { className: buttonClass } : null)}
        {...(tab.style !== undefined ? { style: tab.style } : null)}
        onClick={() => handleTabClick(tab.id)}
        {...(resolvedTabRole !== null ? { role: resolvedTabRole } : null)}
        {...selectionAttribute(resolvedTabRole, isActive)}
        {...(tab.testId !== undefined ? { 'data-testid': tab.testId } : null)}
      >
        {wrapContent ? (
          <>
            {tab.icon && <span {...partClass('tabs__tab-icon', iconClassName)}>{tab.icon}</span>}
            <span {...partClass('tabs__tab-label', labelClassName)}>{tab.label}</span>
            {hasTrailing && <span {...partClass('tabs__tab-trailing', '')}>{tab.trailing}</span>}
          </>
        ) : (
          <>
            {tab.icon}
            {tab.label}
            {hasTrailing && tab.trailing}
          </>
        )}
      </button>
    );
  });

  const list = renderList ? (
    <div
      {...(listClass ? { className: listClass } : null)}
      {...(listRole !== null ? { role: listRole } : null)}
      {...(t.tablist !== undefined ? { 'aria-label': t.tablist } : null)}
      {...(listTestId !== undefined ? { 'data-testid': listTestId } : null)}
    >
      {buttons}
    </div>
  ) : (
    <>{buttons}</>
  );

  const panel = renderPanel ? (
    <div
      {...(panelClass ? { className: panelClass } : null)}
      {...(panelRole !== null ? { role: panelRole } : null)}
      {...(testId !== undefined ? { 'data-testid': `${testId}-panel` } : null)}
    >
      {activeContent}
    </div>
  ) : null;

  // Pas de racine : la barre (et le panneau, s'il est demandé) remontent tels
  // quels dans le flux du parent — aucune boîte intermédiaire pour hériter
  // d'un fond ou décaler une mise en page.
  if (!renderRoot) {
    return (
      <>
        {list}
        {panel}
      </>
    );
  }

  return (
    <div
      {...(rootClass ? { className: rootClass } : null)}
      {...(testId !== undefined ? { 'data-testid': testId } : null)}
    >
      {list}
      {panel}
    </div>
  );
}

export default Tabs;
