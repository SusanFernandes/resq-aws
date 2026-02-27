'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Send,
  Loader,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AIAnalysisData } from '@/components/ai-analysis-card'
import { escalationService, type EscalationTicket } from '@/lib/escalation/escalation-service'
import { auditLogger } from '@/lib/audit/audit-logger'
import type { Hospital } from '@/features/user-facing/hospital-finder/hospital-finder'

interface EscalationManagerProps {
  analysis: AIAnalysisData | null
  selectedHospital: Hospital | null
  emergencyId: string
  onEscalationCreated?: (ticket: EscalationTicket) => void
  onDecisionMade?: (ticket: EscalationTicket) => void
}

export function EscalationManager({
  analysis,
  selectedHospital,
  emergencyId,
  onEscalationCreated,
  onDecisionMade,
}: EscalationManagerProps) {
  const [escalationTicket, setEscalationTicket] = useState<EscalationTicket | null>(null)
  const [pendingTickets, setPendingTickets] = useState<EscalationTicket[]>([])
  const [supervisorId, setSupervisorId] = useState('')
  const [supervisorNotes, setSupervisorNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedAction, setSelectedAction] = useState<
    'APPROVE_DISPATCH' | 'FORCE_DISPATCH' | 'DENY_DISPATCH' | null
  >(null)

  useEffect(() => {
    // Only create escalation if we detect ESCALATE decision and no ticket exists yet
    if (!analysis || !emergencyId) return

    if (
      analysis.confidence.recommendation === 'ESCALATE_TO_HUMAN' &&
      !escalationTicket
    ) {
      // Create escalation ticket via backend
      const createEscalationTicket = async () => {
        try {
          const response = await fetch('/api/escalation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emergencyId,
              reason: analysis.confidence.reason,
              confidence: analysis.confidence.overall,
              emergencyType: analysis.intent.type,
              location: analysis.location?.address || 'Unknown location',
            }),
          })

          if (response.ok) {
            const data = await response.json()

            // Create local escalation record
            const ticket = escalationService.createEscalation(
              emergencyId,
              analysis.confidence.reason,
              analysis.confidence.overall,
              analysis.intent.type,
              analysis.location?.address || 'Unknown location'
            )

            setEscalationTicket(ticket)
            onEscalationCreated?.(ticket)

            console.log('[Escalation] Ticket created:', data.id)
          }
        } catch (error) {
          console.error('[Escalation] Error creating ticket:', error)
        }
      }

      createEscalationTicket()
    }

    // Load pending tickets
    const pending = escalationService.getPendingEscalations()
    setPendingTickets(pending)
  }, [analysis?.confidence.recommendation, emergencyId])

  if (!escalationTicket && analysis?.confidence.recommendation !== 'ESCALATE_TO_HUMAN') {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            A4: Escalation Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No escalation needed - confidence level acceptable
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleApproveDispatch = async () => {
    if (!escalationTicket || !supervisorId) return

    setIsProcessing(true)
    try {
      // Call backend to approve
      const response = await fetch(`/api/escalation/${escalationTicket.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisorId,
          reasoning: supervisorNotes,
          newConfidence: analysis?.confidence.overall,
        }),
      })

      if (response.ok) {
        // Update local state
        const updated = escalationService.approveDispatch(
          escalationTicket.id,
          supervisorId,
          supervisorNotes,
          analysis?.confidence.overall
        )

        if (updated) {
          setEscalationTicket(updated)
          onDecisionMade?.(updated)

          auditLogger.log({
            eventType: 'ESCALATION',
            emergencyId,
            action: 'Supervisor approved dispatch',
            actor: {
              type: 'SUPERVISOR',
              id: supervisorId,
            },
            data: { ticketId: escalationTicket.id, notes: supervisorNotes },
            outcome: 'SUCCESS',
          })

          console.log('[Escalation] Ticket approved:', escalationTicket.id)
        }
      }
    } catch (error) {
      console.error('Approve failed:', error)
    } finally {
      setIsProcessing(false)
      setSelectedAction(null)
      setSupervisorNotes('')
    }
  }

  const handleForceDispatch = async () => {
    if (!escalationTicket || !supervisorId) return

    setIsProcessing(true)
    try {
      // Call backend to force dispatch
      const response = await fetch(`/api/escalation/${escalationTicket.id}/force`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisorId,
          reasoning: supervisorNotes,
        }),
      })

      if (response.ok) {
        // Update local state
        const updated = escalationService.forceDispatch(
          escalationTicket.id,
          supervisorId,
          supervisorNotes,
          85 // Force as high-confidence
        )

        if (updated) {
          setEscalationTicket(updated)
          onDecisionMade?.(updated)

          auditLogger.log({
            eventType: 'ESCALATION',
            emergencyId,
            action: 'Supervisor FORCED dispatch (override)',
            actor: {
              type: 'SUPERVISOR',
              id: supervisorId,
            },
            data: { ticketId: escalationTicket.id, notes: supervisorNotes },
            outcome: 'SUCCESS',
            notes: 'CRITICAL: Emergency override',
          })

          console.log('[Escalation] Ticket forced:', escalationTicket.id)
        }
      }
    } catch (error) {
      console.error('Force dispatch failed:', error)
    } finally {
      setIsProcessing(false)
      setSelectedAction(null)
      setSupervisorNotes('')
    }
  }

  const handleDenyDispatch = async () => {
    if (!escalationTicket || !supervisorId) return

    setIsProcessing(true)
    try {
      // Call backend to deny dispatch
      const response = await fetch(`/api/escalation/${escalationTicket.id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisorId,
          reasoning: supervisorNotes,
        }),
      })

      if (response.ok) {
        // Update local state
        const updated = escalationService.denyDispatch(
          escalationTicket.id,
          supervisorId,
          supervisorNotes
        )

        if (updated) {
          setEscalationTicket(updated)
          onDecisionMade?.(updated)

          auditLogger.log({
            eventType: 'ESCALATION',
            emergencyId,
            action: 'Supervisor denied dispatch',
            actor: {
              type: 'SUPERVISOR',
              id: supervisorId,
            },
            data: { ticketId: escalationTicket.id, reason: supervisorNotes },
          })

          console.log('[Escalation] Ticket denied:', escalationTicket.id)
        }
      }
    } catch (error) {
      console.error('Deny dispatch failed:', error)
    } finally {
      setIsProcessing(false)
      setSelectedAction(null)
      setSupervisorNotes('')
    }
  }

  return (
    <Card className="border-2 border-red-300 bg-red-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-4 h-4 text-red-600" />
              A4: Escalation Manager - Supervisor Review Required
            </CardTitle>
            <CardDescription>
              Low confidence emergency requiring human judgment before dispatch
            </CardDescription>
          </div>
          <Badge variant="destructive" className="bg-red-600">
            ESCALATED
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {escalationTicket && (
          <>
            {/* Escalation Details */}
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-900 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-red-900">Escalation Required</div>
                  <div className="text-red-800 space-y-2 mt-2 text-sm">
                    <div>
                      <strong>Reason:</strong> {escalationTicket.reason}
                    </div>
                    <div>
                      <strong>Confidence:</strong> {escalationTicket.confidence}%
                    </div>
                    <div>
                      <strong>Emergency Type:</strong> {escalationTicket.emergencyType}
                    </div>
                    <div>
                      <strong>Location:</strong> {escalationTicket.location}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Info */}
            {analysis && (
              <div className="p-3 bg-white rounded-lg border space-y-2">
                <h4 className="font-semibold text-sm">Emergency Analysis Summary</h4>
                <div className="space-y-1 text-xs text-gray-700">
                  <div>
                    <strong>Intent:</strong> {analysis.intent.displayName}
                  </div>
                  <div>
                    <strong>Caller State:</strong> {analysis.sentiment.stressLevel.toUpperCase()} (
                    {analysis.sentiment.stressPercentage}%)
                  </div>
                  <div>
                    <strong>Location Verified:</strong>{' '}
                    {analysis.location?.verified ? '✅ Yes' : '❌ No'}
                  </div>
                  <div>
                    <strong>Decision:</strong> {analysis.confidence.recommendation}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Hospital Info */}
            {selectedHospital && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                <h4 className="font-semibold text-sm text-blue-900">Proposed Dispatch</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <div>
                    <strong>{selectedHospital.name}</strong> • {selectedHospital.distance.toFixed(1)} km
                  </div>
                  <div className="font-mono text-xs">{selectedHospital.phone}</div>
                </div>
              </div>
            )}

            {/* Decision Already Made */}
            {escalationTicket.supervisorDecision ? (
              <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900">Supervisor Decision Made</div>
                    <div className="text-blue-800 space-y-2 mt-2 text-sm">
                      <div>
                        <strong>Action:</strong> {escalationTicket.supervisorDecision.action}
                      </div>
                      <div>
                        <strong>Supervisor:</strong> {escalationTicket.supervisorDecision.supervisor}
                      </div>
                      <div>
                        <strong>Reasoning:</strong> {escalationTicket.supervisorDecision.reasoning}
                      </div>
                      <div className="text-xs">
                        {new Date(escalationTicket.supervisorDecision.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Supervisor Action Form */
              <div className="space-y-3 p-3 bg-white rounded-lg border">
                <h4 className="font-semibold text-sm">Supervisor Decision</h4>

                {/* Supervisor ID */}
                <div>
                  <Label htmlFor="supervisor-id" className="text-xs font-semibold">
                    Supervisor ID / Name
                  </Label>
                  <Input
                    id="supervisor-id"
                    placeholder="e.g., SUP-001 or John Doe"
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                    disabled={isProcessing}
                    className="text-sm h-8"
                  />
                </div>

                {/* Notes/Reasoning */}
                <div>
                  <Label htmlFor="supervisor-notes" className="text-xs font-semibold">
                    Reasoning / Notes
                  </Label>
                  <textarea
                    id="supervisor-notes"
                    placeholder="Explain your decision (required for audit trail)..."
                    value={supervisorNotes}
                    onChange={(e) => setSupervisorNotes(e.target.value)}
                    disabled={isProcessing}
                    className="w-full min-h-16 p-2 text-xs border rounded-md"
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button
                    onClick={() => setSelectedAction('APPROVE_DISPATCH')}
                    disabled={!supervisorId || !supervisorNotes || isProcessing}
                    variant="outline"
                    className="h-8 text-xs hover:bg-green-50"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => setSelectedAction('FORCE_DISPATCH')}
                    disabled={!supervisorId || !supervisorNotes || isProcessing}
                    variant="outline"
                    className="h-8 text-xs hover:bg-orange-50"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Force
                  </Button>
                  <Button
                    onClick={() => setSelectedAction('DENY_DISPATCH')}
                    disabled={!supervisorId || !supervisorNotes || isProcessing}
                    variant="destructive"
                    className="h-8 text-xs"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Deny
                  </Button>
                </div>

                {/* Confirmation for selected action */}
                {selectedAction && (
                  <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-yellow-800">Confirm {selectedAction}</div>
                        <div className="text-yellow-700 space-y-2 mt-2 text-sm">
                          <p>
                            {selectedAction === 'APPROVE_DISPATCH' &&
                              'This will approve the dispatch and send resources to the hospital.'}
                            {selectedAction === 'FORCE_DISPATCH' &&
                              'This will OVERRIDE confidence requirements and force dispatch immediately.'}
                            {selectedAction === 'DENY_DISPATCH' &&
                              'This will reject the dispatch and require more information from operators.'}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              onClick={
                                selectedAction === 'APPROVE_DISPATCH'
                                  ? handleApproveDispatch
                                  : selectedAction === 'FORCE_DISPATCH'
                                    ? handleForceDispatch
                                    : handleDenyDispatch
                              }
                              disabled={isProcessing}
                              size="sm"
                              className="bg-yellow-600 hover:bg-yellow-700"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader className="w-3 h-3 mr-1 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3 mr-1" />
                                  Confirm
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => setSelectedAction(null)}
                              disabled={isProcessing}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ticket Info */}
            <div className="text-xs text-muted-foreground p-2 bg-gray-50 rounded border">
              <div>Ticket ID: <span className="font-mono">{escalationTicket.id}</span></div>
              <div>{new Date(escalationTicket.timestamp).toLocaleString()}</div>
            </div>
          </>
        )}

        {/* Other Pending Escalations */}
        {pendingTickets.length > 1 && (
          <div className="p-3 bg-white rounded-lg border">
            <h4 className="font-semibold text-sm mb-2">
              Other Pending Escalations ({pendingTickets.length - 1})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pendingTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="text-xs p-2 bg-gray-50 rounded border flex items-start justify-between"
                >
                  <div>
                    <div className="font-semibold">{ticket.emergencyType}</div>
                    <div className="text-gray-600">{ticket.reason}</div>
                  </div>
                  <Badge variant="outline">{ticket.confidence}%</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Zap(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  )
}
