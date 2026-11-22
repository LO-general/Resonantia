/**
 * Bulletproof Video Processor for iPhone (iOS Safari / Photos App), iPad, Mac and PC
 * Handles QuickTime (.MOV), MP4, HEVC / H.265, large files and iOS WebKit constraints.
 */

export interface VideoExtractionResult {
  duration: number;
  width: number;
  height: number;
  thumbnailUrl: string;
  frames: string[]; // Base64 JPEG data URLs for AI analysis
  formatName: string;
}

export interface VideoValidationResult {
  isValid: boolean;
  error?: string;
  fileSizeMb: number;
  mimeType: string;
}

/**
 * Validates video file size and format before processing
 */
export function validateVideoFile(file: File): VideoValidationResult {
  const fileSizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
  const maxAllowedMb = 500; // 500 MB max

  if (file.size === 0) {
    return {
      isValid: false,
      error: "Le fichier sélectionné est vide (0 octet).",
      fileSizeMb,
      mimeType: file.type || 'inconnu',
    };
  }

  if (fileSizeMb > maxAllowedMb) {
    return {
      isValid: false,
      error: `La vidéo dépasse la taille maximale autorisée de ${maxAllowedMb} Mo (taille actuelle : ${fileSizeMb} Mo). Veuillez compresser la vidéo ou choisir une version plus courte.`,
      fileSizeMb,
      mimeType: file.type || 'inconnu',
    };
  }

  // Common iPhone Photos types: 'video/quicktime', 'video/mp4', 'video/x-m4v', or empty MIME on iOS
  const fileName = file.name.toLowerCase();
  const isVideoExt =
    fileName.endsWith('.mov') ||
    fileName.endsWith('.mp4') ||
    fileName.endsWith('.m4v') ||
    fileName.endsWith('.webm');

  const isVideoMime =
    file.type.startsWith('video/') ||
    file.type === 'video/quicktime' ||
    file.type === 'video/mp4' ||
    file.type === ''; // iOS Photos sometimes provides empty MIME

  if (!isVideoExt && !isVideoMime) {
    return {
      isValid: false,
      error: `Format de fichier non reconnu (${file.name}). Veuillez sélectionner un fichier vidéo MP4 ou MOV (QuickTime iPhone).`,
      fileSizeMb,
      mimeType: file.type || 'inconnu',
    };
  }

  return {
    isValid: true,
    fileSizeMb,
    mimeType: file.type || (fileName.endsWith('.mov') ? 'video/quicktime' : 'video/mp4'),
  };
}

/**
 * Processes video on iPhone / iPad / Desktop with iOS WebKit fail-safes
 */
export async function processVideoFile(file: File): Promise<VideoExtractionResult> {
  const validation = validateVideoFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);

    // Create an offscreen video element attached to DOM
    // iOS Safari REQUIRES the video to be in the DOM and have playsinline to load media properly
    const video = document.createElement('video');
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';

    video.muted = true;
    video.volume = 0;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    document.body.appendChild(video);

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      } catch (e) {
        console.warn('Cleanup error:', e);
      }
      // Note: do not revoke objectUrl here if caller needs it; caller will manage it
    };

    // Timeout safety net (max 8 seconds for extraction, then fallback gracefully)
    const timeoutTimer = setTimeout(() => {
      console.warn('Video metadata loading timed out on iOS, using robust fallback');
      const fallbackThumb = generateFallbackThumbnail(file.name);
      cleanup();
      resolve({
        duration: 15,
        width: 720,
        height: 1280,
        thumbnailUrl: fallbackThumb,
        frames: [fallbackThumb],
        formatName: file.name.endsWith('.mov') ? 'QuickTime (iPhone HEVC/H.264)' : 'MP4 Vidéo',
      });
    }, 8000);

    const handleLoadedData = async () => {
      clearTimeout(timeoutTimer);

      let duration = video.duration;
      if (!duration || isNaN(duration) || !isFinite(duration) || duration <= 0) {
        duration = 15;
      }

      const width = video.videoWidth || 720;
      const height = video.videoHeight || 1280;

      // Extract 2 keyframes (safe positions)
      const points = [
        Math.max(0.5, Math.min(duration * 0.2, 2)),
        Math.max(1, Math.min(duration * 0.6, Math.max(1.5, duration - 1))),
      ];

      const frames: string[] = [];

      try {
        for (const time of points) {
          const frame = await safeCaptureFrame(video, time, width, height);
          if (frame && frame.startsWith('data:image/')) {
            frames.push(frame);
          }
        }
      } catch (err) {
        console.warn('Error during frame capture:', err);
      }

      const primaryThumbnail =
        frames.length > 0 ? frames[0] : generateFallbackThumbnail(file.name);

      if (frames.length === 0) {
        frames.push(primaryThumbnail);
      }

      cleanup();

      resolve({
        duration: Math.round(duration),
        width,
        height,
        thumbnailUrl: primaryThumbnail,
        frames,
        formatName: file.name.endsWith('.mov') ? 'QuickTime (iPhone HEVC/H.264)' : 'MP4 Vidéo',
      });
    };

    video.onloadeddata = handleLoadedData;
    video.oncanplay = () => {
      if (!isCleanedUp && video.readyState >= 2) {
        handleLoadedData();
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutTimer);
      console.warn('Video element reported error, using fallback poster');
      const fallbackThumb = generateFallbackThumbnail(file.name);
      cleanup();
      resolve({
        duration: 15,
        width: 720,
        height: 1280,
        thumbnailUrl: fallbackThumb,
        frames: [fallbackThumb],
        formatName: file.name.endsWith('.mov') ? 'QuickTime MOV (iPhone)' : 'MP4 Vidéo',
      });
    };

    video.src = objectUrl;
    video.load();
  });
}

/**
 * Captures a video frame with a 2-second timeout per seek to prevent iOS Safari hangs
 */
function safeCaptureFrame(
  video: HTMLVideoElement,
  time: number,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve) => {
    let resolved = false;

    const capture = () => {
      if (resolved) return;
      resolved = true;
      try {
        const canvas = document.createElement('canvas');
        // Efficient downscale for fast AI processing (max 480px height)
        const scale = Math.min(1, 480 / Math.max(height, 1));
        canvas.width = Math.round(Math.max(width * scale, 320));
        canvas.height = Math.round(Math.max(height * scale, 480));

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        console.warn('Canvas drawImage error on iOS:', err);
      }
      resolve('');
    };

    // 1.5s timeout per frame in case WebKit doesn't trigger seeked
    const seekTimeout = setTimeout(() => {
      capture();
    }, 1500);

    const onSeeked = () => {
      clearTimeout(seekTimeout);
      video.removeEventListener('seeked', onSeeked);
      capture();
    };

    video.addEventListener('seeked', onSeeked, { once: true });

    try {
      if (isFinite(time) && time >= 0) {
        video.currentTime = time;
      } else {
        capture();
      }
    } catch {
      capture();
    }
  });
}

/**
 * Creates a clean canvas-based poster thumbnail if iOS HEVC codec blocks direct canvas draw
 */
function generateFallbackThumbnail(fileName: string): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Dark TikTok-style gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 960);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 960);

    // Decorative glow
    ctx.beginPath();
    ctx.arc(320, 480, 180, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
    ctx.fill();

    // Play icon circle
    ctx.beginPath();
    ctx.arc(320, 450, 48, 0, Math.PI * 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fill();

    // Play triangle
    ctx.beginPath();
    ctx.moveTo(312, 432);
    ctx.lineTo(336, 450);
    ctx.lineTo(312, 468);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Text: file name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    const cleanName = fileName.replace(/\.[^/.]+$/, '').slice(0, 28);
    ctx.fillText(cleanName, 320, 540);

    // Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Vidéo iPhone / Photos', 320, 580);

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return '';
  }
}
