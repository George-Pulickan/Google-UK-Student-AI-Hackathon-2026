import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser for JSON with large payload limit for base64 webcam frames
app.use(express.json({ limit: '15mb' }));

// Lazy init for Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is missing in process.env');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Evaluate Sign Language Gesture Endpoint
app.post('/api/evaluate-sign', async (req, res) => {
  try {
    const { imageBase64, targetSign, mascotName } = req.body;

    if (!targetSign || !targetSign.id) {
      return res.status(400).json({ error: 'Missing targetSign parameter.' });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 parameter.' });
    }

    // Clean base64 string and extract mime type
    let mimeType = 'image/jpeg';
    let rawBase64 = imageBase64;

    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '') || 'image/jpeg';
      rawBase64 = parts[1];
    }

    const systemInstruction = `You are "SignBuddy", a friendly, highly encouraging AI Sign Language Tutor and Mascot Controller for an educational mobile app.
YOUR PURPOSE:
Analyze the provided image (webcam or mobile camera frame) where a user attempts a specific sign language gesture.
Compare their hand shape, finger positioning, palm orientation, and spatial arrangement against the expected target sign provided in the user's prompt.
Return a deterministic JSON payload evaluating their execution and instructing the frontend application on how to animate the user's customized mascot avatar.

EVALUATION RULES:
Be lenient with camera angle, lighting, and minor framing differences, but strict with core physical form (e.g., distinguishing between an open palm, a fist, or extended index fingers).
If the gesture matches (is_correct: true): Celebrate enthusiastically! Assign an accuracy score between 80-100.
If the gesture fails (is_correct: false): Be constructive. Assign a score below 75 and provide 1 specific, physical correction tip (e.g., "Extend your thumb outward", "Fold your middle fingers down").

AVATAR CONTROL RULES:
Configure the response object 'avatar_reaction' so the frontend can drive 2D/3D mascot state.
Choose 'expression' strictly from: ["HAPPY", "CHEERING", "THINKING", "SHOWING_CORRECT_SIGN", "CONFUSED"].
Choose 'animation_trigger' strictly from: ["jump_celebrate", "demonstrate_sign", "idle_confused", "dance_happy"].
Tailor the 'dialogue_bubble' to sound like an energetic coach named "${mascotName || 'Buddy'}" speaking directly to the user.

STRICT FORMATTING RULE:
Output valid JSON ONLY adhering strictly to the provided response schema. Do not enclose in markdown blocks unless requested, and never output natural language outside the JSON object.`;

    const promptText = `Target sign to evaluate: "${targetSign.label}" (ID: ${targetSign.id}).
Category: ${targetSign.category}
Expected physical form description: ${targetSign.description}
Hand shape detail: ${targetSign.handShapeDescription}

Carefully inspect the hand in the image.
1. Identify if a hand is visible and what gesture/handshape it forms.
2. Compare with target "${targetSign.label}".
3. Decide is_correct (true/false) and accuracy_score (0-100).
4. Provide feedback_tip and avatar_reaction.`;

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: rawBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_correct: { type: Type.BOOLEAN },
            accuracy_score: {
              type: Type.NUMBER,
              description: 'Score between 0 and 100.',
            },
            feedback_tip: {
              type: Type.STRING,
              description: 'Specific physical correction tip or praise.',
            },
            detected_gesture: {
              type: Type.STRING,
              description: 'Brief description of detected hand gesture.',
            },
            avatar_reaction: {
              type: Type.OBJECT,
              properties: {
                expression: {
                  type: Type.STRING,
                  enum: ['HAPPY', 'CHEERING', 'THINKING', 'SHOWING_CORRECT_SIGN', 'CONFUSED'],
                },
                animation_trigger: {
                  type: Type.STRING,
                  enum: ['jump_celebrate', 'demonstrate_sign', 'idle_confused', 'dance_happy'],
                },
                dialogue_bubble: {
                  type: Type.STRING,
                  description: 'Coaching phrase from mascot.',
                },
              },
              required: ['expression', 'animation_trigger', 'dialogue_bubble'],
            },
          },
          required: ['is_correct', 'accuracy_score', 'feedback_tip', 'avatar_reaction'],
        },
      },
    });

    const responseText = response.text || '';
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText.trim());
    } catch (parseErr) {
      console.error('Failed to parse JSON from Gemini:', responseText);
      parsedResult = {
        is_correct: false,
        accuracy_score: 60,
        feedback_tip: 'Position your hand clearly in front of the camera and try again!',
        detected_gesture: 'Unclear hand shape',
        avatar_reaction: {
          expression: 'CONFUSED',
          animation_trigger: 'idle_confused',
          dialogue_bubble: "Hmm, I couldn't quite see your hand clearly! Try centering your hand in the frame!",
        },
      };
    }

    // Return evaluated JSON
    return res.json({
      ...parsedResult,
      target_sign: targetSign.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error evaluating sign gesture:', error);
    return res.status(500).json({
      error: 'Failed to evaluate sign language gesture.',
      details: error?.message || String(error),
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SignBuddy Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
