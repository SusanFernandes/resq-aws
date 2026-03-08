/**
 * Sentiment Analysis Service (TIER 3 - A6)
 * Real-time caller emotion and stress detection
 */

export interface EmotionScore {
  panic: number // 0-100%
  worry: number // 0-100%
  calmness: number // 0-100%
  anger: number // 0-100%
  confusion: number // 0-100%
  dominant: 'panic' | 'worry' | 'calm' | 'angry' | 'confused'
  intensity: number // 0-100 overall stress level
}

export interface SentimentResult {
  emotion: EmotionScore
  sentiment: 'positive' | 'negative' | 'neutral' // Text sentiment
  stressLevel: 'low' | 'moderate' | 'high' | 'critical'
  confidence: number
  keywords: string[] // Key emotion-indicating phrases
  riskScore: number // 0-100, higher = more intervention needed
  recommendation: string
  timestamp: number
}

export interface EmotionTrend {
  timestamp: number
  emotion: EmotionScore
}

const emotionDatabase: Map<string, EmotionTrend[]> = new Map()

export const SentimentAnalysisService = {
  /**
   * Analyze caller sentiment from transcript chunk
   * In production, this would use voice analysis + NLP
   */
  analyzeSentiment(callId: string, transcript: string, voiceMetrics?: any): SentimentResult {
    const keywords = this.extractEmotionKeywords(transcript)
    const emotionScore = this.calculateEmotionScore(transcript, keywords, voiceMetrics)
    const sentiment = this.determineSentiment(transcript)
    const stressLevel = this.calculateStressLevel(emotionScore.intensity)
    const riskScore = this.calculateRiskScore(emotionScore, stressLevel)

    const result: SentimentResult = {
      emotion: emotionScore,
      sentiment,
      stressLevel,
      confidence: this.calculateConfidence(keywords.length, transcript.length),
      keywords,
      riskScore,
      recommendation: this.generateRecommendation(emotionScore, stressLevel, riskScore),
      timestamp: Date.now(),
    }

    // Store trend data
    if (!emotionDatabase.has(callId)) {
      emotionDatabase.set(callId, [])
    }
    emotionDatabase.get(callId)!.push({ timestamp: Date.now(), emotion: emotionScore })

    // Keep only last 30 seconds of data
    const trends = emotionDatabase.get(callId)!
    const cutoff = Date.now() - 30000
    emotionDatabase.set(
      callId,
      trends.filter((t) => t.timestamp > cutoff)
    )

    return result
  },

  /**
   * Extract emotion-indicating keywords from transcript
   */
  private extractEmotionKeywords(transcript: string): string[] {
    const emotionKeywords: Record<string, string[]> = {
      panic: [
        'help',
        'emergency',
        'dying',
        'can\'t breathe',
        'hurry',
        'please',
        'quickly',
        'urgent',
      ],
      worry: ['concern', 'worried', 'scared', 'afraid', 'anxious', 'terrible', 'worst'],
      calmness: ['okay', 'fine', 'alright', 'stable', 'controlled', 'managed'],
      anger: ['angry', 'frustrated', 'mad', 'upset', 'not happy', 'ridiculous'],
      confusion: ['confused', 'don\'t know', 'unclear', 'what', 'how', 'why'],
    }

    const found: string[] = []
    const lowerTranscript = transcript.toLowerCase()

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      for (const keyword of keywords) {
        if (lowerTranscript.includes(keyword)) {
          found.push(keyword)
        }
      }
    }

    return [...new Set(found)]
  },

  /**
   * Calculate emotion scores based on transcript and voice metrics
   */
  private calculateEmotionScore(transcript: string, keywords: string[], voiceMetrics?: any): EmotionScore {
    const lowerTranscript = transcript.toLowerCase()

    // Keyword-based scoring
    const panicWords = ['help', 'emergency', 'dying', 'can\'t breathe', 'hurry']
    const worryWords = ['concern', 'worried', 'scared', 'afraid', 'anxious']
    const calmWords = ['okay', 'fine', 'alright', 'stable']
    const angryWords = ['angry', 'frustrated', 'mad', 'upset']
    const confusedWords = ['confused', 'don\'t know', 'unclear']

    const panicScore = panicWords.filter((w) => lowerTranscript.includes(w)).length * 15
    const worryScore = worryWords.filter((w) => lowerTranscript.includes(w)).length * 12
    const calmScore = calmWords.filter((w) => lowerTranscript.includes(w)).length * 15
    const angryScore = angryWords.filter((w) => lowerTranscript.includes(w)).length * 10
    const confusedScore = confusedWords.filter((w) => lowerTranscript.includes(w)).length * 10

    // Voice metrics (if available)
    let voiceBoost = 0
    if (voiceMetrics) {
      voiceBoost = voiceMetrics.pitch > 150 ? 20 : 0 // High pitch = stress
      voiceBoost += voiceMetrics.speed > 150 ? 15 : 0 // Fast speech = stress
      voiceBoost += voiceMetrics.pauseDuration < 0.5 ? 10 : 0 // Short pauses = stress
    }

    const panic = Math.min(100, panicScore + voiceBoost)
    const worry = Math.min(100, worryScore + voiceBoost * 0.7)
    const calmness = Math.min(100, calmScore)
    const anger = Math.min(100, angryScore)
    const confusion = Math.min(100, confusedScore)

    // Normalize scores
    const total = panic + worry + calmness + anger + confusion
    const multiplier = total > 0 ? 100 / total : 1

    return {
      panic: Math.round((panic * multiplier) / 5),
      worry: Math.round((worry * multiplier) / 5),
      calmness: Math.round((calmness * multiplier) / 5),
      anger: Math.round((anger * multiplier) / 5),
      confusion: Math.round((confusion * multiplier) / 5),
      dominant: this.determinantEmotion(panic, worry, calmness, anger, confusion),
      intensity: Math.round((panic + worry + anger + confusion) / 4),
    }
  },

  /**
   * Determine dominant emotion
   */
  private determinantEmotion(
    panic: number,
    worry: number,
    calmness: number,
    anger: number,
    confusion: number
  ): 'panic' | 'worry' | 'calm' | 'angry' | 'confused' {
    const scores = { panic, worry, calmness, anger, confusion }
    return Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0] as any
  },

  /**
   * Determine text sentiment (positive/negative/neutral)
   */
  private determineSentiment(transcript: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'okay', 'fine', 'better', 'great', 'happy', 'relieved']
    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'worse',
      'dying',
      'pain',
      'hurt',
      'scared',
      'angry',
    ]

    const lower = transcript.toLowerCase()
    const posCount = positiveWords.filter((w) => lower.includes(w)).length
    const negCount = negativeWords.filter((w) => lower.includes(w)).length

    if (negCount > posCount) return 'negative'
    if (posCount > negCount) return 'positive'
    return 'neutral'
  },

  /**
   * Calculate overall stress level
   */
  private calculateStressLevel(intensity: number): 'low' | 'moderate' | 'high' | 'critical' {
    if (intensity < 30) return 'low'
    if (intensity < 60) return 'moderate'
    if (intensity < 85) return 'high'
    return 'critical'
  },

  /**
   * Calculate risk score (0-100)
   * Higher = more immediate intervention needed
   */
  private calculateRiskScore(emotion: EmotionScore, stressLevel: string): number {
    const stressMap = { low: 10, moderate: 30, high: 70, critical: 90 }
    const base = stressMap[stressLevel as keyof typeof stressMap]

    // Increase risk if panic is high
    const panicRisk = emotion.panic * 0.5
    // Increase risk if anger is high (unpredictable)
    const angerRisk = emotion.anger * 0.3
    // Decrease risk if calmness is high
    const calmReduction = emotion.calmness * 0.2

    return Math.round(Math.min(100, Math.max(0, base + panicRisk + angerRisk - calmReduction)))
  },

  /**
   * Calculate confidence in analysis
   */
  private calculateConfidence(keywordCount: number, transcriptLength: number): number {
    // More keywords and longer transcript = higher confidence
    const keywordConfidence = Math.min(100, keywordCount * 15)
    const lengthConfidence = Math.min(100, (transcriptLength / 100) * 50)

    return Math.round((keywordConfidence + lengthConfidence) / 2)
  },

  /**
   * Generate recommendation based on sentiment
   */
  private generateRecommendation(emotion: EmotionScore, stressLevel: string, riskScore: number): string {
    if (riskScore > 85) {
      return '🚨 CRITICAL: Caller in severe distress. Immediate action required. Consider escalation.'
    }
    if (riskScore > 70) {
      return '⚠️ HIGH RISK: Caller is stressed/panicked. Ensure adequate resources dispatched.'
    }
    if (riskScore > 50) {
      return '📢 MODERATE: Caller is anxious. Provide reassurance and clear instructions.'
    }
    if (emotion.confusion > 60) {
      return '❓ CONFUSED: Caller having difficulty understanding. Slow down, ask clarifying questions.'
    }
    if (emotion.anger > 60) {
      return '😠 ANGRY: Caller frustrated. Stay calm, acknowledge frustration, refocus on help.'
    }
    return '✅ STABLE: Caller relatively calm. Proceed with standard protocol.'
  },

  /**
   * Get emotion trend data (last 30 seconds)
   */
  getEmotionTrend(callId: string): EmotionTrend[] {
    return emotionDatabase.get(callId) || []
  },

  /**
   * Clear emotion data for call (cleanup)
   */
  clearEmotionData(callId: string): void {
    emotionDatabase.delete(callId)
  },
}
