import { useState, useEffect, useRef, ReactNode } from 'react';
import {
  ChevronDown,
  Plus,
  CheckCircle,
  LogOut,
  LucideIcon,
  MessageSquarePlus,
  Moon,
  Sun
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string | null;
}

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarNavProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSwitchWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace?: () => void;
  mainNavItems: NavItem[];
  /** Liens rendus DANS le footer, au-dessus des toggles thème/langue
   *  (spec sidebar Umbelium : « Paramètres » vit ici). */
  bottomNavItems?: NavItem[];
  onLogout?: () => void;
  onClose?: () => void;
  isActive: (path: string) => boolean;
  renderLink: (item: NavItem, isActive: boolean, onClick?: () => void) => ReactNode;
  onRequestFeature?: () => void;
  /** Wordmark de l'app en HAUT de la sidebar (spec : 18px/700, couleur accent,
   *  bordure basse) — ex. <NavLink to="/app">Socialum</NavLink>. */
  logo?: ReactNode;
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
  /** Carte d'upgrade d'essai (style Anonymum), rendue sous les toggles
   *  thème/langue. Son CTA mène à la page Facturation de l'app (choix
   *  Mensuel/Annuel) — jamais directement sur Stripe. */
  upgradeSlot?: ReactNode;
  /** Bloc compte (chip identité + déconnexion, style Anonymum), rendu en bas du footer.
   *  Quand il est fourni, le bouton logout intégré s'efface. */
  accountSlot?: ReactNode;
  translations?: {
    workspaces?: string;
    newWorkspace?: string;
    requestFeature?: string;
    loading?: string;
    connected?: string;
    error?: string;
    logout?: string;
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
};

const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return 'W';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

export function SidebarNav({
  workspaces,
  currentWorkspace,
  onSwitchWorkspace,
  onCreateWorkspace,
  mainNavItems,
  bottomNavItems = [],
  onLogout,
  onClose,
  isActive,
  renderLink,
  onRequestFeature,
  logo,
  theme,
  onToggleTheme,
  onSetTheme,
  language,
  onToggleLanguage,
  upgradeSlot,
  accountSlot,
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
      await onSwitchWorkspace(workspace);
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

  return (
    <nav className="sidebar-nav">
      {/* Wordmark de l'app — spec sidebar Umbelium (18px/700, accent,
          padding 0 8px 20px, bordure basse). */}
      {logo && <div className="sidebar-nav__wordmark">{logo}</div>}

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
        <ul className="sidebar-nav__list">
          {mainNavItems.map((item) => (
            <li key={item.path} className="sidebar-nav__item">
              {renderLink(item, isActive(item.path), onClose)}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Footer — ordre EXACT de la spec sidebar Umbelium :
          1. liens bas (« Paramètres », au-dessus des toggles)
          2. toggles thème + langue (une rangée)
          3. carte upgrade d'essai (upgradeSlot)
          4. rangée compte + déconnexion (accountSlot) ── */}
      <div className="sidebar-nav__footer">
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
          {bottomNavItems.map((item) => (
            <li key={item.path} className="sidebar-nav__item">
              {renderLink(item, isActive(item.path), onClose)}
            </li>
          ))}
          {onLogout && !accountSlot && (
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

        {/* Toggles thème + langue — une rangée (segmented, spec Umbelium).
            Thème : DEUX états Sun/Moon 13 — l'option « système » est retirée. */}
        {(onSetTheme || onToggleTheme || onToggleLanguage) && (
          <div className="sidebar-nav__settings">
            {(onSetTheme || onToggleTheme) && (
              <div className="sidebar-nav__switch sidebar-nav__switch--theme">
                <button
                  className={`sidebar-nav__switch-tab ${resolvedTheme === 'light' ? 'is-active' : ''}`}
                  onClick={() => selectTheme('light')}
                  title="Mode clair"
                >
                  <Sun size={13} />
                </button>
                <button
                  className={`sidebar-nav__switch-tab ${resolvedTheme === 'dark' ? 'is-active' : ''}`}
                  onClick={() => selectTheme('dark')}
                  title="Mode sombre"
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

        {/* Carte upgrade d'essai — sous les toggles, au-dessus du compte. */}
        {upgradeSlot}

        {/* Chip compte + déconnexion — tout en bas du footer. */}
        {accountSlot}
      </div>
    </nav>
  );
}

export default SidebarNav;
