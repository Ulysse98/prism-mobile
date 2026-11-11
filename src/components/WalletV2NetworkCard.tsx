import { usePrismAppearance } from "@/theme/prism-appearance";
import { createPrismStyleVariants, usePrismScreenStyles } from "@/theme/prism-screen-styles";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { PRISM_API } from "../api/client";

type SigningContext = {
  chainId: string;
  genesisHash: string;
  transactionVersion: number;
};

type NetworkStatus = {
  chainId?: string;
  genesisHash?: string;
  chainValid?: boolean;
  nativeAssetSymbol?: string;
};

type HistoryEntry = {
  txId: string;
  from: string;
  to: string;
  amount: number;
  block: number;
  status: string;
};

type HistoryState = {
  entries: HistoryEntry[];
  message: string | null;
};

const ADDRESS_RE = /^prism_[0-9a-f]{40}$/;
const CHAIN_RE = /^prism-[0-9a-f]{16}$/;
const GENESIS_RE = /^[0-9a-f]{64}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function short(value: string): string {
  return value.length > 22 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { method: "GET", signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

function parseContext(value: unknown): SigningContext {
  if (!isObject(value) ||
      typeof value.chainId !== "string" || !CHAIN_RE.test(value.chainId) ||
      typeof value.genesisHash !== "string" || !GENESIS_RE.test(value.genesisHash) ||
      value.transactionVersion !== 2) {
    throw new Error("Contexte de signature V2 invalide ou incompatible");
  }
  return {
    chainId: value.chainId,
    genesisHash: value.genesisHash,
    transactionVersion: 2,
  };
}

function parseStatus(value: unknown): NetworkStatus {
  if (!isObject(value)) {
    throw new Error("Statut réseau invalide");
  }
  const result: NetworkStatus = {};
  if (typeof value.chainId === "string") result.chainId = value.chainId;
  if (typeof value.genesisHash === "string") result.genesisHash = value.genesisHash;
  if (typeof value.chainValid === "boolean") result.chainValid = value.chainValid;
  if (typeof value.nativeAssetSymbol === "string") {
    result.nativeAssetSymbol = value.nativeAssetSymbol;
  }
  return result;
}

function parseHistory(value: unknown): HistoryState {
  const maybeEntries = Array.isArray(value) ? value
    : isObject(value) ? (value.transactions ?? value.entries) : null;
  if (!Array.isArray(maybeEntries)) {
    return { entries: [], message: "Format de l'historique non reconnu" };
  }
  const entries: HistoryEntry[] = [];
  for (const item of maybeEntries.slice(0, 10)) {
    if (!isObject(item) ||
        typeof item.txId !== "string" ||
        typeof item.from !== "string" ||
        typeof item.to !== "string" ||
        typeof item.amount !== "number" || !Number.isSafeInteger(item.amount) || item.amount < 0 ||
        typeof item.block !== "number" || !Number.isSafeInteger(item.block) || item.block < 0 ||
        typeof item.status !== "string") {
      return { entries: [], message: "Historique non affiché : données incompatibles" };
    }
    entries.push({
      txId: item.txId,
      from: item.from,
      to: item.to,
      amount: item.amount,
      block: item.block,
      status: item.status,
    });
  }
  return { entries, message: null };
}

export function WalletV2NetworkCard({ address }: { address: string | null }) {
  const styles = usePrismScreenStyles(prismStyleVariants);
  const { colors } = usePrismAppearance();
  const [generation, setGeneration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<SigningContext | null>(null);
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [history, setHistory] = useState<HistoryState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setError(null);
    setContext(null);
    setStatus(null);
    setHistory(null);

    if (!address || !ADDRESS_RE.test(address)) {
      if (address) setError("Adresse Prism locale invalide");
      setLoading(false);
      return () => { controller.abort(); active = false; };
    }
    if (!PRISM_API) {
      setError("L'API Prism n'est pas configurée");
      setLoading(false);
      return () => { controller.abort(); active = false; };
    }

    setLoading(true);
    void (async () => {
      try {
        const [rawContext, rawStatus] = await Promise.all([
          fetchJson(`${PRISM_API}/transactions/context`, controller.signal),
          fetchJson(`${PRISM_API}/status`, controller.signal),
        ]);
        const signing = parseContext(rawContext);
        const network = parseStatus(rawStatus);
        if (network.chainValid !== true || network.chainId !== signing.chainId ||
            network.genesisHash !== signing.genesisHash) {
          throw new Error("Statut et contexte V2 divergents ou chaîne invalide");
        }
        if (!active) return;
        setContext(signing);
        setStatus(network);

        try {
          const rawHistory = await fetchJson(
            `${PRISM_API}/transactions?address=${encodeURIComponent(address)}&limit=10`,
            controller.signal,
          );
          if (active) setHistory(parseHistory(rawHistory));
        } catch {
          if (active) setHistory({ entries: [], message: "Historique indisponible" });
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Connexion au nœud impossible");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [address, generation]);

  const ready = context !== null && status !== null;
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.title}>PRISM · WALLET V2</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualiser le réseau Prism"
          onPress={() => setGeneration((value) => value + 1)}
          style={styles.refresh}
        >
          <Text style={styles.refreshText}>Actualiser</Text>
        </Pressable>
      </View>
      <Text style={styles.mode}>Connexion et historique · lecture seule</Text>
      {loading && <ActivityIndicator color={colors.accent} style={styles.spinner} />}
      {error && <Text style={styles.error}>● {error}</Text>}
      {ready && (
        <>
          <Text style={styles.ok}>● Nœud valide · Contexte V2 confirmé</Text>
          <Text style={styles.line}>Actif : {status.nativeAssetSymbol || "Symbole non communiqué"}</Text>
          <Text style={styles.line}>Réseau : {context.chainId}</Text>
          <Text style={styles.line}>Genesis : {short(context.genesisHash)}</Text>
          <Text style={styles.subheading}>Transactions récentes</Text>
          {history?.message && <Text style={styles.muted}>{history.message}</Text>}
          {history && !history.message && history.entries.length === 0 && (
            <Text style={styles.muted}>Aucune transaction trouvée</Text>
          )}
          {history?.entries.map((item, index) => (
            <View key={`${item.txId}-${index}`} style={styles.historyRow}>
              <Text style={styles.historyTitle}>
                {item.to === address ? "Reçu" : "Envoyé"} · {item.amount} · {item.status}
              </Text>
              <Text style={styles.muted}>{short(item.txId)} · Bloc #{item.block}</Text>
            </View>
          ))}
        </>
      )}
      <Text style={styles.footer}>Transferts désactivés · Aucun fonds envoyé</Text>
    </View>
  );
}

const prismStyleVariants = createPrismStyleVariants({
  card: {
    marginBottom: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#5f479e",
    borderRadius: 18,
    backgroundColor: "#121126",
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#e8ddff", fontSize: 15, fontWeight: "800", letterSpacing: 1 },
  mode: { color: "#aea0d3", fontSize: 12, marginTop: 4 },
  refresh: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: "#342654" },
  refreshText: { color: "#eee5ff", fontSize: 11, fontWeight: "700" },
  spinner: { marginTop: 12 },
  error: { color: "#ff999f", marginTop: 12, fontSize: 12 },
  ok: { color: "#80deb2", marginTop: 12, fontSize: 12, fontWeight: "700" },
  line: { color: "#ded6f5", marginTop: 7, fontSize: 12 },
  subheading: { color: "#e8ddff", fontWeight: "700", marginTop: 15, fontSize: 13 },
  muted: { color: "#aaa0be", fontSize: 11, marginTop: 5 },
  historyRow: { borderTopWidth: 1, borderTopColor: "#342654", marginTop: 10, paddingTop: 8 },
  historyTitle: { color: "#ece5fb", fontSize: 12 },
  footer: { color: "#978cae", marginTop: 16, fontSize: 10 },
});
