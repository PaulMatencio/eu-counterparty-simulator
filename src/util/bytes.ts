import { createHash, randomBytes } from 'node:crypto';

export type Bytes32 = Uint8Array;

export function toHex(b: Uint8Array): string {
  return Buffer.from(b).toString('hex');
}

export function fromHex(hex: string, expectedLength?: number): Uint8Array {
  const clean = hex.replace(/^0x/, '').toLowerCase();
  if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2 !== 0) throw new Error(`invalid hex: ${hex.slice(0, 20)}…`);
  const out = new Uint8Array(Buffer.from(clean, 'hex'));
  if (expectedLength !== undefined && out.length !== expectedLength) {
    throw new Error(`expected ${expectedLength} bytes, got ${out.length}`);
  }
  return out;
}

export const randomBytes32 = (): Bytes32 => new Uint8Array(randomBytes(32));

export function sha256(...parts: Uint8Array[]): Bytes32 {
  const h = createHash('sha256');
  for (const p of parts) h.update(p);
  return new Uint8Array(h.digest());
}

export const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

/** Same layout as Compact's pad(32, "text"): UTF-8 bytes, zero-padded on the right. */
export function pad32(text: string): Bytes32 {
  const b = utf8(text);
  if (b.length > 32) throw new Error('pad32: text longer than 32 bytes');
  const out = new Uint8Array(32);
  out.set(b);
  return out;
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
