import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";

const WALLET_SEED_KEY =
  "prism.wallet.ed25519.seed.v1";

export type PrismWallet = {
  address: string;
  publicKey: string;
};

export type SignedUsefulWorkProof = {
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

function bytesToHex(
  bytes: Uint8Array,
): string {
  return Array.from(bytes)
    .map((value) =>
      value
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
}

function hexToBytes(
  value: string,
): Uint8Array {
  if (
    value.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(value)
  ) {
    throw new Error(
      "Invalid hexadecimal value",
    );
  }

  const bytes = new Uint8Array(
    value.length / 2,
  );

  for (
    let index = 0;
    index < bytes.length;
    index++
  ) {
    bytes[index] = parseInt(
      value.slice(
        index * 2,
        index * 2 + 2,
      ),
      16,
    );
  }

  return bytes;
}

function asciiBytes(
  value: string,
): Uint8Array {
  const bytes = new Uint8Array(
    value.length,
  );

  for (
    let index = 0;
    index < value.length;
    index++
  ) {
    const code =
      value.charCodeAt(index);

    if (code > 0x7f) {
      throw new Error(
        "Expected ASCII input",
      );
    }

    bytes[index] = code;
  }

  return bytes;
}

async function sha256Bytes(
  bytes: Uint8Array,
): Promise<Uint8Array> {
  const input = new Uint8Array(
    bytes.length,
  );

  input.set(bytes);

  const digest =
    await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      input.buffer,
    );

  return new Uint8Array(digest);
}

async function sha256AsciiHex(
  value: string,
): Promise<string> {
  const digest =
    await sha256Bytes(
      asciiBytes(value),
    );

  return bytesToHex(digest);
}

async function deriveAddress(
  publicKey: Uint8Array,
): Promise<string> {
  const hash =
    await sha256Bytes(publicKey);

  return (
    "prism_" +
    bytesToHex(
      hash.slice(0, 20),
    )
  );
}

async function loadSeed(): Promise<
  Uint8Array | null
> {
  const stored =
    await SecureStore.getItemAsync(
      WALLET_SEED_KEY,
    );

  if (!stored) {
    return null;
  }

  const seed = hexToBytes(stored);

  if (
    seed.length !==
    nacl.sign.seedLength
  ) {
    throw new Error(
      "Stored Prism wallet seed has invalid length",
    );
  }

  return seed;
}

async function getOrCreateSeed(): Promise<
  Uint8Array
> {
  const existing =
    await loadSeed();

  if (existing) {
    return existing;
  }

  const seed =
    await Crypto.getRandomBytesAsync(
      nacl.sign.seedLength,
    );

  await SecureStore.setItemAsync(
    WALLET_SEED_KEY,
    bytesToHex(seed),
  );

  return seed;
}

async function loadKeyPair() {
  const seed =
    await getOrCreateSeed();

  return nacl.sign.keyPair.fromSeed(
    seed,
  );
}

export async function getOrCreatePrismWallet():
Promise<PrismWallet> {
  const keyPair =
    await loadKeyPair();

  const address =
    await deriveAddress(
      keyPair.publicKey,
    );

  return {
    address,
    publicKey:
      bytesToHex(
        keyPair.publicKey,
      ),
  };
}

export async function signUsefulWork(
  input: {
    jobId: string;
    sourceChainHeight: number;
    result: number;
    score: number;
  },
): Promise<SignedUsefulWorkProof> {
  const keyPair =
    await loadKeyPair();

  const publicKey =
    bytesToHex(
      keyPair.publicKey,
    );

  const workerAddress =
    await deriveAddress(
      keyPair.publicKey,
    );

  const outputHash =
    await sha256AsciiHex(
      String(input.result),
    );

  const proofPayload = [
    input.jobId,
    workerAddress,
    publicKey,
    String(input.result),
    outputHash,
    String(input.score),
  ].join("|");

  const proofId =
    await sha256AsciiHex(
      proofPayload,
    );

  const signatureBytes =
    nacl.sign.detached(
      asciiBytes(proofId),
      keyPair.secretKey,
    );

  return {
    jobId: input.jobId,
    sourceChainHeight:
      input.sourceChainHeight,
    workerAddress,
    publicKey,
    result: input.result,
    outputHash,
    score: input.score,
    proofId,
    signature:
      bytesToHex(
        signatureBytes,
      ),
  };
}
