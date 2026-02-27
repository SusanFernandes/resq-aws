// Mock data generator for emergency locations and facilities
// This creates realistic India-based mock data for testing

export interface MockLocation {
  id: string
  latitude: number
  longitude: number
  address: string
  city: string
  state: string
  areaName: string
  pincode: string
}

export interface MockFacility {
  id: string
  name: string
  type: 'hospital' | 'clinic' | 'fire-station' | 'police-station' | 'blood-bank'
  latitude: number
  longitude: number
  address: string
  city: string
  phone: string
  hours: string
  distance?: number
  beds?: number
  specialization?: string
}

// Real locations across Indian cities (based on OSM data)
const INDIAN_CITIES = [
  { city: 'Mumbai', state: 'Maharashtra', bbox: { lat: [18.9, 19.2], lng: [72.8, 73.0] } },
  { city: 'Delhi', state: 'Delhi', bbox: { lat: [28.4, 28.8], lng: [76.8, 77.3] } },
  { city: 'Bangalore', state: 'Karnataka', bbox: { lat: [12.8, 13.1], lng: [77.4, 77.8] } },
  { city: 'Hyderabad', state: 'Telangana', bbox: { lat: [17.3, 17.4], lng: [78.4, 78.6] } },
  { city: 'Chennai', state: 'Tamil Nadu', bbox: { lat: [13.0, 13.2], lng: [80.1, 80.3] } },
]

// Real hospital names in India (major ones)
const HOSPITAL_NAMES = [
  { name: 'AIIMS', type: 'hospital', beds: 1500 },
  { name: 'Apollo Hospital', type: 'hospital', beds: 800 },
  { name: 'Fortis Hospital', type: 'hospital', beds: 600 },
  { name: 'Max Healthcare', type: 'hospital', beds: 500 },
  { name: 'Lilavati Hospital', type: 'hospital', beds: 700 },
  { name: 'Breach Candy Hospital', type: 'hospital', beds: 400 },
  { name: 'Holy Family Hospital', type: 'clinic', beds: 200 },
  { name: 'Bhatia Hospital', type: 'hospital', beds: 350 },
  { name: 'Sir H N Reliance Foundation Hospital', type: 'hospital', beds: 550 },
  { name: 'Kokilaben Hospital', type: 'hospital', beds: 600 },
]

const CLINIC_NAMES = [
  'City Clinic',
  'Care Clinic',
  'Health Plus Clinic',
  'MediCare Clinic',
  'Emergency Care Center',
  'Quick Relief Clinic',
]

// Generate random location within city bounds
function getRandomLocation(city: typeof INDIAN_CITIES[0]): { lat: number; lng: number } {
  const lat = city.bbox.lat[0] + Math.random() * (city.bbox.lat[1] - city.bbox.lat[0])
  const lng = city.bbox.lng[0] + Math.random() * (city.bbox.lng[1] - city.bbox.lng[0])
  return { lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) }
}

export function generateMockLocation(): MockLocation {
  const cities = INDIAN_CITIES
  const city = cities[Math.floor(Math.random() * cities.length)]
  const loc = getRandomLocation(city)
  const areaNames = ['East', 'West', 'North', 'South', 'Central', 'Suburbs']
  const area = areaNames[Math.floor(Math.random() * areaNames.length)]
  
  return {
    id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    latitude: loc.lat,
    longitude: loc.lng,
    address: `${Math.floor(Math.random() * 9999)} ${city.city} Road`,
    city: city.city,
    state: city.state,
    areaName: area,
    pincode: `${110000 + Math.floor(Math.random() * 90000)}`,
  }
}

export function generateMockHospital(city?: string): MockFacility {
  const cities = city ? INDIAN_CITIES.filter(c => c.city === city) : INDIAN_CITIES
  const selectedCity = cities[Math.floor(Math.random() * cities.length)]
  const loc = getRandomLocation(selectedCity)
  const hospital = HOSPITAL_NAMES[Math.floor(Math.random() * HOSPITAL_NAMES.length)]
  
  return {
    id: `hosp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: hospital.name,
    type: 'hospital',
    latitude: loc.lat,
    longitude: loc.lng,
    address: `${Math.floor(Math.random() * 999)} ${selectedCity.city}`,
    city: selectedCity.city,
    phone: `+91 ${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    hours: '24/7',
    beds: hospital.beds,
    specialization: ['Emergency Care', 'Trauma', 'Cardiology', 'Orthopedic'][Math.floor(Math.random() * 4)],
    distance: parseFloat((Math.random() * 20).toFixed(1)),
  }
}

export function generateMockFireStation(city?: string): MockFacility {
  const cities = city ? INDIAN_CITIES.filter(c => c.city === city) : INDIAN_CITIES
  const selectedCity = cities[Math.floor(Math.random() * cities.length)]
  const loc = getRandomLocation(selectedCity)
  
  return {
    id: `fire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `Fire Station ${selectedCity.city} - Zone ${Math.floor(Math.random() * 10) + 1}`,
    type: 'fire-station',
    latitude: loc.lat,
    longitude: loc.lng,
    address: `Fire Brigade Road, ${selectedCity.city}`,
    city: selectedCity.city,
    phone: '101',
    hours: '24/7',
    distance: parseFloat((Math.random() * 15).toFixed(1)),
  }
}

export function generateMockPoliceStation(city?: string): MockFacility {
  const cities = city ? INDIAN_CITIES.filter(c => c.city === city) : INDIAN_CITIES
  const selectedCity = cities[Math.floor(Math.random() * cities.length)]
  const loc = getRandomLocation(selectedCity)
  
  return {
    id: `police_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `Police Station ${selectedCity.city}`,
    type: 'police-station',
    latitude: loc.lat,
    longitude: loc.lng,
    address: `Police Headquarters, ${selectedCity.city}`,
    city: selectedCity.city,
    phone: '100',
    hours: '24/7',
    distance: parseFloat((Math.random() * 15).toFixed(1)),
  }
}

export function generateMockBloodBank(city?: string): MockFacility {
  const cities = city ? INDIAN_CITIES.filter(c => c.city === city) : INDIAN_CITIES
  const selectedCity = cities[Math.floor(Math.random() * cities.length)]
  const loc = getRandomLocation(selectedCity)
  
  return {
    id: `blood_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `Blood Bank - ${selectedCity.city}`,
    type: 'blood-bank',
    latitude: loc.lat,
    longitude: loc.lng,
    address: `Medical College Road, ${selectedCity.city}`,
    city: selectedCity.city,
    phone: `+91 ${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    hours: '08:00 - 18:00',
    distance: parseFloat((Math.random() * 10).toFixed(1)),
  }
}

// Batch generators
export function generateMockFacilities(count: number = 50, city?: string): MockFacility[] {
  const facilities: MockFacility[] = []
  const types = ['hospital', 'clinic', 'fire-station', 'police-station', 'blood-bank']
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    switch (type) {
      case 'hospital':
        facilities.push(generateMockHospital(city))
        break
      case 'fire-station':
        facilities.push(generateMockFireStation(city))
        break
      case 'police-station':
        facilities.push(generateMockPoliceStation(city))
        break
      case 'blood-bank':
        facilities.push(generateMockBloodBank(city))
        break
      default:
        facilities.push(generateMockHospital(city))
    }
  }
  
  return facilities
}

export function generateMockLocations(count: number = 20): MockLocation[] {
  const locations: MockLocation[] = []
  for (let i = 0; i < count; i++) {
    locations.push(generateMockLocation())
  }
  return locations
}

// Find nearest facilities to a location
export function findNearestFacilities(
  location: { latitude: number; longitude: number },
  facilities: MockFacility[],
  type?: string,
  limit: number = 5
): MockFacility[] {
  const filtered = type ? facilities.filter(f => f.type === type) : facilities
  
  const withDistance = filtered.map(f => ({
    ...f,
    distance: calculateDistance(location.latitude, location.longitude, f.latitude, f.longitude),
  }))
  
  return withDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, limit)
}

// Haversine formula to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

// Export pregenerated facilities for quick access
export const MOCK_HOSPITALS = generateMockFacilities(20).filter(f => f.type === 'hospital')
export const MOCK_FACILITIES_ALL = generateMockFacilities(100)
