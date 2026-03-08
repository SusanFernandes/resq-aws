/**
 * Complexity Prediction Service (TIER 3 - O4)
 * Predicts emergency case complexity and resource requirements
 */

export type ComplexityLevel = 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'CRITICAL'

export interface ComplexityScore {
  level: ComplexityLevel
  score: number // 0-100
  factors: {
    medicalComplexity: number
    logisticalComplexity: number
    psychologicalComplexity: number
    environmentalComplexity: number
    timelineComplexity: number
  }
  estimatedHandleTime: number // seconds
  recommendedOperatorLevel: 'JUNIOR' | 'SENIOR' | 'EXPERT' | 'SUPERVISOR'
  predictedResourceNeed: {
    ambulances: number
    fireTrucks: number
    policeUnits: number
    hazmatTeam: boolean
    searchRescue: boolean
    mentalHealthSpecialist: boolean
  }
  confidence: number // 0-100
  reasoning: string[]
}

interface CaseFactors {
  symptoms: string[]
  severity: number
  age: number
  preExistingConditions: string[]
  location: string
  accessibilityIssues: boolean
  multipleVictims: boolean
  hazardous: boolean
  violenceRisk: boolean
  weatherConditions: string
  emotionalState: 'calm' | 'anxious' | 'panicked' | 'aggressive'
}

const complexityCache: Map<string, ComplexityScore> = new Map()

export const ComplexityPredictionService = {
  /**
   * Predict complexity of an emergency case
   */
  predictComplexity(callId: string, caseFactors: CaseFactors): ComplexityScore {
    // Calculate individual complexity dimensions
    const medicalComplexity = this.calculateMedicalComplexity(
      caseFactors.symptoms,
      caseFactors.age,
      caseFactors.preExistingConditions,
      caseFactors.severity
    )

    const logisticalComplexity = this.calculateLogisticalComplexity(
      caseFactors.location,
      caseFactors.accessibilityIssues,
      caseFactors.multipleVictims,
      caseFactors.weatherConditions
    )

    const psychologicalComplexity = this.calculatePsychologicalComplexity(
      caseFactors.emotionalState,
      caseFactors.violenceRisk,
      caseFactors.severity
    )

    const environmentalComplexity = this.calculateEnvironmentalComplexity(
      caseFactors.hazardous,
      caseFactors.weatherConditions,
      caseFactors.location
    )

    const timelineComplexity = this.calculateTimelineComplexity(
      caseFactors.severity,
      caseFactors.age,
      caseFactors.symptoms
    )

    // Overall score (weighted average)
    const overallScore = Math.round(
      medicalComplexity * 0.35 +
        logisticalComplexity * 0.2 +
        psychologicalComplexity * 0.15 +
        environmentalComplexity * 0.15 +
        timelineComplexity * 0.15
    )

    const level = this.scoreToLevel(overallScore)
    const estimatedTime = this.estimateHandleTime(level, caseFactors)
    const raLevel = this.recommendOperatorLevel(overallScore, caseFactors)
    const resources = this.predictResources(level, caseFactors)
    const confidence = this.calculateConfidence(caseFactors)
    const reasoning = this.generateReasoning(caseFactors, overallScore)

    const result: ComplexityScore = {
      level,
      score: overallScore,
      factors: {
        medicalComplexity,
        logisticalComplexity,
        psychologicalComplexity,
        environmentalComplexity,
        timelineComplexity,
      },
      estimatedHandleTime: estimatedTime,
      recommendedOperatorLevel: raLevel,
      predictedResourceNeed: resources,
      confidence,
      reasoning,
    }

    complexityCache.set(callId, result)
    return result
  },

  /**
   * Medical complexity (symptoms, age, conditions, severity)
   */
  private calculateMedicalComplexity(
    symptoms: string[],
    age: number,
    conditions: string[],
    severity: number
  ): number {
    let score = 0

    // Symptom complexity
    const criticalSymptoms = [
      'cardiac',
      'stroke',
      'unresponsive',
      'seizure',
      'poison',
      'severe bleeding',
      'respiratory failure',
    ]
    const criticalMatches = symptoms.filter((s) =>
      criticalSymptoms.some((cs) => s.toLowerCase().includes(cs))
    ).length

    score += criticalMatches * 20

    // Age factor (very young or elderly higher complexity)
    if (age < 5) score += 25
    else if (age < 18) score += 15
    else if (age > 75) score += 20
    else if (age > 65) score += 10

    // Pre-existing conditions
    score += conditions.length * 15

    // Severity multiplier
    score += (severity / 100) * 20

    return Math.min(100, score)
  },

  /**
   * Logistical complexity (location, accessibility, multiple victims, weather)
   */
  private calculateLogisticalComplexity(
    location: string,
    accessibility: boolean,
    multipleVictims: boolean,
    weather: string
  ): number {
    let score = 0

    // Accessibility issues
    if (accessibility) score += 25

    // Multiple victims
    if (multipleVictims) score += 30

    // Remote or difficult location
    const remoteKeywords = ['rural', 'remote', 'highway', 'forest', 'mountain', 'water', 'building']
    if (remoteKeywords.some((k) => location.toLowerCase().includes(k))) {
      score += 25
    }

    // High-rise building
    if (location.toLowerCase().includes('floor') || location.toLowerCase().includes('building')) {
      score += 20
    }

    // Weather complications
    const severeWeather = ['storm', 'snow', 'flood', 'ice', 'fog', 'wind']
    if (severeWeather.some((w) => weather.toLowerCase().includes(w))) {
      score += 20
    }

    return Math.min(100, score)
  },

  /**
   * Psychological complexity (emotion, violence risk)
   */
  private calculatePsychologicalComplexity(
    emotion: string,
    violenceRisk: boolean,
    severity: number
  ): number {
    let score = 0

    // Emotional state
    if (emotion === 'panicked') score += 25
    else if (emotion === 'anxious') score += 15
    else if (emotion === 'aggressive') score += 30

    // Violence risk
    if (violenceRisk) score += 35

    // High severity + emotional distress
    if (severity > 75 && emotion !== 'calm') score += 15

    return Math.min(100, score)
  },

  /**
   * Environmental complexity (hazard, weather, location type)
   */
  private calculateEnvironmentalComplexity(
    hazardous: boolean,
    weather: string,
    location: string
  ): number {
    let score = 0

    // Hazardous materials/environment
    if (hazardous) score += 40

    // Severe weather
    const severeWeather = ['storm', 'snow', 'flood', 'ice', 'extreme']
    if (severeWeather.some((w) => weather.toLowerCase().includes(w))) {
      score += 30
    }

    // High-risk locations
    const highRiskLocations = ['highway', 'factory', 'warehouse', 'construction', 'industrial']
    if (highRiskLocations.some((l) => location.toLowerCase().includes(l))) {
      score += 25
    }

    return Math.min(100, score)
  },

  /**
   * Timeline complexity (how urgently medical intervention needed)
   */
  private calculateTimelineComplexity(severity: number, age: number, symptoms: string[]): number {
    let score = 0

    // High severity = tight timeline
    if (severity > 85) score += 40
    else if (severity > 65) score += 25

    // Age extremes = tighter timeline
    if (age < 5 || age > 75) score += 20

    // Life-threatening symptoms
    const criticalSymptoms = ['unresponsive', 'not breathing', 'cardiac arrest', 'severe bleeding']
    if (criticalSymptoms.some((s) => symptoms.some((sym) => sym.toLowerCase().includes(s)))) {
      score += 40
    }

    return Math.min(100, score)
  },

  /**
   * Convert score to complexity level
   */
  private scoreToLevel(score: number): ComplexityLevel {
    if (score < 30) return 'SIMPLE'
    if (score < 60) return 'MODERATE'
    if (score < 85) return 'COMPLEX'
    return 'CRITICAL'
  },

  /**
   * Estimate handling time in seconds
   */
  private estimateHandleTime(level: ComplexityLevel, factors: CaseFactors): number {
    const baseTime: { [key in ComplexityLevel]: number } = {
      SIMPLE: 180, // 3 minutes
      MODERATE: 420, // 7 minutes
      COMPLEX: 900, // 15 minutes
      CRITICAL: 1800, // 30 minutes
    }

    let time = baseTime[level]

    // Adjust for accessibility
    if (factors.accessibilityIssues) time += 300

    // Adjust for multiple victims
    if (factors.multipleVictims) time += 300

    // Adjust for age
    if (factors.age > 70) time += 180

    return time
  },

  /**
   * Recommend operator level based on complexity
   */
  private recommendOperatorLevel(
    score: number,
    factors: CaseFactors
  ): 'JUNIOR' | 'SENIOR' | 'EXPERT' | 'SUPERVISOR' {
    // SUPERVISOR required for critical + violence/hazard
    if (score > 85 && (factors.violenceRisk || factors.hazardous)) {
      return 'SUPERVISOR'
    }

    // EXPERT required for critical complexity
    if (score > 85) {
      return 'EXPERT'
    }

    // SENIOR for complex cases
    if (score > 60) {
      return 'SENIOR'
    }

    // JUNIOR can handle moderate/simple
    return 'JUNIOR'
  },

  /**
   * Predict resource requirements
   */
  private predictResources(
    level: ComplexityLevel,
    factors: CaseFactors
  ): ComplexityScore['predictedResourceNeed'] {
    const resources = {
      ambulances: 1,
      fireTrucks: 0,
      policeUnits: 0,
      hazmatTeam: false,
      searchRescue: false,
      mentalHealthSpecialist: false,
    }

    // Base allocation by complexity
    if (level === 'CRITICAL') {
      resources.ambulances = 2
      resources.policeUnits = 1
    } else if (level === 'COMPLEX') {
      resources.ambulances = 2
    }

    // Adjust for specific factors
    if (factors.multipleVictims) resources.ambulances = Math.min(3, resources.ambulances + 1)
    if (factors.hazardous) {
      resources.hazmatTeam = true
      resources.fireTrucks = 1
    }
    if (factors.violenceRisk) resources.policeUnits = Math.max(1, resources.policeUnits)
    if (factors.emotionalState === 'aggressive' || factors.violenceRisk)
      resources.mentalHealthSpecialist = true

    // Search & rescue for remote/water locations
    const remoteKeywords = ['forest', 'mountain', 'water', 'lost', 'missing']
    if (remoteKeywords.some((k) => factors.location.toLowerCase().includes(k))) {
      resources.searchRescue = true
    }

    return resources
  },

  /**
   * Calculate confidence level of prediction
   */
  private calculateConfidence(factors: CaseFactors): number {
    let confidence = 85 // Base confidence

    // More information = higher confidence
    confidence += Math.min(15, factors.symptoms.length * 3)
    confidence += factors.preExistingConditions.length * 2

    // Reduce confidence for vague location
    if (!factors.location || factors.location.length < 5) confidence -= 20

    // Reduce confidence for unclear symptoms
    if (factors.symptoms.length === 0) confidence -= 25

    return Math.max(50, Math.min(100, confidence))
  },

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(factors: CaseFactors, score: number): string[] {
    const reasons: string[] = []

    // Medical reasons
    const criticalSymptoms = [
      'cardiac',
      'stroke',
      'unresponsive',
      'seizure',
      'poison',
      'severe',
    ]
    if (factors.symptoms.some((s) =>
      criticalSymptoms.some((cs) => s.toLowerCase().includes(cs))
    )) {
      reasons.push('🏥 Critical medical symptoms detected')
    }

    // Age reasons
    if (factors.age < 5) {
      reasons.push('👶 Pediatric case - specialized handling needed')
    } else if (factors.age > 75) {
      reasons.push('👴 Elderly patient - higher risk profile')
    }

    // Logistical reasons
    if (factors.accessibilityIssues) {
      reasons.push('🚧 Accessibility challenges may delay response')
    }

    if (factors.multipleVictims) {
      reasons.push('👥 Multiple victims require additional resources')
    }

    // Environmental reasons
    if (factors.hazardous) {
      reasons.push('⚠️ Hazardous materials/environment require specialized teams')
    }

    // Psychological reasons
    if (factors.violenceRisk) {
      reasons.push('🚨 Violence risk - police presence required')
    }

    if (factors.emotionalState === 'panicked') {
      reasons.push('😨 Caller in panic state - additional support recommended')
    }

    return reasons || ['Standard emergency case']
  },

  /**
   * Get complexity summary for UI
   */
  getComplexitySummary(callId: string): ComplexityScore | null {
    return complexityCache.get(callId) || null
  },

  /**
   * Update complexity as new information arrives
   */
  updateComplexity(callId: string, newFactors: Partial<CaseFactors>): ComplexityScore | null {
    const current = complexityCache.get(callId)
    if (!current) return null

    // Would need to merge with existing factors
    // This is a simplified version
    return current
  },

  /**
   * Clear complexity data
   */
  clearComplexity(callId: string): void {
    complexityCache.delete(callId)
  },
}
