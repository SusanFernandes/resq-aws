"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { WebSocketData } from "@/types/emergency"
import { MapView } from "@/components/map-view"
import { AIAnalysisCard, AIAnalysisData } from "@/components/ai-analysis-card"
import useMockData from "@/hooks/use-mock-data"
import { OperatorIntakeForm, type DispatchFormData } from "@/features/operator/auto-form/operator-intake-form"
import { ProtocolReference } from "@/features/operator/protocol-ref/protocol-reference"
import { HospitalFinder, type Hospital } from "@/features/user-facing/hospital-finder/hospital-finder"
import { HospitalMapView } from "@/features/user-facing/hospital-map-view/hospital-map-view"
import { AutoDispatch } from "@/features/autonomous/auto-dispatch/auto-dispatch"
import { EscalationManager } from "@/features/autonomous/escalation-manager/escalation-manager"
import { LiveAnalysisPanel } from "@/features/operator/live-analysis-panel/live-analysis-panel"
import { SimilarCasesPanel } from "@/features/operator/similar-cases-panel/similar-cases-panel"
import { LocationVerification } from "@/features/autonomous/location-verification/location-verification"
import { ContextualQuestions } from "@/features/autonomous/contextual-questions/contextual-questions"
import { SOSButton } from "@/features/user/sos-button/sos-button"
import { makeDispatchDecision, getDispatchAction, getDecisionExplanation, type DispatchDecision } from "@/features/autonomous/decision-router/decision-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"

export default function Page() {
  const [wsData, setWsData] = useState<WebSocketData | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [dispatchDecision, setDispatchDecision] = useState<DispatchDecision | null>(null)
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [dispatchedFormData, setDispatchedFormData] = useState<DispatchFormData | null>(null)
  const [liveAnalysisId, setLiveAnalysisId] = useState<string | null>(null)
  const [detectedSymptoms, setDetectedSymptoms] = useState<string[]>([])
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout>()
  const mockData = useMockData()

  const connectWebSocket = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      ws.current = new WebSocket(`ws://localhost:8080?type=dashboard`)

      ws.current.onopen = () => {
        console.log('WebSocket Connected')
        setIsConnected(true)
        // Clear any existing reconnect timeout
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current)
          reconnectTimeout.current = undefined
        }
      }

      ws.current.onmessage = async (event) => {
        try {
          const response = JSON.parse(event.data)
          console.log('Raw WebSocket message:', response)
          
          if (response.type === "twilio-update") {
            console.log('Processing Twilio update:', response.data)
            setWsData({
              type: response.type,
              data: {
                id: `E-${Date.now()}`,
                timestamp: new Date().toISOString(),
                originalConversation: response.data.originalConversation || [],
                aiAnalysis: response.data.aiAnalysis
              }
            })

            // Analyze with our AI pipeline
            await analyzeEmergency(response.data)
          }
        } catch (error) {
          console.error('Error parsing websocket data:', error)
        }
      }

      ws.current.onclose = () => {
        console.log('WebSocket Disconnected')
        setIsConnected(false)
        // Attempt to reconnect after 2 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...')
          connectWebSocket()
        }, 2000)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket Error:', error)
        ws.current?.close()
      }

    } catch (error) {
      console.error('WebSocket connection error:', error)
      // Attempt to reconnect after 2 seconds
      reconnectTimeout.current = setTimeout(() => {
        console.log('Attempting to reconnect...')
        connectWebSocket()
      }, 2000)
    }
  }, [])

  /**
   * Analyze emergency using our AI pipeline
   */
  const analyzeEmergency = async (emergencyData: any) => {
    try {
      setIsAnalyzing(true)

      const transcript =
        emergencyData.originalConversation
          ?.map((m: any) => `${m.role}: ${m.content}`)
          .join('\n') || emergencyData.description || ''

      const response = await fetch('/api/emergency-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          location: emergencyData.location || '',
          callerName: emergencyData.caller || '',
          callerPhone: emergencyData.phone || '',
          conversationHistory: emergencyData.originalConversation || [],
        }),
      })

      if (response.ok) {
        // CRITICAL FIX: Parse the response JSON
        const analysis = await response.json()
        setAiAnalysis(analysis)
        
        // Make dispatch decision based on analysis
        const decision = makeDispatchDecision(analysis)
        setDispatchDecision(decision)
        console.log('[Dashboard] Dispatch Decision:', decision)
        console.log('[Dashboard] Decision Explanation:', getDecisionExplanation(decision, analysis))
      } else {
        console.error('Analysis request failed:', response.status)
      }
    } catch (error) {
      console.error('Error analyzing emergency:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDispatch = async (formData: DispatchFormData) => {
    console.log('[Dashboard] Dispatch confirmed:', formData)
    setDispatchedFormData(formData)

    // Integrate with O6: When operator confirms form data, trigger appropriate dispatch
    if (!selectedHospital) {
      alert('Please select a hospital before dispatching')
      return
    }

    try {
      // Determine dispatch method based on A1 decision
      if (dispatchDecision?.route === 'AUTO_DISPATCH') {
        // A8: Auto dispatch
        const { dispatchService } = await import('@/lib/dispatch/dispatch-service')
        await dispatchService.operatorDispatch(
          {
            emergencyId: wsData?.data?.id || `E-${Date.now()}`,
            hospitalId: selectedHospital.id,
            hospitalName: selectedHospital.name,
            hospitalPhone: selectedHospital.phone,
            address: formData.address,
            latitude: formData.latitude,
            longitude: formData.longitude,
            emergencyType: formData.emergencyType,
            severity: formData.severity,
            patientDetails: {
              name: formData.callerName,
              age: formData.age,
              condition: formData.description,
            },
            estimatedArrival: Math.round(selectedHospital.distance * 2),
          },
          'OPERATOR'
        )
      } else if (dispatchDecision?.route === 'OPERATOR_ASSISTED') {
        // O6: Operator form dispatch
        const { dispatchService } = await import('@/lib/dispatch/dispatch-service')
        await dispatchService.operatorDispatch(
          {
            emergencyId: wsData?.data?.id || `E-${Date.now()}`,
            hospitalId: selectedHospital.id,
            hospitalName: selectedHospital.name,
            hospitalPhone: selectedHospital.phone,
            address: formData.address,
            latitude: formData.latitude,
            longitude: formData.longitude,
            emergencyType: formData.emergencyType,
            severity: formData.severity,
            patientDetails: {
              name: formData.callerName,
              age: formData.age,
              condition: formData.description,
            },
            estimatedArrival: Math.round(selectedHospital.distance * 2),
          },
          'OPERATOR'
        )
      }
      console.log('[Dashboard] Dispatch sent to:', selectedHospital.name)
    } catch (error) {
      console.error('[Dashboard] Dispatch error:', error)
    }
  }

  const handleExecuteProtocol = (protocolName: string) => {
    console.log('[Dashboard] Executing protocol:', protocolName)
    // Protocol execution logic would go here console.error('Error analyzing emergency:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket()

    // Cleanup function
    return () => {
      if (ws.current) {
        ws.current.close()
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
    }
  }, [connectWebSocket])

  // Keep connection alive with ping/pong
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Send ping every 30 seconds

    return () => {
      clearInterval(pingInterval)
    }
  }, [])

  // Debug log for wsData
  useEffect(() => {
    console.log('Current wsData:', wsData)
  }, [wsData])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar wsData={wsData} />
      <SidebarInset>
        <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">All Inboxes</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Inbox</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Decision Router Alert */}
          {dispatchDecision && (
            <Alert variant={dispatchDecision.route === 'ESCALATE_TO_HUMAN' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {dispatchDecision.route === 'AUTO_DISPATCH'
                  ? '✅ Ready for Auto-Dispatch'
                  : dispatchDecision.route === 'OPERATOR_ASSISTED'
                    ? '⚠️ Requires Operator Approval'
                    : '🚨 Escalated to Human Review'}
              </AlertTitle>
              <AlertDescription>
                {dispatchDecision.reasoning}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="map" className="w-full">
            <TabsList className="grid w-full grid-cols-12">
              <TabsTrigger value="map">📍 Map</TabsTrigger>
              <TabsTrigger value="map-hospitals">🗺️ Hospitals</TabsTrigger>
              <TabsTrigger value="analysis">🧠 Analysis</TabsTrigger>
              <TabsTrigger value="intake">📋 Form (O6)</TabsTrigger>
              <TabsTrigger value="protocol">📚 Protocol (O3)</TabsTrigger>
              <TabsTrigger value="hospital">🏥 Search (U4)</TabsTrigger>
              <TabsTrigger value="dispatch">⚡ Dispatch (A8)</TabsTrigger>
              <TabsTrigger value="escalation">🚨 Escalate (A4)</TabsTrigger>
              <TabsTrigger value="live-analysis">O1: Live</TabsTrigger>
              <TabsTrigger value="similar-cases">O2: Cases</TabsTrigger>
              <TabsTrigger value="location-verify">A7: Location</TabsTrigger>
              <TabsTrigger value="questions">A5: Questions</TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="mt-4">
              <MapView wsData={wsData} />
            </TabsContent>

            <TabsContent value="analysis" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Current Emergency</h2>
                  {wsData?.data ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>ID:</strong> {wsData.data.id}
                      </div>
                      <div>
                        <strong>Time:</strong> {new Date(wsData.data.timestamp).toLocaleTimeString()}
                      </div>
                      <div>
                        <strong>Messages:</strong> {wsData.data.originalConversation?.length || 0}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Waiting for emergency data...</p>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">AI Analysis Results</h2>
                  <AIAnalysisCard analysis={aiAnalysis} isLoading={isAnalyzing} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="intake" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                <OperatorIntakeForm
                  analysis={aiAnalysis}
                  onDispatch={handleDispatch}
                  isLoading={isAnalyzing}
                />
                {dispatchedFormData && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Dispatch Confirmed</AlertTitle>
                    <AlertDescription className="text-green-700">
                      Resources being sent to {dispatchedFormData.address}
                      {selectedHospital && ` via ${selectedHospital.name}`}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="protocol" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                <ProtocolReference
                  analysis={aiAnalysis}
                  onExecuteProtocol={handleExecuteProtocol}
                  isLoading={isAnalyzing}
                />
              </div>
            </TabsContent>

            <TabsContent value="hospital" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                <HospitalFinder
                  analysis={aiAnalysis}
                  onSelectHospital={setSelectedHospital}
                  isLoading={isAnalyzing}
                />
                {selectedHospital && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">Hospital Selected</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      {selectedHospital.name} - {selectedHospital.distance.toFixed(1)} km away
                      <br />
                      <span className="font-mono text-sm">{selectedHospital.phone}</span>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="map-hospitals" className="mt-4">
              <HospitalMapView
                hospitals={mockData.facilities || []}
                selectedHospital={selectedHospital}
                emergencyLocation={
                  aiAnalysis?.location
                    ? {
                        latitude: aiAnalysis.location.latitude,
                        longitude: aiAnalysis.location.longitude,
                        address: aiAnalysis.location.address,
                      }
                    : undefined
                }
                onHospitalSelect={setSelectedHospital}
              />
            </TabsContent>

            <TabsContent value="dispatch" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                <AutoDispatch
                  analysis={aiAnalysis}
                  selectedHospital={selectedHospital}
                  isLoading={isAnalyzing}
                  onDispatchSuccess={(response) => {
                    console.log('[Dashboard] Auto Dispatch Success:', response)
                  }}
                  onDispatchError={(error) => {
                    console.error('[Dashboard] Auto Dispatch Error:', error)
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="escalation" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                <EscalationManager
                  analysis={aiAnalysis}
                  selectedHospital={selectedHospital}
                  emergencyId={wsData?.data?.id || `E-${Date.now()}`}
                  onEscalationCreated={(ticket) => {
                    console.log('[Dashboard] Escalation Created:', ticket)
                  }}
                  onDecisionMade={(ticket) => {
                    console.log('[Dashboard] Escalation Decision Made:', ticket)
                  }}
                />
              </div>
            </TabsContent>

            {/* TIER 2: O1 - Live Analysis Panel */}
            <TabsContent value="live-analysis" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                {liveAnalysisId ? (
                  <LiveAnalysisPanel
                    analysisId={liveAnalysisId}
                    isActive={true}
                    onUpdate={(analysis) => {
                      if (analysis.symptoms) {
                        setDetectedSymptoms(analysis.symptoms)
                      }
                      console.log('[Dashboard] Live Analysis Updated:', analysis)
                    }}
                  />
                ) : (
                  <div className="p-4 border rounded bg-slate-50 text-sm text-muted-foreground">
                    <p>Live analysis will appear here once a call is initiated.</p>
                    <button
                      onClick={() => setLiveAnalysisId(`ANALYSIS-${Date.now()}`)}
                      className="text-blue-600 hover:underline mt-2"
                    >
                      Start test analysis
                    </button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TIER 2: O2 - Similar Cases Panel */}
            <TabsContent value="similar-cases" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                {detectedSymptoms.length > 0 ? (
                  <SimilarCasesPanel
                    symptoms={detectedSymptoms}
                    severity={aiAnalysis?.severity || 'MEDIUM'}
                  />
                ) : (
                  <div className="p-4 border rounded bg-slate-50 text-sm text-muted-foreground">
                    <p>Similar cases will appear here once symptoms are detected.</p>
                    <p className="text-xs mt-2">
                      Start live analysis (O1 tab) to see cases similar to detected symptoms.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TIER 2: A7 - Location Verification */}
            <TabsContent value="location-verify" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                <LocationVerification
                  rawLocation={aiAnalysis?.location?.address}
                  latitude={aiAnalysis?.location?.latitude}
                  longitude={aiAnalysis?.location?.longitude}
                  onLocationConfirmed={(location) => {
                    console.log('[Dashboard] Location Confirmed:', location)
                  }}
                />
              </div>
            </TabsContent>

            {/* TIER 2: A5 - Contextual Questions */}
            <TabsContent value="questions" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
                <ContextualQuestions
                  symptoms={detectedSymptoms}
                  previousAnswers={{}}
                  onAnswerSubmitted={(questionId, answer) => {
                    console.log(`[Dashboard] Question ${questionId} answered: ${answer}`)
                  }}
                  isLoading={false}
                />
              </div>
            </TabsContent>

            <TabsContent value="status" className="mt-4">
              <div className="space-y-4">
                {/* Decision Status */}
                {dispatchDecision && (
                  <div className="p-4 border rounded bg-slate-50">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      A1: Dispatch Decision (Decision Router)
                    </h3>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <strong>Route:</strong>
                        <Badge
                          variant={
                            dispatchDecision.route === 'AUTO_DISPATCH'
                              ? 'default'
                              : dispatchDecision.route === 'OPERATOR_ASSISTED'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {dispatchDecision.route}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <strong>Confidence:</strong>
                        <span>{dispatchDecision.confidence}%</span>
                      </div>
                      <div className="flex justify-between">
                        <strong>Should Auto-Dispatch:</strong>
                        <span>{dispatchDecision.shouldAutoDispatch ? '✅ Yes' : '❌ No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong>Est. Dispatch Time:</strong>
                        <span>{dispatchDecision.estimatedDispatchTime}s</span>
                      </div>
                      {dispatchDecision.riskFactors.length > 0 && (
                        <div>
                          <strong>Risk Factors:</strong>
                          <ul className="list-disc list-inside text-xs text-red-600 mt-1">
                            {dispatchDecision.riskFactors.map((factor, idx) => (
                              <li key={idx}>{factor}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Connection Status */}
                <div className="p-4 border rounded">
                  <h3 className="font-semibold mb-2">Connection Status</h3>
                  <div className="text-sm space-y-1">
                    <div>
                      <strong>WebSocket:</strong>{' '}
                      <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                      </span>
                    </div>
                    <div>
                      <strong>Mock Data:</strong>{' '}
                      <span className={mockData.isLoading ? 'text-yellow-600' : mockData.error ? 'text-red-600' : 'text-green-600'}>
                        {mockData.isLoading ? '⏳ Loading...' : mockData.error ? '🔴 Error' : '🟢 Loaded'}
                      </span>
                    </div>
                    <div>
                      <strong>Analysis:</strong>{' '}
                      <span className={isAnalyzing ? 'text-yellow-600' : aiAnalysis ? 'text-green-600' : 'text-gray-600'}>
                        {isAnalyzing ? '⏳ Analyzing...' : aiAnalysis ? '🟢 Ready' : '⚪ Waiting'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mock Data Summary */}
                {mockData.facilities && (
                  <div className="p-4 border rounded">
                    <h3 className="font-semibold mb-2">Mock Data Summary</h3>
                    <div className="text-sm space-y-1">
                      <div>Total Facilities: {mockData.facilities.length}</div>
                      <div>Locations: {mockData.locations?.length || 0}</div>
                      <div>
                        Call Examples: {mockData.emergencyExamples?.length || 0}
                      </div>
                    </div>
                  </div>
                )}

                {/* Feature Status */}
                <div className="p-4 border rounded bg-blue-50">
                  <h3 className="font-semibold mb-2">TIER 1 Features</h3>
                  <div className="text-sm space-y-1">
                    <div>✅ O6: Operator Intake Form - Ready</div>
                    <div>✅ O3: Protocol Reference - Ready</div>
                    <div>✅ A1: Decision Router - Active</div>
                    <div>✅ U4: Hospital Finder - Ready</div>
                    <div>✅ A8: Auto Dispatch - Ready (⚡ triggers at 85% confidence)</div>
                    <div>✅ A4: Escalation Manager - Ready (🚨 triggers at <60% confidence)</div>
                    <div>✅ U5: Hospital Map View - Ready (🗺️ displays nearest 5 hospitals)</div>
                  </div>
                </div>

                {/* TIER 2 Feature Status */}
                <div className="p-4 border rounded bg-green-50">
                  <h3 className="font-semibold mb-2">TIER 2 Features (New!)</h3>
                  <div className="text-sm space-y-1">
                    <div>✅ O1: Live Call Analysis - Ready (real-time transcript processing)</div>
                    <div>✅ O2: Similar Cases - Ready (case history learning)</div>
                    <div>✅ A7: Location Verification - Ready (GPS + map integration)</div>
                    <div>✅ A5: Contextual Questions - Ready (intelligent question generation)</div>
                    <div>✅ U1: Symptom Checker - Ready (multi-step decision trees)</div>
                    <div>✅ U3: Emergency Checklist - Ready (dispatch reference guide)</div>
                    <div>✅ U11: SOS Button - Ready (contact mgmt + 3s countdown)</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      🌐 Public Website: /help (home), /help/symptom-checker, /help/emergency-checklist
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>

      {/* TIER 2: U11 - Global SOS Button (Floating) */}
      <SOSButton />
    </SidebarProvider>
  )
}

