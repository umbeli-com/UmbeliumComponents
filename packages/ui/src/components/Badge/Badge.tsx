import type { HTMLAttributes, ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

/** Teintes canoniques : chaque tone mappe la paire --theme-color-*-soft (fond)
 *  / --theme-color-* (texte), donc le mode sombre suit les variables du thème
 *  sans bloc `.dark` dédié. */
export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Libellé de la pastille (fourni par l'app — aucune chaîne par défaut). */
  children: ReactNode;
  /** Teinte sémantique (défaut : `neutral`). */
  tone?: BadgeTone;
  /** Taille (défaut : `md`). */
  size?: BadgeSize;
  /** Icône optionnelle rendue avant le libellé — ex. `<Check size={12} />`.
   *  Purement décorative (aria-hidden) : le sens vit dans le libellé. */
  icon?: ReactNode;
  className?: string;
}

export function Badge({
  children,
  tone = 'neutral',
  size = 'md',
  icon,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`badge badge--${tone} badge--${size} ${className}`.trim()}
      {...props}
    >
      {icon && (
        <span className="badge__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="badge__label">{children}</span>
    </span>
  );
}
