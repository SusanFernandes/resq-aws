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

// WebSocket connection handler
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