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
    const { imageBase64, targetSign, mascotName, signSystem } = req.body;

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

    const currentSystem = signSystem || targetSign.system || 'ASL';

    const systemInstruction = `You are "SignBuddy", an expert AI Sign Language Tutor and Mascot Controller for an educational app.
YOUR PURPOSE:
Analyze the provided image (webcam or uploaded frame) where a student attempts a sign language gesture in ${currentSystem} (${currentSystem === 'BSL' ? 'British Sign Language' : 'American Sign Language'}).
Compare their hand shape, finger positioning, palm orientation, and spatial arrangement against the expected target sign "${targetSign.label}".

IMPORTANT DIAGNOSTIC FEATURE:
1. Identify EXACTLY what hand gesture the student is performing.
2. IF the student is accidentally signing a DIFFERENT sign (e.g., they are making the sign for 'Letter X' or 'Letter A' or 'Open Palm' instead of 'Letter C'), explicitly set 'misidentified_sign' to that sign name (e.g. "Letter X").
3. Provide step-by-step 'positioning_advice' explaining how to adjust their fingers/hand from what they are currently doing to achieve the correct target sign "${targetSign.label}".

EVALUATION RULES:
- Be lenient with lighting/backgrounds, but precise with finger placement and posture.
- If the gesture matches target (is_correct: true): Celebrate! Assign score 80-100.
- If the gesture fails (is_correct: false): Assign score below 75, populate 'misidentified_sign' if recognizable, and give actionable 'positioning_advice'.

AVATAR CONTROL RULES:
Configure 'avatar_reaction' object:
- 'expression' strictly from: ["HAPPY", "CHEERING", "THINKING", "SHOWING_CORRECT_SIGN", "CONFUSED"].
- 'animation_trigger' strictly from: ["jump_celebrate", "demonstrate_sign", "idle_confused", "dance_happy"].
- 'dialogue_bubble': Energetic coaching phrase from "${mascotName || 'Buddy'}". If they signed the wrong letter, mention it encouragingly in dialogue! (e.g., "I see you're doing Letter X! To make Letter C, unhook that index finger and curve your whole hand into an arch!")`;

    const promptText = `Sign Language System: ${currentSystem}
Target Sign: "${targetSign.label}" (ID: ${targetSign.id}).
Category: ${targetSign.category}
Description: ${targetSign.description}
Hand shape detail: ${targetSign.handShapeDescription}

Carefully analyze the image:
1. Identify visible hand gesture & name it in 'detected_gesture'.
2. Is it the correct "${targetSign.label}"? Set is_correct and accuracy_score (0-100).
3. If incorrect and resembles another sign (e.g., Letter X instead of C), set 'misidentified_sign'.
4. Provide detailed 'positioning_advice' on how to physically re-position fingers.
5. Provide avatar_reaction and feedback_tip.`;

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
              description: 'Description of detected hand gesture.',
            },
            misidentified_sign: {
              type: Type.STRING,
              description: 'Name of wrong sign if student performed a different gesture (e.g. "Letter X"). Null if correct or unknown.',
            },
            positioning_advice: {
              type: Type.STRING,
              description: 'Step-by-step physical advice on how to adjust positioning.',
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
        misidentified_sign: null,
        positioning_advice: 'Try holding your hand closer to the center of the camera frame.',
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
      sign_system: currentSystem,
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
