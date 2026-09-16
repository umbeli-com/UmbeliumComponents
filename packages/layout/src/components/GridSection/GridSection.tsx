import { CSSProperties, ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/layout/styles

/** Mot-clé de répétition du mode auto. `'auto-fill'` garde les pistes vides
 *  (une seule carte reste à sa largeur de piste) ; `'auto-fit'` les replie
 *  (la carte s'étire sur toute la ligne). */
export type GridSectionAutoColumns = 'auto-fill' | 'auto-fit';

export interface GridSectionProps {
  children: ReactNode;
  title?: string;
  columns?: number;
  /** Largeur MINIMALE d'une piste → `repeat(auto-fill, minmax(w, 1fr))` : le
   *  nombre de colonnes s'adapte à la place disponible au lieu d'être figé.
   *  Nombre = px. Fournie, elle REMPLACE `columns` (qui garde son type et son
   *  défaut de 12 pour tout le monde). */
  minColumnWidth?: number | string;
  /** Mot-clé du mode auto (défaut `'auto-fill'`). Sans effet sans
   *  `minColumnWidth`. */
  autoColumns?: GridSectionAutoColumns;
  gap?: 'sm' | 'md' | 'lg';
  /** Gouttière sur-mesure (nombre = px). L'emporte sur `gap` — pour les
   *  grilles dont la gouttière ne tombe sur aucun des trois crans. */
  gapSize?: number | string;
  className?: string;
  /** Classes de l'app sur la grille elle-même (ex. Webum : `media-grid`). */
  gridClassName?: string;
}

/** Nombre → px ; chaîne → valeur CSS telle quelle. */
const toCssSize = (value: number | string): string =>
  typeof value === 'number' ? `${value}px` : value;

/**
 * Double classe (historique + `umb-`), modificateur `--gap-*` inclus : la
 * gouttière est portée par `.umb-grid-section--gap-X .umb-grid-section__grid`,
 * donc les deux doivent être émises ensemble. Voir GridSection.scss.
 *
 * Le gabarit de colonnes est un style EN LIGNE depuis toujours : le mode
 * `minColumnWidth` ne fait qu'en changer la valeur, il n'ajoute ni classe ni
 * règle CSS. Sans la prop, la chaîne produite reste `repeat(12, 1fr)`.
 */
export function GridSection({
  children,
  title,
  columns = 12,
  minColumnWidth,
  autoColumns = 'auto-fill',
  gap = 'md',
  gapSize,
  className = '',
  gridClassName,
}: GridSectionProps) {
  const style: CSSProperties = {
    gridTemplateColumns: minColumnWidth !== undefined
      ? `repeat(${autoColumns}, minmax(${toCssSize(minColumnWidth)}, 1fr))`
      : `repeat(${columns}, 1fr)`,
  };
  // Posée seulement si demandée : sinon la gouttière reste celle du cran
  // `--gap-*` de la feuille (le style en ligne la battrait sans retour).
  if (gapSize !== undefined) style.gap = toCssSize(gapSize);

  return (
    <section
      className={`grid-section umb-grid-section grid-section--gap-${gap} umb-grid-section--gap-${gap} ${className}`}
    >
      {title && <h2 className="grid-section__title umb-grid-section__title">{title}</h2>}
      <div
        className={`grid-section__grid umb-grid-section__grid${gridClassName ? ` ${gridClassName}` : ''}`}
        style={style}
      >
        {children}
      </div>
    </section>
  );
}

export default GridSection;
