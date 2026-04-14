import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { WeatherLocation } from './weather'

type MapViewProps = {
  location: WeatherLocation
  radarTileUrl?: string | null
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
      const targetZoom = fullscreen ? 7 : map.getZoom()
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

export function MapView({ location, radarTileUrl, className, fullscreen, radarOpacity = 0.72 }: MapViewProps) {
  return (
    <MapContainer
      center={[location.latitude, location.longitude]}
      zoom={7}
      minZoom={6}
      maxZoom={7}
      scrollWheelZoom={true}
      className={className ? `weather-map ${className}` : 'weather-map'}
      attributionControl={false}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {radarTileUrl ? <TileLayer url={radarTileUrl} opacity={radarOpacity} /> : null}
      <Marker position={[location.latitude, location.longitude]} icon={markerIcon} />
      <RecenterMap location={location} fullscreen={fullscreen} />
    </MapContainer>
  )
}
