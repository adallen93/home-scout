import { createContext, useContext, useState } from 'react'

const ScoutContext = createContext(null)

export function ScoutProvider({ children }) {
  const [lat, setLat] = useState(null)
  const [lon, setLon] = useState(null)
  const [displayName, setDisplayName] = useState(null)
  const [listingPrice, setListingPrice] = useState('')
  const [geocodeError, setGeocodeError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [poiDistances, setPoiDistances] = useState({})

  function setGeocodeResult({ lat, lon, displayName }) {
    setLat(lat)
    setLon(lon)
    setDisplayName(displayName)
  }

  return (
    <ScoutContext.Provider value={{
      lat,
      lon,
      displayName,
      setGeocodeResult,
      listingPrice,
      setListingPrice,
      geocodeError,
      setGeocodeError,
      isLoading,
      setIsLoading,
      poiDistances,
      setPoiDistances,
    }}>
      {children}
    </ScoutContext.Provider>
  )
}

export function useScout() {
  return useContext(ScoutContext)
}
