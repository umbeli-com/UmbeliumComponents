import React from 'react';
// La primitive est partagée avec ThemeToggle pour que les deux interrupteurs
// segmentés ne puissent pas diverger. Import du FICHIER et non du baril
// `../ThemeToggle` : inutile de tirer ThemeToggle (et Button) dans le graphe.
import { SegmentedSwitch } from '../ThemeToggle/SegmentedSwitch';
// Styles are imported separately via @umbeli-com/ui/styles

export type Language = 'fr' | 'en';

/** - `select`    : `<label>` + `<select>` (gabarit `.select--md`) — historique.
 *  - `segmented` : interrupteur segmenté FR/EN canonique de la sidebar,
 *                  identique à `SidebarNav` (@umbeli-com/layout). */
export type LanguageSwitcherVariant = 'select' | 'segmented';

/** `data-testid` de chaque partie. Contrat des suites Playwright des apps. */
export interface LanguageSwitcherTestIds {
  /** Conteneur (les deux variants). */
  root?: string;
  /** Le `<select>` (variant `select`). */
  select?: string;
  /** Onglets du variant `segmented`. */
  fr?: string;
  en?: string;
}

/** Chaînes visibles/lues, surchargeables. Français par défaut. */
export interface LanguageSwitcherLabels {
  /** Libellé du `<label>` (variant `select`) et, à défaut de `group`,
   *  `aria-label` du groupe segmenté. */
  label?: string;
  /** `<option>` du select, et `title` de l'onglet FR du segmented. */
  french?: string;
  /** `<option>` du select, et `title` de l'onglet EN du segmented. */
  english?: string;
  /** Texte de l'onglet français du segmented (défaut « FR »). */
  frenchShort?: string;
  /** Texte de l'onglet anglais du segmented (défaut « EN »). */
  englishShort?: string;
  /** `aria-label` du `role="group"` (segmented) — défaut : `label`. */
  group?: string;
}

export interface LanguageSwitcherProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  variant?: LanguageSwitcherVariant;
  /** `segmented` : modificateur canonique posé sur le conteneur.
   *  `'lang'` (défaut) = `sidebar-nav__switch--lang`, parité exacte avec le
   *  footer de SidebarNav (FR/EN en 600). `'none'` = `.sidebar-nav__switch`
   *  nu — le gabarit du tiroir Réglages d'Anonymum, dont les onglets FR/EN
   *  sont en 400. */
  segmentedModifier?: 'lang' | 'none';
  /** Ajouté à la fin des classes de la racine, jamais à la place. */
  className?: string;
  /** Raccourci : pose `data-testid` sur la racine et DÉRIVE ceux des onglets
   *  du `segmented` (`${testId}-fr`, `${testId}-en`). `testIds` l'emporte,
   *  clé par clé. */
  testId?: string;
  testIds?: LanguageSwitcherTestIds;
  labels?: LanguageSwitcherLabels;
}

const defaultLabels: Required<Omit<LanguageSwitcherLabels, 'group'>> = {
  label: 'Langue',
  french: 'Français',
  english: 'English',
  frenchShort: 'FR',
  englishShort: 'EN',
};

export function LanguageSwitcher({ 
  language, 
  onLanguageChange,
  variant = 'select',
  segmentedModifier = 'lang',
  className,
  testId,
  testIds,
  labels = {}
}: LanguageSwitcherProps) {
  const t = { ...defaultLabels, ...labels };
  const ids: LanguageSwitcherTestIds = {
    root: testIds?.root ?? testId,
    select: testIds?.select,
    fr: testIds?.fr ?? (testId ? `${testId}-fr` : undefined),
    en: testIds?.en ?? (testId ? `${testId}-en` : undefined),
  };

  // ── Segmented canonique — mêmes classes que le footer de SidebarNav. ──
  if (variant === 'segmented') {
    return (
      <SegmentedSwitch<Language>
        modifier={segmentedModifier === 'none' ? undefined : segmentedModifier}
        value={language}
        // Re-cliquer l'onglet actif ne fait rien — comportement de SidebarNav
        // (`language !== 'fr' && onToggleLanguage()`), qui protège les apps
        // câblant une bascule plutôt qu'un setter.
        onSelect={(next) => { if (next !== language) onLanguageChange(next); }}
        groupLabel={t.group ?? t.label}
        className={className}
        testId={ids.root}
        options={[
          { value: 'fr', content: t.frenchShort, label: t.french, testId: ids.fr },
          { value: 'en', content: t.englishShort, label: t.english, testId: ids.en },
        ]}
      />
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLanguageChange(e.target.value as Language);
  };

  // ── Variant historique : balisage INCHANGÉ au caractère près quand les
  //    nouvelles props sont à leur défaut. ──
  return (
    <div className={`language-switcher${className ? ` ${className}` : ''}`} data-testid={ids.root}>
      <label className="language-switcher__label">{t.label}</label>
      <select 
        className="language-switcher__select"
        value={language}
        onChange={handleChange}
        data-testid={ids.select}
      >
        <option value="fr">{t.french}</option>
        <option value="en">{t.english}</option>
      </select>
    </div>
  );
}

export default LanguageSwitcher;
