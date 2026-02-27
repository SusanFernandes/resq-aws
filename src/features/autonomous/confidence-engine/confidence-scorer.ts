// Confidence scoring and thresholding system
// Determines whether to auto-dispatch, escalate to operator, or require human review
// Feature A3: Confidence Threshold & Escalation

import { generateConfidenceExplanation } from '@/lib/ai/groq-client'

export interface ConfidenceScoreFactors {
  intentClarity: number // 0-100: How clear is the emergency intent?
  locationValidation: number // 0-100: Is location verified/valid?
  emergencySeverity: number // 0-100: How severe is the emergency?
  callerCoherence: number // 0-100: Is caller coherent/coherent?
  informationCompleteness: number // 0-100: Do we have enough info?
  multipleSourceConfirmation: number // 0-100: Confirmed by multiple sources?
}

export interface ConfidenceScore {
  overall: number // 0-100
  factors: ConfidenceScoreFactors
  recommendation: 'AUTO_DISPATCH' | 'OPERATOR_ASSISTED' | 'ESCALATE_TO_HUMAN'
  reason: string
  riskLevel: 'safe' | 'caution' | 'unsafe'
  shouldEscalate: boolean
  shouldAutoDispatch: boolean
}

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  AUTO_DISPATCH_MIN: 85, // >85% can auto-dispatch with caution
  OPERATOR_ASSISTED_MIN: 60, // 60-85% needs operator review
  ESCALATE_TO_HUMAN_MAX: 60, // <60% escalate to human
}

/**
 * Calculate overall confidence score from multiple factors
 * Uses weighted average of input factors
 */
export function calculateConfidenceScore(factors: ConfidenceScoreFactors): ConfidenceScore {
  // Weights for each factor (higher weight = more important)
  const weights = {
    intentClarity: 0.25, // Most important: clear intent
    locationValidation: 0.25, // Also critical: verified location
    emergencySeverity: 0.15, // High severity = less confidence needed
    callerCoherence: 0.15, // Is caller reliable?
    informationCompleteness: 0.12, // Do we have enough info?
    multipleSourceConfirmation: 0.08, // Cross-validation
  }

  // Calculate weighted average
  const overallScore =
    factors.intentClarity * weights.intentClarity +
    factors.locationValidation * weights.locationValidation +
    factors.emergencySeverity * weights.emergencySeverity +
    factors.callerCoherence * weights.callerCoherence +
    factors.informationCompleteness * weights.informationCompleteness +
    factors.multipleSourceConfirmation * weights.multipleSourceConfirmation

  // Determine recommendation
  let recommendation: ConfidenceScore['recommendation'] = 'ESCALATE_TO_HUMAN'
  let riskLevel: ConfidenceScore['riskLevel'] = 'unsafe'
  let reason = 'Low confidence - escalate to human operator'

  if (overallScore >= CONFIDENCE_THRESHOLDS.AUTO_DISPATCH_MIN) {
    recommendation = 'AUTO_DISPATCH'
    riskLevel = 'caution'
    reason = `High confidence (${Math.round(overallScore)}%) - ready for auto-dispatch with caution`
  } else if (overallScore >= CONFIDENCE_THRESHOLDS.OPERATOR_ASSISTED_MIN) {
    recommendation = 'OPERATOR_ASSISTED'
    riskLevel = 'caution'
    reason = `Medium confidence (${Math.round(overallScore)}%) - operator should review and confirm`
  }

  // Safety override: Critical emergencies skip confidence checks
  if (factors.emergencySeverity >= 90 && overallScore >= 50) {
    recommendation = 'AUTO_DISPATCH'
    riskLevel = 'caution'
    reason = 'Critical emergency - auto-dispatch approved despite moderate confidence'
  }

  // Safety override: Unknown locations must escalate
  if (factors.locationValidation < 30) {
    recommendation = 'ESCALATE_TO_HUMAN'
    riskLevel = 'unsafe'
    reason = 'Location unverified - must escalate to operator for clarification'
  }

  return {
    overall: Math.max(0, Math.min(100, overallScore)),
    factors,
    recommendation,
    reason,
    riskLevel,
    shouldEscalate: recommendation === 'ESCALATE_TO_HUMAN',
    shouldAutoDispatch: recommendation === 'AUTO_DISPATCH',
  }
}

/**
 * Calculate intent clarity from Groq confidence and keyword matches
 */
export function scoreIntentClarity(groqConfidence: number, keywordMatches: number): number {
  // Groq confidence: 0-100, keyword matches: count of relevant keywords
  const groqScore = groqConfidence // Already 0-100
  const keywordScore = Math.min(keywordMatches * 10, 100) // Up to 10 keywords = 100%

  // Average with Groq being slightly more important
  return (groqScore * 0.6 + keywordScore * 0.4) / 100 * 100
}

/**
 * Calculate location validation score
 */
export function scoreLocationValidation(
  locationProvided: boolean,
  locationVerified: boolean,
  addressQuality: 'exact' | 'approximate' | 'city_only' | 'none'
): number {
  if (!locationProvided) return 0

  let base = 30 // Location provided but not verified

  if (locationVerified) {
    base = 100

    if (addressQuality === 'city_only') base = 60
    if (addressQuality === 'approximate') base = 80
  }

  return base
}

/**
 * Calculate severity score
 * Higher severity = higher priority but lower confidence requirement
 */
export function scoreEmergencySeverity(
  intent: string,
  keywords: string[]
): number {
  const criticalKeywords = [
    'unconscious',
    'cardiac',
    'heart attack',
    'not breathing',
    'severe bleeding',
    'explosion',
    'active fire',
    'trapped',
    'kidnapped',
  ]

  const severeKeywords = [
    'chest pain',
    'difficulty breathing',
    'heavy bleeding',
    'smoke',
    'assault',
    'collision',
  ]

  const moderateKeywords = [
    'fever',
    'injury',
    'accident',
    'illness',
  ]

  // Check keywords for severity indicators
  const hasPhrase = (phrase: string) =>
    keywords.some(k => k.toLowerCase().includes(phrase.toLowerCase()))

  let score = 50 // Default: moderate

  for (const keyword of criticalKeywords) {
    if (hasPhrase(keyword)) {
      score = 100
      break
    }
  }

  if (score < 100) {
    for (const keyword of severeKeywords) {
      if (hasPhrase(keyword)) {
        score = 80
        break
      }
    }
  }

  if (score < 80) {
    for (const keyword of moderateKeywords) {
      if (hasPhrase(keyword)) {
        score = 60
        break
      }
    }
  }

  // Intent-based baseline
  const intentSeverity: Record<string, number> = {
    MEDICAL: 90,
    FIRE: 95,
    ACCIDENT: 90,
    POLICE: 85,
    TOXIC: 95,
    UTILITY: 40,
    NON_EMERGENCY: 10,
  }

  const baseSeverity = intentSeverity[intent] || 50
  return Math.max(score * 0.6 + baseSeverity * 0.4, baseSeverity * 0.5)
}

/**
 * Score caller coherence from conversation analysis
 */
export function scoreCallerCoherence(
  speechClearness: number = 50, // 0-100: how clear is speech?
  sentenceCompleteness: number = 50, // 0-100: complete sentences?
  logicalFlow: number = 50, // 0-100: does story make sense?
  stressLevel: number = 50 // 0-100: stress percentage (calmer = higher score)
): number {
  // Normalize stress level (panic = lower coherence score)
  const stressScore = 100 - stressLevel

  // Average the factors
  return (speechClearness + sentenceCompleteness + logicalFlow + stressScore) / 4
}

/**
 * Score information completeness
 */
export function scoreInformationCompleteness(
  hasLocation: boolean,
  hasCallerName: boolean,
  hasAge: boolean,
  hasDescription: boolean,
  hasContactInfo: boolean,
  informationCount: number = 0
): number {
  const required = [hasLocation, hasCallerName, hasDescription] // Minimum required
  const optional = [hasAge, hasContactInfo] // Nice to have

  const requiredCount = required.filter(Boolean).length
  const optionalCount = optional.filter(Boolean).length

  // Calculate score
  let score = (requiredCount / required.length) * 100

  // Boost if optional info provided
  if (optionalCount > 0) {
    score = Math.min(score + (optionalCount * 10), 100)
  }

  // Further boost based on info detail level
  if (informationCount > 5) {
    score = Math.min(score + 20, 100)
  }

  return score
}

/**
 * Score multiple source confirmation
 */
export function scoreMultipleSourceConfirmation(
  sourcesCount: number, // How many independent sources confirm this?
  consistencyScore: number = 100 // 0-100: how consistent are sources?
): number {
  // 1 source: 0%, 2 sources: 50%, 3+ sources: 100%
  let score = Math.min((sourcesCount / 3) * 100, 100)

  // Reduce if sources conflict
  score = (score * consistencyScore) / 100

  return score
}

/**
 * Batch score calculation helper
 * Takes simple input parameters and returns full confidence score
 */
export function quickConfidenceScore(params: {
  intentClarity: number
  locationVerified: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  callerCoherent: boolean
  informationComplete: boolean
}): ConfidenceScore {
  const severityMap = {
    low: 20,
    medium: 50,
    high: 75,
    critical: 90,
  }

  const factors: ConfidenceScoreFactors = {
    intentClarity: params.intentClarity,
    locationValidation: params.locationVerified ? 85 : 30,
    emergencySeverity: severityMap[params.severity],
    callerCoherence: params.callerCoherent ? 80 : 40,
    informationCompleteness: params.informationComplete ? 80 : 40,
    multipleSourceConfirmation: 0,
  }

  return calculateConfidenceScore(factors)
}

/**
 * Format confidence score for display
 */
export function formatConfidenceScore(score: ConfidenceScore): string {
  const confidenceEmoji = {
    safe: '✅',
    caution: '⚠️',
    unsafe: '🔴',
  }

  const emoji = confidenceEmoji[score.riskLevel]
  return `${emoji} ${Math.round(score.overall)}% - ${score.recommendation.replace(/_/g, ' ')}`
}

/**
 * Get escalation reason explanations
 */
export function getEscalationExplanation(score: ConfidenceScore): {
  summary: string
  missingFactors: string[]
  improvementSuggestions: string[]
} {
  const { factors, recommendation } = score

  const missingFactors: string[] = []
  const improvementSuggestions: string[] = []

  // Identify weak factors
  if (factors.intentClarity < 60) {
    missingFactors.push('Intent not clear')
    improvementSuggestions.push('Ask caller to describe the emergency in their own words')
  }

  if (factors.locationValidation < 60) {
    missingFactors.push('Location not verified')
    improvementSuggestions.push('Ask for specific address or use GPS if available')
  }

  if (factors.callerCoherence < 50) {
    missingFactors.push('Caller appears distressed or incoherent')
    improvementSuggestions.push('Let caller take a moment, ask simple yes/no questions')
  }

  if (factors.informationCompleteness < 60) {
    missingFactors.push('Incomplete emergency information')
    improvementSuggestions.push('Ask for name, age, and specific symptoms/situation')
  }

  const summary =
    recommendation === 'ESCALATE_TO_HUMAN'
      ? 'Transfer to human operator for clarification'
      : recommendation === 'OPERATOR_ASSISTED'
        ? 'Proceed with operator oversight'
        : 'Ready for autonomous dispatch'

  return { summary, missingFactors, improvementSuggestions }
}

export default {
  calculateConfidenceScore,
  scoreIntentClarity,
  scoreLocationValidation,
  scoreEmergencySeverity,
  scoreCallerCoherence,
  scoreInformationCompleteness,
  scoreMultipleSourceConfirmation,
  quickConfidenceScore,
  formatConfidenceScore,
  getEscalationExplanation,
  CONFIDENCE_THRESHOLDS,
}
