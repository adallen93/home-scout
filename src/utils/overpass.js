const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

function milesToMeters(miles) {
  return Math.round(miles * 1609.34)
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function queryOverpass(ql, signal) {
  // Try primary twice (brief pause between), then fall back to mirror
  const schedule = [
    { url: OVERPASS_URLS[0], delay: 0 },
    { url: OVERPASS_URLS[0], delay: 2000 },
    { url: OVERPASS_URLS[1], delay: 0 },
  ]
  for (const { url, delay } of schedule) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(ql),
      signal,
    })
    if (res.ok) return res.json()
  }
  throw new Error('Overpass unavailable after retry')
}

function normalize(data) {
  return (data.elements || [])
    .map((el) => ({
      name: el.tags?.name ?? 'Unnamed',
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      tags: el.tags ?? {},
    }))
    .filter((el) => el.lat != null && el.lng != null)
}

function findNearest(elements, lat, lon) {
  if (!elements.length) return null
  return elements
    .map((el) => ({
      ...el,
      distanceMiles: haversineDistance(lat, lon, el.lat, el.lng),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)[0]
}

function singleQuery(tag, radiusM, lat, lon) {
  return `[out:json][timeout:25];\nnwr${tag}(around:${radiusM},${lat},${lon});\nout center;`
}

function stagger(ms) {
  return new Promise((res) => setTimeout(res, ms))
}

async function fetchLDSBatch(lat, lon, onUpdate, signal) {
  try {
    // Query all LDS POIs at 30mi (covers meetinghouse max + temple initial).
    // OSM tags: religion=christian, denomination=latter_day_saints OR denomination=mormon
    const data = await queryOverpass(
      singleQuery(`["amenity"="place_of_worship"]["denomination"~"latter_day_saints|mormon"]`, milesToMeters(30), lat, lon),
      signal
    )
    const all = normalize(data)
    const meetinghouses = all.filter((el) => !el.name.toLowerCase().includes('temple'))
    const temples = all.filter((el) => el.name.toLowerCase().includes('temple'))

    onUpdate('ldsMeetinghouse', findNearest(meetinghouses, lat, lon))

    let temple = findNearest(temples, lat, lon)
    if (!temple) {
      // Expand to 100mi for temple
      const data2 = await queryOverpass(
        singleQuery(`["amenity"="place_of_worship"]["denomination"~"latter_day_saints|mormon"]`, milesToMeters(100), lat, lon),
        signal
      )
      const all2 = normalize(data2)
      const temples2 = all2.filter((el) => el.name.toLowerCase().includes('temple'))
      temple = findNearest(temples2, lat, lon) ?? null
    }
    onUpdate('ldsTemple', temple)
  } catch (err) {
    if (err.name === 'AbortError') return
    console.error('LDS query failed', err)
    onUpdate('ldsMeetinghouse', null, true)
    onUpdate('ldsTemple', null, true)
  }
}

async function fetchSupermarketBatch(lat, lon, onUpdate, signal) {
  try {
    // Initial query at 5mi (grocery minimum)
    const data = await queryOverpass(
      singleQuery(`["shop"="supermarket"]`, milesToMeters(5), lat, lon),
      signal
    )
    const all = normalize(data)
    const walmarts = all.filter((el) => el.name.toLowerCase().includes('walmart'))
    const groceries = all.filter((el) => !el.name.toLowerCase().includes('walmart'))

    // Walmart: if not in 5mi, expand to 50mi using brand=Walmart (exact match, no regex timeout)
    let walmart = findNearest(walmarts, lat, lon)
    if (!walmart) {
      const radiusM = milesToMeters(50)
      const data2 = await queryOverpass(
        `[out:json][timeout:25];\n(\n  nwr["brand"="Walmart"]["shop"="supermarket"](around:${radiusM},${lat},${lon});\n  nwr["brand"="Walmart"]["shop"="department_store"](around:${radiusM},${lat},${lon});\n);\nout center;`,
        signal
      )
      walmart = findNearest(normalize(data2), lat, lon) ?? null
    }
    onUpdate('walmart', walmart ?? null)

    // Grocery: if not in 5mi, expand to 15mi
    let grocery = findNearest(groceries, lat, lon)
    if (!grocery) {
      const data2 = await queryOverpass(
        singleQuery(`["shop"="supermarket"]`, milesToMeters(15), lat, lon),
        signal
      )
      const expanded = normalize(data2).filter((el) => !el.name.toLowerCase().includes('walmart'))
      grocery = findNearest(expanded, lat, lon) ?? null
    }
    onUpdate('grocery', grocery ?? null)
  } catch (err) {
    if (err.name === 'AbortError') return
    console.error('Supermarket query failed', err)
    onUpdate('walmart', null, true)
    onUpdate('grocery', null, true)
  }
}

async function fetchAmenitiesBatch(lat, lon, onUpdate, signal) {
  try {
    // Library (10mi) + Hospital (10mi) combined
    const data = await queryOverpass(
      `[out:json][timeout:30];\n(\n  nwr["amenity"="library"](around:${milesToMeters(10)},${lat},${lon});\n  nwr["amenity"="hospital"](around:${milesToMeters(10)},${lat},${lon});\n);\nout center;`,
      signal
    )
    const all = normalize(data)
    const libraries = all.filter((el) => el.tags?.amenity === 'library')
    const hospitals = all.filter((el) => el.tags?.amenity === 'hospital')

    let library = findNearest(libraries, lat, lon)
    if (!library) {
      const d2 = await queryOverpass(singleQuery(`["amenity"="library"]`, milesToMeters(20), lat, lon), signal)
      library = findNearest(normalize(d2), lat, lon) ?? null
    }
    onUpdate('library', library ?? null)

    let hospital = findNearest(hospitals, lat, lon)
    if (!hospital) {
      const d2 = await queryOverpass(singleQuery(`["amenity"="hospital"]`, milesToMeters(30), lat, lon), signal)
      hospital = findNearest(normalize(d2), lat, lon) ?? null
    }
    onUpdate('hospital', hospital ?? null)
  } catch (err) {
    if (err.name === 'AbortError') return
    console.error('Amenities query failed', err)
    onUpdate('library', null, true)
    onUpdate('hospital', null, true)
  }
}

async function fetchRecreationBatch(lat, lon, onUpdate, signal) {
  try {
    // Park (5mi) + Campsite (15mi) combined
    const data = await queryOverpass(
      `[out:json][timeout:30];\n(\n  nwr["leisure"="park"](around:${milesToMeters(5)},${lat},${lon});\n  nwr["tourism"="camp_site"](around:${milesToMeters(15)},${lat},${lon});\n);\nout center;`,
      signal
    )
    const all = normalize(data)
    const parks = all.filter((el) => el.tags?.leisure === 'park')
    const campsites = all.filter((el) => el.tags?.tourism === 'camp_site')

    let park = findNearest(parks, lat, lon)
    if (!park) {
      const d2 = await queryOverpass(singleQuery(`["leisure"="park"]`, milesToMeters(15), lat, lon), signal)
      park = findNearest(normalize(d2), lat, lon) ?? null
    }
    onUpdate('park', park ?? null)

    let campsite = findNearest(campsites, lat, lon)
    if (!campsite) {
      const d2 = await queryOverpass(singleQuery(`["tourism"="camp_site"]`, milesToMeters(50), lat, lon), signal)
      campsite = findNearest(normalize(d2), lat, lon) ?? null
    }
    onUpdate('campsite', campsite ?? null)
  } catch (err) {
    if (err.name === 'AbortError') return
    console.error('Recreation query failed', err)
    onUpdate('park', null, true)
    onUpdate('campsite', null, true)
  }
}

export function fetchAllPOIs(lat, lon, onUpdate, signal) {
  // Fire all 4 batches with staggered start times (respects Overpass rate limits)
  fetchLDSBatch(lat, lon, onUpdate, signal)
  stagger(400).then(() => { if (!signal.aborted) fetchSupermarketBatch(lat, lon, onUpdate, signal) })
  stagger(800).then(() => { if (!signal.aborted) fetchAmenitiesBatch(lat, lon, onUpdate, signal) })
  stagger(1200).then(() => { if (!signal.aborted) fetchRecreationBatch(lat, lon, onUpdate, signal) })
}
