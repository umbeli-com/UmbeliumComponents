import { CSSProperties, ReactNode, useState } from 'react';

/** Moteur de mise en page de la coquille.
 *  - `'flex'` (défaut, historique) : sidebar `position: fixed` + `margin-left`
 *    sur la colonne de contenu ;
 *  - `'grid'` : `grid-template-columns: <rail> minmax(0, 1fr)` — le moteur de
 *    Webum (`.app-shell`) et de Profilum (`AppLayout.jsx`), rail replié compris.
 */
export type AppShellLayout = 'flex' | 'grid';

/** Argument passé à `topbar` quand c'est une fonction. `onMenuClick` existait
 *  déjà ; les trois autres champs sont ADDITIFS (une fonction qui ne déstructure
 *  que `onMenuClick` reste assignable). */
export interface AppShellTopbarRenderProps {
  /** Bascule le tiroir mobile (état interne, ou `onOpenChange` si contrôlé). */
  onMenuClick: () => void;
  /** État courant du tiroir mobile. */
  open: boolean;
  /** État courant du rail desktop replié. */
  collapsed: boolean;
  /** Bascule le rail desktop — appelle `onCollapsedChange`. */
  onCollapseClick: () => void;
}

export interface AppShellProps {
  children: ReactNode;
  sidebar: ReactNode;
  /** OPTIONNELLE (depuis 1.3) : sans elle, AUCUN `<header>` n'est rendu — une
   *  app sans barre supérieure (Servum) n'hérite plus d'une bande en haut de
   *  toutes ses pages. */
  topbar?: ReactNode | ((props: AppShellTopbarRenderProps) => ReactNode);
  chatPanel?: ReactNode;
  isChatOpen?: boolean;

  // ── Moteur de mise en page ────────────────────────────────────────────────
  /** `'flex'` par défaut (rendu historique, inchangé). */
  layout?: AppShellLayout;
  /** Largeur du rail déployé (défaut : 240px). Nombre = px. */
  sidebarWidth?: number | string;
  /** Largeur du rail replié (défaut : 56px). Nombre = px. */
  collapsedWidth?: number | string;

  // ── Mode contrôlé — MÊME CONTRAT que SidebarNav ───────────────────────────
  /** Rail desktop replié. CONTRÔLÉ par l'app (comme `SidebarNav.collapsed`) :
   *  la coquille n'en tient aucun état. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Tiroir mobile. Fourni ⇒ la coquille est CONTRÔLÉE (comme
   *  `SidebarNav.mobile.open`) ; absent ⇒ état interne, comportement
   *  historique. */
  open?: boolean;
  /** Notifié dans les deux modes (contrôlé et interne). */
  onOpenChange?: (open: boolean) => void;

  // ── Chrome ────────────────────────────────────────────────────────────────
  /** `false` ⇒ pas de voile : SidebarNav (prop `mobile`) fournit déjà le sien
   *  (`.sidebar-nav-backdrop`). Défaut `true`. */
  renderOverlay?: boolean;
  /** `false` ⇒ `sidebar` est rendu SANS l'`<aside class="app-shell__sidebar">`,
   *  donc en enfant direct de la racine. Indispensable avec SidebarNav en
   *  mode `mobile` : sa topbar et son backdrop sont des FRÈRES de son `<aside>`
   *  et se retrouveraient sinon enfermés dans un conteneur `position: fixed`
   *  translaté hors écran. Défaut `true`. */
  renderSidebarWrapper?: boolean;

  // ── Contenu : ne rien imposer ─────────────────────────────────────────────
  /** `false` ⇒ padding 0 ; nombre ⇒ px ; chaîne ⇒ valeur CSS telle quelle.
   *  Absente — ou `true`, qui est l'écriture explicite du défaut — ⇒ padding du
   *  paquet (1.5rem, 2rem ≥1024px) : aucun style en ligne n'est écrit. */
  contentPadding?: boolean | number | string;
  /** Nombre ⇒ px ; chaîne ⇒ valeur CSS (`'none'` pour libérer la largeur).
   *  Absente ⇒ max-width du paquet (1400px). */
  contentMaxWidth?: number | string;
  /** `true` ⇒ le paquet abandonne TOUT le chrome du contenu : `padding`,
   *  `max-width`, `width` et le centrage `margin: 0 auto` disparaissent, il ne
   *  garde que le comportement de BOÎTE (`flex: 1`, occuper la colonne) via
   *  `umb-app-shell__content--bare`. L'app reprend l'apparence par
   *  `contentClassName`. C'est le seul recours quand le padding de l'app est
   *  CONDITIONNEL et qu'aucune valeur unique ne peut l'exprimer — Webum change
   *  le sien selon `:has(.editor-split)` et `body.has-publish-bar`.
   *  La classe historique `app-shell__content` reste émise : les locators
   *  Playwright de Dialum et d'UmbeliumManager la ciblent. */
  contentUnstyled?: boolean;
  /** Classes de l'app sur la racine (ex. Webum : `app-shell--mobile-nav-open`). */
  className?: string;
  /** Classes de l'app sur le `<main>` (ex. Webum : `main-content`). */
  contentClassName?: string;

  // ── Colonne de contenu : le nœud ENTRE la racine et le `<main>` ───────────
  /** Classes de l'app sur `div.app-shell__main` — l'ITEM de grille (ou de
   *  flex) qui porte topbar et `<main>`. Ni `className` (racine) ni
   *  `contentClassName` (`<main>`) ne l'atteignaient. Refus mesuré, Profilum,
   *  les deux fronts : ils n'importent que `sidebar.css`, donc le
   *  `min-width: 0` de `.umb-app-shell--grid > .umb-app-shell__main` ne s'y
   *  applique pas et un contenu large pousse la colonne `1fr` ; et
   *  `frontend/src/styles/base/_layout.scss:23-28,104` accroche à CE nœud
   *  `min-width: 0`, `display: flex`, `min-height: 100vh` et, par
   *  `.app-main > *`, son animation d'entrée. `mainClassName="app-main"` les
   *  rebranche tels quels : l'enfant reste le `<main>` (précédé de la topbar
   *  si elle est fournie), comme dans `frontend/src/layouts/AppLayout.jsx`.
   *
   *  Retirer le nœud (`renderMainWrapper={false}`) n'aurait pas suffi : topbar
   *  et `<main>` deviendraient deux items de grille, et il faudrait des lignes
   *  explicites que ni Profilum ni la feuille ne posent.
   *
   *  Avec la feuille COMPLÈTE, `.umb-app-shell__main` reste stylée : en mode
   *  grille, `.umb-app-shell--grid > .umb-app-shell__main` (0,2,0) remet
   *  `min-height` à 0 et bat une règle d'app à une classe — `mainStyle` passe
   *  devant. */
  mainClassName?: string;
  /** Transmis à `div.app-shell__main` (ex. `{ minWidth: 0 }`). Absent : aucun
   *  attribut `style` n'est écrit, comme avant. */
  mainStyle?: CSSProperties;
}

/** Nombre → px ; chaîne → valeur CSS telle quelle. */
const toCssSize = (value: number | string): string =>
  typeof value === 'number' ? `${value}px` : value;

/**
 * Chaque élément porte DEUX classes : l'historique (`app-shell__x`) et la
 * préfixée (`umb-app-shell__x`). Seule la seconde est stylée par la feuille du
 * paquet ; la première reste émise pour que rien ne bouge chez les apps déjà
 * en place — surcharges locales de Socialum (`_app-shell.scss`) et locators
 * Playwright de Dialum / UmbeliumManager. Voir AppShell.scss pour le détail.
 *
 * Les modificateurs AJOUTÉS (`--grid`, `--collapsed`) suivent la même règle et
 * sortent eux aussi en double. Bonus mesuré : Webum et Profilum possèdent déjà
 * un `.app-shell--collapsed { grid-template-columns: 56px 1fr }` maison — la
 * classe historique le rebranche sans qu'ils aient une ligne de CSS à écrire.
 * Ces modificateurs ne sont émis QUE si la prop correspondante est passée :
 * une app qui n'en passe aucune obtient le markup d'avant, à la classe près.
 */
export function AppShell({
  children,
  sidebar,
  topbar,
  chatPanel,
  isChatOpen = false,
  layout = 'flex',
  sidebarWidth,
  collapsedWidth,
  collapsed = false,
  onCollapsedChange,
  open,
  onOpenChange,
  renderOverlay = true,
  renderSidebarWrapper = true,
  contentPadding,
  contentMaxWidth,
  contentUnstyled = false,
  className,
  contentClassName,
  mainClassName,
  mainStyle,
}: AppShellProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Contrôlé dès que `open` est fourni ; sinon état interne — exactement le
  // comportement d'avant pour Dialum / Socialum / Manager / Scrapium.
  const isControlled = open !== undefined;
  const sidebarOpen = isControlled ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const toggleSidebar = () => setOpen(!sidebarOpen);
  const closeSidebar = () => setOpen(false);

  const isGrid = layout === 'grid';

  // Métriques du rail : posées en variables CSS sur la racine. Non fournies,
  // les `var(..., 240px)` / `var(..., 56px)` de la feuille retombent sur les
  // valeurs historiques.
  const rootStyle: CSSProperties = {};
  if (sidebarWidth !== undefined) {
    (rootStyle as Record<string, string>)['--umb-app-shell-sidebar-width'] = toCssSize(sidebarWidth);
  }
  if (collapsedWidth !== undefined) {
    (rootStyle as Record<string, string>)['--umb-app-shell-collapsed-width'] = toCssSize(collapsedWidth);
  }

  // Contenu : on n'écrit un style en ligne que si l'app a demandé autre chose
  // que le défaut du paquet (le style en ligne bat aussi les media queries de
  // la feuille, y compris le padding 2rem ≥1024px).
  const contentStyle: CSSProperties = {};
  if (contentPadding !== undefined && contentPadding !== true) {
    contentStyle.padding = contentPadding === false ? 0 : toCssSize(contentPadding);
  }
  if (contentMaxWidth !== undefined) {
    contentStyle.maxWidth = toCssSize(contentMaxWidth);
  }

  // Concaténations volontairement identiques aux anciennes (espace de fin
  // compris) : sans prop nouvelle, la chaîne de classes est au caractère près
  // celle d'avant.
  const rootClass =
    `app-shell umb-app-shell ${isChatOpen ? 'chat-open' : ''}` +
    (isGrid ? ' app-shell--grid umb-app-shell--grid' : '') +
    (collapsed ? ' app-shell--collapsed umb-app-shell--collapsed' : '') +
    (className ? ` ${className}` : '');

  const sidebarNode = renderSidebarWrapper ? (
    <aside className={`app-shell__sidebar umb-app-shell__sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      {sidebar}
    </aside>
  ) : (
    sidebar
  );

  return (
    <div className={rootClass} style={Object.keys(rootStyle).length ? rootStyle : undefined}>
      {sidebarNode}

      {renderOverlay && (
        <div
          className={`app-shell__overlay umb-app-shell__overlay ${sidebarOpen ? 'is-visible' : ''}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sans `mainClassName` ni `mainStyle` : même chaîne de classes qu'hier,
          et `style={undefined}` n'écrit aucun attribut. */}
      <div
        className={'app-shell__main umb-app-shell__main' + (mainClassName ? ` ${mainClassName}` : '')}
        style={mainStyle}
      >
        {topbar != null && (
          <header className="app-shell__topbar umb-app-shell__topbar">
            {typeof topbar === 'function'
              ? topbar({
                  onMenuClick: toggleSidebar,
                  open: sidebarOpen,
                  collapsed,
                  onCollapseClick: () => onCollapsedChange?.(!collapsed),
                })
              : topbar
            }
          </header>
        )}

        <main
          className={
            (contentUnstyled
              ? 'app-shell__content umb-app-shell__content--bare'
              : 'app-shell__content umb-app-shell__content') +
            (contentClassName ? ` ${contentClassName}` : '')
          }
          style={Object.keys(contentStyle).length ? contentStyle : undefined}
        >
          {children}
        </main>
      </div>

      {chatPanel}
    </div>
  );
}

export default AppShell;
