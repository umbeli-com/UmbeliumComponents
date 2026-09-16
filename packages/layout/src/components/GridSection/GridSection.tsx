import { ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/layout/styles

export interface GridSectionProps {
  children: ReactNode;
  title?: string;
  columns?: number;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Double classe (historique + `umb-`), modificateur `--gap-*` inclus : la
 * gouttière est portée par `.umb-grid-section--gap-X .umb-grid-section__grid`,
 * donc les deux doivent être émises ensemble. Voir GridSection.scss.
 */
export function GridSection({ 
  children, 
  title, 
  columns = 12,
  gap = 'md',
  className = '' 
}: GridSectionProps) {
  return (
    <section
      className={`grid-section umb-grid-section grid-section--gap-${gap} umb-grid-section--gap-${gap} ${className}`}
    >
      {title && <h2 className="grid-section__title umb-grid-section__title">{title}</h2>}
      <div 
        className="grid-section__grid umb-grid-section__grid"
        style={{ 
          gridTemplateColumns: `repeat(${columns}, 1fr)` 
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default GridSection;
