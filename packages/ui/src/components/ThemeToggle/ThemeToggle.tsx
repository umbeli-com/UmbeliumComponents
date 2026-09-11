import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '../Button';
import { SegmentedSwitch } from './SegmentedSwitch';
// Styles are imported separately via @umbeli-com/ui/styles

/** - `dropdown` : trois boutons `Button` (clair / sombre / SYSTÈME) — historique.
 *  - `toggle`   : un bouton `Button` unique qui bascule — historique.
 *  - `segmented`: interrupteur segmenté canonique de la sidebar, DEUX états
 *                 (Sun/Moon), identique à `SidebarNav` (@umbeli-com/layout). */
export type ThemeToggleVariant = 'dropdown' | 'toggle' | 'segmented';

/** Chaînes visibles/lues, surchargeables.
 *  Les défauts des variants HISTORIQUES restent les chaînes anglaises déjà
 *  rendues en production (`title` = texte visible au survol : les changer
 *  serait une rupture) ; le variant `segmented`, lui, naît en français, aligné
 *  sur les `translations` de SidebarNav. */
export interface ThemeToggleLabels {
  /** `title` du bouton clair (défaut : « Mode clair » en `segmented`,
   *  `'Light mode'` en `dropdown`). */
  light?: string;
  /** `title` du bouton sombre (défaut : « Mode sombre » en `segmented`,
   *  `'Dark mode'` en `dropdown`). */
  dark?: string;
  /** `title` du bouton système (`dropdown` seul — défaut `'System preference'`). */
  system?: string;
  /** `title` du bouton unique quand il passera en clair (`toggle` seul). */
  switchToLight?: string;
  /** `title` du bouton unique quand il passera en sombre (`toggle` seul). */
  switchToDark?: string;
  /** `aria-label` du groupe (`segmented` seul — défaut « Thème »). */
  group?: string;
}

/** `data-testid` de chaque partie. Contrat des suites Playwright des apps :
 *  sans eux, adopter le composant casse les specs en silence. */
export interface ThemeToggleTestIds {
  /** Conteneur (`dropdown` et `segmented`). */
  root?: string;
  light?: string;
  dark?: string;
  /** `dropdown` seul. */
  system?: string;
  /** Bouton unique du variant `toggle`. */
  toggle?: string;
}

export interface ThemeToggleProps {
  variant?: ThemeToggleVariant;
  /** Taille des `Button` — `dropdown` et `toggle` seuls ; le `segmented` tient
   *  ses métriques du CSS canonique de la sidebar. */
  size?: 'sm' | 'md';
  /** Thème affiché. `'system'` (héritage — cf. `StoredTheme` de ThemeProvider)
   *  reste accepté : le `segmented` le RÉSOUT en clair/sombre pour l'affichage,
   *  comme SidebarNav. */
  theme: 'light' | 'dark' | 'system';
  /** En `segmented`, n'est JAMAIS appelé avec `'system'` : deux états
   *  (décision suite 2026-08-12). */
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  /** `segmented` : modificateur canonique posé sur le conteneur.
   *  `'theme'` (défaut) = `sidebar-nav__switch--theme`, parité exacte avec le
   *  footer de SidebarNav (le switch prend la largeur restante, onglets
   *  flex:1 / padding 4px 0). `'none'` = `.sidebar-nav__switch` nu, à largeur
   *  intrinsèque — le gabarit du tiroir Réglages d'Anonymum. */
  segmentedModifier?: 'theme' | 'none';
  /** Taille des icônes lucide (défaut : 13 en `segmented` — la valeur de
   *  SidebarNav —, 16 dans les variants historiques). */
  iconSize?: number;
  /** Ajouté à la fin des classes de la racine, jamais à la place. */
  className?: string;
  /** Raccourci : pose `data-testid` sur la racine et DÉRIVE ceux des onglets
   *  (`${testId}-light`, `${testId}-dark`, `${testId}-system`). `testIds`
   *  l'emporte, clé par clé. */
  testId?: string;
  testIds?: ThemeToggleTestIds;
  labels?: ThemeToggleLabels;
}

/** Défauts des variants historiques — chaînes rendues telles quelles depuis
 *  l'origine du paquet, en anglais. NE PAS traduire : ce sont des `title`. */
const legacyLabels: Required<ThemeToggleLabels> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System preference',
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',
  // `group` n'est lu QUE par le `segmented` (aria-label du groupe) : il naît
  // donc en français, comme `SidebarNav.defaultTranslations.theme`. Il figure
  // ici seulement parce que `segmentedLabels` dérive de cette table.
  group: 'Thème',
};

/** Défauts du segmented — alignés sur `SidebarNav.defaultTranslations`. */
const segmentedLabels: Required<ThemeToggleLabels> = {
  ...legacyLabels,
  light: 'Mode clair',
  dark: 'Mode sombre',
};

/** `system` → thème effectif de l'OS, comme SidebarNav. Filet : les apps sont
 *  censées migrer leur état stocké au chargement. */
const resolveTheme = (theme: 'light' | 'dark' | 'system'): 'light' | 'dark' => {
  if (theme !== 'system') return theme;
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export function ThemeToggle({
  variant = 'dropdown',
  size = 'sm',
  theme,
  onThemeChange,
  segmentedModifier = 'theme',
  iconSize,
  className,
  testId,
  testIds,
  labels,
}: ThemeToggleProps) {
  const t = { ...(variant === 'segmented' ? segmentedLabels : legacyLabels), ...labels };
  // Les testids dérivés ne s'appliquent que si l'app en a demandé : sans
  // `testId` ni `testIds`, aucun attribut n'est rendu — balisage historique.
  const ids: ThemeToggleTestIds = {
    root: testIds?.root ?? testId,
    light: testIds?.light ?? (testId ? `${testId}-light` : undefined),
    dark: testIds?.dark ?? (testId ? `${testId}-dark` : undefined),
    system: testIds?.system ?? (testId ? `${testId}-system` : undefined),
    toggle: testIds?.toggle ?? testId,
  };

  // ── Segmented canonique (spec 2026-08-12) : DEUX états, jamais 'system'. ──
  if (variant === 'segmented') {
    const resolved = resolveTheme(theme);
    return (
      <SegmentedSwitch<'light' | 'dark'>
        modifier={segmentedModifier === 'none' ? undefined : segmentedModifier}
        value={resolved}
        // Garde-fou du re-clic sur la valeur BRUTE, jamais sur `resolved` :
        // avec `theme='system'`, aucun onglet n'est « déjà choisi », donc
        // cliquer Sun épingle bien `'light'` (SidebarNav fait de même via
        // `selectTheme`). Garder `theme` ici évite aussi qu'une app qui câble
        // une bascule s'auto-inverse en recliquant son onglet actif.
        onSelect={(next) => { if (theme !== next) onThemeChange(next); }}
        groupLabel={t.group}
        className={className}
        testId={ids.root}
        options={[
          { value: 'light', content: <Sun size={iconSize ?? 13} />, label: t.light, testId: ids.light },
          { value: 'dark', content: <Moon size={iconSize ?? 13} />, label: t.dark, testId: ids.dark },
        ]}
      />
    );
  }

  // ── Variants historiques : balisage INCHANGÉ au caractère près quand les
  //    nouvelles props sont à leur défaut (les ajouts portent leur propre
  //    espace de tête / restent `undefined`, donc non rendus). ──
  if (variant === 'toggle') {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return (
      <Button
        variant="ghost"
        size={size}
        onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
        className={`theme-toggle__button${className ? ` ${className}` : ''}`}
        title={isDark ? t.switchToLight : t.switchToDark}
        testId={ids.toggle}
      >
        {isDark ? <Sun size={iconSize ?? 16} /> : <Moon size={iconSize ?? 16} />}
      </Button>
    );
  }

  return (
    <div className={`theme-toggle${className ? ` ${className}` : ''}`} data-testid={ids.root}>
      <Button
        variant={theme === 'light' ? 'primary' : 'ghost'}
        size={size}
        onClick={() => onThemeChange('light')}
        className="theme-toggle__option"
        title={t.light}
        testId={ids.light}
      >
        <Sun size={iconSize ?? 16} />
      </Button>
      <Button
        variant={theme === 'dark' ? 'primary' : 'ghost'}
        size={size}
        onClick={() => onThemeChange('dark')}
        className="theme-toggle__option"
        title={t.dark}
        testId={ids.dark}
      >
        <Moon size={iconSize ?? 16} />
      </Button>
      <Button
        variant={theme === 'system' ? 'primary' : 'ghost'}
        size={size}
        onClick={() => onThemeChange('system')}
        className="theme-toggle__option"
        title={t.system}
        testId={ids.system}
      >
        <Monitor size={iconSize ?? 16} />
      </Button>
    </div>
  );
}

export default ThemeToggle;
