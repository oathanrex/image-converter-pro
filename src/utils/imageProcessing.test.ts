import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFilterToPixelData,
  calculateDimensions,
  computeSizeDelta,
  encodeBmpBytes,
  estimateConvertedSize,
  formatFileSize,
  getFormatFromMime,
  getOutputFilename,
  isSvgFile,
  MAX_FILE_SIZE,
  summarizeQueueSizes,
  validateFileMeta,
  validateImageDimensions,
} from './imageProcessing';

test('formatFileSize formats bytes, KB, and MB cleanly', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(1024), '1 KB');
  assert.equal(formatFileSize(1536), '1.5 KB');
  assert.equal(formatFileSize(2 * 1024 * 1024), '2 MB');
});

test('getFormatFromMime maps known image mimes', () => {
  assert.equal(getFormatFromMime('image/jpeg'), 'JPG');
  assert.equal(getFormatFromMime('image/png'), 'PNG');
  assert.equal(getFormatFromMime('image/webp'), 'WEBP');
  assert.equal(getFormatFromMime('image/svg+xml'), 'SVG');
  assert.equal(getFormatFromMime('application/octet-stream'), 'IMG');
});

test('isSvgFile detects SVG by mime or extension', () => {
  assert.equal(isSvgFile({ type: 'image/svg+xml', name: 'logo' }), true);
  assert.equal(isSvgFile({ type: 'text/plain', name: 'ICON.SVG' }), true);
  assert.equal(isSvgFile({ type: 'image/png', name: 'photo.png' }), false);
});

test('validateFileMeta enforces size and mime/extension rules', () => {
  assert.deepEqual(
    validateFileMeta({ name: 'photo.jpg', size: 2048, type: 'image/jpeg' }),
    { valid: true }
  );
  assert.deepEqual(
    validateFileMeta({ name: 'vector.svg', size: 512, type: '' }),
    { valid: true }
  );

  const emptyResult = validateFileMeta({
    name: 'empty.png',
    size: 0,
    type: 'image/png',
  });
  assert.equal(emptyResult.valid, false);

  const oversizedResult = validateFileMeta({
    name: 'huge.png',
    size: MAX_FILE_SIZE + 1,
    type: 'image/png',
  });
  assert.equal(oversizedResult.valid, false);

  const invalidTypeResult = validateFileMeta({
    name: 'doc.txt',
    size: 500,
    type: 'text/plain',
  });
  assert.equal(invalidTypeResult.valid, false);
});

test('validateImageDimensions rejects invalid or oversized dimensions', () => {
  assert.deepEqual(validateImageDimensions(1920, 1080), { valid: true });
  assert.equal(validateImageDimensions(0, 100).valid, false);
  assert.equal(validateImageDimensions(10001, 100).valid, false);
  assert.equal(validateImageDimensions(8000, 7000).valid, false);
});

test('calculateDimensions handles disabled, proportional, and exact resizing', () => {
  assert.deepEqual(
    calculateDimensions(1200, 800, {
      enabled: false,
      width: 400,
      height: 400,
      maintainRatio: true,
    }),
    { width: 1200, height: 800 }
  );

  assert.deepEqual(
    calculateDimensions(1200, 800, {
      enabled: true,
      width: 600,
      height: null,
      maintainRatio: true,
    }),
    { width: 600, height: 400 }
  );

  assert.deepEqual(
    calculateDimensions(1200, 800, {
      enabled: true,
      width: null,
      height: 400,
      maintainRatio: true,
    }),
    { width: 600, height: 400 }
  );

  assert.deepEqual(
    calculateDimensions(1200, 800, {
      enabled: true,
      width: 500,
      height: 500,
      maintainRatio: true,
    }),
    { width: 500, height: 333 }
  );

  assert.deepEqual(
    calculateDimensions(1200, 800, {
      enabled: true,
      width: 500,
      height: 500,
      maintainRatio: false,
    }),
    { width: 500, height: 500 }
  );
});

test('computeSizeDelta computes reduction and expansion accurately', () => {
  assert.deepEqual(computeSizeDelta(1000, 400), {
    direction: 'smaller',
    percent: 60,
    label: '-60%',
  });
  assert.deepEqual(computeSizeDelta(1000, 1250), {
    direction: 'larger',
    percent: 25,
    label: '+25%',
  });
  assert.deepEqual(computeSizeDelta(1000, 1000), {
    direction: 'same',
    percent: 0,
    label: '0%',
  });
});

test('getOutputFilename replaces extension and applies prefix/suffix naming patterns', () => {
  assert.equal(getOutputFilename('vacation.photo.png', 'webp'), 'vacation.photo.webp');
  assert.equal(getOutputFilename('diagram.svg', 'jpeg'), 'diagram.jpg');
  assert.equal(getOutputFilename('scan.bmp', 'pdf'), 'scan.pdf');
  assert.equal(
    getOutputFilename('hero.png', 'webp', { prefix: 'web-', suffix: '-2x' }),
    'web-hero-2x.webp'
  );
  assert.equal(
    getOutputFilename('photo.jpg', 'png', { prefix: 'a/b:', suffix: '*final?' }),
    'abphoto-final.png'.replace('-final', 'final')
  );
});

test('applyFilterToPixelData applies grayscale, sepia, and invert while preserving alpha', () => {
  const grayPixels = new Uint8ClampedArray([100, 150, 200, 255, 10, 20, 30, 0]);
  applyFilterToPixelData(grayPixels, 'grayscale');
  assert.equal(grayPixels[0], grayPixels[1]);
  assert.equal(grayPixels[1], grayPixels[2]);
  assert.equal(grayPixels[3], 255);
  assert.deepEqual(Array.from(grayPixels.slice(4)), [10, 20, 30, 0]);

  const sepiaPixels = new Uint8ClampedArray([100, 100, 100, 255]);
  applyFilterToPixelData(sepiaPixels, 'sepia');
  assert.ok(sepiaPixels[0] >= sepiaPixels[1] && sepiaPixels[1] >= sepiaPixels[2]);

  const invertPixels = new Uint8ClampedArray([10, 100, 255, 200]);
  applyFilterToPixelData(invertPixels, 'invert');
  assert.deepEqual(Array.from(invertPixels), [245, 155, 0, 200]);
});

test('encodeBmpBytes creates a valid 24-bit bottom-up Windows BMP buffer', () => {
  // 1x2 image: top pixel red, bottom pixel blue
  const rgba = new Uint8ClampedArray([
    255, 0, 0, 255,
    0, 0, 255, 255,
  ]);
  const bmp = encodeBmpBytes(rgba, 1, 2);
  assert.equal(bmp[0], 0x42);
  assert.equal(bmp[1], 0x4d);
  // Row stride for 1 pixel * 3 bytes padded to 4 bytes => 54 + 4*2 = 62 bytes
  assert.equal(bmp.length, 62);
  // Bottom row written first (blue -> B=255, G=0, R=0)
  assert.deepEqual(Array.from(bmp.slice(54, 57)), [255, 0, 0]);
  // Top row written second (red -> B=0, G=0, R=255)
  assert.deepEqual(Array.from(bmp.slice(58, 61)), [0, 0, 255]);
});

test('estimateConvertedSize and summarizeQueueSizes compute deterministic totals', () => {
  const resize = { enabled: false, width: null, height: null, maintainRatio: true };
  const bmpSize = estimateConvertedSize(
    { size: 50_000, width: 100, height: 100, status: 'pending', convertedSize: null },
    { format: 'bmp', quality: 85, resize, colorMode: 'original' }
  );
  assert.equal(bmpSize, 54 + 300 * 100);

  const webpSize = estimateConvertedSize(
    { size: 500_000, width: 1200, height: 800, status: 'pending', convertedSize: null },
    { format: 'webp', quality: 80, resize, colorMode: 'original' }
  );
  const jpgSize = estimateConvertedSize(
    { size: 500_000, width: 1200, height: 800, status: 'pending', convertedSize: null },
    { format: 'jpeg', quality: 80, resize, colorMode: 'original' }
  );
  assert.ok(webpSize < jpgSize);

  const summary = summarizeQueueSizes(
    [
      { size: 100_000, width: 800, height: 600, status: 'done', convertedSize: 40_000 },
      { size: 200_000, width: 100, height: 100, status: 'pending', convertedSize: null },
    ],
    { format: 'bmp', quality: 85, resize, colorMode: 'original' }
  );
  assert.equal(summary.totalImages, 2);
  assert.equal(summary.convertedCount, 1);
  assert.equal(summary.totalInitialBytes, 300_000);
  assert.equal(summary.totalEstimatedBytes, 40_000 + 30_054);
  assert.equal(summary.isEstimate, true);
});
