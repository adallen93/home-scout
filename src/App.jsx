import { ScoutProvider } from './context/ScoutContext'
import SearchBar from './components/SearchBar'
import TabNav from './components/TabNav'
import Footer from './components/Footer'

export default function App() {
  return (
    <ScoutProvider>
      <div className="flex flex-col" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <header
          className="px-5 py-3 flex items-center"
          style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          <span className="text-lg font-semibold tracking-wide" style={{ color: 'var(--color-accent)' }}>
            Scout
          </span>
          <span className="ml-3 text-xs" style={{ color: 'var(--color-muted)' }}>
            Home Search Dashboard
          </span>
        </header>
        <SearchBar />
        <TabNav />
        <Footer />
      </div>
    </ScoutProvider>
  )
}
