import { usePrismAppearance } from "@/theme/prism-appearance";
import { createPrismStyleVariants, usePrismScreenStyles } from "@/theme/prism-screen-styles";
// Prism Wallet V2.2C — local signature validation only. No HTTP POST.
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { hexToBytes } from "@noble/hashes/utils.js";
import { PRISM_API } from "../api/client";
import {
  signExistingPrismWalletTransferV2,
  submitSinglePrismV2LabTransfer,
} from "../crypto/prismWallet";
import {
  calculatePrismTransactionV2ID,
  prismV2AddressFromPublicKey,
  type PrismV2TransferDraft,
} from "../crypto/prismTransactionV2";

// Pinned to the disposable development chain already inspected on the Pixel 8a.
// A new chain or genesis MUST be reviewed before updating these values.
const LAB_CHAIN_ID = "prism-db99573f269a98ab";
const LAB_GENESIS_HASH =
  "00af37327a8f2b764699b14b76642bed5c21b8ab07a766e813bac99f11910a9d";
const LOCAL_API = "http://127.0.0.1:8080/api/v1";
const ADDRESS_RE = /^prism_[0-9a-f]{40}$/;
const PUBLIC_KEY_RE = /^[0-9a-f]{64}$/;
const UINT64_MAX = (1n << 64n) - 1n;
// Fail closed: installing this patch cannot enable transaction submission.
const LAB_MANUAL_SEND_ENABLED =
  process.env.EXPO_PUBLIC_PRISM_LAB_SEND_ENABLED === "ENABLE_EXACT_ONE";
const LAB_RECIPIENT = "prism_afe68557d263d27c974c3550391d39fa9aa1c342";
const LAB_WALLET = "prism_297ee45259340851cf341ece082b160e23eac731";

type JSONRecord = Record<string, unknown>;
type Preview = {
  id: string;
  recipient: string;
  amount: string;
  nonce: string;
  remaining: string;
  chainId: string;
};

function record(value: unknown, source: string): JSONRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Réponse ${source} invalide`);
  }
  return value as JSONRecord;
}

function safeU64Number(value: unknown, field: string): bigint {
  // JSON.parse() cannot represent every Go uint64. Reject ambiguous/rounded values.
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} hors précision JavaScript : opération bloquée`);
  }
  return BigInt(value);
}

async function fetchReadOnly(path: string, signal: AbortSignal): Promise<JSONRecord> {
  const response = await fetch(`${LOCAL_API}${path}`, { method: "GET", signal });
  if (!response.ok) throw new Error(`API Prism HTTP ${response.status}`);
  return record(await response.json() as unknown, path);
}

function chosenTransferNotAllowed(
  preview: Preview | null, address: string | null,
): boolean {
  return preview === null || address !== LAB_WALLET ||
    preview.recipient !== LAB_RECIPIENT || preview.amount !== "1" ||
    preview.nonce !== "0" || preview.remaining !== "101" ||
    preview.chainId !== LAB_CHAIN_ID;
}

export function WalletV2SendPreview({
  address,
  publicKey,
}: {
  address: string | null;
  publicKey: string | null;
}) {
  const styles = usePrismScreenStyles(prismStyleVariants);
  const { colors } = usePrismAppearance();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [signedId, setSignedId] = useState<string | null>(null);
  const [sendReceipt, setSendReceipt] = useState<{ id: string; block: number } | null>(null);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const sendAttempted = useRef(false);
  const requestVersion = useRef(0);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      requestVersion.current += 1;
      requestController.current?.abort();
    };
  }, []);

  useEffect(() => {
    requestVersion.current += 1;
    requestController.current?.abort();
    setPreview(null);
    setSignedId(null);
    setSendReceipt(null);
    setError(null);
    setLoading(false);
  }, [address, publicKey]);

  function resetPreview(): void {
    requestVersion.current += 1;
    requestController.current?.abort();
    setPreview(null);
    setSignedId(null);
    setSendReceipt(null);
    setError(null);
    setLoading(false);
  }

  // Once any POST is attempted, this mounted screen cannot submit again.
  // A network timeout after POST is ambiguous: inspect on-chain history first.
  async function manuallySendExactlyOne(): Promise<void> {
    const chosen = preview;
    if (chosen === null || !signedId || loading || sendAttempted.current) return;
    sendAttempted.current = true;
    const version = ++requestVersion.current;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    setSendNotice(null);
    setError(null);
    try {
      if (!LAB_MANUAL_SEND_ENABLED || PRISM_API !== LOCAL_API) {
        throw new Error("Envoi verrouillé : autorisation explicite absente");
      }
      if (address !== LAB_WALLET || recipient !== LAB_RECIPIENT ||
          chosen.recipient !== LAB_RECIPIENT || chosen.amount !== "1" ||
          amount !== "1" || chosen.nonce !== "0" ||
          chosen.remaining !== "101" || chosen.id !== signedId ||
          chosen.chainId !== LAB_CHAIN_ID || !publicKey ||
          !PUBLIC_KEY_RE.test(publicKey) ||
          prismV2AddressFromPublicKey(hexToBytes(publicKey)) !== LAB_WALLET) {
        throw new Error("Transaction différente de l'unique scénario de laboratoire autorisé");
      }
      const [status, context, wallet, history] = await Promise.all([
        fetchReadOnly("/status", controller.signal),
        fetchReadOnly("/transactions/context", controller.signal),
        fetchReadOnly(`/wallets/${encodeURIComponent(address)}`, controller.signal),
        fetchReadOnly(`/transactions?address=${encodeURIComponent(address)}&limit=25`, controller.signal),
      ]);
      if (controller.signal.aborted || version !== requestVersion.current) return;
      if (status.chainValid !== true || status.chainId !== LAB_CHAIN_ID ||
          status.genesisHash !== LAB_GENESIS_HASH ||
          context.chainId !== LAB_CHAIN_ID || context.genesisHash !== LAB_GENESIS_HASH ||
          context.transactionVersion !== 2 || wallet.address !== LAB_WALLET ||
          safeU64Number(wallet.availableBalance, "Solde") !== 102n ||
          safeU64Number(wallet.nonce, "Nonce") !== 0n ||
          history.address !== LAB_WALLET || history.count !== 1 ||
          !Array.isArray(history.entries) || history.entries.length !== 1 ||
          record(history.entries[0], "historique").txId !==
            "55c9a27664ed82a241383070add9cb0a5a3af700a82bd244786e09fa56ef94fc") {
        throw new Error("État de chaîne ou historique modifié : envoi refusé");
      }
      const draft: PrismV2TransferDraft = {
        chainId: LAB_CHAIN_ID,
        genesisHash: LAB_GENESIS_HASH,
        from: LAB_WALLET,
        to: LAB_RECIPIENT,
        amount: "1",
        nonce: "0",
        publicKey,
      };
      if (calculatePrismTransactionV2ID(draft) !== chosen.id) {
        throw new Error("Identifiant V2 différent de l'aperçu signé");
      }
      // The wrapper reads only the existing seed, signs, zeroes its JS buffer,
      // and performs exactly one POST. It never retries after an ambiguous error.
      const receipt = await submitSinglePrismV2LabTransfer(draft, chosen.id);
      if (version === requestVersion.current) {
        setSendReceipt(receipt);
        setSendNotice(`Accepté par le laboratoire : bloc #${receipt.block}. Vérifier l'historique.`);
      }
    } catch (cause) {
      if (version === requestVersion.current) {
        const detail = cause instanceof Error ? cause.message : "Erreur inconnue";
        setError(`${detail}. Aucun nouvel essai dans cette session. Vérifier le solde et l'historique côté Core.`);
      }
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        requestController.current = null;
      }
    }
  }

  function askManualSendConfirmation(): void {
    const chosen = preview;
    if (!LAB_MANUAL_SEND_ENABLED || !chosen || !signedId ||
        loading || sendAttempted.current || sendReceipt !== null) return;
    Alert.alert(
      "ENVOI RÉEL SUR TESTNET LOCAL",
      "Envoyer exactement 1 unité de test depuis le Pixel vers :\n" +
      LAB_RECIPIENT + "\n\n" +
      "Réseau : " + LAB_CHAIN_ID + "\n" +
      "Le solde devrait passer de 102 à 101. Cette opération écrit un bloc.\n\n" +
      "Aucune seconde tentative automatique ne sera effectuée.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Envoyer 1 (testnet)", style: "destructive", onPress: () => { void manuallySendExactlyOne(); } },
      ],
      { cancelable: true },
    );
  }

  async function preparePreview(): Promise<void> {
    resetPreview();
    const version = ++requestVersion.current;
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);

    try {
      if (PRISM_API !== LOCAL_API) {
        throw new Error("Aperçu réservé à l'API locale de laboratoire 8080");
      }
      if (!address || !ADDRESS_RE.test(address) ||
          !publicKey || !PUBLIC_KEY_RE.test(publicKey) ||
          prismV2AddressFromPublicKey(hexToBytes(publicKey)) !== address) {
        throw new Error("Identité Ed25519 locale incohérente");
      }
      if (!ADDRESS_RE.test(recipient) || recipient === address) {
        throw new Error("Adresse destinataire incorrecte ou identique à l'émetteur");
      }
      if (!/^[1-9][0-9]*$/.test(amount) || BigInt(amount) > UINT64_MAX) {
        throw new Error("Montant invalide : saisir un entier uint64 positif");
      }

      const [rawStatus, rawContext, rawWallet] = await Promise.all([
        fetchReadOnly("/status", controller.signal),
        fetchReadOnly("/transactions/context", controller.signal),
        fetchReadOnly(`/wallets/${encodeURIComponent(address)}`, controller.signal),
      ]);
      if (controller.signal.aborted || version !== requestVersion.current) return;

      if (rawStatus.chainValid !== true || rawStatus.chainId !== LAB_CHAIN_ID ||
          rawStatus.genesisHash !== LAB_GENESIS_HASH ||
          (rawStatus.walletChainId !== undefined &&
           rawStatus.walletChainId !== LAB_CHAIN_ID) ||
          rawContext.chainId !== LAB_CHAIN_ID ||
          rawContext.genesisHash !== LAB_GENESIS_HASH ||
          rawContext.transactionVersion !== 2) {
        throw new Error("Réseau ou Genesis différent du laboratoire épinglé");
      }
      if (rawWallet.address !== address) {
        throw new Error("La réponse solde ne correspond pas au Wallet local");
      }

      const available = safeU64Number(rawWallet.availableBalance, "Solde disponible");
      const nonce = safeU64Number(rawWallet.nonce, "Nonce");
      const requested = BigInt(amount);
      if (requested > available) {
        throw new Error("Solde insuffisant pour cet aperçu");
      }

      const draft: PrismV2TransferDraft = {
        chainId: LAB_CHAIN_ID,
        genesisHash: LAB_GENESIS_HASH,
        from: address,
        to: recipient,
        amount,
        nonce: nonce.toString(),
        publicKey,
      };
      const id = calculatePrismTransactionV2ID(draft);
      if (!controller.signal.aborted && version === requestVersion.current) {
        setPreview({
          id,
          recipient,
          amount,
          nonce: nonce.toString(),
          remaining: (available - requested).toString(),
          chainId: LAB_CHAIN_ID,
        });
      }
    } catch (cause) {
      if (!controller.signal.aborted && version === requestVersion.current) {
        setError(cause instanceof Error ? cause.message : "Aperçu impossible");
      }
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        requestController.current = null;
      }
    }
  }

  // V2.2C: a signed transaction stays on this device and is discarded.
  // Never submits a transaction, never stores signature bytes in React state.
  async function signPreviewLocally(): Promise<void> {
    const chosen = preview;
    if (chosen === null) return;
    requestController.current?.abort();
    const version = ++requestVersion.current;
    const controller = new AbortController();
    requestController.current = controller;
    setSignedId(null);
    setSendReceipt(null);
    setError(null);
    setLoading(true);
    try {
      if (PRISM_API !== LOCAL_API ||
          !address || !ADDRESS_RE.test(address) ||
          !publicKey || !PUBLIC_KEY_RE.test(publicKey) ||
          prismV2AddressFromPublicKey(hexToBytes(publicKey)) !== address) {
        throw new Error("Identite et API locales non autorisees");
      }
      if (recipient !== chosen.recipient || amount !== chosen.amount) {
        throw new Error("Parametres modifies, refaire la previsualisation");
      }
      const draft: PrismV2TransferDraft = {
        chainId: LAB_CHAIN_ID,
        genesisHash: LAB_GENESIS_HASH,
        from: address,
        to: chosen.recipient,
        amount: chosen.amount,
        nonce: chosen.nonce,
        publicKey,
      };
      if (calculatePrismTransactionV2ID(draft) !== chosen.id) {
        throw new Error("Identifiant de la previsualisation invalide");
      }
      // Re-read canonical context, wallet nonce and available balance
      // just before signing; abort on any change since the preview.
      const [status, context, wallet] = await Promise.all([
        fetchReadOnly("/status", controller.signal),
        fetchReadOnly("/transactions/context", controller.signal),
        fetchReadOnly(`/wallets/${encodeURIComponent(address)}`, controller.signal),
      ]);
      if (controller.signal.aborted || version !== requestVersion.current) return;
      if (status.chainValid !== true || status.chainId !== LAB_CHAIN_ID ||
          status.genesisHash !== LAB_GENESIS_HASH ||
          (status.walletChainId !== undefined && status.walletChainId !== LAB_CHAIN_ID) ||
          context.chainId !== LAB_CHAIN_ID || context.genesisHash !== LAB_GENESIS_HASH ||
          context.transactionVersion !== 2 || wallet.address !== address) {
        throw new Error("Identite reseau V2 ou adresse du wallet modifiee");
      }
      const available = safeU64Number(wallet.availableBalance, "Solde disponible");
      const nonce = safeU64Number(wallet.nonce, "Nonce");
      const requested = BigInt(chosen.amount);
      if (requested === 0n || requested > available ||
          nonce.toString() !== chosen.nonce ||
          (available - requested).toString() !== chosen.remaining) {
        throw new Error("Solde ou nonce modifie, refaire la previsualisation");
      }
      // Reads an EXISTING SecureStore seed. It cannot create another wallet.
      const result = await signExistingPrismWalletTransferV2(draft);
      if (controller.signal.aborted || version !== requestVersion.current) return;
      if (!result.verified || result.id !== chosen.id) {
        throw new Error("Signature locale differente de la previsualisation");
      }
      setSignedId(result.id);
    } catch (cause) {
      if (!controller.signal.aborted && version === requestVersion.current) {
        setError(cause instanceof Error ? cause.message : "Signature locale impossible");
      }
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        requestController.current = null;
      }
    }
  }

  function requestSigningConfirmation(): void {
    const chosen = preview;
    if (chosen === null || loading || signedId !== null) return;
    Alert.alert(
      "Signature locale de test",
      `Signer ${chosen.amount} unite(s) vers ${chosen.recipient}?\n\n` +
      "La signature sera verifiee puis jetee. Aucun transfert ne sera envoye.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Signer en local", onPress: () => { void signPreviewLocally(); } },
      ],
      { cancelable: true },
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>PRISM · APERÇU D'ENVOI V2</Text>
      <Text style={styles.note}>
        {LAB_MANUAL_SEND_ENABLED
          ? "TESTNET LOCAL · Envoi manuel possible uniquement après confirmation"
          : "Laboratoire local uniquement · Lecture seule"}
      </Text>
      <Text style={styles.warning}>
        {sendReceipt !== null
          ? "Transaction de test soumise au Core. Vérifier son inclusion et le nouveau solde."
          : LAB_MANUAL_SEND_ENABLED
            ? "ATTENTION : ce mode peut envoyer 1 unité de test et écrire un bloc après confirmation."
            : signedId === null
              ? "Aucune signature effectuée. Aucun transfert envoyé."
              : "Signature locale vérifiée. Aucun transfert envoyé."}
      </Text>
      <Text style={styles.label}>Adresse destinataire (prism_...)</Text>
      <TextInput
        style={styles.input}
        value={recipient}
        onChangeText={(value) => { resetPreview(); setRecipient(value.trim()); }}
        placeholder="prism_..."
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={46}
        accessibilityLabel="Adresse du destinataire de test"
      />
      <Text style={styles.label}>Montant (unités entières de test)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={(value) => { resetPreview(); setAmount(value); }}
        placeholder="1"
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        maxLength={20}
        accessibilityLabel="Montant du transfert de test"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Prévisualiser sans signer ni envoyer"
        disabled={loading}
        onPress={() => { void preparePreview(); }}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>Prévisualiser (sans envoyer)</Text>
      </Pressable>
      {loading && <ActivityIndicator color={colors.accent} style={styles.spinner} />}
      {error !== null && <Text style={styles.error}>● {error}</Text>}
      {preview !== null && (
        <View style={styles.result}>
          <Text style={styles.ok}>
            {signedId === null
              ? "✓ Prévisualisation calculée — NON SIGNÉE"
              : "✓ Signature locale vérifiée — non diffusée à ce stade"}
          </Text>
          <Text style={styles.value}>Montant : {preview.amount} unités de test</Text>
          <Text style={styles.value}>Destinataire : {preview.recipient}</Text>
          <Text style={styles.value}>Nonce actuel : {preview.nonce}</Text>
          <Text style={styles.value}>Solde théorique après : {preview.remaining}</Text>
          <Text style={styles.value}>Réseau : {preview.chainId}</Text>
          <Text style={styles.hash} selectable>
            {sendReceipt === null ? "ID hypothétique : " : "ID de la transaction envoyée : "}
            {preview.id}
          </Text>
          <Text style={styles.note}>
            {sendReceipt === null
              ? "Cet ID est calculé localement. Le solde on-chain ne change pas avant soumission."
              : "Soumission acceptée localement : actualiser le Wallet pour confirmer solde et historique."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirmer et signer localement, sans envoyer"
            disabled={loading || signedId !== null}
            onPress={requestSigningConfirmation}
            style={[styles.button, (loading || signedId !== null) && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {signedId === null ? "Signer en local (sans envoyer)" : "Signature locale verifiee"}
            </Text>
          </Pressable>
          {signedId !== null && (
            <Text style={styles.ok}>
              Signature Ed25519 vérifiée sur ce Pixel. ID : {signedId.slice(0, 12)}...
              {sendReceipt !== null
                ? " Transaction soumise au testnet local."
                : sendAttempted.current
                  ? " Tentative d'envoi : vérifier l'état on-chain avant toute autre opération."
                  : " Aucun POST."}
            </Text>
          )}
          {signedId !== null && (
            <View style={styles.result}>
              <Text style={styles.warning}>
                {LAB_MANUAL_SEND_ENABLED
                  ? "Testnet : l'envoi d'une unité nécessite encore une confirmation Android explicite."
                  : "ENVOI VERROUILLÉ. Installer ce patch n'active aucun transfert."}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={!LAB_MANUAL_SEND_ENABLED || loading || sendAttempted.current ||
                  sendReceipt !== null || chosenTransferNotAllowed(preview, address)}
                onPress={askManualSendConfirmation}
                style={[styles.button, (!LAB_MANUAL_SEND_ENABLED || loading || sendAttempted.current ||
                  sendReceipt !== null || chosenTransferNotAllowed(preview, address)) && styles.buttonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {LAB_MANUAL_SEND_ENABLED
                    ? "Confirmer et envoyer 1 unité sur le testnet"
                    : "Envoi verrouillé — autorisation séparée requise"}
                </Text>
              </Pressable>
              {sendNotice !== null && <Text style={styles.ok}>{sendNotice}</Text>}
              {sendReceipt !== null && (
                <Text style={styles.hash} selectable>
                  Transaction soumise : {sendReceipt.id}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const prismStyleVariants = createPrismStyleVariants({
  card: {
    marginBottom: 18, padding: 16, borderWidth: 1, borderColor: "#24527a",
    borderRadius: 18, backgroundColor: "#0a1320",
  },
  title: { color: "#d7edff", fontSize: 15, fontWeight: "800", letterSpacing: 0.4 },
  note: { color: "#9faec8", fontSize: 12, marginTop: 8, lineHeight: 18 },
  warning: { color: "#e6c781", fontSize: 12, marginTop: 10, lineHeight: 18 },
  label: { color: "#d0d9ee", fontSize: 12, fontWeight: "700", marginTop: 15, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: "#2d4160", borderRadius: 12, backgroundColor: "#101a2a",
    color: "#fff", paddingHorizontal: 12, paddingVertical: 10, fontSize: 13,
  },
  button: { marginTop: 15, borderRadius: 12, backgroundColor: "#234c76", padding: 13 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#f0f7ff", fontSize: 13, fontWeight: "800", textAlign: "center" },
  spinner: { marginTop: 12 },
  error: { marginTop: 12, color: "#ffa2a8", fontSize: 12 },
  result: {
    marginTop: 15, borderTopWidth: 1, borderTopColor: "#264968", paddingTop: 12,
  },
  ok: { color: "#88e0b6", fontSize: 13, fontWeight: "800", marginBottom: 8 },
  value: { color: "#dde6f4", fontSize: 12, marginTop: 6 },
  hash: { color: "#b4c8e8", fontSize: 11, marginTop: 8 },
});
