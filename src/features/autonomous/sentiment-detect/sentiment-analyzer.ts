// Sentiment and stress level analysis
// Detects emotional state from call transcript
// Feature A6: Sentiment Detection & Stress Analysis

import { analyzeSentiment } from '@/lib/ai/groq-client'

export type StressLevel = 'calm' | 'stressed' | 'panic'
export type EmotionalState =
  | 'composed'
  | 'anxious'
  | 'distressed'
  | 'hysterical'
  | 'shock'
  | 'cooperative'
  | 'angry'
  | 'confused'

export interface SentimentAnalysisResult {
  stressLevel: StressLevel
  stressPercentage: number // 0-100
  emotionalState: EmotionalState
  confidence: number
  reasoning: string
  indicators: SentimentIndicator[]
  recommendation: string
  shouldEscalate: boolean
}

export interface SentimentIndicator {
  type: 'linguistic' | 'keyword' | 'pattern'
  indicator: string
  weight: number // 0-1
  description: string
}

// Linguistic patterns indicating stress
const STRESS_PATTERNS = {
  very_high: {
    keywords: ['screaming', 'panicked', 'hysterical', 'cannot think', 'help me', 'dying', 'dead'],
    patterns: ['!!!', '???', 'cant', 'cant breathe', 'please please'],
    urgency: 1.0,
  },
  high: {
    keywords: ['struggling', 'scared', 'worried', 'urgent', 'bleeding', 'emergency'],
    patterns: ['!!', 'please', 'hurry', 'critical'],
    urgency: 0.8,
  },
  moderate: {
    keywords: ['concerned', 'uncomfortable', 'need help', 'injured', 'sick'],
    patterns: ['!', 'problem', 'accident'],
    urgency: 0.5,
  },
  low: {
    keywords: ['question', 'information', 'lost', 'help', 'wondering'],
    patterns: ['hmm', 'not sure'],
    urgency: 0.2,
  },
}

/**
 * Analyze sentiment from call transcript
 * Uses Groq AI for comprehensive analysis with keyword fallback
 * @param transcript - Call transcript or speech-to-text output
 * @returns Sentiment analysis result with stress level and indicators
 */
export async function analyzeSentimentFromText(transcript: string): Promise<SentimentAnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    return {
      stressLevel: 'calm',
      stressPercentage: 0,
      emotionalState: 'composed',
      confidence: 0,
      reasoning: 'No transcript provided',
      indicators: [],
      recommendation: 'Insufficient information',
      shouldEscalate: false,
    }
  }

  try {
    // Use Groq for AI-based sentiment analysis
    const groqResult = await analyzeSentiment(transcript)

    const indicators = extractSentimentIndicators(transcript, groqResult.stressLevel)
    const recommendation = generateRecommendation(groqResult.stressLevel, groqResult.percentage)
    const shouldEscalate = groqResult.percentage > 80 || groqResult.stressLevel === 'panic'

    return {
      stressLevel: groqResult.stressLevel,
      stressPercentage: groqResult.percentage,
      emotionalState: mapStressToEmotionalState(groqResult.stressLevel, groqResult.percentage),
      confidence: groqResult.confidence,
      reasoning: groqResult.reasoning,
      indicators,
      recommendation,
      shouldEscalate,
    }
  } catch (error) {
    console.error('Groq sentiment analysis error:', error)
    // Fallback to keyword-based analysis
    return analyzeKeywordSentiment(transcript)
  }
}

/**
 * Keyword-based sentiment analysis (fallback)
 */
export function analyzeKeywordSentiment(transcript: string): SentimentAnalysisResult {
  const lowerTranscript = transcript.toLowerCase()

  // Count stress indicators
  let stressScore = 0
  const foundIndicators: SentimentIndicator[] = []

  // Check for very high stress
  for (const keyword of STRESS_PATTERNS.very_high.keywords) {
    if (lowerTranscript.includes(keyword)) {
      stressScore = 100
      foundIndicators.push({
        type: 'keyword',
        indicator: keyword,
        weight: 1.0,
        description: `Critical stress keyword detected: "${keyword}"`,
      })
      break
    }
  }

  // Check for high stress
  if (stressScore < 100) {
    for (const keyword of STRESS_PATTERNS.high.keywords) {
      if (lowerTranscript.includes(keyword)) {
        stressScore = Math.max(stressScore, 80)
        foundIndicators.push({
          type: 'keyword',
          indicator: keyword,
          weight: 0.8,
          description: `High stress keyword detected: "${keyword}"`,
        })
      }
    }
  }

  // Check for moderate stress
  if (stressScore < 80) {
    for (const keyword of STRESS_PATTERNS.moderate.keywords) {
      if (lowerTranscript.includes(keyword)) {
        stressScore = Math.max(stressScore, 50)
        foundIndicators.push({
          type: 'keyword',
          indicator: keyword,
          weight: 0.5,
          description: `Moderate stress keyword detected: "${keyword}"`,
        })
      }
    }
  }

  // Check for exclamation patterns
  const exclamationCount = (transcript.match(/!/g) || []).length
  if (exclamationCount > 3) {
    stressScore = Math.max(stressScore, 70)
    foundIndicators.push({
      type: 'pattern',
      indicator: `${exclamationCount} exclamation marks`,
      weight: 0.6,
      description: `Multiple exclamation marks indicate elevated emotion`,
    })
  }

  // Determine stress level
  let stressLevel: StressLevel = 'calm'
  if (stressScore > 80) stressLevel = 'panic'
  else if (stressScore > 50) stressLevel = 'stressed'

  const emotionalState = mapStressToEmotionalState(stressLevel, stressScore)
  const recommendation = generateRecommendation(stressLevel, stressScore)
  const shouldEscalate = stressScore > 80

  return {
    stressLevel,
    stressPercentage: stressScore,
    emotionalState,
    confidence: foundIndicators.length > 0 ? 70 : 30,
    reasoning: `Keyword-based analysis found ${foundIndicators.length} stress indicators`,
    indicators: foundIndicators,
    recommendation,
    shouldEscalate,
  }
}

/**
 * Extract sentiment indicators from transcript
 */
function extractSentimentIndicators(
  transcript: string,
  stressLevel: StressLevel
): SentimentIndicator[] {
  const indicators: SentimentIndicator[] = []
  const lowerTranscript = transcript.toLowerCase()

  // Pattern indicators
  const patterns = [
    { regex: /!!+/g, indicator: 'Multiple exclamation marks' },
    { regex: /\?\?+/g, indicator: 'Multiple question marks' },
    { regex: /\.\.\.+/g, indicator: 'Ellipsis patterns (hesitation)' },
    { regex: /\b(cant|can't|cannot)\b/g, indicator: 'Use of "can\'t" (helplessness)' },
  ]

  for (const { regex, indicator } of patterns) {
    const count = (transcript.match(regex) || []).length
    if (count > 0) {
      indicators.push({
        type: 'pattern',
        indicator,
        weight: Math.min(count / 3, 1),
        description: `Found ${count} occurrences of stress pattern`,
      })
    }
  }

  // Keyword detection based on stress level
  const relevantKeywords =
    stressLevel === 'panic'
      ? STRESS_PATTERNS.very_high.keywords
      : stressLevel === 'stressed'
        ? STRESS_PATTERNS.high.keywords
        : STRESS_PATTERNS.low.keywords

  for (const keyword of relevantKeywords) {
    if (lowerTranscript.includes(keyword)) {
      indicators.push({
        type: 'keyword',
        indicator: keyword,
        weight: 0.7,
        description: `Stress-related keyword: "${keyword}"`,
      })
    }
  }

  return indicators
}

/**
 * Map stress level to specific emotional state
 */
function mapStressToEmotionalState(stressLevel: StressLevel, percentage: number): EmotionalState {
  if (stressLevel === 'panic') {
    return percentage > 90 ? 'hysterical' : 'distressed'
  }

  if (stressLevel === 'stressed') {
    return percentage > 70 ? 'anxious' : 'concerned'
  }

  if (percentage < 20) return 'composed'
  if (percentage < 40) return 'cooperative'

  return 'anxious'
}

/**
 * Generate recommendation based on sentiment
 */
function generateRecommendation(stressLevel: StressLevel, percentage: number): string {
  if (stressLevel === 'panic' || percentage > 85) {
    return 'CRITICAL: Caller in panic - escalate immediately, use calm voice, ask simple yes/no questions'
  }

  if (stressLevel === 'stressed' || percentage > 60) {
    return 'CAUTION: Caller stressed - speak clearly, reassure caller, gather info step by step'
  }

  return 'NORMAL: Caller appears calm - proceed with standard protocol'
}

/**
 * Determine if caller needs immediate re-assurance
 */
export function needsReassurance(result: SentimentAnalysisResult): boolean {
  return result.stressLevel !== 'calm' && result.stressPercentage > 40
}

/**
 * Generate calming suggestions based on emotional state
 */
export function getCalmingSuggestions(result: SentimentAnalysisResult): string[] {
  const suggestions: string[] = []

  if (result.emotionalState === 'hysterical' || result.emotionalState === 'distressed') {
    suggestions.push('Ask caller to take slow, deep breaths')
    suggestions.push('Reassure caller that help is on the way')
    suggestions.push('Use a calm, confident tone yourself')
    suggestions.push('Ask simple yes/no questions to regain control')
  } else if (result.emotionalState === 'anxious') {
    suggestions.push('Provide clear, specific instructions')
    suggestions.push('Update caller on dispatch status')
    suggestions.push('Ask caller to describe what they see/feel')
  }

  if (result.stressPercentage > 70) {
    suggestions.push('Emphasize that trained professionals are responding')
    suggestions.push('Ask for basic safety actions (stay inside, etc.)')
  }

  return suggestions
}

/**
 * Monitor stress escalation across multiple samples
 */
export class StressMonitor {
  private samples: number[] = []
  private threshold: number = 0.1 // 10% increase is escalation

  addSample(stressPercentage: number): {
    isEscalating: boolean
    trend: 'increasing' | 'decreasing' | 'stable'
    change: number
  } {
    this.samples.push(stressPercentage)

    const isEscalating = this.isRapidIncrease()
    const trend = this.calculateTrend()
    const change = this.calculateChange()

    return { isEscalating, trend, change }
  }

  private isRapidIncrease(): boolean {
    if (this.samples.length < 2) return false

    const recent = this.samples.slice(-3)
    if (recent.length < 2) return false

    const lastChange = recent[recent.length - 1] - recent[recent.length - 2]
    return lastChange > 20 // 20% increase in one sample = escalation
  }

  private calculateTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.samples.length < 2) return 'stable'

    const recent = this.samples.slice(-5)
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(recent.length / 2)
    const secondHalf = recent.slice(Math.floor(recent.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(recent.length / 2)

    if (secondHalf > firstHalf + 5) return 'increasing'
    if (secondHalf < firstHalf - 5) return 'decreasing'
    return 'stable'
  }

  private calculateChange(): number {
    if (this.samples.length < 2) return 0
    return this.samples[this.samples.length - 1] - this.samples[this.samples.length - 2]
  }

  reset(): void {
    this.samples = []
  }
}

/**
 * Format sentiment for display
 */
export function formatSentiment(result: SentimentAnalysisResult): string {
  const emoji = {
    calm: '😌',
    stressed: '😟',
    panic: '😱',
  }

  return `${emoji[result.stressLevel]} ${Math.round(result.stressPercentage)}% - ${result.emotionalState}`
}

export default {
  analyzeSentimentFromText,
  analyzeKeywordSentiment,
  needsReassurance,
  getCalmingSuggestions,
  formatSentiment,
  StressMonitor,
}
