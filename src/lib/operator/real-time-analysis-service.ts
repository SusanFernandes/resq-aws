/**
 * Real-time Analysis Service (O1)
 * Provides live AI analysis of ongoing calls for operator decision support
 */

export interface DetectedSymptom {
  symptom: string
  confidence: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  keywords: string[]
}

export interface LiveAnalysis {
  analysisId: string
  callId: string
  timestamp: ISO8601
  transcript: string
  detectedSymptoms: DetectedSymptom[]
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  aiSuggestion: string
  recommendedAction: string
  emergencyType: 'MEDICAL' | 'FIRE' | 'POLICE' | 'ACCIDENT' | 'OTHER'
  suggestedProtocol: string
  nextQuestions: string[]
  extractedData: {
    location?: { address: string; coordinates?: [number, number] }
    callerAge?: number
    patientAge?: number
    duration?: string
  }
}

export interface RealTimeAnalysisStore {
  activeAnalyses: Map<string, LiveAnalysis>
  analysisHistory: LiveAnalysis[]
  maxHistorySize: number
}

class RealTimeAnalysisService {
  private store: RealTimeAnalysisStore = {
    activeAnalyses: new Map(),
    analysisHistory: [],
    maxHistorySize: 1000,
  }

  /**
   * Start streaming analysis for a call
   */
  startCallAnalysis(callId: string): string {
    const analysisId = `ANALYSIS-${Date.now()}`
    const analysis: LiveAnalysis = {
      analysisId,
      callId,
      timestamp: new Date().toISOString() as ISO8601,
      transcript: '',
      detectedSymptoms: [],
      severity: 'LOW',
      aiSuggestion: 'Waiting for call content...',
      recommendedAction: 'Listen and gather information',
      emergencyType: 'OTHER',
      suggestedProtocol: 'General',
      nextQuestions: [],
      extractedData: {},
    }

    this.store.activeAnalyses.set(analysisId, analysis)
    console.log(`[RealTimeAnalysisService] Started analysis for call ${callId}`)
    return analysisId
  }

  /**
   * Update analysis with new transcript chunk
   */
  updateAnalysis(
    analysisId: string,
    newTranscriptChunk: string,
    emergencyData?: any
  ): LiveAnalysis {
    const analysis = this.store.activeAnalyses.get(analysisId)
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found`)
    }

    // Append to transcript
    analysis.transcript += (analysis.transcript ? ' ' : '') + newTranscriptChunk

    // Extract symptoms from transcript
    analysis.detectedSymptoms = this.extractSymptoms(analysis.transcript)

    // Update severity based on symptoms
    analysis.severity = this.calculateSeverity(analysis.detectedSymptoms)

    // Generate AI suggestion based on current state
    analysis.aiSuggestion = this.generateAISuggestion(
      analysis.detectedSymptoms,
      analysis.transcript
    )

    // Get recommended action
    analysis.recommendedAction = this.getRecommendedAction(
      analysis.severity,
      analysis.detectedSymptoms
    )

    // Classify emergency type
    analysis.emergencyType = this.classifyEmergency(analysis.transcript)

    // Suggest protocol
    analysis.suggestedProtocol = this.suggestProtocol(
      analysis.emergencyType,
      analysis.detectedSymptoms
    )

    // Generate next questions
    analysis.nextQuestions = this.generateNextQuestions(analysis.detectedSymptoms)

    // Extract structured data
    analysis.extractedData = this.extractStructuredData(
      analysis.transcript,
      emergencyData
    )

    analysis.timestamp = new Date().toISOString() as ISO8601

    this.store.activeAnalyses.set(analysisId, analysis)
    return analysis
  }

  /**
   * Extract symptoms from transcript using keyword matching
   */
  private extractSymptoms(transcript: string): DetectedSymptom[] {
    const symptoms: DetectedSymptom[] = []

    // Keyword mappings
    const symptomMap: Record<string, { severity: string; keywords: string[] }> = {
      'chest pain': {
        severity: 'CRITICAL',
        keywords: ['chest', 'pain', 'heart', 'tightness', 'pressure'],
      },
      'difficulty breathing': {
        severity: 'CRITICAL',
        keywords: ['breathing', 'breath', 'breathe', 'gasping', 'suffocating'],
      },
      bleeding: {
        severity: 'HIGH',
        keywords: ['bleeding', 'blood', 'bleed', 'hemorrhage', 'gushing'],
      },
      unconscious: {
        severity: 'CRITICAL',
        keywords: ['unconscious', 'fainted', 'collapsed', 'down', 'passed out'],
      },
      severe burn: {
        severity: 'HIGH',
        keywords: ['burn', 'burned', 'fire', 'flames', 'hot'],
      },
      choking: {
        severity: 'CRITICAL',
        keywords: ['choking', 'choke', 'stuck', 'throat', 'can\u0027t breathe'],
      },
      poisoning: {
        severity: 'HIGH',
        keywords: ['poison', 'toxic', 'overdose', 'swallowed', 'ingested'],
      },
    }

    const lowerTranscript = transcript.toLowerCase()

    Object.entries(symptomMap).forEach(([symptomName, { severity, keywords }]) => {
      const keywordMatches = keywords.filter((kw) => lowerTranscript.includes(kw))
      if (keywordMatches.length > 0) {
        const confidence = Math.min(100, 60 + keywordMatches.length * 15)
        symptoms.push({
          symptom: symptomName,
          confidence,
          severity: severity as any,
          keywords: keywordMatches,
        })
      }
    })

    // Remove duplicates and sort by confidence
    return Array.from(
      new Map(symptoms.map((s) => [s.symptom, s])).values()
    ).sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Calculate overall severity from symptoms
   */
  private calculateSeverity(
    symptoms: DetectedSymptom[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (symptoms.length === 0) return 'LOW'

    const maxSeverity = symptoms[0].severity

    const severityOrder = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    }

    return (Object.keys(severityOrder) as Array<
      'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    >).find((sev) => severityOrder[sev] === severityOrder[maxSeverity]) as any
  }

  /**
   * Generate AI suggestion based on symptoms
   */
  private generateAISuggestion(symptoms: DetectedSymptom[], transcript: string): string {
    if (symptoms.length === 0) {
      return 'No immediate red flags detected. Continue gathering information.'
    }

    const topSymptom = symptoms[0]
    const symptomsText = symptoms.map((s) => s.symptom).join(', ')

    if (topSymptom.severity === 'CRITICAL') {
      return `🔴 CRITICAL: Detected ${symptom}. This requires immediate medical attention. Prepare for auto-dispatch.`
    }

    if (topSymptom.severity === 'HIGH') {
      return `🟠 HIGH PRIORITY: ${symptomsText}. Urgent dispatch recommended.`
    }

    if (topSymptom.severity === 'MEDIUM') {
      return `🟡 MODERATE: ${symptomsText}. Standard dispatch may be appropriate.`
    }

    return `ℹ️  Symptoms noted: ${symptomsText}. Continue assessment.`
  }

  /**
   * Get recommended action based on severity
   */
  private getRecommendedAction(
    severity: string,
    symptoms: DetectedSymptom[]
  ): string {
    const actions: Record<string, string> = {
      CRITICAL: 'DISPATCH IMMEDIATELY + Get AED + Alert specialist',
      HIGH: 'Prepare dispatch + Get additional resources',
      MEDIUM: 'Dispatch with standard protocol',
      LOW: 'Continue assessment',
    }
    return actions[severity] || 'Continue assessment'
  }

  /**
   * Classify type of emergency
   */
  private classifyEmergency(transcript: string): 'MEDICAL' | 'FIRE' | 'POLICE' | 'ACCIDENT' | 'OTHER' {
    const lower = transcript.toLowerCase()

    if (
      lower.includes('fire') ||
      lower.includes('burn') ||
      lower.includes('smoke') ||
      lower.includes('flames')
    ) {
      return 'FIRE'
    }

    if (
      lower.includes('accident') ||
      lower.includes('crash') ||
      lower.includes('hit') ||
      lower.includes('collision')
    ) {
      return 'ACCIDENT'
    }

    if (
      lower.includes('assault') ||
      lower.includes('attack') ||
      lower.includes('robbery') ||
      lower.includes('police')
    ) {
      return 'POLICE'
    }

    if (
      lower.includes('sick') ||
      lower.includes('pain') ||
      lower.includes('hurt') ||
      lower.includes('breathing') ||
      lower.includes('chest')
    ) {
      return 'MEDICAL'
    }

    return 'OTHER'
  }

  /**
   * Suggest appropriate protocol
   */
  private suggestProtocol(
    emergencyType: string,
    symptoms: DetectedSymptom[]
  ): string {
    const protocols: Record<string, string> = {
      MEDICAL:
        symptoms[0]?.symptom === 'chest pain'
          ? 'Cardiac Protocol'
          : symptoms[0]?.symptom === 'difficulty breathing'
            ? 'Respiratory Protocol'
            : 'General Medical Protocol',
      FIRE: 'Fire Emergency Protocol',
      ACCIDENT: 'Trauma Protocol',
      POLICE: 'Security Emergency Protocol',
      OTHER: 'General Emergency Protocol',
    }

    return protocols[emergencyType] || 'General Emergency Protocol'
  }

  /**
   * Generate next questions to ask
   */
  private generateNextQuestions(symptoms: DetectedSymptom[]): string[] {
    const questions: string[] = []

    if (symptoms.length === 0) {
      return [
        'What is the emergency situation?',
        'Where exactly is the person?',
        'How many people are affected?',
      ]
    }

    // Generic follow-ups
    questions.push('Is the person conscious and breathing?', 'What is their exact location?')

    // Symptom-specific questions
    if (symptoms.some((s) => s.symptom === 'chest pain')) {
      questions.push('Is the chest pain radiating to the arm or jaw?')
      questions.push('Is the person having difficulty breathing?')
    }

    if (symptoms.some((s) => s.symptom === 'bleeding')) {
      questions.push('How severe is the bleeding? Is it gushing?')
      questions.push('What caused the injury?')
    }

    if (symptoms.some((s) => s.symptom === 'unconscious')) {
      questions.push('How long has the person been unconscious?')
      questions.push('Are they responsive to stimuli?')
    }

    return questions.slice(0, 4) // Return top 4 questions
  }

  /**
   * Extract structured data from transcript
   */
  private extractStructuredData(
    transcript: string,
    emergencyData?: any
  ): Record<string, any> {
    const extracted: Record<string, any> = {}

    const lower = transcript.toLowerCase()

    // Try to extract age
    const ageMatch = transcript.match(/(\d+)\s*(year|yo|old)/i)
    if (ageMatch) {
      extracted.patientAge = parseInt(ageMatch[1])
    }

    // Try to extract location
    if (emergencyData?.location) {
      extracted.location = emergencyData.location
    }

    // Try to extract duration
    const durationMatch = transcript.match(/(\d+)\s*(minute|hour|second)/i)
    if (durationMatch) {
      extracted.duration = durationMatch[0]
    }

    return extracted
  }

  /**
   * End analysis for a call
   */
  endCallAnalysis(analysisId: string): LiveAnalysis {
    const analysis = this.store.activeAnalyses.get(analysisId)
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found`)
    }

    this.store.activeAnalyses.delete(analysisId)
    this.store.analysisHistory.push(analysis)

    // Trim history if too large
    if (this.store.analysisHistory.length > this.store.maxHistorySize) {
      this.store.analysisHistory.shift()
    }

    console.log(`[RealTimeAnalysisService] Ended analysis ${analysisId}`)
    return analysis
  }

  /**
   * Get current analysis
   */
  getAnalysis(analysisId: string): LiveAnalysis | undefined {
    return this.store.activeAnalyses.get(analysisId)
  }

  /**
   * Get all active analyses
   */
  getActiveAnalyses(): LiveAnalysis[] {
    return Array.from(this.store.activeAnalyses.values())
  }
}

export const realTimeAnalysisService = new RealTimeAnalysisService()

type ISO8601 = string
