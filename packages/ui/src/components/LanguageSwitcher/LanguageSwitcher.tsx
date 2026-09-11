import React from 'react';

export type Language = 'fr' | 'en';

export interface LanguageSwitcherProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  labels?: {
    label?: string;
    french?: string;
    english?: string;
  };
}

const defaultLabels = {
  label: 'Langue',
  french: 'Français',
  english: 'English',
};

export function LanguageSwitcher({ 
  language, 
  onLanguageChange,
  labels = {}
}: LanguageSwitcherProps) {
  const t = { ...defaultLabels, ...labels };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLanguageChange(e.target.value as Language);
  };

  return (
    <div className="language-switcher">
      <label className="language-switcher__label">{t.label}</label>
      <select 
        className="language-switcher__select"
        value={language}
        onChange={handleChange}
      >
        <option value="fr">{t.french}</option>
        <option value="en">{t.english}</option>
      </select>
    </div>
  );
}

export default LanguageSwitcher;
