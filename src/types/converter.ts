export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp' | 'pdf';

export type ColorMode =
  | 'original'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'brightness'
  | 'contrast';

export type InputTab = 'upload' | 'url' | 'paste';

export type FileStatus = 'pending' | 'converting' | 'done' | 'error';

export type ExifResultStatus = 'preserved' | 'stripped' | 'none' | 'unsupported';

export interface ResizeOptions {
  enabled: boolean;
  width: number | null;
  height: number | null;
  maintainRatio: boolean;
}

export interface NamingPattern {
  prefix: string;
  suffix: string;
}

export interface FormatSpec {
  label: string;
  mime: string;
  ext: string;
  supportsQuality: boolean;
  supportsTransparency: boolean;
  supportsExif: boolean;
  hint: string;
}

export const FORMAT_CONFIG: Record<OutputFormat, FormatSpec> = {
  jpeg: {
    label: 'JPG',
    mime: 'image/jpeg',
    ext: 'jpg',
    supportsQuality: true,
    supportsTransparency: false,
    supportsExif: true,
    hint: 'Compact lossy format suited for photography.',
  },
  png: {
    label: 'PNG',
    mime: 'image/png',
    ext: 'png',
    supportsQuality: false,
    supportsTransparency: true,
    supportsExif: true,
    hint: 'Lossless format with full alpha transparency.',
  },
  webp: {
    label: 'WEBP',
    mime: 'image/webp',
    ext: 'webp',
    supportsQuality: true,
    supportsTransparency: true,
    supportsExif: true,
    hint: 'Modern web format balancing small size and clarity.',
  },
  gif: {
    label: 'GIF',
    mime: 'image/gif',
    ext: 'gif',
    supportsQuality: false,
    supportsTransparency: true,
    supportsExif: false,
    hint: 'Static single-frame GIF export.',
  },
  bmp: {
    label: 'BMP',
    mime: 'image/bmp',
    ext: 'bmp',
    supportsQuality: false,
    supportsTransparency: false,
    supportsExif: false,
    hint: 'Uncompressed raster bitmap.',
  },
  pdf: {
    label: 'PDF',
    mime: 'application/pdf',
    ext: 'pdf',
    supportsQuality: true,
    supportsTransparency: false,
    supportsExif: false,
    hint: 'Portable document ready for sharing or print.',
  },
};

export interface ImageFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  dataUrl: string;
  exifTiff: Uint8Array | null;
  hasExif: boolean;
  convertedUrl: string | null;
  convertedBlob: Blob | null;
  convertedSize: number | null;
  convertedFormat: OutputFormat | null;
  convertedWidth: number | null;
  convertedHeight: number | null;
  convertedExifStatus: ExifResultStatus | null;
  conversionTime: number | null;
  status: FileStatus;
  errorMessage?: string;
  isSvg: boolean;
}

export interface ToastItem {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
}
