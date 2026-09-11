import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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

import { PRISM_API } from "../api/client";

type MineJob = {
  id: string;
  worker: string;
  task: string;
  input: number[];
  difficulty: string;
  reward: number;
  status: string;
  createdAt: string;
  result?: number;
  block?: number;
};

type MineStartResponse = {
  job: MineJob;
};

type MineSubmitResponse = {
  verified: boolean;
  reward: number;
  block: number;
  totalSupply: number;
};

type NetworkStatus = {
  network: string;
  height: number;
  blocks: number;
  version: string;
};

type MinerPhase =
  | "idle"
  | "starting"
  | "ready"
  | "computing"
  | "computed"
  | "submitting"
  | "completed"
  | "error";

async function requestJson<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  if (!PRISM_API) {
    throw new Error("Prism API is not configured for this build.");
  }

  const response = await fetch(`${PRISM_API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      body?.error ?? `${path}: HTTP ${response.status}`,
    );
  }

  return body as T;
}

function sumSquares(values: number[]) {
  return values.reduce(
    (total, value) => total + value * value,
    0,
  );
}

export default function MineScreen() {
  const [network, setNetwork] =
    useState<NetworkStatus | null>(null);

  const [phase, setPhase] =
    useState<MinerPhase>("idle");

  const [job, setJob] =
    useState<MineJob | null>(null);

  const [result, setResult] =
    useState<number | null>(null);

  const [rewardedBlock, setRewardedBlock] =
    useState<number | null>(null);

  const [sessionRewards, setSessionRewards] =
    useState(0);

  const [sessionJobs, setSessionJobs] =
    useState(0);

  const [error, setError] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const status =
        await requestJson<NetworkStatus>("/status");

      setNetwork(status);
      setError(null);
    } catch (err) {
      setNetwork(null);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach Prism node",
      );
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadStatus();
    } finally {
      setRefreshing(false);
    }
  }, [loadStatus]);

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus]),
  );

  const connected = Boolean(network);

  const phaseLabel = useMemo(() => {
    switch (phase) {
      case "starting":
        return "FETCHING WORK";

      case "ready":
        return "WORK READY";

      case "computing":
        return "COMPUTING";

      case "computed":
        return "PROOF READY";

      case "submitting":
        return "SUBMITTING";

      case "completed":
        return "REWARDED";

      case "error":
        return "ERROR";

      default:
        return connected ? "READY" : "OFFLINE";
    }
  }, [connected, phase]);

  async function startWork() {
    if (!connected || phase === "starting") {
      return;
    }

    try {
      setPhase("starting");
      setError(null);
      setResult(null);
      setRewardedBlock(null);

      const response =
        await requestJson<MineStartResponse>(
          "/mine/start",
          {
            method: "POST",
            body: JSON.stringify({
              worker: "Alice",
            }),
          },
        );

      setJob(response.job);
      setPhase("ready");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to fetch useful work",
      );

      setPhase("error");
    }
  }

  async function runCompute() {
    if (!job || phase !== "ready") {
      return;
    }

    try {
      setPhase("computing");
      setError(null);

      await new Promise((resolve) =>
        setTimeout(resolve, 650),
      );

      const computed =
        sumSquares(job.input);

      setResult(computed);
      setPhase("computed");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Computation failed",
      );

      setPhase("error");
    }
  }

  async function submitProof() {
    if (
      !job ||
      result === null ||
      phase !== "computed"
    ) {
      return;
    }

    try {
      setPhase("submitting");
      setError(null);

      const response =
        await requestJson<MineSubmitResponse>(
          "/mine/submit",
          {
            method: "POST",
            body: JSON.stringify({
              jobId: job.id,
              result,
            }),
          },
        );

      setRewardedBlock(response.block);

      setSessionRewards(
        (current) => current + response.reward,
      );

      setSessionJobs(
        (current) => current + 1,
      );

      setPhase("completed");

      await loadStatus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Proof submission failed",
      );

      setPhase("error");
    }
  }

  function resetMiner() {
    setJob(null);
    setResult(null);
    setRewardedBlock(null);
    setError(null);
    setPhase("idle");
  }

  const busy =
    phase === "starting" ||
    phase === "computing" ||
    phase === "submitting";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshStatus()}
            tintColor="#68a7ff"
            colors={["#68a7ff"]}
            progressBackgroundColor="#0b101a"
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              MINE
            </Text>

            <Text style={styles.subtitle}>
              PROOF OF USEFUL WORK
            </Text>
          </View>

          <View
            style={[
              styles.liveBadge,
              !connected &&
                styles.offlineBadge,
            ]}
          >
            <View
              style={[
                styles.liveDot,
                !connected &&
                  styles.offlineDot,
              ]}
            />

            <Text
              style={[
                styles.liveText,
                !connected &&
                  styles.offlineText,
              ]}
            >
              {connected
                ? "LIVE"
                : "OFFLINE"}
            </Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View>
              <Text style={styles.eyebrow}>
                MINING STATUS
              </Text>

              <Text style={styles.statusTitle}>
                {phaseLabel}
              </Text>
            </View>

            <View
              style={[
                styles.statusOrb,
                phase === "completed" &&
                  styles.statusOrbRewarded,
              ]}
            >
              {busy ? (
                <ActivityIndicator
                  color="#68a7ff"
                  size="small"
                />
              ) : (
                <Text
                  style={[
                    styles.statusOrbText,
                    phase === "completed" &&
                      styles.statusOrbTextRewarded,
                  ]}
                >
                  {phase === "completed"
                    ? "✓"
                    : "⚡"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.readinessRow}>
            <View style={styles.readinessItem}>
              <View
                style={[
                  styles.readinessDot,
                  !connected &&
                    styles.readinessDotOff,
                ]}
              />

              <Text style={styles.readinessText}>
                NODE CONNECTED
              </Text>
            </View>

            <View style={styles.readinessItem}>
              <View
                style={styles.readinessDot}
              />

              <Text style={styles.readinessText}>
                HUMANITY VERIFIED
              </Text>
            </View>
          </View>

          {network && (
            <View style={styles.networkStrip}>
              <Text style={styles.networkName}>
                {network.network}
              </Text>

              <Text style={styles.networkMeta}>
                HEIGHT {network.height} ·{" "}
                {network.version}
              </Text>
            </View>
          )}
        </View>

        {!job && (
          <View style={styles.workCard}>
            <Text style={styles.eyebrow}>
              AVAILABLE WORK
            </Text>

            <Text style={styles.workTitle}>
              Useful computation
            </Text>

            <Text style={styles.workDescription}>
              Fetch a verified workload from the Prism node,
              compute it locally on this device, then submit
              the result as a PoUW proof.
            </Text>

            <View style={styles.workPreviewGrid}>
              <View style={styles.previewItem}>
                <Text style={styles.previewValue}>
                  AUTO
                </Text>

                <Text style={styles.previewLabel}>
                  TASK
                </Text>
              </View>

              <View style={styles.previewItem}>
                <Text style={styles.previewValue}>
                  LOW
                </Text>

                <Text style={styles.previewLabel}>
                  DIFFICULTY
                </Text>
              </View>

              <View style={styles.previewItem}>
                <Text style={styles.rewardValue}>
                  2
                </Text>

                <Text style={styles.previewLabel}>
                  PRISM
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => void startWork()}
              disabled={!connected || busy}
              style={({ pressed }) => [
                styles.primaryButton,

                (!connected || busy) &&
                  styles.primaryButtonDisabled,

                pressed &&
                  connected &&
                  styles.buttonPressed,
              ]}
            >
              {phase === "starting" ? (
                <ActivityIndicator
                  color="#05070c"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  START WORK →
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {job && (
          <View style={styles.workCard}>
            <View style={styles.jobHeader}>
              <View>
                <Text style={styles.eyebrow}>
                  ACTIVE JOB
                </Text>

                <Text style={styles.workTitle}>
                  {job.task}
                </Text>
              </View>

              <View
                style={styles.jobRewardBadge}
              >
                <Text
                  style={
                    styles.jobRewardValue
                  }
                >
                  {job.reward}
                </Text>

                <Text
                  style={
                    styles.jobRewardLabel
                  }
                >
                  PRISM
                </Text>
              </View>
            </View>

            <Text style={styles.jobId}>
              {job.id} · {job.worker}
            </Text>

            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>
                INPUT
              </Text>

              <Text style={styles.inputValue}>
                [{job.input.join(", ")}]
              </Text>
            </View>

            <View style={styles.jobStats}>
              <View style={styles.jobStat}>
                <Text
                  style={styles.jobStatValue}
                >
                  {job.difficulty}
                </Text>

                <Text
                  style={styles.jobStatLabel}
                >
                  DIFFICULTY
                </Text>
              </View>

              <View style={styles.jobStat}>
                <Text
                  style={styles.jobStatValue}
                >
                  {job.input.length}
                </Text>

                <Text
                  style={styles.jobStatLabel}
                >
                  WORK UNITS
                </Text>
              </View>

              <View style={styles.jobStat}>
                <Text
                  style={styles.jobStatValue}
                >
                  {result ?? "—"}
                </Text>

                <Text
                  style={styles.jobStatLabel}
                >
                  RESULT
                </Text>
              </View>
            </View>

            {phase === "ready" && (
              <Pressable
                onPress={() =>
                  void runCompute()
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  RUN COMPUTE →
                </Text>
              </Pressable>
            )}

            {phase === "computing" && (
              <View
                style={
                  styles.computingPanel
                }
              >
                <ActivityIndicator
                  color="#68a7ff"
                  size="small"
                />

                <Text
                  style={
                    styles.computingText
                  }
                >
                  Computing sum of squares
                  on device…
                </Text>
              </View>
            )}

            {phase === "computed" &&
              result !== null && (
                <>
                  <View
                    style={styles.proofReady}
                  >
                    <View
                      style={
                        styles.proofReadyDot
                      }
                    />

                    <View>
                      <Text
                        style={
                          styles.proofReadyTitle
                        }
                      >
                        PROOF READY
                      </Text>

                      <Text
                        style={
                          styles.proofReadyText
                        }
                      >
                        Result {result} is ready
                        for node verification.
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() =>
                      void submitProof()
                    }
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      SUBMIT PROOF →
                    </Text>
                  </Pressable>
                </>
              )}

            {phase === "submitting" && (
              <View
                style={
                  styles.computingPanel
                }
              >
                <ActivityIndicator
                  color="#68a7ff"
                  size="small"
                />

                <Text
                  style={
                    styles.computingText
                  }
                >
                  Verifying proof on Prism
                  node…
                </Text>
              </View>
            )}

            {phase === "completed" && (
              <>
                <View
                  style={
                    styles.rewardPanel
                  }
                >
                  <Text
                    style={
                      styles.rewardEyebrow
                    }
                  >
                    WORK VERIFIED
                  </Text>

                  <Text
                    style={
                      styles.rewardTitle
                    }
                  >
                    +{job.reward} PRISM
                  </Text>

                  <Text
                    style={
                      styles.rewardText
                    }
                  >
                    Proof included in block{" "}
                    {rewardedBlock ?? "—"}.
                  </Text>
                </View>

                <Pressable
                  onPress={resetMiner}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed &&
                      styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    MINE NEXT JOB
                  </Text>
                </Pressable>
              </>
            )}

            {phase === "error" && (
              <Pressable
                onPress={resetMiner}
                style={
                  styles.secondaryButton
                }
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  RESET MINER
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              MINER ERROR
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        <View style={styles.sessionCard}>
          <Text style={styles.eyebrow}>
            SESSION
          </Text>

          <Text style={styles.sessionTitle}>
            Mining activity
          </Text>

          <View style={styles.sessionStats}>
            <View style={styles.sessionStat}>
              <Text
                style={
                  styles.sessionStatValue
                }
              >
                {sessionJobs}
              </Text>

              <Text
                style={
                  styles.sessionStatLabel
                }
              >
                JOBS
              </Text>
            </View>

            <View style={styles.sessionStat}>
              <Text
                style={
                  styles.sessionRewardValue
                }
              >
                {sessionRewards}
              </Text>

              <Text
                style={
                  styles.sessionStatLabel
                }
              >
                PRISM EARNED
              </Text>
            </View>

            <View style={styles.sessionStat}>
              <Text
                style={
                  styles.sessionStatValue
                }
              >
                {network?.blocks ?? 0}
              </Text>

              <Text
                style={
                  styles.sessionStatLabel
                }
              >
                NETWORK BLOCKS
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Prism · Useful Work Miner
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#05070c",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 56,
    gap: 14,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  logo: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 5,
  },

  subtitle: {
    color: "#66758d",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginTop: 4,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0a2118",
    borderWidth: 1,
    borderColor: "#16452f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  offlineBadge: {
    backgroundColor: "#2b1719",
    borderColor: "#633038",
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#45e391",
  },

  offlineDot: {
    backgroundColor: "#ff737e",
  },

  liveText: {
    color: "#72e8a8",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  offlineText: {
    color: "#ff8b8b",
  },

  statusCard: {
    backgroundColor: "#0b101a",
    borderWidth: 1,
    borderColor: "#1b2639",
    borderRadius: 20,
    padding: 18,
  },

  statusTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  eyebrow: {
    color: "#58677f",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  statusTitle: {
    color: "#68a7ff",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },

  statusOrb: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: "#111d30",
    borderWidth: 1,
    borderColor: "#21375b",
    alignItems: "center",
    justifyContent: "center",
  },

  statusOrbRewarded: {
    backgroundColor: "#0a2118",
    borderColor: "#16452f",
  },

  statusOrbText: {
    color: "#68a7ff",
    fontSize: 21,
    fontWeight: "900",
  },

  statusOrbTextRewarded: {
    color: "#72e8a8",
  },

  readinessRow: {
    gap: 8,
    marginTop: 17,
  },

  readinessItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  readinessDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#45e391",
  },

  readinessDotOff: {
    backgroundColor: "#ff737e",
  },

  readinessText: {
    color: "#718096",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  networkStrip: {
    backgroundColor: "#10192a",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },

  networkName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },

  networkMeta: {
    color: "#687790",
    fontSize: 9,
    fontFamily: "monospace",
    marginTop: 4,
  },

  workCard: {
    backgroundColor: "#0b101a",
    borderWidth: 1,
    borderColor: "#1b2639",
    borderRadius: 20,
    padding: 18,
  },

  workTitle: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 6,
  },

  workDescription: {
    color: "#7b899f",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },

  workPreviewGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },

  previewItem: {
    flex: 1,
    minHeight: 72,
    backgroundColor: "#10192a",
    borderWidth: 1,
    borderColor: "#15223a",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  previewValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  rewardValue: {
    color: "#e1bc68",
    fontSize: 19,
    fontWeight: "900",
  },

  previewLabel: {
    color: "#62728a",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 5,
  },

  primaryButton: {
    backgroundColor: "#68a7ff",
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  primaryButtonDisabled: {
    opacity: 0.4,
  },

  primaryButtonText: {
    color: "#05070c",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: "#2a3954",
    backgroundColor: "#111827",
    borderRadius: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  secondaryButtonText: {
    color: "#8db8ff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  buttonPressed: {
    opacity: 0.8,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  jobRewardBadge: {
    minWidth: 62,
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: "#211c0e",
    borderWidth: 1,
    borderColor: "#4d4020",
    alignItems: "center",
    justifyContent: "center",
  },

  jobRewardValue: {
    color: "#e1bc68",
    fontSize: 20,
    fontWeight: "900",
  },

  jobRewardLabel: {
    color: "#8b7946",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  jobId: {
    color: "#687790",
    fontFamily: "monospace",
    fontSize: 10,
    marginTop: 8,
  },

  inputBlock: {
    backgroundColor: "#111c2d",
    borderRadius: 13,
    padding: 13,
    marginTop: 16,
  },

  inputLabel: {
    color: "#5f6f87",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  inputValue: {
    color: "#e8edf6",
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 7,
  },

  jobStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  jobStat: {
    flex: 1,
    minHeight: 65,
    backgroundColor: "#10192a",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  jobStatValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  jobStatLabel: {
    color: "#607087",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 4,
    textAlign: "center",
  },

  computingPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#10192a",
    borderRadius: 13,
    padding: 14,
    marginTop: 16,
  },

  computingText: {
    color: "#8db8ff",
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },

  proofReady: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0a2118",
    borderWidth: 1,
    borderColor: "#16452f",
    borderRadius: 13,
    padding: 13,
    marginTop: 16,
  },

  proofReadyDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#45e391",
  },

  proofReadyTitle: {
    color: "#72e8a8",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.9,
  },

  proofReadyText: {
    color: "#6fae8c",
    fontSize: 10,
    marginTop: 3,
  },

  rewardPanel: {
    backgroundColor: "#0a2118",
    borderWidth: 1,
    borderColor: "#16452f",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },

  rewardEyebrow: {
    color: "#5da77d",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  rewardTitle: {
    color: "#72e8a8",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 6,
  },

  rewardText: {
    color: "#6fae8c",
    fontSize: 11,
    marginTop: 5,
  },

  errorCard: {
    backgroundColor: "#2b1719",
    borderWidth: 1,
    borderColor: "#633038",
    borderRadius: 16,
    padding: 14,
  },

  errorTitle: {
    color: "#ff8b8b",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  errorText: {
    color: "#d58b91",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  sessionCard: {
    backgroundColor: "#0b101a",
    borderWidth: 1,
    borderColor: "#1b2639",
    borderRadius: 20,
    padding: 18,
  },

  sessionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },

  sessionStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 15,
  },

  sessionStat: {
    flex: 1,
    minHeight: 72,
    backgroundColor: "#10192a",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  sessionStatValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },

  sessionRewardValue: {
    color: "#e1bc68",
    fontSize: 18,
    fontWeight: "900",
  },

  sessionStatLabel: {
    color: "#607087",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 4,
    textAlign: "center",
  },

  footer: {
    color: "#46546b",
    textAlign: "center",
    fontSize: 10,
    marginTop: 8,
  },
});