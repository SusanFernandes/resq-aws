/**
 * Escalation Service
 * Manages escalation to supervisors when confidence is low
 * Handles supervisor overrides and decision tracking
 */

import { auditLogger } from '@/lib/audit/audit-logger'

export interface EscalationTicket {
  id: string
  emergencyId: string
  timestamp: string
  reason: string
  confidence: number
  emergencyType: string
  location: string
  assignedTo?: string
  status: 'PENDING' | 'REVIEWING' | 'APPROVED' | 'DENIED' | 'OVERRIDDEN'
  supervisorDecision?: {
    timestamp: string
    supervisor: string
    action: 'APPROVE_DISPATCH' | 'FORCE_DISPATCH' | 'DENY_DISPATCH' | 'REQUIRE_MORE_INFO'
    newConfidence?: number
    reasoning: string
  }
  notes?: string
}

class EscalationService {
  private escalationQueue: Map<string, EscalationTicket> = new Map()
  private supervisorQueue: Map<string, EscalationTicket[]> = new Map()
  private storageKey = 'resq_escalations'

  /**
   * Create escalation ticket for low-confidence emergencies
   */
  createEscalation(
    emergencyId: string,
    reason: string,
    confidence: number,
    emergencyType: string,
    location: string
  ): EscalationTicket {
    const ticket: EscalationTicket = {
      id: `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      emergencyId,
      timestamp: new Date().toISOString(),
      reason,
      confidence,
      emergencyType,
      location,
      status: 'PENDING',
    }

    // Store in memory
    this.escalationQueue.set(ticket.id, ticket)

    // Persist to localStorage
    this.saveEscalation(ticket)

    // Log escalation
    auditLogger.log({
      eventType: 'ESCALATION',
      emergencyId,
      action: 'Escalation ticket created - waiting supervisor review',
      actor: {
        type: 'SYSTEM',
        name: 'A4_ESCALATION_MANAGER',
      },
      confidence,
      data: {
        ticketId: ticket.id,
        reason,
        emergencyType,
        location,
      },
      outcome: 'PENDING',
    })

    console.log('[ESCALATION] New ticket created:', ticket.id, 'Reason:', reason)

    return ticket
  }

  /**
   * Assign escalation to supervisor
   */
  assignToSupervisor(ticketId: string, supervisorId: string): boolean {
    const ticket = this.escalationQueue.get(ticketId)
    if (!ticket) return false

    ticket.assignedTo = supervisorId
    ticket.status = 'REVIEWING'

    // Add to supervisor's queue
    if (!this.supervisorQueue.has(supervisorId)) {
      this.supervisorQueue.set(supervisorId, [])
    }
    this.supervisorQueue.get(supervisorId)!.push(ticket)

    this.updateEscalation(ticket)

    auditLogger.log({
      eventType: 'ESCALATION',
      emergencyId: ticket.emergencyId,
      action: 'Escalation assigned to supervisor review',
      actor: {
        type: 'SYSTEM',
        name: 'ASSIGNMENT',
      },
      data: { ticketId, supervisorId },
    })

    return true
  }

  /**
   * Supervisor approves dispatch at original or adjusted confidence
   */
  approveDispatch(
    ticketId: string,
    supervisorId: string,
    reasoning: string,
    newConfidence?: number
  ): EscalationTicket | null {
    const ticket = this.escalationQueue.get(ticketId)
    if (!ticket) return null

    ticket.status = 'APPROVED'
    ticket.supervisorDecision = {
      timestamp: new Date().toISOString(),
      supervisor: supervisorId,
      action: 'APPROVE_DISPATCH',
      newConfidence,
      reasoning,
    }

    this.updateEscalation(ticket)

    auditLogger.log({
      eventType: 'ESCALATION',
      emergencyId: ticket.emergencyId,
      action: 'Supervisor approved dispatch',
      actor: {
        type: 'SUPERVISOR',
        id: supervisorId,
        name: supervisorId,
      },
      confidence: newConfidence || ticket.confidence,
      data: {
        ticketId,
        originalConfidence: ticket.confidence,
        newConfidence,
        reasoning,
      },
      outcome: 'SUCCESS',
    })

    console.log('[ESCALATION] Dispatch approved by supervisor:', supervisorId)

    return ticket
  }

  /**
   * Supervisor forces dispatch despite low confidence (emergency override)
   */
  forceDispatch(
    ticketId: string,
    supervisorId: string,
    reasoning: string,
    forceConfidence?: number
  ): EscalationTicket | null {
    const ticket = this.escalationQueue.get(ticketId)
    if (!ticket) return null

    ticket.status = 'OVERRIDDEN'
    ticket.supervisorDecision = {
      timestamp: new Date().toISOString(),
      supervisor: supervisorId,
      action: 'FORCE_DISPATCH',
      newConfidence: forceConfidence || 85, // Treat as high-confidence dispatch
      reasoning,
    }

    this.updateEscalation(ticket)

    auditLogger.log({
      eventType: 'ESCALATION',
      emergencyId: ticket.emergencyId,
      action: 'Supervisor FORCED dispatch (override)',
      actor: {
        type: 'SUPERVISOR',
        id: supervisorId,
        name: supervisorId,
      },
      confidence: forceConfidence || 85,
      data: {
        ticketId,
        originalConfidence: ticket.confidence,
        forceConfidence,
        reasoning,
        escalationReason: ticket.reason,
      },
      outcome: 'SUCCESS',
      notes: 'CRITICAL: Supervisor override for low-confidence emergency',
    })

    console.log('[ESCALATION] Dispatch FORCED by supervisor:', supervisorId, 'Reason:', reasoning)

    return ticket
  }

  /**
   * Supervisor denies dispatch (requires more information)
   */
  denyDispatch(ticketId: string, supervisorId: string, reasoning: string): EscalationTicket | null {
    const ticket = this.escalationQueue.get(ticketId)
    if (!ticket) return null

    ticket.status = 'DENIED'
    ticket.supervisorDecision = {
      timestamp: new Date().toISOString(),
      supervisor: supervisorId,
      action: 'DENY_DISPATCH',
      reasoning,
    }

    this.updateEscalation(ticket)

    auditLogger.log({
      eventType: 'ESCALATION',
      emergencyId: ticket.emergencyId,
      action: 'Supervisor DENIED dispatch - requires more information',
      actor: {
        type: 'SUPERVISOR',
        id: supervisorId,
      },
      data: {
        ticketId,
        reasoning,
      },
      outcome: 'FAILED',
    })

    console.log('[ESCALATION] Dispatch denied by supervisor:', supervisorId)

    return ticket
  }

  /**
   * Get escalation ticket by ID
   */
  getTicket(ticketId: string): EscalationTicket | null {
    return this.escalationQueue.get(ticketId) || null
  }

  /**
   * Get all pending escalations
   */
  getPendingEscalations(): EscalationTicket[] {
    return Array.from(this.escalationQueue.values()).filter((t) => t.status === 'PENDING')
  }

  /**
   * Get supervisor's work queue
   */
  getSupervisorQueue(supervisorId: string): EscalationTicket[] {
    const pendingAssigned = Array.from(this.escalationQueue.values()).filter(
      (t) => t.assignedTo === supervisorId && t.status === 'REVIEWING'
    )
    return pendingAssigned
  }

  /**
   * Get unassigned escalations (waiting for supervisor)
   */
  getUnassignedEscalations(): EscalationTicket[] {
    return Array.from(this.escalationQueue.values()).filter(
      (t) => !t.assignedTo && t.status === 'PENDING'
    )
  }

  /**
   * Get escalation stats
   */
  getStats(): {
    totalEscalations: number
    pending: number
    approved: number
    denied: number
    overridden: number
    averageResolutionTime: number
  } {
    const tickets = Array.from(this.escalationQueue.values())
    const completed = tickets.filter((t) => t.supervisorDecision)

    let totalResolutionTime = 0
    completed.forEach((t) => {
      const created = new Date(t.timestamp).getTime()
      const resolved = new Date(t.supervisorDecision!.timestamp).getTime()
      totalResolutionTime += resolved - created
    })

    return {
      totalEscalations: tickets.length,
      pending: tickets.filter((t) => t.status === 'PENDING').length,
      approved: tickets.filter((t) => t.status === 'APPROVED').length,
      denied: tickets.filter((t) => t.status === 'DENIED').length,
      overridden: tickets.filter((t) => t.status === 'OVERRIDDEN').length,
      averageResolutionTime: completed.length > 0 ? totalResolutionTime / completed.length : 0,
    }
  }

  /**
   * Private: Save escalation to localStorage
   */
  private saveEscalation(ticket: EscalationTicket): void {
    try {
      const all = this.getAllEscalations()
      all.push(ticket)
      localStorage.setItem(this.storageKey, JSON.stringify(all))
    } catch (error) {
      console.error('Failed to save escalation:', error)
    }
  }

  /**
   * Private: Update escalation in localStorage
   */
  private updateEscalation(ticket: EscalationTicket): void {
    try {
      const all = this.getAllEscalations()
      const index = all.findIndex((t) => t.id === ticket.id)
      if (index >= 0) {
        all[index] = ticket
        localStorage.setItem(this.storageKey, JSON.stringify(all))
      }
    } catch (error) {
      console.error('Failed to update escalation:', error)
    }
  }

  /**
   * Get all escalations from storage
   */
  private getAllEscalations(): EscalationTicket[] {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Failed to retrieve escalations:', error)
      return []
    }
  }
}

export const escalationService = new EscalationService()
