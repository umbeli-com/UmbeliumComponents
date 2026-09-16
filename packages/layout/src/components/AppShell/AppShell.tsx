import { ReactNode, useState } from 'react';

export interface AppShellProps {
  children: ReactNode;
  sidebar: ReactNode;
  topbar: ReactNode | ((props: { onMenuClick: () => void }) => ReactNode);
  chatPanel?: ReactNode;
  isChatOpen?: boolean;
}

/**
 * Chaque élément porte DEUX classes : l'historique (`app-shell__x`) et la
 * préfixée (`umb-app-shell__x`). Seule la seconde est stylée par la feuille du
 * paquet ; la première reste émise pour que rien ne bouge chez les apps déjà
 * en place — surcharges locales de Socialum (`_app-shell.scss`) et locators
 * Playwright de Dialum / UmbeliumManager. Voir AppShell.scss pour le détail.
 */
export function AppShell({ 
  children, 
  sidebar, 
  topbar, 
  chatPanel,
  isChatOpen = false 
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={`app-shell umb-app-shell ${isChatOpen ? 'chat-open' : ''}`}>
      <aside className={`app-shell__sidebar umb-app-shell__sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        {sidebar}
      </aside>

      <div 
        className={`app-shell__overlay umb-app-shell__overlay ${sidebarOpen ? 'is-visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <div className="app-shell__main umb-app-shell__main">
        <header className="app-shell__topbar umb-app-shell__topbar">
          {typeof topbar === 'function' 
            ? (topbar as (props: { onMenuClick: () => void }) => ReactNode)({ onMenuClick: toggleSidebar })
            : topbar
          }
        </header>

        <main className="app-shell__content umb-app-shell__content">
          {children}
        </main>
      </div>

      {chatPanel}
    </div>
  );
}

export default AppShell;
