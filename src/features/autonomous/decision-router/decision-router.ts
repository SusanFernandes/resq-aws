/**
 * A1: Decision Router
 * Routes emergency to appropriate handling based on confidence score and location verification
 * - AUTO_DISPATCH (85%+): Automatic dispatch without operator intervention
 * - OPERATOR_ASSISTED (60-85%): Send to operator dashboard for quick approval
 * - ESCALATE_TO_HUMAN (>60%): Require full human review and approval
 */

import { AIAnalysisData } from '@/components/ai-analysis-card'

export type DispatchRoute = 'AUTO_DISPATCH' | 'OPERATOR_ASSISTED' | 'ESCALATE_TO_HUMAN'

export interface DispatchDecision {
  route: DispatchRoute
  confidence: number
  reasoning: string
  riskFactors: string[]
  shouldAutoDispatch: boolean
  requiresOperatorReview: boolean
  escalateToSupervisor: boolean
  estimatedDispatchTime: number // seconds
  overrideFlags: {
    criticalEmergency: boolean
    locationUnverified: boolean
    callerUnreliable: boolean
    systemFail: boolean
  }
}

/**
 * Main decision routing logic
 * Determines if emergency should be auto-dispatched or requires human approval
 */
export function makeDispatchDecision(analysis: AIAnalysisData): DispatchDecision {
  const decision: DispatchDecision = {
    route: 'OPERATOR_ASSISTED',
    confidence: analysis.confidence.overall,
    reasoning: '',
    riskFactors: [],
    shouldAutoDispatch: false,
    requiresOperatorReview: true,
    escalateToSupervisor: false,
    estimatedDispatchTime: 0,
    overrideFlags: {
      criticalEmergency: false,
      locationUnverified: false,
      callerUnreliable: false,
      systemFail: false,
    },
  }

  // Check for critical emergency overrides
  const isCritical = isCriticalEmergency(analysis)
  if (isCritical) {
    decision.overrideFlags.criticalEmergency = true
    // Critical emergencies can auto-dispatch even with lower confidence
    if (
      analysis.confidence.overall >= 60 &&
      (!analysis.location || analysis.location.verified)
    ) {
      decision.route = 'AUTO_DISPATCH'
      decision.shouldAutoDispatch = true
      decision.requiresOperatorReview = false
      decision.estimatedDispatchTime = 30 // 30 seconds
      decision.reasoning =
        'Critical emergency with acceptable location verification. Auto-dispatching immediately.'
      return decision
    }
  }

  // Location verification check
  if (analysis.location && !analysis.location.verified) {
    decision.riskFactors.push('Location not fully verified')
    decision.overrideFlags.locationUnverified = true
    decision.route = 'OPERATOR_ASSISTED' // Downgrade to operator assistance
  }

  // Sentiment/Reliability check
  if (analysis.sentiment.stressLevel === 'panic' && analysis.sentiment.stressPercentage > 90) {
    decision.riskFactors.push('Caller in extreme panic - may provide unreliable information')
    decision.overrideFlags.callerUnreliable = true
    decision.route = 'OPERATOR_ASSISTED' // Operator should verify caller state
  }

  // Main confidence-based routing
  if (analysis.confidence.overall >= 85) {
    // Auto-dispatch threshold
    if (
      analysis.location?.verified &&
      analysis.sentiment.stressLevel !== 'panic' &&
      analysis.extracted.location &&
      analysis.extracted.emergencyType
    ) {
      decision.route = 'AUTO_DISPATCH'
      decision.shouldAutoDispatch = true
      decision.requiresOperatorReview = false
      decision.estimatedDispatchTime = 45 // 45 seconds to dispatch
      decision.reasoning =
        'High confidence classification with verified location and coherent caller. Safe for auto-dispatch.'
    } else {
      decision.route = 'OPERATOR_ASSISTED'
      decision.estimatedDispatchTime = 60
      decision.reasoning =
        'Confidence high but location or caller reliability needs verification before auto-dispatch.'
    }
  } else if (analysis.confidence.overall >= 60) {
    // Operator-assisted threshold
    decision.route = 'OPERATOR_ASSISTED'
    decision.requiresOperatorReview = true
    decision.estimatedDispatchTime = 120 // 2 minutes with operator review
    decision.reasoning =
      'Medium confidence. Operator review recommended before dispatch. Ready for quick approval.'
  } else {
    // Low confidence - escalate to human
    decision.route = 'ESCALATE_TO_HUMAN'
    decision.escalateToSupervisor = true
    decision.requiresOperatorReview = true
    decision.estimatedDispatchTime = 300 // 5 minutes with full review
    decision.reasoning =
      'Low confidence classification. Requires full human review and judgment before any action.'
  }

  // Add additional risk factors
  if (!analysis.extracted.location) {
    decision.riskFactors.push('Location not extracted from call')
  }
  if (!analysis.extracted.callerName) {
    decision.riskFactors.push('Caller identity not identified')
  }
  if (analysis.confidence.factors?.intentClarity && analysis.confidence.factors.intentClarity < 50) {
    decision.riskFactors.push('Intent unclear - emergency type uncertain')
  }

  return decision
}

/**
 * Determine if this is a critical emergency requiring immediate action
 */
function isCriticalEmergency(analysis: AIAnalysisData): boolean {
  const criticalKeywords = [
    'unconscious',
    'not breathing',
    'cardiac',
    'choking',
    'severe',
    'critical',
    'life-threatening',
    'trapped',
    'burning',
    'fire',
    'armed',
    'shooting',
  ]

  const description = (
    analysis.extracted.description +
    ' ' +
    analysis.intent.keywords.join(' ')
  ).toLowerCase()

  const hasCriticalKeyword = criticalKeywords.some((keyword) =>
    description.includes(keyword)
  )

  const isSeverePriority = analysis.intent.priority === 'CRITICAL'
  const hasPanicCaller = analysis.sentiment.stressLevel === 'panic'

  return hasCriticalKeyword || isSeverePriority || hasPanicCaller
}

/**
 * Get dispatch action based on decision
 * Returns the action that should be taken in the system
 */
export function getDispatchAction(decision: DispatchDecision): DispatchAction {
  return {
    route: decision.route,
    shouldAutoDispatch: decision.shouldAutoDispatch,
    requiresApproval: decision.requiresOperatorReview,
    escalateToSupervisor: decision.escalateToSupervisor,
    timeoutSeconds: decision.estimatedDispatchTime,
    notificationLevel: getNotificationLevel(decision.route),
    description: decision.reasoning,
  }
}

export interface DispatchAction {
  route: DispatchRoute
  shouldAutoDispatch: boolean
  requiresApproval: boolean
  escalateToSupervisor: boolean
  timeoutSeconds: number
  notificationLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  description: string
}

function getNotificationLevel(route: DispatchRoute): 'CRITICAL' | 'HIGH' | 'MEDIUM' {
  switch (route) {
    case 'AUTO_DISPATCH':
      return 'CRITICAL'
    case 'OPERATOR_ASSISTED':
      return 'HIGH'
    case 'ESCALATE_TO_HUMAN':
      return 'CRITICAL'
    default:
      return 'MEDIUM'
  }
}

/**
 * Check if system allows autonomous dispatch (safety check)
 * This prevents autonomous dispatch in certain conditions
 */
export function canAutoDispatch(analysis: AIAnalysisData): boolean {
  // Safety conditions that must be met for auto-dispatch
  const hasLocation = !!analysis.location?.verified || !!analysis.extracted.location
  const hasEmergencyType = !!analysis.extracted.emergencyType || !!analysis.intent.type
  const isHighConfidence = analysis.confidence.overall >= 85
  const callerIsCoherent = analysis.sentiment.stressPercentage < 80

  return hasLocation && hasEmergencyType && isHighConfidence && callerIsCoherent
}

/**
 * Get explanation of why dispatch decision was made
 * For logging and operator understanding
 */
export function getDecisionExplanation(
  decision: DispatchDecision,
  analysis: AIAnalysisData
): string {
  const explanations: string[] = []

  explanations.push(`Overall Confidence: ${decision.confidence}%`)

  const intentClarity = analysis.confidence.factors?.intentClarity
  if (intentClarity !== undefined && (intentClarity > 80 || intentClarity < 30)) {
    explanations.push(
      `Intent Clarity: ${intentClarity > 80 ? 'VERY CLEAR' : 'VERY UNCLEAR'}`
    )
  }

  if (analysis.location?.verified) {
    explanations.push('Location: VERIFIED')
  } else if (analysis.location?.verified === false) {
    explanations.push('Location: NOT VERIFIED')
  } else {
    explanations.push('Location: UNCONFIRMED')
  }

  explanations.push(`Caller State: ${analysis.sentiment.stressLevel.toUpperCase()}`)

  if (decision.riskFactors.length > 0) {
    explanations.push(`Risk Factors: ${decision.riskFactors.join(', ')}`)
  }

  if (decision.overrideFlags.criticalEmergency) {
    explanations.push('CRITICAL EMERGENCY: Auto-dispatch override enabled')
  }

  return explanations.join(' | ')
}
