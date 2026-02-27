/**
 * Natural Language Command Service (TIER 3 - O8)
 * Parses and executes natural language operator commands
 */

export interface ParsedCommand {
  intent: 'query' | 'action' | 'control' | 'escalate' | 'note' | 'unknown'
  action: string
  parameters: Record<string, string | number | boolean>
  confidence: number // 0-100
  reasoning: string
  suggestedExecution: string
  fallback?: string
}

export interface CommandResult {
  command: ParsedCommand
  executed: boolean
  executionStatus: 'success' | 'partial' | 'failed'
  result: string
  timestamp: number
  executedBy: string
  auditLog?: string
}

const commandHistory: Map<string, CommandResult[]> = new Map()
const actionRegistry = new Map<string, (params: any) => Promise<string>>()

// Common command patterns
const commandPatterns = {
  escalate: /escalat|elevate|upgrade|promote/i,
  query: /what|tell|show|display|get|check|status|information/i,
  note: /note|add|document|record|log|remember/i,
  control: /set|change|update|modify|toggle|enable|disable|activate|deactivate/i,
  alert: /alert|notify|inform|warn|critical|emergency/i,
  medic: /doctor|physician|paramedic|specialist|medication|treat/i,
  location: /location|where|address|position|coordinates/i,
  severity: /severity|urgent|priority|life.?threat|critical/i,
  victim: /victim|patient|person|individual|casualty|injured/i,
  action: /send|dispatch|call|activate|respond|arrive|go|proceed/i,
}

export const NaturalLanguageCommandService = {
  /**
   * Register custom action handler
   */
  registerAction(
    actionName: string,
    handler: (params: any) => Promise<string>
  ): void {
    actionRegistry.set(actionName, handler)
  },

  /**
   * Parse natural language command
   */
  parseCommand(rawCommand: string): ParsedCommand {
    const normalized = rawCommand.toLowerCase().trim()

    // Determine intent
    let intent: ParsedCommand['intent'] = 'unknown'
    let confidence = 0
    let matchedPatterns: string[] = []

    // Match against patterns
    for (const [pattern, regex] of Object.entries(commandPatterns)) {
      if (regex.test(normalized)) {
        matchedPatterns.push(pattern)
      }
    }

    // Determine primary intent
    if (matchedPatterns.includes('escalate')) {
      intent = 'escalate'
      confidence = 95
    } else if (matchedPatterns.includes('query') || matchedPatterns.includes('severity')) {
      intent = 'query'
      confidence = 85
    } else if (matchedPatterns.includes('note')) {
      intent = 'note'
      confidence = 90
    } else if (matchedPatterns.includes('control')) {
      intent = 'control'
      confidence = 85
    } else if (matchedPatterns.includes('action')) {
      intent = 'action'
      confidence = 90
    } else if (matchedPatterns.includes('alert')) {
      intent = 'escalate'
      confidence = 88
    }

    // Extract parameters
    const parameters = this.extractParameters(normalized, matchedPatterns)

    // Get suggested execution
    const suggestedExecution = this.generateExecution(intent, parameters, normalized)

    // Generate reasoning
    const reasoning = this.generateReasoning(intent, matchedPatterns, confidence)

    return {
      intent,
      action: this.determineAction(intent, parameters, normalized),
      parameters,
      confidence,
      reasoning,
      suggestedExecution,
      fallback: this.generateFallback(intent, normalized),
    }
  },

  /**
   * Extract parameters from command
   */
  private extractParameters(
    command: string,
    patterns: string[]
  ): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {}

    // Extract number patterns (severity levels, victim counts)
    const numberMatch = command.match(/\d+/)
    if (numberMatch) {
      params.value = parseInt(numberMatch[0])
    }

    // Extract severity
    if (command.includes('critical')) params.severity = 'critical'
    else if (command.includes('high') || command.includes('urgent')) params.severity = 'high'
    else if (command.includes('moderate') || command.includes('medium')) params.severity = 'moderate'
    else if (command.includes('low') || command.includes('minor')) params.severity = 'low'

    // Extract victim count
    if (command.includes('multiple') || command.includes('several')) params.victimCount = 'multiple'
    else if (command.includes('two') || command.includes('2')) params.victimCount = 2
    else if (command.includes('three') || command.includes('3')) params.victimCount = 3

    // Extract location indicators
    if (command.includes('building') || command.includes('structure')) params.locationType = 'building'
    if (command.includes('highway') || command.includes('road')) params.locationType = 'highway'
    if (command.includes('water') || command.includes('drowning')) params.locationType = 'water'

    // Extract action types
    if (command.includes('fire')) params.teamType = 'fire'
    if (command.includes('police')) params.teamType = 'police'
    if (command.includes('hazmat')) params.teamType = 'hazmat'

    // Extract boolean flags
    params.isUrgent = command.includes('urgent') || command.includes('critical')
    params.needsSpecialist = command.includes('specialist') || command.includes('doctor')

    return params
  },

  /**
   * Determine action from intent and parameters
   */
  private determineAction(
    intent: ParsedCommand['intent'],
    parameters: Record<string, any>,
    command: string
  ): string {
    switch (intent) {
      case 'escalate':
        return 'escalate_severity'
      case 'query':
        return 'get_status'
      case 'note':
        return 'add_note'
      case 'control':
        return this.determineControlAction(command)
      case 'action':
        return this.determineDispatchAction(parameters)
      default:
        return 'unknown'
    }
  },

  /**
   * Determine control-type action
   */
  private determineControlAction(command: string): string {
    if (command.includes('autonomous') || command.includes('auto')) return 'toggle_autonomous_mode'
    if (command.includes('alarm') || command.includes('sound')) return 'toggle_alarm'
    if (command.includes('conference') || command.includes('add')) return 'conference_call'
    return 'unknown_control'
  },

  /**
   * Determine dispatch-type action
   */
  private determineDispatchAction(params: Record<string, any>): string {
    if (params.teamType === 'fire') return 'dispatch_fire'
    if (params.teamType === 'police') return 'dispatch_police'
    if (params.teamType === 'hazmat') return 'dispatch_hazmat'
    return 'dispatch_ambulance'
  },

  /**
   * Generate execution instruction
   */
  private generateExecution(
    intent: ParsedCommand['intent'],
    parameters: Record<string, any>,
    command: string
  ): string {
    if (intent === 'escalate') {
      return `Escalate case severity to ${parameters.severity || 'HIGH'}. Notify senior operator. Prepare additional resources.`
    } else if (intent === 'query') {
      return 'Display current case status and timeline'
    } else if (intent === 'note') {
      return `Add note to case file: "${command}"`
    } else if (intent === 'control') {
      return `Execute control command: ${command}`
    } else if (intent === 'action') {
      const team = parameters.teamType ? `${parameters.teamType} ` : ''
      return `Dispatch ${team}team to incident location`
    }
    return 'Unable to determine execution'
  },

  /**
   * Generate reasoning for parsing
   */
  private generateReasoning(intent: string, patterns: string[], confidence: number): string {
    const reasons: string[] = []

    if (patterns.includes('escalate')) {
      reasons.push('Escalation keywords detected')
    }
    if (patterns.includes('query')) {
      reasons.push('Information request detected')
    }
    if (patterns.includes('action')) {
      reasons.push('Dispatch/action keywords detected')
    }

    if (confidence >= 90) {
      reasons.push('High confidence match')
    } else if (confidence >= 75) {
      reasons.push('Moderate confidence match')
    }

    return reasons.join(' • ')
  },

  /**
   * Generate fallback command
   */
  private generateFallback(intent: string, command: string): string {
    switch (intent) {
      case 'escalate':
        return 'If auto-escalation fails, manually press ESCALATE button'
      case 'query':
        return 'If command fails, check Dashboard tab for current status'
      case 'note':
        return 'If command fails, manually add note via Notes panel'
      case 'action':
        return 'If dispatch fails, manually select facility and dispatch'
      default:
        return 'If command fails, consult operator manual'
    }
  },

  /**
   * Execute a parsed command
   */
  async executeCommand(
    callId: string,
    parsed: ParsedCommand,
    executedBy: string = 'OPERATOR'
  ): Promise<CommandResult> {
    const timestamp = Date.now()
    let executionStatus: CommandResult['executionStatus'] = 'success'
    let result = ''

    try {
      // Check if action is registered
      const handler = actionRegistry.get(parsed.action)
      if (handler) {
        result = await handler(parsed.parameters)
      } else {
        result = `Action '${parsed.action}' would be executed with parameters: ${JSON.stringify(parsed.parameters)}`
      }
    } catch (error) {
      executionStatus = 'failed'
      result = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    const commandResult: CommandResult = {
      command: parsed,
      executed: executionStatus !== 'failed',
      executionStatus,
      result,
      timestamp,
      executedBy,
      auditLog: this.generateAuditLog(parsed, executionStatus, executedBy),
    }

    // Store in history
    const history = commandHistory.get(callId) || []
    history.push(commandResult)
    commandHistory.set(callId, history)

    return commandResult
  },

  /**
   * Generate audit log entry
   */
  private generateAuditLog(
    parsed: ParsedCommand,
    status: string,
    executedBy: string
  ): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] ${executedBy} executed: ${parsed.action} (Intent: ${parsed.intent}, Status: ${status})`
  },

  /**
   * Get command history for a call
   */
  getCommandHistory(callId: string): CommandResult[] {
    return commandHistory.get(callId) || []
  },

  /**
   * Get command statistics
   */
  getCommandStats(callId: string): {
    totalCommands: number
    successRate: number
    commonIntents: Record<string, number>
    averageConfidence: number
  } {
    const history = commandHistory.get(callId) || []

    const successCount = history.filter((c) => c.executionStatus === 'success').length
    const intents: Record<string, number> = {}
    let totalConfidence = 0

    history.forEach((result) => {
      const intent = result.command.intent
      intents[intent] = (intents[intent] || 0) + 1
      totalConfidence += result.command.confidence
    })

    return {
      totalCommands: history.length,
      successRate: history.length > 0 ? Math.round((successCount / history.length) * 100) : 0,
      commonIntents: intents,
      averageConfidence: history.length > 0 ? Math.round(totalConfidence / history.length) : 0,
    }
  },

  /**
   * Validate command before execution
   */
  validateCommand(parsed: ParsedCommand): {
    isValid: boolean
    warnings: string[]
    requiresConfirmation: boolean
  } {
    const warnings: string[] = []
    let requiresConfirmation = false

    // Low confidence warning
    if (parsed.confidence < 60) {
      warnings.push('⚠️ Low confidence in command parsing')
      requiresConfirmation = true
    }

    // Escalation requires confirmation
    if (parsed.intent === 'escalate') {
      warnings.push('⚠️ Escalation action - requires confirmation')
      requiresConfirmation = true
    }

    // Dispatch action requires confirmation
    if (parsed.action.includes('dispatch')) {
      warnings.push('⚠️ Dispatch action - verify location before confirming')
      requiresConfirmation = true
    }

    return {
      isValid: parsed.intent !== 'unknown',
      warnings,
      requiresConfirmation,
    }
  },

  /**
   * Clear command history
   */
  clearHistory(callId: string): void {
    commandHistory.delete(callId)
  },

  /**
   * Suggest next command
   */
  suggestNextCommand(callId: string, currentContext: any): string[] {
    const suggestions: string[] = []

    if (currentContext.severity > 80) {
      suggestions.push('Consider: "Escalate to critical"')
    }

    if (currentContext.victimCount > 1) {
      suggestions.push('Consider: "Dispatch additional ambulances"')
    }

    if (!currentContext.hasSpecialist && currentContext.needsSpecialist) {
      suggestions.push('Consider: "Request specialist on-site"')
    }

    if (currentContext.timeSinceDispatch > 10) {
      suggestions.push('Consider: "Check dispatch ETA"')
    }

    return suggestions
  },
}
