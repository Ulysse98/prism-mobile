import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import {
  bytesToHex,
  hexToBytes,
  utf8ToBytes,
} from "@noble/hashes/utils.js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (
  message: Uint8Array,
) => sha512(message);

const SECRET_KEY_STORAGE_KEY =
  "prism.wallet.ed25519.secret.v1";

const SECRET_KEY_SIZE = 32;

export type PrismWallet = {
  address: string;
  publicKey: string;
};

export type PrismPoUWJob = {
  id: string;
  worker: string;
  workerAddress: string;
  task: string;
  input: number[];
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

  const secretKey =
    await Crypto.getRandomBytesAsync(
      SECRET_KEY_SIZE,
    );

  await SecureStore.setItemAsync(
    SECRET_KEY_STORAGE_KEY,
    bytesToHex(secretKey),
  );

  return secretKey;
}

function deriveWallet(
  secretKey: Uint8Array,
): PrismWallet {
  const publicKey =
    ed.getPublicKey(secretKey);

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

export function
verifyPrismPoUWJob(
  job: PrismPoUWJob,
): void {
  if (
    job.task !== "sum_squares"
  ) {
    throw new Error(
      `Unsupported PoUW task: ${job.task}`,
    );
  }

  if (
    job.input.length === 0
  ) {
    throw new Error(
      "PoUW task contains no input.",
    );
  }

  for (
    const value of job.input
  ) {
    if (
      !Number.isSafeInteger(value) ||
      value < 0
    ) {
      throw new Error(
        "PoUW task contains an invalid integer.",
      );
    }
  }

  const expectedInputHash =
    hashText(
      JSON.stringify(job.input),
    );

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

export function
computePrismPoUW(
  job: PrismPoUWJob,
): number {
  verifyPrismPoUWJob(job);

  let result = 0;

  for (
    const value of job.input
  ) {
    const square =
      value * value;

    if (
      !Number.isSafeInteger(square)
    ) {
      throw new Error(
        "PoUW multiplication overflow.",
      );
    }

    result += square;

    if (
      !Number.isSafeInteger(result)
    ) {
      throw new Error(
        "PoUW addition overflow.",
      );
    }
  }

  return result;
}

export async function
signPrismPoUWProof(
  job: PrismPoUWJob,
  result: number,
): Promise<SignedPrismPoUWProof> {
  verifyPrismPoUWJob(job);

  if (
    !Number.isSafeInteger(result) ||
    result < 0
  ) {
    throw new Error(
      "Invalid PoUW result.",
    );
  }

  const expectedResult =
    computePrismPoUW(job);

  if (
    result !== expectedResult
  ) {
    throw new Error(
      `Invalid PoUW result: expected ${expectedResult}, got ${result}.`,
    );
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

  const outputHash =
    hashText(
      String(result),
    );

  const score =
    job.input.length;

  const payload = [
    job.id,
    wallet.address,
    wallet.publicKey,
    String(result),
    outputHash,
    String(score),
  ].join("|");

  const proofId =
    hashText(payload);

  const signature =
    ed.sign(
      utf8ToBytes(proofId),
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
    result,
    outputHash,
    score,
    proofId,
    signature:
      bytesToHex(signature),
  };
}
