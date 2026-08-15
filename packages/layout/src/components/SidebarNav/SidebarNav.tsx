import { useState, useEffect, useRef, ComponentType, ReactNode } from 'react';
import {
  ChevronDown,
  Plus,
  CheckCircle,
  LogOut,
  Menu,
  MessageSquarePlus,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  X
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string | null;
}

/** Icône de nav : signature structurelle (size/className) plutôt que
 *  LucideIcon — découple la VERSION de lucide-react du package de celle de
 *  l'app consommatrice (leurs types de ref divergent entre versions). */
type NavIcon = ComponentType<{ size?: number | string; className?: string }>;

interface NavItem {
  path: string;
  label: string;
  icon: NavIcon;
}

/** Rangée compte canonique (spec Webum) : nom 12/600 + email 11/400 à gauche,
 *  bouton déconnexion (icône 16, padding 6, radius 6) à droite ; replié →
 *  bouton seul, centré. Rendue tout en bas du footer. */
export interface SidebarAccount {
  name?: ReactNode;
  email?: ReactNode;
  onLogout?: () => void;
  /** title/aria-label du bouton déconnexion (défaut : « Déconnexion »). */
  logoutTitle?: string;
}

/** Tiroir mobile canonique (spec Webum, ≤768px) : topbar sticky hamburger +
 *  wordmark, backdrop plein écran, sidebar en overlay `min(82vw, 300px)`. */
export interface SidebarMobile {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Wordmark de la topbar mobile (défaut : `logo`). */
  logo?: ReactNode;
  /** aria-label du burger quand le tiroir est fermé (défaut : « Ouvrir »). */
  openLabel?: string;
  /** aria-label du burger/bouton X quand il est ouvert (défaut : « Fermer »). */
  closeLabel?: string;
}

interface SidebarNavProps {
  // ── Workspaces (optionnel — l'en-tête n'apparaît que si fournis) ──
  workspaces?: Workspace[];
  currentWorkspace?: Workspace | null;
  onSwitchWorkspace?: (workspace: Workspace) => void;
  onCreateWorkspace?: () => void;
  /** Liens de navigation principaux (mode déclaratif). Pour une nav
   *  conditionnelle/complexe (Webum : nav par site, sous-pages d'éditeur…),
   *  passer `children` à la place — rendus dans `.sidebar-nav__content`. */
  mainNavItems?: NavItem[];
  /** Nav maison de l'app, rendue entre la marque et le footer (alternative ou
   *  complément de `mainNavItems`). Utiliser les classes canoniques
   *  `.sidebar-nav__link` / `__icon` / `__label` pour la parité pixel. */
  children?: ReactNode;
  /** Liens rendus DANS le footer, au-dessus des toggles thème/langue
   *  (spec sidebar Umbelium : « Paramètres » vit ici). */
  bottomNavItems?: NavItem[];
  onLogout?: () => void;
  onClose?: () => void;
  isActive?: (path: string) => boolean;
  renderLink?: (item: NavItem, isActive: boolean, onClick?: () => void) => ReactNode;
  onRequestFeature?: () => void;
  /** Wordmark de l'app en HAUT de la sidebar (spec : 18px/700, couleur accent ;
   *  la bordure basse vit sur la rangée .sidebar-nav__brand, comme Webum) —
   *  ex. <NavLink to="/app">Socialum</NavLink>. */
  logo?: ReactNode;
  // ── Repli desktop (spec Webum) ──
  /** Affiche le bouton PanelLeftClose/Open dans la rangée de marque. */
  collapsible?: boolean;
  /** État replié CONTRÔLÉ par l'app (56px de colonne côté shell). */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** titles du bouton de repli (défauts : « Fermer » / « Ouvrir »). */
  collapseTitles?: { collapse?: string; expand?: string };
  // ── Tiroir mobile (spec Webum) ──
  mobile?: SidebarMobile;
  // Theme and language settings
  /** Thème affiché par le segmented Sun/Moon. La valeur `'system'` est
   *  DÉPRÉCIÉE (spec 2026-08-12) : elle est résolue en light/dark via
   *  `prefers-color-scheme` pour l'affichage — l'app doit migrer son état
   *  stocké vers le thème résolu au chargement. */
  theme?: 'dark' | 'light' | 'system';
  /** @deprecated Bascule binaire héritée — préférer `onSetTheme`. */
  onToggleTheme?: () => void;
  /** Sélection directe du thème (segmented Sun/Moon 13, spec Umbelium) —
   *  DEUX états seulement, l'option « système » n'existe plus. */
  onSetTheme?: (theme: 'light' | 'dark') => void;
  language?: 'fr' | 'en';
  onToggleLanguage?: () => void;
  /** Carte d'upgrade d'essai (TrialSidebarCta de @umbeli-com/billing), rendue
   *  sous les toggles thème/langue. Son CTA mène à la page Facturation de
   *  l'app (choix Mensuel/Annuel) — jamais directement sur Stripe. */
  upgradeSlot?: ReactNode;
  /** Bloc compte sur-mesure. Préférer `account` (rangée canonique) — quand
   *  l'un des deux est fourni, le bouton logout intégré s'efface. */
  accountSlot?: ReactNode;
  /** Rangée compte canonique (nom/email + déconnexion, spec Webum). */
  account?: SidebarAccount;
  /** id de l'élément racine (ex. Webum : `app-sidebar`, ciblé par
   *  aria-controls du burger). */
  id?: string;
  className?: string;
  translations?: {
    workspaces?: string;
    newWorkspace?: string;
    requestFeature?: string;
    loading?: string;
    connected?: string;
    error?: string;
    logout?: string;
    /** titles des toggles repliés thème/langue. */
    theme?: string;
    language?: string;
    lightMode?: string;
    darkMode?: string;
  };
}

const defaultTranslations = {
  workspaces: 'Workspaces',
  newWorkspace: 'Nouveau workspace',
  requestFeature: 'Suggestion',
  loading: 'Chargement...',
  connected: 'Connecté',
  error: 'Erreur',
  logout: 'Déconnexion',
  theme: 'Thème',
  language: 'Langue',
  lightMode: 'Mode clair',
  darkMode: 'Mode sombre',
};

const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return 'W';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

export function SidebarNav({
  workspaces = [],
  currentWorkspace = null,
  onSwitchWorkspace,
  onCreateWorkspace,
  mainNavItems = [],
  children,
  bottomNavItems = [],
  onLogout,
  onClose,
  isActive,
  renderLink,
  onRequestFeature,
  logo,
  collapsible = false,
  collapsed = false,
  onCollapsedChange,
  collapseTitles,
  mobile,
  theme,
  onToggleTheme,
  onSetTheme,
  language,
  onToggleLanguage,
  upgradeSlot,
  accountSlot,
  account,
  id,
  className,
  translations = {},
}: SidebarNavProps) {
  const t = { ...defaultTranslations, ...translations };
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setShowWorkspaceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchWorkspace = async (workspace: Workspace) => {
    if (workspace.id === currentWorkspace?.id) {
      setShowWorkspaceMenu(false);
      return;
    }
    setSwitchingWorkspace(true);
    try {
      await onSwitchWorkspace?.(workspace);
      setShowWorkspaceMenu(false);
    } finally {
      setSwitchingWorkspace(false);
    }
  };

  const showWorkspaceHeader = workspaces.length > 0 && currentWorkspace != null;

  // Toggle thème à DEUX états (spec 2026-08-12) : la valeur héritée 'system'
  // est résolue vers le thème effectif de l'OS pour l'affichage. Les apps
  // migrent leur état stocké 'system' au chargement — ceci n'est qu'un filet.
  const resolvedTheme: 'light' | 'dark' | undefined =
    theme === 'system'
      ? (typeof window !== 'undefined' &&
         window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light')
      : theme;

  const selectTheme = (next: 'light' | 'dark') => {
    if (onSetTheme) {
      onSetTheme(next);
      return;
    }
    if (resolvedTheme !== next) onToggleTheme?.();
  };

  const hasSettings = Boolean(onSetTheme || onToggleTheme || onToggleLanguage);
  const canRenderItems = Boolean(renderLink && isActive);
  const rootClasses = [
    'sidebar-nav',
    collapsed ? 'sidebar-nav--collapsed' : '',
    mobile?.open ? 'sidebar-nav--mobile-open' : '',
    className || '',
  ].filter(Boolean).join(' ');

  const accountRow = accountSlot ?? (account ? (
    <div className={`sidebar-nav__account ${collapsed ? 'sidebar-nav__account--collapsed' : ''}`}>
      {!collapsed && (
        <div className="sidebar-account-id">
          {account.name != null && <span className="sidebar-account-name">{account.name}</span>}
          {account.email != null && <span className="sidebar-account-email">{account.email}</span>}
        </div>
      )}
      {account.onLogout && (
        <button
          type="button"
          className="sidebar-account-logout"
          onClick={account.onLogout}
          title={account.logoutTitle ?? t.logout}
          aria-label={account.logoutTitle ?? t.logout}
        >
          <LogOut size={16} />
        </button>
      )}
    </div>
  ) : null);

  return (
    <>
      {/* ── Topbar mobile (≤768px) : hamburger + wordmark, sticky (spec Webum). ── */}
      {mobile && (
        <div className="sidebar-nav-topbar">
          <button
            type="button"
            className="sidebar-nav-topbar__burger"
            aria-label={mobile.open ? (mobile.closeLabel ?? 'Fermer') : (mobile.openLabel ?? 'Ouvrir')}
            aria-expanded={mobile.open}
            aria-controls={id}
            onClick={() => {
              // Ouvrir le tiroir déplie toujours la sidebar (parité Webum).
              if (!mobile.open && collapsed) onCollapsedChange?.(false);
              mobile.onOpenChange(!mobile.open);
            }}
          >
            {mobile.open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="sidebar-nav-topbar__logo">{mobile.logo ?? logo}</div>
        </div>
      )}

      {/* Backdrop du tiroir mobile — clic = fermeture. */}
      {mobile?.open && (
        <div className="sidebar-nav-backdrop" onClick={() => mobile.onOpenChange(false)} />
      )}

      <aside id={id} className={rootClasses}>
        {/* Rangée de marque — structure Webum (Layout.tsx) : le conteneur porte
            la bordure basse (padding-bottom 20 + marge 12) ; le wordmark reste
            une simple ligne 18px/700 accent ; le bouton de repli vit à droite
            (replié → seul, centré). */}
        {(logo || collapsible || mobile) && (
          <div className={`sidebar-nav__brand ${collapsed ? 'sidebar-nav__brand--collapsed' : ''}`}>
            {!collapsed && logo && <div className="sidebar-nav__wordmark">{logo}</div>}
            {collapsible && (
              <button
                type="button"
                className="sidebar-nav__collapse"
                onClick={() => onCollapsedChange?.(!collapsed)}
                title={collapsed ? (collapseTitles?.expand ?? 'Ouvrir') : (collapseTitles?.collapse ?? 'Fermer')}
              >
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
            )}
            {/* Fermeture du tiroir mobile (cachée sur desktop via CSS). */}
            {mobile && (
              <button
                type="button"
                className="sidebar-nav__drawer-close"
                onClick={() => mobile.onOpenChange(false)}
                aria-label={mobile.closeLabel ?? 'Fermer'}
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {showWorkspaceHeader && (
          <div className="sidebar-nav__header">
            <div className="sidebar-nav__workspace" ref={workspaceMenuRef}>
              <button
                className="sidebar-nav__workspace-btn"
                onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                disabled={switchingWorkspace}
              >
                <span className="sidebar-nav__workspace-icon">
                  {currentWorkspace?.logo_url ? (
                    <img src={currentWorkspace.logo_url} alt={currentWorkspace.name} className="sidebar-nav__workspace-logo" />
                  ) : (
                    getInitials(currentWorkspace?.name || 'W')
                  )}
                </span>
                <span className="sidebar-nav__workspace-name">
                  {switchingWorkspace ? t.loading : (currentWorkspace?.name || 'Workspace')}
                </span>
                <ChevronDown
                  size={14}
                  className={`sidebar-nav__workspace-chevron ${showWorkspaceMenu ? 'is-open' : ''}`}
                />
              </button>

              {showWorkspaceMenu && (
                <div className="sidebar-nav__workspace-menu">
                  <div className="sidebar-nav__workspace-menu-header">
                    {t.workspaces}
                  </div>
                  <ul className="sidebar-nav__workspace-list">
                    {workspaces.map((workspace) => (
                      <li key={workspace.id}>
                        <button
                          className={`sidebar-nav__workspace-item ${workspace.id === currentWorkspace?.id ? 'is-active' : ''}`}
                          onClick={() => handleSwitchWorkspace(workspace)}
                        >
                          <span className="sidebar-nav__workspace-item-icon">
                            {workspace.logo_url ? (
                              <img src={workspace.logo_url} alt={workspace.name} className="sidebar-nav__workspace-logo" />
                            ) : (
                              getInitials(workspace.name)
                            )}
                          </span>
                          <span className="sidebar-nav__workspace-item-name">
                            {workspace.name}
                          </span>
                          {workspace.id === currentWorkspace?.id && (
                            <CheckCircle size={16} color="#16A34A" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {onCreateWorkspace && (
                    <div className="sidebar-nav__workspace-menu-footer">
                      <button
                        className="sidebar-nav__workspace-add"
                        onClick={() => {
                          setShowWorkspaceMenu(false);
                          onCreateWorkspace();
                        }}
                      >
                        <Plus size={16} />
                        <span>{t.newWorkspace}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="sidebar-nav__content">
          {children}
          {canRenderItems && mainNavItems.length > 0 && (
            <ul className="sidebar-nav__list">
              {mainNavItems.map((item) => (
                <li key={item.path} className="sidebar-nav__item">
                  {renderLink!(item, isActive!(item.path), onClose)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Footer — ordre EXACT de la spec sidebar Umbelium :
            1. liens bas (« Paramètres », au-dessus des toggles)
            2. toggles thème + langue (une rangée ; repliés → pile d'icônes)
            3. carte upgrade d'essai (upgradeSlot)
            4. rangée compte + déconnexion (account / accountSlot) ── */}
        <div className="sidebar-nav__footer">
          {(onRequestFeature || (canRenderItems && bottomNavItems.length > 0) || (onLogout && !accountSlot && !account)) && (
            <ul className="sidebar-nav__list">
              {onRequestFeature && (
                <li className="sidebar-nav__item">
                  <button
                    className="sidebar-nav__link sidebar-nav__request-feature"
                    onClick={onRequestFeature}
                  >
                    <span className="sidebar-nav__icon">
                      <MessageSquarePlus size={18} />
                    </span>
                    <span className="sidebar-nav__label">{t.requestFeature}</span>
                  </button>
                </li>
              )}
              {canRenderItems && bottomNavItems.map((item) => (
                <li key={item.path} className="sidebar-nav__item">
                  {renderLink!(item, isActive!(item.path), onClose)}
                </li>
              ))}
              {onLogout && !accountSlot && !account && (
                <li className="sidebar-nav__item">
                  <button
                    className="sidebar-nav__link sidebar-nav__logout"
                    onClick={onLogout}
                  >
                    <span className="sidebar-nav__icon">
                      <LogOut size={18} />
                    </span>
                    <span className="sidebar-nav__label">{t.logout}</span>
                  </button>
                </li>
              )}
            </ul>
          )}

          {/* Toggles thème + langue — une rangée (segmented, spec Umbelium).
              Thème : DEUX états Sun/Moon 13 — l'option « système » est retirée.
              Repliés → deux boutons-icônes empilés (bascule directe). */}
          {hasSettings && !collapsed && (
            <div className="sidebar-nav__settings">
              {(onSetTheme || onToggleTheme) && (
                <div className="sidebar-nav__switch sidebar-nav__switch--theme">
                  <button
                    className={`sidebar-nav__switch-tab ${resolvedTheme === 'light' ? 'is-active' : ''}`}
                    onClick={() => selectTheme('light')}
                    title={t.lightMode}
                  >
                    <Sun size={13} />
                  </button>
                  <button
                    className={`sidebar-nav__switch-tab ${resolvedTheme === 'dark' ? 'is-active' : ''}`}
                    onClick={() => selectTheme('dark')}
                    title={t.darkMode}
                  >
                    <Moon size={13} />
                  </button>
                </div>
              )}
              {onToggleLanguage && (
                <div className="sidebar-nav__switch sidebar-nav__switch--lang">
                  <button
                    className={`sidebar-nav__switch-tab ${language === 'fr' ? 'is-active' : ''}`}
                    onClick={() => language !== 'fr' && onToggleLanguage()}
                    title="Français"
                  >
                    FR
                  </button>
                  <button
                    className={`sidebar-nav__switch-tab ${language === 'en' ? 'is-active' : ''}`}
                    onClick={() => language !== 'en' && onToggleLanguage()}
                    title="English"
                  >
                    EN
                  </button>
                </div>
              )}
            </div>
          )}
          {hasSettings && collapsed && (
            <div className="sidebar-nav__settings sidebar-nav__settings--collapsed">
              {(onSetTheme || onToggleTheme) && (
                <button
                  className="sidebar-nav__settings-icon"
                  onClick={() => selectTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  title={t.theme}
                >
                  {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              )}
              {onToggleLanguage && (
                <button
                  className="sidebar-nav__settings-icon sidebar-nav__settings-icon--lang"
                  onClick={() => onToggleLanguage()}
                  title={t.language}
                >
                  {language === 'fr' ? 'EN' : 'FR'}
                </button>
              )}
            </div>
          )}

          {/* Carte upgrade d'essai — sous les toggles, au-dessus du compte. */}
          {upgradeSlot}

          {/* Rangée compte + déconnexion — tout en bas du footer. */}
          {accountRow}
        </div>
      </aside>
    </>
  );
}

export default SidebarNav;
