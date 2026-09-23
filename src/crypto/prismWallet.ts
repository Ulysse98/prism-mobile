import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  bytesToHex,
  hexToBytes,
  utf8ToBytes,
} from "@noble/hashes/utils.js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

/*
 * Ed25519 comes from @noble/curves and stays entirely in JavaScript.
 * We deliberately avoid the WebCrypto / expo-crypto digest bridge here.
 */

const SECRET_KEY_STORAGE_KEY =
  "prism.wallet.ed25519.secret.v1";

const SECRET_KEY_SIZE = 32;
const MAX_MATRIX_ELEMENTS = 4096;

export type PrismWallet = {
  address: string;
  publicKey: string;
};

export type PrismPoUWResult =
  | number
  | number[];

export type PrismPoUWJob = {
  id: string;
  worker: string;
  workerAddress: string;
  task: string;
  input: number[];
  inputB?: number[];
  rowsA?: number;
  colsA?: number;
  colsB?: number;
  inputHash: string;
  difficulty: string;
  reward: number;
  status: string;
  createdAt: string;
  sourceChainHeight: number;
};

export type SignedPrismPoUWProof = {
  jobId: string;
  sourceChainHeight: number;
  workerAddress: string;
  publicKey: string;
  result: number;
  resultValues?: number[];
  outputHash: string;
  score: number;
  proofId: string;
  signature: string;
};

function hashText(
  value: string,
): string {
  return bytesToHex(
    sha256(
      utf8ToBytes(value),
    ),
  );
}

function addressFromPublicKey(
  publicKey: Uint8Array,
): string {
  const digest =
    sha256(publicKey);

  return (
    "prism_" +
    bytesToHex(
      digest.slice(0, 20),
    )
  );
}

async function loadSecretKey():
Promise<Uint8Array | null> {
  const available =
    await SecureStore.isAvailableAsync();

  if (!available) {
    throw new Error(
      "SecureStore is unavailable on this device.",
    );
  }

  const stored =
    await SecureStore.getItemAsync(
      SECRET_KEY_STORAGE_KEY,
    );

  if (!stored) {
    return null;
  }

  const secretKey =
    hexToBytes(stored);

  if (
    secretKey.length !==
    SECRET_KEY_SIZE
  ) {
    throw new Error(
      "Stored Prism wallet has an invalid private key.",
    );
  }

  return secretKey;
}

async function
loadOrCreateSecretKey():
Promise<Uint8Array> {
  const existing =
    await loadSecretKey();

  if (existing) {
    return existing;
  }

  /*
   * Use the synchronous Expo API here.
   * This returns Uint8Array directly and avoids an async native bridge
   * round-trip during wallet initialization.
   */
  const secretKey =
    Crypto.getRandomBytes(
      SECRET_KEY_SIZE,
    );

  if (
    !(secretKey instanceof Uint8Array) ||
    secretKey.length !==
      SECRET_KEY_SIZE
  ) {
    throw new Error(
      "Expo Crypto returned an invalid Prism private key.",
    );
  }

  await SecureStore.setItemAsync(
    SECRET_KEY_STORAGE_KEY,
    bytesToHex(secretKey),
  );

  return secretKey;
}

function deriveWallet(
  secretKey: Uint8Array,
): PrismWallet {
  if (
    secretKey.length !==
    SECRET_KEY_SIZE
  ) {
    throw new Error(
      "Prism wallet private key must be 32 bytes.",
    );
  }

  const publicKey =
    ed25519.getPublicKey(secretKey);

  return {
    address:
      addressFromPublicKey(
        publicKey,
      ),
    publicKey:
      bytesToHex(publicKey),
  };
}

export async function
getOrCreatePrismWallet():
Promise<PrismWallet> {
  const secretKey =
    await loadOrCreateSecretKey();

  return deriveWallet(
    secretKey,
  );
}

function checkedMultiply(
  left: number,
  right: number,
  label: string,
): number {
  const result =
    left * right;

  if (
    !Number.isSafeInteger(result) ||
    result < 0
  ) {
    throw new Error(
      `${label} multiplication overflow.`,
    );
  }

  return result;
}

function checkedAdd(
  left: number,
  right: number,
  label: string,
): number {
  const result =
    left + right;

  if (
    !Number.isSafeInteger(result) ||
    result < 0
  ) {
    throw new Error(
      `${label} addition overflow.`,
    );
  }

  return result;
}

function validatePoUWVector(
  values: number[],
  label: string,
): void {
  if (!Array.isArray(values)) {
    throw new Error(
      `PoUW ${label} is not an array.`,
    );
  }

  if (values.length === 0) {
    throw new Error(
      `PoUW ${label} contains no input.`,
    );
  }

  for (const value of values) {
    if (
      !Number.isSafeInteger(value) ||
      value < 0
    ) {
      throw new Error(
        `PoUW ${label} contains an invalid integer.`,
      );
    }
  }
}

function matrixDimensions(
  job: PrismPoUWJob,
) {
  const rowsA = job.rowsA;
  const colsA = job.colsA;
  const colsB = job.colsB;

  for (const [
    name,
    value,
  ] of [
    ["rowsA", rowsA],
    ["colsA", colsA],
    ["colsB", colsB],
  ] as const) {
    if (
      value === undefined ||
      !Number.isSafeInteger(value) ||
      value <= 0
    ) {
      throw new Error(
        `Invalid matrix dimension: ${name}.`,
      );
    }
  }

  return {
    rowsA: rowsA!,
    colsA: colsA!,
    colsB: colsB!,
  };
}

function convolutionDimensions(
  job: PrismPoUWJob,
) {
  const rows = job.rowsA;
  const cols = job.colsA;
  const kernelSize = job.colsB;

  for (const [
    name,
    value,
  ] of [
    ["rows", rows],
    ["cols", cols],
    ["kernelSize", kernelSize],
  ] as const) {
    if (
      value === undefined ||
      !Number.isSafeInteger(value) ||
      value <= 0
    ) {
      throw new Error(
        `Invalid convolution dimension: ${name}.`,
      );
    }
  }

  if (
    kernelSize! > rows! ||
    kernelSize! > cols!
  ) {
    throw new Error(
      "Convolution kernel cannot be larger than the image.",
    );
  }

  return {
    rows: rows!,
    cols: cols!,
    kernelSize: kernelSize!,
  };
}

function expectedPoUWInputHash(
  job: PrismPoUWJob,
): string {
  if (job.task === "dot_product") {
    if (!job.inputB) {
      throw new Error(
        "Dot product requires a second input vector.",
      );
    }

    return hashText(
      JSON.stringify({
        values_a: job.input,
        values_b: job.inputB,
      }),
    );
  }

  if (
    job.task ===
    "matrix_multiply"
  ) {
    if (!job.inputB) {
      throw new Error(
        "Matrix multiply requires matrix B.",
      );
    }

    const {
      rowsA,
      colsA,
      colsB,
    } = matrixDimensions(job);

    return hashText(
      JSON.stringify({
        rows_a: rowsA,
        cols_a: colsA,
        cols_b: colsB,
        values_a: job.input,
        values_b: job.inputB,
      }),
    );
  }

  if (
    job.task ===
    "image_convolution"
  ) {
    if (!job.inputB) {
      throw new Error(
        "Image convolution requires a kernel.",
      );
    }

    const {
      rows,
      cols,
      kernelSize,
    } =
      convolutionDimensions(
        job,
      );

    return hashText(
      JSON.stringify({
        rows,
        cols,
        kernel_size:
          kernelSize,
        image:
          job.input,
        kernel:
          job.inputB,
      }),
    );
  }

  return hashText(
    JSON.stringify(job.input),
  );
}

function scorePrismPoUW(
  job: PrismPoUWJob,
): number {
  if (job.task === "dot_product") {
    return (
      job.input.length +
      (job.inputB?.length ?? 0)
    );
  }

  if (
    job.task ===
    "matrix_multiply"
  ) {
    const {
      rowsA,
      colsA,
      colsB,
    } = matrixDimensions(job);

    return checkedMultiply(
      checkedMultiply(
        rowsA,
        colsA,
        "Matrix work units",
      ),
      colsB,
      "Matrix work units",
    );
  }

  if (
    job.task ===
    "image_convolution"
  ) {
    const {
      rows,
      cols,
      kernelSize,
    } =
      convolutionDimensions(
        job,
      );

    const outputRows =
      rows -
      kernelSize +
      1;

    const outputCols =
      cols -
      kernelSize +
      1;

    const outputCells =
      checkedMultiply(
        outputRows,
        outputCols,
        "Convolution output cells",
      );

    const kernelCells =
      checkedMultiply(
        kernelSize,
        kernelSize,
        "Convolution kernel cells",
      );

    return checkedMultiply(
      outputCells,
      kernelCells,
      "Convolution work units",
    );
  }

  return job.input.length;
}

function isPrime(
  value: number,
): boolean {
  if (value < 2) {
    return false;
  }

  if (value === 2) {
    return true;
  }

  if (value % 2 === 0) {
    return false;
  }

  for (
    let divisor = 3;
    divisor <=
      Math.floor(
        value / divisor,
      );
    divisor += 2
  ) {
    if (
      value % divisor === 0
    ) {
      return false;
    }
  }

  return true;
}

export function
verifyPrismPoUWJob(
  job: PrismPoUWJob,
): void {
  if (
    job.task !== "sum_squares" &&
    job.task !== "dot_product" &&
    job.task !== "prime_count" &&
    job.task !== "matrix_multiply" &&
    job.task !== "image_convolution"
  ) {
    throw new Error(
      `Unsupported PoUW task: ${job.task}`,
    );
  }

  validatePoUWVector(
    job.input,
    "input",
  );

  if (job.task === "dot_product") {
    if (!job.inputB) {
      throw new Error(
        "Dot product requires a second input vector.",
      );
    }

    validatePoUWVector(
      job.inputB,
      "second input",
    );

    if (
      job.input.length !==
      job.inputB.length
    ) {
      throw new Error(
        "Dot product vectors must have the same length.",
      );
    }
  } else if (
    job.task === "matrix_multiply"
  ) {
    if (!job.inputB) {
      throw new Error(
        "Matrix multiply requires matrix B.",
      );
    }

    validatePoUWVector(
      job.inputB,
      "matrix B",
    );

    const {
      rowsA,
      colsA,
      colsB,
    } = matrixDimensions(job);

    const expectedA =
      checkedMultiply(
        rowsA,
        colsA,
        "Matrix A size",
      );

    const expectedB =
      checkedMultiply(
        colsA,
        colsB,
        "Matrix B size",
      );

    const expectedOutput =
      checkedMultiply(
        rowsA,
        colsB,
        "Matrix output size",
      );

    if (
      expectedA >
        MAX_MATRIX_ELEMENTS ||
      expectedB >
        MAX_MATRIX_ELEMENTS ||
      expectedOutput >
        MAX_MATRIX_ELEMENTS
    ) {
      throw new Error(
        "Matrix task exceeds maximum size.",
      );
    }

    if (
      job.input.length !==
      expectedA
    ) {
      throw new Error(
        `Matrix A expects ${expectedA} values, got ${job.input.length}.`,
      );
    }

    if (
      job.inputB.length !==
      expectedB
    ) {
      throw new Error(
        `Matrix B expects ${expectedB} values, got ${job.inputB.length}.`,
      );
    }
  } else if (
    job.task ===
    "image_convolution"
  ) {
    if (!job.inputB) {
      throw new Error(
        "Image convolution requires a kernel.",
      );
    }

    validatePoUWVector(
      job.inputB,
      "kernel",
    );

    const {
      rows,
      cols,
      kernelSize,
    } =
      convolutionDimensions(
        job,
      );

    const expectedImage =
      checkedMultiply(
        rows,
        cols,
        "Convolution image size",
      );

    const expectedKernel =
      checkedMultiply(
        kernelSize,
        kernelSize,
        "Convolution kernel size",
      );

    const outputRows =
      rows -
      kernelSize +
      1;

    const outputCols =
      cols -
      kernelSize +
      1;

    const expectedOutput =
      checkedMultiply(
        outputRows,
        outputCols,
        "Convolution output size",
      );

    if (
      expectedImage >
        MAX_MATRIX_ELEMENTS ||
      expectedKernel >
        MAX_MATRIX_ELEMENTS ||
      expectedOutput >
        MAX_MATRIX_ELEMENTS
    ) {
      throw new Error(
        "Image convolution exceeds the PoUW size limit.",
      );
    }

    if (
      job.input.length !==
      expectedImage
    ) {
      throw new Error(
        "Image convolution has an invalid image size.",
      );
    }

    if (
      job.inputB.length !==
      expectedKernel
    ) {
      throw new Error(
        "Image convolution has an invalid kernel size.",
      );
    }
  } else if (
    job.inputB &&
    job.inputB.length > 0
  ) {
    throw new Error(
      `${job.task} does not accept a second input vector.`,
    );
  }

  const expectedInputHash =
    expectedPoUWInputHash(job);

  if (
    job.inputHash !==
    expectedInputHash
  ) {
    throw new Error(
      "Invalid PoUW input hash.",
    );
  }

  const expectedJobId =
    hashText(
      `${job.task}|${job.inputHash}`,
    );

  if (
    job.id !==
    expectedJobId
  ) {
    throw new Error(
      "Invalid PoUW job ID.",
    );
  }
}

function computeMatrixMultiply(
  job: PrismPoUWJob,
): number[] {
  const valuesB =
    job.inputB!;

  const {
    rowsA,
    colsA,
    colsB,
  } = matrixDimensions(job);

  const output =
    new Array<number>(
      rowsA * colsB,
    ).fill(0);

  for (
    let row = 0;
    row < rowsA;
    row += 1
  ) {
    for (
      let col = 0;
      col < colsB;
      col += 1
    ) {
      let cell = 0;

      for (
        let inner = 0;
        inner < colsA;
        inner += 1
      ) {
        const aIndex =
          row * colsA +
          inner;

        const bIndex =
          inner * colsB +
          col;

        const product =
          checkedMultiply(
            job.input[
              aIndex
            ],
            valuesB[
              bIndex
            ],
            "PoUW matrix",
          );

        cell =
          checkedAdd(
            cell,
            product,
            "PoUW matrix",
          );
      }

      const outputIndex =
        row * colsB +
        col;

      output[
        outputIndex
      ] = cell;
    }
  }

  return output;
}

function computeImageConvolution(
  job: PrismPoUWJob,
): number[] {
  const kernel =
    job.inputB!;

  const {
    rows,
    cols,
    kernelSize,
  } =
    convolutionDimensions(
      job,
    );

  const outputRows =
    rows -
    kernelSize +
    1;

  const outputCols =
    cols -
    kernelSize +
    1;

  const output =
    new Array<number>(
      outputRows *
        outputCols,
    ).fill(0);

  for (
    let outRow = 0;
    outRow < outputRows;
    outRow += 1
  ) {
    for (
      let outCol = 0;
      outCol < outputCols;
      outCol += 1
    ) {
      let cell = 0;

      for (
        let kernelRow = 0;
        kernelRow <
        kernelSize;
        kernelRow += 1
      ) {
        for (
          let kernelCol = 0;
          kernelCol <
          kernelSize;
          kernelCol += 1
        ) {
          const imageIndex =
            (
              outRow +
              kernelRow
            ) *
              cols +
            outCol +
            kernelCol;

          const kernelIndex =
            kernelRow *
              kernelSize +
            kernelCol;

          const product =
            checkedMultiply(
              job.input[
                imageIndex
              ],
              kernel[
                kernelIndex
              ],
              "PoUW convolution",
            );

          cell =
            checkedAdd(
              cell,
              product,
              "PoUW convolution",
            );
        }
      }

      const outputIndex =
        outRow *
          outputCols +
        outCol;

      output[
        outputIndex
      ] = cell;
    }
  }

  return output;
}

export function
computePrismPoUW(
  job: PrismPoUWJob,
): PrismPoUWResult {
  verifyPrismPoUWJob(job);

  switch (job.task) {
    case "sum_squares": {
      let result = 0;

      for (
        const value
        of job.input
      ) {
        const square =
          checkedMultiply(
            value,
            value,
            "PoUW",
          );

        result =
          checkedAdd(
            result,
            square,
            "PoUW",
          );
      }

      return result;
    }

    case "dot_product": {
      const valuesB =
        job.inputB!;

      let result = 0;

      for (
        let index = 0;
        index <
        job.input.length;
        index += 1
      ) {
        const product =
          checkedMultiply(
            job.input[
              index
            ],
            valuesB[
              index
            ],
            "PoUW",
          );

        result =
          checkedAdd(
            result,
            product,
            "PoUW",
          );
      }

      return result;
    }

    case "prime_count": {
      let count = 0;

      for (
        const value
        of job.input
      ) {
        if (
          isPrime(value)
        ) {
          count += 1;
        }
      }

      return count;
    }

    case "matrix_multiply":
      return computeMatrixMultiply(
        job,
      );

    case "image_convolution":
      return computeImageConvolution(
        job,
      );

    default:
      throw new Error(
        `Unsupported PoUW task: ${job.task}`,
      );
  }
}

function equalPoUWResult(
  left: PrismPoUWResult,
  right: PrismPoUWResult,
): boolean {
  if (
    Array.isArray(left) !==
    Array.isArray(right)
  ) {
    return false;
  }

  if (
    !Array.isArray(left) &&
    !Array.isArray(right)
  ) {
    return left === right;
  }

  const leftValues =
    left as number[];

  const rightValues =
    right as number[];

  if (
    leftValues.length !==
    rightValues.length
  ) {
    return false;
  }

  return leftValues.every(
    (value, index) =>
      value ===
      rightValues[index],
  );
}

export async function
signPrismPoUWProof(
  job: PrismPoUWJob,
  result: PrismPoUWResult,
): Promise<SignedPrismPoUWProof> {
  verifyPrismPoUWJob(job);

  const expectedResult =
    computePrismPoUW(job);

  if (
    !equalPoUWResult(
      result,
      expectedResult,
    )
  ) {
    throw new Error(
      "Invalid PoUW result.",
    );
  }

  if (
    !Array.isArray(result)
  ) {
    if (
      !Number.isSafeInteger(
        result,
      ) ||
      result < 0
    ) {
      throw new Error(
        "Invalid PoUW scalar result.",
      );
    }
  }

  const secretKey =
    await loadOrCreateSecretKey();

  const wallet =
    deriveWallet(secretKey);

  if (
    job.workerAddress !==
    wallet.address
  ) {
    throw new Error(
      "PoUW job belongs to another Prism wallet.",
    );
  }

  const vectorResult =
    Array.isArray(result)
      ? [...result]
      : undefined;

  const scalarResult:
    number =
      Array.isArray(result)
        ? 0
        : result;

  const outputHash =
    vectorResult
      ? hashText(
          JSON.stringify(
            vectorResult,
          ),
        )
      : hashText(
          String(
            scalarResult,
          ),
        );

  const score =
    scorePrismPoUW(job);

  const payload = [
    job.id,
    wallet.address,
    wallet.publicKey,
    String(
      scalarResult,
    ),
    outputHash,
    String(score),
  ].join("|");

  const proofId =
    hashText(payload);

  /*
   * Synchronous noble-curves signing only.
   * No WebCrypto digest bridge is involved.
   */
  const signature =
    ed25519.sign(
      utf8ToBytes(
        proofId,
      ),
      secretKey,
    );

  return {
    jobId:
      job.id,
    sourceChainHeight:
      job.sourceChainHeight,
    workerAddress:
      wallet.address,
    publicKey:
      wallet.publicKey,
    result:
      scalarResult,
    resultValues:
      vectorResult,
    outputHash,
    score,
    proofId,
    signature:
      bytesToHex(
        signature,
      ),
  };
}
