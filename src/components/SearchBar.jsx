import { useState } from 'react'
import { useScout } from '../context/ScoutContext'
import { useGeocoder } from '../hooks/useGeocoder'

export default function SearchBar() {
  const [addressInput, setAddressInput] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const { lat, lon, displayName, listingPrice, setListingPrice, geocodeError, isLoading } = useScout()
  const { geocode } = useGeocoder()

  function handleSubmit(e) {
    e.preventDefault()
    if (!addressInput.trim()) return
    setListingPrice(priceInput)
    geocode(addressInput.trim())
  }

  return (
    <div style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
         className="px-4 py-3">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1" style={{ minWidth: '12rem' }}>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--color-muted)' }}>
            Address
          </label>
          <input
            type="text"
            value={addressInput}
            onChange={e => setAddressInput(e.target.value)}
            placeholder="123 Main St, City, State"
            autoComplete="off"
            className="w-full px-3 py-2 rounded text-sm"
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              outline: 'none',
            }}
          />
        </div>
        <div style={{ width: '11rem' }}>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--color-muted)' }}>
            Listing Price ($)
          </label>
          <input
            type="number"
            value={priceInput}
            onChange={e => setPriceInput(e.target.value)}
            placeholder="Optional"
            min="0"
            className="w-full px-3 py-2 rounded text-sm"
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              outline: 'none',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !addressInput.trim()}
          className="px-5 py-2 rounded text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff', cursor: isLoading ? 'wait' : 'pointer' }}
        >
          {isLoading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {geocodeError && (
        <p className="mt-2 text-sm" style={{ color: '#f87171' }}>
          {geocodeError}
        </p>
      )}
      {displayName && !geocodeError && (
        <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>
          <span style={{ color: 'var(--color-accent)' }}>Resolved:</span>{' '}
          {displayName}
          <span className="ml-3 font-mono text-xs">
            ({parseFloat(lat).toFixed(5)}, {parseFloat(lon).toFixed(5)})
          </span>
          {listingPrice && (
            <span className="ml-3">
              Listed at ${Number(listingPrice).toLocaleString()}
            </span>
          )}
        </p>
      )}
    </div>
  )
}
