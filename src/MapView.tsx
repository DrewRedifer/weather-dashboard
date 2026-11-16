import { MapContainer, Marker, TileLayer, WMSTileLayer, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { WeatherLocation } from './weather'

type MapViewProps = {
  location: WeatherLocation
  className?: string
  fullscreen?: boolean
  radarOpacity?: number
}

const markerIcon = L.divIcon({
  className: 'weather-marker',
  html: '<div class="weather-marker__dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function RecenterMap({ location, fullscreen }: MapViewProps) {
  const map = useMap()

  useEffect(() => {
    const rerenderMap = () => {
      map.invalidateSize()
      const targetZoom = fullscreen ? 10 : map.getZoom()
      map.setView([location.latitude, location.longitude], targetZoom, { animate: false })
    }

    rerenderMap()
    const timeoutId = window.setTimeout(rerenderMap, 60)
    const secondTimeoutId = window.setTimeout(rerenderMap, 220)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearTimeout(secondTimeoutId)
    }
  }, [map, location, fullscreen])

  return null
}

const KMLB_COVERAGE = {
  north: 33.113,
  south: 23.11355,
  east: -75.65455,
  west: -85.654,
}

function isWithinKmlbCoverage(location: WeatherLocation) {
  return location.latitude >= KMLB_COVERAGE.south
    && location.latitude <= KMLB_COVERAGE.north
    && location.longitude >= KMLB_COVERAGE.west
    && location.longitude <= KMLB_COVERAGE.east
}

export function MapView({ location, className, fullscreen, radarOpacity = 0.72 }: MapViewProps) {
  const useLocalRadar = isWithinKmlbCoverage(location)

  return (
    <MapContainer
      center={[location.latitude, location.longitude]}
      zoom={9}
      minZoom={6}
      maxZoom={14}
      scrollWheelZoom={true}
      className={className ? `weather-map ${className}` : 'weather-map'}
      attributionControl={false}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <WMSTileLayer
        key={useLocalRadar ? 'kmlb' : 'conus'}
        url={useLocalRadar
          ? 'https://opengeo.ncep.noaa.gov/geoserver/kmlb/wms'
          : 'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows'}
        layers={useLocalRadar ? 'kmlb_sr_bref' : 'conus_bref_qcd'}
        styles="radar_reflectivity"
        format="image/png"
        transparent
        opacity={radarOpacity}
        attribution="NOAA / National Weather Service"
      />
      <Marker position={[location.latitude, location.longitude]} icon={markerIcon} />
      <RecenterMap location={location} fullscreen={fullscreen} />
    </MapContainer>
  )
}
