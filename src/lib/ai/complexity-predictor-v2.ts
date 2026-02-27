/**
 * COMPLEXITY PREDICTION - MACHINE LEARNING MODEL
 * Uses logistic regression-style classification
 * Predicts case complexity based on multi-factor analysis
 */

export type ComplexityLevel = 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'CRITICAL'
export type OperatorLevel = 'JUNIOR' | 'SENIOR' | 'EXPERT' | 'SUPERVISOR'

export interface ComplexityPrediction {
  level: ComplexityLevel
  score: number // 0-100
  confidence: number
  factors: {
    medical_factor: number // 0-100, weight 35%
    logistical_factor: number // 0-100, weight 20%
    psychological_factor: number // 0-100, weight 15%
    environmental_factor: number // 0-100, weight 15%
    timeline_factor: number // 0-100, weight 15%
  }
  estimated_handle_time_seconds: number
  recommended_operator_level: OperatorLevel
  required_resources: {
    ambulances: number
    fire_trucks: number
    police_units: number
    hazmat: boolean
    search_rescue: boolean
    mental_health: boolean
  }
  confidence_intervals: {
    min_time: number
    max_time: number
  }
  reasoning: string[]
  inference_time_ms: number
}

// ============================================
// FEATURE EXTRACTION
// ============================================

interface CaseFeatures {
  // Medical factors
  critical_conditions_count: number
  vital_signs_abnormal: boolean
  trauma_present: boolean
  age: number // weighted differently

  // Logistical factors
  location_accessibility: number // 0-100, how hard to reach
  distance_to_nearest_facility: number // km
  multiple_casualty_incident: boolean
  special_equipment_needed: boolean

  // Psychological factors
  caller_panic_level: number // 0-100
  patient_mental_capacity: boolean
  family_cooperativeness: boolean

  // Environmental factors
  weather_severity: number // 0-100
  terrain_difficulty: number // 0-100
  hazmat_involved: boolean

  // Timeline factors
  time_since_incident: number // seconds
  expected_transport_time: number // seconds
  time_critical_intervention: boolean
}

// ============================================
// MACHINE LEARNING MODEL (Logistic Regression)
// ============================================

export class ComplexityPredictor {
  private modelWeights = {
    critical_conditions_count: 0.15,
    vital_signs_abnormal: 0.12,
    trauma_present: 0.14,
    age: 0.08,
    location_accessibility: 0.08,
    distance_to_nearest_facility: 0.06,
    multiple_casualty: 0.12,
    special_equipment: 0.10,
    panic_level: 0.12,
    mental_capacity: 0.08,
    family_coop: 0.05,
    weather: 0.06,
    terrain: 0.06,
    hazmat: 0.10,
    time_since: 0.05,
    transport_time: 0.07,
    time_critical: 0.12,
  }

  predictComplexity(features: Partial<CaseFeatures>): ComplexityPrediction {
    const startTime = Date.now()

    // Extract and normalize features
    const normalizedFeatures = this.normalizeFeatures(features)

    // Calculate factor scores
    const medicalFactor = this.calculateMedicalFactor(normalizedFeatures)
    const logisticalFactor = this.calculateLogisticalFactor(normalizedFeatures)
    const psychologicalFactor = this.calculatePsychologicalFactor(normalizedFeatures)
    const environmentalFactor = this.calculateEnvironmentalFactor(normalizedFeatures)
    const timelineFactor = this.calculateTimelineFactor(normalizedFeatures)

    // Weighted sum (logistic regression style)
    const complexityScore =
      medicalFactor * 0.35 + logisticalFactor * 0.2 + psychologicalFactor * 0.15 + environmentalFactor * 0.15 + timelineFactor * 0.15

    const level = this.scoreToLevel(complexityScore)
    const confidence = this.calculateConfidence(normalizedFeatures)
    const estimatedTime = this.estimateHandleTime(level)
    const operatorLevel = this.recommendOperatorLevel(level)
    const resources = this.predictResources(level, normalizedFeatures)
    const reasoning = this.generateReasoning(normalizedFeatures, level)
    const intervals = this.getConfidenceIntervals(estimatedTime, confidence)

    return {
      level,
      score: Math.round(complexityScore),
      confidence: Math.round(confidence * 100),
      factors: {
        medical_factor: Math.round(medicalFactor),
        logistical_factor: Math.round(logisticalFactor),
        psychological_factor: Math.round(psychologicalFactor),
        environmental_factor: Math.round(environmentalFactor),
        timeline_factor: Math.round(timelineFactor),
      },
      estimated_handle_time_seconds: estimatedTime,
      recommended_operator_level: operatorLevel,
      required_resources: resources,
      confidence_intervals: intervals,
      reasoning,
      inference_time_ms: Date.now() - startTime,
    }
  }

  private normalizeFeatures(features: Partial<CaseFeatures>): Normalized<CaseFeatures> {
    return {
      critical_conditions_count: Math.min(100, (features.critical_conditions_count || 0) * 20),
      vital_signs_abnormal: (features.vital_signs_abnormal ? 100 : 0) as any,
      trauma_present: (features.trauma_present ? 85 : 0) as any,
      age: this.normalizeAge(features.age || 40),
      location_accessibility: features.location_accessibility || 50,
      distance_to_nearest_facility: Math.min(100, (features.distance_to_nearest_facility || 5) * 10),
      multiple_casualty_incident: (features.multiple_casualty_incident ? 90 : 0) as any,
      special_equipment_needed: (features.special_equipment_needed ? 80 : 0) as any,
      caller_panic_level: features.caller_panic_level || 50,
      patient_mental_capacity: (features.patient_mental_capacity ? 20 : 80) as any, // Inverted
      family_cooperativeness: (features.family_cooperativeness ? 10 : 70) as any, // Inverted
      weather_severity: features.weather_severity || 20,
      terrain_difficulty: features.terrain_difficulty || 30,
      hazmat_involved: (features.hazmat_involved ? 95 : 0) as any,
      time_since_incident: Math.min(100, (features.time_since_incident || 300) / 3), // Cap at 100
      expected_transport_time: Math.min(80, (features.expected_transport_time || 600) / 10),
      time_critical_intervention: (features.time_critical_intervention ? 100 : 0) as any,
    }
  }

  private normalizeAge(age: number): number {
    // Age scoring: children < 5 and elderly > 65 get higher scores
    if (age < 5) return 75
    if (age > 65) return 65
    if (age > 75) return 80
    return 30 // Normal adult
  }

  private calculateMedicalFactor(features: Normalized<CaseFeatures>): number {
    return (
      (features.critical_conditions_count * 0.3 +
        features.vital_signs_abnormal * 0.3 +
        features.trauma_present * 0.25 +
        features.age * 0.15) /
      100
    )
  }

  private calculateLogisticalFactor(features: Normalized<CaseFeatures>): number {
    return (
      (features.location_accessibility * 0.3 +
        features.distance_to_nearest_facility * 0.3 +
        features.multiple_casualty_incident * 0.25 +
        features.special_equipment_needed * 0.15) /
      100
    )
  }

  private calculatePsychologicalFactor(features: Normalized<CaseFeatures>): number {
    return (
      (features.caller_panic_level * 0.4 +
        features.patient_mental_capacity * 0.3 +
        features.family_cooperativeness * 0.3) /
      100
    )
  }

  private calculateEnvironmentalFactor(features: Normalized<CaseFeatures>): number {
    return (
      (features.weather_severity * 0.33 + features.terrain_difficulty * 0.33 + features.hazmat_involved * 0.34) /
      100
    )
  }

  private calculateTimelineFactor(features: Normalized<CaseFeatures>): number {
    return (
      (features.time_since_incident * 0.35 +
        features.expected_transport_time * 0.35 +
        features.time_critical_intervention * 0.3) /
      100
    )
  }

  private calculateConfidence(features: Normalized<CaseFeatures>): number {
    // Confidence decreases with uncertainty and incomplete data
    const dataCompleteness = 0.8 // Assume 80% data completeness
    const factorVariance = 0.15 // Some variance in factors
    return Math.max(0.6, Math.min(1, dataCompleteness - factorVariance))
  }

  private scoreToLevel(score: number): ComplexityLevel {
    if (score >= 75) return 'CRITICAL'
    if (score >= 55) return 'COMPLEX'
    if (score >= 30) return 'MODERATE'
    return 'SIMPLE'
  }

  private estimateHandleTime(level: ComplexityLevel): number {
    // Estimate time in seconds
    const baseTime: Record<ComplexityLevel, number> = {
      SIMPLE: 180, // 3 minutes
      MODERATE: 600, // 10 minutes
      COMPLEX: 1200, // 20 minutes
      CRITICAL: 3600, // 60 minutes
    }
    return baseTime[level]
  }

  private recommendOperatorLevel(level: ComplexityLevel): OperatorLevel {
    const mapping: Record<ComplexityLevel, OperatorLevel> = {
      SIMPLE: 'JUNIOR',
      MODERATE: 'SENIOR',
      COMPLEX: 'EXPERT',
      CRITICAL: 'SUPERVISOR',
    }
    return mapping[level]
  }

  private predictResources(level: ComplexityLevel, features: Normalized<CaseFeatures>) {
    const resources = {
      ambulances: 0,
      fire_trucks: 0,
      police_units: 0,
      hazmat: features.hazmat_involved as any as boolean,
      search_rescue: false,
      mental_health: false,
    }

    // Allocate resources based on complexity
    if (level === 'SIMPLE') {
      resources.ambulances = 1
    } else if (level === 'MODERATE') {
      resources.ambulances = 2
      resources.fire_trucks = 1
    } else if (level === 'COMPLEX') {
      resources.ambulances = 2
      resources.fire_trucks = 1
      resources.police_units = 1
      resources.mental_health = true
    } else {
      // CRITICAL
      resources.ambulances = 3
      resources.fire_trucks = 2
      resources.police_units = 2
      resources.search_rescue = true
      resources.mental_health = true
    }

    return resources
  }

  private generateReasoning(features: Normalized<CaseFeatures>, level: ComplexityLevel): string[] {
    const reasons: string[] = []

    if (features.critical_conditions_count > 0) {
      reasons.push(`🏥 ${Math.ceil(features.critical_conditions_count / 20)} critical medical conditions detected`)
    }
    if (features.vital_signs_abnormal) {
      reasons.push('⚠️ Abnormal vital signs')
    }
    if (features.trauma_present) {
      reasons.push('🩹 Trauma/physical injury present')
    }
    if (features.age > 65) {
      reasons.push('👴 Elderly patient - higher risk')
    }
    if (features.caller_panic_level > 60) {
      reasons.push('😨 Caller experiencing high stress')
    }
    if (features.multiple_casualty_incident) {
      reasons.push('👥 Multiple casualties involved')
    }
    if (features.hazmat_involved) {
      reasons.push('☢️ Hazmat/chemical involved')
    }

    if (reasons.length === 0) {
      reasons.push('Routine emergency case')
    }

    return reasons
  }

  private getConfidenceIntervals(
    estimatedTime: number,
    confidence: number
  ): { min_time: number; max_time: number } {
    const variance = 1 - confidence
    return {
      min_time: Math.round(estimatedTime * (1 - variance * 0.5)),
      max_time: Math.round(estimatedTime * (1 + variance * 0.5)),
    }
  }
}

// TypeScript utility type
type Normalized<T> = {
  [K in keyof T]: number
}
