/**
 * PRISM public-address QR encoder.
 * QR Model 2, version 4, error correction L, mask 0. ASCII input, max 78 bytes.
 * Self-contained: never sends the address to a remote QR service.
 * This encoder is deliberately restricted to the current ASCII Prism address format.
 */
const SIZE = 33;
const DATA_BYTES = 80;
const ECC_BYTES = 20;

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function eccRemainder(data: number[]): number[] {
  let divisor = [1];
  let root = 1;
  for (let i = 0; i < ECC_BYTES; i++) {
    const next = Array(divisor.length + 1).fill(0);
    for (let j = 0; j < divisor.length; j++) {
      next[j] ^= divisor[j];
      next[j + 1] ^= gfMultiply(divisor[j], root);
    }
    divisor = next;
    root = gfMultiply(root, 2);
  }
  const result = Array(ECC_BYTES).fill(0);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.shift();
    result.push(0);
    for (let k = 0; k < ECC_BYTES; k++) {
      result[k] ^= gfMultiply(divisor[k + 1], factor);
    }
  }
  return result;
}

export function createPublicAddressQr(address: string): boolean[][] | null {
  // Only encode the public, ASCII address; reject unexpected payloads.
  if (!/^prism_[A-Za-z0-9]{1,72}$/.test(address) || address.length > 78) {
    return null;
  }

  const bits: number[] = [];
  const append = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  append(0x4, 4); // byte mode
  append(address.length, 8);
  for (let i = 0; i < address.length; i++) append(address.charCodeAt(i), 8);
  append(0, Math.min(4, DATA_BYTES * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    data.push(b);
  }
  for (let i = 0; data.length < DATA_BYTES; i++) data.push(i % 2 === 0 ? 0xec : 0x11);
  const codewords = [...data, ...eccRemainder(data)];

  const modules: boolean[][] = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const reserved: boolean[][] = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));
  const setFunction = (x: number, y: number, dark: boolean) => {
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
      modules[y][x] = dark;
      reserved[y][x] = true;
    }
  };

  // Finder and separator rings.
  for (const [cx, cy] of [[3, 3], [SIZE - 4, 3], [3, SIZE - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const radius = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(cx + dx, cy + dy, radius !== 2 && radius !== 4);
      }
    }
  }
  // Timing patterns.
  for (let i = 8; i < SIZE - 8; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  // Version-4 alignment center at (26, 26).
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      setFunction(26 + dx, 26 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }

  // Format data: ECC level L (01), mask 0 (000), BCH(15,5) + fixed XOR.
  const dataBits = 1 << 3;
  let remainder = dataBits;
  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  const format = ((dataBits << 10) | remainder) ^ 0x5412;
  const getFormat = (i: number) => ((format >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) setFunction(8, i, getFormat(i));
  setFunction(8, 7, getFormat(6));
  setFunction(8, 8, getFormat(7));
  setFunction(7, 8, getFormat(8));
  for (let i = 9; i < 15; i++) setFunction(14 - i, 8, getFormat(i));
  for (let i = 0; i < 8; i++) setFunction(SIZE - 1 - i, 8, getFormat(i));
  for (let i = 8; i < 15; i++) setFunction(8, SIZE - 15 + i, getFormat(i));
  setFunction(8, SIZE - 8, true);

  // Zigzag placement and mask pattern 0. Remainder bits are zero before masking.
  let bitIndex = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < SIZE; vert++) {
      const y = ((right + 1) & 2) === 0 ? SIZE - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (reserved[y][x]) continue;
        let dark = false;
        if (bitIndex < codewords.length * 8) {
          dark = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
        }
        bitIndex++;
        if ((x + y) % 2 === 0) dark = !dark;
        modules[y][x] = dark;
      }
    }
  }
  return modules;
}
