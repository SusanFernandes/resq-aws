// API route for emergency analysis
// Called by dashboard when WebSocket receives new emergency data
// Runs all AI modules: A2 (intent), A3 (confidence), A6 (sentiment), A7 (location)

import { NextRequest, NextResponse } from 'next/server'
import { classifyEmergencyIntent } from '@/features/autonomous/intent-router/intent-classifier'
import { calculateConfidenceScore, scoreIntentClarity, scoreLocationValidation, scoreEmergencySeverity, scoreCallerCoherence, scoreInformationCompleteness } from '@/features/autonomous/confidence-engine/confidence-scorer'
import { analyzeSentimentFromText, needsReassurance } from '@/features/autonomous/sentiment-detect/sentiment-analyzer'
import { verifyLocation } from '@/features/autonomous/location-verify/location-verifier'
import { extractEmergencyInfo } from '@/lib/ai/groq-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      transcript = '',
      location = '',
      callerName = '',
      callerPhone = '',
      gpsCoordinates = null,
      conversationHistory = [],
    } = body

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: transcript is required' },
        { status: 400 }
      )
    }

    // Step 1: Classify intent (A2)
    console.log('[AI] Step 1: Classifying intent...')
    const intentResult = await classifyEmergencyIntent(transcript)

    // Step 2: Extract emergency information (from Groq)
    console.log('[AI] Step 2: Extracting emergency info...')
    const extractedInfo = await extractEmergencyInfo(transcript)

    // Step 3: Verify location (A7)
    console.log('[AI] Step 3: Verifying location...')
    let verifiedLocation = null
    if (location || gpsCoordinates) {
      verifiedLocation = await verifyLocation(location || '', gpsCoordinates)
    }

    // Step 4: Analyze sentiment (A6)
    console.log('[AI] Step 4: Analyzing sentiment...')
    const sentimentResult = await analyzeSentimentFromText(transcript)

    // Step 5: Calculate confidence (A3)
    console.log('[AI] Step 5: Calculating confidence score...')
    const confidenceFactors = {
      intentClarity: scoreIntentClarity(intentResult.confidence, intentResult.keywords.length),
      locationValidation: scoreLocationValidation(
        !!verifiedLocation,
        verifiedLocation?.verified || false,
        verifiedLocation?.riskLevel === 'safe' ? 'exact' : 'approximate'
      ),
      emergencySeverity: scoreEmergencySeverity(intentResult.intent, intentResult.keywords),
      callerCoherence: scoreCallerCoherence(
        75, // Default clarity
        80, // Sentence completeness
        80, // Logical flow
        100 - sentimentResult.stressPercentage // Lower stress = higher coherence
      ),
      informationCompleteness: scoreInformationCompleteness(
        !!extractedInfo.location,
        !!extractedInfo.callerName,
        !!extractedInfo.age,
        !!extractedInfo.description,
        !!callerPhone,
        conversationHistory.length
      ),
      multipleSourceConfirmation: 0,
    }

    const confidenceScore = calculateConfidenceScore(confidenceFactors)

    // Step 6: Suggest resources
    console.log('[AI] Step 6: Generating response...')
    const resourceMap: Record<string, string[]> = {
      MEDICAL: ['Ambulance (108)', 'Nearest Hospital', 'Emergency Medicine'],
      FIRE: ['Fire Brigade (101)', 'Fire Extinguisher', 'Evacuation Routes'],
      POLICE: ['Police (100)', 'Local Police Station', 'Nearest Police Patrol'],
      ACCIDENT: ['Ambulance (108)', 'Police', 'Traffic Control'],
      TOXIC: ['HAZMAT Team', 'Hospital ICU', 'Environmental Protection'],
      UTILITY: ['Municipal Authorities', 'Electricity Board', 'Gas Authority'],
      NON_EMERGENCY: ['Information Center'],
      UNKNOWN: ['Emergency Services (112)'],
    }

    // Return comprehensive analysis
    const analysis = {
      // Metadata
      timestamp: new Date().toISOString(),
      callDuration: 0,

      // Step 1: Intent (A2)
      intent: {
        type: intentResult.intent,
        confidence: intentResult.confidence,
        displayName: intentResult.intent,
        keywords: intentResult.keywords,
        priority: intentResult.priority,
      },

      // Step 2: Extracted Info
      extracted: {
        location: extractedInfo.location,
        callerName: extractedInfo.callerName,
        age: extractedInfo.age,
        emergencyType: extractedInfo.emergencyType,
        severity: extractedInfo.severity,
        description: extractedInfo.description,
      },

      // Step 3: Location (A7)
      location: verifiedLocation
        ? {
            address: verifiedLocation.address,
            city: verifiedLocation.city,
            state: verifiedLocation.state,
            latitude: verifiedLocation.latitude,
            longitude: verifiedLocation.longitude,
            confidence: verifiedLocation.confidence,
            verified: verifiedLocation.verified,
            riskLevel: verifiedLocation.riskLevel,
          }
        : null,

      // Step 4: Sentiment (A6)
      sentiment: {
        stressLevel: sentimentResult.stressLevel,
        stressPercentage: sentimentResult.stressPercentage,
        emotionalState: sentimentResult.emotionalState,
        confidence: sentimentResult.confidence,
        needsReassurance: needsReassurance(sentimentResult),
        suggestions: sentimentResult.indicators.map((i: any) => i.description),
      },

      // Step 5: Confidence (A3)
      confidence: {
        overall: confidenceScore.overall,
        recommendation: confidenceScore.recommendation,
        shouldAutoDispatch: confidenceScore.shouldAutoDispatch,
        shouldEscalate: confidenceScore.shouldEscalate,
        reason: confidenceScore.reason,
        riskLevel: confidenceScore.riskLevel,
        factors: confidenceScore.factors,
      },

      // Resources & Protocol
      suggestedResources: resourceMap[intentResult.intent] || resourceMap['UNKNOWN'],

      // Dispatch readiness
      readyForDispatch: confidenceScore.shouldAutoDispatch && verifiedLocation?.verified,
      needsOperatorReview: confidenceScore.recommendation === 'OPERATOR_ASSISTED',
      escalateToHuman: confidenceScore.shouldEscalate,
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('[API] Error in emergency analysis pipeline:', error)
    return NextResponse.json(
      {
        error: 'Error processing emergency analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
