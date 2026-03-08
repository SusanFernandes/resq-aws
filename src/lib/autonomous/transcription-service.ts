/**
 * Transcription Service (TIER 3 - O9)
 * Live call transcription and key point extraction
 */

export interface TranscriptSegment {
  id: string
  timestamp: number // seconds from start
  speaker: 'caller' | 'operator'
  text: string
  confidence: number // 0-100
  keyPhrases?: string[]
  redFlags?: string[]
  sentiment?: 'positive' | 'neutral' | 'negative'
}

export interface TranscriptionResult {
  callId: string
  startTime: number
  transcripts: TranscriptSegment[]
  fullText: string
  keyPhrases: string[]
  redFlags: string[]
  summary: string
  actionItems: string[]
  medicalTerms: string[]
  timelineEvents: Array<{ time: number; description: string }>
}

const transcriptionSessions: Map<string, TranscriptionResult> = new Map()
const redFlagDatabase = [
  'unresponsive',
  'not breathing',
  'chest pain',
  'severe bleeding',
  'loss of consciousness',
  'difficulty breathing',
  'allergic reaction',
  'overdose',
  'suicide',
  'homicide',
  'choking',
  'seizure',
  'stroke',
  'heart attack',
  'electrocution',
  'poisoning',
]

const medicalTermsDatabase = [
  'cardiac',
  'respiratory',
  'trauma',
  'fracture',
  'laceration',
  'hemorrhage',
  'infection',
  'dehydration',
  'hypothermia',
  'hyperthermia',
  'overdose',
  'poisoning',
  'allergy',
  'anaphylaxis',
  'sepsis',
]

export const TranscriptionService = {
  /**
   * Start transcription session
   */
  startTranscription(callId: string): TranscriptionResult {
    const session: TranscriptionResult = {
      callId,
      startTime: Date.now(),
      transcripts: [],
      fullText: '',
      keyPhrases: [],
      redFlags: [],
      summary: '',
      actionItems: [],
      medicalTerms: [],
      timelineEvents: [],
    }

    transcriptionSessions.set(callId, session)
    return session
  },

  /**
   * Add transcript segment
   */
  addSegment(
    callId: string,
    speaker: 'caller' | 'operator',
    text: string,
    elapsedSeconds: number,
    confidence: number = 95
  ): TranscriptSegment {
    const session = transcriptionSessions.get(callId)
    if (!session) {
      throw new Error(`No transcription session found for call ${callId}`)
    }

    // Extract key phrases and red flags
    const keyPhrases = this.extractKeyPhrases(text)
    const redFlags = this.detectRedFlags(text)
    const medicalTerms = this.extractMedicalTerms(text)

    // Determine sentiment
    const sentiment = this.analyzeSentiment(text)

    const segment: TranscriptSegment = {
      id: `${callId}-${elapsedSeconds}-${speaker}`,
      timestamp: elapsedSeconds,
      speaker,
      text,
      confidence,
      keyPhrases,
      redFlags,
      sentiment,
    }

    // Add to transcript
    session.transcripts.push(segment)

    // Update full text
    session.fullText += `[${this.formatTime(elapsedSeconds)}] ${speaker.toUpperCase()}: ${text}\n`

    // Track red flags
    if (redFlags.length > 0) {
      session.redFlags.push(...redFlags)
      session.timelineEvents.push({
        time: elapsedSeconds,
        description: `🚨 RED FLAG DETECTED: ${redFlags.join(', ')}`,
      })
    }

    // Track medical terms
    session.medicalTerms.push(...medicalTerms)

    // Track key phrases
    if (keyPhrases.length > 0) {
      session.keyPhrases.push(...keyPhrases.filter((p) => !session.keyPhrases.includes(p)))
    }

    // Update summary (regenerate for recent segments)
    if (session.transcripts.length > 0) {
      session.summary = this.generateSummary(session.transcripts)
      session.actionItems = this.extractActionItems(session)
    }

    return segment
  },

  /**
   * Extract key phrases from text
   */
  private extractKeyPhrases(text: string): string[] {
    const phrases: string[] = []
    const normalized = text.toLowerCase()

    // Location indicators
    const locations = ['building', 'home', 'street', 'highway', 'office', 'park', 'hospital']
    locations.forEach((loc) => {
      if (normalized.includes(loc)) phrases.push(`Location: ${loc}`)
    })

    // Victim count
    const countMatch = normalized.match(/(\d+|multiple|several|few)\s*(victim|person|people|individual)/)
    if (countMatch) phrases.push(`Victim count: ${countMatch[1]}`)

    // Action keywords
    const actions = [
      'fall',
      'accident',
      'collision',
      'fire',
      'smoke',
      'trapped',
      'drowning',
      'unconscious',
      'bleeding',
    ]
    actions.forEach((action) => {
      if (normalized.includes(action)) phrases.push(`Action: ${action}`)
    })

    // Duration indicators
    const durationMatch = normalized.match(/(\d+)\s*(minute|hour|second|hour)/i)
    if (durationMatch) phrases.push(`Duration: ${durationMatch[0]}`)

    return [...new Set(phrases)]
  },

  /**
   * Detect red flags in text
   */
  private detectRedFlags(text: string): string[] {
    const normalized = text.toLowerCase()
    const detected: string[] = []

    redFlagDatabase.forEach((flag) => {
      if (normalized.includes(flag)) detected.push(flag)
    })

    return detected
  },

  /**
   * Extract medical terms
   */
  private extractMedicalTerms(text: string): string[] {
    const normalized = text.toLowerCase()
    const found: string[] = []

    medicalTermsDatabase.forEach((term) => {
      if (normalized.includes(term)) found.push(term)
    })

    return found
  },

  /**
   * Analyze sentiment of text
   */
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const normalized = text.toLowerCase()

    const positiveWords = ['good', 'better', 'calm', 'okay', 'stable', 'improving']
    const negativeWords = ['worse', 'panic', 'help', 'emergency', 'critical', 'dying', 'pain']

    let positiveScore = positiveWords.filter((w) => normalized.includes(w)).length
    let negativeScore = negativeWords.filter((w) => normalized.includes(w)).length

    if (negativeScore > positiveScore) return 'negative'
    if (positiveScore > negativeScore) return 'positive'
    return 'neutral'
  },

  /**
   * Generate summary of transcript
   */
  private generateSummary(transcripts: TranscriptSegment[]): string {
    if (transcripts.length === 0) return 'No transcript data'

    // Get last few segments to summarize
    const recent = transcripts.slice(-10)
    const callerSegments = recent.filter((s) => s.speaker === 'caller')
    const operatorSegments = recent.filter((s) => s.speaker === 'operator')

    if (callerSegments.length === 0) return 'Operator initiated contact'

    const mainConcern = callerSegments.map((s) => s.text).join(' ')
    const concern = mainConcern.substring(0, 150) + (mainConcern.length > 150 ? '...' : '')

    const responseQuality =
      operatorSegments.length > 0
        ? 'Operator is gathering information'
        : 'Awaiting operator response'

    return `Caller reported: ${concern}. Status: ${responseQuality}`
  },

  /**
   * Extract action items from transcript
   */
  private extractActionItems(session: TranscriptionResult): string[] {
    const items: string[] = []

    // If red flags exist, action is needed
    if (session.redFlags.length > 0) {
      items.push(`Handle red flags: ${session.redFlags.slice(0, 3).join(', ')}`)
    }

    // Check for location issues
    if (session.keyPhrases.some((p) => p.includes('Location'))) {
      items.push('Confirm accurate location')
    }

    // Check for medical complexity
    if (session.medicalTerms.length > 2) {
      items.push('Complex medical case - consider specialist')
    }

    // Check for multiple victims
    if (session.keyPhrases.some((p) => p.includes('multiple'))) {
      items.push('Multiple victims - coordinate resources')
    }

    return items
  },

  /**
   * Format timestamp
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  },

  /**
   * Highlight red flags in text
   */
  getHighlightedText(callId: string): string {
    const session = transcriptionSessions.get(callId)
    if (!session) return ''

    let highlighted = session.fullText
    session.redFlags.forEach((flag) => {
      const regex = new RegExp(`\\b(${flag})\\b`, 'gi')
      highlighted = highlighted.replace(regex, '🚨 $1 🚨')
    })

    return highlighted
  },

  /**
   * Get key statistics
   */
  getTranscriptionStats(callId: string): {
    totalDuration: number
    segmentCount: number
    callerSpeakTime: number
    operatorSpeakTime: number
    redFlagCount: number
    medicalTermCount: number
    averageConfidence: number
  } {
    const session = transcriptionSessions.get(callId)
    if (!session) {
      return {
        totalDuration: 0,
        segmentCount: 0,
        callerSpeakTime: 0,
        operatorSpeakTime: 0,
        redFlagCount: 0,
        medicalTermCount: 0,
        averageConfidence: 0,
      }
    }

    const callerSegments = session.transcripts.filter((s) => s.speaker === 'caller')
    const operatorSegments = session.transcripts.filter((s) => s.speaker === 'operator')

    const totalDuration =
      session.transcripts.length > 0
        ? session.transcripts[session.transcripts.length - 1].timestamp
        : 0

    const callerWords = callerSegments.reduce((sum, s) => sum + s.text.split(' ').length, 0)
    const operatorWords = operatorSegments.reduce((sum, s) => sum + s.text.split(' ').length, 0)

    const avgConfidence =
      session.transcripts.length > 0
        ? Math.round(
            session.transcripts.reduce((sum, s) => sum + s.confidence, 0) /
              session.transcripts.length
          )
        : 0

    return {
      totalDuration,
      segmentCount: session.transcripts.length,
      callerSpeakTime: callerWords,
      operatorSpeakTime: operatorWords,
      redFlagCount: session.redFlags.length,
      medicalTermCount: session.medicalTerms.length,
      averageConfidence: avgConfidence,
    }
  },

  /**
   * Export transcript for documentation
   */
  exportTranscript(
    callId: string,
    format: 'text' | 'json' | 'markdown' = 'text'
  ): string | object {
    const session = transcriptionSessions.get(callId)
    if (!session) return ''

    if (format === 'json') {
      return {
        callId: session.callId,
        startTime: new Date(session.startTime).toISOString(),
        transcripts: session.transcripts,
        summary: session.summary,
        keyPhrases: session.keyPhrases,
        redFlags: session.redFlags,
        actionItems: session.actionItems,
      }
    }

    if (format === 'markdown') {
      let markdown = `# Call Transcription - ${callId}\n\n`
      markdown += `**Started:** ${new Date(session.startTime).toISOString()}\n\n`
      markdown += `## Summary\n${session.summary}\n\n`
      markdown += `## Red Flags\n${session.redFlags.map((f) => `- 🚨 ${f}`).join('\n')}\n\n`
      markdown += `## Transcript\n${session.fullText}\n`
      markdown += `## Action Items\n${session.actionItems.map((i) => `- [ ] ${i}`).join('\n')}\n`
      return markdown
    }

    return session.fullText
  },

  /**
   * Get live transcript
   */
  getLiveTranscript(callId: string): TranscriptSegment[] {
    return transcriptionSessions.get(callId)?.transcripts || []
  },

  /**
   * Search transcript
   */
  searchTranscript(callId: string, query: string): TranscriptSegment[] {
    const session = transcriptionSessions.get(callId)
    if (!session) return []

    const normalized = query.toLowerCase()
    return session.transcripts.filter((s) => s.text.toLowerCase().includes(normalized))
  },

  /**
   * Auto-generate notes from transcript
   */
  generateAutoNotes(callId: string): string {
    const session = transcriptionSessions.get(callId)
    if (!session) return ''

    const notes: string[] = ['## AUTOMATED CASE NOTES']
    notes.push(`\n**Date/Time:** ${new Date(session.startTime).toLocaleString()}`)
    notes.push(`\n**Duration:** ${this.formatTime(session.transcripts[session.transcripts.length - 1]?.timestamp || 0)}`)

    if (session.summary) notes.push(`\n**Summary:** ${session.summary}`)
    if (session.keyPhrases.length > 0) notes.push(`\n**Key Info:** ${session.keyPhrases.join(', ')}`)
    if (session.redFlags.length > 0)
      notes.push(`\n**Critical Issues:** ${session.redFlags.join(', ')}`)
    if (session.actionItems.length > 0)
      notes.push(`\n**Required Actions:** ${session.actionItems.join(', ')}`)

    return notes.join('\n')
  },

  /**
   * Stop transcription and finalize
   */
  stopTranscription(callId: string): TranscriptionResult | null {
    const session = transcriptionSessions.get(callId)
    if (!session) return null

    // Final summary
    session.summary = this.generateSummary(session.transcripts)
    session.actionItems = this.extractActionItems(session)

    return session
  },

  /**
   * Clear transcription data
   */
  clearTranscription(callId: string): void {
    transcriptionSessions.delete(callId)
  },
}
