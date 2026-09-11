import { ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

/**
 * Interrupteur SEGMENTÉ canonique de la suite — même balisage et mêmes classes
 * que le footer de `SidebarNav` (@umbeli-com/layout) :
 *
 *     <div class="sidebar-nav__switch sidebar-nav__switch--theme">
 *       <button class="sidebar-nav__switch-tab is-active">…</button>
 *       <button class="sidebar-nav__switch-tab">…</button>
 *     </div>
 *
 * Le style n'est PAS redéfini ici : il vit dans `SidebarNav.scss`, livré par
 * `@umbeli-com/layout/styles/sidebar.css` (ou `…/styles/index.css`), déjà
 * importé par toutes les apps qui portent la sidebar canonique. Le recopier
 * dans @umbeli-com/ui donnerait deux sources pour un même pixel — donc la
 * dérive garantie. Corollaire assumé : une app qui n'importe PAS le CSS de
 * @umbeli-com/layout obtient un contrôle non stylé.
 *
 * Primitive interne, partagée par `ThemeToggle` et `LanguageSwitcher` pour que
 * les deux ne puissent pas diverger (classes, `is-active`, ordre des onglets).
 */

/** Un onglet du segmented. */
export interface SegmentedSwitchOption<T extends string> {
  value: T;
  /** Contenu de l'onglet : une icône (thème) ou un code court (« FR »). */
  content: ReactNode;
  /** `title` de l'onglet — et son `aria-label` UNIQUEMENT quand le contenu
   *  n'est pas du texte (onglet icône). Un onglet qui affiche « FR » tire son
   *  nom accessible de son propre texte, comme SidebarNav : lui coller
   *  `aria-label="Français"` renommerait le bouton « FR » en « Français »,
   *  ce qui (1) casserait les suites Playwright de la suite, qui le ciblent par
   *  `getByRole('button', { name: 'EN', exact: true })` (Anonymum
   *  e2e/managerlive/app-ui.spec.ts, Dialum idem, Profilum
   *  e2e/public-landing.spec.ts) et (2) violerait WCAG 2.5.3 « Label in Name »
   *  (le nom accessible doit contenir le libellé visible). */
  label: string;
  /** Posé tel quel en `data-testid`. Contrat des suites Playwright des apps. */
  testId?: string;
}

export interface SegmentedSwitchProps<T extends string> {
  options: SegmentedSwitchOption<T>[];
  /** Onglet actif. `undefined` → aucun onglet `is-active`. */
  value: T | undefined;
  /** Appelé au clic sur un onglet, AVEC sa valeur.
   *
   *  La primitive n'arbitre PAS le re-clic sur l'onglet déjà actif : c'est à
   *  l'appelant de le faire, contre SA valeur brute — et pas contre `value`,
   *  qui n'est que l'état AFFICHÉ. `ThemeToggle` en dépend : avec
   *  `theme='system'`, `value` vaut le thème résolu de l'OS (mettons `light`),
   *  mais AUCUN onglet n'est « déjà choisi » — un garde-fou posé ici sur
   *  `value` empêcherait l'utilisateur d'épingler le mode clair, la case même
   *  que SidebarNav sait traiter (`selectTheme` appelle toujours
   *  `onSetTheme`). */
  onSelect: (value: T) => void;
  /** Modificateur canonique du conteneur : `sidebar-nav__switch--theme`
   *  (onglets étirés) ou `--lang` (FR/EN en 600). `undefined` → aucun. */
  modifier?: 'theme' | 'lang';
  /** `aria-label` du `role="group"`. */
  groupLabel?: string;
  className?: string;
  /** Posé tel quel en `data-testid` sur le conteneur. */
  testId?: string;
}

export function SegmentedSwitch<T extends string>({
  options,
  value,
  onSelect,
  modifier,
  groupLabel,
  className,
  testId,
}: SegmentedSwitchProps<T>) {
  const classes =
    `sidebar-nav__switch${modifier ? ` sidebar-nav__switch--${modifier}` : ''}` +
    `${className ? ` ${className}` : ''}`;

  return (
    <div className={classes} role="group" aria-label={groupLabel} data-testid={testId}>
      {options.map((option) => {
        const isActive = value === option.value;
        // Un onglet textuel (« FR ») porte déjà son nom accessible : on n'y
        // touche pas. Un onglet icône n'en a aucun → `aria-label` explicite
        // (qui rend alors exactement le même nom que le `title` seul rendu
        // aujourd'hui par SidebarNav — donc aucun sélecteur ne bouge).
        const hasVisibleText =
          typeof option.content === 'string' || typeof option.content === 'number';
        return (
          <button
            key={option.value}
            type="button"
            // Gabarit de classe identique à SidebarNav, espace de fin compris.
            className={`sidebar-nav__switch-tab ${isActive ? 'is-active' : ''}`}
            onClick={() => onSelect(option.value)}
            title={option.label}
            aria-label={hasVisibleText ? undefined : option.label}
            aria-pressed={isActive}
            data-testid={option.testId}
          >
            {option.content}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedSwitch;
