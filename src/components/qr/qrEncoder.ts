/**
 * Encoder QR Code ISO/IEC 18004 murni TypeScript (tanpa dependency eksternal).
 * Mendukung Byte mode, Error Correction Level M, Versi 1 s.d. 6
 * (kapasitas hingga 106 byte UTF-8 — cukup untuk payload presensi SIP!).
 */

interface VersionSpec {
  version: number;
  size: number;
  dataCodewords: number;
  ecCodewordsPerBlock: number;
  blocks: number;
  alignmentCenters: number[];
}

// Tabel spesifikasi QR Code ECC Level M (ISO/IEC 18004) untuk Versi 1-6
const VERSION_SPECS_M: VersionSpec[] = [
  {
    version: 1,
    size: 21,
    dataCodewords: 16,
    ecCodewordsPerBlock: 10,
    blocks: 1,
    alignmentCenters: [],
  },
  {
    version: 2,
    size: 25,
    dataCodewords: 28,
    ecCodewordsPerBlock: 16,
    blocks: 1,
    alignmentCenters: [6, 18],
  },
  {
    version: 3,
    size: 29,
    dataCodewords: 44,
    ecCodewordsPerBlock: 26,
    blocks: 1,
    alignmentCenters: [6, 22],
  },
  {
    version: 4,
    size: 33,
    dataCodewords: 64,
    ecCodewordsPerBlock: 18,
    blocks: 2,
    alignmentCenters: [6, 26],
  },
  {
    version: 5,
    size: 37,
    dataCodewords: 86,
    ecCodewordsPerBlock: 24,
    blocks: 2,
    alignmentCenters: [6, 30],
  },
  {
    version: 6,
    size: 41,
    dataCodewords: 108,
    ecCodewordsPerBlock: 16,
    blocks: 4,
    alignmentCenters: [6, 34],
  },
];

// Tabel log/exp GF(256) dengan polinomial primitif 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function reedSolomonGenerator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function reedSolomonRemainder(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = reedSolomonGenerator(ecCount);
  const rem = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecCount - 1] = 0;
    for (let j = 0; j < ecCount; j++) {
      rem[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return rem;
}

function encodeUtf8Bytes(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let codePoint = text.charCodeAt(i);
    if (codePoint < 0x80) {
      out.push(codePoint);
    } else if (codePoint < 0x800) {
      out.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (
      codePoint >= 0xd800 &&
      codePoint <= 0xdbff &&
      i + 1 < text.length
    ) {
      const low = text.charCodeAt(++i);
      codePoint = 0x10000 + (((codePoint & 0x3ff) << 10) | (low & 0x3ff));
      out.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      out.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return new Uint8Array(out);
}

function buildDataCodewords(bytes: Uint8Array, capacity: number): Uint8Array {
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  // Mode indicator Byte = 0100, Character count = 8 bit (untuk versi 1-9)
  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (let i = 0; i < bytes.length; i++) {
    pushBits(bytes[i], 8);
  }

  const maxBits = capacity * 8;
  const terminatorLen = Math.min(4, maxBits - bits.length);
  pushBits(0, terminatorLen);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = new Uint8Array(capacity);
  let byteIdx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j];
    }
    codewords[byteIdx++] = b;
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (byteIdx < capacity) {
    codewords[byteIdx++] = padBytes[padIdx];
    padIdx ^= 1;
  }

  return codewords;
}

function interleaveBlocks(
  dataCodewords: Uint8Array,
  spec: VersionSpec,
): Uint8Array {
  const blockDataSize = Math.floor(spec.dataCodewords / spec.blocks);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  for (let b = 0; b < spec.blocks; b++) {
    const start = b * blockDataSize;
    const block = dataCodewords.slice(start, start + blockDataSize);
    dataBlocks.push(block);
    ecBlocks.push(reedSolomonRemainder(block, spec.ecCodewordsPerBlock));
  }

  const totalLen =
    spec.dataCodewords + spec.blocks * spec.ecCodewordsPerBlock;
  const result = new Uint8Array(totalLen);
  let pos = 0;

  for (let i = 0; i < blockDataSize; i++) {
    for (let b = 0; b < spec.blocks; b++) {
      result[pos++] = dataBlocks[b][i];
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (let b = 0; b < spec.blocks; b++) {
      result[pos++] = ecBlocks[b][i];
    }
  }

  return result;
}

function computeFormatBits(eccLevelBits: number, maskPattern: number): number {
  const data = (eccLevelBits << 3) | maskPattern;
  let rem = data << 10;
  const poly = 0b10100110111;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) {
      rem ^= poly << (i - 10);
    }
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

function applyMaskCondition(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function evaluatePenalty(modules: boolean[][]): number {
  const n = modules.length;
  let penalty = 0;

  // Aturan 1: deretan 5+ modul berwarna sama di baris/kolom
  for (let r = 0; r < n; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < n; c++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  for (let c = 0; c < n; c++) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < n; r++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // Aturan 2: blok 2x2 berwarna sama
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = modules[r][c];
      if (
        modules[r][c + 1] === v &&
        modules[r + 1][c] === v &&
        modules[r + 1][c + 1] === v
      ) {
        penalty += 3;
      }
    }
  }

  // Aturan 4: keseimbangan rasio modul gelap
  let darkCount = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules[r][c]) darkCount++;
    }
  }
  const percent = (darkCount * 100) / (n * n);
  const diff = Math.abs(percent - 50);
  penalty += Math.floor(diff / 5) * 10;

  return penalty;
}

function drawFormatBits(
  modules: boolean[][],
  isFunction: boolean[][],
  mask: number,
) {
  const n = modules.length;
  // ECC Level M memiliki format indicator bits = 00
  const bits = computeFormatBits(0b00, mask);

  const setBit = (r: number, c: number, dark: boolean) => {
    modules[r][c] = dark;
    isFunction[r][c] = true;
  };

  for (let i = 0; i <= 5; i++) setBit(8, i, ((bits >> (14 - i)) & 1) === 1);
  setBit(8, 7, ((bits >> 8) & 1) === 1);
  setBit(8, 8, ((bits >> 7) & 1) === 1);
  setBit(7, 8, ((bits >> 6) & 1) === 1);
  for (let i = 9; i < 15; i++) setBit(14 - i, 8, ((bits >> (14 - i)) & 1) === 1);

  for (let i = 0; i < 8; i++) {
    setBit(8, n - 1 - i, ((bits >> i) & 1) === 1);
  }
  for (let i = 8; i < 15; i++) {
    setBit(n - 15 + i, 8, ((bits >> i) & 1) === 1);
  }
  // Dark module tetap
  setBit(n - 8, 8, true);
}

/**
 * Menghasilkan matriks boolean QR Code (`true` = modul gelap, `false` = terang).
 * Mengembalikan `null` bila teks kosong atau melebihi kapasitas Versi 6 ECC-M.
 */
export function generateQrMatrix(text: string): boolean[][] | null {
  if (!text) return null;

  const bytes = encodeUtf8Bytes(text);
  // Byte mode overhead: 4 bit mode + 8 bit length = 2 byte (dibulatkan ke atas)
  const spec = VERSION_SPECS_M.find((v) => bytes.length + 2 <= v.dataCodewords);
  if (!spec) return null;

  const n = spec.size;
  const modules: boolean[][] = Array.from({ length: n }, () =>
    Array<boolean>(n).fill(false),
  );
  const isFunction: boolean[][] = Array.from({ length: n }, () =>
    Array<boolean>(n).fill(false),
  );

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r < 0 || r >= n || c < 0 || c >= n) return;
    modules[r][c] = dark;
    isFunction[r][c] = true;
  };

  // Finder patterns + separators di 3 sudut
  const drawFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= n || c < 0 || c >= n) continue;
        const dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
        const dark = dist !== 2 && dist !== 4;
        setFunctionModule(r, c, dark);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, n - 7);
  drawFinder(n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns (Versi 2-6)
  for (const rCenter of spec.alignmentCenters) {
    for (const cCenter of spec.alignmentCenters) {
      if (
        (rCenter === 6 && cCenter === 6) ||
        (rCenter === 6 && cCenter === n - 7) ||
        (rCenter === n - 7 && cCenter === 6)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunctionModule(rCenter + dr, cCenter + dc, dist !== 1);
        }
      }
    }
  }

  // Reservasi area format bits terlebih dahulu
  drawFormatBits(modules, isFunction, 0);

  // Bangun bitstream data + ECC
  const dataCodewords = buildDataCodewords(bytes, spec.dataCodewords);
  const finalCodewords = interleaveBlocks(dataCodewords, spec);

  let bitIndex = 0;
  const totalBits = finalCodewords.length * 8;

  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let vert = 0; vert < n; vert++) {
      const r = upward ? n - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (isFunction[r][c]) continue;
        let dark = false;
        if (bitIndex < totalBits) {
          const byteVal = finalCodewords[bitIndex >> 3];
          dark = ((byteVal >> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex++;
        }
        modules[r][c] = dark;
      }
    }
  }

  // Pilih mask dengan penalti terendah
  let bestMask = 0;
  let bestPenalty = Number.POSITIVE_INFINITY;
  let bestMatrix: boolean[][] = modules;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = modules.map((row, r) =>
      row.map((val, c) =>
        !isFunction[r][c] && applyMaskCondition(mask, r, c) ? !val : val,
      ),
    );
    const fnCopy = isFunction.map((row) => [...row]);
    drawFormatBits(candidate, fnCopy, mask);
    const penalty = evaluatePenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestMatrix = candidate;
    }
  }

  void bestMask;
  return bestMatrix;
}
