// OpenStreetMap integration for location services
// Uses Nominatim API (free, no authentication required)

export interface Location {
  latitude: number
  longitude: number
  address: string
  city?: string
  state?: string
  country?: string
  pincode?: string
}

export interface NominatimResult {
  lat: string
  lon: string
  address: {
    road?: string
    suburb?: string
    city?: string
    district?: string
    state?: string
    postcode?: string
    country?: string
  }
  display_name: string
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'

/**
 * Reverse geocode: Convert coordinates to address
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @returns Location object with address details
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<Location | null> {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ResQ-AI-Emergency-System',
        },
      }
    )

    if (!response.ok) return null

    const data: NominatimResult = await response.json()

    return {
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      address: data.address.road || data.display_name,
      city: data.address.city || data.address.suburb,
      state: data.address.state,
      country: data.address.country,
      pincode: data.address.postcode,
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/**
 * Forward geocode: Convert address to coordinates
 * @param address - Address string
 * @param limit - Number of results to return
 * @returns Array of possible locations
 */
export async function forwardGeocode(address: string, limit: number = 5): Promise<Location[]> {
  try {
    const params = new URLSearchParams({
      format: 'json',
      q: address,
      limit: limit.toString(),
      addressdetails: '1',
      countrycodes: 'in', // Focus on India
    })

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ResQ-AI-Emergency-System',
      },
    })

    if (!response.ok) return []

    const results: NominatimResult[] = await response.json()

    return results.map(r => ({
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      address: r.address.road || r.display_name,
      city: r.address.city || r.address.suburb,
      state: r.address.state,
      country: r.address.country,
      pincode: r.address.postcode,
    }))
  } catch (error) {
    console.error('Forward geocoding error:', error)
    return []
  }
}

/**
 * Search for specific facility types near a location
 * @param latitude - Search center latitude
 * @param longitude - Search center longitude
 * @param amenity - Type of amenity (hospital, fire_station, police, etc)
 * @param radiusKm - Search radius in kilometers
 * @returns Array of nearby facilities
 */
export async function searchNearbyAmenities(
  latitude: number,
  longitude: number,
  amenity: 'hospital' | 'police' | 'fire_station' | 'clinic' | 'blood_bank',
  radiusKm: number = 5
): Promise<Location[]> {
  // Note: Nominatim doesn't support range queries directly
  // For better spatial queries, consider using Overpass API or mock data
  // This is a placeholder using forward geocode with city suggestion

  const location = await reverseGeocode(latitude, longitude)
  if (!location?.city) return []

  const amenityNames: Record<string, string> = {
    hospital: 'hospital',
    police: 'police station',
    fire_station: 'fire station',
    clinic: 'clinic',
    blood_bank: 'blood bank',
  }

  const query = `${amenityNames[amenity]} near ${location.city}`
  return forwardGeocode(query, 10)
}

/**
 * Get elevation for a location
 * Uses Open-Elevation API (free, no auth required)
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @returns Elevation in meters
 */
export async function getElevation(latitude: number, longitude: number): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${latitude},${longitude}`
    )

    if (!response.ok) return null

    const data = await response.json()
    return data.results?.[0]?.elevation || null
  } catch (error) {
    console.error('Elevation lookup error:', error)
    return null
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 - Point 1 latitude
 * @param lon1 - Point 1 longitude
 * @param lat2 - Point 2 latitude
 * @param lon2 - Point 2 longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
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

/**
 * Format coordinates as readable string
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @returns Formatted string (e.g., "19.0760° N, 72.8777° E")
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S'
  const lonDir = longitude >= 0 ? 'E' : 'W'
  return `${Math.abs(latitude).toFixed(4)}° ${latDir}, ${Math.abs(longitude).toFixed(4)}° ${lonDir}`
}

/**
 * Get bounds for a city
 * Useful for map initialization
 * @param city - City name
 * @returns Bounding box {north, south, east, west}
 */
export async function getCityBounds(
  city: string
): Promise<{ north: number; south: number; east: number; west: number } | null> {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?format=json&q=${city}&countrycodes=in&limit=1`,
      {
        headers: {
          'User-Agent': 'ResQ-AI-Emergency-System',
        },
      }
    )

    if (!response.ok) return null

    const results: any[] = await response.json()
    if (results.length === 0) return null

    const [south, north, west, east] = results[0].boundingbox.map(Number)
    return { north, south, east, west }
  } catch (error) {
    console.error('City bounds error:', error)
    return null
  }
}

/**
 * Validate if coordinates are within India
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @returns true if within India, false otherwise
 */
export function isWithinIndia(latitude: number, longitude: number): boolean {
  // India bounds: 8.4° to 35.1° N, 68.2° to 97.4° E
  return latitude >= 8.4 && latitude <= 35.1 && longitude >= 68.2 && longitude <= 97.4
}

/**
 * Parse and validate Indian phone location
 * @param phoneNumber - Indian phone number
 * @returns State/region name or null
 */
export function getRegionFromPhoneNumber(phoneNumber: string): string | null {
  // Indian phone prefixes (STD codes)
  const phoneRegions: Record<string, string> = {
    '11': 'Delhi',
    '22': 'Mumbai',
    '33': 'Kolkata',
    '44': 'Hyderabad',
    '44': 'Hyderabad',
    '40': 'Hyderabad',
    '80': 'Bangalore',
    '33': 'Kolkata',
    '22': 'Mumbai',
    '44': 'Chennai',
    '471': 'Kochi',
    '522': 'Indore',
    '551': 'Vijayawada',
  }

  const match = phoneNumber.match(/^[+]?91[- ]?(\d{2,4})/)
  if (match) {
    const code = match[1]
    return phoneRegions[code] || null
  }

  return null
}

/**
 * Mock data for offline/testing scenarios
 */
export const MOCK_MAJOR_CITIES = [
  { name: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
  { name: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { name: 'Bangalore', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Hyderabad', latitude: 17.385, longitude: 78.4867 },
  { name: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
  { name: 'Kolkata', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Pune', latitude: 18.5204, longitude: 73.8567 },
  { name: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714 },
  { name: 'Jaipur', latitude: 26.9124, longitude: 75.7873 },
  { name: 'Lucknow', latitude: 26.8467, longitude: 80.9462 },
]

export default {
  reverseGeocode,
  forwardGeocode,
  searchNearbyAmenities,
  getElevation,
  calculateDistance,
  formatCoordinates,
  getCityBounds,
  isWithinIndia,
  getRegionFromPhoneNumber,
}
