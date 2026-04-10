import { useState } from 'react'
import OverviewTab from './tabs/OverviewTab'
import LocationTab from './tabs/LocationTab'
import PropertyTaxTab from './tabs/PropertyTaxTab'
import SafetyTab from './tabs/SafetyTab'
import EnvironmentTab from './tabs/EnvironmentTab'
import RecreationTab from './tabs/RecreationTab'

const TABS = [
  { id: 'overview', label: 'Overview', Component: OverviewTab },
  { id: 'location', label: 'Location & Distances', Component: LocationTab },
  { id: 'property', label: 'Property & Tax', Component: PropertyTaxTab },
  { id: 'safety', label: 'Safety', Component: SafetyTab },
  { id: 'environment', label: 'Environment', Component: EnvironmentTab },
  { id: 'recreation', label: 'Recreation', Component: RecreationTab },
]

export default function TabNav() {
  const [activeTab, setActiveTab] = useState('overview')
  const { Component: ActiveComponent } = TABS.find(t => t.id === activeTab)

  return (
    <div className="flex-1 flex flex-col">
      <div className="overflow-x-auto"
           style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex" style={{ minWidth: 'max-content' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-muted)',
                borderBottom: activeTab === tab.id
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <ActiveComponent />
      </div>
    </div>
  )
}
