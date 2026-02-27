/**
 * NATURAL LANGUAGE PROCESSING - PRODUCTION
 * Real intent detection, parameter extraction, command execution
 * Uses pattern matching + Groq AI for fallback
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export type IntentType = 'QUERY' | 'ACTION' | 'CONTROL' | 'ESCALATE' | 'NOTE' | 'UNKNOWN'

export interface ParsedCommand {
  raw_input: string
  intent: IntentType
  confidence: number
  action: string
  parameters: Record<string, any>
  normalized_text: string
  reasoning: string
  suggested_execution: string
  tags: string[]
}

export interface NLPResult {
  command: ParsedCommand
  execution_plan: {
    steps: string[]
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    estimated_execution_time_ms: number
  }
  audit_log: {
    parsed_at: number
    parser_version: string
    model_used: string
  }
  inference_time_ms: number
}

// ============================================
// INTENT PATTERNS
// ============================================

const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  ESCALATE: [
    /^(escalate|escalated|escalating|needs? escalation|critical|emergency)/i,
    /(escalate|transfer|need|supervisor|manager|senior)/i,
    /^(help|mayday|sos|code|red alert)/i,
  ],
  ACTION: [
    /^(send|dispatch|call|activate|initiate|start)/i,
    /(ambulance|fire|police|hazmat|rescue)/i,
    /^(go to|head to|send (to|to the))/i,
  ],
  CONTROL: [
    /^(turn|enable|disable|activate|deactivate|switch)/i,
    /(autonomous|manual|mode|toggle|set)/i,
  ],
  QUERY: [
    /^(what|where|when|who|how|is|are|can|could)/i,
    /(status|situation|condition|status of|whats)/i,
  ],
  NOTE: [
    /^(note|add note|document|mark|record|add)/i,
    /(remember|log|make note|add to)/i,
  ],
  UNKNOWN: [],
}

const ACTION_KEYWORDS: Record<string, string[]> = {
  dispatch: ['send', 'dispatch', 'call', 'activate', 'notify'],
  location: ['go to', 'head to', 'location', 'address', 'route'],
  escalate: ['escalate', 'supervisor', 'senior', 'expert'],
  monitor: ['monitor', 'watch', 'track', 'observe'],
  transfer: ['transfer', 'handoff', 'pass'],
}

// ============================================
// INTENT CLASSIFIER
// ============================================

export class NLPCommandParser {
  private genAI: GoogleGenerativeAI | null = null

  constructor(googleApiKey?: string) {
    if (googleApiKey) {
      this.genAI = new GoogleGenerativeAI(googleApiKey)
    }
  }

  async parseCommand(rawInput: string): Promise<NLPResult> {
    const startTime = Date.now()

    // Step 1: Normalize input
    const normalized = this.normalizeText(rawInput)

    // Step 2: Detect intent (fast pattern matching)
    const { intent, confidence: patternConfidence } = this.detectIntentPatterns(normalized)

    // Step 3: Extract parameters
    const parameters = this.extractParameters(normalized)

    // Step 4: Generate action
    const action = this.generateAction(intent, parameters)

    // Step 5: Create command object
    const command: ParsedCommand = {
      raw_input: rawInput,
      intent,
      confidence: patternConfidence,
      action,
      parameters,
      normalized_text: normalized,
      reasoning: this.generateReasoning(intent, parameters),
      suggested_execution: this.generateSuggestedExecution(intent, action, parameters),
      tags: this.generateTags(intent, parameters),
    }

    // Step 6: Enhance with Groq if low confidence
    if (patternConfidence < 0.7 && this.genAI) {
      const enhanced = await this.enhanceWithGroq(rawInput, command)
      Object.assign(command, enhanced)
    }

    // Step 7: Create execution plan
    const executionPlan = this.createExecutionPlan(command)

    return {
      command,
      execution_plan: executionPlan,
      audit_log: {
        parsed_at: Date.now(),
        parser_version: '2.0-production',
        model_used: patternConfidence < 0.7 ? 'groq-enhanced' : 'pattern-matching',
      },
      inference_time_ms: Date.now() - startTime,
    }
  }

  // ===== PRIVATE METHODS =====

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[!?]+$/, '') // Remove trailing punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
  }

  private detectIntentPatterns(text: string): { intent: IntentType; confidence: number } {
    const scores: Record<IntentType, number> = {
      ESCALATE: 0,
      ACTION: 0,
      CONTROL: 0,
      QUERY: 0,
      NOTE: 0,
      UNKNOWN: 0,
    }

    // Score each intent based on pattern matches
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          scores[intent as IntentType] += 1
        }
      }
    }

    // Find intent with highest score
    const topIntentEntry = Object.entries(scores).sort(([, a], [, b]) => b - a)[0]
    const intent = (topIntentEntry?.[0] as IntentType) || 'UNKNOWN'
    const maxScore = topIntentEntry?.[1] || 0
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)

    // Calculate confidence (0-1)
    const confidence = totalScore > 0 ? maxScore / totalScore : 0.3

    return { intent, confidence: Math.min(1, confidence) }
  }

  private extractParameters(text: string): Record<string, any> {
    const params: Record<string, any> = {}

    // Extract numbers (could be counts, times, distances)
    const numbers = text.match(/\b\d+\b/g)
    if (numbers) {
      params.numbers = numbers.map(Number)
    }

    // Extract locations (simple heuristic)
    if (text.includes('hospital')) params.facility_type = 'hospital'
    if (text.includes('fire')) params.facility_type = 'fire_station'
    if (text.includes('police')) params.facility_type = 'police'

    // Extract severity
    if (text.includes('critical') || text.includes('severe')) params.severity = 'CRITICAL'
    else if (text.includes('urgent')) params.severity = 'HIGH'
    else if (text.includes('routine')) params.severity = 'LOW'

    // Extract resource type
    if (text.includes('ambulance')) params.resource = 'ambulance'
    if (text.includes('fire truck') || text.includes('fire engine')) params.resource = 'fire'
    if (text.includes('police')) params.resource = 'police'

    // Extract time references
    if (text.includes('now') || text.includes('immediately')) params.priority = 'IMMEDIATE'

    return params
  }

  private generateAction(intent: IntentType, parameters: Record<string, any>): string {
    switch (intent) {
      case 'ACTION':
        if (parameters.resource === 'ambulance') return 'DISPATCH_AMBULANCE'
        if (parameters.resource === 'fire') return 'DISPATCH_FIRE'
        if (parameters.resource === 'police') return 'DISPATCH_POLICE'
        return 'DISPATCH_ALL'

      case 'ESCALATE':
        return 'ESCALATE_TO_SUPERVISOR'

      case 'CONTROL':
        return 'TOGGLE_AUTONOMOUS_MODE'

      case 'NOTE':
        return 'ADD_CASE_NOTE'

      case 'QUERY':
        return 'QUERY_SYSTEM_STATUS'

      default:
        return 'UNKNOWN_ACTION'
    }
  }

  private generateReasoning(intent: IntentType, parameters: Record<string, any>): string {
    const reasons: string[] = []

    if (intent === 'ESCALATE') {
      reasons.push('Escalation requested - severity high')
    }
    if (intent === 'ACTION') {
      if (parameters.resource) {
        reasons.push(`Dispatch requested for: ${parameters.resource}`)
      }
      reasons.push('Action parameters extracted')
    }
    if (parameters.severity === 'CRITICAL') {
      reasons.push('Critical severity detected')
    }
    if (parameters.priority === 'IMMEDIATE') {
      reasons.push('Immediate execution requested')
    }

    return reasons.join('; ')
  }

  private generateSuggestedExecution(
    intent: IntentType,
    action: string,
    parameters: Record<string, any>
  ): string {
    switch (action) {
      case 'DISPATCH_AMBULANCE':
        return '📞 Dispatching ambulance to incident location'
      case 'DISPATCH_ALL':
        return '📞 Dispatching ambulance + fire + police to incident location'
      case 'ESCALATE_TO_SUPERVISOR':
        return '📞 Calling supervisor for case review'
      case 'TOGGLE_AUTONOMOUS_MODE':
        return '⚙️ Toggling autonomous mode'
      case 'ADD_CASE_NOTE':
        return '📝 Adding note to case file'
      case 'QUERY_SYSTEM_STATUS':
        return '📊 Retrieving system status'
      default:
        return '❓ Action pending clarification'
    }
  }

  private generateTags(intent: IntentType, parameters: Record<string, any>): string[] {
    const tags = [intent.toLowerCase()]

    if (parameters.severity) tags.push(`severity:${parameters.severity.toLowerCase()}`)
    if (parameters.resource) tags.push(parameters.resource)
    if (parameters.priority === 'IMMEDIATE') tags.push('urgent')

    return tags
  }

  private async enhanceWithGroq(rawInput: string, command: ParsedCommand): Promise<Partial<ParsedCommand>> {
    if (!this.genAI) return {}

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const prompt = `Analyze this emergency dispatcher command and improve the intent detection.

Command: "${rawInput}"

Current parse: 
- Intent: ${command.intent}
- Confidence: ${command.confidence}
- Action: ${command.action}

Respond as JSON only with:
{
  "correct_intent": "ESCALATE|ACTION|CONTROL|QUERY|NOTE|UNKNOWN",
  "confidence_adjustment": number 0-1,
  "improved_reasoning": "string"
}`

      const result = await model.generateContent(prompt)
      const response = result.response.text()

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return {}

      const parsed = JSON.parse(jsonMatch[0])

      return {
        intent: parsed.correct_intent || command.intent,
        confidence: parsed.confidence_adjustment || command.confidence,
        reasoning: parsed.improved_reasoning || command.reasoning,
      }
    } catch (error) {
      console.error('Groq enhancement error:', error)
      return {}
    }
  }

  private createExecutionPlan(command: ParsedCommand) {
    const steps: string[] = []
    const priorityMap: Record<IntentType, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
      ESCALATE: 'CRITICAL',
      ACTION: 'HIGH',
      CONTROL: 'MEDIUM',
      NOTE: 'LOW',
      QUERY: 'LOW',
      UNKNOWN: 'MEDIUM',
    }

    switch (command.action) {
      case 'DISPATCH_AMBULANCE':
        steps.push('1. Verify incident location')
        steps.push('2. Check nearest ambulance availability')
        steps.push('3. Initiate dispatch')
        steps.push('4. Notify hospital')
        steps.push('5. Start monitoring')
        break

      case 'ESCALATE_TO_SUPERVISOR':
        steps.push('1. Alert supervisor')
        steps.push('2. Prepare case summary')
        steps.push('3. Transfer call')
        steps.push('4. Archive notes')
        break

      case 'ADD_CASE_NOTE':
        steps.push('1. Timestamp note')
        steps.push('2. Validate content')
        steps.push('3. Save to case file')
        break
    }

    return {
      steps,
      priority: priorityMap[command.intent],
      estimated_execution_time_ms: command.action === 'DISPATCH_AMBULANCE' ? 5000 : 2000,
    }
  }
}
