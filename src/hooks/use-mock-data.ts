// Frontend hook to load and manage mock data
// Provides facilities, locations, and example calls for testing

import { useEffect, useState } from 'react'

export interface MockDataStore {
  facilities: any
  locations: any
  emergencyExamples: any
  isLoading: boolean
  error: string | null
}

export function useMockData(): MockDataStore {
  const [data, setData] = useState<MockDataStore>({
    facilities: null,
    locations: null,
    emergencyExamples: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load all mock data in parallel
        const [facilitiesRes, locationsRes, callsRes] = await Promise.all([
          fetch('/mock-data/facilities-india.json'),
          fetch('/mock-data/locations.json'),
          fetch('/mock-data/emergency-calls.json'),
        ])

        if (!facilitiesRes.ok || !locationsRes.ok || !callsRes.ok) {
          throw new Error('Failed to load mock data')
        }

        const [facilities, locations, emergencyExamples] = await Promise.all([
          facilitiesRes.json(),
          locationsRes.json(),
          callsRes.json(),
        ])

        setData({
          facilities,
          locations,
          emergencyExamples,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('Failed to load mock data:', err)
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }))
      }
    }

    loadData()
  }, [])

  return data
}

/**
 * Get a random emergency example for testing
 */
export function getRandomEmergencyExample(mockData: MockDataStore) {
  if (!mockData.emergencyExamples?.emergencyCallExamples) return null
  const examples = mockData.emergencyExamples.emergencyCallExamples
  return examples[Math.floor(Math.random() * examples.length)]
}

/**
 * Get facilities near a location
 */
export function getNearbyFacilities(
  location: { latitude: number; longitude: number },
  facilities: any,
  type?: string,
  radiusKm: number = 5
) {
  if (!facilities) return []

  const allFacilities = [
    ...(facilities.hospitals || []),
    ...(facilities.clinics || []),
    ...(facilities.blood_banks || []),
    ...(facilities.fire_stations || []),
    ...(facilities.police_stations || []),
  ]

  const filtered = type ? allFacilities.filter(f => f.type === type) : allFacilities

  // Calculate distance and filter
  return filtered
    .map(f => ({
      ...f,
      distance: calculateDistance(
        location.latitude,
        location.longitude,
        f.latitude,
        f.longitude
      ),
    }))
    .filter(f => f.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default useMockData
