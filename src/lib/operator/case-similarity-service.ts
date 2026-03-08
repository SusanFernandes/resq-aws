/**
 * Case Similarity Service (O2)
 * Provides similar past cases for operator learning
 */

export interface CaseRecord {
  caseId: string
  timestamp: string
  callTranscript: string
  extractedData: {
    symptoms: string[]
    location: { address: string; coordinates?: [number, number] }
    severity: string
    age?: number
    emergencyType: string
  }
  decisionRoute: 'AUTO_DISPATCH' | 'OPERATOR_ASSISTED' | 'ESCALATE_TO_HUMAN'
  dispatchAction: {
    hospitalId: string
    hospitalName: string
    outcome: 'SUCCESSFUL' | 'CANCELLED' | 'FAILED'
  }
  operatorNotes: string
  resolutionNotes: string
}

export interface SimilarCase {
  caseId: string
  transcript: string
  symptoms: string[]
  severity: string
  resolution: string
  dispatchSent: {
    service: string
    hospital: string
    outcome: string
  }
  operatorNotes: string
  similarity: number // 0-100%
}

class CaseSimilarityService {
  private caseHistory: CaseRecord[] = []
  private mockCases: CaseRecord[] = this.generateMockCases()

  constructor() {
    // Initialize with mock cases for demonstration
    this.caseHistory = [...this.mockCases]
    console.log(`[CaseSimilarityService] Initialized with ${this.caseHistory.length} cases`)
  }

  /**
   * Generate mock case history for training
   */
  private generateMockCases(): CaseRecord[] {
    return [
      {
        caseId: 'CASE-001',
        timestamp: '2026-02-20T14:30:00Z',
        callTranscript:
          'Caller: My father is experiencing severe chest pain and difficulty breathing. He is 67 years old. Response: This is a critical medical emergency. Dispatching ambulance immediately.',
        extractedData: {
          symptoms: ['chest pain', 'difficulty breathing'],
          location: {
            address: 'Mumbai Central Hospital, Mumbai',
            coordinates: [18.9674, 72.8194],
          },
          severity: 'CRITICAL',
          age: 67,
          emergencyType: 'MEDICAL',
        },
        decisionRoute: 'AUTO_DISPATCH',
        dispatchAction: {
          hospitalId: 'H-001',
          hospitalName: 'Mumbai Central Hospital',
          outcome: 'SUCCESSFUL',
        },
        operatorNotes: 'Caller very stressed, patient older adult',
        resolutionNotes:
          'Ambulance arrived in 6 minutes. Patient admitted to cardiac unit. Positive outcome.',
      },
      {
        caseId: 'CASE-002',
        timestamp: '2026-02-19T10:15:00Z',
        callTranscript:
          'Caller: There is a fire on the third floor of our office building. People are evacuating. Response: Fire emergency confirmed. Dispatching fire truck to your location.',
        extractedData: {
          symptoms: ['fire', 'smoke'],
          location: {
            address: 'Business District, Mumbai',
            coordinates: [19.0176, 72.8479],
          },
          severity: 'CRITICAL',
          emergencyType: 'FIRE',
        },
        decisionRoute: 'AUTO_DISPATCH',
        dispatchAction: {
          hospitalId: 'F-001',
          hospitalName: 'Fire Station East',
          outcome: 'SUCCESSFUL',
        },
        operatorNotes: 'Caller panic level high but coherent',
        resolutionNotes: 'Fire contained. No casualties. Building evacuated safely.',
      },
      {
        caseId: 'CASE-003',
        timestamp: '2026-02-18T16:45:00Z',
        callTranscript:
          'Caller: A child has swallowed some pills. We are not sure what type. Age is 5 years. Response: This is a poisoning emergency. What color were the pills?',
        extractedData: {
          symptoms: ['poisoning', 'swallowed pills'],
          location: {
            address: 'Bandra, Mumbai',
            coordinates: [19.0596, 72.8295],
          },
          severity: 'HIGH',
          age: 5,
          emergencyType: 'MEDICAL',
        },
        decisionRoute: 'OPERATOR_ASSISTED',
        dispatchAction: {
          hospitalId: 'H-002',
          hospitalName: 'Pediatric Hospital Mumbai',
          outcome: 'SUCCESSFUL',
        },
        operatorNotes: 'Parents panicked, needed reassurance',
        resolutionNotes: 'Child treated for accidental ingestion. Full recovery.',
      },
      {
        caseId: 'CASE-004',
        timestamp: '2026-02-17T09:20:00Z',
        callTranscript:
          'Caller: There has been a car accident on Eastern Express way. Two vehicles involved. Multiple people injured. Response: Accident confirmed. Dispatching ambulance and police.',
        extractedData: {
          symptoms: ['accident', 'collision', 'injured'],
          location: {
            address: 'Eastern Express Way, Mumbai',
            coordinates: [19.1136, 72.8697],
          },
          severity: 'HIGH',
          emergencyType: 'ACCIDENT',
        },
        decisionRoute: 'AUTO_DISPATCH',
        dispatchAction: {
          hospitalId: 'H-003',
          hospitalName: 'Trauma Center Mumbai',
          outcome: 'SUCCESSFUL',
        },
        operatorNotes: 'Multiple casualties, required multi-service dispatch',
        resolutionNotes: 'All casualties treated. 3 admitted for observation.',
      },
      {
        caseId: 'CASE-005',
        timestamp: '2026-02-16T13:00:00Z',
        callTranscript:
          'Caller: My wife fell from the stairs and is now unconscious. She is bleeding from the head. Response: This is a critical emergency. Keep her still and dont move her.',
        extractedData: {
          symptoms: ['unconscious', 'bleeding', 'head injury'],
          location: {
            address: 'Colaba, Mumbai',
            coordinates: [18.9432, 72.8236],
          },
          severity: 'CRITICAL',
          emergencyType: 'ACCIDENT',
        },
        decisionRoute: 'AUTO_DISPATCH',
        dispatchAction: {
          hospitalId: 'H-004',
          hospitalName: 'Neurology Hospital Mumbai',
          outcome: 'SUCCESSFUL',
        },
        operatorNotes: 'Caller panicked but followed instructions',
        resolutionNotes: 'Patient had mild concussion. Discharged same day.',
      },
    ]
  }

  /**
   * Calculate similarity score between two symptom lists
   */
  private calculateSimilarity(
    symptoms1: string[],
    symptoms2: string[]
  ): number {
    if (symptoms1.length === 0 && symptoms2.length === 0) return 100

    const intersection = symptoms1.filter((s) => symptoms2.includes(s)).length
    const union = new Set([...symptoms1, ...symptoms2]).size

    return Math.round((intersection / union) * 100)
  }

  /**
   * Find similar cases
   */
  findSimilarCases(symptoms: string[], severity: string, limit: number = 3): SimilarCase[] {
    const similarCases: {
      caseId: string
      similarity: number
      case: CaseRecord
    }[] = []

    this.caseHistory.forEach((caseRecord) => {
      // Calculate symptom similarity
      const symptomSimilarity = this.calculateSimilarity(symptoms, caseRecord.extractedData.symptoms)

      // Boost similarity if severity matches
      let finalSimilarity = symptomSimilarity
      if (caseRecord.extractedData.severity === severity) {
        finalSimilarity = Math.min(100, symptomSimilarity + 10)
      }

      // Only include cases with >= 50% similarity
      if (finalSimilarity >= 50) {
        similarCases.push({
          caseId: caseRecord.caseId,
          similarity: finalSimilarity,
          case: caseRecord,
        })
      }
    })

    // Sort by similarity descending
    similarCases.sort((a, b) => b.similarity - a.similarity)

    // Convert to SimilarCase format
    return similarCases.slice(0, limit).map((item) => ({
      caseId: item.case.caseId,
      transcript: item.case.callTranscript.substring(0, 500),
      symptoms: item.case.extractedData.symptoms,
      severity: item.case.extractedData.severity,
      resolution: item.case.resolutionNotes,
      dispatchSent: {
        service: item.case.extractedData.emergencyType,
        hospital: item.case.dispatchAction.hospitalName,
        outcome: item.case.dispatchAction.outcome,
      },
      operatorNotes: item.case.operatorNotes,
      similarity: item.similarity,
    }))
  }

  /**
   * Add new case to history
   */
  addCase(caseData: Omit<CaseRecord, 'caseId' | 'timestamp'>): CaseRecord {
    const newCase: CaseRecord = {
      ...caseData,
      caseId: `CASE-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }

    this.caseHistory.push(newCase)

    // Keep only last 100 cases in memory
    if (this.caseHistory.length > 100) {
      this.caseHistory.shift()
    }

    console.log(`[CaseSimilarityService] Added case ${newCase.caseId}`)
    return newCase
  }

  /**
   * Get case by ID
   */
  getCase(caseId: string): CaseRecord | undefined {
    return this.caseHistory.find((c) => c.caseId === caseId)
  }

  /**
   * Get all cases
   */
  getAllCases(): CaseRecord[] {
    return [...this.caseHistory]
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalCases: number
    successfulDispatches: number
    successRate: number
    commonSymptoms: Record<string, number>
  } {
    const stats = {
      totalCases: this.caseHistory.length,
      successfulDispatches: this.caseHistory.filter(
        (c) => c.dispatchAction.outcome === 'SUCCESSFUL'
      ).length,
      successRate: 0,
      commonSymptoms: {} as Record<string, number>,
    }

    stats.successRate =
      stats.totalCases > 0 ? Math.round((stats.successfulDispatches / stats.totalCases) * 100) : 0

    // Count symptom occurrences
    this.caseHistory.forEach((caseRecord) => {
      caseRecord.extractedData.symptoms.forEach((symptom) => {
        stats.commonSymptoms[symptom] = (stats.commonSymptoms[symptom] || 0) + 1
      })
    })

    return stats
  }
}

export const caseSimilarityService = new CaseSimilarityService()
