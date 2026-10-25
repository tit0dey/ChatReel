const PUBLIC_KEY_JWK = {
  kty: 'EC',
  crv: 'P-256',
  x: '7djqJUvomhvft8ontxTED70zIo6EjxuVyR6NgiBYMdI',
  y: 'uuDXLm1MKiUcP5nezhReB0Fa_RBygoNgExUzP92ZIuo',
} as const;

const KEY_PATTERN = /^CRPRO-([A-Za-z0-9_-]{16})-([A-Za-z0-9_-]{86})$/;
const encoder = new TextEncoder();
let importedKey: Promise<CryptoKey> | null = null;

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

const P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
const N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
const GX = 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n;
const GY = 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n;
const QX = bytesToBigInt(decodeBase64Url(PUBLIC_KEY_JWK.x));
const QY = bytesToBigInt(decodeBase64Url(PUBLIC_KEY_JWK.y));

type JacobianPoint = [bigint, bigint, bigint];
type AffinePoint = { x: bigint; y: bigint } | null;
const INFINITY: JacobianPoint = [0n, 1n, 0n];

function mod(value: bigint, modulus: bigint = P): bigint {
  const result = value % modulus;
  return result >= 0n ? result : result + modulus;
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  let factor = mod(base, modulus);
  let remaining = exponent;
  while (remaining > 0n) {
    if (remaining & 1n) result = mod(result * factor, modulus);
    factor = mod(factor * factor, modulus);
    remaining >>= 1n;
  }
  return result;
}

function doublePoint(point: JacobianPoint): JacobianPoint {
  const [x, y, z] = point;
  if (z === 0n || y === 0n) return INFINITY;
  const xx = mod(x * x);
  const yy = mod(y * y);
  const yyyy = mod(yy * yy);
  const z2 = mod(z * z);
  const z4 = mod(z2 * z2);
  const d = mod(2n * (mod((x + yy) * (x + yy)) - xx - yyyy));
  const e = mod(3n * (xx - z4));
  const f = mod(e * e);
  const x3 = mod(f - 2n * d);
  const y3 = mod(e * (d - x3) - 8n * yyyy);
  const z3 = mod(2n * y * z);
  return [x3, y3, z3];
}

function addMixed(point: JacobianPoint, x2: bigint, y2: bigint): JacobianPoint {
  const [x1, y1, z1] = point;
  if (z1 === 0n) return [x2, y2, 1n];
  const z1z1 = mod(z1 * z1);
  const u2 = mod(x2 * z1z1);
  const s2 = mod(y2 * z1 * z1z1);
  const h = mod(u2 - x1);
  const r = mod(s2 - y1);
  if (h === 0n) return r === 0n ? doublePoint(point) : INFINITY;
  const hh = mod(h * h);
  const hhh = mod(hh * h);
  const v = mod(x1 * hh);
  const x3 = mod(r * r - hhh - 2n * v);
  const y3 = mod(r * (v - x3) - y1 * hhh);
  const z3 = mod(z1 * h);
  return [x3, y3, z3];
}

function scalarMultiply(scalar: bigint, x: bigint, y: bigint): JacobianPoint {
  let result = INFINITY;
  const bits = scalar.toString(2);
  for (const bit of bits) {
    result = doublePoint(result);
    if (bit === '1') result = addMixed(result, x, y);
  }
  return result;
}

function toAffine(point: JacobianPoint): AffinePoint {
  const [x, y, z] = point;
  if (z === 0n) return null;
  const inverse = modPow(z, P - 2n, P);
  const inverse2 = mod(inverse * inverse);
  return { x: mod(x * inverse2), y: mod(y * inverse2 * inverse) };
}

function addAffine(first: AffinePoint, second: AffinePoint): AffinePoint {
  if (!first) return second;
  if (!second) return first;
  if (first.x === second.x) {
    if (mod(first.y + second.y) === 0n) return null;
    const slope = mod((3n * first.x * first.x - 3n) * modPow(2n * first.y, P - 2n, P));
    const x = mod(slope * slope - 2n * first.x);
    return { x, y: mod(slope * (first.x - x) - first.y) };
  }
  const slope = mod((second.y - first.y) * modPow(second.x - first.x, P - 2n, P));
  const x = mod(slope * slope - first.x - second.x);
  return { x, y: mod(slope * (first.x - x) - first.y) };
}

const SHA_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256(input: Uint8Array): Uint8Array {
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(input);
  data[input.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  const state = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index++) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index++) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index++) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 = (h + s1 + choice + SHA_K[index] + words[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (s0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temporary1) >>> 0;
      d = c; c = b; b = a; a = (temporary1 + temporary2) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  const output = new Uint8Array(32);
  const outputView = new DataView(output.buffer);
  state.forEach((value, index) => outputView.setUint32(index * 4, value, false));
  return output;
}

/** Synchronous P-256 verification for non-secure legacy WebViews. */
export function verifyLicenseKeyPureJs(licenseKey: string): boolean {
  const match = KEY_PATTERN.exec(licenseKey.trim());
  if (!match) return false;
  try {
    const signature = decodeBase64Url(match[2]);
    if (signature.length !== 64) return false;
    const r = bytesToBigInt(signature.subarray(0, 32));
    const s = bytesToBigInt(signature.subarray(32));
    if (r <= 0n || r >= N || s <= 0n || s >= N) return false;
    const digest = bytesToBigInt(sha256(encoder.encode(`ChatReel-Lifetime-v1:${match[1]}`)));
    const inverse = modPow(s, N - 2n, N);
    const u1 = mod(digest * inverse, N);
    const u2 = mod(r * inverse, N);
    const point = addAffine(toAffine(scalarMultiply(u1, GX, GY)), toAffine(scalarMultiply(u2, QX, QY)));
    return point !== null && mod(point.x, N) === r;
  } catch {
    return false;
  }
}

export async function verifyLicenseKey(licenseKey: string): Promise<boolean> {
  const normalized = licenseKey.trim();
  const match = KEY_PATTERN.exec(normalized);
  if (!match) return false;
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      importedKey ??= subtle.importKey('jwk', { ...PUBLIC_KEY_JWK }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      const publicKey = await importedKey;
      return await subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        decodeBase64Url(match[2]) as BufferSource,
        encoder.encode(`ChatReel-Lifetime-v1:${match[1]}`),
      );
    } catch {
      // Fall through to the self-contained verifier on older WebViews.
    }
  }
  return verifyLicenseKeyPureJs(normalized);
}
