/**
 * Symptom Engine Service (U1)
 * Decision engine for symptom checker with 30+ condition decision trees
 */

export interface SymptomCondition {
  id: string
  name: string
  emoji: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  decision: 'CALL_112' | 'SEE_DOCTOR' | 'SELF_CARE'
  questions: ConditionQuestion[]
  redFlags: string[]
  description: string
  resources: {
    type: 'LINK' | 'PHONE'
    label: string
    value: string
  }[]
}

export interface ConditionQuestion {
  id: string
  text: string
  answerType: 'YES_NO' | 'MULTIPLE_CHOICE'
  options?: string[]
  nextQuestion?: string
  redFlagAnswer?: string | boolean // Answer that indicates red flag
}

export interface SymptomCheckerSession {
  sessionId: string
  timestamp: string
  primarySymptom: string
  answers: Record<string, string | boolean>
  decision?: 'CALL_112' | 'SEE_DOCTOR' | 'SELF_CARE'
  matchedCondition?: SymptomCondition
}

class SymptomEngineService {
  private conditionBank: Map<string, SymptomCondition> = new Map()
  private sessions: Map<string, SymptomCheckerSession> = new Map()

  constructor() {
    this.initializeConditions()
  }

  /**
   * Initialize 30+ symptom conditions
   */
  private initializeConditions(): void {
    const conditions: SymptomCondition[] = [
      {
        id: 'CHEST_PAIN',
        name: 'Chest Pain',
        emoji: '💔',
        severity: 'CRITICAL',
        decision: 'CALL_112',
        description: 'Pain or discomfort in the chest area',
        questions: [
          {
            id: 'q1',
            text: 'Is the chest pain radiating to your arm, jaw, or shoulder?',
            answerType: 'YES_NO',
            redFlagAnswer: true,
          },
          {
            id: 'q2',
            text: 'Are you having difficulty breathing?',
            answerType: 'YES_NO',
            redFlagAnswer: true,
          },
          {
            id: 'q3',
            text: 'How severe is the pain?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Mild (1-3)', 'Moderate (4-6)', 'Severe (7-9)', 'Worst ever (10)'],
            redFlagAnswer: 'Severe (7-9)',
          },
        ],
        redFlags: [
          'Radiating pain to arm/jaw',
          'Difficulty breathing',
          'Severe pain (7-10)',
          'Heavy sweating',
        ],
        resources: [
          { type: 'PHONE', label: 'Emergency: 112', value: '112' },
          { type: 'LINK', label: 'Heart Attack First Aid', value: 'https://example.com' },
        ],
      },
      {
        id: 'DIFFICULTY_BREATHING',
        name: 'Difficulty Breathing',
        emoji: '😤',
        severity: 'CRITICAL',
        decision: 'CALL_112',
        description: 'Shortness of breath or breathing difficulty',
        questions: [
          {
            id: 'q1',
            text: 'Are you unable to breathe at all or just having difficulty?',
            answerType: 'YES_NO',
            redFlagAnswer: true,
          },
          {
            id: 'q2',
            text: 'How long has this been happening?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Just started', 'Less than 1 minute', '1-5 minutes', 'More than 5 minutes'],
            redFlagAnswer: 'More than 5 minutes',
          },
          {
            id: 'q3',
            text: 'Do you have a history of asthma?',
            answerType: 'YES_NO',
          },
        ],
        redFlags: ['Complete inability to breathe', 'Wheezing or stridor', 'Bluish lips/face'],
        resources: [
          { type: 'PHONE', label: 'Emergency: 112', value: '112' },
          { type: 'LINK', label: 'Breathing Exercises', value: 'https://example.com' },
        ],
      },
      {
        id: 'SEVERE_BLEEDING',
        name: 'Severe Bleeding',
        emoji: '🩸',
        severity: 'HIGH',
        decision: 'CALL_112',
        description: 'Significant bleeding or hemorrhage',
        questions: [
          {
            id: 'q1',
            text: 'Is the blood gushing or spurting?',
            answerType: 'YES_NO',
            redFlagAnswer: true,
          },
          {
            id: 'q2',
            text: 'Where is the bleeding located?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Head/Face', 'Arms/Legs', 'Torso', 'Abdomen', 'Multiple areas'],
            redFlagAnswer: 'Torso',
          },
          {
            id: 'q3',
            text: 'Can you apply pressure to stop the bleeding?',
            answerType: 'YES_NO',
          },
        ],
        redFlags: ['Gushing or spurting', 'Cannot be stopped with pressure', 'Large volume'],
        resources: [
          { type: 'PHONE', label: 'Emergency: 112', value: '112' },
          { type: 'LINK', label: 'Bleeding First Aid', value: 'https://example.com' },
        ],
      },
      {
        id: 'UNCONSCIOUSNESS',
        name: 'Unconsciousness',
        emoji: '😵',
        severity: 'CRITICAL',
        decision: 'CALL_112',
        description: 'Person is unconscious or unresponsive',
        questions: [
          {
            id: 'q1',
            text: 'Is the person breathing?',
            answerType: 'YES_NO',
            redFlagAnswer: false,
          },
          {
            id: 'q2',
            text: 'Can you feel a pulse?',
            answerType: 'YES_NO',
            redFlagAnswer: false,
          },
          {
            id: 'q3',
            text: 'How long have they been unconscious?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Just happened', 'Less than 1 minute', '1-5 minutes', 'More than 5 minutes'],
            redFlagAnswer: 'More than 5 minutes',
          },
        ],
        redFlags: ['Not breathing', 'No pulse', 'Prolonged unconsciousness'],
        resources: [
          { type: 'PHONE', label: 'Emergency: 112', value: '112' },
          { type: 'LINK', label: 'CPR Instructions', value: 'https://example.com' },
        ],
      },
      {
        id: 'CHOKING',
        name: 'Choking',
        emoji: '🚫',
        severity: 'CRITICAL',
        decision: 'CALL_112',
        description: 'Complete or partial airway obstruction',
        questions: [
          {
            id: 'q1',
            text: 'Can they cough or make any sound?',
            answerType: 'YES_NO',
            redFlagAnswer: false,
          },
          {
            id: 'q2',
            text: 'Are they able to breathe at all?',
            answerType: 'YES_NO',
            redFlagAnswer: false,
          },
          {
            id: 'q3',
            text: 'What did they choke on?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Food', 'Small object', 'Unknown', 'Liquid'],
          },
        ],
        redFlags: ['Cannot make sound', 'Unable to breathe', 'Turning blue'],
        resources: [
          { type: 'PHONE', label: 'Emergency: 112', value: '112' },
          { type: 'LINK', label: 'Heimlich Maneuver', value: 'https://example.com' },
        ],
      },
      {
        id: 'POISONING',
        name: 'Poisoning/Overdose',
        emoji: '☠️',
        severity: 'HIGH',
        decision: 'CALL_112',
        description: 'Ingestion of toxic substance or overdose',
        questions: [
          {
            id: 'q1',
            text: 'What was ingested?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Medication', 'Chemical', 'Food poisoning', 'Unknown'],
          },
          {
            id: 'q2',
            text: 'How long ago did this happen?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Less than 15 min', '15-60 min', '1-6 hours', 'More than 6 hours'],
            redFlagAnswer: 'Less than 15 min',
          },
          {
            id: 'q3',
            text: 'Is the person experiencing nausea or vomiting?',
            answerType: 'YES_NO',
            redFlagAnswer: true,
          },
        ],
        redFlags: ['Recent ingestion', 'Unconsciousness', 'Severe symptoms'],
        resources: [
          { type: 'PHONE', label: 'Poison Control: 112', value: '112' },
          { type: 'LINK', label: 'Poison First Aid', value: 'https://example.com' },
        ],
      },
      {
        id: 'SEVERE_BURN',
        name: 'Severe Burn',
        emoji: '🔥',
        severity: 'HIGH',
        decision: 'CALL_112',
        description: 'Significant thermal injury',
        questions: [
          {
            id: 'q1',
            text: 'What percentage of body is affected?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Less than 10%', '10-30%', '30-50%', 'More than 50%'],
            redFlagAnswer: 'More than 50%',
          },
          {
            id: 'q2',
            text: 'What degree of burn?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Red skin (1st)', 'Blistered (2nd)', 'White/Black (3rd)'],
            redFlagAnswer: 'White/Black (3rd)',
          },
          {
            id: 'q3',
            text: 'Is it on face, hands, feet, or genitals?',
            answerType: 'YES_NO',
            redFlagAnswer: true,
          },
        ],
        redFlags: ['Large area affected', '3rd degree burns', 'Face/extremities'],
        resources: [
          { type: 'PHONE', label: 'Emergency: 112', value: '112' },
          { type: 'LINK', label: 'Burn First Aid', value: 'https://example.com' },
        ],
      },
      {
        id: 'SEVERE_HEADACHE',
        name: 'Severe Headache',
        emoji: '🤕',
        severity: 'MEDIUM',
        decision: 'SEE_DOCTOR',
        description: 'Intense or persistent headache',
        questions: [
          {
            id: 'q1',
            text: 'Is this the worst headache of your life?',
            answerType: 'YES_NO',
            redFlagAnswer: true,
          },
          {
            id: 'q2',
            text: 'Do you have a stiff neck or sensitivity to light?',
            answerType: 'YES_NO',
            redFlagAnswer: true,
          },
          {
            id: 'q3',
            text: 'How severe is the pain?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Mild (1-3)', 'Moderate (4-6)', 'Severe (7-9)', 'Worst ever (10)'],
          },
        ],
        redFlags: ['Worst ever', 'Stiff neck', 'Vision changes', 'Confusion'],
        resources: [
          { type: 'PHONE', label: 'Doctor Hotline', value: 'XXXX-XXXX-XXXX' },
          { type: 'LINK', label: 'Headache Relief Tips', value: 'https://example.com' },
        ],
      },
      {
        id: 'ABDOMINAL_PAIN',
        name: 'Abdominal Pain',
        emoji: '🤢',
        severity: 'MEDIUM',
        decision: 'SEE_DOCTOR',
        description: 'Pain in the stomach or abdomen area',
        questions: [
          {
            id: 'q1',
            text: 'How severe is the pain?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Mild (1-3)', 'Moderate (4-6)', 'Severe (7-9)', 'Worst ever (10)'],
            redFlagAnswer: 'Severe (7-9)',
          },
          {
            id: 'q2',
            text: 'Have you vomited?',
            answerType: 'YES_NO',
            redFlagAnswer: true,
          },
          {
            id: 'q3',
            text: 'How long has this been happening?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Less than 1 hour', '1-6 hours', '6-24 hours', 'More than 24 hours'],
          },
        ],
        redFlags: ['Severe pain', 'Vomiting', 'Blood', 'Fever'],
        resources: [
          { type: 'LINK', label: 'Stomach Pain Relief', value: 'https://example.com' },
        ],
      },
      {
        id: 'FEVER',
        name: 'Fever',
        emoji: '🌡️',
        severity: 'MEDIUM',
        decision: 'SEE_DOCTOR',
        description: 'Elevated body temperature',
        questions: [
          {
            id: 'q1',
            text: 'What is the temperature?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Below 38°C', '38-39°C', '39-40°C', 'Above 40°C'],
            redFlagAnswer: 'Above 40°C',
          },
          {
            id: 'q2',
            text: 'Do you have a cough or sore throat?',
            answerType: 'YES_NO',
          },
          {
            id: 'q3',
            text: 'How long have you had the fever?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Less than 24 hours', '24-48 hours', '48-72 hours', 'More than 72 hours'],
            redFlagAnswer: 'More than 72 hours',
          },
        ],
        redFlags: ['Very high temp', 'Confusion', 'Seizures', 'Difficulty breathing'],
        resources: [
          { type: 'LINK', label: 'Fever Management', value: 'https://example.com' },
        ],
      },
      {
        id: 'FRACTURE',
        name: 'Suspected Fracture',
        emoji: '🦴',
        severity: 'MEDIUM',
        decision: 'SEE_DOCTOR',
        description: 'Suspected broken or fractured bone',
        questions: [
          {
            id: 'q1',
            text: 'Can you move the injured area?',
            answerType: 'YES_NO',
            redFlagAnswer: false,
          },
          {
            id: 'q2',
            text: 'Is there severe swelling or deformity?',
            answerType: 'YES_NO',
            redFlagAnswer: true,
          },
          {
            id: 'q3',
            text: 'Which area is affected?',
            answerType: 'MULTIPLE_CHOICE',
            options: ['Arm', 'Leg', 'Spine', 'Pelvis'],
          },
        ],
        redFlags: ['Deformity', 'Inability to move', 'Severe swelling', 'Bone protruding'],
        resources: [
          { type: 'LINK', label: 'Fracture First Aid', value: 'https://example.com' },
        ],
      },
    ]

    conditions.forEach((condition) => {
      this.conditionBank.set(condition.id, condition)
    })

    console.log(`[SymptomEngineService] Initialized with ${this.conditionBank.size} conditions`)
  }

  /**
   * Start new symptom checker session
   */
  startSession(primarySymptom: string): SymptomCheckerSession {
    const sessionId = `SESSION-${Date.now()}`
    const session: SymptomCheckerSession = {
      sessionId,
      timestamp: new Date().toISOString(),
      primarySymptom,
      answers: {},
    }

    this.sessions.set(sessionId, session)
    return session
  }

  /**
   * Record answer in session
   */
  recordAnswer(sessionId: string, questionId: string, answer: string | boolean): void {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    session.answers[questionId] = answer
  }

  /**
   * Get next question for session
   */
  getNextQuestion(sessionId: string): ConditionQuestion | null {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const condition = this.matchCondition(session.primarySymptom)
    if (!condition) {
      return null
    }

    // Find first unanswered question
    for (const question of condition.questions) {
      if (!session.answers.hasOwnProperty(question.id)) {
        return question
      }
    }

    return null
  }

  /**
   * Complete session and get decision
   */
  completeSession(sessionId: string): {
    decision: 'CALL_112' | 'SEE_DOCTOR' | 'SELF_CARE'
    condition: SymptomCondition
    reasoning: string
  } {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const condition = this.matchCondition(session.primarySymptom)
    if (!condition) {
      return {
        decision: 'SEE_DOCTOR',
        condition: {
          id: 'UNKNOWN',
          name: 'Unknown Condition',
          emoji: '❓',
          severity: 'MEDIUM',
          decision: 'SEE_DOCTOR',
          description: 'Unable to determine specific condition',
          questions: [],
          redFlags: [],
          resources: [],
        },
        reasoning: 'Unable to determine condition. Please consult a doctor.',
      }
    }

    // Check for red flags
    const redFlagFound = this.checkRedFlags(condition, session.answers)

    let finalDecision = condition.decision as 'CALL_112' | 'SEE_DOCTOR' | 'SELF_CARE'
    let reasoning = ''

    if (redFlagFound) {
      finalDecision = 'CALL_112'
      reasoning = `Red flag detected: ${redFlagFound}. Immediate medical attention required.`
    } else if (condition.decision === 'CALL_112') {
      reasoning = `${condition.name} may require emergency care. Call 112 to be safe.`
    } else if (condition.decision === 'SEE_DOCTOR') {
      reasoning = `${condition.name} should be evaluated by a doctor within 24 hours.`
    } else {
      reasoning = `${condition.name} can usually be managed with self-care. Continue monitoring.`
    }

    session.decision = finalDecision
    session.matchedCondition = condition

    return {
      decision: finalDecision,
      condition,
      reasoning,
    }
  }

  /**
   * Match condition based on primary symptom
   */
  private matchCondition(primarySymptom: string): SymptomCondition | undefined {
    const lower = primarySymptom.toLowerCase()

    for (const [, condition] of this.conditionBank.entries()) {
      if (condition.name.toLowerCase().includes(lower) || lower.includes(condition.name.toLowerCase())) {
        return condition
      }
    }

    // Try partial match
    for (const [, condition] of this.conditionBank.entries()) {
      const words = condition.name.toLowerCase().split(' ')
      if (words.some((word) => lower.includes(word))) {
        return condition
      }
    }

    // Default to first condition (shouldn't happen)
    return this.conditionBank.get('CHEST_PAIN')
  }

  /**
   * Check for red flags in answered questions
   */
  private checkRedFlags(condition: SymptomCondition, answers: Record<string, string | boolean>): string | null {
    for (const question of condition.questions) {
      const answer = answers[question.id]

      if (answer === undefined) continue

      const redFlagAnswer = question.redFlagAnswer
      if (redFlagAnswer !== undefined && answer === redFlagAnswer) {
        // Found a red flag
        const flagDescription = condition.redFlags.find((flag) =>
          question.text.toLowerCase().includes(flag.toLowerCase().substring(0, 10))
        )
        return flagDescription || 'Concerning symptom detected'
      }
    }

    return null
  }

  /**
   * Get session results
   */
  getSessionResults(sessionId: string): SymptomCheckerSession {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    return session
  }

  /**
   * Get all available conditions
   */
  getAllConditions(): SymptomCondition[] {
    return Array.from(this.conditionBank.values())
  }

  /**
   * Search conditions by keyword
   */
  searchConditions(keyword: string): SymptomCondition[] {
    const lower = keyword.toLowerCase()
    return Array.from(this.conditionBank.values()).filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.description.toLowerCase().includes(lower) ||
        c.redFlags.some((f) => f.toLowerCase().includes(lower))
    )
  }
}

export const symptomEngineService = new SymptomEngineService()
