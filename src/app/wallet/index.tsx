import * as Clipboard from "expo-clipboard";
import { PrismAddressQr } from "@/components/PrismAddressQr";
import { usePrismAppearance } from "@/theme/prism-appearance";
import { createPrismStyleVariants, usePrismScreenStyles } from "@/theme/prism-screen-styles";
import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WalletV2NetworkCard } from "../../components/WalletV2NetworkCard";
import { WalletV2SendPreview } from "../../components/WalletV2SendPreview";

import {
  claimFaucet,
  loadWallet,
} from "../../api/client";

import type {
  PrismFaucetClaim,
  PrismWalletSnapshot,
} from "../../api/types";

import {
  getOrCreatePrismWallet,
  type PrismWallet,
} from "../../crypto/prismWallet";

function short(value: string) {
  if (value.length <= 22) {
    return value;
  }

  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function walletErrorMessage(
  error: unknown,
  fallback: string,
) {
  const message =
    error instanceof Error
      ? error.message
      : "";

  if (
    /fetch failed|failed to fetch|network request failed|ECONNREFUSED/i.test(
      message,
    )
  ) {
    return "Could not reach Prism Devnet.";
  }

  return message || fallback;
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const styles = usePrismScreenStyles(prismStyleVariants);
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>
        {value}
      </Text>

      <Text style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const styles = usePrismScreenStyles(prismStyleVariants);
  const { colors } = usePrismAppearance();
  const [identity, setIdentity] =
    useState<PrismWallet | null>(null);

  const [snapshot, setSnapshot] =
    useState<PrismWalletSnapshot | null>(
      null,
    );

  const [lastClaim, setLastClaim] =
    useState<PrismFaucetClaim | null>(
      null,
    );

  const [claimed, setClaimed] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [claiming, setClaiming] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const load =
    useCallback(
      async (
        pullToRefresh = false,
      ) => {
        if (pullToRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        try {
          const localWallet =
            await getOrCreatePrismWallet();

          // Show local identity independently of network state.
          setIdentity(localWallet);

          const walletSnapshot =
            await loadWallet(localWallet.address);

          setSnapshot(walletSnapshot);
          setError(null);
        } catch (err) {
          setError(
            walletErrorMessage(
              err,
              "Unable to load Prism wallet.",
            ),
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleClaim =
    useCallback(async () => {
      if (!identity || claiming) {
        return;
      }

      setClaiming(true);
      setError(null);

      try {
        const claim =
          await claimFaucet(
            identity.address,
          );

        setLastClaim(claim);
        setClaimed(true);

        const updated =
          await loadWallet(
            identity.address,
          );

        setSnapshot(updated);
      } catch (err) {
        const message =
          walletErrorMessage(
            err,
            "Unable to claim testnet funds.",
          );

        if (
          /already claimed/i.test(
            message,
          )
        ) {
          setClaimed(true);

          try {
            const updated =
              await loadWallet(
                identity.address,
              );

            setSnapshot(updated);
          } catch {
            // Keep the claim status even if refresh fails.
          }
        }

        setError(message);
      } finally {
        setClaiming(false);
      }
    }, [
      claiming,
      identity,
    ]);

  const humanityVerified =
    snapshot?.humanityVerified ?? false;

  // One-tap clipboard: ONLY the public address, no seed, secret, or signed payload.
  const copyPublicAddress = useCallback(async () => {
    if (!identity?.address) return;
    try {
      await Clipboard.setStringAsync(identity.address);
      setCopied(true);
    } catch (cause) {
      setError(walletErrorMessage(cause, "Copie de l'adresse indisponible."));
    }
  }, [identity]);

  // Display-only action: share the PUBLIC address, never a secret or signed payload.
  const sharePublicAddress = useCallback(async () => {
    if (!identity?.address) return;
    try {
      await Share.share({
        title: "Adresse publique PRISM",
        message: identity.address,
      });
    } catch (cause) {
      setError(
        walletErrorMessage(cause, "Partage de l'adresse indisponible."),
      );
    }
  }, [identity]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void load(true)
            }
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              PRISM WALLET
            </Text>

            <Text style={styles.title}>
              Wallet
            </Text>

            <Text style={styles.subtitle}>
              Your local Ed25519 identity
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              humanityVerified
                ? styles.statusVerified
                : styles.statusUnverified,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                humanityVerified
                  ? styles.statusTextVerified
                  : styles.statusTextUnverified,
              ]}
            >
              {humanityVerified
                ? "VERIFIED"
                : "UNVERIFIED"}
            </Text>
          </View>
        </View>

        {loading && !snapshot ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color={colors.accent}
            />

            <Text style={styles.loadingText}>
              Loading Prism wallet...
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.balanceHero,
                { backgroundColor: colors.accentSoft, borderColor: colors.border },
              ]}
            >
              <View style={styles.balanceTopRow}>
                <Text style={[styles.balanceEyebrow, { color: colors.accent }]}>
                  PRISM · DEVNET
                </Text>
                <View
                  style={[
                    styles.readOnlyBadge,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.readOnlyText, { color: colors.muted }]}>
                    LECTURE SEULE
                  </Text>
                </View>
              </View>
              <Text style={[styles.balanceCaption, { color: colors.muted }]}>
                Solde disponible
              </Text>
              <View style={styles.balanceAmountRow}>
                <Text
                  style={[styles.balanceAmount, { color: colors.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {snapshot ? formatNumber(snapshot.availableBalance) : "—"}
                </Text>
                <Text style={[styles.balanceUnit, { color: colors.accent }]}>
                  PRISM
                </Text>
              </View>
              <Text style={[styles.balanceMeta, { color: colors.muted }]}>
                {snapshot
                  ? error
                    ? "Dernier solde connu · connexion à vérifier"
                    : "Devnet isolé · aucune valeur réelle"
                  : "Solde indisponible · connexion au nœud requise"}
              </Text>
            </View>

            <View style={styles.identityCard}>
              <Text style={styles.cardEyebrow}>ADRESSE PUBLIQUE</Text>
              <Text style={styles.address} selectable>
                {identity?.address ?? "?"}
              </Text>
              <Text style={[styles.addressHint, { color: colors.muted }]}>
                Adresse publique uniquement · clé privée jamais partagée
              </Text>

              <View style={styles.addressActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copier l'adresse publique PRISM"
                  disabled={!identity?.address}
                  onPress={() => void copyPublicAddress()}
                  style={({ pressed }) => [
                    styles.addressActionButton,
                    { backgroundColor: colors.accentSoft, borderColor: colors.border },
                    pressed && styles.addressShareButtonPressed,
                    !identity && styles.addressShareButtonDisabled,
                  ]}
                >
                  <Text style={[styles.addressActionText, { color: colors.accent }]}>
                    {copied ? "COPIÉ ✓" : "COPIER"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Partager l'adresse publique PRISM"
                  disabled={!identity?.address}
                  onPress={() => void sharePublicAddress()}
                  style={({ pressed }) => [
                    styles.addressActionButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && styles.addressShareButtonPressed,
                    !identity && styles.addressShareButtonDisabled,
                  ]}
                >
                  <Text style={[styles.addressActionText, { color: colors.accent }]}>
                    PARTAGER
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showQr ? "Masquer le QR code de réception" : "Afficher le QR code de réception"}
                  accessibilityState={{ expanded: showQr, disabled: !identity?.address }}
                  disabled={!identity?.address}
                  onPress={() => setShowQr((visible) => !visible)}
                  style={({ pressed }) => [
                    styles.addressActionButton,
                    { backgroundColor: showQr ? colors.accentSoft : colors.surface, borderColor: colors.border },
                    pressed && styles.addressShareButtonPressed,
                    !identity && styles.addressShareButtonDisabled,
                  ]}
                >
                  <Text style={[styles.addressActionText, { color: colors.accent }]}>
                    {showQr ? "MASQUER QR" : "QR CODE"}
                  </Text>
                </Pressable>
              </View>

              {showQr && identity?.address ? (
                <View style={styles.qrPanel}>
                  <Text style={[styles.qrPanelTitle, { color: colors.text }]}>Recevoir sur PRISM Devnet</Text>
                  <PrismAddressQr address={identity.address} />
                  <Text style={[styles.qrPanelHint, { color: colors.muted }]}>
                    Contient uniquement l'adresse publique. Vérifiez le réseau PRISM avant toute utilisation.
                  </Text>
                </View>
              ) : null}

              <View style={styles.keyRow}>
                <Text style={styles.keyLabel}>PUBLIC KEY</Text>
                <Text style={styles.keyValue} selectable>
                  {identity ? short(identity.publicKey) : "?"}
                </Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <MetricCard
                label="TOTAL"
                value={snapshot ? formatNumber(snapshot.totalBalance) : "—"}
              />

              <MetricCard
                label="AVAILABLE"
                value={snapshot ? formatNumber(snapshot.availableBalance) : "—"}
              />

              <MetricCard
                label="LOCKED STAKE"
                value={snapshot ? formatNumber(snapshot.lockedStake) : "—"}
              />

              <MetricCard
                label="NONCE"
                value={snapshot ? formatNumber(snapshot.nonce) : "—"}
              />
            </View>

            <WalletV2NetworkCard address={identity?.address ?? null} />
            <WalletV2SendPreview address={identity?.address ?? null} publicKey={identity?.publicKey ?? null} />

            <View style={styles.faucetCard}>
              <Text style={styles.cardEyebrow}>
                TESTNET FAUCET
              </Text>

              <Text style={styles.faucetTitle}>
                Get 100 PRISM
              </Text>

              <Text style={styles.faucetText}>
                Fund this device wallet with a
                signed on-chain transfer from the
                Prism testnet faucet.
              </Text>

              {lastClaim && (
                <View style={styles.claimReceipt}>
                  <Text
                    style={
                      styles.claimReceiptTitle
                    }
                  >
                    +{lastClaim.amount} PRISM
                  </Text>

                  <Text
                    style={
                      styles.claimReceiptMeta
                    }
                  >
                    Block #{lastClaim.block}
                  </Text>

                  <Text
                    style={
                      styles.claimReceiptId
                    }
                    selectable
                  >
                    {short(lastClaim.txId)}
                  </Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.claimButton,
                  pressed &&
                    !claiming &&
                    !claimed &&
                    styles.claimButtonPressed,
                  (claiming || claimed) &&
                    styles.claimButtonDisabled,
                ]}
                disabled={
                  claiming ||
                  claimed ||
                  !identity
                }
                onPress={() =>
                  void handleClaim()
                }
              >
                {claiming ? (
                  <ActivityIndicator
                    color={colors.text}
                  />
                ) : (
                  <Text
                    style={
                      styles.claimButtonText
                    }
                  >
                    {claimed
                      ? "FAUCET CLAIMED"
                      : "CLAIM 100 PRISM"}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              WALLET NOTICE
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Prism Mobile Wallet
          </Text>

          <Text style={styles.footerMeta}>
            Private key stored locally with
            SecureStore
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const prismStyleVariants = createPrismStyleVariants({
  safe: {
    flex: 1,
    backgroundColor: "#090b17",
  },

  container: {
    flex: 1,
    backgroundColor: "#090b17",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },

  eyebrow: {
    color: "#bda1e7",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 4,
  },

  subtitle: {
    color: "#8b96aa",
    fontSize: 14,
    marginTop: 4,
  },

  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusVerified: {
    backgroundColor: "#0d2a1e",
    borderColor: "#2da66d",
  },

  statusUnverified: {
    backgroundColor: "#2a1912",
    borderColor: "#a66b2d",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  statusTextVerified: {
    color: "#6fe5a4",
  },

  statusTextUnverified: {
    color: "#e4ad6f",
  },

  loadingCard: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1b2639",
    borderRadius: 20,
    backgroundColor: "#0b101a",
    gap: 14,
  },

  loadingText: {
    color: "#8b96aa",
    fontSize: 14,
  },

  balanceHero: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 21,
    marginBottom: 16,
  },

  balanceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  balanceEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    flexShrink: 1,
  },

  readOnlyBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },

  readOnlyText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  balanceCaption: {
    marginTop: 19,
    fontSize: 13,
    fontWeight: "600",
  },

  balanceAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "nowrap",
    gap: 10,
    marginTop: 4,
  },

  balanceAmount: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1.5,
    flexShrink: 1,
    minWidth: 40,
  },

  balanceUnit: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  balanceMeta: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 17,
  },

  identityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  addressShareButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  addressShareButtonPressed: {
    opacity: 0.7,
  },

  addressShareButtonDisabled: {
    opacity: 0.4,
  },

  addressShareText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  addressHint: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 15,
  },

  addressActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },

  addressActionButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
  },

  addressActionText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  qrPanel: {
    alignItems: "center",
    marginTop: 18,
    gap: 12,
  },

  qrPanelTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  qrPanelHint: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },

  identityCard: {
    borderWidth: 1,
    borderColor: "#393050",
    borderRadius: 20,
    backgroundColor: "#151527",
    padding: 20,
    marginBottom: 16,
  },

  cardEyebrow: {
    color: "#657086",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  address: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 25,
    marginTop: 10,
  },

  keyRow: {
    borderTopWidth: 1,
    borderTopColor: "#172033",
    marginTop: 18,
    paddingTop: 16,
  },

  keyLabel: {
    color: "#657086",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  keyValue: {
    color: "#9ca8bc",
    fontSize: 13,
    marginTop: 6,
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },

  metricCard: {
    width: "48%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#39334e",
    borderRadius: 18,
    backgroundColor: "#1b1b30",
    padding: 18,
  },

  metricValue: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "900",
  },

  metricLabel: {
    color: "#657086",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: 6,
  },

  faucetCard: {
    borderWidth: 1,
    borderColor: "#224c78",
    borderRadius: 20,
    backgroundColor: "#0a1524",
    padding: 20,
  },

  faucetTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },

  faucetText: {
    color: "#8ea0b8",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  claimReceipt: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#245f45",
    borderRadius: 14,
    backgroundColor: "#0a2118",
    padding: 14,
  },

  claimReceiptTitle: {
    color: "#6fe5a4",
    fontSize: 20,
    fontWeight: "900",
  },

  claimReceiptMeta: {
    color: "#a0b9aa",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  claimReceiptId: {
    color: "#668876",
    fontSize: 11,
    marginTop: 5,
  },

  claimButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#68a7ff",
    borderRadius: 15,
    marginTop: 20,
  },

  claimButtonPressed: {
    opacity: 0.8,
  },

  claimButtonDisabled: {
    opacity: 0.5,
  },

  claimButtonText: {
    color: "#05070c",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  errorCard: {
    borderWidth: 1,
    borderColor: "#683232",
    borderRadius: 16,
    backgroundColor: "#241010",
    padding: 16,
    marginTop: 16,
  },

  errorTitle: {
    color: "#ff8c8c",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  errorText: {
    color: "#e6b0b0",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  footer: {
    alignItems: "center",
    paddingTop: 28,
  },

  footerText: {
    color: "#657086",
    fontSize: 12,
    fontWeight: "800",
  },

  footerMeta: {
    color: "#40495b",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
});
