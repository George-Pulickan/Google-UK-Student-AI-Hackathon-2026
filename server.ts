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

// Vertex AI config. Auth uses Application Default Credentials — run
// `gcloud auth application-default login` locally; no API key required.
const GCP_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GCP_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-tts';
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

// Lazy init for Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!GCP_PROJECT) {
      console.warn('GOOGLE_CLOUD_PROJECT is missing in process.env');
    }
    aiClient = new GoogleGenAI({
      vertexai: true,
      project: GCP_PROJECT,
      location: GCP_LOCATION,
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

/* ------------------------------------------------------------------ *
 * Hand landmark helpers
 * MediaPipe hand model emits 21 points; these are the human-readable
 * names we hand to Gemini so it can name the joints it thinks are wrong.
 * ------------------------------------------------------------------ */
const LANDMARK_NAMES = [
  'wrist',
  'thumb_cmc', 'thumb_mcp', 'thumb_ip', 'thumb_tip',
  'index_mcp', 'index_pip', 'index_dip', 'index_tip',
  'middle_mcp', 'middle_pip', 'middle_dip', 'middle_tip',
  'ring_mcp', 'ring_pip', 'ring_dip', 'ring_tip',
  'pinky_mcp', 'pinky_pip', 'pinky_dip', 'pinky_tip',
];

function describeLandmarks(landmarks: Array<{ x: number; y: number; z: number }>): string {
  if (!Array.isArray(landmarks) || landmarks.length !== 21) return '';
  return landmarks
    .map((p, i) => `${i}:${LANDMARK_NAMES[i]}=(${p.x.toFixed(3)},${p.y.toFixed(3)},${(p.z ?? 0).toFixed(3)})`)
    .join(' ');
}

// Evaluate Sign Language Gesture Endpoint
app.post('/api/evaluate-sign', async (req, res) => {
  try {
    const { imageBase64, targetSign, mascotName, signSystem, landmarks } = req.body;

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
    const landmarkText = describeLandmarks(landmarks);

    const systemInstruction = `You are "SignBuddy", an expert AI Sign Language Tutor and Mascot Controller for an educational app.
YOUR PURPOSE:
Analyze the provided image (webcam or uploaded frame) where a student attempts a sign language gesture in ${currentSystem} (${currentSystem === 'BSL' ? 'British Sign Language' : 'American Sign Language'}).
Compare their hand shape, finger positioning, palm orientation, and spatial arrangement against the expected target sign "${targetSign.label}".

IMPORTANT DIAGNOSTIC FEATURE:
1. Identify EXACTLY what hand gesture the student is performing.
2. IF the student is accidentally signing a DIFFERENT sign (e.g., they are making the sign for 'Letter X' or 'Letter A' or 'Open Palm' instead of 'Letter C'), explicitly set 'misidentified_sign' to that sign name (e.g. "Letter X").
3. Provide step-by-step 'positioning_advice' explaining how to adjust their fingers/hand from what they are currently doing to achieve the correct target sign "${targetSign.label}".

SKELETON DIAGNOSIS:
The app tracks 21 hand landmarks (MediaPipe ordering, normalised 0-1 image coords, origin top-left):
0 wrist | 1-4 thumb (cmc, mcp, ip, tip) | 5-8 index (mcp, pip, dip, tip) | 9-12 middle | 13-16 ring | 17-20 pinky.
Populate 'incorrect_landmarks' with the INDICES (0-20) of the joints that are positioned wrongly for the target sign, so the app can paint those joints red on the student's skeleton.
- If the sign is correct, return an empty array.
- Only flag joints you are genuinely confident are misplaced — typically 2 to 8 of them, concentrated on the fingers that are wrong.
- Prefer flagging fingertips and the PIP/DIP joints of the offending fingers rather than the whole hand.

AVATAR CONTROL RULES:
Configure 'avatar_reaction' object:
- 'expression' strictly from: ["HAPPY", "CHEERING", "THINKING", "SHOWING_CORRECT_SIGN", "CONFUSED"].
- 'animation_trigger' strictly from: ["jump_celebrate", "demonstrate_sign", "idle_confused", "dance_happy"].
- 'dialogue_bubble': Energetic coaching phrase from "${mascotName || 'Buddy'}". If they signed the wrong letter, mention it encouragingly in dialogue! (e.g., "I see you're doing Letter X! To make Letter C, unhook that index finger and curve your whole hand into an arch!")
Keep 'dialogue_bubble' to at most 2 short sentences — it is read aloud by a text-to-speech voice.

EVALUATION RULES:
- Be lenient with lighting/backgrounds, but precise with finger placement and posture.
- If the gesture matches target (is_correct: true): Celebrate! Assign score 80-100.
- If the gesture fails (is_correct: false): Assign score below 75, populate 'misidentified_sign' if recognizable, and give actionable 'positioning_advice'.`;

    const promptText = `Sign Language System: ${currentSystem}
Target Sign: "${targetSign.label}" (ID: ${targetSign.id}).
Category: ${targetSign.category}
Description: ${targetSign.description}
Hand shape detail: ${targetSign.handShapeDescription}
${landmarkText ? `\nDetected hand landmarks for this frame:\n${landmarkText}` : '\nNo hand landmarks were detected for this frame.'}

Carefully analyze the image:
1. Identify visible hand gesture & name it in 'detected_gesture'.
2. Is it the correct "${targetSign.label}"? Set is_correct and accuracy_score (0-100).
3. If incorrect and resembles another sign (e.g., Letter X instead of C), set 'misidentified_sign'.
4. Provide detailed 'positioning_advice' on how to physically re-position fingers.
5. Set 'incorrect_landmarks' to the indices of the misplaced joints.
6. Provide avatar_reaction and feedback_tip.`;

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        role: 'user',
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
            incorrect_landmarks: {
              type: Type.ARRAY,
              description: 'Indices (0-20) of hand landmarks that are positioned incorrectly. Empty when the sign is correct.',
              items: { type: Type.NUMBER },
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
        incorrect_landmarks: [],
        avatar_reaction: {
          expression: 'CONFUSED',
          animation_trigger: 'idle_confused',
          dialogue_bubble: "Hmm, I couldn't quite see your hand clearly! Try centering your hand in the frame!",
        },
      };
    }

    // Gemini sometimes emits the string "null" for the optional field
    if (parsedResult.misidentified_sign === 'null' || parsedResult.misidentified_sign === '') {
      parsedResult.misidentified_sign = null;
    }
    // Keep only in-range landmark indices so the overlay can trust them
    parsedResult.incorrect_landmarks = Array.isArray(parsedResult.incorrect_landmarks)
      ? parsedResult.incorrect_landmarks
          .map((n: any) => Number(n))
          .filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 20)
      : [];

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

/* ------------------------------------------------------------------ *
 * Gemini Text-to-Speech
 * The TTS models return raw signed 16-bit little-endian PCM, so we wrap
 * the stream in a RIFF header before handing it to the browser.
 * ------------------------------------------------------------------ */

function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // audio format = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// Delivery direction per mascot mood. Gemini TTS is steered with plain
// language rather than SSML, so these read like notes to a voice actor.
const TTS_STYLE_DIRECTION: Record<string, string> = {
  CHEERING:
    'Read this like an excited coach who just watched their student nail it. Bright and bubbly, grinning, a little breathless with pride. Push the energy up on the praise and let the last word ring.',
  HAPPY:
    'Read this warmly and encouragingly, with an audible smile. Relaxed pace, friendly and close-mic, like a favourite teacher leaning in.',
  THINKING:
    'Read this thoughtfully and a touch slower, like you are studying something closely. Curious, gentle, with a small considering pause before the advice.',
  SHOWING_CORRECT_SIGN:
    'Read this clearly and instructively, like demonstrating a technique. Lean on the action words, leave small beats between the steps so they are easy to follow.',
  CONFUSED:
    'Read this playfully puzzled but kind and reassuring. Soft, slightly amused, with a gentle rising lift at the end so it never sounds like a telling-off.',
};

// Non-verbal cues Gemini TTS honours inline; sprinkled in to break up the
// mechanical cadence you get from a bare sentence.
const TTS_FLOURISH: Record<string, string> = {
  CHEERING: '[laughs warmly] ',
  HAPPY: '',
  THINKING: '[thoughtful pause] ',
  SHOWING_CORRECT_SIGN: '',
  CONFUSED: '[chuckles softly] ',
};

app.post('/api/tts', async (req, res) => {
  try {
    const { text, expression, voiceName } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Missing text parameter.' });
    }

    const mood = String(expression || 'HAPPY').toUpperCase();
    const direction = TTS_STYLE_DIRECTION[mood] || TTS_STYLE_DIRECTION.HAPPY;
    const flourish = TTS_FLOURISH[mood] ?? '';
    const voice = typeof voiceName === 'string' && voiceName ? voiceName : 'Leda';

    // Style direction first, then the line itself — the documented steering
    // pattern for the Gemini TTS models.
    const prompt = `${direction}\nSpeak naturally, like a person talking, not like a screen reader.\n\n${flourish}${text.trim()}`;

    const ai = getGeminiClient();
    const response: any = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      } as any,
    });

    const inline = response?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData;
    if (!inline?.data) {
      return res.status(502).json({ error: 'No audio returned from the TTS model.' });
    }

    // mimeType looks like: audio/L16;codec=pcm;rate=24000
    const rateMatch = /rate=(\d+)/.exec(inline.mimeType || '');
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    const wav = pcmToWav(Buffer.from(inline.data, 'base64'), sampleRate);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(wav);
  } catch (error: any) {
    console.error('Error synthesising speech:', error);
    return res.status(500).json({
      error: 'Failed to synthesise speech.',
      details: error?.message || String(error),
    });
  }
});

/* ------------------------------------------------------------------ *
 * AI mascot generation (gemini-2.5-flash-image)
 * ------------------------------------------------------------------ */
app.post('/api/generate-mascot', async (req, res) => {
  try {
    const { prompt, name, animal, color, accessory, outfit } = req.body;

    const described = [
      animal ? `a friendly cartoon ${animal}` : 'a friendly cartoon animal',
      color ? `with ${color} coloured fur` : '',
      accessory && accessory !== 'none' ? `wearing ${String(accessory).replace(/_/g, ' ')}` : '',
      outfit ? `dressed in a ${String(outfit).replace(/_/g, ' ')}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    const fullPrompt =
      (prompt && String(prompt).trim()) ||
      `A cheerful mascot character for a children's sign language learning app: ${described}. ` +
        `The character is waving one hand in a friendly greeting. Flat vector illustration, bold clean outlines, ` +
        `bright saturated colours, soft rounded shapes, centered full-body character, plain white background, ` +
        `no text, no letters, no watermark. Kid-friendly and approachable.`;

    const ai = getGeminiClient();
    const response: any = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      config: { responseModalities: ['IMAGE'] } as any,
    });

    const parts = response?.candidates?.[0]?.content?.parts ?? [];
    const image = parts.find((p: any) => p.inlineData)?.inlineData;
    if (!image?.data) {
      return res.status(502).json({ error: 'No image returned from the model.' });
    }

    return res.json({
      imageDataUrl: `data:${image.mimeType || 'image/png'};base64,${image.data}`,
      name: name || 'Buddy',
      prompt: fullPrompt,
    });
  } catch (error: any) {
    console.error('Error generating mascot:', error);
    return res.status(500).json({
      error: 'Failed to generate mascot image.',
      details: error?.message || String(error),
    });
  }
});

/* ------------------------------------------------------------------ *
 * "Any Sign" — pseudo A2UI endpoint
 *
 * Rather than returning prose that the client has to guess how to lay
 * out, the model returns a small declarative surface: an ordered list of
 * typed components that the client renders generically. That is the core
 * idea behind Google's A2UI (agent-to-UI) work, scoped down to the
 * handful of primitives this app actually needs.
 * ------------------------------------------------------------------ */
const A2UI_COMPONENTS = ['heading', 'text', 'callout', 'steps', 'chips', 'stat', 'comparison'] as const;

app.post('/api/any-sign', async (req, res) => {
  try {
    const { imageBase64, signSystem, question, mascotName } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 parameter.' });
    }

    let mimeType = 'image/jpeg';
    let rawBase64 = imageBase64;
    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '') || 'image/jpeg';
      rawBase64 = parts[1];
    }

    const currentSystem = signSystem || 'ASL';

    const systemInstruction = `You are "SignBuddy", an expert ${currentSystem} sign language interpreter driving a
declarative UI surface. You do NOT write markup or prose paragraphs. You decide what the answer panel
should contain, and the client renders it. This is an agent-to-UI (A2UI) contract.

YOU CHOOSE THE LAYOUT via 'layout': an ordered list of block names, 3 to 6 entries, no repeats.
Available blocks and the field that fills each one:
  "heading"    <- heading_text        Name of the sign. Max 8 words.
  "stat"       <- confidence          Rendered as a confidence figure.
  "text"       <- summary_text        One short paragraph, max 30 words.
  "steps"      <- steps_items         How the sign is formed. 2-4 entries, each max 15 words.
  "chips"      <- chips_items         Related signs or handshape names. 2-5 entries, 1-3 words each.
  "comparison" <- comparison_items    Signs it could be mistaken for. 1-3 entries, each max 18 words,
                                      phrased "Looks like X — but Y".
  "callout"    <- callout_text        A single highlighted note, max 30 words. Set callout_tone.

RULES:
1. Identify whatever sign the person is making. It does NOT have to be in any curriculum —
   any letter, number, word, phrase, or common gesture is fair game.
2. Order 'layout' the way the panel should read. Usually: heading, stat, steps, then whatever else helps.
3. Only name a block in 'layout' if you have also filled its field. Never name a block twice.
4. If no hand is visible: layout is exactly ["callout"], callout_tone "warning", and say so in callout_text.
5. Fill ONLY the fields for blocks you listed. Leave the rest empty.
6. 'spoken_summary' is one or two sentences read aloud by ${mascotName || 'Buddy'} — friendly and conversational.`;

    const promptText = `Sign system: ${currentSystem}.
${question ? `The learner also asked: "${question}"` : 'Identify the sign being made and explain it.'}
Choose the layout and fill the matching content fields.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: rawBase64 } },
          { text: promptText },
        ],
      },
      config: {
        systemInstruction,
        temperature: 0.4,
        // Hard cap: without it a degenerate generation can run to hundreds of
        // kilobytes of repeated components and fail to parse. Sized with
        // headroom over the word limits in the system instruction.
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detected_sign: { type: Type.STRING, description: 'Name of the sign detected.' },
            confidence: { type: Type.NUMBER, description: 'Confidence 0-100.' },
            spoken_summary: { type: Type.STRING, description: 'One or two sentences to read aloud.' },
            layout: {
              type: Type.ARRAY,
              description: 'Ordered block names deciding the panel layout.',
              minItems: 1,
              maxItems: 6,
              items: { type: Type.STRING, enum: [...A2UI_COMPONENTS] },
            },
            heading_text: { type: Type.STRING, description: 'Fills the "heading" block.' },
            summary_text: { type: Type.STRING, description: 'Fills the "text" block.' },
            steps_items: {
              type: Type.ARRAY,
              description: 'Fills the "steps" block.',
              maxItems: 4,
              items: { type: Type.STRING },
            },
            chips_items: {
              type: Type.ARRAY,
              description: 'Fills the "chips" block.',
              maxItems: 5,
              items: { type: Type.STRING },
            },
            comparison_items: {
              type: Type.ARRAY,
              description: 'Fills the "comparison" block.',
              maxItems: 3,
              items: { type: Type.STRING },
            },
            callout_text: { type: Type.STRING, description: 'Fills the "callout" block.' },
            callout_tone: { type: Type.STRING, enum: ['info', 'success', 'warning', 'danger'] },
          },
          required: ['detected_sign', 'confidence', 'spoken_summary', 'layout'],
        },
      },
    });

    const raw = (response.text || '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('any-sign returned unparseable JSON (%d chars)', raw.length);
      return res.json({
        detected_sign: 'Unclear',
        confidence: 0,
        spoken_summary: "I couldn't read that one clearly — try again with your hand centred in the frame.",
        components: [
          {
            type: 'callout',
            tone: 'warning',
            text: "I couldn't get a clear read on that sign. Hold your hand steady in good light and try again.",
          },
        ],
        sign_system: currentSystem,
        timestamp: new Date().toISOString(),
      });
    }

    // Compose the render list from the layout the model chose. Blocks whose
    // content field came back empty are dropped rather than rendered blank.
    const nonEmpty = (v: any) => (Array.isArray(v) ? v.filter(Boolean).length > 0 : !!String(v ?? '').trim());
    const seen = new Set<string>();
    const components = (Array.isArray(parsed.layout) ? parsed.layout : [])
      .filter((name: string) => {
        if (!A2UI_COMPONENTS.includes(name as any) || seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .map((name: string) => {
        switch (name) {
          case 'heading':
            return nonEmpty(parsed.heading_text)
              ? { type: 'heading', text: parsed.heading_text }
              : null;
          case 'stat':
            return typeof parsed.confidence === 'number'
              ? {
                  type: 'stat',
                  label: 'Confidence',
                  value: `${Math.round(parsed.confidence)}%`,
                  tone: parsed.confidence >= 75 ? 'success' : parsed.confidence >= 45 ? 'info' : 'warning',
                }
              : null;
          case 'text':
            return nonEmpty(parsed.summary_text) ? { type: 'text', text: parsed.summary_text } : null;
          case 'steps':
            return nonEmpty(parsed.steps_items)
              ? { type: 'steps', title: 'How it is formed', items: parsed.steps_items.filter(Boolean) }
              : null;
          case 'chips':
            return nonEmpty(parsed.chips_items)
              ? { type: 'chips', title: 'Related', items: parsed.chips_items.filter(Boolean) }
              : null;
          case 'comparison':
            return nonEmpty(parsed.comparison_items)
              ? {
                  type: 'comparison',
                  title: 'Easily confused with',
                  items: parsed.comparison_items.filter(Boolean),
                }
              : null;
          case 'callout':
            return nonEmpty(parsed.callout_text)
              ? { type: 'callout', text: parsed.callout_text, tone: parsed.callout_tone || 'info' }
              : null;
          default:
            return null;
        }
      })
      .filter(Boolean);

    return res.json({
      detected_sign: parsed.detected_sign,
      confidence: parsed.confidence,
      spoken_summary: parsed.spoken_summary,
      components,
      sign_system: currentSystem,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error running any-sign detection:', error);
    return res.status(500).json({
      error: 'Failed to identify the sign.',
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
