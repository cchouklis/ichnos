import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UNDERLAY_MAX_BYTES, detectImageMime, validateUnderlay } from './image-upload.util.ts';

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const wav = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]);

describe('detectImageMime', () => {
  it('recognises PNG, JPEG and WebP by signature', () => {
    assert.equal(detectImageMime(png), 'image/png');
    assert.equal(detectImageMime(jpeg), 'image/jpeg');
    assert.equal(detectImageMime(webp), 'image/webp');
  });
  it('rejects SVG, other RIFF files, empty and truncated input', () => {
    assert.equal(detectImageMime(svg), null);
    assert.equal(detectImageMime(wav), null);
    assert.equal(detectImageMime(new Uint8Array()), null);
    assert.equal(detectImageMime(Uint8Array.from([0x89, 0x50])), null);
  });
});

describe('validateUnderlay', () => {
  it('accepts a valid image within the size limit', () => {
    assert.deepEqual(validateUnderlay(1024, png), { ok: true, mime: 'image/png' });
  });
  it('accepts exactly the size limit and rejects one byte over', () => {
    assert.equal(validateUnderlay(UNDERLAY_MAX_BYTES, jpeg).ok, true);
    assert.equal(validateUnderlay(UNDERLAY_MAX_BYTES + 1, jpeg).ok, false);
  });
  it('rejects empty files and files whose contents are not an allowed image', () => {
    assert.equal(validateUnderlay(0, png).ok, false);
    assert.equal(validateUnderlay(500, svg).ok, false);
  });
  it('ignores any claimed type: the decision rests on the bytes', () => {
    const result = validateUnderlay(500, svg);
    assert.equal(result.ok, false);
  });
});
