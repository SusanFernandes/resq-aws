/**
 * Dispatch Service
 * Handles emergency resource dispatching to hospitals/agencies
 * Manages the entire dispatch lifecycle and notifications
 */

import { auditLogger } from '@/lib/audit/audit-logger'

export interface DispatchRequest {
  emergencyId: string
  hospitalId: string
  hospitalName: string
  hospitalPhone: string
  address: string
  latitude: number
  longitude: number
  emergencyType: string
  severity: string
  patientDetails: {
    name?: string
    age?: string
    condition: string
  }
  estimatedArrival?: number // minutes
  notes?: string
  dispatchedBy: 'SYSTEM' | 'OPERATOR'
}

export interface DispatchResponse {
  id: string
  status: 'SENT' | 'ACKNOWLEDGED' | 'FAILED'
  timestamp: string
  hospitalConfirmation?: {
    received: boolean
    eta?: number
    resourcesDispatched?: string[]
  }
}

export interface NotificationData {
  type: 'SMS' | 'CALL' | 'DASHBOARD' | 'EMAIL'
  recipient: string
  message: string
  sentAt: string
}

class DispatchService {
  private dispatchQueue: Map<string, DispatchRequest> = new Map()
  private notificationLog: NotificationData[] = []

  /**
   * Auto-dispatch to selected hospital
   * Called when A1 decision = AUTO_DISPATCH
   */
  async autoDispatch(request: DispatchRequest): Promise<DispatchResponse> {
    console.log('[DISPATCH] Auto-dispatching to:', request.hospitalName)

    try {
      // Log the dispatch decision
      auditLogger.log({
        eventType: 'DISPATCH',
        emergencyId: request.emergencyId,
        action: `Auto-dispatch to ${request.hospitalName}`,
        actor: {
          type: 'SYSTEM',
          name: 'AUTO_DISPATCH_A8',
        },
        data: {
          hospital: request.hospitalName,
          address: request.address,
          emergencyType: request.emergencyType,
          severity: request.severity,
        },
        outcome: 'PENDING',
      })

      // Send to backend API
      const response = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`Dispatch API returned ${response.status}`)
      }

      const dispatchResponse: DispatchResponse = await response.json()

      // Log success
      auditLogger.log({
        eventType: 'DISPATCH',
        emergencyId: request.emergencyId,
        action: `Dispatch sent successfully to ${request.hospitalName}`,
        actor: {
          type: 'SYSTEM',
          name: 'AUTO_DISPATCH_A8',
        },
        data: dispatchResponse,
        outcome: 'SUCCESS',
      })

      // Send notifications
      await this.sendNotifications(request, dispatchResponse)

      return dispatchResponse
    } catch (error) {
      console.error('[DISPATCH] Error:', error)

      // Log failure
      auditLogger.log({
        eventType: 'DISPATCH',
        emergencyId: request.emergencyId,
        action: `Dispatch FAILED to ${request.hospitalName}`,
        actor: {
          type: 'SYSTEM',
          name: 'AUTO_DISPATCH_A8',
        },
        data: { error: String(error) },
        outcome: 'FAILED',
        notes: String(error),
      })

      throw error
    }
  }

  /**
   * Operator-initiated dispatch
   */
  async operatorDispatch(request: DispatchRequest, operatorId: string): Promise<DispatchResponse> {
    console.log('[DISPATCH] Operator dispatch by:', operatorId)

    try {
      auditLogger.log({
        eventType: 'DISPATCH',
        emergencyId: request.emergencyId,
        action: `Operator dispatch to ${request.hospitalName}`,
        actor: {
          type: 'OPERATOR',
          id: operatorId,
        },
        data: { hospital: request.hospitalName, emergencyType: request.emergencyType },
        outcome: 'PENDING',
      })

      const response = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, dispatchedBy: 'OPERATOR' }),
      })

      if (!response.ok) {
        throw new Error(`Dispatch API returned ${response.status}`)
      }

      const dispatchResponse: DispatchResponse = await response.json()

      auditLogger.log({
        eventType: 'DISPATCH',
        emergencyId: request.emergencyId,
        action: `Operator dispatch sent to ${request.hospitalName}`,
        actor: {
          type: 'OPERATOR',
          id: operatorId,
        },
        data: dispatchResponse,
        outcome: 'SUCCESS',
      })

      await this.sendNotifications(request, dispatchResponse)

      return dispatchResponse
    } catch (error) {
      auditLogger.log({
        eventType: 'DISPATCH',
        emergencyId: request.emergencyId,
        action: `Operator dispatch FAILED`,
        actor: {
          type: 'OPERATOR',
          id: operatorId,
        },
        data: { error: String(error) },
        outcome: 'FAILED',
      })

      throw error
    }
  }

  /**
   * Send notifications to all relevant parties
   */
  private async sendNotifications(
    request: DispatchRequest,
    dispatchResponse: DispatchResponse
  ): Promise<void> {
    const notifications: NotificationData[] = []

    // 1. SMS to hospital
    notifications.push({
      type: 'SMS',
      recipient: request.hospitalPhone,
      message: `[ResQ] EMERGENCY DISPATCH: ${request.emergencyType} at ${request.address}. Patient: ${request.patientDetails.name || 'Unknown'}. ETA: ${request.estimatedArrival || '?'} min. Contact: 911`,
      sentAt: new Date().toISOString(),
    })

    // 2. Dashboard notification to operators
    notifications.push({
      type: 'DASHBOARD',
      recipient: 'ALL_OPERATORS',
      message: `Dispatch sent to ${request.hospitalName} for ${request.emergencyType} at ${request.address}`,
      sentAt: new Date().toISOString(),
    })

    // Send via backend
    await Promise.all(
      notifications.map((notif) =>
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notif),
        }).catch((e) => console.error('Notification failed:', e))
      )
    )

    // Store locally
    this.notificationLog.push(...notifications)

    console.log('[DISPATCH] Notifications sent:', notifications.length)
  }

  /**
   * Acknowledge dispatch receipt
   */
  async acknowledgeDispatch(dispatchId: string, hospitalId: string): Promise<void> {
    console.log('[DISPATCH] Acknowledging dispatch:', dispatchId)

    try {
      const response = await fetch(`/api/dispatch/${dispatchId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId }),
      })

      if (!response.ok) {
        throw new Error('Failed to acknowledge dispatch')
      }

      auditLogger.log({
        eventType: 'STATUS_UPDATE',
        emergencyId: dispatchId,
        action: 'Dispatch acknowledged by hospital',
        actor: {
          type: 'SYSTEM',
          name: 'HOSPITAL_ACK',
        },
        data: { hospitalId },
        outcome: 'SUCCESS',
      })
    } catch (error) {
      console.error('[DISPATCH] Acknowledge failed:', error)
      throw error
    }
  }

  /**
   * Cancel dispatch
   */
  async cancelDispatch(dispatchId: string, reason: string, cancelledBy: string): Promise<void> {
    console.log('[DISPATCH] Cancelling dispatch:', dispatchId)

    try {
      const response = await fetch(`/api/dispatch/${dispatchId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, cancelledBy }),
      })

      if (!response.ok) {
        throw new Error('Failed to cancel dispatch')
      }

      auditLogger.log({
        eventType: 'STATUS_UPDATE',
        emergencyId: dispatchId,
        action: 'Dispatch cancelled',
        actor: {
          type: 'OPERATOR',
          id: cancelledBy,
        },
        data: { reason },
        outcome: 'SUCCESS',
      })
    } catch (error) {
      console.error('[DISPATCH] Cancel failed:', error)
      throw error
    }
  }

  /**
   * Get dispatch status
   */
  async getDispatchStatus(dispatchId: string): Promise<DispatchResponse | null> {
    try {
      const response = await fetch(`/api/dispatch/${dispatchId}`)
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      console.error('[DISPATCH] Status check failed:', error)
      return null
    }
  }

  /**
   * Get notifications log
   */
  getNotificationLog(): NotificationData[] {
    return this.notificationLog
  }

  /**
   * Clear old notification logs
   */
  clearOldNotifications(hoursToKeep: number = 24): void {
    const cutoff = Date.now() - hoursToKeep * 60 * 60 * 1000
    this.notificationLog = this.notificationLog.filter((notif) => {
      return new Date(notif.sentAt).getTime() > cutoff
    })
  }
}

export const dispatchService = new DispatchService()
