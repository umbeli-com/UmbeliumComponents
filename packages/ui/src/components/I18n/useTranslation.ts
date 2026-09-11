import { useContext } from 'react';
import { I18nContext, type I18nContextValue } from './I18nProvider';
import { isDevEnvironment, type I18nParams } from './createI18n';

/**
 * Retour du hook. Le paramètre de type permet de resserrer les codes de langue
 * côté app : `useTranslation<'fr' | 'en'>()`.
 */
export interface UseTranslationResult<Language extends string = string> {
  /** Traduit une clé pointée (`'nav.dashboard'`). Rend LA CLÉ si absente. */
  t: (key: string, params?: I18nParams) => string;
  /** Nœud brut (tableau de FAQ, objet…) pour les contenus non textuels. */
  raw: <T = unknown>(key: string, fallback?: T) => T | undefined;
  /** Langue courante. */
  language: Language;
  /** Change la langue, la persiste et estampe `<html lang>`. */
  setLanguage: (language: Language) => void;
  /** Codes de langue disponibles dans les ressources. */
  languages: string[];
}

let warnedMissingProvider = false;

/**
 * Le contexte porte `language: string` ; le paramètre de type n'est qu'un
 * confort d'appel côté app (`useTranslation<'fr' | 'en'>()`). La conversion est
 * donc purement statique — rien ne change à l'exécution, et l'identité de
 * l'objet retourné reste stable entre deux rendus.
 */
function asResult<Language extends string>(
  context: I18nContextValue,
): UseTranslationResult<Language> {
  return context as unknown as UseTranslationResult<Language>;
}

/**
 * Repli hors provider : l'app affiche les clés brutes mais NE PLANTE PAS.
 * Un sous-arbre rendu hors du provider (portail, error boundary, page 500)
 * ne doit jamais faire tomber l'application entière pour une traduction.
 */
const FALLBACK_CONTEXT: I18nContextValue = {
  t: (key, params) => (typeof params?.defaultValue === 'string' ? params.defaultValue : key),
  raw: <T,>(_key: string, fallback?: T) => fallback,
  language: 'fr',
  setLanguage: () => {},
  languages: [],
};

/**
 * Accès aux traductions sous un `<I18nProvider>`.
 *
 * ```tsx
 * const { t, language, setLanguage } = useTranslation();
 * <h1>{t('dashboard.title')}</h1>
 * <p>{t('billing.trialUntil', { date: '30 juin' })}</p>
 * ```
 */
export function useTranslation<Language extends string = string>(): UseTranslationResult<Language> {
  const context = useContext(I18nContext);

  if (context === undefined) {
    if (!warnedMissingProvider && isDevEnvironment()) {
      warnedMissingProvider = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[@umbeli-com/ui] useTranslation() a été appelé en dehors d'un <I18nProvider> : " +
          'les clés de traduction sont rendues telles quelles. Enveloppez votre application ' +
          'avec <I18nProvider resources={{ fr, en }} storageKey="…">.',
      );
    }
    return asResult<Language>(FALLBACK_CONTEXT);
  }

  return asResult<Language>(context);
}
