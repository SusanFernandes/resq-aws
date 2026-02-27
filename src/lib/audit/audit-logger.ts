/**
 * Audit Logger Service
 * Tracks all dispatch decisions, escalations, and overrides for compliance
 * Uses localStorage for persistence (can be swapped for database later)
 */

export interface AuditLog {
  id: string
  timestamp: string
  eventType: 'DISPATCH' | 'ESCALATION' | 'OVERRIDE' | 'DECISION' | 'STATUS_UPDATE'
  emergencyId: string
  action: string
  actor: {
    type: 'SYSTEM' | 'OPERATOR' | 'SUPERVISOR'
    name?: string
    id?: string
  }
  data: Record<string, any>
  confidence?: number
  outcome?: 'SUCCESS' | 'FAILED' | 'PENDING'
  notes?: string
}

class AuditLogger {
  private storageKey = 'resq_audit_logs'
  private maxLogs = 10000 // Keep last 10k logs in storage

  /**
   * Log an event to audit trail
   */
  log(event: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const auditLog: AuditLog = {
      ...event,
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    }

    // Add to localStorage
    const logs = this.getAllLogs()
    logs.push(auditLog)

    // Keep only recent logs
    if (logs.length > this.maxLogs) {
      logs.splice(0, logs.length - this.maxLogs)
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(logs))
    } catch (error) {
      console.error('Failed to save audit log:', error)
    }

    // Also log to console for development
    console.log('[AUDIT]', auditLog)

    return auditLog
  }

  /**
   * Get all audit logs
   */
  getAllLogs(): AuditLog[] {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error)
      return []
    }
  }

  /**
   * Get logs for a specific emergency
   */
  getEmergencyLogs(emergencyId: string): AuditLog[] {
    return this.getAllLogs().filter((log) => log.emergencyId === emergencyId)
  }

  /**
   * Get logs by event type
   */
  getLogsByType(eventType: AuditLog['eventType']): AuditLog[] {
    return this.getAllLogs().filter((log) => log.eventType === eventType)
  }

  /**
   * Get logs for a specific actor
   */
  getActorLogs(actorId?: string, actorType?: AuditLog['actor']['type']): AuditLog[] {
    return this.getAllLogs().filter((log) => {
      if (actorType && log.actor.type !== actorType) return false
      if (actorId && log.actor.id !== actorId) return false
      return true
    })
  }

  /**
   * Export logs as CSV for compliance
   */
  exportAsCSV(): string {
    const logs = this.getAllLogs()
    const headers = ['ID', 'Timestamp', 'Type', 'Emergency ID', 'Action', 'Actor', 'Outcome']
    const rows = logs.map((log) => [
      log.id,
      log.timestamp,
      log.eventType,
      log.emergencyId,
      log.action,
      `${log.actor.type}:${log.actor.name || 'SYSTEM'}`,
      log.outcome || 'N/A',
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    return csv
  }

  /**
   * Get recent logs (last N entries)
   */
  getRecentLogs(count: number = 50): AuditLog[] {
    const logs = this.getAllLogs()
    return logs.slice(Math.max(0, logs.length - count))
  }

  /**
   * Clear old logs (keep last 30 days)
   */
  clearOldLogs(daysToKeep: number = 30): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const logs = this.getAllLogs()
    const filtered = logs.filter((log) => new Date(log.timestamp) > cutoffDate)

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(filtered))
    } catch (error) {
      console.error('Failed to clear old logs:', error)
    }
  }

  /**
   * Get statistics on dispatch success
   */
  getDispatchStats(): {
    totalDispatches: number
    successfulDispatches: number
    successRate: number
    averageConfidence: number
  } {
    const dispatchLogs = this.getLogsByType('DISPATCH')
    const successful = dispatchLogs.filter((log) => log.outcome === 'SUCCESS')

    const avgConfidence =
      dispatchLogs.reduce((sum, log) => sum + (log.confidence || 0), 0) /
        dispatchLogs.length || 0

    return {
      totalDispatches: dispatchLogs.length,
      successfulDispatches: successful.length,
      successRate: dispatchLogs.length > 0 ? successful.length / dispatchLogs.length : 0,
      averageConfidence: avgConfidence,
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger()
