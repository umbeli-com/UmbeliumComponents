import { ReactNode } from 'react';
import { Menu, Bell, Zap } from 'lucide-react';

interface TopbarProps {
  onMenuClick?: () => void;
  onAICoachClick?: () => void;
  isAICoachOpen?: boolean;
  aiCoachLabel?: string;
  aiCoachOpenLabel?: string;
  rightContent?: ReactNode;
}

export function Topbar({ 
  onMenuClick, 
  onAICoachClick,
  isAICoachOpen = false,
  aiCoachLabel = 'Parler au Coach IA',
  aiCoachOpenLabel = 'Fermer le Coach',
  rightContent
}: TopbarProps) {
  return (
    <div className="topbar">
      <div className="topbar__left">
        <button 
          className="topbar__menu-btn" 
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="topbar__center">
        {onAICoachClick && (
          <button 
            className={`topbar__ai-cta ${isAICoachOpen ? 'is-active' : ''}`}
            onClick={onAICoachClick}
          >
            <span className="topbar__ai-cta-icon">
              <Zap size={20} />
            </span>
            <span className="topbar__ai-cta-text">
              {isAICoachOpen ? aiCoachOpenLabel : aiCoachLabel}
            </span>
            <span className="topbar__ai-cta-shortcut">⌘K</span>
          </button>
        )}
      </div>

      <div className="topbar__right">
        {rightContent || (
          <button className="topbar__action-btn" aria-label="Notifications">
            <Bell size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

export default Topbar;
