/** Limits and checks for the blueprint underlay upload. Pure so they can be tested without a browser. */

export const UNDERLAY_MAX_BYTES = 5 * 1024 * 1024;
export const UNDERLAY_ACCEPT = 'image/png,image/jpeg,image/webp';

export type UnderlayMime = 'image/png' | 'image/jpeg' | 'image/webp';

/** Identifies the image type from the file's first bytes, never from its name or declared type. */
export function detectImageMime(head: Uint8Array): UnderlayMime | null {
  const startsWith = (sig: readonly number[], offset = 0): boolean => sig.every((b, i) => head[offset + i] === b);
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg';
  // WebP: "RIFF" + 4 size bytes + "WEBP"
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}

export type UnderlayCheck = { readonly ok: true; readonly mime: UnderlayMime } | { readonly ok: false; readonly reason: string };

export function validateUnderlay(sizeBytes: number, head: Uint8Array): UnderlayCheck {
  if (sizeBytes <= 0) return { ok: false, reason: 'The file is empty.' };
  if (sizeBytes > UNDERLAY_MAX_BYTES) {
    return { ok: false, reason: `The image is larger than ${UNDERLAY_MAX_BYTES / (1024 * 1024)} MB.` };
  }
  const mime = detectImageMime(head);
  if (!mime) return { ok: false, reason: 'Only PNG, JPEG or WebP images can be used as an underlay.' };
  return { ok: true, mime };
}
