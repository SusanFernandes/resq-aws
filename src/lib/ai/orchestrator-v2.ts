/**
 * UNIFIED AI ORCHESTRATOR
 * Integrates all AI/ML services into a single production pipeline
 * Manages inference, caching, error handling, logging
 */

import { analyzeSentimentProduction, SentimentAnalysisResult } from './sentiment-analyzer-v2'
import { extractMedicalEntitiesProduction, MedicalNERResult } from './medical-ner-v2'
import { ComplexityPredictor, ComplexityPrediction } from './complexity-predictor-v2'
import { NLPCommandParser, NLPResult } from './nlp-parser-v2'
import { WebSpeechTranscriber, TranscriptionSession } from './transcription-v2'

export interface AIAnalysisResult {
  call_id: string
  timestamp: number
  
  // Component results
  sentiment: SentimentAnalysisResult
  medical: MedicalNERResult
  complexity: ComplexityPrediction
  nlp?: NLPResult
  transcript?: TranscriptionSession

  // Aggregated insights
  overall_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommended_action: string
  confidence_score: number // Aggregate confidence
  
  // Performance metrics
  total_inference_time_ms: number
  component_times: {
    sentiment_ms: number
    medical_ms: number
    complexity_ms: number
    nlp_ms: number
    transcript_ms: number
  }
}

export interface AIOrchestrator {
  analyzeCall(text: string, callId: string, options?: AnalysisOptions): Promise<AIAnalysisResult>
  startTranscription(callId: string): WebSpeechTranscriber
  parseCommand(command: string): Promise<NLPResult>
}

export interface AnalysisOptions {
  skipTranscription?: boolean
  skipNLP?: boolean
  useGroqEnhancement?: boolean
  cacheResult?: boolean
}

// ============================================
// MAIN ORCHESTRATOR CLASS
// ============================================

export class ProductionAIOrchestratorService implements AIOrchestrator {
  private complexityPredictor: ComplexityPredictor
  private nlpParser: NLPCommandParser
  private resultCache: Map<string, AIAnalysisResult> = new Map()
  private transcriberSessions: Map<string, WebSpeechTranscriber> = new Map()

  constructor(googleApiKey?: string, huggingFaceApiKey?: string) {
    this.complexityPredictor = new ComplexityPredictor()
    this.nlpParser = new NLPCommandParser(googleApiKey)

    // Set environment variables for API keys
    if (huggingFaceApiKey) {
      process.env.HUGGINGFACE_API_KEY = huggingFaceApiKey
    }
    if (googleApiKey) {
      process.env.GOOGLE_API_KEY = googleApiKey
    }
  }

  // ===== MAIN ANALYSIS PIPELINE =====

  async analyzeCall(
    transcript: string,
    callId: string,
    options: AnalysisOptions = {}
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now()
    const componentTimes = {
      sentiment_ms: 0,
      medical_ms: 0,
      complexity_ms: 0,
      nlp_ms: 0,
      transcript_ms: 0,
    }

    // Check cache
    if (options.cacheResult && this.resultCache.has(callId)) {
      return this.resultCache.get(callId)!
    }

    // Run all analyses in parallel where possible
    const analysisStart = Date.now()

    const [sentimentResult, medicalResult] = await Promise.all([
      this.runSentimentAnalysis(transcript),
      this.runMedicalNER(transcript),
    ])

    componentTimes.sentiment_ms = sentimentResult.inference_time_ms
    componentTimes.medical_ms = medicalResult.inference_time_ms

    // Complexity prediction (depends on sentiment and medical results)
    const complexityStart = Date.now()
    const complexityResult = this.complexityPredictor.predictComplexity({
      critical_conditions_count: medicalResult.critical_conditions.length,
      vital_signs_abnormal: medicalResult.urgency_level === 'CRITICAL',
      trauma_present: medicalResult.critical_conditions.some((c) => c.toLowerCase().includes('trauma')),
      age: 40, // Default, would be extracted in real scenario
      caller_panic_level: sentimentResult.emotions.intensity,
      patient_mental_capacity: sentimentResult.stress_level !== 'critical',
      weather_severity: 20, // Would be from external API
      hazmat_involved: medicalResult.critical_conditions.some((c) =>
        c.toLowerCase().includes('chemical') || c.toLowerCase().includes('hazmat')
      ),
      time_critical_intervention: sentimentResult.emotions.emotions.panic > 70,
    })
    componentTimes.complexity_ms = Date.now() - complexityStart

    // NLP parsing (optional)
    let nlpResult: NLPResult | undefined
    if (!options.skipNLP) {
      const nlpStart = Date.now()
      nlpResult = await this.nlpParser.parseCommand(transcript)
      componentTimes.nlp_ms = Date.now() - nlpStart
    }

    // Aggregate severity
    const overallSeverity = this.aggregateSeverity(sentimentResult, medicalResult, complexityResult)

    // Generate recommended action
    const recommendedAction = this.generateRecommendedAction(overallSeverity, sentimentResult, medicalResult, complexityResult)

    // Aggregate confidence
    const confidenceScore =
      (sentimentResult.emotions.confidence +
        medicalResult.urgency_level === 'CRITICAL' ? 0.95 : 0.85 +
        complexityResult.confidence) /
      3

    // Create result
    const result: AIAnalysisResult = {
      call_id: callId,
      timestamp: Date.now(),
      sentiment: sentimentResult,
      medical: medicalResult,
      complexity: complexityResult,
      nlp: nlpResult,
      overall_severity: overallSeverity,
      recommended_action: recommendedAction,
      confidence_score: Math.round(confidenceScore),
      total_inference_time_ms: Date.now() - startTime,
      component_times: componentTimes,
    }

    // Cache result
    if (options.cacheResult) {
      this.resultCache.set(callId, result)
    }

    return result
  }

  // ===== TRANSCRIPTION =====

  startTranscription(callId: string): WebSpeechTranscriber {
    const transcriber = new WebSpeechTranscriber()
    this.transcriberSessions.set(callId, transcriber)

    transcriber.onTranscriptionSegment((segment) => {
      console.log(`[${callId}] Transcribed:`, segment.text)
      // Could trigger real-time analysis here
    })

    transcriber.start(callId)
    return transcriber
  }

  stopTranscription(callId: string): TranscriptionSession | null {
    const transcriber = this.transcriberSessions.get(callId)
    if (!transcriber) return null

    const session = transcriber.stop()
    this.transcriberSessions.delete(callId)
    return session
  }

  // ===== COMMAND PARSING =====

  async parseCommand(command: string): Promise<NLPResult> {
    return this.nlpParser.parseCommand(command)
  }

  // ===== PRIVATE HELPERS =====

  private async runSentimentAnalysis(transcript: string): Promise<SentimentAnalysisResult> {
    return analyzeSentimentProduction(transcript)
  }

  private async runMedicalNER(transcript: string): Promise<MedicalNERResult> {
    return extractMedicalEntitiesProduction(transcript)
  }

  private aggregateSeverity(
    sentiment: SentimentAnalysisResult,
    medical: MedicalNERResult,
    complexity: ComplexityPrediction
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Weighted aggregation
    const sentimentScore = sentiment.stress_level === 'critical' ? 100 : 
                          sentiment.stress_level === 'high' ? 70 :
                          sentiment.stress_level === 'moderate' ? 40 : 20

    const medicalScore = medical.urgency_level === 'CRITICAL' ? 100 :
                        medical.urgency_level === 'HIGH' ? 75 :
                        medical.urgency_level === 'MEDIUM' ? 50 : 25

    const complexityScore = complexity.score // 0-100

    const aggregated = (sentimentScore * 0.3 + medicalScore * 0.35 + complexityScore * 0.35)

    if (aggregated >= 75) return 'CRITICAL'
    if (aggregated >= 55) return 'HIGH'
    if (aggregated >= 35) return 'MEDIUM'
    return 'LOW'
  }

  private generateRecommendedAction(
    severity: string,
    sentiment: SentimentAnalysisResult,
    medical: MedicalNERResult,
    complexity: ComplexityPrediction
  ): string {
    if (severity === 'CRITICAL') {
      return `🚨 CRITICAL: ${medical.critical_conditions.join(', ') || 'Unidentified critical condition'}. Immediate dispatch of ${complexity.required_resources.ambulances} ambulance(s) + ${medical.recommended_specialties.join(', ')}. Operator escalation recommended.`
    }

    if (severity === 'HIGH') {
      return `⚠️ HIGH PRIORITY: ${medical.recommended_specialties[0] || 'Medical'} intervention needed. Send ${complexity.required_resources.ambulances} ambulance(s) to ${sentiment.recommendation}.`
    }

    if (severity === 'MEDIUM') {
      return `📋 MEDIUM: Route to appropriate facility. Estimated handling time: ${Math.round(complexity.estimated_handle_time_seconds / 60)} minutes.`
    }

    return `✅ LOW: Routine assessment. Continue standard protocols.`
  }

  // ===== CACHE MANAGEMENT =====

  clearCache() {
    this.resultCache.clear()
  }

  getCacheSize(): number {
    return this.resultCache.size
  }

  // ===== DIAGNOSTICS =====

  getSystemStatus(): {
    transcribers_active: number
    cache_size: number
    ready: boolean
  } {
    return {
      transcribers_active: this.transcriberSessions.size,
      cache_size: this.resultCache.size,
      ready: true,
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let orchestrator: ProductionAIOrchestratorService | null = null

export function initializeAIOrchestrator(googleKey?: string, hfKey?: string): ProductionAIOrchestratorService {
  orchestrator = new ProductionAIOrchestratorService(googleKey, hfKey)
  return orchestrator
}

export function getAIOrchestrator(): ProductionAIOrchestratorService {
  if (!orchestrator) {
    orchestrator = new ProductionAIOrchestratorService()
  }
  return orchestrator
}
