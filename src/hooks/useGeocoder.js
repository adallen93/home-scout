import { useRef } from 'react'
import { useScout } from '../context/ScoutContext'

const MIN_INTERVAL_MS = 1000

export function useGeocoder() {
  const lastRequestTime = useRef(0)
  const { setGeocodeResult, setGeocodeError, setIsLoading } = useScout()

  async function geocode(address) {
    const now = Date.now()
    const elapsed = now - lastRequestTime.current
    if (elapsed < MIN_INTERVAL_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed))
    }
    lastRequestTime.current = Date.now()

    setIsLoading(true)
    setGeocodeError(null)

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      const res = await fetch(url, {
        headers: {
          // Note: browsers silently ignore custom User-Agent headers (forbidden header).
          // The intent is documented here per Nominatim policy; it applies when run server-side.
          'User-Agent': 'ScoutApp/1.0 (home-scout-dashboard)',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data.length) {
        setGeocodeError('No results found for that address. Try adding a city or state.')
        setGeocodeResult({ lat: null, lon: null, displayName: null })
      } else {
        const { lat, lon, display_name } = data[0]
        setGeocodeResult({ lat, lon, displayName: display_name })
      }
    } catch {
      setGeocodeError('Geocoding failed. Please check your connection and try again.')
      setGeocodeResult({ lat: null, lon: null, displayName: null })
    } finally {
      setIsLoading(false)
    }
  }

  return { geocode }
}
