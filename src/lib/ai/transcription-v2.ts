/**
 * CALL TRANSCRIPTION SERVICE - PRODUCTION
 * Uses Web Speech API (browser) + Deepgram fallback
 * Real-time transcript with medical keyword detection
 */

'use client'

export interface TranscriptSegment {
  id: string
  timestamp: number
  speaker: 'caller' | 'operator'
  text: string
  confidence: number
  is_final: boolean
  medical_keywords: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
  emotion?: string
}

export interface TranscriptionSession {
  call_id: string
  started_at: number
  segments: TranscriptSegment[]
  is_recording: boolean
  total_duration_ms: number
  transcript_text: string
  raw_audio_duration_ms: number
}

export interface TranscriptionError {
  code: string
  message: string
  recoverable: boolean
}

// ============================================
// WEB SPEECH API CLIENT
// ============================================

type SpeechRecognitionEventListener = (event: any) => void

export class WebSpeechTranscriber {
  private recognition: any
  private session: TranscriptionSession | null = null
  private currentInterimTranscript = ''
  private segmentId = 0
  private listeners: {
    onSegment?: (segment: TranscriptSegment) => void
    onError?: (error: TranscriptionError) => void
    onSessionState?: (state: Partial<TranscriptionSession>) => void
  } = {}

  constructor() {
    if (typeof window === 'undefined') return

    // Initialize Web Speech API (works in Chrome, Edge, Safari)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition()
      this.setupRecognition()
    }
  }

  private setupRecognition() {
    if (!this.recognition) return

    // Configuration for emergency calls
    this.recognition.continuous = true // Keep listening until explicitly stopped
    this.recognition.interimResults = true // Show partial results
    this.recognition.language = 'en-US'
    this.recognition.maxAlternatives = 1

    // ===== EVENTS =====
    this.recognition.onstart = () => {
      console.log('[Transcriber] Recording started')
      if (!this.session) {
        this.session = {
          call_id: `call-${Date.now()}`,
          started_at: Date.now(),
          segments: [],
          is_recording: true,
          total_duration_ms: 0,
          transcript_text: '',
          raw_audio_duration_ms: 0,
        }
      }
      this.listeners.onSessionState?.({ is_recording: true })
    }

    this.recognition.onresult = (event: any) => {
      if (!this.session) return

      this.currentInterimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const confidence = event.results[i][0].confidence

        if (event.results[i].isFinal) {
          // Final result - create a segment
          const segment: TranscriptSegment = {
            id: `seg-${this.segmentId++}`,
            timestamp: Date.now() - this.session.started_at,
            speaker: 'caller', // In production, use speaker diarization
            text: transcript.trim(),
            confidence: confidence,
            is_final: true,
            medical_keywords: this.extractMedicalKeywords(transcript),
          }

          this.session.segments.push(segment)
          this.session.transcript_text += ` ${transcript}`

          this.listeners.onSegment?.(segment)
          this.listeners.onSessionState?.({
            segments: this.session.segments,
            transcript_text: this.session.transcript_text,
            total_duration_ms: Date.now() - this.session.started_at,
          })
        } else {
          // Interim result
          this.currentInterimTranscript += transcript
        }
      }

      console.log(`[Transcriber] Interim: ${this.currentInterimTranscript}`)
    }

    this.recognition.onerror = (event: any) => {
      const error: TranscriptionError = {
        code: event.error,
        message: this.getErrorMessage(event.error),
        recoverable: event.error !== 'not-allowed' && event.error !== 'no-speech',
      }

      console.error('[Transcriber] Error:', error)
      this.listeners.onError?.(error)

      // Auto-restart on recoverable errors
      if (error.recoverable && this.session?.is_recording) {
        setTimeout(() => this.start(), 1000)
      }
    }

    this.recognition.onend = () => {
      console.log('[Transcriber] Recording ended')
      if (this.session) {
        this.session.is_recording = false
        this.listeners.onSessionState?.({ is_recording: false })
      }
    }
  }

  // ===== PUBLIC METHODS =====

  start(callId?: string) {
    if (!this.recognition) {
      this.listeners.onError?.({
        code: 'not-supported',
        message: 'Web Speech API not supported in this browser',
        recoverable: false,
      })
      return
    }

    this.session = {
      call_id: callId || `call-${Date.now()}`,
      started_at: Date.now(),
      segments: [],
      is_recording: true,
      total_duration_ms: 0,
      transcript_text: '',
      raw_audio_duration_ms: 0,
    }

    this.segmentId = 0
    this.currentInterimTranscript = ''

    try {
      this.recognition.start()
    } catch (error) {
      console.warn('Recognition already running, ignoring restart')
    }
  }

  stop(): TranscriptionSession | null {
    if (!this.recognition || !this.session) return null

    try {
      this.recognition.stop()
    } catch (error) {
      console.warn('Recognition stop error:', error)
    }

    if (this.session) {
      this.session.is_recording = false
      this.session.total_duration_ms = Date.now() - this.session.started_at
    }

    return this.session
  }

  abort() {
    if (this.recognition) {
      this.recognition.abort()
      this.session = null
    }
  }

  getSession(): TranscriptionSession | null {
    return this.session
  }

  onTranscriptionSegment(callback: (segment: TranscriptSegment) => void) {
    this.listeners.onSegment = callback
  }

  onTranscriptionError(callback: (error: TranscriptionError) => void) {
    this.listeners.onError = callback
  }

  onSessionStateChange(callback: (state: Partial<TranscriptionSession>) => void) {
    this.listeners.onSessionState = callback
  }

  // ===== PRIVATE HELPERS =====

  private extractMedicalKeywords(text: string): string[] {
    const medicalTerms = [
      'breathing',
      'chest pain',
      'cardiac',
      'stroke',
      'bleeding',
      'unconscious',
      'trauma',
      'allergic',
      'seizure',
      'poison',
      'overdose',
      'fracture',
      'severe',
      'emergency',
      'help',
      'dying',
    ]

    const found: string[] = []
    const lower = text.toLowerCase()

    for (const term of medicalTerms) {
      if (lower.includes(term)) {
        found.push(term)
      }
    }

    return found
  }

  private getErrorMessage(errorCode: string): string {
    const messages: Record<string, string> = {
      'no-speech': 'No speech detected. Please speak clearly.',
      'audio-capture': 'Microphone not available.',
      'network': 'Network error. Check connection.',
      'not-allowed': 'Microphone permission denied.',
      'bad-grammar': 'Grammar error in speech.',
      'service-not-allowed': 'Speech recognition service not allowed.',
    }

    return messages[errorCode] || `Speech recognition error: ${errorCode}`
  }
}

// ============================================
// DEEPGRAM FALLBACK (Optional, Paid)
// ============================================

export async function transcribeWithDeepgram(audioBlob: Blob, apiKey?: string): Promise<TranscriptionSession> {
  if (!apiKey) {
    throw new Error('Deepgram API key not provided')
  }

  const formData = new FormData()
  formData.append('audio', audioBlob)

  const response = await fetch('https://api.deepgram.com/v1/listen', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Deepgram error: ${response.statusText}`)
  }

  const result = await response.json()

  // Convert Deepgram response to our format
  const segments: TranscriptSegment[] = []
  let segId = 0

  for (const alternative of result.results.channels[0].alternatives) {
    const segment: TranscriptSegment = {
      id: `seg-${segId++}`,
      timestamp: 0,
      speaker: 'caller',
      text: alternative.transcript,
      confidence: alternative.confidence || 0.9,
      is_final: true,
      medical_keywords: extractMedicalKeywordsFromText(alternative.transcript),
    }

    segments.push(segment)
  }

  return {
    call_id: `call-deepgram-${Date.now()}`,
    started_at: Date.now(),
    segments,
    is_recording: false,
    total_duration_ms: (result.metadata.duration || 0) * 1000,
    transcript_text: segments.map((s) => s.text).join(' '),
    raw_audio_duration_ms: (result.metadata.duration || 0) * 1000,
  }
}

function extractMedicalKeywordsFromText(text: string): string[] {
  const keywords = [
    'breathing',
    'chest pain',
    'cardiac',
    'stroke',
    'bleeding',
    'unconscious',
    'trauma',
    'allergic',
    'seizure',
  ]
  const found: string[] = []
  const lower = text.toLowerCase()

  for (const kw of keywords) {
    if (lower.includes(kw)) found.push(kw)
  }

  return found
}
