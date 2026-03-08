// Groq AI client wrapper
// Handles all interactions with Groq API for embeddings, classifications, and responses

import Groq from 'groq-sdk'

const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface GroqAnalysisResult {
  content: string
  stop_reason: string
  tokens: {
    input: number
    output: number
  }
}

export interface GroqEmbedding {
  vector: number[]
  token_count: number
}

// Core text completion - used for intent classification, sentiment analysis, etc.
export async function groqComplete(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'mixtral-8x7b-32768',
  maxTokens: number = 1024,
  temperature: number = 0.3
): Promise<GroqAnalysisResult> {
  try {
    const response = await groqClient.chat.completions.create({
      messages,
      model,
      max_tokens: maxTokens,
      temperature,
    })

    const content = response.choices[0]?.message?.content || ''
    return {
      content,
      stop_reason: response.choices[0]?.finish_reason || 'stop',
      tokens: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
      },
    }
  } catch (error) {
    console.error('Groq completion error:', error)
    throw error
  }
}

// Intent classification - identify emergency type (Medical, Fire, Police, Accident, etc.)
export async function classifyIntent(text: string): Promise<{
  intent: string
  confidence: number
  reasoning: string
}> {
  const response = await groqComplete([
    {
      role: 'system',
      content: `You are an emergency call classifier. Analyze the text and identify the emergency type.
      
      Return ONLY a JSON object with:
      {
        "intent": "MEDICAL|FIRE|POLICE|ACCIDENT|TOXIC|UTILITY|NON_EMERGENCY",
        "confidence": <number 0-100>,
        "reasoning": "<brief explanation>"
      }
      
      Rules:
      - Medical: symptoms, illness, injuries, health issues
      - Fire: burning, smoke, explosion, fire hazard
      - Police: crime, theft, assault, violence, disturbance
      - Accident: collision, crash, vehicle accident
      - Toxic: gas leak, chemical spill, poisoning
      - Utility: power outage, water issue, infrastructure
      - Non-emergency: not urgent, administrative`,
    },
    {
      role: 'user',
      content: `Classify this emergency call: "${text}"`,
    },
  ])

  try {
    const parsed = JSON.parse(response.content)
    return {
      intent: parsed.intent,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    }
  } catch {
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      reasoning: 'Failed to parse classification',
    }
  }
}

// Sentiment/stress level analysis
export async function analyzeSentiment(text: string): Promise<{
  stressLevel: 'calm' | 'stressed' | 'panic'
  confidence: number
  percentage: number
  reasoning: string
}> {
  const response = await groqComplete([
    {
      role: 'system',
      content: `Analyze the emotional state and stress level from emergency call text.
      
      Return ONLY a JSON object with:
      {
        "stressLevel": "calm|stressed|panic",
        "confidence": <number 0-100>,
        "percentage": <number 0-100>,
        "reasoning": "<brief explanation>"
      }
      
      Guidelines:
      - calm: composed, coherent, clear thinking (0-30%)
      - stressed: anxious, worried, fast speech (30-70%)
      - panic: panicked, hysterical, unclear (70-100%)`,
    },
    {
      role: 'user',
      content: `Analyze caller stress: "${text}"`,
    },
  ])

  try {
    const parsed = JSON.parse(response.content)
    return {
      stressLevel: parsed.stressLevel,
      confidence: parsed.confidence,
      percentage: parsed.percentage,
      reasoning: parsed.reasoning,
    }
  } catch {
    return {
      stressLevel: 'calm',
      confidence: 0,
      percentage: 50,
      reasoning: 'Unable to analyze sentiment',
    }
  }
}

// Extract emergency information from text
export async function extractEmergencyInfo(text: string): Promise<{
  location: string
  callerName: string
  age: string
  emergencyType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}> {
  const response = await groqComplete([
    {
      role: 'system',
      content: `Extract emergency information from call text.
      
      Return ONLY a JSON object:
      {
        "location": "<extracted location or 'unknown'>",
        "callerName": "<name or 'unknown'>",
        "age": "<age number or 'unknown'>",
        "emergencyType": "<MEDICAL|FIRE|POLICE|ACCIDENT|TOXIC|UTILITY>",
        "severity": "low|medium|high|critical",
        "description": "<brief summary of emergency>"
      }
      
      Severity rules:
      - critical: life-threatening, unconscious, severe bleeding
      - high: serious but stable, conscious, significant injury
      - medium: moderate concern, stable condition
      - low: minor issue, no immediate danger`,
    },
    {
      role: 'user',
      content: `Extract info from: "${text}"`,
    },
  ])

  try {
    const parsed = JSON.parse(response.content)
    return {
      location: parsed.location || 'unknown',
      callerName: parsed.callerName || 'unknown',
      age: parsed.age || 'unknown',
      emergencyType: parsed.emergencyType || 'UNKNOWN',
      severity: parsed.severity || 'medium',
      description: parsed.description || text.substring(0, 100),
    }
  } catch {
    return {
      location: 'unknown',
      callerName: 'unknown',
      age: 'unknown',
      emergencyType: 'UNKNOWN',
      severity: 'medium',
      description: text.substring(0, 100),
    }
  }
}

// Match keywords to protocols
export async function matchProtocol(emergencyType: string, description: string): Promise<{
  protocolName: string
  relevance: number
  suggestedActions: string[]
}> {
  const response = await groqComplete([
    {
      role: 'system',
      content: `Match emergency to response protocols.
      
      Return ONLY JSON:
      {
        "protocolName": "<best matching protocol>",
        "relevance": <0-100>,
        "suggestedActions": ["<action 1>", "<action 2>", "<action 3>"]
      }
      
      Common protocols:
      - CPR Protocol: cardiac arrest, unconscious, no pulse
      - Severe Bleeding Control: heavy bleeding, wounds
      - Fracture Management: broken bones, sprains
      - Burn Treatment: burns, chemical burns
      - Fire Containment: structure fire, extraction needed
      - Police Response: crime scene, suspect present
      - Utility Hazard: gas/power leak, downed wires`,
    },
    {
      role: 'user',
      content: `Match protocol for ${emergencyType}: "${description}"`,
    },
  ])

  try {
    const parsed = JSON.parse(response.content)
    return {
      protocolName: parsed.protocolName || 'Standard Response',
      relevance: parsed.relevance || 50,
      suggestedActions: parsed.suggestedActions || [],
    }
  } catch {
    return {
      protocolName: 'Standard Response',
      relevance: 0,
      suggestedActions: [],
    }
  }
}

// Generate confidence score explanation
export async function generateConfidenceExplanation(
  intent: string,
  confidence: number,
  emergencyInfo: string
): Promise<{
  shouldAutoDispatch: boolean
  shouldEscalate: boolean
  reason: string
  recommendation: string
}> {
  const response = await groqComplete([
    {
      role: 'system',
      content: `Analyze confidence in emergency classification.
      
      Return ONLY JSON:
      {
        "shouldAutoDispatch": <boolean>,
        "shouldEscalate": <boolean>,
        "reason": "<explanation>",
        "recommendation": "<next action>"
      }
      
      Rules:
      - confidence < 60%: escalate to human operator
      - 60-85%: AI assisted dispatch (operator reviews)
      - > 85%: can auto-dispatch with caution
      - Critical emergencies (life-threatening): always human review`,
    },
    {
      role: 'user',
      content: `Intent: ${intent}, Confidence: ${confidence}%, Info: "${emergencyInfo}"`,
    },
  ])

  try {
    const parsed = JSON.parse(response.content)
    return {
      shouldAutoDispatch: parsed.shouldAutoDispatch || false,
      shouldEscalate: parsed.shouldEscalate || true,
      reason: parsed.reason || 'Unable to determine',
      recommendation: parsed.recommendation || 'Escalate to human operator',
    }
  } catch {
    return {
      shouldAutoDispatch: false,
      shouldEscalate: true,
      reason: 'Parse error in confidence analysis',
      recommendation: 'Escalate to human operator',
    }
  }
}

/**
 * Stream-based completion for real-time responses (for voice feedback)
 */
export async function groqCompleteStream(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  onChunk: (chunk: string) => void,
  model: string = 'mixtral-8x7b-32768'
): Promise<void> {
  try {
    const stream = await groqClient.chat.completions.create({
      messages,
      model,
      max_tokens: 512,
      temperature: 0.3,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        onChunk(content)
      }
    }
  } catch (error) {
    console.error('Groq stream error:', error)
    throw error
  }
}

export default groqClient
