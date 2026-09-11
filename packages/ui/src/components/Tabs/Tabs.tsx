import { useState, ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

/**
 * Onglets.
 *
 * Deux régimes, au choix de l'app — c'est le contrat React classique :
 *
 * - NON CONTRÔLÉ (historique) : `defaultTab` pose l'onglet de départ, le
 *   composant retient la sélection. Rien ne change pour les apps existantes.
 * - CONTRÔLÉ : dès que `activeTab` est fourni, le composant n'a PLUS d'état
 *   interne ; il affiche ce que l'app lui dit et se contente de signaler les
 *   clics via `onChange`. C'est ce qui manquait à Anonymum (Front3Page) et à
 *   Monitorum (VisionBoard) : leur onglet actif est une donnée de page
 *   (`mode`, `display`), lue et écrite ailleurs que dans la barre d'onglets.
 *
 * Le panneau est optionnel (`renderPanel={false}`) : une barre d'onglets qui
 * ne pilote pas la boîte juste en dessous — parce que le contenu vit dans une
 * autre zone de la page — reste un onglet, pas un composant à réécrire.
 */

/** Chaînes lues/affichées, surchargeables. Français par défaut. */
export interface TabsLabels {
  /**
   * Nom accessible de la barre (`aria-label` du `role="tablist"`) —
   * ex. « Mode », « Affichage ». Non posé tant qu'il n'est pas fourni : le
   * DOM par défaut reste celui d'avant, au caractère près.
   */
  tablist?: string;
}

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  /**
   * Panneau de cet onglet. OPTIONNEL depuis `renderPanel={false}` : une app
   * qui place son contenu ailleurs n'a plus à inventer un `content` bidon
   * pour satisfaire le type. Le rendu du panneau, lui, est inchangé.
   */
  content?: ReactNode;
  /** Posé tel quel en `data-testid` sur le bouton de CET onglet.
   *  Contrat des suites Playwright des apps (ex. `f2-mode-text`). */
  testId?: string;
}

export interface TabsProps {
  tabs: Tab[];
  /** Onglet ouvert au montage, régime NON CONTRÔLÉ. Ignoré si `activeTab`. */
  defaultTab?: string;
  /**
   * Onglet actif, régime CONTRÔLÉ. Fourni ⇒ aucun état interne : ce que l'app
   * passe est ce qui s'affiche, et un clic ne change rien tant que l'app n'a
   * pas mis sa propre valeur à jour.
   */
  activeTab?: string;
  onChange?: (tabId: string) => void;
  /** `segmented` = bascule compacte façon interrupteur (Anonymum
   *  `.f2docs-switch`, Monitorum `.mo-display-toggle`). */
  variant?: 'default' | 'pills' | 'segmented';
  /** Rendre la boîte de contenu sous la barre. Défaut : `true` (historique).
   *  `false` ⇒ la barre est seule, l'app place le contenu où elle veut. */
  renderPanel?: boolean;
  className?: string;
  /** Classe posée sur la barre elle-même (`.tabs__list`) — utile quand la
   *  barre doit se placer dans un en-tête (`margin-left: auto`…). */
  listClassName?: string;
  /** Classe posée sur le panneau (`.tabs__content`). */
  panelClassName?: string;
  /** Posé en `data-testid` sur la racine ; la barre et le panneau reçoivent
   *  alors `<testId>-list` et `<testId>-panel`. Les onglets, eux, portent
   *  leur propre `Tab.testId` — les apps ont des noms non dérivables. */
  testId?: string;
  labels?: TabsLabels;
}

export function Tabs({
  tabs,
  defaultTab,
  activeTab,
  onChange,
  variant = 'default',
  renderPanel = true,
  className = '',
  listClassName = '',
  panelClassName = '',
  testId,
  labels,
}: TabsProps) {
  // `activeTab` fourni = l'app tient la vérité. On garde quand même le
  // `useState` monté (les Hooks ne se conditionnent pas) ; il n'est simplement
  // plus lu ni écrit.
  const isControlled = activeTab !== undefined;
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.id);
  const currentTab = isControlled ? activeTab : internalTab;

  const t = { ...labels };

  const handleTabClick = (tabId: string) => {
    if (!isControlled) setInternalTab(tabId);
    onChange?.(tabId);
  };

  const activeContent = tabs.find(tab => tab.id === currentTab)?.content;

  // Les chaînes de classes gardent la forme historique au caractère près quand
  // les nouvelles props sont à leur défaut : chaque modificateur ajouté porte
  // son propre espace de tête, donc il n'insère rien quand il est absent.
  return (
    <div
      className={`tabs tabs--${variant}${renderPanel ? '' : ' tabs--no-panel'}${className ? ` ${className}` : ''}`}
      {...(testId !== undefined ? { 'data-testid': testId } : null)}
    >
      <div
        className={`tabs__list${listClassName ? ` ${listClassName}` : ''}`}
        role="tablist"
        {...(t.tablist !== undefined ? { 'aria-label': t.tablist } : null)}
        {...(testId !== undefined ? { 'data-testid': `${testId}-list` } : null)}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tabs__tab ${currentTab === tab.id ? 'tabs__tab--active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            role="tab"
            aria-selected={currentTab === tab.id}
            {...(tab.testId !== undefined ? { 'data-testid': tab.testId } : null)}
          >
            {tab.icon && <span className="tabs__tab-icon">{tab.icon}</span>}
            <span className="tabs__tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      {renderPanel && (
        <div
          className={`tabs__content${panelClassName ? ` ${panelClassName}` : ''}`}
          role="tabpanel"
          {...(testId !== undefined ? { 'data-testid': `${testId}-panel` } : null)}
        >
          {activeContent}
        </div>
      )}
    </div>
  );
}

export default Tabs;
