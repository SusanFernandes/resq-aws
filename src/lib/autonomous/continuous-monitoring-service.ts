/**
 * Continuous Monitoring Service (TIER 3 - A9)
 * Constantly reassesses emergency severity during call
 */

export interface SeverityPoint {
  timestamp: number
  severity: number // 0-100
  change: number // Delta from previous
  reason: string
  escalated: boolean
}

export interface MonitoringResult {
  initialSeverity: number
  currentSeverity: number
  delta: number // Change amount
  trend: 'escalating' | 'de-escalating' | 'stable'
  escalationTriggered: boolean
  escalationReason?: string
  timeline: SeverityPoint[]
  reassessmentCount: number
  nextReassessmentIn: number // milliseconds
}

const monitoringDatabase: Map<string, SeverityPoint[]> = new Map()
const callStartTime: Map<string, number> = new Map()
const reassessmentTimers: Map<string, NodeJS.Timeout> = new Map()

export const ContinuousMonitoringService = {
  /**
   * Start monitoring a call
   */
  startMonitoring(callId: string, initialSeverity: number): MonitoringResult {
    callStartTime.set(callId, Date.now())
    monitoringDatabase.set(callId, [
      {
        timestamp: Date.now(),
        severity: initialSeverity,
        change: 0,
        reason: 'Initial assessment',
        escalated: initialSeverity > 85,
      },
    ])

    return this.getMonitoringStatus(callId, initialSeverity)
  },

  /**
   * Get current monitoring status with timeline
   */
  getMonitoringStatus(callId: string, currentSeverity: number): MonitoringResult {
    const timeline = monitoringDatabase.get(callId) || []
    const initialSeverity = timeline[0]?.severity || currentSeverity
    const lastPoint = timeline[timeline.length - 1]
    const delta = currentSeverity - (lastPoint?.severity || initialSeverity)

    // Determine trend
    let trend: 'escalating' | 'de-escalating' | 'stable'
    if (Math.abs(delta) < 5) {
      trend = 'stable'
    } else if (delta > 0) {
      trend = 'escalating'
    } else {
      trend = 'de-escalating'
    }

    // Check escalation trigger
    const escalationTriggered = this.checkEscalationTrigger(currentSeverity, delta, trend, timeline)

    return {
      initialSeverity,
      currentSeverity,
      delta,
      trend,
      escalationTriggered,
      escalationReason: escalationTriggered
        ? this.getEscalationReason(currentSeverity, delta, trend)
        : undefined,
      timeline,
      reassessmentCount: timeline.length,
      nextReassessmentIn: 10000, // 10 second reassessment interval
    }
  },

  /**
   * Record a reassessment
   */
  recordReassessment(
    callId: string,
    newSeverity: number,
    symptoms: string[],
    emotionIntensity: number
  ): MonitoringResult {
    const timeline = monitoringDatabase.get(callId) || []
    const previousSeverity = timeline[timeline.length - 1]?.severity || newSeverity
    const delta = newSeverity - previousSeverity

    // Determine reason for change
    const reason = this.determineChangeReason(symptoms, emotionIntensity, delta)

    const point: SeverityPoint = {
      timestamp: Date.now(),
      severity: newSeverity,
      change: delta,
      reason,
      escalated: this.checkEscalationTrigger(newSeverity, delta, 'escalating', timeline),
    }

    timeline.push(point)
    monitoringDatabase.set(callId, timeline)

    return this.getMonitoringStatus(callId, newSeverity)
  },

  /**
   * Check if escalation should be triggered
   */
  private checkEscalationTrigger(
    currentSeverity: number,
    delta: number,
    trend: string,
    timeline: SeverityPoint[]
  ): boolean {
    // Escalate if critical severity reached
    if (currentSeverity > 90) return true

    // Escalate if rapidly worsening (>20 point jump)
    if (delta > 20) return true

    // Escalate if consistently escalating (3+ consecutive increases)
    let consecutiveIncreases = 0
    for (let i = timeline.length - 1; i > Math.max(0, timeline.length - 4); i--) {
      if (timeline[i] && timeline[i - 1] && timeline[i].severity > timeline[i - 1].severity) {
        consecutiveIncreases++
      }
    }
    if (consecutiveIncreases >= 3) return true

    // Escalate if trend reversed from de-escalating to escalating
    if (timeline.length >= 2) {
      const recentDelta = timeline[timeline.length - 1].change
      const previousDelta = timeline[timeline.length - 2].change
      if (previousDelta < 0 && recentDelta > 0 && recentDelta > 10) return true
    }

    return false
  },

  /**
   * Determine reason for severity change
   */
  private determineChangeReason(symptoms: string[], emotionIntensity: number, delta: number): string {
    if (delta > 20) {
      return `⚠️ RAPID ESCALATION: New critical symptoms detected (${symptoms.slice(0, 2).join(', ')})`
    }

    if (delta > 10) {
      if (emotionIntensity > 80) {
        return `😨 Caller panic increasing, emotional distress rising`
      }
      return `⬆️ Severity increasing: Additional symptoms or worsening conditions`
    }

    if (delta > 0) {
      return `📈 Minor severity increase: ${symptoms[0] || 'General condition change'}`
    }

    if (delta < -10) {
      return `📉 Significant improvement: Symptoms stabilizing, caller calming`
    }

    if (delta < 0) {
      return `✅ Condition improving: Slight stability observed`
    }

    return `➡️ Status stable: No significant change in condition`
  },

  /**
   * Get escalation reason
   */
  private getEscalationReason(
    currentSeverity: number,
    delta: number,
    trend: string
  ): string {
    if (currentSeverity > 90) {
      return `Critical severity (${currentSeverity}/100) - Requires immediate multi-agency response`
    }

    if (delta > 20) {
      return `Rapid escalation detected (+${delta} points) - Severity increased dramatically`
    }

    if (trend === 'escalating') {
      return `Consistent escalation pattern - Situation worsening over time`
    }

    return `Status requires upgrade - Recommend senior operator review`
  },

  /**
   * Get timeline data for visualization
   */
  getTimelineData(callId: string): Array<{ time: string; severity: number; change: number }> {
    const timeline = monitoringDatabase.get(callId) || []
    const startTime = callStartTime.get(callId) || Date.now()

    return timeline.map((point) => ({
      time: `${Math.round((point.timestamp - startTime) / 1000)}s`,
      severity: point.severity,
      change: point.change,
    }))
  },

  /**
   * Check if severity change significant enough for operator notification
   */
  shouldNotifyOperator(
    callId: string,
    newSeverity: number,
    lastNotifiedSeverity: number
  ): boolean {
    const delta = Math.abs(newSeverity - lastNotifiedSeverity)

    // Notify if change > 15 points
    if (delta > 15) return true

    // Notify if crossed severity threshold (low→moderate, moderate→high, high→critical)
    const oldLevel = this.getSeverityLevel(lastNotifiedSeverity)
    const newLevel = this.getSeverityLevel(newSeverity)
    if (oldLevel !== newLevel) return true

    return false
  },

  /**
   * Get severity level name
   */
  private getSeverityLevel(severity: number): string {
    if (severity < 30) return 'LOW'
    if (severity < 60) return 'MEDIUM'
    if (severity < 85) return 'HIGH'
    return 'CRITICAL'
  },

  /**
   * Get monitoring summary for display
   */
  getMonitoringSummary(callId: string): {
    status: string
    icon: string
    color: string
    speedIndicator: string
  } {
    const timeline = monitoringDatabase.get(callId) || []
    if (timeline.length < 2) {
      return {
        status: 'Monitoring started',
        icon: '🔍',
        color: 'blue',
        speedIndicator: '➡️ Normal pace',
      }
    }

    const lastTwo = timeline.slice(-2)
    const trend = lastTwo[1].severity > lastTwo[0].severity ? 'escalating' : 'stable'
    const delta = Math.abs(lastTwo[1].severity - lastTwo[0].severity)

    if (trend === 'escalating') {
      if (delta > 20) {
        return {
          status: 'CRITICAL ESCALATION',
          icon: '🚨',
          color: 'red',
          speedIndicator: '⚡ RAPID SPIKE',
        }
      }
      return {
        status: 'Severity increasing',
        icon: '⬆️',
        color: 'orange',
        speedIndicator: '📈 Escalating',
      }
    }

    return {
      status: 'Stable',
      icon: '✅',
      color: 'green',
      speedIndicator: '➡️ Stable',
    }
  },

  /**
   * Clean up monitoring data
   */
  stopMonitoring(callId: string): void {
    monitoringDatabase.delete(callId)
    callStartTime.delete(callId)

    if (reassessmentTimers.has(callId)) {
      clearInterval(reassessmentTimers.get(callId))
      reassessmentTimers.delete(callId)
    }
  },
}
