import { HandLandmark } from '../types';

/** MediaPipe hand topology: 21 landmarks wired into five digits plus a palm arch. */
export const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],            // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],            // index
  [5, 9], [9, 10], [10, 11], [11, 12],       // middle
  [9, 13], [13, 14], [14, 15], [15, 16],     // ring
  [13, 17], [17, 18], [18, 19], [19, 20],    // pinky
  [0, 17],                                   // palm base
];

export const LANDMARK_LABELS = [
  'wrist',
  'thumb base', 'thumb knuckle', 'thumb joint', 'thumb tip',
  'index base', 'index knuckle', 'index joint', 'index tip',
  'middle base', 'middle knuckle', 'middle joint', 'middle tip',
  'ring base', 'ring knuckle', 'ring joint', 'ring tip',
  'pinky base', 'pinky knuckle', 'pinky joint', 'pinky tip',
];

export interface DrawSkeletonOptions {
  /** Flip horizontally — needed when painting over a mirrored webcam feed. */
  mirrored?: boolean;
  /** Landmark indices to render as wrong (red). */
  wrong?: Set<number> | number[];
  /** Paint non-flagged joints green rather than the neutral live palette. */
  markCorrect?: boolean;
  /** Overall scale factor for strokes and joints. */
  scale?: number;
  /** 0-1 opacity for the whole skeleton. */
  opacity?: number;
}

/**
 * Depth cue: MediaPipe reports z relative to the wrist, negative meaning
 * closer to the camera. Mapping it onto stroke width and lightness is what
 * makes a flat 2D polyline read as a 3D armature.
 */
function depthFactor(z: number): number {
  // z typically lands within roughly ±0.12 for a hand at arm's length.
  const clamped = Math.max(-0.12, Math.min(0.12, z || 0));
  return 1 - clamped / 0.12; // ~2 = nearest, ~0 = furthest
}

/**
 * Renders the hand armature onto a 2D context.
 * `landmarks` are normalised (0-1); the context is expected to be sized in pixels.
 */
export function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmark[],
  width: number,
  height: number,
  options: DrawSkeletonOptions = {}
) {
  if (!landmarks || landmarks.length < 21) return;

  const { mirrored = false, markCorrect = false, scale = 1, opacity = 1 } = options;
  const wrong = options.wrong instanceof Set ? options.wrong : new Set(options.wrong ?? []);

  const px = (p: HandLandmark) => ({
    x: (mirrored ? 1 - p.x : p.x) * width,
    y: p.y * height,
    d: depthFactor(p.z),
  });
  const pts = landmarks.map(px);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- Bones -------------------------------------------------------------
  for (const [a, b] of HAND_CONNECTIONS) {
    const p1 = pts[a];
    const p2 = pts[b];
    if (!p1 || !p2) continue;

    const depth = (p1.d + p2.d) / 2;
    const isWrong = wrong.has(a) || wrong.has(b);
    const lineWidth = (2.2 + depth * 2.6) * scale;

    // Nearer bones are brighter; further ones recede into the background.
    const light = Math.round(45 + depth * 22);
    const hue = isWrong ? 352 : markCorrect ? 152 : 190;
    const sat = isWrong ? 90 : markCorrect ? 70 : 95;

    // Soft outer glow gives the limb volume.
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.28)`;
    ctx.lineWidth = lineWidth * 2.6;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
    grad.addColorStop(0, `hsl(${hue}, ${sat}%, ${Math.round(38 + p1.d * 26)}%)`);
    grad.addColorStop(1, `hsl(${hue}, ${sat}%, ${Math.round(38 + p2.d * 26)}%)`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Specular highlight along the top edge of the bone.
    ctx.strokeStyle = `hsla(${hue}, 100%, 88%, ${0.16 + depth * 0.2})`;
    ctx.lineWidth = Math.max(0.6, lineWidth * 0.32);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y - lineWidth * 0.22);
    ctx.lineTo(p2.x, p2.y - lineWidth * 0.22);
    ctx.stroke();
  }

  // --- Joints ------------------------------------------------------------
  landmarks.forEach((_, i) => {
    const p = pts[i];
    if (!p) return;

    const isWrong = wrong.has(i);
    const isTip = [4, 8, 12, 16, 20].includes(i);
    const base = (isTip ? 4.4 : 3.4) + p.d * 2.2;
    const r = base * scale * (isWrong ? 1.35 : 1);

    const hue = isWrong ? 352 : markCorrect ? 152 : 190;
    const sat = isWrong ? 92 : markCorrect ? 72 : 92;

    if (isWrong) {
      // Halo so bad joints are unmissable on a busy webcam frame.
      ctx.fillStyle = 'hsla(352, 92%, 55%, 0.22)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    const g = ctx.createRadialGradient(
      p.x - r * 0.35, p.y - r * 0.35, r * 0.15,
      p.x, p.y, r
    );
    g.addColorStop(0, `hsl(${hue}, 100%, 88%)`);
    g.addColorStop(0.55, `hsl(${hue}, ${sat}%, ${Math.round(52 + p.d * 12)}%)`);
    g.addColorStop(1, `hsl(${hue}, ${sat}%, ${Math.round(30 + p.d * 10)}%)`);

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `hsla(${hue}, 100%, 96%, ${isWrong ? 0.95 : 0.5})`;
    ctx.lineWidth = 1.1 * scale;
    ctx.stroke();
  });

  ctx.restore();
}

/** Axis-aligned bounds of the hand in normalised coords. */
export function landmarkBounds(landmarks: HandLandmark[]) {
  const xs = landmarks.map((p) => p.x);
  const ys = landmarks.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX, maxX, minY, maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Mean per-landmark displacement between two frames, in normalised units.
 * Used to tell "hand held still" from "hand still moving".
 */
export function landmarkMotion(a: HandLandmark[] | null, b: HandLandmark[] | null): number {
  if (!a || !b || a.length !== b.length || !a.length) return Infinity;
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    total += Math.hypot(dx, dy);
  }
  return total / a.length;
}
