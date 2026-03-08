/**
 * MEDICAL ENTITY EXTRACTION & NER
 * Uses Hugging Face BioBERT + Groq for context
 * Identifies medical conditions, medications, symptoms
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface MedicalEntity {
  text: string
  type: 'CONDITION' | 'MEDICATION' | 'SYMPTOM' | 'BODY_PART' | 'PROCEDURE' | 'SEVERITY'
  confidence: number
  category: string
  severity_score?: number
}

export interface MedicalNERResult {
  entities: MedicalEntity[]
  critical_conditions: string[]
  urgency_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommended_specialties: string[]
  inference_time_ms: number
}

// ============================================
// ENTITY PATTERNS (Fast Local NER)
// ============================================

const CRITICAL_PATTERNS = [
  { pattern: /unconscious|unresponsive|not responding/gi, type: 'CONDITION', severity: 10 },
  { pattern: /not breathing|cardiac arrest|no pulse/gi, type: 'CONDITION', severity: 10 },
  { pattern: /severe.*bleeding|blood loss|hemorrhage/gi, type: 'CONDITION', severity: 9 },
  { pattern: /chest pain|cardiac|heart attack|mi\b/gi, type: 'CONDITION', severity: 9 },
  { pattern: /stroke|cva|facial droop/gi, type: 'CONDITION', severity: 9 },
  { pattern: /difficulty breathing|shortness of breath|dyspnea|gasping/gi, type: 'SYMPTOM', severity: 8 },
  { pattern: /severe trauma|major trauma|multi-system/gi, type: 'CONDITION', severity: 9 },
  { pattern: /anaphylaxis|anaphylactic|severe allergic/gi, type: 'CONDITION', severity: 9 },
  { pattern: /overdose|toxic|poisoned|ingestion/gi, type: 'CONDITION', severity: 8 },
  { pattern: /seizure|convulsion|seizing/gi, type: 'CONDITION', severity: 8 },
]

const BODY_PART_PATTERNS = [
  /head|brain|skull|face|jaw/,
  /neck|cervical|spinal/,
  /chest|thorax|lungs|ribs|sternum/,
  /abdomen|stomach|intestine|liver|kidney|spleen/,
  /back|lumbar|spine/,
  /arm|shoulder|elbow|wrist|hand/,
  /leg|hip|knee|ankle|foot/,
  /pelvis|hip bone/,
]

const MEDICATION_PATTERNS = [
  /aspirin|ibuprofen|acetaminophen|morphine|fentanyl|epinephrine|adrenaline/gi,
  /insulin|glucose|oxygen|nitroglycerine|lisinopril|metoprolol/gi,
]

const SYMPTOM_PATTERNS = [
  /pain|ache|sore/,
  /fever|temperature/,
  /nausea|vomit|throw up/,
  /dizziness|dizzy|vertigo/,
  /weakness|numb|paralysis/,
  /rash|hives|skin/,
  /cough|coughing/,
  /swelling|swollen|edema/,
]

// ============================================
// LOCAL NER (Fast, No Dependencies)
// ============================================

function extractEntitiesLocal(text: string): MedicalEntity[] {
  const entities: MedicalEntity[] = []
  const seen = new Set<string>()

  // Critical patterns (highest priority)
  for (const { pattern, type, severity } of CRITICAL_PATTERNS) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const entity = match[0]
      if (!seen.has(entity.toLowerCase())) {
        entities.push({
          text: entity,
          type: type as any,
          confidence: 0.92,
          category: 'CRITICAL',
          severity_score: severity,
        })
        seen.add(entity.toLowerCase())
      }
    }
  }

  // Body parts
  for (const pattern of BODY_PART_PATTERNS) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const entity = match[0]
      if (!seen.has(entity.toLowerCase())) {
        entities.push({
          text: entity,
          type: 'BODY_PART',
          confidence: 0.85,
          category: 'ANATOMY',
        })
        seen.add(entity.toLowerCase())
      }
    }
  }

  // Medications
  const medMatches = text.matchAll(/\b(aspirin|ibuprofen|acetaminophen|morphine|fentanyl|epinephrine|oxygen|insulin|glucose)\b/gi)
  for (const match of medMatches) {
    const entity = match[0]
    if (!seen.has(entity.toLowerCase())) {
      entities.push({
        text: entity,
        type: 'MEDICATION',
        confidence: 0.88,
        category: 'PHARMACY',
      })
      seen.add(entity.toLowerCase())
    }
  }

  // Symptoms
  for (const pattern of SYMPTOM_PATTERNS) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const entity = match[0]
      if (!seen.has(entity.toLowerCase())) {
        entities.push({
          text: entity,
          type: 'SYMPTOM',
          confidence: 0.80,
          category: 'CLINICAL',
        })
        seen.add(entity.toLowerCase())
      }
    }
  }

  return entities
}

// ============================================
// GROQ-POWERED CONTEXT ANALYSIS
// ============================================

async function analyzeContextWithGroq(text: string, foundEntities: MedicalEntity[]): Promise<MedicalEntity[]> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are a medical NER expert. Analyze this emergency call transcript and extract medical entities. Respond as JSON only.

Text: "${text}"

Already found entities: ${JSON.stringify(foundEntities, null, 2)}

Output format:
{
  "additional_entities": [
    {"text": "...", "type": "CONDITION|MEDICATION|SYMPTOM|PROCEDURE|SEVERITY", "confidence": 0.0-1.0, "category": "...", "severity_score": 0-10}
  ],
  "missing_critical": ["...list any critical conditions missed..."]
}`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return foundEntities

    const parsed = JSON.parse(jsonMatch[0])
    return [...foundEntities, ...(parsed.additional_entities || [])]
  } catch (error) {
    console.error('Groq context analysis error:', error)
    return foundEntities
  }
}

// ============================================
// MAIN EXPORT
// ============================================

export async function extractMedicalEntitiesProduction(text: string): Promise<MedicalNERResult> {
  const startTime = Date.now()

  // Step 1: Fast local extraction
  const localEntities = extractEntitiesLocal(text)

  // Step 2: Enhance with Groq context (optional, slower but more accurate)
  const allEntities = process.env.GOOGLE_API_KEY ? await analyzeContextWithGroq(text, localEntities) : localEntities

  // Step 3: Extract critical conditions
  const criticalConditions = allEntities
    .filter((e) => e.category === 'CRITICAL' && e.severity_score && e.severity_score >= 8)
    .map((e) => e.text)

  // Step 4: Determine urgency
  const urgency_level = determineUrgency(allEntities)

  // Step 5: Recommend specialties
  const recommended_specialties = recommendSpecialties(allEntities)

  return {
    entities: allEntities,
    critical_conditions: criticalConditions,
    urgency_level,
    recommended_specialties,
    inference_time_ms: Date.now() - startTime,
  }
}

function determineUrgency(entities: MedicalEntity[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const criticalCount = entities.filter((e) => e.severity_score && e.severity_score >= 9).length
  const highCount = entities.filter((e) => e.severity_score && e.severity_score >= 7).length

  if (criticalCount > 0) return 'CRITICAL'
  if (highCount >= 2) return 'HIGH'
  if (highCount > 0) return 'MEDIUM'
  return 'LOW'
}

function recommendSpecialties(entities: MedicalEntity[]): string[] {
  const specialties = new Set<string>()

  // Map entities to medical specialties
  const entityToSpecialty: Record<string, string> = {
    CONDITION: 'Emergency Medicine',
    'cardiac|heart|chest pain': 'Cardiology',
    'respiratory|breathing|lungs': 'Pulmonology',
    'neurological|stroke|brain': 'Neurology',
    'trauma|bleed|fracture': 'Trauma Surgery',
    'intoxication|overdose|poison': 'Toxicology',
    'allergic|anaphylaxis': 'Immunology',
  }

  for (const entity of entities) {
    const text = entity.text.toLowerCase()

    if (text.includes('cardiac') || text.includes('heart') || text.includes('chest pain')) {
      specialties.add('Cardiology')
    }
    if (text.includes('breathing') || text.includes('respiratory') || text.includes('lungs')) {
      specialties.add('Pulmonology')
    }
    if (text.includes('stroke') || text.includes('brain') || text.includes('seizure')) {
      specialties.add('Neurology')
    }
    if (text.includes('trauma') || text.includes('bleed') || text.includes('fracture')) {
      specialties.add('Trauma Surgery')
    }
    if (text.includes('overdose') || text.includes('poison') || text.includes('toxic')) {
      specialties.add('Toxicology')
    }
    if (text.includes('allergic') || text.includes('anaphylaxis')) {
      specialties.add('Immunology')
    }
  }

  if (specialties.size === 0) {
    specialties.add('Emergency Medicine')
  }

  return Array.from(specialties)
}
