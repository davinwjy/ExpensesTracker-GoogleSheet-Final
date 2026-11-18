export interface CompressedReceiptImage {
  base64: string;
  mimeType: string;
  previewDataUrl: string;
  ocrDataUrl?: string;
}

const IMAGE_EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  heic: 'image/heic',
  heif: 'image/heif',
};

export function inferImageMimeType(blob: Blob): string {
  const rawType = (blob.type || '').toLowerCase().trim();
  if (rawType.startsWith('image/')) {
    return rawType;
  }
  const maybeName = (blob as File).name;
  if (maybeName) {
    const ext = maybeName.split('.').pop()?.toLowerCase() || '';
    if (IMAGE_EXT_TO_MIME[ext]) {
      return IMAGE_EXT_TO_MIME[ext];
    }
  }
  return '';
}

export function isSupportedImageBlob(blob: Blob): boolean {
  if (!blob || blob.size === 0) return false;
  const rawType = (blob.type || '').toLowerCase().trim();
  if (rawType.startsWith('image/')) return true;
  if (!rawType || rawType === 'application/octet-stream') {
    const maybeName = (blob as File).name || '';
    // Android MediaStore / content:// URIs often omit file extension (e.g. "1000048219")
    if (!maybeName || !maybeName.includes('.')) return true;
    return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(maybeName);
  }
  return false;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.length > 0) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image bytes.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.readAsDataURL(blob);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Browser could not decode image for resizing.'));
    image.src = src;
  });
}

function applySoftwareGrayscaleContrast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contrastFactor: number = 1.18
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Rec. 709 luminance weights
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    let adjusted = (lum - 128) * contrastFactor + 128;
    if (adjusted < 0) adjusted = 0;
    else if (adjusted > 255) adjusted = 255;
    data[i] = adjusted;
    data[i + 1] = adjusted;
    data[i + 2] = adjusted;
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Enhances grayscale text legibility, suppresses light pastel bank/wallet watermarks
 * (e.g., BCA / QRIS background seals), and applies lightweight 3x3 sharpening for OCR.
 */
function applyOcrWatermarkCleanup(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const totalPixels = width * height;
  const lumBuf = new Uint8Array(totalPixels);

  // Pass 1: Suppress light pastel watermarks and stretch text contrast
  for (let p = 0, i = 0; p < totalPixels; p++, i += 4) {
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    let adjusted: number;
    if (lum >= 205) {
      adjusted = 255;
    } else {
      adjusted = (lum - 155) * 1.45 + 155;
      if (adjusted < 0) adjusted = 0;
      else if (adjusted > 255) adjusted = 255;
    }
    lumBuf[p] = adjusted;
  }

  // Pass 2: Lightweight 3x3 unsharp-mask kernel to crisp small mobile screenshot glyphs
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      let val = lumBuf[idx];
      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const blur =
          (lumBuf[idx - width] +
            lumBuf[idx - 1] +
            lumBuf[idx + 1] +
            lumBuf[idx + width]) >>
          2;
        val = val + ((val - blur) * 0.45);
        if (val < 0) val = 0;
        else if (val > 255) val = 255;
      }
      const p4 = idx * 4;
      data[p4] = val;
      data[p4 + 1] = val;
      data[p4 + 2] = val;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawSourceToOcrDataUrl(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number
): string | undefined {
  try {
    // Tall mobile screenshots (e.g., 539x1346) lose small text detail if shrunk aggressively.
    // Target ~1400-1800px width (and up to 3600px height) with lossless PNG for crisp OCR glyphs.
    const minReadableWidth = 1400;
    const maxOcrWidth = 1800;
    const maxOcrHeight = 3600;

    let scale = 1;
    if (srcWidth < minReadableWidth) {
      scale = minReadableWidth / srcWidth;
    } else if (srcWidth > maxOcrWidth) {
      scale = maxOcrWidth / srcWidth;
    }
    if (srcHeight * scale > maxOcrHeight) {
      scale = maxOcrHeight / srcHeight;
    }

    const targetW = Math.max(1, Math.round(srcWidth * scale));
    const targetH = Math.max(1, Math.round(srcHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return undefined;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, targetW, targetH);

    applyOcrWatermarkCleanup(ctx, targetW, targetH);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}

export function drawSourceToJpeg(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  maxDimension: number = 1280,
  quality: number = 0.85
): CompressedReceiptImage {
  const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight));
  const targetW = Math.max(1, Math.round(srcWidth * scale));
  const targetH = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    throw new Error('Canvas rendering is unavailable in this browser.');
  }

  // White fill ensures transparent PNG screenshots convert cleanly
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const supportsCanvasFilter = 'filter' in ctx && typeof ctx.filter === 'string';
  if (supportsCanvasFilter) {
    ctx.filter = 'grayscale(1) contrast(1.16)';
    ctx.drawImage(source, 0, 0, targetW, targetH);
    ctx.filter = 'none';
  } else {
    ctx.drawImage(source, 0, 0, targetW, targetH);
    applySoftwareGrayscaleContrast(ctx, targetW, targetH, 1.16);
  }

  const previewDataUrl = canvas.toDataURL('image/jpeg', quality);
  const commaIdx = previewDataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? previewDataUrl.slice(commaIdx + 1) : previewDataUrl;

  if (!base64) {
    throw new Error('Failed to encode compressed receipt image.');
  }

  const ocrDataUrl = drawSourceToOcrDataUrl(source, srcWidth, srcHeight);

  return {
    base64,
    mimeType: 'image/jpeg',
    previewDataUrl,
    ocrDataUrl,
  };
}

export function compressVideoFrame(
  video: HTMLVideoElement,
  maxDimension: number = 1280,
  quality: number = 0.85
): CompressedReceiptImage {
  return drawSourceToJpeg(video, video.videoWidth, video.videoHeight, maxDimension, quality);
}

/**
 * Downscales receipt photos or payment screenshots to 1280px high-contrast grayscale JPEG (0.85)
 * for sharp zoom previews & Web AI, plus a high-DPI sharpened PNG buffer for on-device OCR.
 */
export async function compressReceiptImage(
  file: Blob,
  maxDimension: number = 1280,
  quality: number = 0.85
): Promise<CompressedReceiptImage> {
  if (!isSupportedImageBlob(file)) {
    throw new Error('Please provide a valid image file (PNG, JPG, WebP, or HEIC).');
  }

  const detectedMime = inferImageMimeType(file) || 'image/jpeg';

  // 1. Fast path: createImageBitmap with EXIF orientation
  if (typeof createImageBitmap === 'function') {
    for (const useOptions of [true, false]) {
      try {
        const bitmap = useOptions
          ? await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
          : await createImageBitmap(file);
        try {
          if (bitmap.width > 0 && bitmap.height > 0) {
            return drawSourceToJpeg(bitmap, bitmap.width, bitmap.height, maxDimension, quality);
          }
        } finally {
          bitmap.close();
        }
      } catch {
        // Try next decoding path
      }
    }
  }

  // 2. HTMLImageElement via Object URL fallback
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (naturalW > 0 && naturalH > 0) {
      return drawSourceToJpeg(img, naturalW, naturalH, maxDimension, quality);
    }
  } catch {
    // Fall through to Data URL decoding
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  // 3. Data URL -> HTMLImageElement (works reliably on Android content:// URIs where blob URLs fail)
  // and keeps oversized Android camera photos compressed instead of sending huge raw payloads.
  if (file.size <= 20 * 1024 * 1024) {
    const rawDataUrl = await readBlobAsDataUrl(file);
    const commaIdx = rawDataUrl.indexOf(',');
    const rawBase64 = commaIdx >= 0 ? rawDataUrl.slice(commaIdx + 1) : rawDataUrl;
    const mimeMatch = rawDataUrl.match(/^data:([^;]+);base64,/);
    const normalizedDataUrl =
      mimeMatch?.[1] && mimeMatch[1] !== 'application/octet-stream'
        ? rawDataUrl
        : `data:${detectedMime};base64,${rawBase64}`;

    try {
      const img = await loadImageElement(normalizedDataUrl);
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      if (naturalW > 0 && naturalH > 0) {
        return drawSourceToJpeg(img, naturalW, naturalH, maxDimension, quality);
      }
    } catch {
      // Raw fallback only for undecodable formats like HEIC/HEIF within safe payload size
      if (rawBase64 && file.size <= 3.5 * 1024 * 1024) {
        const finalMime =
          (mimeMatch?.[1] && mimeMatch[1] !== 'application/octet-stream' ? mimeMatch[1] : '') ||
          detectedMime;
        return {
          base64: rawBase64,
          mimeType: finalMime,
          previewDataUrl: normalizedDataUrl,
        };
      }
    }
  }

  throw new Error('Could not process this image. Please try a JPG, PNG, or WebP photo.');
}
