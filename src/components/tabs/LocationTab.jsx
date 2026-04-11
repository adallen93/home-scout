import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useScout } from '../../context/ScoutContext'
import { fetchAllPOIs } from '../../utils/overpass'

// POI category definitions (no emojis — color dots only)
const POI_CATEGORIES = [
  { key: 'ldsMeetinghouse', label: 'LDS Meetinghouse', color: '#4a90d9' },
  { key: 'ldsTemple',       label: 'LDS Temple',       color: '#d4ac0d' },
  { key: 'walmart',         label: 'Walmart',           color: '#0071ce' },
  { key: 'grocery',         label: 'Grocery Store',     color: '#43a047' },
  { key: 'library',         label: 'Public Library',    color: '#8e44ad' },
  { key: 'hospital',        label: 'Hospital',          color: '#e53935' },
  { key: 'park',            label: 'Park',              color: '#2e7d32' },
  { key: 'campsite',        label: 'Campsite',          color: '#6d4c41' },
]

// Build Leaflet divIcons at module level so references stay stable
const PROPERTY_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:34px;height:34px;
    background:#e07a3a;
    border:3px solid #fff;
    border-radius:4px 4px 0 4px;
    transform:rotate(45deg);
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
  "></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -20],
})

const POI_ICONS = Object.fromEntries(
  POI_CATEGORIES.map(({ key, color }) => [
    key,
    L.divIcon({
      className: '',
      html: `<div style="
        width:22px;height:22px;
        background:${color};
        border:2px solid rgba(255,255,255,0.85);
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -14],
    }),
  ])
)

// Inner component — uses useMap() to fit bounds when markers change
function BoundsController({ positions }) {
  const map = useMap()
  const posKey = positions.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join('|')

  useEffect(() => {
    if (!positions.length) return
    if (positions.length === 1) {
      map.setView(positions[0], 13)
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] })
    }
  }, [posKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

const INITIAL_STATUS = Object.fromEntries(POI_CATEGORIES.map((c) => [c.key, 'loading']))

export default function LocationTab() {
  const { lat, lon, displayName, poiDistances, setPoiDistances } = useScout()
  const [poiStatus, setPoiStatus] = useState({})
  const abortRef = useRef(null)

  useEffect(() => {
    if (!lat || !lon) return

    // Cancel any in-flight queries
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Reset per-category state
    setPoiStatus(INITIAL_STATUS)
    setPoiDistances({})

    const onUpdate = (key, result, isError = false) => {
      if (controller.signal.aborted) return
      setPoiDistances((prev) => ({ ...prev, [key]: result }))
      setPoiStatus((prev) => ({ ...prev, [key]: isError ? 'error' : 'loaded' }))
    }

    fetchAllPOIs(lat, lon, onUpdate, controller.signal)

    return () => controller.abort()
  }, [lat, lon]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!lat || !lon) {
    return (
      <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
        Enter an address above to find nearby points of interest.
      </p>
    )
  }

  const propertyPos = [parseFloat(lat), parseFloat(lon)]
  const loadedPOIs = POI_CATEGORIES
    .filter((c) => poiDistances?.[c.key])
    .map((c) => ({ cat: c, data: poiDistances[c.key] }))

  const allPositions = [propertyPos, ...loadedPOIs.map((p) => [p.data.lat, p.data.lng])]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Map ── */}
      <div style={{
        height: '450px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <MapContainer
          key={`${lat},${lon}`}
          center={propertyPos}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundsController positions={allPositions} />

          {/* Property marker */}
          <Marker position={propertyPos} icon={PROPERTY_ICON}>
            <Popup>
              <strong>Property</strong>
              {displayName && <><br /><span style={{ fontSize: '0.8em' }}>{displayName}</span></>}
            </Popup>
          </Marker>

          {/* POI markers */}
          {loadedPOIs.map(({ cat, data }) => (
            <Marker key={cat.key} position={[data.lat, data.lng]} icon={POI_ICONS[cat.key]}>
              <Popup>
                <strong>{cat.label}</strong><br />
                {data.name}<br />
                <span style={{ color: '#666' }}>{data.distanceMiles.toFixed(1)} mi away</span>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ── POI Cards + Legend row on wide screens ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* POI Cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '0.625rem',
        }}>
          {POI_CATEGORIES.map((cat) => {
            const status = poiStatus[cat.key]
            const data = poiDistances?.[cat.key]

            return (
              <div
                key={cat.key}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '0.875rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: cat.color,
                  flexShrink: 0,
                  boxShadow: `0 0 0 2px ${cat.color}33`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--color-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                    {cat.label}
                  </div>
                  {!status && (
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>—</div>
                  )}
                  {status === 'loading' && (
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                      Searching...
                    </div>
                  )}
                  {status === 'loaded' && data && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{
                        color: 'var(--color-text)',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}>
                        {data.name}
                      </span>
                      <span style={{
                        color: 'var(--color-accent)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}>
                        {data.distanceMiles.toFixed(1)} mi
                      </span>
                    </div>
                  )}
                  {status === 'error' && (
                    <div style={{ color: '#b45309', fontSize: '0.875rem' }}>Unavailable</div>
                  )}
                  {status === 'loaded' && !data && (
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Not found</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '0.875rem 1rem',
        }}>
          <div style={{ color: 'var(--color-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>
            Map Legend
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem 1.25rem' }}>
            {/* Property */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{
                width: 14,
                height: 14,
                background: '#e07a3a',
                borderRadius: '3px 3px 0 3px',
                transform: 'rotate(45deg)',
                border: '2px solid #fff',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>Property</span>
            </div>
            {POI_CATEGORIES.map((cat) => (
              <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{
                  width: 12,
                  height: 12,
                  background: cat.color,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.4)',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>{cat.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
