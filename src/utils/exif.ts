import { OutputFormat } from '../types/converter';

const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function matchesBytes(
  data: Uint8Array,
  offset: number,
  expected: number[]
): boolean {
  if (offset + expected.length > data.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (data[offset + i] !== expected[i]) return false;
  }
  return true;
}

function readUint16BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

function readUint32BE(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]) >>>
    0
  );
}

function readUint32LE(data: Uint8Array, offset: number): number {
  return (
    (data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24)) >>>
    0
  );
}

function writeUint32BE(out: Uint8Array, offset: number, val: number): void {
  out[offset] = (val >>> 24) & 0xff;
  out[offset + 1] = (val >>> 16) & 0xff;
  out[offset + 2] = (val >>> 8) & 0xff;
  out[offset + 3] = val & 0xff;
}

function writeUint32LE(out: Uint8Array, offset: number, val: number): void {
  out[offset] = val & 0xff;
  out[offset + 1] = (val >>> 8) & 0xff;
  out[offset + 2] = (val >>> 16) & 0xff;
  out[offset + 3] = (val >>> 24) & 0xff;
}

function asciiFourCC(data: Uint8Array, offset: number): string {
  return String.fromCharCode(
    data[offset],
    data[offset + 1],
    data[offset + 2],
    data[offset + 3]
  );
}

function isValidTiffHeader(data: Uint8Array): boolean {
  if (data.length < 8) return false;
  const isLittle = data[0] === 0x49 && data[1] === 0x49; // "II"
  const isBig = data[0] === 0x4d && data[1] === 0x4d; // "MM"
  if (!isLittle && !isBig) return false;
  const magic = isLittle
    ? data[2] | (data[3] << 8)
    : (data[2] << 8) | data[3];
  return magic === 42;
}

/**
 * Extracts raw TIFF EXIF bytes from JPEG (APP1), PNG (eXIf), or WebP (EXIF).
 */
export function extractExifTiff(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 12) return null;

  // JPEG: starts with SOI 0xFF 0xD8
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let pos = 2;
    while (pos + 4 <= bytes.length) {
      if (bytes[pos] !== 0xff) break;
      const marker = bytes[pos + 1];
      // Skip padding 0xFF bytes or standalone markers
      if (marker === 0xff) {
        pos++;
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS
      if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd8)) {
        pos += 2;
        continue;
      }

      const segmentLen = readUint16BE(bytes, pos + 2);
      if (segmentLen < 2 || pos + 2 + segmentLen > bytes.length) break;

      if (
        marker === 0xe1 &&
        segmentLen > 8 &&
        matchesBytes(bytes, pos + 4, EXIF_HEADER)
      ) {
        const tiff = bytes.slice(pos + 10, pos + 2 + segmentLen);
        return isValidTiffHeader(tiff) ? tiff : null;
      }
      pos += 2 + segmentLen;
    }
    return null;
  }

  // PNG: starts with 8-byte PNG signature
  if (matchesBytes(bytes, 0, PNG_SIGNATURE)) {
    let pos = 8;
    while (pos + 12 <= bytes.length) {
      const length = readUint32BE(bytes, pos);
      const type = asciiFourCC(bytes, pos + 4);
      const dataStart = pos + 8;
      const dataEnd = dataStart + length;
      if (dataEnd + 4 > bytes.length) break;

      if (type === 'eXIf') {
        const chunkData = bytes.slice(dataStart, dataEnd);
        return isValidTiffHeader(chunkData) ? chunkData : null;
      }
      if (type === 'IEND') break;
      pos = dataEnd + 4;
    }
    return null;
  }

  // WebP: RIFF .... WEBP
  if (
    asciiFourCC(bytes, 0) === 'RIFF' &&
    asciiFourCC(bytes, 8) === 'WEBP'
  ) {
    let pos = 12;
    while (pos + 8 <= bytes.length) {
      const fourCC = asciiFourCC(bytes, pos);
      const size = readUint32LE(bytes, pos + 4);
      const dataStart = pos + 8;
      const dataEnd = dataStart + size;
      if (dataEnd > bytes.length) break;

      if (fourCC === 'EXIF') {
        const raw = bytes.slice(dataStart, dataEnd);
        const tiff = matchesBytes(raw, 0, EXIF_HEADER) ? raw.slice(6) : raw;
        return isValidTiffHeader(tiff) ? tiff : null;
      }
      pos = dataEnd + (size % 2);
    }
    return null;
  }

  return null;
}

/**
 * Normalizes TIFF IFD0 Orientation tag (0x0112) to 1 (horizontal/normal) so
 * viewers do not apply orientation rotation twice after Canvas baking.
 */
export function normalizeTiffOrientation(tiffBytes: Uint8Array): Uint8Array {
  if (!isValidTiffHeader(tiffBytes)) return tiffBytes;
  const out = new Uint8Array(tiffBytes);
  const little = out[0] === 0x49;

  const u16 = (off: number) =>
    little ? out[off] | (out[off + 1] << 8) : (out[off] << 8) | out[off + 1];
  const u32 = (off: number) =>
    little
      ? readUint32LE(out, off)
      : readUint32BE(out, off);

  const ifd0Offset = u32(4);
  if (ifd0Offset + 2 > out.length) return out;
  const entryCount = u16(ifd0Offset);

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifd0Offset + 2 + i * 12;
    if (entryOffset + 12 > out.length) break;
    const tag = u16(entryOffset);
    const type = u16(entryOffset + 2);
    const count = u32(entryOffset + 4);
    if (tag === 0x0112 && type === 3 && count === 1) {
      if (little) {
        out[entryOffset + 8] = 1;
        out[entryOffset + 9] = 0;
      } else {
        out[entryOffset + 8] = 0;
        out[entryOffset + 9] = 1;
      }
      break;
    }
  }

  return out;
}

function injectExifIntoJpeg(
  jpegBytes: Uint8Array,
  tiffBytes: Uint8Array
): Uint8Array {
  if (jpegBytes.length < 2 || jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    return jpegBytes;
  }
  // APP1 segment length includes the 2 length bytes + 6-byte "Exif\0\0" + TIFF data
  const segmentLength = 2 + EXIF_HEADER.length + tiffBytes.length;
  if (segmentLength > 65535) {
    return jpegBytes;
  }

  const app1 = new Uint8Array(2 + segmentLength);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1[2] = (segmentLength >>> 8) & 0xff;
  app1[3] = segmentLength & 0xff;
  app1.set(EXIF_HEADER, 4);
  app1.set(tiffBytes, 10);

  const result = new Uint8Array(2 + app1.length + (jpegBytes.length - 2));
  result.set(jpegBytes.subarray(0, 2), 0);
  result.set(app1, 2);
  result.set(jpegBytes.subarray(2), 2 + app1.length);
  return result;
}

function injectExifIntoPng(
  pngBytes: Uint8Array,
  tiffBytes: Uint8Array
): Uint8Array {
  if (!matchesBytes(pngBytes, 0, PNG_SIGNATURE) || pngBytes.length < 33) {
    return pngBytes;
  }

  // Insert eXIf chunk right after IHDR chunk (which starts at offset 8)
  const ihdrLen = readUint32BE(pngBytes, 8);
  const insertOffset = 8 + 4 + 4 + ihdrLen + 4;
  if (insertOffset > pngBytes.length) return pngBytes;

  const chunkType = new Uint8Array([0x65, 0x58, 0x49, 0x66]); // "eXIf"
  const crcInput = new Uint8Array(4 + tiffBytes.length);
  crcInput.set(chunkType, 0);
  crcInput.set(tiffBytes, 4);
  const checksum = crc32(crcInput);

  const exifChunk = new Uint8Array(4 + 4 + tiffBytes.length + 4);
  writeUint32BE(exifChunk, 0, tiffBytes.length);
  exifChunk.set(chunkType, 4);
  exifChunk.set(tiffBytes, 8);
  writeUint32BE(exifChunk, 8 + tiffBytes.length, checksum);

  const out = new Uint8Array(pngBytes.length + exifChunk.length);
  out.set(pngBytes.subarray(0, insertOffset), 0);
  out.set(exifChunk, insertOffset);
  out.set(pngBytes.subarray(insertOffset), insertOffset + exifChunk.length);
  return out;
}

function injectExifIntoWebp(
  webpBytes: Uint8Array,
  tiffBytes: Uint8Array,
  dimensions: { width: number; height: number }
): Uint8Array {
  if (
    webpBytes.length < 20 ||
    asciiFourCC(webpBytes, 0) !== 'RIFF' ||
    asciiFourCC(webpBytes, 8) !== 'WEBP'
  ) {
    return webpBytes;
  }

  const paddedSize = tiffBytes.length + (tiffBytes.length % 2);
  const exifChunk = new Uint8Array(8 + paddedSize);
  exifChunk.set([0x45, 0x58, 0x49, 0x46], 0); // "EXIF"
  writeUint32LE(exifChunk, 4, tiffBytes.length);
  exifChunk.set(tiffBytes, 8);

  const firstFourCC = asciiFourCC(webpBytes, 12);
  if (firstFourCC === 'VP8X') {
    const out = new Uint8Array(webpBytes.length + exifChunk.length);
    out.set(webpBytes, 0);
    // Set EXIF flag bit (0x08) in VP8X flags byte at offset 20
    out[20] = out[20] | 0x08;
    out.set(exifChunk, webpBytes.length);
    writeUint32LE(out, 4, out.length - 8);
    return out;
  }

  // Upgrade simple VP8 / VP8L WebP into extended VP8X WebP so EXIF chunk is valid
  let flags = 0x08; // EXIF bit
  if (firstFourCC === 'VP8L' && webpBytes.length >= 25) {
    const hasAlpha = (webpBytes[24] & 0x10) !== 0;
    if (hasAlpha) flags |= 0x10;
  }

  const wMinus1 = Math.max(0, dimensions.width - 1);
  const hMinus1 = Math.max(0, dimensions.height - 1);

  const vp8xChunk = new Uint8Array(18);
  vp8xChunk.set([0x56, 0x50, 0x38, 0x58], 0); // "VP8X"
  writeUint32LE(vp8xChunk, 4, 10);
  vp8xChunk[8] = flags;
  vp8xChunk[12] = wMinus1 & 0xff;
  vp8xChunk[13] = (wMinus1 >>> 8) & 0xff;
  vp8xChunk[14] = (wMinus1 >>> 16) & 0xff;
  vp8xChunk[15] = hMinus1 & 0xff;
  vp8xChunk[16] = (hMinus1 >>> 8) & 0xff;
  vp8xChunk[17] = (hMinus1 >>> 16) & 0xff;

  const bodyBytes = webpBytes.subarray(12);
  const out = new Uint8Array(12 + vp8xChunk.length + bodyBytes.length + exifChunk.length);
  out.set(webpBytes.subarray(0, 12), 0);
  out.set(vp8xChunk, 12);
  out.set(bodyBytes, 12 + vp8xChunk.length);
  out.set(exifChunk, 12 + vp8xChunk.length + bodyBytes.length);
  writeUint32LE(out, 4, out.length - 8);
  return out;
}

export function injectExifIntoBytes(
  outputBytes: Uint8Array,
  format: OutputFormat,
  tiffBytes: Uint8Array,
  dimensions: { width: number; height: number }
): { bytes: Uint8Array; preserved: boolean } {
  const normalizedTiff = normalizeTiffOrientation(tiffBytes);
  switch (format) {
    case 'jpeg': {
      const injected = injectExifIntoJpeg(outputBytes, normalizedTiff);
      return { bytes: injected, preserved: injected !== outputBytes };
    }
    case 'png': {
      const injected = injectExifIntoPng(outputBytes, normalizedTiff);
      return { bytes: injected, preserved: injected !== outputBytes };
    }
    case 'webp': {
      const injected = injectExifIntoWebp(
        outputBytes,
        normalizedTiff,
        dimensions
      );
      return { bytes: injected, preserved: injected !== outputBytes };
    }
    default:
      return { bytes: outputBytes, preserved: false };
  }
}

/**
 * Builds a minimal valid little-endian TIFF EXIF payload with Make, Model,
 * Orientation, and DateTime tags (used for sample image testing and unit tests).
 */
export function buildSampleTiffExif(options?: {
  make?: string;
  model?: string;
  dateTime?: string;
  orientation?: number;
}): Uint8Array {
  const make = `${options?.make ?? 'Studio'}\0`;
  const model = `${options?.model ?? 'Sample Camera'}\0`;
  const dateTime = `${options?.dateTime ?? '2026:11:12 21:30:00'}\0`;
  const orientation = options?.orientation ?? 1;

  const encoder = new TextEncoder();
  const makeBytes = encoder.encode(make);
  const modelBytes = encoder.encode(model);
  const dateBytes = encoder.encode(dateTime);

  const ifd0Offset = 8;
  const entryCount = 4;
  const nextIfdSize = 4;
  const dataOffsetStart = ifd0Offset + 2 + entryCount * 12 + nextIfdSize;

  const makeOffset = dataOffsetStart;
  const modelOffset = makeOffset + makeBytes.length;
  const dateOffset = modelOffset + modelBytes.length;
  const totalSize = dateOffset + dateBytes.length;

  const out = new Uint8Array(totalSize);
  // TIFF header: "II", 42, IFD0 offset = 8
  out[0] = 0x49;
  out[1] = 0x49;
  out[2] = 42;
  out[3] = 0;
  writeUint32LE(out, 4, ifd0Offset);

  // Entry count = 4
  out[ifd0Offset] = entryCount;
  out[ifd0Offset + 1] = 0;

  const writeEntry = (
    idx: number,
    tag: number,
    type: number,
    count: number,
    valueOrOffset: number
  ) => {
    const base = ifd0Offset + 2 + idx * 12;
    out[base] = tag & 0xff;
    out[base + 1] = (tag >>> 8) & 0xff;
    out[base + 2] = type & 0xff;
    out[base + 3] = (type >>> 8) & 0xff;
    writeUint32LE(out, base + 4, count);
    writeUint32LE(out, base + 8, valueOrOffset);
  };

  // Tag 0x010F Make (ASCII = 2)
  writeEntry(0, 0x010f, 2, makeBytes.length, makeOffset);
  // Tag 0x0110 Model (ASCII = 2)
  writeEntry(1, 0x0110, 2, modelBytes.length, modelOffset);
  // Tag 0x0112 Orientation (SHORT = 3)
  writeEntry(2, 0x0112, 3, 1, orientation);
  // Tag 0x0132 DateTime (ASCII = 2)
  writeEntry(3, 0x0132, 2, dateBytes.length, dateOffset);

  out.set(makeBytes, makeOffset);
  out.set(modelBytes, modelOffset);
  out.set(dateBytes, dateOffset);

  return out;
}
