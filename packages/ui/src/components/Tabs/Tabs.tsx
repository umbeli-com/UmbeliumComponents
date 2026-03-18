import { useState, ReactNode } from 'react';
// Styles are imported separately via @umbeli-com/ui/styles

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'pills';
}

export function Tabs({ tabs, defaultTab, onChange, variant = 'default' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={`tabs tabs--${variant}`}>
      <div className="tabs__list" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tabs__tab ${activeTab === tab.id ? 'tabs__tab--active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.icon && <span className="tabs__tab-icon">{tab.icon}</span>}
            <span className="tabs__tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tabs__content" role="tabpanel">
        {activeContent}
      </div>
    </div>
  );
}

export default Tabs;
