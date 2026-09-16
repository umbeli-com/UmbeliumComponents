import { ReactNode } from 'react';
import { Menu, Bell, Zap } from 'lucide-react';

export interface TopbarProps {
  onMenuClick?: () => void;
  onAICoachClick?: () => void;
  isAICoachOpen?: boolean;
  aiCoachLabel?: string;
  aiCoachOpenLabel?: string;
  rightContent?: ReactNode;
}

/**
 * Double classe (historique + `umb-`) : la feuille ne style que la préfixée.
 * `.topbar__menu-btn` reste émise — les suites Playwright de Dialum cliquent
 * dessus pour ouvrir le tiroir mobile. Voir Topbar.scss.
 */
export function Topbar({ 
  onMenuClick, 
  onAICoachClick,
  isAICoachOpen = false,
  aiCoachLabel = 'Parler au Coach IA',
  aiCoachOpenLabel = 'Fermer le Coach',
  rightContent
}: TopbarProps) {
  return (
    <div className="topbar umb-topbar">
      <div className="topbar__left umb-topbar__left">
        <button 
          className="topbar__menu-btn umb-topbar__menu-btn" 
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="topbar__center umb-topbar__center">
        {onAICoachClick && (
          <button 
            className={`topbar__ai-cta umb-topbar__ai-cta ${isAICoachOpen ? 'is-active' : ''}`}
            onClick={onAICoachClick}
          >
            <span className="topbar__ai-cta-icon umb-topbar__ai-cta-icon">
              <Zap size={20} />
            </span>
            <span className="topbar__ai-cta-text umb-topbar__ai-cta-text">
              {isAICoachOpen ? aiCoachOpenLabel : aiCoachLabel}
            </span>
            <span className="topbar__ai-cta-shortcut umb-topbar__ai-cta-shortcut">⌘K</span>
          </button>
        )}
      </div>

      <div className="topbar__right umb-topbar__right">
        {rightContent || (
          <button className="topbar__action-btn umb-topbar__action-btn" aria-label="Notifications">
            <Bell size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

export default Topbar;
