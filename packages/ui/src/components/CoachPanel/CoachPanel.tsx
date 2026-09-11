import { ReactNode } from 'react';

export interface CoachPanelProps {
  message: string;
  why?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  children?: ReactNode;
}

export function CoachPanel({ message, why, actions, children }: CoachPanelProps) {
  return (
    <div className="coach-panel">
      <div className="coach-panel__header">
        <span className="coach-panel__avatar">🎯</span>
        <span className="coach-panel__label">Votre Coach</span>
      </div>

      <div className="coach-panel__content">
        <div className="coach-panel__message-section">
          <h4 className="coach-panel__section-title">Message</h4>
          <p className="coach-panel__message">{message}</p>
        </div>

        {why && (
          <div className="coach-panel__why-section">
            <h4 className="coach-panel__section-title">Pourquoi ?</h4>
            <p className="coach-panel__why">{why}</p>
          </div>
        )}

        {actions && actions.length > 0 && (
          <div className="coach-panel__actions-section">
            <h4 className="coach-panel__section-title">Actions suggérées</h4>
            <ul className="coach-panel__actions-list">
              {actions.map((action, index) => (
                <li key={index} className="coach-panel__action-item">
                  <button 
                    className="coach-panel__action-btn"
                    onClick={action.onClick}
                  >
                    <span className="coach-panel__action-icon">→</span>
                    {action.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

export default CoachPanel;
