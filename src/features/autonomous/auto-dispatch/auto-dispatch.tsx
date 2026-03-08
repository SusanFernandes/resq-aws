'use client'

import React, { useState } from 'react'
import {
  Send,
  Loader,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AIAnalysisData } from '@/components/ai-analysis-card'
import { dispatchService, type DispatchRequest, type DispatchResponse } from '@/lib/dispatch/dispatch-service'
import { auditLogger } from '@/lib/audit/audit-logger'
import type { Hospital } from '@/features/user-facing/hospital-finder/hospital-finder'

interface AutoDispatchProps {
  analysis: AIAnalysisData | null
  selectedHospital: Hospital | null
  isLoading?: boolean
  onDispatchSuccess?: (response: DispatchResponse) => void
  onDispatchError?: (error: Error) => void
}

export function AutoDispatch({
  analysis,
  selectedHospital,
  isLoading = false,
  onDispatchSuccess,
  onDispatchError,
}: AutoDispatchProps) {
  const [isDispatching, setIsDispatching] = useState(false)
  const [dispatchStatus, setDispatchStatus] = useState<DispatchResponse | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [dispatchError, setDispatchError] = useState<string | null>(null)

  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            A8: Auto Dispatch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Waiting for emergency analysis...
          </div>
        </CardContent>
      </Card>
    )
  }

  const canAutoDispatch =
    analysis.confidence.recommendation === 'AUTO_DISPATCH' &&
    analysis.location?.verified &&
    selectedHospital

  const handleAutoDispatch = async () => {
    if (!selectedHospital || !canAutoDispatch) return

    setIsDispatching(true)
    setDispatchError(null)

    try {
      const dispatchRequest: DispatchRequest = {
        emergencyId: `E-${Date.now()}`,
        hospitalId: selectedHospital.id,
        hospitalName: selectedHospital.name,
        hospitalPhone: selectedHospital.phone,
        address: selectedHospital.address,
        latitude: selectedHospital.latitude,
        longitude: selectedHospital.longitude,
        emergencyType: analysis.intent.type,
        severity: analysis.extracted.severity,
        patientDetails: {
          name: analysis.extracted.callerName,
          age: analysis.extracted.age,
          condition: analysis.extracted.description,
        },
        estimatedArrival: Math.round(selectedHospital.distance * 2), // Rough estimate
        dispatchedBy: 'SYSTEM',
      }

      console.log('[AUTO-DISPATCH] Initiating dispatch...', dispatchRequest)

      const response = await dispatchService.autoDispatch(dispatchRequest)

      setDispatchStatus(response)
      setShowConfirmDialog(false)

      // Visual feedback
      setTimeout(() => {
        onDispatchSuccess?.(response)
      }, 500)

      console.log('[AUTO-DISPATCH] Success:', response)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setDispatchError(err.message)
      onDispatchError?.(err)
      console.error('[AUTO-DISPATCH] Error:', err)
    } finally {
      setIsDispatching(false)
    }
  }

  return (
    <Card className={`border-2 ${canAutoDispatch ? 'border-green-300 bg-green-50' : 'border-dashed'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-4 h-4 text-yellow-600" />
              A8: Autonomous Auto Dispatch
            </CardTitle>
            <CardDescription>
              {analysis.confidence.recommendation === 'AUTO_DISPATCH'
                ? '✅ System ready for automatic dispatch'
                : '⚠️ Requires operator approval or supervisor override'}
            </CardDescription>
          </div>
          <Badge
            variant={canAutoDispatch ? 'default' : 'secondary'}
            className={
              canAutoDispatch
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-yellow-600 hover:bg-yellow-700'
            }
          >
            {analysis.confidence.recommendation}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {dispatchStatus && (
          <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-green-800">Dispatch Sent Successfully</div>
                <div className="text-green-700 text-sm space-y-1 mt-2">
                  <div>Dispatch ID: <span className="font-mono">{dispatchStatus.id}</span></div>
                  <div>Status: {dispatchStatus.status}</div>
                  <div>Time: {new Date(dispatchStatus.timestamp).toLocaleTimeString()}</div>
                  {selectedHospital && (
                    <div>Hospital: <strong>{selectedHospital.name}</strong></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {dispatchError && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-red-800">Dispatch Failed</div>
                <div className="text-red-700 text-sm">{dispatchError}</div>
              </div>
            </div>
          </div>
        )}

        {!dispatchStatus && (
          <div className="space-y-4">
            {/* Readiness Checklist */}
            <div className="p-3 bg-white rounded-lg border space-y-2">
              <h4 className="font-semibold text-sm">Dispatch Readiness</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  {analysis.confidence.overall >= 85 ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                  )}
                  <span>Confidence: {analysis.confidence.overall}% (need 85%)</span>
                </div>
                <div className="flex items-center gap-2">
                  {analysis.location?.verified ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                  )}
                  <span>Location verified</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedHospital ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                  )}
                  <span>Hospital selected</span>
                </div>
                <div className="flex items-center gap-2">
                  {analysis.extracted.callerName &&
                  analysis.extracted.location &&
                  analysis.extracted.emergencyType ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                  )}
                  <span>Required info complete</span>
                </div>
              </div>
            </div>

            {/* Selected Hospital Info */}
            {selectedHospital && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                <h4 className="font-semibold text-sm text-blue-900">Dispatch Destination</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>
                      <strong>{selectedHospital.name}</strong> • {selectedHospital.distance.toFixed(1)} km away
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="font-mono text-xs">{selectedHospital.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>ETA: {Math.round(selectedHospital.distance * 2)} minutes</span>
                  </div>
                </div>
              </div>
            )}

            {/* Dispatch Decision Details */}
            <div className="p-3 bg-gray-50 rounded-lg border text-sm">
              <h4 className="font-semibold mb-2">Decision Details</h4>
              <div className="space-y-1 text-xs text-gray-700">
                <div>
                  <strong>Decision:</strong> {analysis.confidence.recommendation}
                </div>
                <div>
                  <strong>Reason:</strong> {analysis.confidence.reason}
                </div>
                <div>
                  <strong>Risk Level:</strong> <Badge variant="outline">{analysis.confidence.riskLevel}</Badge>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {canAutoDispatch && (
                <>
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={isDispatching || isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 h-10"
                  >
                    {isDispatching ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Dispatching...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Auto Dispatch Now
                      </>
                    )}
                  </Button>
                </>
              )}
              {!canAutoDispatch && analysis.confidence.recommendation !== 'AUTO_DISPATCH' && (
                <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <strong>⚠️ Not ready for auto-dispatch.</strong> Confidence or location verification required.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>Confirm Auto Dispatch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-base text-gray-900 font-semibold">
                    This will automatically dispatch resources to:
                  </p>
                  {selectedHospital && (
                    <div className="p-3 bg-blue-50 rounded border border-blue-200 text-sm text-gray-800">
                      <div><strong>{selectedHospital.name}</strong></div>
                      <div>{selectedHospital.address}</div>
                      <div className="font-mono text-xs mt-1">{selectedHospital.phone}</div>
                    </div>
                  )}
                  <div>
                    <strong className="text-gray-900">Emergency Type:</strong> {analysis?.intent.type}
                  </div>
                  <div>
                    <strong className="text-gray-900">Confidence:</strong> {analysis?.confidence.overall}%
                  </div>
                  <p className="text-xs text-gray-600">
                    This action is automatically logged and cannot be undone. Notifications will be sent to the hospital and all operators.
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={() => setShowConfirmDialog(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAutoDispatch}
                    disabled={isDispatching}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isDispatching ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      'Confirm Dispatch'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
