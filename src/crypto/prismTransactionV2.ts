// PRISM Mobile v2.2A: offline, network-bound transaction signing.
// This module has NO storage access, HTTP access, or transaction submission.
import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

const UINT64_MAX = (1n << 64n) - 1n;
const CHAIN_ID = /^prism-[0-9a-f]{16}$/;
const GENESIS_HASH = /^[0-9a-f]{64}$/;
const ADDRESS = /^prism_[0-9a-f]{40}$/;
const PUBLIC_KEY = /^[0-9a-f]{64}$/;
const SIGNATURE = /^[0-9a-f]{128}$/;

/** Amount and nonce are canonical decimal strings of raw uint64 units, NEVER JS numbers. */
export interface PrismV2TransferDraft {
  chainId: string;
  genesisHash: string;
  from: string;
  to: string;
  amount: string;
  nonce: string;
  publicKey: string;
}

/** amount/nonce remain strings in memory, to avoid JS uint64 precision loss. */
export interface PrismV2SignedTransaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  nonce: string;
  public_key: string;
  signature: string;
  version: 2;
  chain_id: string;
  genesis_hash: string;
}

function uint64(value: string, name: string): string {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${name} must be a canonical unsigned decimal string`);
  }
  if (BigInt(value) > UINT64_MAX) {
    throw new Error(`${name} exceeds uint64`);
  }
  return value;
}

function validateDraft(draft: PrismV2TransferDraft): void {
  if (!CHAIN_ID.test(draft.chainId)) throw new Error("Invalid V2 chain ID");
  if (!GENESIS_HASH.test(draft.genesisHash)) throw new Error("Invalid V2 genesis hash");
  if (!ADDRESS.test(draft.from) || !ADDRESS.test(draft.to)) {
    throw new Error("Invalid canonical Prism address");
  }
  if (draft.from === draft.to) throw new Error("Sender and recipient must differ");
  if (!PUBLIC_KEY.test(draft.publicKey)) throw new Error("Invalid Ed25519 public key");
  if (uint64(draft.amount, "amount") === "0") throw new Error("Amount must be positive");
  uint64(draft.nonce, "nonce");
}

export function prismV2AddressFromPublicKey(publicKey: Uint8Array): string {
  if (!(publicKey instanceof Uint8Array) || publicKey.length !== 32) {
    throw new Error("Ed25519 public key must be 32 bytes");
  }
  return "prism_" + bytesToHex(sha256(publicKey).slice(0, 20));
}

/** Must match Prism Core internal/transaction/transaction_v2.go signingPayloadV2. */
export function prismV2SigningPayload(draft: PrismV2TransferDraft): string {
  validateDraft(draft);
  return [
    "prism-transaction-v2",
    draft.chainId,
    draft.genesisHash,
    draft.from,
    draft.to,
    draft.amount,
    draft.nonce,
    draft.publicKey,
  ].join("|");
}

export function calculatePrismTransactionV2ID(draft: PrismV2TransferDraft): string {
  return bytesToHex(sha256(utf8ToBytes(prismV2SigningPayload(draft))));
}

/** Caller keeps seed on device. Never log it, send it to APIs, or persist it here. */
export function signPrismTransactionV2(
  draft: PrismV2TransferDraft,
  secretSeed: Uint8Array,
): PrismV2SignedTransaction {
  validateDraft(draft);
  if (!(secretSeed instanceof Uint8Array) || secretSeed.length !== 32) {
    throw new Error("Ed25519 seed must be 32 bytes");
  }
  const actualPublicKey = ed25519.getPublicKey(secretSeed);
  if (bytesToHex(actualPublicKey) !== draft.publicKey) {
    throw new Error("Seed does not match transaction public key");
  }
  if (prismV2AddressFromPublicKey(actualPublicKey) !== draft.from) {
    throw new Error("Signing key does not own sender address");
  }
  const id = calculatePrismTransactionV2ID(draft);
  // Go signs []byte(tx.ID): UTF-8 of the 64-character hex ID, not raw hash bytes.
  const signature = bytesToHex(ed25519.sign(utf8ToBytes(id), secretSeed));
  return {
    id,
    from: draft.from,
    to: draft.to,
    amount: draft.amount,
    nonce: draft.nonce,
    public_key: draft.publicKey,
    signature,
    version: 2,
    chain_id: draft.chainId,
    genesis_hash: draft.genesisHash,
  };
}

/** Local validation only; the node must still verify balance, nonce and network. */
export function verifyPrismTransactionV2(tx: PrismV2SignedTransaction): boolean {
  try {
    if (tx.version !== 2 || !GENESIS_HASH.test(tx.id) || !SIGNATURE.test(tx.signature)) {
      return false;
    }
    const draft: PrismV2TransferDraft = {
      chainId: tx.chain_id,
      genesisHash: tx.genesis_hash,
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      nonce: tx.nonce,
      publicKey: tx.public_key,
    };
    if (calculatePrismTransactionV2ID(draft) !== tx.id) return false;
    const pub = hexToBytes(tx.public_key);
    if (prismV2AddressFromPublicKey(pub) !== tx.from) return false;
    return ed25519.verify(hexToBytes(tx.signature), utf8ToBytes(tx.id), pub);
  } catch {
    return false;
  }
}

/** Builds Go's JSON request with lossless numeric uint64 fields. No network call. */
export function encodePrismV2SignedRequestJSON(tx: PrismV2SignedTransaction): string {
  if (!verifyPrismTransactionV2(tx)) throw new Error("Invalid signed V2 transaction");
  const quote = (value: string) => JSON.stringify(value);
  const fields = [
    `"id":${quote(tx.id)}`,
    `"from":${quote(tx.from)}`,
    `"to":${quote(tx.to)}`,
    `"amount":${tx.amount}`,
    `"nonce":${tx.nonce}`,
    `"public_key":${quote(tx.public_key)}`,
    `"signature":${quote(tx.signature)}`,
    `"version":2`,
    `"chain_id":${quote(tx.chain_id)}`,
    `"genesis_hash":${quote(tx.genesis_hash)}`,
  ];
  return `{"chainId":${quote(tx.chain_id)},"transaction":{${fields.join(",")}}}`;
}
