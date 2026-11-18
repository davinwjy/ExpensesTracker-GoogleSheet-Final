export interface CompressedReceiptImage {
  base64: string;
  mimeType: string;
  previewDataUrl: string;
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
  if (blob.type && blob.type.startsWith('image/')) return true;
  if (!blob.type || blob.type === 'application/octet-stream') {
    const maybeName = (blob as File).name || '';
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

export function drawSourceToJpeg(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  maxDimension: number = 768,
  quality: number = 0.70
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

  const supportsCanvasFilter = 'filter' in ctx && typeof ctx.filter === 'string';
  if (supportsCanvasFilter) {
    ctx.filter = 'grayscale(1) contrast(1.18)';
    ctx.drawImage(source, 0, 0, targetW, targetH);
    ctx.filter = 'none';
  } else {
    ctx.drawImage(source, 0, 0, targetW, targetH);
    applySoftwareGrayscaleContrast(ctx, targetW, targetH, 1.18);
  }

  const previewDataUrl = canvas.toDataURL('image/jpeg', quality);
  const commaIdx = previewDataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? previewDataUrl.slice(commaIdx + 1) : previewDataUrl;

  if (!base64) {
    throw new Error('Failed to encode compressed receipt image.');
  }

  return {
    base64,
    mimeType: 'image/jpeg',
    previewDataUrl,
  };
}

export function compressVideoFrame(
  video: HTMLVideoElement,
  maxDimension: number = 768,
  quality: number = 0.70
): CompressedReceiptImage {
  return drawSourceToJpeg(video, video.videoWidth, video.videoHeight, maxDimension, quality);
}

/**
 * Downscales receipt photos or payment screenshots to 768px high-contrast grayscale JPEG (0.70)
 * to shrink network payloads by ~45-55% while sharpening thermal ink and payment digits.
 */
export async function compressReceiptImage(
  file: Blob,
  maxDimension: number = 768,
  quality: number = 0.70
): Promise<CompressedReceiptImage> {
  if (!isSupportedImageBlob(file)) {
    throw new Error('Please provide a valid image file (PNG, JPG, WebP, or HEIC).');
  }

  const detectedMime = inferImageMimeType(file) || 'image/jpeg';

  // Fast path: createImageBitmap decodes large phone photos off the main thread with Exif orientation
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      } as ImageBitmapOptions);
      try {
        if (bitmap.width > 0 && bitmap.height > 0) {
          return drawSourceToJpeg(bitmap, bitmap.width, bitmap.height, maxDimension, quality);
        }
      } finally {
        bitmap.close();
      }
    } catch {
      // Fall through to HTMLImageElement or raw fallback
    }
  }

  // HTMLImageElement + canvas fallback
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Browser could not decode image for resizing.'));
      image.src = objectUrl;
    });

    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (naturalW > 0 && naturalH > 0) {
      return drawSourceToJpeg(img, naturalW, naturalH, maxDimension, quality);
    }
  } catch {
    // Fall through to raw Data URL fallback (e.g., HEIC/HEIF)
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  // Raw fallback for formats like HEIC/HEIF that Gemini natively supports server-side
  if (file.size <= 10 * 1024 * 1024) {
    const dataUrl = await readBlobAsDataUrl(file);
    const commaIdx = dataUrl.indexOf(',');
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
    const finalMime =
      (mimeMatch?.[1] && mimeMatch[1] !== 'application/octet-stream' ? mimeMatch[1] : '') ||
      detectedMime;

    if (base64) {
      return {
        base64,
        mimeType: finalMime,
        previewDataUrl: dataUrl,
      };
    }
  }

  throw new Error('Could not read the selected image. Please try a JPG, PNG, or WebP image.');
}
