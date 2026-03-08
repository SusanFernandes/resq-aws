// Intent classification for emergency calls
// Identifies the type of emergency from initial caller information
// Feature A2: Intent Recognition & Classification

import { classifyIntent as groqClassifyIntent } from '@/lib/ai/groq-client'

export type EmergencyIntent =
  | 'MEDICAL'
  | 'FIRE'
  | 'POLICE'
  | 'ACCIDENT'
  | 'TOXIC'
  | 'UTILITY'
  | 'NON_EMERGENCY'
  | 'UNKNOWN'

export interface IntentResult {
  intent: EmergencyIntent
  confidence: number
  reasoning: string
  keywords: string[]
  suggestedResources: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
}

// Keyword-based classification (fallback and bootstrapping)
const INTENT_KEYWORDS: Record<EmergencyIntent, string[]> = {
  MEDICAL: [
    'breathless',
    'chest pain',
    'unconscious',
    'cardiac',
    'heart attack',
    'stroke',
    'fever',
    'bleeding',
    'injury',
    'ambulance',
    'hospital',
    'doctor',
    'illness',
    'sick',
    'medical',
    'vaccine',
    'medicine',
    'pain',
    'seizure',
    'asthma',
    'diabetic',
    'allergic',
    'pregnant',
    'labor',
  ],
  FIRE: [
    'fire',
    'burning',
    'smoke',
    'explosion',
    'blast',
    'flames',
    'arson',
    'fire station',
    'fireman',
    'extinguisher',
    'gas leak',
    'electrical fire',
  ],
  POLICE: [
    'theft',
    'robbery',
    'crime',
    'assault',
    'violence',
    'attack',
    'beaten',
    'rape',
    'murder',
    'kidnap',
    'traffic',
    'drunk',
    'accident',
    'police',
    'suspect',
    'criminal',
    'gang',
    'disturbance',
    'fight',
  ],
  ACCIDENT: [
    'crash',
    'collision',
    'accident',
    'car',
    'motorcycle',
    'bike',
    'vehicle',
    'hit',
    'road',
    'trapped',
    'vehicle accident',
  ],
  TOXIC: [
    'gas',
    'chemical',
    'poison',
    'toxic',
    'hazmat',
    'spill',
    'leak',
    'radiation',
    'contamination',
    'toxic gas',
  ],
  UTILITY: [
    'power outage',
    'electricity',
    'gas outage',
    'water',
    'pipe burst',
    'electric shock',
    'electrical hazard',
  ],
  NON_EMERGENCY: [
    'information',
    'question',
    'lost',
    'cat',
    'dog',
    'pet',
    'complaint',
    'feedback',
  ],
  ACCIDENT: [],
  UNKNOWN: [],
}

/**
 * Classify emergency intent from text
 * Uses Groq AI for primary classification with keyword fallback
 * @param text - Caller's description or call transcript
 * @returns Intent classification result
 */
export async function classifyEmergencyIntent(text: string): Promise<IntentResult> {
  if (!text || text.trim().length === 0) {
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      reasoning: 'No information provided',
      keywords: [],
      suggestedResources: [],
      priority: 'high',
    }
  }

  try {
    // Use Groq for AI-based classification
    const groqResult = await groqClassifyIntent(text)

    const intent = (groqResult.intent as EmergencyIntent) || 'UNKNOWN'
    const keywords = extractKeywords(text, intent)
    const suggestedResources = getResourcesForIntent(intent)
    const priority = getPriorityForIntent(intent, groqResult.confidence)

    return {
      intent,
      confidence: groqResult.confidence,
      reasoning: groqResult.reasoning,
      keywords,
      suggestedResources,
      priority,
    }
  } catch (error) {
    console.error('Groq classification error:', error)
    // Fallback to keyword-based classification
    return classifyIntentKeywords(text)
  }
}

/**
 * Keyword-based intent classification (fallback)
 * Useful for offline mode or when Groq is unavailable
 */
export function classifyIntentKeywords(text: string): IntentResult {
  const lowerText = text.toLowerCase()
  const matches: Record<EmergencyIntent, number> = {
    MEDICAL: 0,
    FIRE: 0,
    POLICE: 0,
    ACCIDENT: 0,
    TOXIC: 0,
    UTILITY: 0,
    NON_EMERGENCY: 0,
    UNKNOWN: 0,
  }

  // Count keyword matches
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        matches[intent as EmergencyIntent]++
      }
    }
  }

  // Find best match
  let bestIntent: EmergencyIntent = 'UNKNOWN'
  let bestScore = 0

  for (const [intent, score] of Object.entries(matches)) {
    if (score > bestScore) {
      bestScore = score
      bestIntent = intent as EmergencyIntent
    }
  }

  // Calculate confidence based on match count
  const totalText = text.split(/\s+/).length
  const confidence = Math.min((bestScore / (totalText / 10)) * 100, 100)

  const keywords = extractKeywords(text, bestIntent)
  const suggestedResources = getResourcesForIntent(bestIntent)
  const priority = getPriorityForIntent(bestIntent, confidence)

  return {
    intent: bestIntent || 'UNKNOWN',
    confidence: Math.max(confidence, 0),
    reasoning: `Keyword-based classification: Found ${bestScore} relevant keywords for ${bestIntent}`,
    keywords,
    suggestedResources,
    priority,
  }
}

/**
 * Extract relevant keywords from text
 */
function extractKeywords(text: string, intent: EmergencyIntent): string[] {
  const lowerText = text.toLowerCase()
  const keywords = INTENT_KEYWORDS[intent] || []

  return keywords.filter(kw => lowerText.includes(kw))
}

/**
 * Get suggested resources based on intent
 */
function getResourcesForIntent(intent: EmergencyIntent): string[] {
  const resourceMap: Record<EmergencyIntent, string[]> = {
    MEDICAL: ['Ambulance (108)', 'Nearest Hospital', 'Emergency Medicine'],
    FIRE: ['Fire Brigade (101)', 'Fire Extinguisher', 'Evacuation Routes'],
    POLICE: ['Police (100)', 'Local Police Station', 'Nearest Police Patrol'],
    ACCIDENT: ['Ambulance (108)', 'Police', 'Traffic Control'],
    TOXIC: ['HAZMAT Team', 'Environmental Protection', 'Hospital ICCU'],
    UTILITY: ['Municipal Authorities', 'Electricity Board', 'Gas Authority'],
    NON_EMERGENCY: ['Information Center', 'Public Services'],
    UNKNOWN: ['Emergency Services (112)'],
  }

  return resourceMap[intent] || ['Emergency Services (112)']
}

/**
 * Determine priority level based on intent
 */
function getPriorityForIntent(
  intent: EmergencyIntent,
  confidence: number
): 'low' | 'medium' | 'high' | 'critical' {
  // Base priority by intent
  const basePriority: Record<EmergencyIntent, 'low' | 'medium' | 'high' | 'critical'> = {
    MEDICAL: 'critical',
    FIRE: 'critical',
    POLICE: 'high',
    ACCIDENT: 'critical',
    TOXIC: 'critical',
    UTILITY: 'medium',
    NON_EMERGENCY: 'low',
    UNKNOWN: 'high',
  }

  // Boost priority if high confidence, reduce if low confidence
  const priority = basePriority[intent]
  if (confidence < 50) {
    // Low confidence should escalate to higher priority for safety
    if (priority === 'low') return 'medium'
    if (priority === 'medium') return 'high'
    if (priority === 'high') return 'high' // Keep high
  }

  return priority
}

/**
 * Format intent for display
 */
export function formatIntent(intent: EmergencyIntent): string {
  const displayNames: Record<EmergencyIntent, string> = {
    MEDICAL: 'Medical Emergency',
    FIRE: 'Fire/Hazard',
    POLICE: 'Police/Crime',
    ACCIDENT: 'Accident/Collision',
    TOXIC: 'Toxic/Hazmat',
    UTILITY: 'Utility Issue',
    NON_EMERGENCY: 'Non-Emergency',
    UNKNOWN: 'Unknown',
  }

  return displayNames[intent]
}

/**
 * Get emoji for intent (for UI display)
 */
export function getIntentEmoji(intent: EmergencyIntent): string {
  const emojiMap: Record<EmergencyIntent, string> = {
    MEDICAL: '🏥',
    FIRE: '🔥',
    POLICE: '🚓',
    ACCIDENT: '🚗',
    TOXIC: '☠️',
    UTILITY: '⚡',
    NON_EMERGENCY: 'ℹ️',
    UNKNOWN: '❓',
  }

  return emojiMap[intent]
}

/**
 * Validate intent result confidence
 */
export function isConfidentEnough(result: IntentResult, threshold: number = 60): boolean {
  return result.confidence >= threshold
}

/**
 * Merge multiple intent results (useful for multi-turn classification)
 */
export function mergeIntentResults(results: IntentResult[]): IntentResult {
  if (results.length === 0) {
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      reasoning: 'No results to merge',
      keywords: [],
      suggestedResources: [],
      priority: 'high',
    }
  }

  if (results.length === 1) return results[0]

  // Average confidence, combine keywords, find most common intent
  const intents = results.map(r => r.intent)
  const mostCommonIntent = getMostFrequent(intents) as EmergencyIntent
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length
  const allKeywords = [...new Set(results.flatMap(r => r.keywords))]

  return {
    intent: mostCommonIntent,
    confidence: avgConfidence,
    reasoning: `Merged ${results.length} classification results`,
    keywords: allKeywords,
    suggestedResources: getResourcesForIntent(mostCommonIntent),
    priority: getPriorityForIntent(mostCommonIntent, avgConfidence),
  }
}

function getMostFrequent<T>(arr: T[]): T {
  const counts = new Map<T, number>()
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1)
  }
  let max = 0
  let mostFrequent = arr[0]
  for (const [item, count] of counts) {
    if (count > max) {
      max = count
      mostFrequent = item
    }
  }
  return mostFrequent
}

export default {
  classifyEmergencyIntent,
  classifyIntentKeywords,
  formatIntent,
  getIntentEmoji,
  isConfidentEnough,
  mergeIntentResults,
}
