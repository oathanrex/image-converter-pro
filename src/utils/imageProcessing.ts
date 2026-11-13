import { jsPDF } from 'jspdf';
import {
  ColorMode,
  ExifResultStatus,
  FORMAT_CONFIG,
  ImageFileItem,
  NamingPattern,
  OutputFormat,
  ResizeOptions,
} from '../types/converter';
import { buildSampleTiffExif, injectExifIntoBytes } from './exif';

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_PIXELS = 50_000_000;
export const MAX_DIMENSION = 10_000;

export const VALID_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
];

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  const value = bytes / Math.pow(k, i);
  return `${i === 0 ? Math.round(value) : Number(value.toFixed(2))} ${sizes[i]}`;
}

export function getFormatFromMime(mimeType: string): string {
  const formats: Record<string, string> = {
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WEBP',
    'image/gif': 'GIF',
    'image/bmp': 'BMP',
    'image/svg+xml': 'SVG',
  };
  return formats[mimeType] || 'IMG';
}

export function isSvgFile(file: { type: string; name: string }): boolean {
  return (
    file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
  );
}

const VALID_EXTENSION_RE = /\.(jpe?g|png|webp|gif|bmp|svg)$/i;

export function validateFileMeta(file: {
  name: string;
  size: number;
  type: string;
}): { valid: true } | { valid: false; error: string } {
  if (!file || file.size <= 0) {
    return { valid: false, error: 'Empty or invalid file.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `${file.name} exceeds the 50 MB file size limit.`,
    };
  }
  const hasSupportedMime =
    VALID_MIME_TYPES.includes(file.type) || file.type.startsWith('image/');
  const hasSupportedExtension =
    file.type === '' && VALID_EXTENSION_RE.test(file.name);
  if (!hasSupportedMime && !hasSupportedExtension) {
    return {
      valid: false,
      error: `${file.name} is not a supported image format.`,
    };
  }
  return { valid: true };
}

export function validateImageDimensions(
  width: number,
  height: number
): { valid: true } | { valid: false; error: string } {
  if (width <= 0 || height <= 0) {
    return { valid: false, error: 'Image dimensions must be positive.' };
  }
  const totalPixels = width * height;
  if (totalPixels > MAX_PIXELS) {
    return {
      valid: false,
      error: `Image is too large (${Math.round(totalPixels / 1_000_000)} MP). Maximum is 50 MP.`,
    };
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return {
      valid: false,
      error: `Dimensions exceed the ${MAX_DIMENSION} px maximum per side.`,
    };
  }
  return { valid: true };
}

export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  resize: ResizeOptions
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  if (!resize.enabled) {
    return { width, height };
  }

  const targetWidth =
    resize.width && resize.width > 0 ? Math.round(resize.width) : null;
  const targetHeight =
    resize.height && resize.height > 0 ? Math.round(resize.height) : null;

  if (targetWidth && targetHeight) {
    if (resize.maintainRatio) {
      const ratio = Math.min(targetWidth / width, targetHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    } else {
      width = targetWidth;
      height = targetHeight;
    }
  } else if (targetWidth) {
    const ratio = targetWidth / width;
    width = targetWidth;
    height = Math.round(height * ratio);
  } else if (targetHeight) {
    const ratio = targetHeight / height;
    height = targetHeight;
    width = Math.round(width * ratio);
  }

  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

export function computeSizeDelta(
  originalBytes: number,
  convertedBytes: number
): { direction: 'smaller' | 'larger' | 'same'; percent: number; label: string } {
  if (originalBytes <= 0 || convertedBytes <= 0) {
    return { direction: 'same', percent: 0, label: 'Unchanged' };
  }
  const ratio = convertedBytes / originalBytes;
  if (ratio < 0.99) {
    const percent = Math.round((1 - ratio) * 100);
    return {
      direction: 'smaller',
      percent,
      label: `-${percent}%`,
    };
  }
  if (ratio > 1.01) {
    const percent = Math.round((ratio - 1) * 100);
    return {
      direction: 'larger',
      percent,
      label: `+${percent}%`,
    };
  }
  return { direction: 'same', percent: 0, label: '0%' };
}

export function sanitizeFilenameAffix(affix: string): string {
  return affix.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
}

export function getOutputFilename(
  originalName: string,
  format: OutputFormat,
  naming?: NamingPattern
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '') || 'converted-image';
  const prefix = naming?.prefix ? sanitizeFilenameAffix(naming.prefix) : '';
  const suffix = naming?.suffix ? sanitizeFilenameAffix(naming.suffix) : '';
  return `${prefix}${baseName}${suffix}.${FORMAT_CONFIG[format].ext}`;
}

export async function isAnimatedGif(file: File): Promise<boolean> {
  if (file.type !== 'image/gif') return false;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result;
      if (!(buffer instanceof ArrayBuffer)) {
        resolve(false);
        return;
      }
      const arr = new Uint8Array(buffer);
      let frames = 0;
      for (let i = 0; i < arr.length - 3; i++) {
        if (arr[i] === 0x21 && arr[i + 1] === 0xf9) {
          frames++;
          if (frames > 1) {
            resolve(true);
            return;
          }
        }
      }
      resolve(false);
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 50_000));
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Unexpected file reader result.'));
    };
    reader.readAsDataURL(file);
  });
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image.'));
    img.src = src;
  });
}

export function applyFilterToPixelData(
  data: Uint8ClampedArray,
  colorMode: ColorMode
): void {
  if (colorMode === 'original') return;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    switch (colorMode) {
      case 'grayscale': {
        const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
        data[i] = data[i + 1] = data[i + 2] = gray;
        break;
      }
      case 'sepia': {
        data[i] = Math.min(255, Math.round(r * 0.393 + g * 0.769 + b * 0.189));
        data[i + 1] = Math.min(
          255,
          Math.round(r * 0.349 + g * 0.686 + b * 0.168)
        );
        data[i + 2] = Math.min(
          255,
          Math.round(r * 0.272 + g * 0.534 + b * 0.131)
        );
        break;
      }
      case 'invert': {
        data[i] = 255 - r;
        data[i + 1] = 255 - g;
        data[i + 2] = 255 - b;
        break;
      }
      case 'brightness': {
        const factor = 1.3;
        data[i] = Math.min(255, Math.round(r * factor));
        data[i + 1] = Math.min(255, Math.round(g * factor));
        data[i + 2] = Math.min(255, Math.round(b * factor));
        break;
      }
      case 'contrast': {
        const factor = 1.5;
        const adjust = (v: number) =>
          Math.min(
            255,
            Math.max(0, Math.round(((v / 255 - 0.5) * factor + 0.5) * 255))
          );
        data[i] = adjust(r);
        data[i + 1] = adjust(g);
        data[i + 2] = adjust(b);
        break;
      }
    }
  }
}

export function applyColorModeToContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colorMode: ColorMode
): void {
  if (colorMode === 'original') return;
  const imageData = ctx.getImageData(0, 0, width, height);
  applyFilterToPixelData(imageData.data, colorMode);
  ctx.putImageData(imageData, 0, 0);
}

export function encodeBmpBytes(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const out = new Uint8Array(buffer);

  // BITMAPFILEHEADER (14 bytes)
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true);

  // BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true); // color planes
  view.setUint16(28, 24, true); // 24-bit BGR
  view.setUint32(30, 0, true); // BI_RGB
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true); // ~72 DPI
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Bottom-up BGR rows
  for (let y = 0; y < height; y++) {
    const srcRow = height - 1 - y;
    const dstRowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcRow * width + x) * 4;
      const dstIdx = dstRowOffset + x * 3;
      out[dstIdx] = rgba[srcIdx + 2]; // B
      out[dstIdx + 1] = rgba[srcIdx + 1]; // G
      out[dstIdx + 2] = rgba[srcIdx]; // R
    }
  }

  return out;
}

export function estimateConvertedSize(
  item: {
    size: number;
    width: number;
    height: number;
    status?: string;
    convertedSize?: number | null;
  },
  options: {
    format: OutputFormat;
    quality: number;
    resize: ResizeOptions;
    colorMode: ColorMode;
  }
): number {
  if (
    item.status === 'done' &&
    typeof item.convertedSize === 'number' &&
    item.convertedSize > 0
  ) {
    return item.convertedSize;
  }

  const { width, height } = calculateDimensions(
    Math.max(1, item.width),
    Math.max(1, item.height),
    options.resize
  );
  const targetPixels = width * height;
  const sourcePixels = Math.max(1, item.width * item.height);
  const pixelScale = targetPixels / sourcePixels;
  const qualityNorm = Math.min(1, Math.max(0.1, options.quality / 100));
  const filterFactor = options.colorMode === 'grayscale' ? 0.85 : 1;

  if (options.format === 'bmp') {
    const rowSize = Math.ceil((width * 3) / 4) * 4;
    return 54 + rowSize * height;
  }

  if (options.format === 'png') {
    const pixelBased = targetPixels * 1.15;
    const sourceBased = item.size * pixelScale * 1.15;
    return Math.max(256, Math.round((pixelBased * 0.5 + sourceBased * 0.5) * filterFactor));
  }

  if (options.format === 'gif') {
    const pixelBased = targetPixels * 0.55;
    const sourceBased = item.size * pixelScale * 0.7;
    return Math.max(256, Math.round((pixelBased * 0.5 + sourceBased * 0.5) * filterFactor));
  }

  // Lossy formats (JPG, WEBP, PDF wrapping JPEG)
  const bpp = 0.06 + Math.pow(qualityNorm, 1.8) * 0.42;
  const jpegEstimate = Math.max(
    512,
    Math.round(
      Math.min(
        targetPixels * bpp,
        Math.max(targetPixels * 0.08, item.size * pixelScale * (0.35 + 0.75 * qualityNorm))
      ) * filterFactor
    )
  );

  if (options.format === 'webp') {
    return Math.max(256, Math.round(jpegEstimate * 0.72));
  }

  if (options.format === 'pdf') {
    return jpegEstimate + 2048;
  }

  return jpegEstimate;
}

export function summarizeQueueSizes(
  files: Array<{
    size: number;
    width: number;
    height: number;
    status: string;
    convertedSize: number | null;
  }>,
  options: {
    format: OutputFormat;
    quality: number;
    resize: ResizeOptions;
    colorMode: ColorMode;
  }
): {
  totalImages: number;
  convertedCount: number;
  totalInitialBytes: number;
  totalEstimatedBytes: number;
  isEstimate: boolean;
} {
  let convertedCount = 0;
  let totalInitialBytes = 0;
  let totalEstimatedBytes = 0;

  for (const file of files) {
    totalInitialBytes += file.size;
    if (file.status === 'done' && file.convertedSize !== null) {
      convertedCount++;
    }
    totalEstimatedBytes += estimateConvertedSize(file, options);
  }

  return {
    totalImages: files.length,
    convertedCount,
    totalInitialBytes,
    totalEstimatedBytes,
    isEstimate: files.length > 0 && convertedCount < files.length,
  };
}

export async function convertImageItem(
  item: ImageFileItem,
  options: {
    format: OutputFormat;
    quality: number;
    resize: ResizeOptions;
    colorMode: ColorMode;
    bgColor: string;
    preserveExif: boolean;
  }
): Promise<{
  blob: Blob;
  size: number;
  width: number;
  height: number;
  exifStatus: ExifResultStatus;
}> {
  const img = await loadImageElement(item.dataUrl);
  const dimValidation = validateImageDimensions(img.width, img.height);
  if (!dimValidation.valid) {
    throw new Error(dimValidation.error);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize browser canvas context.');
  }

  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    options.resize
  );
  canvas.width = width;
  canvas.height = height;

  const formatConfig = FORMAT_CONFIG[options.format];
  if (!formatConfig.supportsTransparency || options.bgColor !== 'transparent') {
    ctx.fillStyle =
      options.bgColor === 'transparent' ? '#ffffff' : options.bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(img, 0, 0, width, height);
  applyColorModeToContext(ctx, width, height, options.colorMode);

  if (options.format === 'pdf') {
    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height],
    });
    const imgData = canvas.toDataURL('image/jpeg', options.quality / 100);
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
    const pdfBlob = pdf.output('blob');
    const exifStatus: ExifResultStatus = !item.hasExif
      ? 'none'
      : options.preserveExif
        ? 'unsupported'
        : 'stripped';
    return {
      blob: pdfBlob,
      size: pdfBlob.size,
      width,
      height,
      exifStatus,
    };
  }

  let blob: Blob;
  if (options.format === 'bmp') {
    const imageData = ctx.getImageData(0, 0, width, height);
    const bmpBytes = encodeBmpBytes(imageData.data, width, height);
    blob = new Blob([new Uint8Array(bmpBytes)], { type: formatConfig.mime });
  } else {
    const qualityArg = formatConfig.supportsQuality
      ? options.quality / 100
      : undefined;

    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Format conversion returned an empty output.'));
        },
        formatConfig.mime,
        qualityArg
      );
    });
  }

  let exifStatus: ExifResultStatus = 'none';
  if (item.hasExif && item.exifTiff) {
    if (!options.preserveExif) {
      exifStatus = 'stripped';
    } else if (!formatConfig.supportsExif) {
      exifStatus = 'unsupported';
    } else {
      const rawBytes = new Uint8Array(await blob.arrayBuffer());
      const injected = injectExifIntoBytes(
        rawBytes,
        options.format,
        item.exifTiff,
        { width, height }
      );
      if (injected.preserved) {
        blob = new Blob([new Uint8Array(injected.bytes)], {
          type: formatConfig.mime,
        });
        exifStatus = 'preserved';
      } else {
        exifStatus = 'stripped';
      }
    }
  }

  return {
    blob,
    size: blob.size,
    width,
    height,
    exifStatus,
  };
}

export async function createMergedPdfBlob(
  items: ImageFileItem[],
  options: {
    quality: number;
    resize: ResizeOptions;
    colorMode: ColorMode;
    bgColor: string;
  }
): Promise<{ blob: Blob; pageCount: number }> {
  let pdf: jsPDF | null = null;
  let pageCount = 0;

  for (const item of items) {
    const img = await loadImageElement(item.dataUrl);
    const { width, height } = calculateDimensions(
      img.width,
      img.height,
      options.resize
    );
    if (width <= 0 || height <= 0) continue;

    if (!pdf) {
      pdf = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height],
      });
    } else {
      pdf.addPage([width, height], width > height ? 'landscape' : 'portrait');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle =
      options.bgColor === 'transparent' ? '#ffffff' : options.bgColor;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    applyColorModeToContext(ctx, width, height, options.colorMode);

    const imgData = canvas.toDataURL('image/jpeg', options.quality / 100);
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
    pageCount++;
  }

  if (!pdf || pageCount === 0) {
    throw new Error('No valid images available to merge into PDF.');
  }

  return {
    blob: pdf.output('blob'),
    pageCount,
  };
}

export async function createSampleImageFile(variant: 'studio' | 'badge' = 'studio'): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas not supported.');
  }

  if (variant === 'studio') {
    const grad = ctx.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, '#eef2ff');
    grad.addColorStop(0.5, '#f8fafc');
    grad.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 800);

    // Architectural geometric composition
    ctx.fillStyle = '#1a73e8';
    ctx.beginPath();
    ctx.arc(380, 400, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(540, 220, 360, 360);

    ctx.fillStyle = '#34a853';
    ctx.beginPath();
    ctx.moveTo(720, 280);
    ctx.lineTo(860, 520);
    ctx.lineTo(580, 520);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fbbc04';
    ctx.beginPath();
    ctx.arc(820, 260, 48, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.clearRect(0, 0, 1200, 800);
    ctx.fillStyle = '#1a73e8';
    ctx.beginPath();
    ctx.roundRect(350, 150, 500, 500, 64);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(600, 400, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  let blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((res) => {
      if (res) resolve(res);
      else reject(new Error('Could not generate sample image.'));
    }, 'image/png');
  });

  const sampleBytes = new Uint8Array(await blob.arrayBuffer());
  const sampleTiff = buildSampleTiffExif({
    make: 'Studio',
    model: 'Sample Camera',
    dateTime: '2026:11:12 21:30:00',
    orientation: 1,
  });
  const withExif = injectExifIntoBytes(sampleBytes, 'png', sampleTiff, {
    width: 1200,
    height: 800,
  });
  if (withExif.preserved) {
    blob = new Blob([new Uint8Array(withExif.bytes)], { type: 'image/png' });
  }

  return new File(
    [blob],
    variant === 'studio' ? 'sample-composition.png' : 'sample-transparent.png',
    { type: 'image/png' }
  );
}
