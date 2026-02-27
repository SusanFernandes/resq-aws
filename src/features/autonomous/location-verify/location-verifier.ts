// Location verification and validation
// Ensures emergency locations are valid and verified through multiple methods
// Feature A7: Location Verification & Validation

import { reverseGeocode, forwardGeocode, calculateDistance, isWithinIndia } from '@/lib/osm/geocoding'

export interface VerifiedLocation {
  latitude: number
  longitude: number
  address: string
  city: string
  state: string
  confidence: number // 0-100: how confident in this location?
  method: 'gps' | 'address_match' | 'manual_input' | 'phone_location'
  verified: boolean
  alternatives?: Location[]
  riskLevel: 'safe' | 'caution' | 'uncertain'
}

export interface Location {
  latitude: number
  longitude: number
  address: string
  city?: string
  state?: string
  confidence?: number
}

/**
 * Verify emergency location from multiple sources
 * @param callerInput - What the caller said about location
 * @param gpsLocation - GPS coordinates if available
 * @param phoneLocation - Location from phone data if available
 * @returns Verified location with confidence score
 */
export async function verifyLocation(
  callerInput: string,
  gpsLocation?: { latitude: number; longitude: number },
  phoneLocation?: string
): Promise<VerifiedLocation> {
  const results: VerifiedLocation[] = []

  // Method 1: GPS verification (most reliable)
  if (gpsLocation) {
    const gpsResult = await verifyGPSLocation(gpsLocation)
    if (gpsResult) results.push(gpsResult)
  }

  // Method 2: Reverse geocode caller input
  const addressResult = await verifyAddressInput(callerInput)
  if (addressResult) results.push(addressResult)

  // Method 3: Phone location if available
  if (phoneLocation) {
    const phoneResult = await verifyPhoneLocation(phoneLocation)
    if (phoneResult) results.push(phoneResult)
  }

  // Merge and validate results
  if (results.length === 0) {
    return {
      latitude: 0,
      longitude: 0,
      address: callerInput,
      city: 'Unknown',
      state: 'Unknown',
      confidence: 0,
      method: 'manual_input',
      verified: false,
      riskLevel: 'uncertain',
    }
  }

  return mergeLocationResults(results)
}

/**
 * Verify GPS location
 */
async function verifyGPSLocation(location: {
  latitude: number
  longitude: number
}): Promise<VerifiedLocation | null> {
  // Validate coordinates are within India
  if (!isWithinIndia(location.latitude, location.longitude)) {
    return null
  }

  // Reverse geocode to get address
  const geocoded = await reverseGeocode(location.latitude, location.longitude)
  if (!geocoded) return null

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    address: geocoded.address,
    city: geocoded.city || 'Unknown',
    state: geocoded.state || 'Unknown',
    confidence: 95, // GPS is very reliable
    method: 'gps',
    verified: true,
    riskLevel: 'safe',
  }
}

/**
 * Verify address input from caller
 */
async function verifyAddressInput(input: string): Promise<VerifiedLocation | null> {
  if (!input || input.trim().length < 3) return null

  // Forward geocode the input
  const results = await forwardGeocode(input, 1)
  if (results.length === 0) return null

  const location = results[0]

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address,
    city: location.city || 'Unknown',
    state: location.state || 'Unknown',
    confidence: 70, // Address matching is less reliable than GPS
    method: 'address_match',
    verified: true,
    riskLevel: 'caution',
  }
}

/**
 * Verify phone location data
 */
async function verifyPhoneLocation(locationString: string): Promise<VerifiedLocation | null> {
  // Try to parse location string and geocode it
  const results = await forwardGeocode(locationString, 1)
  if (results.length === 0) return null

  const location = results[0]

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address,
    city: location.city || 'Unknown',
    state: location.state || 'Unknown',
    confidence: 60, // Phone location may be approximate
    method: 'phone_location',
    verified: true,
    riskLevel: 'caution',
  }
}

/**
 * Merge multiple location verification results
 */
function mergeLocationResults(results: VerifiedLocation[]): VerifiedLocation {
  if (results.length === 1) return results[0]

  // If we have GPS, use it
  const gpsResult = results.find(r => r.method === 'gps')
  if (gpsResult) return gpsResult

  // Otherwise, average the coordinates and take the highest confidence
  let avgLat = 0
  let avgLng = 0
  let highestConfidence = 0
  let bestResult = results[0]

  for (const result of results) {
    avgLat += result.latitude
    avgLng += result.longitude

    if (result.confidence > highestConfidence) {
      highestConfidence = result.confidence
      bestResult = result
    }
  }

  avgLat /= results.length
  avgLng /= results.length

  // Check if all results agree (within 500m)
  const distance = calculateDistance(
    results[0].latitude,
    results[0].longitude,
    results[1].latitude,
    results[1].longitude
  )

  const consistent = distance < 0.5 // Less than 500m apart

  return {
    ...bestResult,
    latitude: avgLat,
    longitude: avgLng,
    confidence: consistent ? 80 : 60,
    verified: consistent,
    riskLevel: consistent ? 'safe' : 'caution',
  }
}

/**
 * Ask caller for location clarification
 */
export function generateLocationQuestions(location: VerifiedLocation): string[] {
  const questions = []

  if (location.confidence < 60) {
    questions.push(`Is the emergency at ${location.address}?`)
    questions.push(`What is the nearest intersection or landmark?`)
    questions.push(`What building or facility are you in?`)
  }

  if (location.riskLevel === 'uncertain') {
    questions.push(`Can you describe the area around you?`)
    questions.push(`What is the main road or street name?`)
    questions.push(`Is there a nearby hospital or police station you know?`)
  }

  return questions
}

/**
 * Validate location before dispatch
 */
export function isLocationValidForDispatch(location: VerifiedLocation): {
  valid: boolean
  reason: string
  needsClarification: boolean
} {
  if (location.confidence < 50) {
    return {
      valid: false,
      reason: 'Location confidence too low for dispatch',
      needsClarification: true,
    }
  }

  if (!location.verified) {
    return {
      valid: false,
      reason: 'Location not verified',
      needsClarification: true,
    }
  }

  if (location.latitude === 0 && location.longitude === 0) {
    return {
      valid: false,
      reason: 'No valid coordinates available',
      needsClarification: true,
    }
  }

  return {
    valid: true,
    reason: 'Location verified and ready for dispatch',
    needsClarification: false,
  }
}

/**
 * Format location for display
 */
export function formatLocation(location: VerifiedLocation): string {
  return `${location.address}, ${location.city}, ${location.state}`
}

/**
 * Get nearby landmark suggestions for location
 */
export async function getNearbyLandmarks(
  location: VerifiedLocation,
  landmarkType: 'hospital' | 'police' | 'fire_station' = 'hospital'
): Promise<Location[]> {
  // This would use OSM data to find nearby landmarks
  // For now, return empty as landmark search requires Overpass API
  // or cached mock data
  return []
}

/**
 * Suggest corrections if location seems wrong
 */
export async function suggestLocationCorrection(input: string): Promise<Location[] | null> {
  // Try forward geocoding with slightly different inputs
  const suggestions = await forwardGeocode(input, 3)
  return suggestions.length > 0 ? suggestions : null
}

/**
 * Location validation rules
 */
export const LOCATION_VALIDATION_RULES = {
  MIN_CONFIDENCE: 50,
  MAX_DISPATCH_UNCERTAINTY: 'caution',
  GPS_RADIUS_M: 100, // GPS must be within 100m for dispatch
  ADDRESS_MATCH_RADIUS_M: 500, // Address match can be within 500m
  INDIA_BOUNDS: {
    minLat: 8.4,
    maxLat: 35.1,
    minLng: 68.2,
    maxLng: 97.4,
  },
}

/**
 * Location quality scoring
 */
export function scoreLocationQuality(location: VerifiedLocation): {
  score: number
  factors: Record<string, boolean>
} {
  const factors = {
    has_gps: location.method === 'gps',
    verified: location.verified,
    high_confidence: location.confidence > 75,
    has_address: location.address && location.address !== '',
    has_city: location.city && location.city !== 'Unknown',
    safe_risk: location.riskLevel === 'safe',
    within_india: isWithinIndia(location.latitude, location.longitude),
  }

  const factorCount = Object.values(factors).filter(Boolean).length
  const score = (factorCount / Object.keys(factors).length) * 100

  return { score, factors }
}

export default {
  verifyLocation,
  generateLocationQuestions,
  isLocationValidForDispatch,
  formatLocation,
  getNearbyLandmarks,
  suggestLocationCorrection,
  scoreLocationQuality,
  LOCATION_VALIDATION_RULES,
}
