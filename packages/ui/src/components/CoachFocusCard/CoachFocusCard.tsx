import { Button } from '@umbeli-com/ui';

interface CoachFocusCardProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  priority?: 'high' | 'medium' | 'low';
}

export function CoachFocusCard({ 
  title, 
  message, 
  actionLabel = 'Appliquer',
  onAction,
  priority = 'medium'
}: CoachFocusCardProps) {
  return (
    <div className={`coach-focus-card coach-focus-card--${priority}`}>
      <div className="coach-focus-card__header">
        <span className="coach-focus-card__avatar">🎯</span>
        <div className="coach-focus-card__title-wrap">
          <h3 className="coach-focus-card__title">Coach Focus</h3>
          <span className="coach-focus-card__subtitle">{title}</span>
        </div>
      </div>
      
      <p className="coach-focus-card__message">{message}</p>
      
      {onAction && (
        <div className="coach-focus-card__actions">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default CoachFocusCard;
