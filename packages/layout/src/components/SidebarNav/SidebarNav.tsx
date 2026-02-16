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
  bottomNavItems?: NavItem[];
  onLogout?: () => void;
  onClose?: () => void;
  isActive: (path: string) => boolean;
  renderLink: (item: NavItem, isActive: boolean, onClick?: () => void) => ReactNode;
  onRequestFeature?: () => void;
  // Theme and language settings
  theme?: 'dark' | 'light' | 'system';
  onToggleTheme?: () => void;
  language?: 'fr' | 'en';
  onToggleLanguage?: () => void;
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
  theme,
  onToggleTheme,
  language,
  onToggleLanguage,
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

  return (
    <nav className="sidebar-nav">
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

      <div className="sidebar-nav__content">
        <ul className="sidebar-nav__list">
          {mainNavItems.map((item) => (
            <li key={item.path} className="sidebar-nav__item">
              {renderLink(item, isActive(item.path), onClose)}
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-nav__footer">
        {/* Theme and Language Settings */}
        {(onToggleTheme || onToggleLanguage) && (
          <div className="sidebar-nav__settings">
            {onToggleTheme && (
              <div className="sidebar-nav__switch">
                <button
                  className={`sidebar-nav__switch-tab ${theme === 'light' ? 'is-active' : ''}`}
                  onClick={() => theme !== 'light' && onToggleTheme()}
                  title="Light mode"
                >
                  <Sun size={16} />
                </button>
                <button
                  className={`sidebar-nav__switch-tab ${theme === 'dark' ? 'is-active' : ''}`}
                  onClick={() => theme !== 'dark' && onToggleTheme()}
                  title="Dark mode"
                >
                  <Moon size={16} />
                </button>
              </div>
            )}
            {onToggleLanguage && (
              <div className="sidebar-nav__switch">
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

        <div className="sidebar-nav__divider" />

        <ul className="sidebar-nav__list">
          {onRequestFeature && (
            <li className="sidebar-nav__item">
              <button
                className="sidebar-nav__link sidebar-nav__request-feature"
                onClick={onRequestFeature}
              >
                <span className="sidebar-nav__icon">
                  <MessageSquarePlus size={22} />
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
          {onLogout && (
            <li className="sidebar-nav__item">
              <button
                className="sidebar-nav__link sidebar-nav__logout"
                onClick={onLogout}
              >
                <span className="sidebar-nav__icon">
                  <LogOut size={22} />
                </span>
                <span className="sidebar-nav__label">{t.logout}</span>
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default SidebarNav;
