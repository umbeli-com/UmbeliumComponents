import { ReactNode, useState } from 'react';

interface AppShellProps {
  children: ReactNode;
  sidebar: ReactNode;
  topbar: ReactNode | ((props: { onMenuClick: () => void }) => ReactNode);
  chatPanel?: ReactNode;
  isChatOpen?: boolean;
}

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
    <div className={`app-shell ${isChatOpen ? 'chat-open' : ''}`}>
      <aside className={`app-shell__sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        {sidebar}
      </aside>

      <div 
        className={`app-shell__overlay ${sidebarOpen ? 'is-visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <div className="app-shell__main">
        <header className="app-shell__topbar">
          {typeof topbar === 'function' 
            ? (topbar as (props: { onMenuClick: () => void }) => ReactNode)({ onMenuClick: toggleSidebar })
            : topbar
          }
        </header>

        <main className="app-shell__content">
          {children}
        </main>
      </div>

      {chatPanel}
    </div>
  );
}

export default AppShell;
