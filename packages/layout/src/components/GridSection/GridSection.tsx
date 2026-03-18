import { ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/layout/styles

interface GridSectionProps {
  children: ReactNode;
  title?: string;
  columns?: number;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GridSection({ 
  children, 
  title, 
  columns = 12,
  gap = 'md',
  className = '' 
}: GridSectionProps) {
  return (
    <section className={`grid-section grid-section--gap-${gap} ${className}`}>
      {title && <h2 className="grid-section__title">{title}</h2>}
      <div 
        className="grid-section__grid"
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
