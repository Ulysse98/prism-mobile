import {
    router,
    useFocusEffect,
    useLocalSearchParams,
} from "expo-router";
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

import { loadDashboard } from "@/api/client";
import { DEMO_DASHBOARD } from "@/api/demo";

import type {
    PrismStatus,
    PrismWorkEntry,
} from "@/api/types";

type ScreenMode =
  | "loading"
  | "live"
  | "demo"
  | "not-found";

function formatTask(value: string) {
  return value
    .replace(/_/g, " ")
    .toUpperCase();
}

function short(value?: string) {
  if (!value) {
    return "—";
  }

  if (value.length <= 22) {
    return value;
  }

  return `${value.slice(0, 11)}…${value.slice(-7)}`;
}

function DetailRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.detailValue,
          accent &&
            styles.detailValueAccent,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ProofDetailScreen() {
  const params =
    useLocalSearchParams<{
      proofId?: string | string[];
    }>();

  const proofId =
    Array.isArray(params.proofId)
      ? params.proofId[0]
      : params.proofId;

  const [proof, setProof] =
    useState<PrismWorkEntry | null>(
      null,
    );

  const [status, setStatus] =
    useState<PrismStatus | null>(
      null,
    );

  const [mode, setMode] =
    useState<ScreenMode>("loading");

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(
    async (
      manualRefresh = false,
    ) => {
      if (!proofId) {
        setMode("not-found");
        return;
      }

      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setMode("loading");
      }

      try {
        const dashboard =
          await loadDashboard();

        const entry =
          dashboard.work.find(
            (item) =>
              item.proofId ===
              proofId,
          ) ?? null;

        setStatus(
          dashboard.status,
        );

        if (!entry) {
          setProof(null);
          setError(null);
          setMode("not-found");
          return;
        }

        setProof(entry);
        setError(null);
        setMode("live");
      } catch (err) {
        console.warn(
          "[Prism Proof] live dashboard unavailable",
          err,
        );

        const demoEntry =
          DEMO_DASHBOARD.work.find(
            (item) =>
              item.proofId ===
              proofId,
          ) ?? null;

        setStatus(
          DEMO_DASHBOARD.status,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to reach Prism Devnet",
        );

        if (!demoEntry) {
          setProof(null);
          setMode("not-found");
        } else {
          setProof(demoEntry);
          setMode("demo");
        }
      } finally {
        setRefreshing(false);
      }
    },
    [proofId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (
    mode === "loading" &&
    !proof
  ) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View
          style={
            styles.loadingScreen
          }
        >
          <ActivityIndicator
            size="large"
            color="#68a7ff"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading proof...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    mode === "not-found" ||
    !proof
  ) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View
          style={
            styles.notFoundScreen
          }
        >
          <Pressable
            onPress={() =>
              router.back()
            }
            style={({ pressed }) => [
              styles.backButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <Text
              style={
                styles.backButtonText
              }
            >
              ← BACK
            </Text>
          </Pressable>

          <Text
            style={
              styles.notFoundEyebrow
            }
          >
            PRISM EXPLORER
          </Text>

          <Text
            style={
              styles.notFoundTitle
            }
          >
            Proof not found
          </Text>

          <Text
            style={
              styles.notFoundText
            }
          >
            No verified useful-work
            proof matching{" "}
            {proofId ?? "this ID"} was
            found.
          </Text>

          {error ? (
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safe}
    >
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
          <Pressable
            onPress={() =>
              router.back()
            }
            style={({ pressed }) => [
              styles.backButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <Text
              style={
                styles.backButtonText
              }
            >
              ← BACK
            </Text>
          </Pressable>

          <View
            style={[
              styles.modeBadge,
              mode === "demo" &&
                styles.modeBadgeDemo,
            ]}
          >
            <View
              style={[
                styles.modeDot,
                mode === "demo" &&
                  styles.modeDotDemo,
              ]}
            />

            <Text
              style={[
                styles.modeText,
                mode === "demo" &&
                  styles.modeTextDemo,
              ]}
            >
              {mode === "demo"
                ? "DEMO"
                : "LIVE"}
            </Text>
          </View>
        </View>

        <View>
          <Text
            style={
              styles.pageEyebrow
            }
          >
            PRISM EXPLORER
          </Text>

          <Text
            style={styles.pageTitle}
          >
            Proof detail
          </Text>

          <Text
            style={
              styles.pageSubtitle
            }
          >
            Verified Proof of Useful
            Work
          </Text>
        </View>

        <View
          style={
            styles.verificationCard
          }
        >
          <View
            style={
              styles.verificationIcon
            }
          >
            <Text
              style={
                styles.verificationIconText
              }
            >
              ✓
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={
                styles.verificationEyebrow
              }
            >
              PROOF STATUS
            </Text>

            <Text
              style={[
                styles.verificationTitle,
                !proof.verified &&
                  styles.invalidText,
              ]}
            >
              {proof.verified
                ? "VERIFIED"
                : "INVALID"}
            </Text>

            <Text
              style={
                styles.verificationText
              }
            >
              Included in Prism block{" "}
              {proof.block}.
            </Text>
          </View>
        </View>

        <View
          style={
            styles.proofCard
          }
        >
          <Text
            style={
              styles.cardEyebrow
            }
          >
            PROOF ID
          </Text>

          <Text
            style={
              styles.proofId
            }
          >
            {proof.proofId}
          </Text>

          <View
            style={
              styles.taskCard
            }
          >
            <Text
              style={
                styles.taskLabel
              }
            >
              WORKLOAD
            </Text>

            <Text
              style={
                styles.taskValue
              }
            >
              {formatTask(
                proof.task,
              )}
            </Text>

            <Text
              style={
                styles.resultLabel
              }
            >
              RESULT
            </Text>

            <Text
              style={
                styles.resultValue
              }
            >
              {String(
                proof.result,
              )}
            </Text>
          </View>

          <View
            style={
              styles.metrics
            }
          >
            <View
              style={
                styles.metric
              }
            >
              <Text
                style={
                  styles.metricValue
                }
              >
                {proof.block}
              </Text>

              <Text
                style={
                  styles.metricLabel
                }
              >
                BLOCK
              </Text>
            </View>

            <View
              style={
                styles.metric
              }
            >
              <Text
                style={
                  styles.metricValue
                }
              >
                {proof.score}
              </Text>

              <Text
                style={
                  styles.metricLabel
                }
              >
                SCORE
              </Text>
            </View>

            <View
              style={
                styles.metric
              }
            >
              <Text
                style={
                  styles.rewardValue
                }
              >
                +{proof.reward}
              </Text>

              <Text
                style={
                  styles.metricLabel
                }
              >
                PRISM
              </Text>
            </View>
          </View>
        </View>

        <View
          style={
            styles.detailsCard
          }
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            Proof metadata
          </Text>

          <DetailRow
            label="Worker"
            value={proof.worker}
          />

          <DetailRow
            label="Task"
            value={proof.task}
          />

          <DetailRow
            label="Verified"
            value={
              proof.verified
                ? "YES"
                : "NO"
            }
            accent={
              proof.verified
            }
          />

          <DetailRow
            label="Block"
            value={proof.block}
          />

          <DetailRow
            label="Score"
            value={proof.score}
          />

          <DetailRow
            label="Reward"
            value={`+${proof.reward} PRISM`}
            accent
          />
        </View>

        <View
          style={
            styles.networkCard
          }
        >
          <Text
            style={
              styles.cardEyebrow
            }
          >
            NETWORK
          </Text>

          <Text
            style={
              styles.networkName
            }
          >
            {status?.network ??
              "Prism Devnet"}
          </Text>

          <DetailRow
            label="Height"
            value={
              status?.height ?? "—"
            }
          />

          <DetailRow
            label="Blocks"
            value={
              status?.blocks ?? "—"
            }
          />

          <DetailRow
            label="Protocol"
            value={
              status?.protocol ?? "—"
            }
          />

          <DetailRow
            label="Node"
            value={
              status?.version ?? "—"
            }
          />

          <View
            style={styles.hashBox}
          >
            <Text
              style={
                styles.hashLabel
              }
            >
              CURRENT NETWORK HASH
            </Text>

            <Text
              style={
                styles.hashValue
              }
            >
              {short(
                status?.lastHash,
              )}
            </Text>
          </View>
        </View>

        {mode === "demo" &&
        error ? (
          <View
            style={
              styles.warningCard
            }
          >
            <Text
              style={
                styles.warningTitle
              }
            >
              DEMO DATA
            </Text>

            <Text
              style={
                styles.warningText
              }
            >
              Live Prism Devnet was
              unavailable. This proof
              was loaded from bundled
              demo data.
            </Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Prism · Proof Explorer
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: "#05070c",
    },

    container: {
      flex: 1,
      backgroundColor: "#05070c",
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 110,
      gap: 16,
    },

    loadingScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
    },

    loadingText: {
      color: "#718096",
      fontSize: 12,
      fontWeight: "700",
    },

    notFoundScreen: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
    },

    notFoundEyebrow: {
      color: "#58677f",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.6,
      marginTop: 30,
    },

    notFoundTitle: {
      color: "#ffffff",
      fontSize: 30,
      fontWeight: "900",
      marginTop: 6,
    },

    notFoundText: {
      color: "#718096",
      fontSize: 13,
      lineHeight: 20,
      marginTop: 10,
    },

    errorText: {
      color: "#ff8b8b",
      fontSize: 10,
      marginTop: 14,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 12,
    },

    backButton: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: "#0d1421",
      borderWidth: 1,
      borderColor: "#1c2b45",
    },

    backButtonText: {
      color: "#8ebaff",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.8,
    },

    pressed: {
      opacity: 0.65,
    },

    modeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: "#0a2118",
      borderWidth: 1,
      borderColor: "#16452f",
    },

    modeBadgeDemo: {
      backgroundColor: "#2b2310",
      borderColor: "#594717",
    },

    modeDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: "#45e391",
    },

    modeDotDemo: {
      backgroundColor: "#e1bc68",
    },

    modeText: {
      color: "#72e8a8",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
    },

    modeTextDemo: {
      color: "#e1bc68",
    },

    pageEyebrow: {
      color: "#58677f",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.8,
    },

    pageTitle: {
      color: "#ffffff",
      fontSize: 34,
      fontWeight: "900",
      letterSpacing: -1,
      marginTop: 3,
    },

    pageSubtitle: {
      color: "#6c7a90",
      fontSize: 12,
      marginTop: 3,
    },

    verificationCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 17,
      borderRadius: 18,
      backgroundColor: "#08160f",
      borderWidth: 1,
      borderColor: "#15462f",
    },

    verificationIcon: {
      width: 52,
      height: 52,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0d251c",
      borderWidth: 1,
      borderColor: "#1f5139",
    },

    verificationIconText: {
      color: "#66e39d",
      fontSize: 23,
      fontWeight: "900",
    },

    verificationEyebrow: {
      color: "#5e9476",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    verificationTitle: {
      color: "#69e7a1",
      fontSize: 21,
      fontWeight: "900",
      marginTop: 3,
    },

    invalidText: {
      color: "#ff7c7c",
    },

    verificationText: {
      color: "#688374",
      fontSize: 10,
      marginTop: 3,
    },

    proofCard: {
      padding: 18,
      borderRadius: 20,
      backgroundColor: "#0b101a",
      borderWidth: 1,
      borderColor: "#1b2639",
    },

    cardEyebrow: {
      color: "#58677f",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.4,
    },

    proofId: {
      color: "#68a7ff",
      fontSize: 22,
      fontWeight: "900",
      marginTop: 5,
      fontFamily: "monospace",
    },

    taskCard: {
      marginTop: 16,
      padding: 16,
      borderRadius: 14,
      backgroundColor: "#080d16",
      borderWidth: 1,
      borderColor: "#172239",
    },

    taskLabel: {
      color: "#56657e",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.1,
    },

    taskValue: {
      color: "#eef4ff",
      fontSize: 18,
      fontWeight: "900",
      marginTop: 5,
    },

    resultLabel: {
      color: "#56657e",
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.1,
      marginTop: 17,
    },

    resultValue: {
      color: "#68a7ff",
      fontSize: 34,
      fontWeight: "900",
      marginTop: 3,
    },

    metrics: {
      flexDirection: "row",
      gap: 8,
      marginTop: 13,
    },

    metric: {
      flex: 1,
      minHeight: 73,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: "#0e1522",
      borderWidth: 1,
      borderColor: "#17243b",
    },

    metricValue: {
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "900",
    },

    rewardValue: {
      color: "#66e39d",
      fontSize: 18,
      fontWeight: "900",
    },

    metricLabel: {
      color: "#56647c",
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.7,
      marginTop: 5,
    },

    detailsCard: {
      padding: 18,
      borderRadius: 18,
      backgroundColor: "#0a0f18",
      borderWidth: 1,
      borderColor: "#182338",
    },

    cardTitle: {
      color: "#edf3ff",
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 11,
    },

    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 14,
      paddingVertical: 12,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor: "#1b2538",
    },

    detailLabel: {
      color: "#66758d",
      fontSize: 11,
    },

    detailValue: {
      color: "#e6eeff",
      fontSize: 11,
      fontWeight: "800",
      textAlign: "right",
      flexShrink: 1,
    },

    detailValueAccent: {
      color: "#66e39d",
    },

    networkCard: {
      padding: 18,
      borderRadius: 18,
      backgroundColor: "#0b101a",
      borderWidth: 1,
      borderColor: "#1b2639",
    },

    networkName: {
      color: "#68a7ff",
      fontSize: 21,
      fontWeight: "900",
      marginTop: 5,
      marginBottom: 10,
    },

    hashBox: {
      marginTop: 13,
      padding: 13,
      borderRadius: 12,
      backgroundColor: "#080d16",
      borderWidth: 1,
      borderColor: "#172239",
    },

    hashLabel: {
      color: "#52617a",
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 1,
    },

    hashValue: {
      color: "#70819c",
      fontSize: 10,
      fontFamily: "monospace",
      marginTop: 6,
    },

    warningCard: {
      padding: 15,
      borderRadius: 15,
      backgroundColor: "#211c0e",
      borderWidth: 1,
      borderColor: "#4d4020",
    },

    warningTitle: {
      color: "#e1bc68",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.1,
    },

    warningText: {
      color: "#9a8b65",
      fontSize: 10,
      lineHeight: 16,
      marginTop: 5,
    },

    footer: {
      color: "#3f4d63",
      textAlign: "center",
      fontSize: 10,
      marginTop: 5,
    },
  });