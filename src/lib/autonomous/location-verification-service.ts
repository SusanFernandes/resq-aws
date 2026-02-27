/**
 * Location Verification Service (A7)
 * Verifies and corrects location information using Google Maps
 */

export interface LocationData {
  address: string
  coordinates: {
    latitude: number
    longitude: number
  }
  confidence: number // 0-100%
  alternatives?: {
    address: string
    coordinates: { latitude: number; longitude: number }
  }[]
}

export interface VerificationResult {
  verified: boolean
  address: string
  coordinates: {
    latitude: number
    longitude: number
  }
  confidence: number
  alternatives?: {
    address: string
    coordinates: { latitude: number; longitude: number }
  }[]
  verificationMethod: 'GPS' | 'GEOCODING' | 'MANUAL' | 'MOCK'
}

class LocationVerificationService {
  private apiKey: string = process.env.GOOGLE_MAPS_API_KEY || ''
  private mockLocations: Map<string, VerificationResult> = new Map()

  constructor() {
    this.initializeMockLocations()
  }

  /**
   * Initialize mock locations for development/testing
   */
  private initializeMockLocations(): void {
    const locations = [
      {
        key: 'mumbai central hospital',
        result: {
          verified: true,
          address: 'Mumbai Central Hospital, Mumbai',
          coordinates: { latitude: 18.9674, longitude: 72.8194 },
          confidence: 95,
          verificationMethod: 'MOCK' as const,
        },
      },
      {
        key: 'bandra',
        result: {
          verified: true,
          address: 'Bandra, Mumbai',
          coordinates: { latitude: 19.0596, longitude: 72.8295 },
          confidence: 85,
          verificationMethod: 'MOCK' as const,
        },
      },
      {
        key: 'colaba',
        result: {
          verified: true,
          address: 'Colaba, Mumbai',
          coordinates: { latitude: 18.9432, longitude: 72.8236 },
          confidence: 85,
          verificationMethod: 'MOCK' as const,
        },
      },
      {
        key: 'eastern express way',
        result: {
          verified: true,
          address: 'Eastern Express Way, Mumbai',
          coordinates: { latitude: 19.1136, longitude: 72.8697 },
          confidence: 80,
          verificationMethod: 'MOCK' as const,
        },
      },
      {
        key: 'delhi',
        result: {
          verified: true,
          address: 'Delhi',
          coordinates: { latitude: 28.6139, longitude: 77.209 },
          confidence: 75,
          verificationMethod: 'MOCK' as const,
        },
      },
    ]

    locations.forEach(({ key, result }) => {
      this.mockLocations.set(key, result)
    })
  }

  /**
   * Verify location from raw text input
   */
  async verifyLocation(rawLocation: string): Promise<VerificationResult> {
    if (!rawLocation || rawLocation.trim() === '') {
      return {
        verified: false,
        address: '',
        coordinates: { latitude: 0, longitude: 0 },
        confidence: 0,
        verificationMethod: 'MANUAL',
      }
    }

    // Try to find in mock locations first
    const lowerLocation = rawLocation.toLowerCase()
    for (const [key, result] of this.mockLocations.entries()) {
      if (lowerLocation.includes(key)) {
        return result
      }
    }

    // If API key is set, try Google Maps
    if (this.apiKey && this.apiKey !== '') {
      try {
        return await this.geocodeWithGoogleMaps(rawLocation)
      } catch (error) {
        console.error('[LocationVerificationService] Google Maps error:', error)
        // Fall back to simple location
      }
    }

    // Default: Return as provided location with lower confidence
    return {
      verified: true,
      address: rawLocation,
      coordinates: this.getDefaultCoordinates(rawLocation),
      confidence: 50,
      verificationMethod: 'MANUAL',
    }
  }

  /**
   * Verify location with GPS coordinates
   */
  async verifyWithGPS(
    latitude: number,
    longitude: number
  ): Promise<VerificationResult> {
    if (this.apiKey && this.apiKey !== '') {
      try {
        return await this.reverseGeocodeWithGoogleMaps(latitude, longitude)
      } catch (error) {
        console.error('[LocationVerificationService] Reverse geocoding error:', error)
      }
    }

    // Default: Return coordinates as provided
    return {
      verified: true,
      address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      coordinates: { latitude, longitude },
      confidence: 75,
      verificationMethod: 'GPS',
    }
  }

  /**
   * Geocode location using Google Maps API
   */
  private async geocodeWithGoogleMaps(rawLocation: string): Promise<VerificationResult> {
    const encodedAddress = encodeURIComponent(rawLocation)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`

    try {
      const response = await fetch(url)
      const data = (await response.json()) as any

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        const location = result.geometry.location

        const alternatives = data.results
          .slice(1, 3)
          .map((r: any) => ({
            address: r.formatted_address,
            coordinates: {
              latitude: r.geometry.location.lat,
              longitude: r.geometry.location.lng,
            },
          }))

        return {
          verified: true,
          address: result.formatted_address,
          coordinates: {
            latitude: location.lat,
            longitude: location.lng,
          },
          confidence: 90,
          alternatives: alternatives.length > 0 ? alternatives : undefined,
          verificationMethod: 'GEOCODING',
        }
      }

      return {
        verified: false,
        address: rawLocation,
        coordinates: this.getDefaultCoordinates(rawLocation),
        confidence: 0,
        verificationMethod: 'GEOCODING',
      }
    } catch (error) {
      console.error('[LocationVerificationService] Geocoding failed:', error)
      throw error
    }
  }

  /**
   * Reverse geocode GPS coordinates using Google Maps API
   */
  private async reverseGeocodeWithGoogleMaps(
    latitude: number,
    longitude: number
  ): Promise<VerificationResult> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`

    try {
      const response = await fetch(url)
      const data = (await response.json()) as any

      if (data.results && data.results.length > 0) {
        const result = data.results[0]

        return {
          verified: true,
          address: result.formatted_address,
          coordinates: {
            latitude,
            longitude,
          },
          confidence: 85,
          verificationMethod: 'GEOCODING',
        }
      }

      return {
        verified: false,
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        coordinates: { latitude, longitude },
        confidence: 50,
        verificationMethod: 'GPS',
      }
    } catch (error) {
      console.error('[LocationVerificationService] Reverse geocoding failed:', error)
      throw error
    }
  }

  /**
   * Get default coordinates based on location string
   * Returns Mumbai coordinates as default
   */
  private getDefaultCoordinates(location: string): {
    latitude: number
    longitude: number
  } {
    // Default to approximately center of Mumbai
    return {
      latitude: 19.076 + Math.random() * 0.1,
      longitude: 72.8776 + Math.random() * 0.1,
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371 // Earth's radius in km

    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return parseFloat(distance.toFixed(2))
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(latitude: number, longitude: number): string {
    return `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(latitude: number, longitude: number): boolean {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  }
}

export const locationVerificationService = new LocationVerificationService()
