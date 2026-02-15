'use client'

import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useRef, useState } from 'react'
import { WebSocketData } from "@/types/emergency"
import { useEmergencyStore } from '@/lib/store/emergency'

mapboxgl.accessToken = 'pk.eyJ1Ijoic2hhcmlhbiIsImEiOiJjbDg0aGQxNG8wZnhnM25sa3VlYzk1NzVtIn0.BxFbcyCbxdoSXAmSgcS5og'

interface MapViewProps {
  wsData: WebSocketData | null
}

export function MapView({ wsData }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const popup = useRef<mapboxgl.Popup | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  
  const selectedEmergency = useEmergencyStore((state) => state.selectedEmergency)

  useEffect(() => {
    if (!mapContainer.current) return

    const newMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [72.8777, 19.0760], // Mumbai coordinates
      zoom: 12
    })

    newMap.on('load', () => {
      console.log('Map loaded successfully')
      setMapLoaded(true)
      map.current = newMap
    })

    return () => {
      popup.current?.remove()
      marker.current?.remove()
      newMap.remove()
    }
  }, [])

  // Update marker when selected emergency changes
  useEffect(() => {
    if (!mapLoaded || !map.current || !selectedEmergency) {
      if (marker.current) {
        marker.current.remove()
        marker.current = null
      }
      if (popup.current) {
        popup.current.remove()
        popup.current = null
      }
      return
    }

    // Remove existing marker and popup
    marker.current?.remove()
    popup.current?.remove()

    const [lng, lat] = selectedEmergency.coordinates

    // Create new popup
    popup.current = new mapboxgl.Popup({ 
      offset: 25, 
      maxWidth: '300px',
      closeButton: false,
      closeOnClick: false
    })
      .setHTML(
        `<div class="p-2">
          ${selectedEmergency.imageUrl ? 
            `<img 
              src="${selectedEmergency.imageUrl}" 
              alt="${selectedEmergency.location}"
              class="w-full h-32 object-cover rounded-lg mb-2"
            />` : ''
          }
          <h3 class="font-bold">${selectedEmergency.nature}</h3>
          <p class="text-sm text-gray-500">${selectedEmergency.location}</p>
          <p class="mt-2">${selectedEmergency.details}</p>
        </div>`
      )

    // Create new marker
    marker.current = new mapboxgl.Marker({ color: '#FF0000' })
      .setLngLat([lng, lat])
      .setPopup(popup.current)
      .addTo(map.current)

    // Fly to marker
    map.current.flyTo({
      center: [lng, lat],
      zoom: 14,
      essential: true
    })

    // Show popup after a short delay to ensure smooth animation
    setTimeout(() => {
      popup.current?.addTo(map.current!)
    }, 1000)

  }, [selectedEmergency, mapLoaded])

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full rounded-lg border"
      style={{ minHeight: '500px' }}
    />
  )
} 