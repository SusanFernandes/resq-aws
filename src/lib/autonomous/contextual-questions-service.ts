/**
 * Contextual Questions Service (A5)
 * Generates intelligent follow-up questions based on conversation context
 */

export interface ContextualQuestion {
  questionId: string
  text: string
  answerType: 'YES_NO' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT'
  options?: string[]
  relevance: number // 0-100, how relevant to current context
  priority: number // 1-5, higher = should ask first
}

interface SymptomContext {
  symptoms: string[]
  age?: number
  location?: string
  previousAnswers: Record<string, string>
  conversationHistory: string[]
}

class ContextualQuestionsService {
  /**
   * Question bank organized by symptom/context
   */
  private questionBank = {
    chestPain: [
      {
        id: 'q-chest-1',
        text: 'Is the chest pain radiating to your arm, shoulder, or jaw?',
        answerType: 'YES_NO' as const,
        priority: 1,
      },
      {
        id: 'q-chest-2',
        text: 'Are you experiencing shortness of breath along with the chest pain?',
        answerType: 'YES_NO' as const,
        priority: 1,
      },
      {
        id: 'q-chest-3',
        text: 'On a scale of 1-10, how severe is the pain?',
        answerType: 'MULTIPLE_CHOICE' as const,
        options: ['1-3 (Mild)', '4-6 (Moderate)', '7-9 (Severe)', '10 (Worst ever)'],
        priority: 2,
      },
      {
        id: 'q-chest-4',
        text: 'How long have you been experiencing this chest pain?',
        answerType: 'MULTIPLE_CHOICE' as const,
        options: ['Less than 5 minutes', '5-15 minutes', '15-30 minutes', 'More than 30 minutes'],
        priority: 2,
      },
    ],
    difficultyBreathing: [
      {
        id: 'q-breath-1',
        text: 'Is the person completely unable to breathe or just having difficulty?',
        answerType: 'YES_NO' as const,
        priority: 1,
      },
      {
        id: 'q-breath-2',
        text: 'Is there wheezing, gasping, or stridor (high-pitched sound)?',
        answerType: 'MULTIPLE_CHOICE' as const,
        options: ['Wheezing', 'Gasping', 'Stridor', 'None of these'],
        priority: 2,
      },
      {
        id: 'q-breath-3',
        text: 'Has the person ever had asthma or respiratory issues?',
        answerType: 'YES_NO' as const,
        priority: 3,
      },
    ],
    bleeding: [
      {
        id: 'q-bleed-1',
        text: 'How severe is the bleeding? Is it gushing or spurting?',
        answerType: 'YES_NO' as const,
        priority: 1,
      },
      {
        id: 'q-bleed-2',
        text: 'Where is the bleeding located?',
        answerType: 'MULTIPLE_CHOICE' as const,
        options: ['Head/Face', 'Arms/Legs', 'Torso/Chest', 'Abdomen', 'Multiple locations'],
        priority: 1,
      },
      {
        id: 'q-bleed-3',
        text: 'What caused the injury?',
        answerType: 'OPEN_TEXT' as const,
        priority: 2,
      },
      {
        id: 'q-bleed-4',
        text: 'Is the person conscious and alert?',
        answerType: 'YES_NO' as const,
        priority: 2,
      },
    ],
    unconscious: [
      {
        id: 'q-uncon-1',
        text: 'Is the person breathing?',
        answerType: 'YES_NO' as const,
        priority: 1,
      },
      {
        id: 'q-uncon-2',
        text: 'Can you feel a pulse?',
        answerType: 'YES_NO' as const,
        priority: 1,
      },
      {
        id: 'q-uncon-3',
        text: 'How long have they been unconscious?',
        answerType: 'MULTIPLE_CHOICE' as const,
        options: ['Just happened', 'Less than 1 minute', '1-5 minutes', 'More than 5 minutes'],
        priority: 2,
      },
      {
        id: 'q-uncon-4',
        text: 'What caused them to become unconscious?',
        answerType: 'OPEN_TEXT' as const,
        priority: 2,
      },
    ],
    choking: [
      {
        id: 'q-choke-1',
        text: 'Can they cough or make any sound?',
        answerType: 'YES_NO' as const,
        priority: 1,
      },
      {
        id: 'q-choke-2',
        text: 'What did they choke on?',
        answerType: 'OPEN_TEXT' as const,
        priority: 1,
      },
      {
        id: 'q-choke-3',
        text: 'Are they able to breathe at all?',
        answerType: 'YES_NO' as const,
        priority: 1,
      },
    ],
    poisoning: [
      {
        id: 'q-poison-1',
        text: 'What did they ingest or get exposed to?',
        answerType: 'OPEN_TEXT' as const,
        priority: 1,
      },
      {
        id: 'q-poison-2',
        text: 'How long ago did the exposure occur?',
        answerType: 'MULTIPLE_CHOICE' as const,
        options: ['Less than 15 minutes ago', '15-60 minutes ago', '1-6 hours ago', 'More than 6 hours ago'],
        priority: 1,
      },
      {
        id: 'q-poison-3',
        text: 'Is the person experiencing nausea, vomiting, or abdominal pain?',
        answerType: 'YES_NO' as const,
        priority: 2,
      },
      {
        id: 'q-poison-4',
        text: 'Do you have the container or packaging?',
        answerType: 'YES_NO' as const,
        priority: 2,
      },
    ],
    burn: [
      {
        id: 'q-burn-1',
        text: 'What percentage of the body is affected?',
        answerType: 'MULTIPLE_CHOICE' as const,
        options: ['Less than 10%', '10-30%', '30-50%', 'More than 50%'],
        priority: 1,
      },
      {
        id: 'q-burn-2',
        text: 'What degree of burn? (Is the skin blistered, blackened, white, or red?)',
        answerType: 'MULTIPLE_CHOICE' as const,
        options: ['Red (1st degree)', 'Blistered (2nd degree)', 'White/Black (3rd degree)'],
        priority: 1,
      },
      {
        id: 'q-burn-3',
        text: 'Are the burns on the face, hands, feet, or genitals?',
        answerType: 'YES_NO' as const,
        priority: 2,
      },
    ],
    fallInjury: [
      {
        id: 'q-fall-1',
        text: 'How far did they fall from?',
        answerType: 'MULTIPLE_CHOICE' as const,
        options: ['Less than 1 meter', '1-3 meters', 'More than 3 meters'],
        priority: 1,
      },
      {
        id: 'q-fall-2',
        text: 'Are they conscious and alert?',
        answerType: 'YES_NO' as const,
        priority: 1,
      },
      {
        id: 'q-fall-3',
        text: 'Can they move all their limbs?',
        answerType: 'YES_NO' as const,
        priority: 2,
      },
      {
        id: 'q-fall-4',
        text: 'Is there visible bleeding or deformity?',
        answerType: 'YES_NO' as const,
        priority: 2,
      },
    ],
  }

  /**
   * Generate next question based on context
   */
  generateNextQuestion(context: SymptomContext): ContextualQuestion | null {
    const questions = this.getRelevantQuestions(context)

    if (questions.length === 0) {
      return null
    }

    // Sort by priority (1 = highest) then by relevance
    questions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return b.relevance - a.relevance
    })

    // Return first unanswered question
    const nextQuestion = questions.find((q) => !context.previousAnswers[q.questionId])

    return nextQuestion ? this.formatQuestion(nextQuestion) : null
  }

  /**
   * Get all relevant questions for current context
   */
  private getRelevantQuestions(context: SymptomContext): Array<any> {
    const questions: Array<any> = []

    // Check each symptom and add relevant questions
    context.symptoms.forEach((symptom) => {
      const lowerSymptom = symptom.toLowerCase()

      if (
        lowerSymptom.includes('chest pain') ||
        lowerSymptom.includes('chest') ||
        lowerSymptom.includes('heart')
      ) {
        questions.push(
          ...this.questionBank.chestPain.map((q) => ({
            ...q,
            relevance: 95,
          }))
        )
      }

      if (
        lowerSymptom.includes('breathing') ||
        lowerSymptom.includes('breath') ||
        lowerSymptom.includes('gasping')
      ) {
        questions.push(
          ...this.questionBank.difficultyBreathing.map((q) => ({
            ...q,
            relevance: 95,
          }))
        )
      }

      if (lowerSymptom.includes('bleed')) {
        questions.push(
          ...this.questionBank.bleeding.map((q) => ({
            ...q,
            relevance: 95,
          }))
        )
      }

      if (lowerSymptom.includes('unconscious') || lowerSymptom.includes('collapse')) {
        questions.push(
          ...this.questionBank.unconscious.map((q) => ({
            ...q,
            relevance: 95,
          }))
        )
      }

      if (lowerSymptom.includes('choke')) {
        questions.push(
          ...this.questionBank.choking.map((q) => ({
            ...q,
            relevance: 95,
          }))
        )
      }

      if (lowerSymptom.includes('poison') || lowerSymptom.includes('overdose')) {
        questions.push(
          ...this.questionBank.poisoning.map((q) => ({
            ...q,
            relevance: 95,
          }))
        )
      }

      if (lowerSymptom.includes('burn') || lowerSymptom.includes('fire')) {
        questions.push(
          ...this.questionBank.burn.map((q) => ({
            ...q,
            relevance: 95,
          }))
        )
      }

      if (lowerSymptom.includes('fall')) {
        questions.push(
          ...this.questionBank.fallInjury.map((q) => ({
            ...q,
            relevance: 95,
          }))
        )
      }
    })

    // Remove duplicates (by questionId)
    const seen = new Set<string>()
    return questions.filter((q) => {
      if (seen.has(q.id)) return false
      seen.add(q.id)
      return true
    })
  }

  /**
   * Format question for display
   */
  private formatQuestion(question: any): ContextualQuestion {
    return {
      questionId: question.id,
      text: question.text,
      answerType: question.answerType,
      options: question.options,
      relevance: question.relevance || 80,
      priority: question.priority || 3,
    }
  }

  /**
   * Get multiple next questions (for batch display)
   */
  getNextQuestions(context: SymptomContext, count: number = 3): ContextualQuestion[] {
    const questions = this.getRelevantQuestions(context)

    questions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return b.relevance - a.relevance
    })

    // Get first `count` unanswered questions
    return questions
      .filter((q) => !context.previousAnswers[q.id])
      .slice(0, count)
      .map((q) => this.formatQuestion(q))
  }

  /**
   * Evaluate if conversation has enough information
   */
  hasEnoughInformation(context: SymptomContext): boolean {
    // Check if we have critical info collected
    const hasCriticalData =
      context.location &&
      context.symptoms.length > 0 &&
      Object.keys(context.previousAnswers).length >= 3

    return hasCriticalData
  }

  /**
   * Get summary of collected information
   */
  getSummary(context: SymptomContext): string {
    let summary = ''

    if (context.symptoms.length > 0) {
      summary += `Symptoms: ${context.symptoms.join(', ')}. `
    }

    if (context.age) {
      summary += `Age: ${context.age}. `
    }

    if (context.location) {
      summary += `Location: ${context.location}. `
    }

    const answerCount = Object.keys(context.previousAnswers).length
    if (answerCount > 0) {
      summary += `Additional information collected: ${answerCount} answers. `
    }

    return summary || 'Gathering information...'
  }
}

export const contextualQuestionsService = new ContextualQuestionsService()
