// Runs the production TS module using the project's local TypeScript compiler.
// Temporary transpilation artifact is always removed; no keys, network or transfers.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const root = process.cwd();
const src = resolve(root, "src/crypto/prismTransactionV2.ts");
const localRequire = createRequire(join(root, "package.json"));
const ts = localRequire("typescript");
const output = ts.transpileModule(readFileSync(src, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
const tmp = resolve(root, `src/crypto/.prism-v2-parity-${process.pid}.mjs`);
let module;
try {
  writeFileSync(tmp, output.outputText, { flag: "wx", mode: 0o600 });
  module = await import(pathToFileURL(tmp).href);
} finally {
  try { unlinkSync(tmp); } catch { /* never remove unrelated file */ }
}
const {
  signPrismTransactionV2, verifyPrismTransactionV2,
  encodePrismV2SignedRequestJSON, calculatePrismTransactionV2ID,
} = module;
const { hexToBytes } = await import("@noble/hashes/utils.js");

// Fixed PUBLIC test vector independently produced using Go's crypto/ed25519,
// crypto/sha256 and encoding/hex. Never use these seed bytes for real funds.
const seed = hexToBytes("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
const draft = {
  chainId: "prism-1234567890abcdef",
  genesisHash: "a".repeat(64),
  from: "prism_56475aa75463474c0285df5dbf2bcab73da65135",
  to: "prism_" + "b".repeat(40),
  amount: "1",
  nonce: "0",
  publicKey: "03a107bff3ce10be1d70dd18e74bc09967e4d6309ba50d5f1ddc8664125531b8",
};
const EXPECTED_ID = "c8158583c100d4a9c32a2f9a8a0045e602fc6a5afcdcb864e4349725fdb08f9a";
const EXPECTED_SIG = "0dd84faed8fc267469e84bc5a58abeb31d199b4593764a6943eccb08dd01f5107bc9bf03648c5a8d7b6671f8ab60b581275dd82905bb8222fdd069b73771030c";

const signed = signPrismTransactionV2(draft, seed);
assert.equal(calculatePrismTransactionV2ID(draft), EXPECTED_ID);
assert.equal(signed.id, EXPECTED_ID, "Core Go / TypeScript ID mismatch");
assert.equal(signed.signature, EXPECTED_SIG, "Core Go / TypeScript Ed25519 mismatch");
assert.equal(verifyPrismTransactionV2(signed), true);
assert.equal(verifyPrismTransactionV2({ ...signed, amount: "2" }), false);
assert.equal(verifyPrismTransactionV2({ ...signed, nonce: "1" }), false);
assert.equal(verifyPrismTransactionV2({ ...signed, genesis_hash: "b".repeat(64) }), false);
assert.equal(verifyPrismTransactionV2({ ...signed, chain_id: "prism-eeeeeeeeeeeeeeee" }), false);
assert.equal(verifyPrismTransactionV2({ ...signed, version: 0 }), false);
assert.throws(() => signPrismTransactionV2({ ...draft, amount: "0" }, seed));
assert.throws(() => signPrismTransactionV2({ ...draft, amount: "01" }, seed));
assert.throws(() => signPrismTransactionV2({ ...draft, amount: "18446744073709551616" }, seed));
assert.throws(() => signPrismTransactionV2({ ...draft, from: draft.to }, seed));
assert.throws(() => signPrismTransactionV2(draft, new Uint8Array(32)));
const encoded = encodePrismV2SignedRequestJSON(signed);
const wire = JSON.parse(encoded);
assert.equal(wire.chainId, draft.chainId);
assert.equal(wire.transaction.version, 2);
assert.equal(wire.transaction.amount, 1);
assert.equal(wire.transaction.nonce, 0);
assert.match(encoded, /"amount":1/);
assert.doesNotMatch(encoded, /"amount":"1"/);
// Large numeric values retain their decimal spelling on the wire.
const huge = signPrismTransactionV2({ ...draft, amount: "9007199254740993" }, seed);
assert.match(encodePrismV2SignedRequestJSON(huge), /"amount":9007199254740993/);
console.log("PASS: Go reference ID and Ed25519 signature match TypeScript");
console.log("PASS: tampering, network replay and invalid uint64 rejected");
console.log("PASS: on-wire unsigned uint64 are JSON numbers without JS precision loss");
console.log("NO HTTP calls; NO device keys used; NO funds sent");
