import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSampleTiffExif,
  crc32,
  extractExifTiff,
  injectExifIntoBytes,
  normalizeTiffOrientation,
} from './exif';

function makeMinimalJpeg(): Uint8Array {
  // SOI (FF D8) + SOF0 dummy + EOI (FF D9)
  return new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, 0xff, 0xd9]);
}

function makeMinimalPng(): Uint8Array {
  // 8-byte signature + 25-byte IHDR + 12-byte IEND
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const ihdr = [
    0x00, 0x00, 0x00, 0x0d, // length 13
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x10, // width 16
    0x00, 0x00, 0x00, 0x10, // height 16
    0x08, 0x06, 0x00, 0x00, 0x00,
    0x1f, 0xf3, 0xff, 0x61, // CRC placeholder
  ];
  const iend = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
  return new Uint8Array([...sig, ...ihdr, ...iend]);
}

function makeMinimalWebp(): Uint8Array {
  // RIFF (size=12) + WEBP + VP8  (size=0)
  return new Uint8Array([
    0x52, 0x49, 0x46, 0x46,
    0x0c, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x20,
    0x00, 0x00, 0x00, 0x00,
  ]);
}

test('normalizeTiffOrientation resets orientation tag 0x0112 to 1 while preserving other tags', () => {
  const tiff = buildSampleTiffExif({ make: 'Canon', model: 'R5', orientation: 6 });
  // Entry index 2 has orientation at offset 8 + 2 + 2*12 + 8 = 42
  assert.equal(tiff[42], 6);

  const normalized = normalizeTiffOrientation(tiff);
  assert.equal(normalized[42], 1);
  // Original array not mutated
  assert.equal(tiff[42], 6);
  // Make string still intact
  const ascii = new TextDecoder().decode(normalized);
  assert.ok(ascii.includes('Canon'));
  assert.ok(ascii.includes('R5'));
});

test('injectExifIntoBytes round-trips EXIF through JPEG, PNG, and WEBP', () => {
  const sampleTiff = buildSampleTiffExif({ make: 'Nikon', model: 'Z8', orientation: 8 });

  const jpegWithExif = injectExifIntoBytes(makeMinimalJpeg(), 'jpeg', sampleTiff, {
    width: 16,
    height: 16,
  });
  assert.equal(jpegWithExif.preserved, true);
  const extractedJpeg = extractExifTiff(jpegWithExif.bytes);
  assert.ok(extractedJpeg);
  assert.equal(extractedJpeg[42], 1); // orientation normalized
  assert.ok(new TextDecoder().decode(extractedJpeg).includes('Nikon'));

  const pngWithExif = injectExifIntoBytes(makeMinimalPng(), 'png', sampleTiff, {
    width: 16,
    height: 16,
  });
  assert.equal(pngWithExif.preserved, true);
  const extractedPng = extractExifTiff(pngWithExif.bytes);
  assert.ok(extractedPng);
  assert.ok(new TextDecoder().decode(extractedPng).includes('Z8'));

  const webpWithExif = injectExifIntoBytes(makeMinimalWebp(), 'webp', sampleTiff, {
    width: 16,
    height: 16,
  });
  assert.equal(webpWithExif.preserved, true);
  const extractedWebp = extractExifTiff(webpWithExif.bytes);
  assert.ok(extractedWebp);
  assert.ok(new TextDecoder().decode(extractedWebp).includes('Nikon'));
});

test('injectExifIntoBytes skips unsupported formats cleanly', () => {
  const sampleTiff = buildSampleTiffExif();
  const dummy = new Uint8Array([1, 2, 3, 4]);
  const res = injectExifIntoBytes(dummy, 'pdf', sampleTiff, { width: 10, height: 10 });
  assert.equal(res.preserved, false);
  assert.deepEqual(res.bytes, dummy);
});

test('crc32 computes standard IEEE 802.3 checksum', () => {
  const data = new TextEncoder().encode('123456789');
  assert.equal(crc32(data), 0xcbf43926);
});
