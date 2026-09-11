import type { HTMLAttributes, ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

export interface FormGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Nombre de colonnes sur grand écran (défaut : 2). La grille se replie
   *  toute seule : 3 → 2 sous 900px, puis 2 et 3 → 1 sous 640px. */
  columns?: 1 | 2 | 3;
  /** Gouttière entre les champs (défaut : `md`). */
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Grille de champs. Un `<Field wide>` occupe toute la largeur de la rangée. */
export function FormGrid({
  children,
  columns = 2,
  gap = 'md',
  className = '',
  ...props
}: FormGridProps) {
  return (
    <div
      {...props}
      className={['form-grid', `form-grid--cols-${columns}`, `form-grid--gap-${gap}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
