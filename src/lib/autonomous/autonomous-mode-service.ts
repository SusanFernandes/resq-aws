/**
 * Autonomous Mode Service (TIER 3 - A2)
 * Controls operator governance - toggles MANUAL/AUTONOMOUS modes
 */

export type FeatureMode = 'MANUAL' | 'AUTONOMOUS'
export type SafetyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface FeatureConfig {
  feature: string
  mode: FeatureMode
  enabled: boolean
  confidenceThreshold: number // 0-100
  requiresConfirmation: boolean
  maxAutoActions: number // Max actions before requiring confirmation
  safetyLevel: SafetyLevel
  description: string
}

export interface AutonomousModeSettings {
  globalMode: FeatureMode
  globalConfidenceThreshold: number
  features: Map<string, FeatureConfig>
  fallbackMode: 'MANUAL' | 'SUSPEND'
  auditLogging: boolean
  requireConfirmationForEscalation: boolean
  enableEmergencyShutdown: boolean
}

export interface AutonomousAction {
  actionId: string
  feature: string
  timestamp: number
  decision: string
  confidence: number
  reasoning: string[]
  parameters: Record<string, any>
  executedBy: 'AUTONOMOUS' | 'OPERATOR'
  outcome: 'success' | 'failed' | 'pending'
  auditLog: string
}

const autonomousSettings = new Map<string, AutonomousModeSettings>()
const actionAuditLog = new Map<string, AutonomousAction[]>()
const decisionHistory = new Map<string, any[]>()

// Default feature configurations
const defaultFeatures: Record<string, FeatureConfig> = {
  'sentiment-analysis': {
    feature: 'Sentiment Analysis',
    mode: 'AUTONOMOUS',
    enabled: true,
    confidenceThreshold: 70,
    requiresConfirmation: false,
    maxAutoActions: 100, // No limit for analysis
    safetyLevel: 'LOW',
    description: 'Real-time emotion and stress detection',
  },
  'continuous-monitoring': {
    feature: 'Continuous Monitoring',
    mode: 'AUTONOMOUS',
    enabled: true,
    confidenceThreshold: 75,
    requiresConfirmation: false,
    maxAutoActions: 100,
    safetyLevel: 'MEDIUM',
    description: 'Continuous severity reassessment',
  },
  'complexity-prediction': {
    feature: 'Complexity Prediction',
    mode: 'AUTONOMOUS',
    enabled: true,
    confidenceThreshold: 65,
    requiresConfirmation: false,
    maxAutoActions: 100,
    safetyLevel: 'LOW',
    description: 'Case complexity and resource estimation',
  },
  'resource-optimization': {
    feature: 'Resource Optimization',
    mode: 'MANUAL',
    enabled: true,
    confidenceThreshold: 85,
    requiresConfirmation: true,
    maxAutoActions: 0, // Always manual dispatch
    safetyLevel: 'CRITICAL',
    description: 'Facility selection and dispatch optimization',
  },
  'natural-language-commands': {
    feature: 'Natural Language Commands',
    mode: 'AUTONOMOUS',
    enabled: true,
    confidenceThreshold: 80,
    requiresConfirmation: false,
    maxAutoActions: 10,
    safetyLevel: 'MEDIUM',
    description: 'Parse and execute operator voice commands',
  },
  'transcription': {
    feature: 'Call Transcription',
    mode: 'AUTONOMOUS',
    enabled: true,
    confidenceThreshold: 60,
    requiresConfirmation: false,
    maxAutoActions: 100,
    safetyLevel: 'LOW',
    description: 'Live transcription and note-taking',
  },
}

export const AutonomousModeService = {
  /**
   * Initialize autonomous mode settings for a call
   */
  initializeAutonomousMode(callId: string, globalMode: FeatureMode = 'MANUAL'): AutonomousModeSettings {
    const features = new Map<string, FeatureConfig>()

    // Copy default features
    Object.entries(defaultFeatures).forEach(([key, config]) => {
      // Override with global mode if MANUAL
      if (globalMode === 'MANUAL') {
        config.mode = 'MANUAL'
        config.requiresConfirmation = true
      }
      features.set(key, { ...config })
    })

    const settings: AutonomousModeSettings = {
      globalMode,
      globalConfidenceThreshold: globalMode === 'MANUAL' ? 95 : 75,
      features,
      fallbackMode: 'MANUAL',
      auditLogging: true,
      requireConfirmationForEscalation: true,
      enableEmergencyShutdown: true,
    }

    autonomousSettings.set(callId, settings)
    actionAuditLog.set(callId, [])
    decisionHistory.set(callId, [])

    return settings
  },

  /**
   * Toggle feature between MANUAL and AUTONOMOUS
   */
  toggleFeatureMode(callId: string, featureName: string): FeatureConfig | null {
    const settings = autonomousSettings.get(callId)
    if (!settings) return null

    const feature = settings.features.get(featureName)
    if (!feature) return null

    // Toggle mode
    feature.mode = feature.mode === 'MANUAL' ? 'AUTONOMOUS' : 'MANUAL'

    // Adjust confirmation requirements
    if (feature.mode === 'MANUAL') {
      feature.requiresConfirmation = true
    } else {
      // For critical features, keep confirmation always on
      if (feature.safetyLevel === 'CRITICAL') {
        feature.requiresConfirmation = true
      }
    }

    this.logDecision(callId, `Feature mode toggled: ${featureName} → ${feature.mode}`)

    return feature
  },

  /**
   * Toggle ALL features between MANUAL and AUTONOMOUS
   */
  toggleGlobalMode(callId: string): AutonomousModeSettings | null {
    const settings = autonomousSettings.get(callId)
    if (!settings) return null

    const newMode: FeatureMode = settings.globalMode === 'MANUAL' ? 'AUTONOMOUS' : 'MANUAL'

    // Update all features (except critical ones)
    settings.features.forEach((feature) => {
      if (feature.safetyLevel !== 'CRITICAL') {
        feature.mode = newMode
        feature.requiresConfirmation = newMode === 'MANUAL'
      }
    })

    settings.globalMode = newMode
    this.logDecision(callId, `Global mode changed: ${newMode}`)

    return settings
  },

  /**
   * Set confidence threshold for a feature
   */
  setConfidenceThreshold(callId: string, featureName: string, threshold: number): boolean {
    const settings = autonomousSettings.get(callId)
    if (!settings) return false

    const feature = settings.features.get(featureName)
    if (!feature) return false

    // Constrain threshold
    feature.confidenceThreshold = Math.max(0, Math.min(100, threshold))

    this.logDecision(
      callId,
      `Confidence threshold updated: ${featureName} → ${feature.confidenceThreshold}%`
    )

    return true
  },

  /**
   * Check if action should be executed autonomously
   */
  canExecuteAutonomously(
    callId: string,
    featureName: string,
    confidence: number
  ): {
    canExecute: boolean
    reason: string
    requiresConfirmation: boolean
  } {
    const settings = autonomousSettings.get(callId)
    if (!settings) {
      return { canExecute: false, reason: 'No settings found', requiresConfirmation: true }
    }

    const feature = settings.features.get(featureName)
    if (!feature) {
      return { canExecute: false, reason: 'Feature not found', requiresConfirmation: true }
    }

    if (!feature.enabled) {
      return { canExecute: false, reason: 'Feature disabled', requiresConfirmation: false }
    }

    if (feature.mode === 'MANUAL') {
      return {
        canExecute: false,
        reason: 'Feature in MANUAL mode',
        requiresConfirmation: true,
      }
    }

    if (confidence < feature.confidenceThreshold) {
      return {
        canExecute: false,
        reason: `Confidence (${confidence}%) below threshold (${feature.confidenceThreshold}%)`,
        requiresConfirmation: false,
      }
    }

    return {
      canExecute: true,
      reason: 'All checks passed',
      requiresConfirmation: feature.requiresConfirmation,
    }
  },

  /**
   * Log an autonomous action
   */
  logAutonomousAction(
    callId: string,
    featureName: string,
    decision: string,
    confidence: number,
    reasoning: string[],
    parameters: Record<string, any>,
    executedBy: 'AUTONOMOUS' | 'OPERATOR' = 'AUTONOMOUS',
    outcome: 'success' | 'failed' | 'pending' = 'pending'
  ): AutonomousAction {
    const action: AutonomousAction = {
      actionId: `${callId}-${Date.now()}`,
      feature: featureName,
      timestamp: Date.now(),
      decision,
      confidence,
      reasoning,
      parameters,
      executedBy,
      outcome,
      auditLog: this.generateAuditLogEntry(featureName, decision, executedBy, confidence),
    }

    const log = actionAuditLog.get(callId) || []
    log.push(action)
    actionAuditLog.set(callId, log)

    return action
  },

  /**
   * Generate audit log entry
   */
  private generateAuditLogEntry(
    feature: string,
    decision: string,
    executedBy: string,
    confidence: number
  ): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] ${executedBy} executed '${feature}': ${decision} (Confidence: ${confidence}%)`
  },

  /**
   * Log a decision (for thinking process visibility)
   */
  private logDecision(callId: string, decision: string, metadata: any = {}): void {
    const history = decisionHistory.get(callId) || []
    history.push({
      timestamp: Date.now(),
      decision,
      metadata,
    })
    decisionHistory.set(callId, history)
  },

  /**
   * Get current settings
   */
  getSettings(callId: string): AutonomousModeSettings | null {
    return autonomousSettings.get(callId) || null
  },

  /**
   * Get a specific feature config
   */
  getFeatureConfig(callId: string, featureName: string): FeatureConfig | null {
    const settings = autonomousSettings.get(callId)
    return settings ? (settings.features.get(featureName) || null) : null
  },

  /**
   * Get all features status
   */
  getAllFeaturesStatus(callId: string): Array<FeatureConfig & { canAuto: boolean }> {
    const settings = autonomousSettings.get(callId)
    if (!settings) return []

    return Array.from(settings.features.values()).map((feature) => ({
      ...feature,
      canAuto: feature.mode === 'AUTONOMOUS' && feature.enabled,
    }))
  },

  /**
   * Get action audit log
   */
  getAuditLog(callId: string): AutonomousAction[] {
    return actionAuditLog.get(callId) || []
  },

  /**
   * Get decision history (showing thinking process)
   */
  getDecisionHistory(callId: string): any[] {
    return decisionHistory.get(callId) || []
  },

  /**
   * Get thinking process summary
   */
  getThinkingProcessSummary(callId: string): {
    autonomousDecisions: number
    manualDecisions: number
    averageConfidence: number
    recentThinking: string[]
    systemStatus: string
  } {
    const auditLog = actionAuditLog.get(callId) || []
    const decisionHist = decisionHistory.get(callId) || []

    const autonomousCount = auditLog.filter((a) => a.executedBy === 'AUTONOMOUS').length
    const manualCount = auditLog.filter((a) => a.executedBy === 'OPERATOR').length

    const avgConfidence =
      auditLog.length > 0
        ? Math.round(auditLog.reduce((sum, a) => sum + a.confidence, 0) / auditLog.length)
        : 0

    const recentThinking = decisionHist.slice(-5).map((d) => d.decision)

    const settings = autonomousSettings.get(callId)
    const systemStatus =
      settings?.globalMode === 'AUTONOMOUS'
        ? `🤖 AUTONOMOUS MODE (${recentThinking.length} decisions made)`
        : `👤 MANUAL MODE (${manualCount} operator actions)`

    return {
      autonomousDecisions: autonomousCount,
      manualDecisions: manualCount,
      averageConfidence: avgConfidence,
      recentThinking,
      systemStatus,
    }
  },

  /**
   * Enable emergency shutdown
   */
  emergencyShutdown(callId: string): void {
    const settings = autonomousSettings.get(callId)
    if (!settings) return

    // Force all features to MANUAL
    settings.features.forEach((feature) => {
      feature.mode = 'MANUAL'
      feature.requiresConfirmation = true
    })

    settings.globalMode = 'MANUAL'
    settings.fallbackMode = 'SUSPEND'

    this.logDecision(callId, '🚨 EMERGENCY SHUTDOWN ACTIVATED - All features set to MANUAL')
  },

  /**
   * Reset to safe mode
   */
  resetToSafeMode(callId: string): AutonomousModeSettings | null {
    const settings = autonomousSettings.get(callId)
    if (!settings) return null

    // Reset all features to defaults with MANUAL mode
    settings.features.forEach((feature) => {
      feature.mode = 'MANUAL'
      feature.requiresConfirmation = true
    })

    settings.globalMode = 'MANUAL'

    this.logDecision(callId, 'Reset to SAFE MODE - All features in MANUAL mode')

    return settings
  },

  /**
   * Get safety analysis
   */
  getSafetyAnalysis(callId: string): {
    overallSafetyLevel: SafetyLevel
    riskFactors: string[]
    recommendations: string[]
    criticalFeatures: string[]
  } {
    const settings = autonomousSettings.get(callId)
    if (!settings) {
      return {
        overallSafetyLevel: 'LOW',
        riskFactors: [],
        recommendations: [],
        criticalFeatures: [],
      }
    }

    const riskFactors: string[] = []
    const criticalFeatures: string[] = []

    settings.features.forEach((feature) => {
      if (feature.safetyLevel === 'CRITICAL' && feature.mode === 'AUTONOMOUS') {
        criticalFeatures.push(feature.feature)
        riskFactors.push(`CRITICAL: ${feature.feature} in AUTONOMOUS mode`)
      }

      if (feature.confidenceThreshold < 50) {
        riskFactors.push(`LOW CONFIDENCE THRESHOLD: ${feature.feature}`)
      }
    })

    const recommendations: string[] = []
    if (criticalFeatures.length > 0) {
      recommendations.push(`⚠️ Consider switching ${criticalFeatures.join(', ')} to MANUAL mode`)
    }

    if (riskFactors.length === 0) {
      recommendations.push('✅ System safety parameters are well-configured')
    }

    let overallSafetyLevel: SafetyLevel = 'LOW'
    if (riskFactors.length > 2) overallSafetyLevel = 'HIGH'
    if (criticalFeatures.length > 0) overallSafetyLevel = 'CRITICAL'
    if (riskFactors.length === 0) overallSafetyLevel = 'MEDIUM'

    return {
      overallSafetyLevel,
      riskFactors,
      recommendations,
      criticalFeatures,
    }
  },

  /**
   * Clear autonomous data
   */
  clearAutonomousData(callId: string): void {
    autonomousSettings.delete(callId)
    actionAuditLog.delete(callId)
    decisionHistory.delete(callId)
  },
}
