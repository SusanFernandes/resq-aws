// Backend WebSocket Server (server.js)
import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws"; // Import WebSocket from ws package
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Storage for dispatch and escalation data (in-memory for MVP)
const dispatchRecords = new Map();
const escalationRecords = new Map();

// Clients tracking
const clients = {
  dashboard: new Set(),
  mobileApps: new Set(),
};

// Middleware to parse Twilio webhooks
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not defined in environment variables");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeEmergencyCall(conversationHistory) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      // Optional: Add safety settings
      safetySettings: [
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_ONLY_HIGH",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH",
        },
      ],
    });

    const prompt = `Analyze this emergency conversation and extract key details in a strict JSON format:

Conversation:
${JSON.stringify(conversationHistory)}

Extract the following information EXACTLY in this JSON structure:
{
  "location": "Exact address or location mentioned(which can be feed to mapbox to get coordinates)",
  "name": "Caller's name if mentioned",
  "age": "Caller's age if mentioned",
  "summary": "Concise summary of the emergency situation",
  "type": "critical|moderate|low",
  "title": "Short emergency description"
}

Rules:
- If no specific detail is found, use "Unknown". If location is not found use a random location form india.
- Type must be one of: critical, moderate, low
- Be as precise and accurate as possible
- Focus on extracting actionable emergency information`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(text);
    // Clean and parse the JSON (handle potential formatting issues)
    const cleanText = text
      .replace(/```json?/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Google AI Analysis Error:", error);
    return {
      location: "Unknown",
      name: "Unknown",
      age: "Unknown",
      summary: "Failed to process emergency details",
      type: "low",
      title: "Analysis Error",
    };
  }
}

app.post("/twilio-webhook", async (req, res) => {
  try {
    console.log("Received Twilio webhook:", req.body);
    const twilioData = req.body;
    console.log(twilioData);
    const conversationHistory = twilioData.convo?.data || [];
    const aiAnalysis = await analyzeEmergencyCall(conversationHistory);

    const enrichedData = {
      id: twilioData.id || "unknown-id",
      originalConversation: conversationHistory,
      aiAnalysis: aiAnalysis,
    };

    broadcastToDashboard({
      type: "twilio-update",
      data: enrichedData,
    });

    res.status(200).send("Processed");
  } catch (error) {
    console.error("Webhook processing error:", error);

    broadcastToDashboard({
      type: "twilio-update",
      data: {
        id: 80321949,
        timestamp: new Date().toISOString(),
        originalConversation: [
          {
            role: "assistant",
            content: "1-1-2 what's you emergency?",
          },
        ],
        aiAnalysis: {
          location: "Unknown",
          name: "Unknown",
          age: "Unknown",
          summary: "Failed to process emergency details",
          type: "low",
          title: "Emergency Analysis Error",
          emergencyId: 123124412,
        },
      },
    });

    res.status(500).send("Processing Error");
  }
});

// ============================================
// A8: AUTO DISPATCH API ROUTES
// ============================================

app.post("/api/dispatch", async (req, res) => {
  try {
    const {
      emergencyId,
      hospitalId,
      hospitalName,
      hospitalPhone,
      address,
      latitude,
      longitude,
      emergencyType,
      severity,
      patientDetails,
      estimatedArrival,
      dispatchedBy,
    } = req.body;

    const dispatchId = `DISP-${Date.now()}`;
    const dispatchRecord = {
      id: dispatchId,
      emergencyId,
      hospitalId,
      hospitalName,
      hospitalPhone,
      address,
      latitude,
      longitude,
      emergencyType,
      severity,
      patientDetails,
      estimatedArrival,
      dispatchedBy,
      status: "SENT",
      timestamp: new Date().toISOString(),
      hospitalAcknowledged: false,
      acknowledgeTime: null,
    };

    // Store dispatch record
    dispatchRecords.set(dispatchId, dispatchRecord);

    // Simulate sending SMS to hospital (in production, use Twilio SMS API)
    console.log(
      `[DISPATCH] SMS sent to ${hospitalPhone}: Emergency ${emergencyType} at ${address}. Patient: ${patientDetails.name}. ETA: ${estimatedArrival}min`
    );

    // Broadcast dispatch status to all dashboard clients
    broadcastToDashboard({
      type: "dispatch-update",
      data: {
        dispatchId,
        status: "SENT",
        timestamp: new Date().toISOString(),
        message: `Dispatch sent to ${hospitalName}`,
      },
    });

    res.status(200).json({
      id: dispatchId,
      status: "SENT",
      timestamp: new Date().toISOString(),
      hospitalName,
      message: "Dispatch sent successfully",
    });
  } catch (error) {
    console.error("[DISPATCH] Error creating dispatch:", error);
    res.status(500).json({ error: "Failed to create dispatch" });
  }
});

app.post("/api/dispatch/:id/acknowledge", async (req, res) => {
  try {
    const { id } = req.params;
    const { hospitalId } = req.body;

    const dispatch = dispatchRecords.get(id);
    if (!dispatch) {
      return res.status(404).json({ error: "Dispatch not found" });
    }

    dispatch.status = "ACKNOWLEDGED";
    dispatch.hospitalAcknowledged = true;
    dispatch.acknowledgeTime = new Date().toISOString();

    // Broadcast acknowledgment to dashboard
    broadcastToDashboard({
      type: "dispatch-acknowledged",
      data: {
        dispatchId: id,
        status: "ACKNOWLEDGED",
        timestamp: dispatch.acknowledgeTime,
        hospitalName: dispatch.hospitalName,
      },
    });

    console.log(`[DISPATCH] Hospital acknowledged dispatch: ${id}`);

    res.status(200).json({
      id,
      status: "ACKNOWLEDGED",
      timestamp: dispatch.acknowledgeTime,
    });
  } catch (error) {
    console.error("[DISPATCH] Error acknowledging dispatch:", error);
    res.status(500).json({ error: "Failed to acknowledge dispatch" });
  }
});

app.post("/api/dispatch/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const dispatch = dispatchRecords.get(id);
    if (!dispatch) {
      return res.status(404).json({ error: "Dispatch not found" });
    }

    dispatch.status = "CANCELLED";
    dispatch.cancelReason = reason;
    dispatch.cancelTime = new Date().toISOString();

    // Broadcast cancellation to dashboard
    broadcastToDashboard({
      type: "dispatch-cancelled",
      data: {
        dispatchId: id,
        status: "CANCELLED",
        reason,
        timestamp: dispatch.cancelTime,
      },
    });

    console.log(`[DISPATCH] Dispatch cancelled: ${id}, reason: ${reason}`);

    res.status(200).json({
      id,
      status: "CANCELLED",
      timestamp: dispatch.cancelTime,
    });
  } catch (error) {
    console.error("[DISPATCH] Error cancelling dispatch:", error);
    res.status(500).json({ error: "Failed to cancel dispatch" });
  }
});

app.get("/api/dispatch/:id", (req, res) => {
  try {
    const { id } = req.params;
    const dispatch = dispatchRecords.get(id);

    if (!dispatch) {
      return res.status(404).json({ error: "Dispatch not found" });
    }

    res.status(200).json(dispatch);
  } catch (error) {
    console.error("[DISPATCH] Error fetching dispatch:", error);
    res.status(500).json({ error: "Failed to fetch dispatch" });
  }
});

// ============================================
// A4: ESCALATION API ROUTES
// ============================================

app.post("/api/escalation", async (req, res) => {
  try {
    const {
      emergencyId,
      reason,
      confidence,
      emergencyType,
      location,
    } = req.body;

    const ticketId = `ESC-${Date.now()}`;
    const escalationRecord = {
      id: ticketId,
      emergencyId,
      reason,
      confidence,
      emergencyType,
      location,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      assignedTo: null,
      assignedAt: null,
      supervisorDecision: null,
      decisionTime: null,
    };

    // Store escalation record
    escalationRecords.set(ticketId, escalationRecord);

    // Broadcast escalation created to supervisors
    broadcastToDashboard({
      type: "escalation-created",
      data: {
        ticketId,
        status: "PENDING",
        emergencyType,
        confidence,
      },
    });

    console.log(`[ESCALATION] Ticket created: ${ticketId}`);

    res.status(200).json({
      id: ticketId,
      status: "PENDING",
      createdAt: escalationRecord.createdAt,
    });
  } catch (error) {
    console.error("[ESCALATION] Error creating escalation:", error);
    res.status(500).json({ error: "Failed to create escalation" });
  }
});

app.post("/api/escalation/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { supervisorId, reasoning, newConfidence } = req.body;

    const escalation = escalationRecords.get(id);
    if (!escalation) {
      return res.status(404).json({ error: "Escalation not found" });
    }

    escalation.status = "APPROVED";
    escalation.supervisorDecision = {
      action: "APPROVE_DISPATCH",
      supervisor: supervisorId,
      reasoning,
      newConfidence: newConfidence || escalation.confidence,
      timestamp: new Date().toISOString(),
    };
    escalation.decisionTime = new Date().toISOString();

    // Broadcast approval to dashboard
    broadcastToDashboard({
      type: "escalation-approved",
      data: {
        ticketId: id,
        status: "APPROVED",
        supervisorId,
        timestamp: escalation.decisionTime,
      },
    });

    console.log(`[ESCALATION] Ticket approved: ${id} by ${supervisorId}`);

    res.status(200).json({
      id,
      status: "APPROVED",
      timestamp: escalation.decisionTime,
    });
  } catch (error) {
    console.error("[ESCALATION] Error approving escalation:", error);
    res.status(500).json({ error: "Failed to approve escalation" });
  }
});

app.post("/api/escalation/:id/force", async (req, res) => {
  try {
    const { id } = req.params;
    const { supervisorId, reasoning } = req.body;

    const escalation = escalationRecords.get(id);
    if (!escalation) {
      return res.status(404).json({ error: "Escalation not found" });
    }

    escalation.status = "OVERRIDDEN";
    escalation.supervisorDecision = {
      action: "FORCE_DISPATCH",
      supervisor: supervisorId,
      reasoning,
      newConfidence: 85, // Treat as high confidence
      timestamp: new Date().toISOString(),
      isEmergencyOverride: true,
    };
    escalation.decisionTime = new Date().toISOString();

    // Broadcast force dispatch to dashboard
    broadcastToDashboard({
      type: "escalation-overridden",
      data: {
        ticketId: id,
        status: "OVERRIDDEN",
        supervisorId,
        timestamp: escalation.decisionTime,
        message: "CRITICAL: Emergency override by supervisor",
      },
    });

    console.log(`[ESCALATION] Ticket overridden (force dispatch): ${id} by ${supervisorId}`);

    res.status(200).json({
      id,
      status: "OVERRIDDEN",
      timestamp: escalation.decisionTime,
    });
  } catch (error) {
    console.error("[ESCALATION] Error forcing escalation:", error);
    res.status(500).json({ error: "Failed to force escalation" });
  }
});

app.post("/api/escalation/:id/deny", async (req, res) => {
  try {
    const { id } = req.params;
    const { supervisorId, reasoning } = req.body;

    const escalation = escalationRecords.get(id);
    if (!escalation) {
      return res.status(404).json({ error: "Escalation not found" });
    }

    escalation.status = "DENIED";
    escalation.supervisorDecision = {
      action: "DENY_DISPATCH",
      supervisor: supervisorId,
      reasoning,
      timestamp: new Date().toISOString(),
    };
    escalation.decisionTime = new Date().toISOString();

    // Broadcast denial to dashboard
    broadcastToDashboard({
      type: "escalation-denied",
      data: {
        ticketId: id,
        status: "DENIED",
        supervisorId,
        timestamp: escalation.decisionTime,
        reason: reasoning,
      },
    });

    console.log(`[ESCALATION] Ticket denied: ${id} by ${supervisorId}`);

    res.status(200).json({
      id,
      status: "DENIED",
      timestamp: escalation.decisionTime,
    });
  } catch (error) {
    console.error("[ESCALATION] Error denying escalation:", error);
    res.status(500).json({ error: "Failed to deny escalation" });
  }
});

app.get("/api/escalation/pending", (req, res) => {
  try {
    const pending = Array.from(escalationRecords.values()).filter(
      (esc) => esc.status === "PENDING"
    );

    res.status(200).json({
      count: pending.length,
      escalations: pending,
    });
  } catch (error) {
    console.error("[ESCALATION] Error fetching pending escalations:", error);
    res.status(500).json({ error: "Failed to fetch escalations" });
  }
});

app.get("/api/escalation/:id", (req, res) => {
  try {
    const { id } = req.params;
    const escalation = escalationRecords.get(id);

    if (!escalation) {
      return res.status(404).json({ error: "Escalation not found" });
    }

    res.status(200).json(escalation);
  } catch (error) {
    console.error("[ESCALATION] Error fetching escalation:", error);
    res.status(500).json({ error: "Failed to fetch escalation" });
  }
});

// ============================================
// NOTIFICATIONS API ROUTE
// ============================================

app.post("/api/notifications", async (req, res) => {
  try {
    const { type, to, title, message, data } = req.body;

    console.log(`[NOTIFICATIONS] ${type} notification to ${to}`);
    console.log(`[NOTIFICATIONS] Title: ${title}`);
    console.log(`[NOTIFICATIONS] Message: ${message}`);

    if (type === "SMS") {
      // In production, use Twilio SMS API
      console.log(`[NOTIFICATIONS] SMS sent to: ${to}`);
      console.log(`[NOTIFICATIONS] Content: ${message}`);
    } else if (type === "DASHBOARD") {
      // Broadcast dashboard notification
      broadcastToDashboard({
        type: "notification",
        data: {
          title,
          message,
          notificationData: data,
          timestamp: new Date().toISOString(),
        },
      });
    } else if (type === "EMAIL") {
      // In production, use email service
      console.log(`[NOTIFICATIONS] Email sent to: ${to}`);
    }

    res.status(200).json({
      status: "SENT",
      notificationType: type,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[NOTIFICATIONS] Error sending notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// ============================================
// TIER 2 API ROUTES - REAL-TIME ANALYSIS (O1)
// ============================================

app.post("/api/live-analysis/start", (req, res) => {
  try {
    const { callId } = req.body;
    
    if (!callId) {
      return res.status(400).json({ error: "callId is required" });
    }

    const analysisId = `ANALYSIS-${Date.now()}`;
    const analysis = {
      analysisId,
      callId,
      timestamp: new Date().toISOString(),
      transcript: '',
      detectedSymptoms: [],
      severity: 'LOW',
      aiSuggestion: 'Waiting for call content...',
      recommendedAction: 'Listen and gather information',
      nextQuestions: [],
    };

    if (!global.liveAnalysesStore) {
      global.liveAnalysesStore = new Map();
    }
    global.liveAnalysesStore.set(analysisId, analysis);

    console.log(`[LIVE-ANALYSIS] Started analysis for call ${callId}`);

    res.status(200).json({
      success: true,
      analysisId,
    });
  } catch (error) {
    console.error("[LIVE-ANALYSIS] Error starting analysis:", error);
    res.status(500).json({ error: "Failed to start analysis" });
  }
});

app.post("/api/live-analysis/update", (req, res) => {
  try {
    const { analysisId, newTranscriptChunk } = req.body;
    
    if (!analysisId || !newTranscriptChunk) {
      return res.status(400).json({ error: "analysisId and newTranscriptChunk are required" });
    }

    if (!global.liveAnalysesStore) {
      global.liveAnalysesStore = new Map();
    }

    const analysis = global.liveAnalysesStore.get(analysisId);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    analysis.transcript += (analysis.transcript ? ' ' : '') + newTranscriptChunk;

    const symptoms = [];
    const lowerTranscript = analysis.transcript.toLowerCase();

    const symptomKeywords = {
      'chest pain': { severity: 'CRITICAL', confidence: 90 },
      'breathing': { severity: 'CRITICAL', confidence: 85 },
      'bleeding': { severity: 'HIGH', confidence: 80 },
      'unconscious': { severity: 'CRITICAL', confidence: 95 },
      'choking': { severity: 'CRITICAL', confidence: 90 },
      'fire': { severity: 'CRITICAL', confidence: 85 },
    };

    for (const [keyword, { severity, confidence }] of Object.entries(symptomKeywords)) {
      if (lowerTranscript.includes(keyword)) {
        const existing = symptoms.find(s => s.symptom === keyword);
        if (!existing) {
          symptoms.push({
            symptom: keyword,
            confidence,
            severity,
            keywords: [keyword],
          });
        }
      }
    }

    analysis.detectedSymptoms = symptoms;

    if (symptoms.length > 0) {
      const severityOrder = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
      const maxSeverity = symptoms.reduce((max, s) => {
        return severityOrder[s.severity] > (severityOrder[max.severity] || 0) ? s : max;
      }, symptoms[0]);
      analysis.severity = maxSeverity.severity;
    }

    if (symptoms.length > 0) {
      const topSymptom = symptoms[0];
      if (topSymptom.severity === 'CRITICAL') {
        analysis.aiSuggestion = `🔴 CRITICAL: Detected ${topSymptom.symptom}. Immediate medical attention required.`;
        analysis.recommendedAction = 'DISPATCH IMMEDIATELY';
      } else if (topSymptom.severity === 'HIGH') {
        analysis.aiSuggestion = `🟠 HIGH PRIORITY: ${topSymptom.symptom} detected. Urgent dispatch recommended.`;
        analysis.recommendedAction = 'Prepare dispatch';
      }
    }

    const questions = [];
    if (analysis.detectedSymptoms.some(s => s.symptom === 'chest pain')) {
      questions.push('Is the pain radiating to your arm or jaw?');
      questions.push('Are you having difficulty breathing?');
    }
    if (analysis.detectedSymptoms.some(s => s.symptom === 'bleeding')) {
      questions.push('How severe is the bleeding?');
      questions.push('What caused the injury?');
    }
    analysis.nextQuestions = questions.slice(0, 3);

    analysis.timestamp = new Date().toISOString();

    broadcastToDashboard({
      type: 'live-analysis-update',
      data: analysis,
    });

    res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("[LIVE-ANALYSIS] Error updating analysis:", error);
    res.status(500).json({ error: "Failed to update analysis" });
  }
});

app.get("/api/live-analysis/:analysisId", (req, res) => {
  try {
    const { analysisId } = req.params;

    if (!global.liveAnalysesStore) {
      return res.status(404).json({ error: "No active analyses" });
    }

    const analysis = global.liveAnalysesStore.get(analysisId);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("[LIVE-ANALYSIS] Error fetching analysis:", error);
    res.status(500).json({ error: "Failed to fetch analysis" });
  }
});

// ============================================
// TIER 2 API ROUTES - SIMILAR CASES (O2)
// ============================================

app.get("/api/similar-cases", (req, res) => {
  try {
    const { symptoms, severity, limit = 3 } = req.query;

    if (!symptoms) {
      return res.status(400).json({ error: "symptoms parameter is required" });
    }

    const symptomsList = typeof symptoms === 'string' ? [symptoms] : symptoms;

    const mockCases = [
      {
        caseId: 'CASE-001',
        transcript: 'Caller: My father is experiencing severe chest pain...',
        symptoms: ['chest pain', 'difficulty breathing'],
        severity: 'CRITICAL',
        resolution: 'Ambulance dispatched. Patient admitted to cardiac unit. Positive outcome.',
        dispatchSent: { service: 'MEDICAL', hospital: 'Central Hospital', outcome: 'SUCCESSFUL' },
        operatorNotes: 'Caller very stressed, patient older adult',
        similarity: 95,
      },
      {
        caseId: 'CASE-002',
        transcript: 'Caller: There is a fire on the third floor...',
        symptoms: ['fire', 'smoke'],
        severity: 'CRITICAL',
        resolution: 'Fire contained. No casualties. Building evacuated safely.',
        dispatchSent: { service: 'FIRE', hospital: 'Fire Station', outcome: 'SUCCESSFUL' },
        operatorNotes: 'Caller panic level high but coherent',
        similarity: 85,
      },
      {
        caseId: 'CASE-003',
        transcript: 'Caller: A child has swallowed some pills...',
        symptoms: ['poisoning'],
        severity: 'HIGH',
        resolution: 'Child treated for accidental ingestion. Full recovery.',
        dispatchSent: { service: 'MEDICAL', hospital: 'Pediatric Hospital', outcome: 'SUCCESSFUL' },
        operatorNotes: 'Parents panicked, needed reassurance',
        similarity: 80,
      },
    ];

    const filtered = mockCases.filter(c => {
      const intersection = c.symptoms.filter(s => symptomsList.includes(s)).length;
      return intersection > 0;
    });

    const results = filtered.slice(0, parseInt(limit) || 3);

    res.status(200).json({
      success: true,
      count: results.length,
      cases: results,
    });
  } catch (error) {
    console.error("[SIMILAR-CASES] Error fetching cases:", error);
    res.status(500).json({ error: "Failed to fetch similar cases" });
  }
});

// ============================================
// TIER 2 API ROUTES - LOCATION VERIFICATION (A7)
// ============================================

app.post("/api/verify-location", (req, res) => {
  try {
    const { rawLocation, latitude, longitude } = req.body;

    if (!rawLocation && !latitude && !longitude) {
      return res.status(400).json({ error: "rawLocation or coordinates are required" });
    }

    let result = {
      verified: true,
      address: rawLocation || `${latitude}, ${longitude}`,
      coordinates: { latitude, longitude },
      confidence: 85,
      verificationMethod: 'MOCK',
    };

    const mockLocations = {
      'mumbai': { address: 'Mumbai, India', coordinates: { latitude: 19.076, longitude: 72.8776 } },
      'bandra': { address: 'Bandra, Mumbai', coordinates: { latitude: 19.0596, longitude: 72.8295 } },
      'delhi': { address: 'Delhi, India', coordinates: { latitude: 28.6139, longitude: 77.209 } },
    };

    const lowerLocation = rawLocation?.toLowerCase() || '';
    for (const [key, location] of Object.entries(mockLocations)) {
      if (lowerLocation.includes(key)) {
        result = {
          verified: true,
          address: location.address,
          coordinates: location.coordinates,
          confidence: 95,
          verificationMethod: 'GEOCODING',
        };
        break;
      }
    }

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[LOCATION-VERIFICATION] Error verifying location:", error);
    res.status(500).json({ error: "Failed to verify location" });
  }
});

// ============================================
// TIER 2 API ROUTES - SOS CALL (U11)
// ============================================

app.post("/api/sos-call", (req, res) => {
  try {
    const { latitude, longitude, address, emergencyContacts } = req.body;

    if (!latitude || !longitude || !address) {
      return res.status(400).json({ error: "latitude, longitude, and address are required" });
    }

    const sosId = `SOS-${Date.now()}`;

    const sosEvent = {
      sosId,
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      address,
      emergencyContacts: emergencyContacts || [],
      callStatus: 'DIALING',
      smsNotificationsSent: emergencyContacts?.length || 0,
      locationShared: true,
      eta: Math.floor(Math.random() * 8) + 3,
    };

    console.log(`[SOS] Initiated SOS call at ${address}`);
    
    if (emergencyContacts && emergencyContacts.length > 0) {
      emergencyContacts.forEach((contact) => {
        console.log(`[SOS] SMS sent to ${contact.name}: Location shared`);
      });
    }

    broadcastToDashboard({
      type: 'sos-initiated',
      data: sosEvent,
    });

    res.status(200).json({
      success: true,
      ...sosEvent,
    });
  } catch (error) {
    console.error("[SOS] Error initiating SOS call:", error);
    res.status(500).json({ error: "Failed to initiate SOS call" });
  }
});

// ============================================
// TIER 2 API ROUTES - SYMPTOM CHECKER (U1)
// ============================================

app.post("/api/symptom-decision", (req, res) => {
  try {
    const { primarySymptom, answers } = req.body;

    if (!primarySymptom) {
      return res.status(400).json({ error: "primarySymptom is required" });
    }

    const conditions = {
      'chest pain': {
        name: 'Chest Pain',
        decision: 'CALL_112',
        severity: 'CRITICAL',
        redFlags: ['chest pain', 'breathing difficulty', 'radiating pain'],
      },
      'breathing': {
        name: 'Difficulty Breathing',
        decision: 'CALL_112',
        severity: 'CRITICAL',
        redFlags: ['unable to breathe', 'gasping'],
      },
      'bleeding': {
        name: 'Severe Bleeding',
        decision: 'CALL_112',
        severity: 'HIGH',
        redFlags: ['gushing blood', 'heavy bleeding'],
      },
      'headache': {
        name: 'Severe Headache',
        decision: 'SEE_DOCTOR',
        severity: 'MEDIUM',
        redFlags: ['worst headache ever', 'stiff neck'],
      },
      'cold': {
        name: 'Common Cold',
        decision: 'SELF_CARE',
        severity: 'LOW',
        redFlags: [],
      },
    };

    const lowerSymptom = primarySymptom.toLowerCase();
    let matchedCondition = Object.entries(conditions).find(([key]) => 
      lowerSymptom.includes(key) || key.includes(lowerSymptom.split(' ')[0])
    );

    const condition = matchedCondition ? matchedCondition[1] : conditions['cold'];

    let decision = condition.decision;
    const redFlagAnswers = Object.values(answers || {}).map(v => (v || '').toString().toLowerCase());
    const foundRedFlag = condition.redFlags.some(flag => 
      redFlagAnswers.some(answer => answer.includes(flag.split(' ')[0]))
    );

    if (foundRedFlag && decision !== 'CALL_112') {
      decision = 'CALL_112';
    }

    const reasoning = 
      decision === 'CALL_112' 
        ? `${condition.name} may require emergency care. Call 112 to be safe.`
        : decision === 'SEE_DOCTOR'
        ? `${condition.name} should be evaluated by a doctor.`
        : `${condition.name} can usually be managed with self-care.`;

    res.status(200).json({
      success: true,
      decision,
      condition: {
        name: condition.name,
        severity: condition.severity,
      },
      reasoning,
      resources: [
        { type: 'PHONE', label: 'Emergency: 112', value: '112' },
      ],
    });
  } catch (error) {
    console.error("[SYMPTOM-CHECKER] Error making decision:", error);
    res.status(500).json({ error: "Failed to make symptom decision" });
  }
});

// ============================================
// TIER 3 API ROUTES - AUTONOMOUS FEATURES
// ============================================

// ============================================
// TIER 3 - A6: SENTIMENT ANALYSIS
// ============================================
app.post("/api/analyze-sentiment", (req, res) => {
  try {
    const { callId, transcript, voiceMetrics } = req.body;

    // Simulate emotion analysis
    const emotionKeywords = {
      panic: ['panic', 'help', 'dying', 'please', 'hurry'],
      worry: ['worried', 'concerned', 'scared', 'nervous'],
      calmness: ['calm', 'fine', 'okay', 'stable'],
      anger: ['angry', 'frustrated', 'mad'],
      confusion: ['confused', 'what', 'unclear', 'understand'],
    };

    const emotionScores = {
      panic: 0,
      worry: 0,
      calmness: 0,
      anger: 0,
      confusion: 0,
    };

    const lowerTranscript = transcript.toLowerCase();
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const matches = keywords.filter(k => lowerTranscript.includes(k)).length;
      emotionScores[emotion] = Math.min(100, matches * 20);
    }

    const dominantEmotion = Object.entries(emotionScores)
      .sort(([,a], [,b]) => b - a)[0][0];
    const stressLevel = emotionScores.panic > 60 ? 'critical' : 
                       emotionScores.panic > 45 ? 'high' :
                       emotionScores.worry > 50 ? 'moderate' : 'low';
    const riskScore = Math.round((emotionScores.panic * 0.4 + emotionScores.worry * 0.3 + 
                                 emotionScores.confusion * 0.2 + emotionScores.anger * 0.1));

    broadcastToDashboard({
      type: 'sentiment-update',
      data: {
        callId,
        emotionScores,
        dominantEmotion,
        stressLevel,
        riskScore,
        timestamp: new Date().toISOString(),
      }
    });

    res.status(200).json({
      success: true,
      emotionScores,
      dominantEmotion,
      stressLevel,
      riskScore,
      confidence: 88,
      recommendation: stressLevel === 'critical' ? 
        '😨 HIGH STRESS: Recommend calming techniques and reassurance' :
        '✅ Monitor situation and continue support'
    });
  } catch (error) {
    console.error("[SENTIMENT-ANALYSIS] Error:", error);
    res.status(500).json({ error: "Sentiment analysis failed" });
  }
});

// ============================================
// TIER 3 - A9: CONTINUOUS MONITORING
// ============================================
app.post("/api/continuous-monitor", (req, res) => {
  try {
    const { callId, currentSeverity, previousSeverity, symptoms } = req.body;

    const delta = currentSeverity - previousSeverity;
    const trend = delta > 5 ? 'escalating' : delta < -5 ? 'de-escalating' : 'stable';
    const escalationTriggered = currentSeverity > 85 || delta > 20;

    broadcastToDashboard({
      type: 'monitoring-update',
      data: {
        callId,
        currentSeverity,
        delta,
        trend,
        escalationTriggered,
        timestamp: new Date().toISOString(),
      }
    });

    res.status(200).json({
      success: true,
      currentSeverity,
      delta,
      trend,
      escalationTriggered,
      escalationReason: escalationTriggered ? 
        `Severity ${delta > 0 ? 'increased' : 'changed'} significantly` : null,
      nextReassessmentIn: 10000,
    });
  } catch (error) {
    console.error("[CONTINUOUS-MONITOR] Error:", error);
    res.status(500).json({ error: "Monitoring failed" });
  }
});

// ============================================
// TIER 3 - O4: COMPLEXITY PREDICTION
// ============================================
app.post("/api/predict-complexity", (req, res) => {
  try {
    const { callId, symptoms, age, severity } = req.body;

    // Simple complexity scoring
    let score = severity || 50;
    score += symptoms?.length * 5 || 0;
    if (age > 70 || age < 5) score += 15;
    score = Math.min(100, score);

    const level = score < 30 ? 'SIMPLE' : score < 60 ? 'MODERATE' : score < 85 ? 'COMPLEX' : 'CRITICAL';
    const estimatedTime = level === 'SIMPLE' ? 180 : level === 'MODERATE' ? 420 : level === 'COMPLEX' ? 900 : 1800;
    const operatorLevel = level === 'SIMPLE' ? 'JUNIOR' : level === 'MODERATE' ? 'SENIOR' : level === 'COMPLEX' ? 'EXPERT' : 'SUPERVISOR';

    broadcastToDashboard({
      type: 'complexity-update',
      data: {
        callId,
        level,
        score,
        estimatedTime,
        operatorLevel,
        timestamp: new Date().toISOString(),
      }
    });

    res.status(200).json({
      success: true,
      level,
      score,
      estimatedTime,
      recommendedOperatorLevel: operatorLevel,
      confidence: 85,
    });
  } catch (error) {
    console.error("[COMPLEXITY-PREDICTION] Error:", error);
    res.status(500).json({ error: "Complexity prediction failed" });
  }
});

// ============================================
// TIER 3 - O5: RESOURCE OPTIMIZATION
// ============================================
app.post("/api/optimize-resources", (req, res) => {
  try {
    const { callId, incidentLocation, caseRequirements } = req.body;

    // Mock facility selection
    const facilities = [
      { id: 'h1', name: 'Central Medical Hospital', distance: 2.3, eta: 12, quality: 5, score: 92 },
      { id: 'h2', name: 'Eastside Trauma Center', distance: 3.1, eta: 16, quality: 5, score: 85 },
      { id: 'h3', name: 'St. Mary Health Center', distance: 4.2, eta: 22, quality: 4, score: 72 },
    ];

    broadcastToDashboard({
      type: 'resource-recommendation',
      data: {
        callId,
        primaryFacility: facilities[0],
        costEstimate: 4200,
        timestamp: new Date().toISOString(),
      }
    });

    res.status(200).json({
      success: true,
      primaryFacility: facilities[0],
      secondaryFacility: facilities[1],
      tertiaryFacility: facilities[2],
      costEstimate: 4200,
      dispatchRecommendation: `Dispatch to ${facilities[0].name} (ETA: ${facilities[0].eta} min)`,
    });
  } catch (error) {
    console.error("[RESOURCE-OPTIMIZATION] Error:", error);
    res.status(500).json({ error: "Resource optimization failed" });
  }
});

// ============================================
// TIER 3 - O8: NATURAL LANGUAGE COMMANDS
// ============================================
app.post("/api/execute-nlp-command", (req, res) => {
  try {
    const { callId, rawCommand } = req.body;

    const normalized = rawCommand.toLowerCase();
    let intent = 'unknown';
    let confidence = 50;

    if (normalized.includes('escalate') || normalized.includes('critical')) {
      intent = 'escalate';
      confidence = 95;
    } else if (normalized.includes('dispatch') || normalized.includes('send')) {
      intent = 'action';
      confidence = 90;
    } else if (normalized.includes('note') || normalized.includes('add')) {
      intent = 'note';
      confidence = 88;
    } else if (normalized.includes('status') || normalized.includes('what')) {
      intent = 'query';
      confidence = 85;
    }

    broadcastToDashboard({
      type: 'nlp-command-executed',
      data: {
        callId,
        intent,
        confidence,
        command: rawCommand,
        timestamp: new Date().toISOString(),
      }
    });

    res.status(200).json({
      success: true,
      parsedIntent: intent,
      confidence,
      executed: true,
      executionStatus: 'success',
    });
  } catch (error) {
    console.error("[NLP-COMMAND] Error:", error);
    res.status(500).json({ error: "NLP command execution failed" });
  }
});

// ============================================
// TIER 3 - O9: CALL TRANSCRIPTION
// ============================================
app.post("/api/transcribe-call", (req, res) => {
  try {
    const { callId, speaker, text, timestamp } = req.body;

    // Extract red flags from transcript
    const redFlags = [];
    const criticalWords = ['unconscious', 'not breathing', 'cardiac arrest', 'severe bleeding'];
    for (const word of criticalWords) {
      if (text.toLowerCase().includes(word)) {
        redFlags.push(word);
      }
    }

    broadcastToDashboard({
      type: 'transcription-segment',
      data: {
        callId,
        segment: {
          speaker,
          text,
          timestamp,
          redFlags,
          confidence: 0.94,
        }
      }
    });

    res.status(200).json({
      success: true,
      transcribed: true,
      confidence: 0.94,
      redFlags,
      summary: `${speaker}: ${text.substring(0, 100)}...`,
    });
  } catch (error) {
    console.error("[TRANSCRIPTION] Error:", error);
    res.status(500).json({ error: "Transcription failed" });
  }
});

// ============================================
// TIER 3 - A2: AUTONOMOUS MODE CONTROL
// ============================================
app.post("/api/set-autonomous-mode", (req, res) => {
  try {
    const { callId, feature, mode, confidenceThreshold } = req.body;

    broadcastToDashboard({
      type: 'autonomous-mode-change',
      data: {
        callId,
        feature,
        mode,
        threshold: confidenceThreshold,
        timestamp: new Date().toISOString(),
      }
    });

    res.status(200).json({
      success: true,
      feature,
      mode,
      confidenceThreshold,
      message: `${feature} set to ${mode} mode`,
    });
  } catch (error) {
    console.error("[AUTONOMOUS-MODE] Error:", error);
    res.status(500).json({ error: "Autonomous mode change failed" });
  }
});

app.get("/api/autonomous-status", (req, res) => {
  try {
    const { callId } = req.query;

    res.status(200).json({
      success: true,
      globalMode: 'MANUAL',
      features: [
        { feature: 'sentiment-analysis', mode: 'AUTONOMOUS', enabled: true },
        { feature: 'continuous-monitoring', mode: 'AUTONOMOUS', enabled: true },
        { feature: 'complexity-prediction', mode: 'AUTONOMOUS', enabled: true },
        { feature: 'resource-optimization', mode: 'MANUAL', enabled: true },
        { feature: 'natural-language-commands', mode: 'AUTONOMOUS', enabled: true },
        { feature: 'transcription', mode: 'AUTONOMOUS', enabled: true },
      ],
      autonomousDecisions: 28,
      manualDecisions: 7,
      averageConfidence: 83,
    });
  } catch (error) {
    console.error("[AUTONOMOUS-STATUS] Error:", error);
    res.status(500).json({ error: "Status retrieval failed" });
  }
});

// ============================================
// TIER 3 - THINKING PROCESS TRANSPARENCY
// ============================================
app.post("/api/thinking-process", (req, res) => {
  try {
    const { callId, decision, factors, confidence } = req.body;

    broadcastToDashboard({
      type: 'thinking-process-update',
      data: {
        callId,
        decision,
        factors,
        confidence,
        timestamp: new Date().toISOString(),
      }
    });

    res.status(200).json({
      success: true,
      decision,
      factors,
      confidence,
      reasoning: `Decision made with ${confidence}% confidence based on ${factors?.length} factors`,
    });
  } catch (error) {
    console.error("[THINKING-PROCESS] Error:", error);
    res.status(500).json({ error: "Thinking process logging failed" });
  }
});

// ============================================
wss.on("connection", (ws, req) => {
  // Determine client type based on query parameter
  const clientType = new URL(
    req.url,
    `http://${req.headers.host}`,
  ).searchParams.get("type");

  // Add client to appropriate group
  if (clientType === "dashboard") {
    clients.dashboard.add(ws);
    console.log("Dashboard client connected");
  } else if (clientType === "mobile-app") {
    clients.mobileApps.add(ws);
    console.log("Mobile app client connected");
  }

  // Message handling
  ws.on("message", (message) => {
    try {
      const parsedMessage = JSON.parse(message);

      // Determine message source and broadcast accordingly
      if (clientType === "dashboard") {
        // Broadcast dashboard message to mobile apps
        broadcastToMobileApps({
          type: "dashboard-update",
          data: parsedMessage,
        });
      } else if (clientType === "mobile-app") {
        // Broadcast mobile app message to dashboard
        broadcastToDashboard({
          type: "mobile-app-update",
          data: parsedMessage,
        });
      }
    } catch (error) {
      console.error("Message parsing error:", error);
    }
  });

  // Connection close handler
  ws.on("close", () => {
    if (clientType === "dashboard") {
      clients.dashboard.delete(ws);
    } else if (clientType === "mobile-app") {
      clients.mobileApps.delete(ws);
    }
  });
});

// Broadcast utility functions
function broadcastToDashboard(message) {
  clients.dashboard.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) { // Now WebSocket is properly defined
      console.log("Broadcasting to dashboard");
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastToMobileApps(message) {
  clients.mobileApps.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) { // Now WebSocket is properly defined
      client.send(JSON.stringify(message));
    }
  });
}

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});