/**
 * Opens the front-facing webcam.
 *
 * Retries briefly because switching between the studio, quiz and Any Sign
 * views tears down one video element and builds another: the new view can ask
 * for the device before the old one has finished releasing it, and the browser
 * answers with NotReadableError / AbortError. A couple of short retries turn
 * that race into a non-event instead of a dead camera panel.
 */
export async function openCameraStream(attempts = 4, delayMs = 350): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: any) {
      lastError = err;
      // A denied permission will never succeed on retry — fail fast.
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') break;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * Waits for the <video> element to exist.
 *
 * StrictMode mounts, unmounts and remounts in development, so a stream
 * requested by the first mount can resolve while the ref is momentarily null
 * between the two. Discarding the stream at that point left the camera dead
 * with no error to show for it, so we wait for the element to come back
 * instead of throwing the stream away.
 */
export async function waitForVideoElement(
  get: () => HTMLVideoElement | null,
  timeoutMs = 800
): Promise<HTMLVideoElement | null> {
  const deadline = Date.now() + timeoutMs;
  let element = get();
  while (!element && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    element = get();
  }
  return element;
}
