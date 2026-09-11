import type { ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

export interface EmptyStateProps {
  /** Icône optionnelle (décorative) rendue dans la pastille du haut —
   *  ex. `<Inbox size={26} />`. */
  icon?: ReactNode;
  /** Titre du panneau « rien ici pour l'instant ». Fourni par l'app. */
  title: ReactNode;
  /** Phrase d'explication / d'amorçage sous le titre. */
  description?: ReactNode;
  /** Zone d'action (bouton, lien…) — rendue telle quelle, donc le composant
   *  reste agnostique du routeur : passer un `<Link>`/`<Button>` de l'app. */
  action?: ReactNode;
  /** Variante resserrée pour un vide DANS une carte/un panneau. */
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`empty-state${compact ? ' empty-state--compact' : ''} ${className}`.trim()}
    >
      {icon && (
        <div className="empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="empty-state__title">{title}</h2>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
