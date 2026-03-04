"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { CoreFeaturesSidebar, EmergencyListSidebar } from "@/components/app-sidebar"
import { WebSocketData, AIAnalysis } from "@/types/emergency"
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
import { AlertTriangle, CheckCircle2, Clock, X, LayoutDashboard } from "lucide-react"
import { GoogleTranslate } from "@/components/google-translate"

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
  const [featuresOpen, setFeaturesOpen] = useState(true)
  const [emergenciesOpen, setEmergenciesOpen] = useState(true)

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
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current)
          reconnectTimeout.current = undefined
        }
      }

      ws.current.onmessage = async (event) => {
        try {
          const response = JSON.parse(event.data)
          if (response.type === "twilio-update") {
            setWsData({
              type: response.type,
              data: {
                id: `E-${Date.now()}`,
                timestamp: new Date().toISOString(),
                originalConversation: response.data.originalConversation || [],
                aiAnalysis: response.data.aiAnalysis
              }
            })
            await analyzeEmergency(response.data)
          }
        } catch (error) {
          console.error('Error parsing websocket data:', error)
        }
      }

      ws.current.onclose = () => {
        setIsConnected(false)
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket()
        }, 2000)
      }

      ws.current.onerror = (event: Event) => {
        event.preventDefault?.()
        ws.current?.close()
      }

    } catch (error) {
      reconnectTimeout.current = setTimeout(() => {
        connectWebSocket()
      }, 2000)
    }
  }, [])

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
        const analysis = await response.json()
        setAiAnalysis(analysis)
        const decision = makeDispatchDecision(analysis)
        setDispatchDecision(decision)
      }
    } catch (error) {
      console.error('Error analyzing emergency:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDispatch = async (formData: DispatchFormData) => {
    setDispatchedFormData(formData)
    if (!selectedHospital) {
      alert('Please select a hospital before dispatching')
      return
    }

    try {
      if (dispatchDecision?.route === 'AUTO_DISPATCH' || dispatchDecision?.route === 'OPERATOR_ASSISTED') {
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
            dispatchedBy: 'OPERATOR',
            estimatedArrival: Math.round(selectedHospital.distance * 2),
          },
          'OPERATOR'
        )
      }
    } catch (error) {
      console.error('[Dashboard] Dispatch error:', error)
    }
  }

  const handleExecuteProtocol = async (protocolName: string) => {
    setIsAnalyzing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
    } finally {
      setIsAnalyzing(false)
    }
  }

  useEffect(() => {
    connectWebSocket()
    return () => {
      if (ws.current) ws.current.close()
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
    }
  }, [connectWebSocket])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTab) setActiveTab('')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab])

  return (
    <SidebarProvider defaultOpen={true}>
      {/* 1. Core Features Sidebar */}
      <CoreFeaturesSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        open={featuresOpen}
        onOpenChange={setFeaturesOpen}
      />

      {/* 2. Emergency List Sidebar */}
      <EmergencyListSidebar
        wsData={wsData}
        open={emergenciesOpen}
        onOpenChange={setEmergenciesOpen}
      />

      <SidebarInset className="flex flex-col">
        {/* HEADER */}
        <header className="sticky top-0 flex h-auto shrink-0 flex-col gap-3 border-b bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button onClick={() => setFeaturesOpen(!featuresOpen)} className="p-2 hover:bg-slate-100 rounded-md transition-colors" title="Toggle Features">
                  <LayoutDashboard className="size-5 text-slate-600" />
                </button>
                <button onClick={() => setEmergenciesOpen(!emergenciesOpen)} className="p-2 hover:bg-slate-100 rounded-md transition-colors" title="Toggle Emergencies">
                  <Clock className="size-5 text-slate-600" />
                </button>
              </div>
              <Separator orientation="vertical" className="mx-2 h-6" />
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-slate-900">Emergency Ops</h1>
                <p className="text-xs text-slate-600">Real-time dispatch & decision-making</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GoogleTranslate />
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
            <div className="p-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm border-l-blue-400 border-l-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Emergency ID</p>
              <p className="text-lg font-mono font-bold text-slate-800">{wsData?.data?.id?.slice(-6) || "E-8429"}</p>
            </div>
            <div className="p-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm border-l-blue-600 border-l-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AI Confidence</p>
              <p className="text-lg font-bold text-blue-700">{dispatchDecision?.confidence || "98"}%</p>
            </div>
            <div className="p-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm border-l-amber-400 border-l-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Auto Decision</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span className="text-sm font-bold text-slate-700 uppercase">{dispatchDecision?.route?.replace('_', ' ') || "AUTO DISPATCH"}</span>
              </div>
            </div>
            <div className="p-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm border-l-green-400 border-l-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dispatch Status</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span className="text-sm font-bold text-slate-700">{dispatchedFormData ? "CONFIRMED" : "READY"}</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN LAYOUT */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
          <div className="flex-1 relative">
            <MapView wsData={wsData} />

            {/* OVERLAY MODAL */}
            {activeTab && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setActiveTab('')}>
                <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-xl shadow-2xl border border-blue-200 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-6 py-4 border-b-2 border-blue-100 bg-gradient-to-r from-blue-50 to-white">
                    <h2 className="text-xl font-bold text-slate-900 capitalize">{activeTab.replace('-', ' ')}</h2>
                    <button onClick={() => setActiveTab('')} className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-all ml-4">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {activeTab === 'analysis' && (
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded-lg border text-sm space-y-1">
                          <div><strong>ID:</strong> {wsData?.data?.id || "N/A"}</div>
                          <div><strong>Time:</strong> {wsData?.data?.timestamp ? new Date(wsData.data.timestamp).toLocaleTimeString() : "N/A"}</div>
                        </div>
                        <AIAnalysisCard analysis={aiAnalysis} isLoading={isAnalyzing} />
                      </div>
                    )}

                    {activeTab === 'intake' && (
                      <OperatorIntakeForm
                        analysis={aiAnalysis}
                        onDispatch={(data) => {
                          setDispatchedFormData(data);
                          handleDispatch(data);
                        }}
                        isLoading={isAnalyzing}
                      />
                    )}

                    {activeTab === 'protocol' && (
                      <ProtocolReference
                        analysis={aiAnalysis}
                        onExecuteProtocol={handleExecuteProtocol}
                        isLoading={isAnalyzing}
                      />
                    )}

                    {activeTab === 'dispatch' && (
                      <AutoDispatch
                        analysis={aiAnalysis}
                        selectedHospital={selectedHospital}
                        isLoading={isAnalyzing}
                        onDispatchSuccess={() => { }}
                        onDispatchError={() => { }}
                      />
                    )}

                    {activeTab === 'escalation' && (
                      <EscalationManager
                        analysis={aiAnalysis}
                        selectedHospital={selectedHospital}
                        emergencyId={wsData?.data?.id || `E-${Date.now()}`}
                      />
                    )}

                    {activeTab === 'live-analysis' && (
                      <LiveAnalysisPanel
                        analysisId={liveAnalysisId || 'test'}
                        isActive={true}
                        onUpdate={(analysis: any) => {
                          if (analysis.symptoms) setDetectedSymptoms(analysis.symptoms)
                        }}
                      />
                    )}

                    {activeTab === 'similar-cases' && (
                      <SimilarCasesPanel
                        symptoms={detectedSymptoms}
                        severity={(aiAnalysis as any)?.severity || 'MEDIUM'}
                      />
                    )}

                    {activeTab === 'hospital' && (
                      <HospitalFinder
                        analysis={aiAnalysis}
                        onSelectHospital={setSelectedHospital}
                        isLoading={isAnalyzing}
                      />
                    )}

                    {activeTab === 'sentiment' && <SentimentAnalysisPanel />}
                    {activeTab === 'monitoring' && <ContinuousMonitoringPanel />}
                    {activeTab === 'complexity' && <ComplexityPredictionCard />}
                    {activeTab === 'resources' && <ResourceOptimizationPanel />}
                    {activeTab === 'nlp' && <NLPCommandConsole />}
                    {activeTab === 'transcription' && <TranscriptionPanel />}
                    {activeTab === 'thinking' && <ThinkingProcessDashboard />}
                  </div>
                </div>
              </div>
            )}

            {/* HOSPITAL INFO POPUP */}
            {selectedHospital && (
              <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg border-2 border-green-200 shadow-xl text-sm z-20 max-w-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-slate-900">{selectedHospital.name}</div>
                  <button onClick={() => setSelectedHospital(null)} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-600">
                  <div>📍 Distance: {selectedHospital.distance.toFixed(1)} km</div>
                  <div>📞 Phone: {selectedHospital.phone}</div>
                  <div className="mt-1">🏠 {selectedHospital.address}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
      <SOSButton />
    </SidebarProvider>
  )
}
