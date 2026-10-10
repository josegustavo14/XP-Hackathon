import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface PillTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const PillTabs: React.FC<PillTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`pill-tabs-container ${className}`.trim()}>
      <div className="pill-tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              className={`pill-tab ${isActive ? 'active' : ''}`}
              onClick={() => onChange(tab.id)}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`pill-tab-count ${isActive ? 'active' : ''}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
