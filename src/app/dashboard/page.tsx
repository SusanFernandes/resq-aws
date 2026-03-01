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
import { AutonomousModePanel } from "@/components/autonomous/AutonomousModePanel"
import { SentimentAnalysisPanel } from "@/components/autonomous/SentimentAnalysisPanel"
import { ContinuousMonitoringPanel } from "@/components/autonomous/ContinuousMonitoringPanel"
import { ComplexityPredictionCard } from "@/components/autonomous/ComplexityPredictionCard"
import { ResourceOptimizationPanel } from "@/components/autonomous/ResourceOptimizationPanel"
import { NLPCommandConsole } from "@/components/autonomous/NLPCommandConsole"
import { TranscriptionPanel } from "@/components/autonomous/TranscriptionPanel"
import { ThinkingProcessDashboard } from "@/components/autonomous/ThinkingProcessDashboard"
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
import { AlertTriangle, CheckCircle2, Clock, X } from "lucide-react"

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
  const [activeTab, setActiveTab] = useState('analysis')
  const [mapZoomed, setMapZoomed] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout>()
  const mockData = useMockData()

  const connectWebSocket = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      ws.current = new WebSocket(`ws://localhost:8080/?type=dashboard`)

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
        setIsConnected(false)
        // Attempt to reconnect after 2 seconds (silent)
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket()
        }, 2000)
      }

      ws.current.onerror = (event: Event) => {
        // Silently suppress WebSocket errors - connection failures are expected in dev when backend isn't running
        event.preventDefault?.()
        ws.current?.close()
      }

    } catch (error) {
      // Suppress initial connection errors - they're expected in dev
      // Attempt to reconnect after 2 seconds (silent)
      reconnectTimeout.current = setTimeout(() => {
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

  const handleExecuteProtocol = async (protocolName: string) => {
    setIsAnalyzing(true)
    try {
      console.log('[Dashboard] Executing protocol:', protocolName)
      // Protocol execution logic would go here
      // Example: call a backend endpoint or trigger UI changes
      await new Promise((resolve) => setTimeout(resolve, 500))
      console.log('[Dashboard] Protocol executed:', protocolName)
    } catch (error) {
      console.error('[Dashboard] Error executing protocol:', error)
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

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTab) {
        setActiveTab('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab])

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
      <SidebarInset className="flex flex-col">
        {/* HEADER */}
        <header className="sticky top-0 flex h-auto shrink-0 flex-col gap-3 border-b bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-6" />
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-slate-900">Emergency Ops</h1>
                <p className="text-xs text-slate-600">Real-time dispatch & decision-making</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <span className="status-badge status-badge-active text-xs">
                  <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse"></span>
                  Active
                </span>
                <span className={`status-badge text-xs ${isConnected ? 'status-badge-active' : 'status-badge-critical'}`}>
                  {isConnected ? '🟢' : '🔴'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 bg-white border border-slate-200 rounded shadow-sm">
              <p className="text-xs text-slate-600">ID</p>
              <p className="text-sm font-bold">{wsData?.data?.id?.slice(-6) || '—'}</p>
            </div>
            <div className="p-2 bg-white border border-slate-200 rounded shadow-sm">
              <p className="text-xs text-slate-600">Confidence</p>
              <p className="text-sm font-bold text-blue-600">{dispatchDecision?.confidence || '—'}%</p>
            </div>
            <div className="p-2 bg-white border border-slate-200 rounded shadow-sm">
              <p className="text-xs text-slate-600">Decision</p>
              <p className="text-sm font-bold">{dispatchDecision?.route === 'AUTO_DISPATCH' ? '⚡' : dispatchDecision?.route === 'ESCALATE_TO_HUMAN' ? '🚨' : '⏳'}</p>
            </div>
            <div className="p-2 bg-white border border-slate-200 rounded shadow-sm">
              <p className="text-xs text-slate-600">Dispatch</p>
              <p className="text-sm font-bold">{dispatchedFormData ? '✅' : '❌'}</p>
            </div>
          </div>
        </header>

        {/* MAIN LAYOUT - MAP ALWAYS VISIBLE */}
        <div className="flex-1 flex gap-0 overflow-hidden">
          {/* LEFT SIDEBAR - SLEEK BUTTON NAVIGATION */}
          <div className="w-52 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col border-r border-slate-700 overflow-y-auto">
            {/* Decision Alert */}
            {dispatchDecision && (
              <div className={`p-3 m-2 rounded-lg text-xs font-medium border ${
                dispatchDecision.route === 'AUTO_DISPATCH' 
                  ? 'bg-green-900/30 border-green-700 text-green-100'
                  : dispatchDecision.route === 'ESCALATE_TO_HUMAN'
                    ? 'bg-red-900/30 border-red-700 text-red-100'
                    : 'bg-amber-900/30 border-amber-700 text-amber-100'
              }`}>
                <div className="font-semibold mb-1">
                  {dispatchDecision.route === 'AUTO_DISPATCH' 
                    ? 'Ready to Dispatch'
                    : dispatchDecision.route === 'ESCALATE_TO_HUMAN'
                      ? 'Escalation Needed'
                      : 'Approval Required'}
                </div>
                <div className="text-xs opacity-90">{dispatchDecision.confidence}% confidence</div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto">
              {/* TIER 1 - CORE */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-2">Core</div>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'analysis' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Emergency Analysis
                </button>
                <button
                  onClick={() => setActiveTab('intake')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'intake' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Intake Form
                </button>
                <button
                  onClick={() => setActiveTab('protocol')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'protocol' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Protocol Reference
                </button>
                <button
                  onClick={() => setActiveTab('hospital')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'hospital' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Hospital Search
                </button>
              </div>

              {/* TIER 1 - DISPATCH */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-2 mt-2">Dispatch</div>
                <button
                  onClick={() => setActiveTab('dispatch')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'dispatch' 
                      ? 'bg-red-600 text-white' 
                      : 'text-slate-300 hover:bg-red-900/40'
                  }`}
                >
                  Auto Dispatch
                </button>
                <button
                  onClick={() => setActiveTab('escalation')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'escalation' 
                      ? 'bg-red-600 text-white' 
                      : 'text-slate-300 hover:bg-red-900/40'
                  }`}
                >
                  Escalation Manager
                </button>
              </div>

              {/* TIER 2 - OPERATOR SUPPORT */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-2 mt-2">Operator Tools</div>
                <button
                  onClick={() => setActiveTab('live-analysis')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'live-analysis' 
                      ? 'bg-amber-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Live Analysis
                </button>
                <button
                  onClick={() => setActiveTab('similar-cases')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'similar-cases' 
                      ? 'bg-amber-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Similar Cases
                </button>
                <button
                  onClick={() => setActiveTab('location-verify')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'location-verify' 
                      ? 'bg-amber-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Location Verify
                </button>
                <button
                  onClick={() => setActiveTab('questions')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'questions' 
                      ? 'bg-amber-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Contextual Questions
                </button>
              </div>

              {/* TIER 3 - AUTONOMOUS */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-2 mt-2">AI & Autonomous</div>
                <button
                  onClick={() => setActiveTab('autonomous-control')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'autonomous-control' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Autonomous Control
                </button>
                <button
                  onClick={() => setActiveTab('sentiment')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'sentiment' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Sentiment Analysis
                </button>
                <button
                  onClick={() => setActiveTab('monitoring')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'monitoring' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Continuous Monitoring
                </button>
                <button
                  onClick={() => setActiveTab('complexity')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'complexity' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Complexity Analysis
                </button>
                <button
                  onClick={() => setActiveTab('resources')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'resources' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Resource Optimization
                </button>
                <button
                  onClick={() => setActiveTab('nlp')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'nlp' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  NLP Commands
                </button>
                <button
                  onClick={() => setActiveTab('transcription')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'transcription' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Transcription
                </button>
                <button
                  onClick={() => setActiveTab('thinking')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'thinking' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Thinking Process
                </button>
              </div>

              {/* STATUS */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-2 mt-2">System</div>
                <button
                  onClick={() => setActiveTab('status')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === 'status' 
                      ? 'bg-slate-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  System Status
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-slate-700 text-xs text-slate-400">
              <div className="text-center py-2">
                {isConnected ? '🟢 Connected' : '🔴 Offline'}
              </div>
            </div>
          </div>

          {/* CENTER/RIGHT - MAP + OVERLAY */}
          <div className="flex-1 relative flex flex-col overflow-hidden bg-slate-50">
            {/* MAP - ALWAYS VISIBLE BACKGROUND */}
            <div className="flex-1 relative">
              <MapView wsData={wsData} />

              {/* OVERLAY MODAL - FEATURES */}
              {activeTab && (
                <div 
                  className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setActiveTab('')
                    }
                  }}
                  role="dialog"
                  aria-modal="true"
                >
                  <div 
                    className="w-full max-w-2xl max-h-[85vh] bg-white rounded-xl shadow-2xl border border-blue-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b-2 border-blue-100 bg-gradient-to-r from-blue-50 to-white flex-shrink-0">
                      <h2 className="text-xl font-bold text-slate-900 capitalize">
                        {activeTab.replace('-', ' ')}
                      </h2>
                      <button
                        onClick={() => setActiveTab('')}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-all ml-4 flex-shrink-0"
                        title="Close this panel (or press Escape)"
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Modal Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* ANALYSIS */}
                        {activeTab === 'analysis' && (
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-semibold text-sm mb-2">Current Emergency</h3>
                              {wsData?.data ? (
                                <div className="bg-slate-50 p-3 rounded-lg border text-sm space-y-1">
                                  <div><strong>ID:</strong> {wsData.data.id}</div>
                                  <div><strong>Time:</strong> {new Date(wsData.data.timestamp).toLocaleTimeString()}</div>
                                  <div><strong>Messages:</strong> {wsData.data.originalConversation?.length || 0}</div>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">Waiting for emergency data...</p>
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm mb-2">AI Analysis</h3>
                              <AIAnalysisCard analysis={aiAnalysis} isLoading={isAnalyzing} />
                            </div>
                          </div>
                        )}

                        {/* FORM */}
                        {activeTab === 'intake' && (
                          <OperatorIntakeForm
                            analysis={aiAnalysis}
                            onDispatch={(data) => {
                              setDispatchedFormData(data)
                              handleDispatch(data)
                            }}
                            isLoading={isAnalyzing}
                          />
                        )}

                        {/* PROTOCOL */}
                        {activeTab === 'protocol' && (
                          <ProtocolReference
                            analysis={aiAnalysis}
                            onExecuteProtocol={handleExecuteProtocol}
                            isLoading={isAnalyzing}
                          />
                        )}

                        {/* DISPATCH */}
                        {activeTab === 'dispatch' && (
                          <AutoDispatch
                            analysis={aiAnalysis}
                            selectedHospital={selectedHospital}
                            isLoading={isAnalyzing}
                            onDispatchSuccess={(response) => console.log('Dispatch Success:', response)}
                            onDispatchError={(error) => console.error('Dispatch Error:', error)}
                          />
                        )}

                        {/* ESCALATION */}
                        {activeTab === 'escalation' && (
                          <EscalationManager
                            analysis={aiAnalysis}
                            selectedHospital={selectedHospital}
                            emergencyId={wsData?.data?.id || `E-${Date.now()}`}
                            onEscalationCreated={(ticket) => console.log('Escalation Created:', ticket)}
                            onDecisionMade={(ticket) => console.log('Decision Made:', ticket)}
                          />
                        )}

                        {/* LIVE ANALYSIS */}
                        {activeTab === 'live-analysis' && (
                          <>
                            {liveAnalysisId ? (
                              <LiveAnalysisPanel
                                analysisId={liveAnalysisId}
                                isActive={true}
                                onUpdate={(analysis) => {
                                  if (analysis.symptoms) setDetectedSymptoms(analysis.symptoms)
                                }}
                              />
                            ) : (
                              <div className="p-3 border rounded bg-slate-50 text-sm text-center">
                                <p className="text-xs text-slate-600 mb-2">Live analysis will start when a call is initiated</p>
                                <button
                                  onClick={() => setLiveAnalysisId(`ANALYSIS-${Date.now()}`)}
                                  className="text-blue-600 text-xs hover:underline font-medium"
                                >
                                  Start test analysis
                                </button>
                              </div>
                            )}
                          </>
                        )}

                        {/* SIMILAR CASES */}
                        {activeTab === 'similar-cases' && (
                          <>
                            {detectedSymptoms.length > 0 ? (
                              <SimilarCasesPanel
                                symptoms={detectedSymptoms}
                                severity={aiAnalysis?.severity || 'MEDIUM'}
                              />
                            ) : (
                              <div className="p-3 border rounded bg-slate-50 text-xs text-slate-600 text-center">
                                Similar cases appear once symptoms are detected
                              </div>
                            )}
                          </>
                        )}

                        {/* LOCATION VERIFY */}
                        {activeTab === 'location-verify' && (
                          <LocationVerification
                            rawLocation={aiAnalysis?.location?.address}
                            latitude={aiAnalysis?.location?.latitude}
                            longitude={aiAnalysis?.location?.longitude}
                            onLocationConfirmed={(location) => console.log('Location Confirmed:', location)}
                          />
                        )}

                        {/* HOSPITAL */}
                        {activeTab === 'hospital' && (
                          <HospitalFinder
                            analysis={aiAnalysis}
                            onSelectHospital={(hospital) => {
                              setSelectedHospital(hospital)
                            }}
                            isLoading={isAnalyzing}
                          />
                        )}

                        {/* CONTEXTUAL QUESTIONS */}
                        {activeTab === 'questions' && (
                          <ContextualQuestions
                            symptoms={detectedSymptoms}
                            previousAnswers={{}}
                            onAnswerSubmitted={(questionId, answer) => console.log(`Question ${questionId}: ${answer}`)}
                            isLoading={false}
                          />
                        )}

                        {/* AUTONOMOUS CONTROL */}
                        {activeTab === 'autonomous-control' && (
                          <AutonomousModePanel />
                        )}

                        {/* SENTIMENT */}
                        {activeTab === 'sentiment' && (
                          <SentimentAnalysisPanel />
                        )}

                        {/* MONITORING */}
                        {activeTab === 'monitoring' && (
                          <ContinuousMonitoringPanel />
                        )}

                        {/* COMPLEXITY */}
                        {activeTab === 'complexity' && (
                          <ComplexityPredictionCard />
                        )}

                        {/* RESOURCES */}
                        {activeTab === 'resources' && (
                          <ResourceOptimizationPanel />
                        )}

                        {/* NLP */}
                        {activeTab === 'nlp' && (
                          <NLPCommandConsole />
                        )}

                        {/* TRANSCRIPTION */}
                        {activeTab === 'transcription' && (
                          <TranscriptionPanel />
                        )}

                        {/* THINKING */}
                        {activeTab === 'thinking' && (
                          <ThinkingProcessDashboard />
                        )}

                        {/* STATUS */}
                        {activeTab === 'status' && (
                          <div className="text-sm space-y-3">
                            {dispatchDecision && (
                              <div className="p-3 border rounded-lg bg-slate-50">
                                <div className="font-semibold mb-2 text-slate-900">Decision Status</div>
                                <div className="space-y-1 text-sm">
                                  <div><strong>Route:</strong> {dispatchDecision.route}</div>
                                  <div><strong>Confidence:</strong> {dispatchDecision.confidence}%</div>
                                </div>
                              </div>
                            )}
                            <div className="p-3 border rounded-lg bg-slate-50">
                              <div className="font-semibold mb-2 text-slate-900">System Status</div>
                              <div className="space-y-1 text-sm">
                                <div>WebSocket: <span className="font-medium">{isConnected ? '🟢 Connected' : '🔴 Offline'}</span></div>
                                <div>Analysis: <span className="font-medium">{isAnalyzing ? '⏳ Analyzing' : aiAnalysis ? '🟢 Ready' : '⚪ Waiting'}</span></div>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* HOSPITAL INFO POPUP (when selected) */}
              {selectedHospital && (
                <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg border-2 border-green-300 shadow-xl text-sm z-20 max-w-sm pointer-events-auto animate-in slide-in-from-bottom-4 duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-slate-900 text-base">{selectedHospital.name}</div>
                      <div className="text-xs text-green-600 mt-1 font-medium">📍 {selectedHospital.distance.toFixed(1)} km away</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedHospital(null)
                      }}
                      className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex-shrink-0 ml-2"
                      title="Close"
                      aria-label="Close hospital info"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs space-y-2 text-slate-600 border-t border-slate-200 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Phone:</span>
                      <span className="text-slate-900">{selectedHospital.phone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-slate-700 flex-shrink-0">Address:</span>
                      <span className="text-slate-900">{selectedHospital.address}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* GLOBAL SOS BUTTON */}
      <SOSButton />
    </SidebarProvider>
  )
}
