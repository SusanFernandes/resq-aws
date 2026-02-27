/**
 * Resource Optimization Service (TIER 3 - O5)
 * Optimizes dispatch facility selection and routing
 */

export interface Facility {
  id: string
  name: string
  type: 'hospital' | 'fire-station' | 'police-station' | 'trauma-center' | 'urgent-care'
  lat: number
  lon: number
  distance: number // km
  eta: number // minutes
  capacity: number // available units
  specialization: string[] // trauma, pediatrics, burn, etc
  equipmentAvailable: string[]
  quality: number // 1-5 rating
  costPerUnit: number // relative cost
  responseTime: number // average response time in minutes
  currentLoad: number // percentage 0-100
  reliabilityScore: number // 0-100
}

export interface OptimizationResult {
  primaryFacility: Facility & { score: number; reasoning: string }
  secondaryFacility: Facility & { score: number; reasoning: string }
  tertiaryFacility: Facility & { score: number; reasoning: string }
  optimizedRoute: {
    distance: number
    estimatedTime: number
    waypoints: Array<{ lat: number; lon: number; description: string }>
  }
  costEstimate: number
  specialRequirements: string[]
  backupPlan: string
  dispatchRecommendation: string
}

// Mock facility database (would connect to real hospital/emergency service database)
const facilityDatabase: Facility[] = [
  {
    id: 'h1',
    name: 'Central Medical Hospital',
    type: 'hospital',
    lat: 40.758,
    lon: -73.9855,
    distance: 2.3,
    eta: 12,
    capacity: 5,
    specialization: ['trauma', 'cardiology', 'pediatrics'],
    equipmentAvailable: ['CT', 'MRI', 'surgical-suite', 'ventilators'],
    quality: 5,
    costPerUnit: 1200,
    responseTime: 8,
    currentLoad: 65,
    reliabilityScore: 98,
  },
  {
    id: 'h2',
    name: 'Eastside Trauma Center',
    type: 'trauma-center',
    lat: 40.712,
    lon: -73.966,
    distance: 3.1,
    eta: 16,
    capacity: 3,
    specialization: ['trauma', 'polytrauma', 'orthopedics'],
    equipmentAvailable: ['CT', 'surgical-suite', 'trauma-bay'],
    quality: 5,
    costPerUnit: 1500,
    responseTime: 10,
    currentLoad: 78,
    reliabilityScore: 96,
  },
  {
    id: 'h3',
    name: 'St. Mary Health Center',
    type: 'hospital',
    lat: 40.691,
    lon: -73.942,
    distance: 4.2,
    eta: 22,
    capacity: 8,
    specialization: ['general', 'pediatrics', 'orthopedics'],
    equipmentAvailable: ['CT', 'X-ray', 'surgical-suite'],
    quality: 4,
    costPerUnit: 800,
    responseTime: 12,
    currentLoad: 45,
    reliabilityScore: 94,
  },
  {
    id: 'fs1',
    name: 'Downtown Fire Station',
    type: 'fire-station',
    lat: 40.72,
    lon: -73.98,
    distance: 1.8,
    eta: 8,
    capacity: 4,
    specialization: ['rescue', 'hazmat-response', 'fire-suppression'],
    equipmentAvailable: ['hazmat-gear', 'rescue-equipment', 'defibrillator'],
    quality: 4,
    costPerUnit: 400,
    responseTime: 6,
    currentLoad: 50,
    reliabilityScore: 97,
  },
  {
    id: 'ps1',
    name: 'Central Police Unit',
    type: 'police-station',
    lat: 40.74,
    lon: -73.97,
    distance: 2.1,
    eta: 10,
    capacity: 6,
    specialization: ['crowd-control', 'violence-prevention', 'scene-security'],
    equipmentAvailable: ['communication-systems', 'vehicle', 'restraints'],
    quality: 4,
    costPerUnit: 300,
    responseTime: 8,
    currentLoad: 60,
    reliabilityScore: 95,
  },
]

const optimizationCache: Map<string, OptimizationResult> = new Map()

export const ResourceOptimizationService = {
  /**
   * Optimize facility selection based on case requirements
   */
  optimizeResources(
    callId: string,
    incidentLocation: { lat: number; lon: number },
    caseRequirements: {
      medicalPriority: string // 'cardiology', 'trauma', 'pediatrics', etc
      needsTraumaCenter: boolean
      needsSpecializedCare: string[]
      teamRequirements: ('ambulance' | 'fire' | 'police' | 'hazmat')[]
      severity: number // 0-100
      estimatedVictims: number
    }
  ): OptimizationResult {
    // Score all facilities
    const scoredFacilities = facilityDatabase
      .map((facility) => ({
        ...facility,
        score: this.calculateFacilityScore(facility, incidentLocation, caseRequirements),
        reasoning: this.generateFacilityReasoning(facility, caseRequirements),
      }))
      .sort((a, b) => b.score - a.score)

    // Get top 3
    const top3 = scoredFacilities.slice(0, 3)

    // Calculate optimized route
    const optimizedRoute = this.calculateOptimizedRoute(
      incidentLocation,
      top3[0],
      caseRequirements.teamRequirements
    )

    // Get special requirements
    const specialReqs = this.identifySpecialRequirements(caseRequirements, top3[0])

    // Build backup plan
    const backupPlan = this.generateBackupPlan(top3)

    // Dispatch recommendation
    const dispatchRec = this.generateDispatchRecommendation(top3, caseRequirements)

    const result: OptimizationResult = {
      primaryFacility: top3[0],
      secondaryFacility: top3[1],
      tertiaryFacility: top3[2],
      optimizedRoute,
      costEstimate: this.estimateCost(top3[0], caseRequirements),
      specialRequirements: specialReqs,
      backupPlan,
      dispatchRecommendation: dispatchRec,
    }

    optimizationCache.set(callId, result)
    return result
  },

  /**
   * Calculate facility score (0-100)
   */
  private calculateFacilityScore(
    facility: Facility,
    location: { lat: number; lon: number },
    requirements: any
  ): number {
    let score = 50 // Base score

    // Distance score (closer is better, max 20 points)
    const maxDistance = 10 // km
    score += Math.max(0, 20 - (facility.distance / maxDistance) * 20)

    // Capacity score (availability is valuable)
    score += (facility.capacity / 10) * 10

    // Load score (less loaded is better)
    score += (100 - facility.currentLoad) * 0.1

    // Quality score
    score += facility.quality * 3

    // Reliability score
    score += facility.reliabilityScore * 0.05

    // Specialization match
    if (requirements.needsTraumaCenter && facility.type === 'trauma-center') {
      score += 15
    }

    if (requirements.medicalPriority) {
      if (facility.specialization.includes(requirements.medicalPriority)) {
        score += 10
      }
    }

    // Required equipment match
    const requiredEquipment = this.getRequiredEquipment(requirements.medicalPriority)
    const matchingEquipment = requiredEquipment.filter((e) =>
      facility.equipmentAvailable.includes(e)
    ).length
    score += (matchingEquipment / requiredEquipment.length) * 15

    // Penalty for high wait times
    if (facility.responseTime > 15) score -= 10

    return Math.min(100, Math.max(0, score))
  },

  /**
   * Generate reasoning for facility scoring
   */
  private generateFacilityReasoning(facility: Facility, requirements: any): string {
    const reasons: string[] = []

    if (facility.distance < 3) reasons.push('Very close proximity')
    if (facility.currentLoad < 40) reasons.push('Low current load')
    if (facility.quality >= 4) reasons.push('High quality facility')
    if (facility.specialization.includes(requirements.medicalPriority))
      reasons.push(`Specializes in ${requirements.medicalPriority}`)
    if (facility.responseTime < 10) reasons.push('Fast response time')

    return reasons.join(' • ')
  },

  /**
   * Get required equipment for medical priority
   */
  private getRequiredEquipment(priority: string): string[] {
    const equipmentMap: { [key: string]: string[] } = {
      cardiology: ['CT', 'surgical-suite', 'ventilators'],
      trauma: ['CT', 'surgical-suite', 'trauma-bay'],
      pediatrics: ['picu-equipped', 'pediatric-surgical-suite'],
      orthopedics: ['CT', 'X-ray', 'surgical-suite'],
      general: ['CT', 'surgical-suite'],
    }

    return equipmentMap[priority] || ['CT', 'surgical-suite']
  },

  /**
   * Calculate optimized route with waypoints
   */
  private calculateOptimizedRoute(
    from: { lat: number; lon: number },
    to: Facility,
    teamRequirements: string[]
  ): OptimizationResult['optimizedRoute'] {
    // Simple distance calculation (Haversine formula would be used in prod)
    const distance = Math.hypot(from.lat - to.lat, from.lon - to.lon) * 111 // approx km

    // ETA calculation
    let eta = (distance / 60) * 60 // Assume 60 km/h average speed in urban
    if (teamRequirements.includes('fire')) eta += 3 // Fire brigade may take longer routes
    if (teamRequirements.includes('hazmat')) eta += 5

    // Generate waypoints based on team requirements
    const waypoints: OptimizationResult['optimizedRoute']['waypoints'] = []

    if (teamRequirements.includes('fire')) {
      waypoints.push({
        lat: (from.lat + facilityDatabase[3].lat) / 2,
        lon: (from.lon + facilityDatabase[3].lon) / 2,
        description: 'Pick up Fire Department',
      })
    }

    if (teamRequirements.includes('police')) {
      waypoints.push({
        lat: (from.lat + facilityDatabase[4].lat) / 2,
        lon: (from.lon + facilityDatabase[4].lon) / 2,
        description: 'Pick up Police Unit',
      })
    }

    waypoints.push({
      lat: to.lat,
      lon: to.lon,
      description: `Final destination: ${to.name}`,
    })

    return {
      distance: Math.round(distance * 10) / 10,
      estimatedTime: Math.round(eta),
      waypoints,
    }
  },

  /**
   * Identify special requirements
   */
  private identifySpecialRequirements(requirements: any, facility: Facility): string[] {
    const special: string[] = []

    if (requirements.needsTraumaCenter) {
      special.push('🚑 Trauma center activation required')
    }

    if (requirements.estimatedVictims > 1) {
      special.push(`👥 Multi-victim incident (${requirements.estimatedVictims} victims)`)
    }

    if (requirements.teamRequirements.includes('hazmat')) {
      special.push('⚠️ Hazmat team coordination needed')
    }

    if (requirements.severity > 85) {
      special.push('🚨 Critical severity - full trauma team standby')
    }

    if (!facility.specialization.includes(requirements.medicalPriority)) {
      special.push(`⚠️ No ${requirements.medicalPriority} specialist on-site`)
    }

    if (facility.currentLoad > 70) {
      special.push('🚨 High facility load - consider secondary facility')
    }

    return special
  },

  /**
   * Generate backup plan
   */
  private generateBackupPlan(topFacilities: any[]): string {
    if (topFacilities.length < 2) {
      return 'Re-assess situation if primary facility unavailable'
    }

    return (
      `If ${topFacilities[0].name} is unavailable, ` +
      `redirect to ${topFacilities[1].name} (ETA +${topFacilities[1].eta - topFacilities[0].eta} min). ` +
      `Tertiary option: ${topFacilities[2].name}.`
    )
  },

  /**
   * Generate dispatch recommendation
   */
  private generateDispatchRecommendation(facilities: any[], requirements: any): string {
    const primary = facilities[0]
    const teams = requirements.teamRequirements.join(', ')

    return (
      `DISPATCH: Ambulance + ${teams} to ${primary.name} ` +
      `(ETA: ${primary.eta} min, Quality: ${primary.quality}/5). ` +
      `Notify ${primary.name} of incoming ${requirements.severity > 70 ? 'critical ' : ''}case.`
    )
  },

  /**
   * Estimate total cost
   */
  private estimateCost(facility: Facility, requirements: any): number {
    let cost = facility.costPerUnit

    // Team multiplier
    cost *= requirements.teamRequirements.length

    // Victim multiplier
    cost *= requirements.estimatedVictims

    // Severity multiplier
    cost *= 1 + requirements.severity / 100

    return Math.round(cost)
  },

  /**
   * Get optimization summary
   */
  getOptimizationSummary(callId: string): OptimizationResult | null {
    return optimizationCache.get(callId) || null
  },

  /**
   * Re-optimize (for when situation changes)
   */
  reoptimize(
    callId: string,
    incidentLocation: { lat: number; lon: number },
    newRequirements: any
  ): OptimizationResult | null {
    // Get previous result to see if re-optimization is needed
    const previous = optimizationCache.get(callId)
    if (!previous) return null

    // Re-run optimization with new data
    return this.optimizeResources(callId, incidentLocation, newRequirements)
  },

  /**
   * Compare two facilities side-by-side
   */
  compareFacilities(
    facility1: Facility,
    facility2: Facility,
    requirements: any
  ): {
    facility1Score: number
    facility2Score: number
    comparison: string
    recommendation: string
  } {
    const f1Score = this.calculateFacilityScore(facility1, { lat: 0, lon: 0 }, requirements)
    const f2Score = this.calculateFacilityScore(facility2, { lat: 0, lon: 0 }, requirements)

    let comparison = ''
    if (f1Score > f2Score + 10) {
      comparison = `${facility1.name} is significantly better`
    } else if (f2Score > f1Score + 10) {
      comparison = `${facility2.name} is significantly better`
    } else {
      comparison = 'Both facilities are comparable'
    }

    return {
      facility1Score: Math.round(f1Score),
      facility2Score: Math.round(f2Score),
      comparison,
      recommendation: f1Score > f2Score ? facility1.name : facility2.name,
    }
  },

  /**
   * Clear optimization data
   */
  clearOptimization(callId: string): void {
    optimizationCache.delete(callId)
  },
}
