// Backend API endpoint for emergency analysis using all AI modules
// This replaces the Gemini analysis with Groq + our AI pipeline
// Receives call data from Twilio → Uses A2, A3, A6, A7 → Returns enriched analysis

import express, { Request, Response } from 'express'
import { classifyEmergencyIntent } from '@/features/autonomous/intent-router/intent-classifier'
import { calculateConfidenceScore, scoreIntentClarity, scoreLocationValidation, scoreEmergencySeverity, scoreCallerCoherence, scoreInformationCompleteness } from '@/features/autonomous/confidence-engine/confidence-scorer'
import { analyzeSentimentFromText, needsReassurance } from '@/features/autonomous/sentiment-detect/sentiment-analyzer'
import { verifyLocation } from '@/features/autonomous/location-verify/location-verifier'
import { extractEmergencyInfo } from '@/lib/ai/groq-client'
import { forwardGeocode } from '@/lib/osm/geocoding'

const router = express.Router()

/**
 * POST /api/emergency-analysis
 * Analyzes emergency call and returns enriched analysis with:
 * - Intent type & confidence (A2)
 * - Overall confidence score & escalation recommendation (A3)
 * - Caller sentiment/stress level (A6)
 * - Verified location (A7)
 * - Suggested protocol & resources
 */
router.post('/emergency-analysis', async (req: Request, res: Response) => {
  try {
    const {
      transcript = '',
      location = '',
      callerName = '',
      callerPhone = '',
      gpsCoordinates = null,
      conversationHistory = [],
    } = req.body

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: transcript is required',
      })
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
      multipleSourceConfirmation: 0, // Would be populated if we had multiple sources
    }

    const confidenceScore = calculateConfidenceScore(confidenceFactors)

    // Step 6: Suggest protocol & resources
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
      location: verifiedLocation ? {
        address: verifiedLocation.address,
        city: verifiedLocation.city,
        state: verifiedLocation.state,
        latitude: verifiedLocation.latitude,
        longitude: verifiedLocation.longitude,
        confidence: verifiedLocation.confidence,
        verified: verifiedLocation.verified,
        riskLevel: verifiedLocation.riskLevel,
      } : null,

      // Step 4: Sentiment (A6)
      sentiment: {
        stressLevel: sentimentResult.stressLevel,
        stressPercentage: sentimentResult.stressPercentage,
        emotionalState: sentimentResult.emotionalState,
        confidence: sentimentResult.confidence,
        needsReassurance: needsReassurance(sentimentResult),
        suggestions: sentimentResult.indicators.map(i => i.description),
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

    res.json(analysis)
  } catch (error) {
    console.error('[AI] Error in emergency analysis pipeline:', error)
    res.status(500).json({
      error: 'Error processing emergency analysis',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/facility-search
 * Find nearby facilities based on location
 */
router.post('/facility-search', async (req: Request, res: Response) => {
  try {
    const {
      latitude,
      longitude,
      type = 'hospital', // hospital, police, fire_station, clinic, blood_bank
      radiusKm = 5,
    } = req.body

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Invalid request: latitude and longitude are required',
      })
    }

    // For now, return empty (would integrate with OSM or Google Maps)
    // This is a placeholder for facility search
    res.json({
      facilities: [],
      searchLocation: { latitude, longitude },
      type,
      radiusKm,
    })
  } catch (error) {
    console.error('[Facility Search] Error:', error)
    res.status(500).json({
      error: 'Error searching for facilities',
    })
  }
})

export default router
