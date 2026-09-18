import { CSSProperties, ReactNode } from 'react';

/** Un style qui porte aussi des variables CSS (`--umb-grid-cols-md`). */
type StyleWithVars = CSSProperties & Record<`--${string}`, string>;
// Styles are imported separately via @umbeli-com/layout/styles

/** Mot-clé de répétition du mode auto. `'auto-fill'` garde les pistes vides
 *  (une seule carte reste à sa largeur de piste) ; `'auto-fit'` les replie
 *  (la carte s'étire sur toute la ligne). */
export type GridSectionAutoColumns = 'auto-fill' | 'auto-fit';

/**
 * Colonnes PAR PALIER, sémantique Tailwind (`grid-cols-1 md:grid-cols-2
 * xl:grid-cols-4`) : un palier non renseigné hérite du précédent.
 *
 * Mesuré chez Dialum (5 grilles : Dashboard ×3, AccountSettings, CallInterface)
 * et au Manager (builder) : `columns` était un nombre FIXE, `minColumnWidth`
 * fait de l'auto-fill (il ne peut pas passer de 2 à 4 colonnes sans passer par
 * 3) et `templateColumns` est un style EN LIGNE, qui battrait toute media
 * query. Ici les valeurs voyagent en variables CSS et ce sont les media
 * queries de la FEUILLE qui les appliquent — l'app peut donc supprimer ses
 * classes responsives.
 *
 * Un nombre vaut `repeat(n, 1fr)` ; une chaîne est écrite telle quelle
 * (`'minmax(0, 1.8fr) minmax(300px, 1fr)'`).
 *
 * Seuils : `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px.
 */
export interface GridSectionColumnsByBreakpoint {
  base?: number | string;
  sm?: number | string;
  md?: number | string;
  lg?: number | string;
  xl?: number | string;
}

export interface GridSectionProps {
  children: ReactNode;
  title?: string;
  /** Nombre de colonnes (défaut 12), ou un gabarit PAR PALIER — voir
   *  `GridSectionColumnsByBreakpoint`. */
  columns?: number | GridSectionColumnsByBreakpoint;
  /** Largeur MINIMALE d'une piste → `repeat(auto-fill, minmax(w, 1fr))` : le
   *  nombre de colonnes s'adapte à la place disponible au lieu d'être figé.
   *  Nombre = px. Fournie, elle REMPLACE `columns` (qui garde son type et son
   *  défaut de 12 pour tout le monde). */
  minColumnWidth?: number | string;
  /** Mot-clé du mode auto (défaut `'auto-fill'`). Sans effet sans
   *  `minColumnWidth`. */
  autoColumns?: GridSectionAutoColumns;
  /**
   * `grid-template-columns` écrit TEL QUEL — prioritaire sur `minColumnWidth`
   * et `columns`. Pour les pistes que ni l'un ni l'autre n'expriment : la
   * colonne asymétrique du builder du Manager
   * (`minmax(0, 1.8fr) minmax(300px, 1fr)`).
   *
   * Un style en ligne bat toute media query de l'app : pour un gabarit qui
   * change au point de rupture, ne rien passer ici et utiliser `unstyledGrid`
   * avec les classes responsives de l'app.
   */
  templateColumns?: string;
  /**
   * Grille NUE : le composant n'écrit AUCUN gabarit en ligne (sauf
   * `templateColumns` explicite) et n'émet pas `umb-grid-section__grid` — donc
   * ni `display: grid`, ni `align-items`, ni gouttière de cran venus de la
   * feuille. La grille de l'app (`gridClassName`) décide de tout, media queries
   * comprises.
   *
   * Mesuré : Profilum (`.dashboard__stats`, `.grid-stats` 4→2→1 colonnes,
   * `.grid-2`) n'importe pas la feuille du paquet, et le `repeat(12, 1fr)` en
   * ligne écrasait sa dégressivité ; les grilles `lg:`/`xl:` du Manager
   * (hub-layout.spec.ts:67 asserte le reflow) de même. `grid-section__grid`,
   * que la feuille ne vise pas, reste émise.
   */
  unstyledGrid?: boolean;
  /** `align-items` de la grille, en ligne. Absent : la valeur de la feuille
   *  (`start`, ou le token `--umb-grid-section-align`). `stretch` pour des
   *  cartes de même hauteur par rangée (landing de Monitorum). */
  alignItems?: CSSProperties['alignItems'];
  /**
   * Rendre la `<section>` autour de la grille (défaut `true`). `false` : la
   * grille EST la racine et reçoit `className` — plus de marge basse de
   * section, plus de nœud intermédiaire. Le titre éventuel est rendu juste
   * avant la grille, sans enveloppe.
   */
  wrapper?: boolean;
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

/** Nombre → `repeat(n, 1fr)` ; chaîne → gabarit tel quel. */
const toTemplate = (value: number | string): string =>
  typeof value === 'number' ? `repeat(${value}, 1fr)` : value;

const BREAKPOINTS = ['base', 'sm', 'md', 'lg', 'xl'] as const;

/**
 * Double classe (historique + `umb-`), modificateur `--gap-*` inclus : la
 * gouttière est portée par `.umb-grid-section--gap-X .umb-grid-section__grid`,
 * donc les deux doivent être émises ensemble. Voir GridSection.scss.
 *
 * Le gabarit de colonnes est un style EN LIGNE depuis toujours : le mode
 * `minColumnWidth` ne fait qu'en changer la valeur, il n'ajoute ni classe ni
 * règle CSS. Sans la prop, la chaîne produite reste `repeat(12, 1fr)`.
 *
 * SEULE exception : `columns` sous forme d'objet (colonnes par palier) n'écrit
 * AUCUN `grid-template-columns` en ligne — un style en ligne battrait les media
 * queries. Les valeurs partent en variables `--umb-grid-cols-*` et la feuille
 * les applique par palier (voir `GridSectionColumnsByBreakpoint`).
 *
 * Tout ce qui suit `autoColumns` dans les props est ADDITIF : sans ces props,
 * le balisage est celui d'hier à l'octet près (mêmes balises, mêmes classes,
 * même `style`).
 */
export function GridSection({
  children,
  title,
  columns = 12,
  minColumnWidth,
  autoColumns = 'auto-fill',
  templateColumns,
  unstyledGrid = false,
  alignItems,
  wrapper = true,
  gap = 'md',
  gapSize,
  className = '',
  gridClassName,
}: GridSectionProps) {
  // Gabarit par palier : AUCUN `grid-template-columns` en ligne (il battrait
  // les media queries), seulement des variables lues par la feuille.
  const byBreakpoint = typeof columns === 'object' && columns !== null ? columns : undefined;

  const style: StyleWithVars = {};
  if (byBreakpoint !== undefined) {
    // Les CINQ variables sont TOUJOURS écrites, cascade déjà résolue (un
    // palier absent hérite du précédent). Les variables CSS s'héritent : n'en
    // écrire qu'une partie laissait une GridSection IMBRIQUÉE reprendre les
    // paliers de sa grille parente — mesuré au Manager, la grille des cartes
    // (`xl` seul) passait à 2 colonnes dès 1024px avec le `lg` de l'extérieure.
    let inherited: string = 'repeat(1, 1fr)';
    for (const bp of BREAKPOINTS) {
      const value = byBreakpoint[bp];
      if (value !== undefined) inherited = toTemplate(value);
      style[`--umb-grid-cols-${bp}`] = inherited;
    }
  } else if (templateColumns !== undefined) {
    style.gridTemplateColumns = templateColumns;
  } else if (!unstyledGrid) {
    style.gridTemplateColumns = minColumnWidth !== undefined
      ? `repeat(${autoColumns}, minmax(${toCssSize(minColumnWidth)}, 1fr))`
      : `repeat(${typeof columns === 'number' ? columns : 12}, 1fr)`;
  }
  // Posée seulement si demandée : sinon la gouttière reste celle du cran
  // `--gap-*` de la feuille (le style en ligne la battrait sans retour).
  if (gapSize !== undefined) style.gap = toCssSize(gapSize);
  if (alignItems !== undefined) style.alignItems = alignItems;
  const hasStyle = Object.keys(style).length > 0;

  const gridOwn = wrapper
    ? gridClassName
    : [className, gridClassName].filter(Boolean).join(' ');
  const gridClass =
    `grid-section__grid${unstyledGrid ? '' : ' umb-grid-section__grid'}` +
    `${byBreakpoint !== undefined && !unstyledGrid ? ' umb-grid-section__grid--responsive' : ''}` +
    `${gridOwn ? ` ${gridOwn}` : ''}` +
    // Sans section, le cran de gouttière ne peut plus passer par l'ancêtre :
    // il rejoint la grille elle-même (voir `.umb-grid-section__grid--gap-*`).
    `${!wrapper && !unstyledGrid ? ` umb-grid-section__grid--gap-${gap}` : ''}`;

  const titleNode = title && <h2 className="grid-section__title umb-grid-section__title">{title}</h2>;
  const grid = (
    <div className={gridClass} {...(hasStyle ? { style } : null)}>
      {children}
    </div>
  );

  if (!wrapper) {
    return (
      <>
        {titleNode}
        {grid}
      </>
    );
  }

  return (
    <section
      className={`grid-section umb-grid-section grid-section--gap-${gap} umb-grid-section--gap-${gap} ${className}`}
    >
      {titleNode}
      {grid}
    </section>
  );
}

export default GridSection;
