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
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

          const walletSnapshot =
            await loadWallet(
              localWallet.address,
            );

          setIdentity(localWallet);
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
            tintColor="#68a7ff"
            colors={["#68a7ff"]}
            progressBackgroundColor="#0b101a"
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
              color="#68a7ff"
            />

            <Text style={styles.loadingText}>
              Loading Prism wallet...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.identityCard}>
              <Text style={styles.cardEyebrow}>
                ACTIVE ADDRESS
              </Text>

              <Text
                style={styles.address}
                selectable
              >
                {identity?.address ?? "?"}
              </Text>

              <View style={styles.keyRow}>
                <Text style={styles.keyLabel}>
                  PUBLIC KEY
                </Text>

                <Text
                  style={styles.keyValue}
                  selectable
                >
                  {identity
                    ? short(
                        identity.publicKey,
                      )
                    : "?"}
                </Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <MetricCard
                label="TOTAL"
                value={formatNumber(
                  snapshot?.totalBalance ??
                    0,
                )}
              />

              <MetricCard
                label="AVAILABLE"
                value={formatNumber(
                  snapshot
                    ?.availableBalance ??
                    0,
                )}
              />

              <MetricCard
                label="LOCKED STAKE"
                value={formatNumber(
                  snapshot?.lockedStake ??
                    0,
                )}
              />

              <MetricCard
                label="NONCE"
                value={formatNumber(
                  snapshot?.nonce ?? 0,
                )}
              />
            </View>

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
                    color="#05070c"
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#05070c",
  },

  container: {
    flex: 1,
    backgroundColor: "#05070c",
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
    color: "#657086",
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

  identityCard: {
    borderWidth: 1,
    borderColor: "#1b2639",
    borderRadius: 20,
    backgroundColor: "#0b101a",
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
    borderColor: "#1b2639",
    borderRadius: 18,
    backgroundColor: "#0b101a",
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
