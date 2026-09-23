import { router, useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PRISM_API } from "../api/client";
import type { PrismWorkEntry } from "../api/types";
import type {
  PrismPoUWJob,
  PrismPoUWResult,
} from "../crypto/prismWallet";
import {
  computePrismPoUW,
  getOrCreatePrismWallet,
  signPrismPoUWProof,
} from "../crypto/prismWallet";

import {
  createComputeReceipt,
} from "../types/computeReceipt";

type MineJob = Omit<
  PrismPoUWJob,
  "input" | "inputB"
> & {
  input: number[] | null;
  inputB?: number[] | null;
};

type MineStartResponse = {
  job: MineJob;
};

type MineReceiptProof =
  PrismWorkEntry & {
    taskId: string;
    workerAddress: string;
    resultValues?: number[];
    outputHash: string;
  };

type MineSubmitResponse = {
  verified: boolean;
  reward: number;
  block: number;
  totalSupply: number;
  proof?: MineReceiptProof;
};

type NetworkStatus = {
  network: string;
  chainId: string;
  height: number;
  blocks: number;
  validators: number;
  chainValid: boolean;
  totalStake: number;
  totalSupply: number;
  version: string;
  protocol: string;
  lastHash?: string;
};

type WorkResponse = {
  entries?: PrismWorkEntry[];
};

type HumanityEntry = {
  address: string;
  name: string;
  provider: string;
  action: string;
  block: number;
};

type HumanityResponse = {
  identities?: HumanityEntry[];
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

const SUPPORTED_LOCAL_TASKS = new Set([
  "sum_squares",
  "dot_product",
  "prime_count",
  "matrix_multiply",
  "image_convolution",
]);

async function requestJson<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  if (!PRISM_API) {
    throw new Error(
      "Prism API is not configured for this build.",
    );
  }

  const response = await fetch(
    `${PRISM_API}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    },
  );

  let body: any;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      body?.error ??
        `${path}: HTTP ${response.status}`,
    );
  }

  return body as T;
}

function mineErrorMessage(
  error: unknown,
  fallback: string,
) {
  const message =
    error instanceof Error
      ? error.message
      : "";

  console.warn("[Prism Mine]", error);

  if (
    /fetch failed|failed to fetch|network request failed|unexpected end of stream|java\.io\.IOException|ECONNREFUSED/i.test(
      message,
    )
  ) {
    return "Could not reach Prism Devnet. Check the node connection and try again.";
  }

  return message || fallback;
}

function shortId(value: string) {
  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function formatTask(task: string) {
  return task
    .replaceAll("_", " ")
    .toUpperCase();
}

function numericInput(
  values: number[] | null | undefined,
): number[] {
  return Array.isArray(values)
    ? values
    : [];
}

function hasNumericInput(job: MineJob) {
  return (
    Array.isArray(job.input) &&
    job.input.length > 0
  );
}

function canComputeLocally(job: MineJob) {
  if (!SUPPORTED_LOCAL_TASKS.has(job.task)) {
    return false;
  }

  if (!hasNumericInput(job)) {
    return false;
  }

  if (
    job.task === "dot_product" ||
    job.task === "matrix_multiply" ||
    job.task === "image_convolution"
  ) {
    return (
      Array.isArray(job.inputB) &&
      job.inputB.length > 0
    );
  }

  return true;
}

function normalizeJobForCrypto(
  job: MineJob,
): PrismPoUWJob {
  if (!SUPPORTED_LOCAL_TASKS.has(job.task)) {
    throw new Error(
      `Unsupported mobile PoUW workload: ${job.task}.`,
    );
  }

  if (
    !Array.isArray(job.input) ||
    job.input.length === 0
  ) {
    throw new Error(
      `PoUW workload "${job.task}" contains no numeric input. ` +
        "The node returned input=null or an empty input, so this workload is not supported by the current mobile miner yet.",
    );
  }

  if (
    (
      job.task === "dot_product" ||
      job.task === "matrix_multiply" ||
      job.task === "image_convolution"
    ) &&
    (
      !Array.isArray(job.inputB) ||
      job.inputB.length === 0
    )
  ) {
    throw new Error(
      `PoUW workload "${job.task}" requires a second numeric input.`,
    );
  }

  return {
    ...job,
    input: job.input,
    inputB: Array.isArray(job.inputB)
      ? job.inputB
      : undefined,
  };
}

function workUnitsForJob(
  job: MineJob,
): number {
  const inputA = numericInput(job.input);
  const inputB = numericInput(job.inputB);

  if (job.task === "dot_product") {
    return inputA.length + inputB.length;
  }

  if (job.task === "matrix_multiply") {
    return (
      Math.max(0, job.rowsA ?? 0) *
      Math.max(0, job.colsA ?? 0) *
      Math.max(0, job.colsB ?? 0)
    );
  }

  if (job.task === "image_convolution") {
    const rows = Math.max(
      0,
      job.rowsA ?? 0,
    );

    const cols = Math.max(
      0,
      job.colsA ?? 0,
    );

    const kernelSize = Math.max(
      0,
      job.colsB ?? 0,
    );

    if (
      rows === 0 ||
      cols === 0 ||
      kernelSize === 0
    ) {
      return 0;
    }

    const outputRows = Math.max(
      0,
      rows - kernelSize + 1,
    );

    const outputCols = Math.max(
      0,
      cols - kernelSize + 1,
    );

    return (
      outputRows *
      outputCols *
      kernelSize *
      kernelSize
    );
  }

  return inputA.length;
}

function formatMatrix(
  values: number[] | null | undefined,
  rows?: number,
  cols?: number,
): string {
  const safeValues =
    numericInput(values);

  if (safeValues.length === 0) {
    return "NO NUMERIC INPUT";
  }

  if (
    !rows ||
    !cols ||
    safeValues.length !== rows * cols
  ) {
    return `[${safeValues.join(", ")}]`;
  }

  const lines: string[] = [];

  for (
    let row = 0;
    row < rows;
    row += 1
  ) {
    const offset = row * cols;

    lines.push(
      `[${safeValues
        .slice(
          offset,
          offset + cols,
        )
        .join(", ")}]`,
    );
  }

  return lines.join("\n");
}

function formatInput(
  values: number[] | null | undefined,
): string {
  const safeValues =
    numericInput(values);

  if (safeValues.length === 0) {
    return "NO NUMERIC INPUT";
  }

  return `[${safeValues.join(", ")}]`;
}

function formatPoUWResult(
  result: PrismPoUWResult,
  job: MineJob,
): string {
  if (!Array.isArray(result)) {
    return String(result);
  }

  if (
    job.task === "matrix_multiply"
  ) {
    return formatMatrix(
      result,
      job.rowsA,
      job.colsB,
    );
  }

  if (
    job.task === "image_convolution"
  ) {
    const rows =
      job.rowsA ?? 0;

    const cols =
      job.colsA ?? 0;

    const kernelSize =
      job.colsB ?? 0;

    const outputRows =
      rows - kernelSize + 1;

    const outputCols =
      cols - kernelSize + 1;

    return formatMatrix(
      result,
      outputRows > 0
        ? outputRows
        : undefined,
      outputCols > 0
        ? outputCols
        : undefined,
    );
  }

  return `[${result.join(", ")}]`;
}

function inputALabel(
  job: MineJob,
) {
  if (
    job.task === "matrix_multiply"
  ) {
    return `MATRIX A (${job.rowsA ?? "?"}x${job.colsA ?? "?"})`;
  }

  if (
    job.task === "image_convolution"
  ) {
    return `IMAGE (${job.rowsA ?? "?"}x${job.colsA ?? "?"})`;
  }

  return "INPUT A";
}

function inputBLabel(
  job: MineJob,
) {
  if (
    job.task === "matrix_multiply"
  ) {
    return `MATRIX B (${job.colsA ?? "?"}x${job.colsB ?? "?"})`;
  }

  if (
    job.task === "image_convolution"
  ) {
    return `KERNEL (${job.colsB ?? "?"}x${job.colsB ?? "?"})`;
  }

  return "INPUT B";
}

function formattedInputA(
  job: MineJob,
) {
  if (
    job.task === "matrix_multiply" ||
    job.task === "image_convolution"
  ) {
    return formatMatrix(
      job.input,
      job.rowsA,
      job.colsA,
    );
  }

  return formatInput(job.input);
}

function formattedInputB(
  job: MineJob,
) {
  if (
    job.task === "matrix_multiply"
  ) {
    return formatMatrix(
      job.inputB,
      job.colsA,
      job.colsB,
    );
  }

  if (
    job.task === "image_convolution"
  ) {
    return formatMatrix(
      job.inputB,
      job.colsB,
      job.colsB,
    );
  }

  return formatInput(job.inputB);
}

export default function MineScreen() {
  const [network, setNetwork] =
    useState<NetworkStatus | null>(null);

  const [phase, setPhase] =
    useState<MinerPhase>("idle");

  const [job, setJob] =
    useState<MineJob | null>(null);

  const [result, setResult] =
    useState<PrismPoUWResult | null>(
      null,
    );

  const [
    rewardedBlock,
    setRewardedBlock,
  ] = useState<number | null>(null);

  const [
    rewardedAmount,
    setRewardedAmount,
  ] = useState<number | null>(null);

  const [
    sessionRewards,
    setSessionRewards,
  ] = useState(0);

  const [
    sessionJobs,
    setSessionJobs,
  ] = useState(0);

  const [
    recentWork,
    setRecentWork,
  ] = useState<PrismWorkEntry[]>([]);

  const [
    humanityVerified,
    setHumanityVerified,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const [orbPulse] = useState(
    () => new Animated.Value(0),
  );

  const [rewardPop] = useState(
    () => new Animated.Value(0),
  );

  const loadStatus =
    useCallback(async () => {
      try {
        const status =
          await requestJson<NetworkStatus>(
            "/status",
          );

        setNetwork(status);
        setError(null);
      } catch (err) {
        setNetwork(null);

        setError(
          mineErrorMessage(
            err,
            "Unable to reach Prism node",
          ),
        );
      }
    }, []);

  const loadRecentWork =
    useCallback(async () => {
      try {
        const response =
          await requestJson<WorkResponse>(
            "/work",
          );

        setRecentWork(
          [...(response.entries ?? [])]
            .reverse()
            .slice(0, 5),
        );
      } catch (err) {
        console.warn(
          "[Prism Mine] recent work unavailable",
          err,
        );
      }
    }, []);

  const loadHumanity =
    useCallback(async () => {
      try {
        const response =
          await requestJson<HumanityResponse>(
            "/humanity",
          );

        const alice =
          response.identities?.some(
            (identity) =>
              identity.name === "Alice",
          ) ?? false;

        setHumanityVerified(alice);
      } catch (err) {
        console.warn(
          "[Prism Mine] humanity unavailable",
          err,
        );

        setHumanityVerified(false);
      }
    }, []);

  const refreshAll =
    useCallback(async () => {
      setRefreshing(true);

      try {
        await Promise.all([
          loadStatus(),
          loadRecentWork(),
          loadHumanity(),
        ]);
      } finally {
        setRefreshing(false);
      }
    }, [
      loadHumanity,
      loadRecentWork,
      loadStatus,
    ]);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([
        loadStatus(),
        loadRecentWork(),
        loadHumanity(),
      ]);
    }, [
      loadHumanity,
      loadRecentWork,
      loadStatus,
    ]),
  );

  const connected =
    Boolean(network);

  const phaseLabel =
    useMemo(() => {
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
          return connected
            ? "READY"
            : "OFFLINE";
      }
    }, [connected, phase]);

  const busy =
    phase === "starting" ||
    phase === "computing" ||
    phase === "submitting";

  const localJobSupported =
    job
      ? canComputeLocally(job)
      : false;

  async function startWork() {
    if (
      !connected ||
      phase === "starting" ||
      phase === "computing" ||
      phase === "submitting"
    ) {
      return;
    }

    try {
      setPhase("starting");
      setError(null);
      setJob(null);
      setResult(null);
      setRewardedBlock(null);
      setRewardedAmount(null);

      const wallet =
        await getOrCreatePrismWallet();

      console.log(
        "[Prism Mine] wallet ready",
        wallet.address,
      );

      const response =
        await requestJson<MineStartResponse>(
          "/mine/start",
          {
            method: "POST",
            body: JSON.stringify({
              worker: wallet.address,
            }),
          },
        );

      if (
        !response ||
        !response.job
      ) {
        throw new Error(
          "Prism node returned an invalid mining job.",
        );
      }

      console.log(
        "[Prism Mine] job",
        response.job.task,
        {
          id: response.job.id,
          inputIsArray:
            Array.isArray(
              response.job.input,
            ),
          inputLength:
            Array.isArray(
              response.job.input,
            )
              ? response.job.input.length
              : null,
        },
      );

      setJob(response.job);
      setPhase("ready");
    } catch (err) {
      setError(
        mineErrorMessage(
          err,
          "Unable to fetch useful work",
        ),
      );

      setPhase("error");
    }
  }

  async function runCompute() {
    if (
      !job ||
      phase !== "ready"
    ) {
      return;
    }

    try {
      setPhase("computing");
      setError(null);

      await new Promise<void>(
        (resolve) => {
          setTimeout(
            resolve,
            650,
          );
        },
      );

      const cryptoJob =
        normalizeJobForCrypto(
          job,
        );

      const computed =
        computePrismPoUW(
          cryptoJob,
        );

      setResult(computed);
      setPhase("computed");
    } catch (err) {
      setError(
        mineErrorMessage(
          err,
          "Computation failed",
        ),
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

      const cryptoJob =
        normalizeJobForCrypto(
          job,
        );

      const signedProof =
        await signPrismPoUWProof(
          cryptoJob,
          result,
        );

      const response =
        await requestJson<MineSubmitResponse>(
          "/mine/submit",
          {
            method: "POST",
            body: JSON.stringify(
              signedProof,
            ),
          },
        );

      if (
        response?.verified !== true
      ) {
        throw new Error(
          "Prism node rejected the PoUW proof.",
        );
      }

      const proof = response.proof;

      if (!proof) {
        throw new Error(
          "Prism node verified the proof but did not return the proof receipt.",
        );
      }

      const receipt = createComputeReceipt({
        jobId: proof.taskId,
        proofId: proof.proofId,
        taskType: proof.task,
        worker: proof.workerAddress,
        prismChainId:
          network?.chainId ?? "unknown",
        result:
          proof.resultValues?.length
            ? proof.resultValues
            : proof.result,
        outputHash: proof.outputHash,
        score: proof.score,
        reward: response.reward,
        verified: true,
        createdAt:
          new Date().toISOString(),
        settlements: [],
      });

      setRewardedBlock(
        response.block,
      );

      setRewardedAmount(
        response.reward,
      );

      setSessionRewards(
        (current) =>
          current + response.reward,
      );

      setSessionJobs(
        (current) =>
          current + 1,
      );

      setPhase("completed");

      await Promise.all([
        loadStatus(),
        loadRecentWork(),
      ]);

      router.push({
        pathname: "/receipt",
        params: {
          receipt: JSON.stringify(
            receipt,
          ),
        },
      });
    } catch (err) {
      setError(
        mineErrorMessage(
          err,
          "Proof submission failed",
        ),
      );

      setPhase("error");
    }
  }

  function resetMiner() {
    setJob(null);
    setResult(null);
    setRewardedBlock(null);
    setRewardedAmount(null);
    setError(null);
    setPhase("idle");
  }

  function retryMiner() {
    setError(null);

    if (!connected) {
      void refreshAll();
      return;
    }

    resetMiner();
  }

  useEffect(() => {
    if (!busy) {
      orbPulse.stopAnimation();
      orbPulse.setValue(0);
      return;
    }

    const animation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            orbPulse,
            {
              toValue: 1,
              duration: 650,
              useNativeDriver: true,
            },
          ),
          Animated.timing(
            orbPulse,
            {
              toValue: 0,
              duration: 650,
              useNativeDriver: true,
            },
          ),
        ]),
      );

    animation.start();

    return () =>
      animation.stop();
  }, [busy, orbPulse]);

  useEffect(() => {
    if (phase !== "completed") {
      rewardPop.setValue(0);
      return;
    }

    Animated.spring(
      rewardPop,
      {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      },
    ).start();
  }, [
    phase,
    rewardPop,
  ]);

  const orbAnimatedStyle = {
    transform: [
      {
        scale:
          orbPulse.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.08],
          }),
      },
    ],
    opacity:
      orbPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.72, 1],
      }),
  };

  const rewardPanelAnimatedStyle = {
    opacity: rewardPop,
    transform: [
      {
        scale:
          rewardPop.interpolate({
            inputRange: [0, 1],
            outputRange: [
              0.92,
              1,
            ],
          }),
      },
    ],
  };

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
              void refreshAll()
            }
            tintColor="#68a7ff"
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text
              style={styles.headerEyebrow}
            >
              PRISM MOBILE
            </Text>

            <Text
              style={styles.headerTitle}
            >
              Mine
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Proof of Useful Work
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              connected
                ? styles.statusBadgeOnline
                : styles.statusBadgeOffline,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                connected
                  ? styles.statusDotOnline
                  : styles.statusDotOffline,
              ]}
            />

            <Text
              style={
                styles.statusBadgeText
              }
            >
              {phaseLabel}
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.orbOuter,
              busy &&
                orbAnimatedStyle,
            ]}
          >
            <View
              style={styles.orbMiddle}
            >
              <View
                style={styles.orbInner}
              >
                <Text
                  style={styles.orbIcon}
                >
                  {"\u26A1"}
                </Text>
              </View>
            </View>
          </Animated.View>

          <Text
            style={styles.heroTitle}
          >
            USEFUL COMPUTE
          </Text>

          <Text
            style={
              styles.heroDescription
            }
          >
            Run verified workloads
            locally and submit the
            result to Prism as a PoUW
            proof.
          </Text>
        </View>

        <View
          style={styles.healthGrid}
        >
          <View
            style={styles.healthCard}
          >
            <Text
              style={
                styles.healthLabel
              }
            >
              NODE
            </Text>

            <Text
              style={[
                styles.healthValue,
                connected
                  ? styles.good
                  : styles.bad,
              ]}
            >
              {connected
                ? "CONNECTED"
                : "OFFLINE"}
            </Text>
          </View>

          <View
            style={styles.healthCard}
          >
            <Text
              style={
                styles.healthLabel
              }
            >
              HUMANITY
            </Text>

            <Text
              style={[
                styles.healthValue,
                humanityVerified
                  ? styles.good
                  : styles.muted,
              ]}
            >
              {humanityVerified
                ? "VERIFIED"
                : "UNKNOWN"}
            </Text>
          </View>
        </View>

        {network && (
          <View
            style={styles.networkStrip}
          >
            <View>
              <Text
                style={styles.networkName}
              >
                {network.network}
              </Text>

              <Text
                style={styles.networkMeta}
              >
                HEIGHT {network.height}{" "}
                {"\u00B7"}{" "}
                {network.version}
              </Text>
            </View>

            <View
              style={
                styles.protocolBadge
              }
            >
              <Text
                style={
                  styles.protocolText
                }
              >
                P2P {network.protocol}
              </Text>
            </View>
          </View>
        )}

        {!job &&
          phase !== "starting" && (
            <View
              style={styles.workCard}
            >
              <Text
                style={styles.eyebrow}
              >
                AVAILABLE WORK
              </Text>

              <Text
                style={styles.workTitle}
              >
                Fetch a PoUW job
              </Text>

              <Text
                style={
                  styles.workDescription
                }
              >
                Fetch a verified workload
                from the Prism node,
                compute it locally on this
                device, then submit the
                result as a proof.
              </Text>

              <View
                style={
                  styles.workPreviewGrid
                }
              >
                <View
                  style={
                    styles.previewStat
                  }
                >
                  <Text
                    style={
                      styles.previewValue
                    }
                  >
                    LOCAL
                  </Text>

                  <Text
                    style={
                      styles.previewLabel
                    }
                  >
                    COMPUTE
                  </Text>
                </View>

                <View
                  style={
                    styles.previewStat
                  }
                >
                  <Text
                    style={
                      styles.previewValue
                    }
                  >
                    VERIFIED
                  </Text>

                  <Text
                    style={
                      styles.previewLabel
                    }
                  >
                    PROOF
                  </Text>
                </View>

                <View
                  style={
                    styles.previewStat
                  }
                >
                  <Text
                    style={
                      styles.previewValue
                    }
                  >
                    PRISM
                  </Text>

                  <Text
                    style={
                      styles.previewLabel
                    }
                  >
                    REWARD
                  </Text>
                </View>
              </View>

              <Pressable
                disabled={!connected || busy}
                onPress={() =>
                  void startWork()
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!connected ||
                    busy) &&
                    styles.buttonDisabled,
                  pressed &&
                    connected &&
                    !busy &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  START WORK {"\u2192"}
                </Text>
              </Pressable>
            </View>
          )}

        {phase === "starting" && (
          <View
            style={styles.workCard}
          >
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
                Fetching useful work
                from Prism node{"\u2026"}
              </Text>
            </View>
          </View>
        )}

        {job && (
          <View
            style={styles.workCard}
          >
            <View
              style={
                styles.jobHeader
              }
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={styles.eyebrow}
                >
                  ACTIVE JOB
                </Text>

                <Text
                  style={
                    styles.workTitle
                  }
                >
                  {formatTask(
                    job.task,
                  )}
                </Text>
              </View>

              <View
                style={[
                  styles.difficultyBadge,
                  job.difficulty ===
                  "HIGH"
                    ? styles.difficultyHigh
                    : job.difficulty ===
                        "MEDIUM"
                      ? styles.difficultyMedium
                      : styles.difficultyLow,
                ]}
              >
                <Text
                  style={
                    styles.difficultyText
                  }
                >
                  {job.difficulty}
                </Text>
              </View>
            </View>

            <Text
              style={styles.jobId}
            >
              {job.id} {"\u00B7"} {job.worker}
            </Text>

            {!localJobSupported && (
              <View
                style={
                  styles.unsupportedCard
                }
              >
                <Text
                  style={
                    styles.unsupportedTitle
                  }
                >
                  WORKLOAD NOT AVAILABLE
                  LOCALLY
                </Text>

                <Text
                  style={
                    styles.unsupportedText
                  }
                >
                  {SUPPORTED_LOCAL_TASKS.has(
                    job.task,
                  )
                    ? `The node returned "${job.task}" with input=null or missing numeric data.`
                    : `The current mobile miner does not support "${job.task}" yet.`}
                </Text>
              </View>
            )}

            <View
              style={styles.inputCard}
            >
              {(job.task ===
                "matrix_multiply" ||
                job.task ===
                  "image_convolution") && (
                <Text
                  style={[
                    styles.inputLabel,
                    {
                      marginBottom: 12,
                    },
                  ]}
                >
                  {job.task ===
                  "matrix_multiply"
                    ? `MATRIX A ${job.rowsA ?? "?"}\u00D7${job.colsA ?? "?"} \u00B7 MATRIX B ${job.colsA ?? "?"}\u00D7${job.colsB ?? "?"}`
                    : `IMAGE ${job.rowsA ?? "?"}\u00D7${job.colsA ?? "?"} \u00B7 KERNEL ${job.colsB ?? "?"}\u00D7${job.colsB ?? "?"}`}
                </Text>
              )}

              <Text
                style={styles.inputLabel}
              >
                {inputALabel(job)}
              </Text>

              <Text
                style={styles.inputValue}
              >
                {formattedInputA(
                  job,
                )}
              </Text>

              {(job.task ===
                "dot_product" ||
                job.task ===
                  "matrix_multiply" ||
                job.task ===
                  "image_convolution") && (
                <>
                  <Text
                    style={[
                      styles.inputLabel,
                      {
                        marginTop: 16,
                      },
                    ]}
                  >
                    {inputBLabel(
                      job,
                    )}
                  </Text>

                  <Text
                    style={
                      styles.inputValue
                    }
                  >
                    {formattedInputB(
                      job,
                    )}
                  </Text>
                </>
              )}
            </View>

            <View
              style={styles.jobStats}
            >
              <View
                style={styles.jobStat}
              >
                <Text
                  style={
                    styles.jobStatValue
                  }
                >
                  {workUnitsForJob(job)}
                </Text>

                <Text
                  style={
                    styles.jobStatLabel
                  }
                >
                  WORK UNITS
                </Text>
              </View>

              <View
                style={styles.jobStat}
              >
                <Text
                  style={
                    styles.jobStatValue
                  }
                >
                  {job.difficulty}
                </Text>

                <Text
                  style={
                    styles.jobStatLabel
                  }
                >
                  DIFFICULTY
                </Text>
              </View>

              <View
                style={styles.jobStat}
              >
                <Text
                  style={
                    styles.rewardStatValue
                  }
                >
                  +{job.reward}
                </Text>

                <Text
                  style={
                    styles.jobStatLabel
                  }
                >
                  PRISM
                </Text>
              </View>
            </View>

            {phase === "ready" && (
              <Pressable
                disabled={
                  !localJobSupported
                }
                onPress={() =>
                  void runCompute()
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  !localJobSupported &&
                    styles.buttonDisabled,
                  pressed &&
                    localJobSupported &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  {localJobSupported
                    ? `RUN COMPUTE \u2192`
                    : "UNSUPPORTED WORKLOAD"}
                </Text>
              </Pressable>
            )}

            {phase ===
              "computing" && (
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
                  Computing useful workload
                  on device{"\u2026"}
                </Text>
              </View>
            )}

            {phase === "computed" &&
              result !== null && (
                <>
                  <View
                    style={
                      styles.resultCard
                    }
                  >
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
                      {formatPoUWResult(
                        result,
                        job,
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.proofReady
                    }
                  >
                    <View
                      style={
                        styles.proofReadyDot
                      }
                    />

                    <View
                      style={{ flex: 1 }}
                    >
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
                        Result computed
                        locally and ready for
                        node verification.
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() =>
                      void submitProof()
                    }
                    style={({
                      pressed,
                    }) => [
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
                      SUBMIT PROOF{" "}
                      {"\u2192"}
                    </Text>
                  </Pressable>
                </>
              )}

            {phase ===
              "submitting" && (
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
                  Verifying proof on
                  Prism node{"\u2026"}
                </Text>
              </View>
            )}

            {phase ===
              "completed" && (
              <>
                <Animated.View
                  style={[
                    styles.rewardPanel,
                    rewardPanelAnimatedStyle,
                  ]}
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
                    +
                    {rewardedAmount ??
                      job.reward}{" "}
                    PRISM
                  </Text>

                  <Text
                    style={
                      styles.rewardText
                    }
                  >
                    Proof included in
                    block{" "}
                    {rewardedBlock ??
                      "\u2014"}
                    .
                  </Text>
                </Animated.View>

                <Pressable
                  onPress={() =>
                    void startWork()
                  }
                  style={({
                    pressed,
                  }) => [
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
                    MINE NEXT JOB{" "}
                    {"\u2192"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {error && (
          <View
            style={styles.errorCard}
          >
            <Text
              style={styles.errorTitle}
            >
              {connected
                ? "MINER ERROR"
                : "NODE UNAVAILABLE"}
            </Text>

            <Text
              style={styles.errorText}
            >
              {error}
            </Text>

            <Pressable
              onPress={retryMiner}
              style={({ pressed }) => [
                styles.errorButton,
                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Text
                style={
                  styles.errorButtonText
                }
              >
                RETRY
              </Text>
            </Pressable>
          </View>
        )}

        <View
          style={styles.sessionCard}
        >
          <Text style={styles.eyebrow}>
            SESSION
          </Text>

          <Text
            style={styles.sessionTitle}
          >
            Mining activity
          </Text>

          <View
            style={styles.sessionStats}
          >
            <View
              style={styles.sessionStat}
            >
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

            <View
              style={styles.sessionStat}
            >
              <Text
                style={[
                  styles.sessionStatValue,
                  styles.good,
                ]}
              >
                +{sessionRewards}
              </Text>

              <Text
                style={
                  styles.sessionStatLabel
                }
              >
                PRISM
              </Text>
            </View>

            <View
              style={styles.sessionStat}
            >
              <Text
                style={
                  styles.sessionStatValue
                }
              >
                {network?.height ??
                  "\u2014"}
              </Text>

              <Text
                style={
                  styles.sessionStatLabel
                }
              >
                HEIGHT
              </Text>
            </View>
          </View>
        </View>

        <View
          style={styles.historyCard}
        >
          <View
            style={styles.historyHeader}
          >
            <View>
              <Text
                style={styles.eyebrow}
              >
                RECENT WORK
              </Text>

              <Text
                style={
                  styles.sessionTitle
                }
              >
                Verified proofs
              </Text>
            </View>

            <Text
              style={
                styles.historyCount
              }
            >
              {recentWork.length}
            </Text>
          </View>

          {recentWork.length === 0 ? (
            <Text
              style={styles.emptyText}
            >
              No verified work proofs
              yet.
            </Text>
          ) : (
            recentWork.map(
              (entry, index) => (
                <View
                  key={`${entry.proofId}-${index}`}
                  style={[
                    styles.historyRow,
                    index ===
                      recentWork.length -
                        1 &&
                      styles.historyRowLast,
                  ]}
                >
                  <View
                    style={
                      styles.historyIcon
                    }
                  >
                    <Text
                      style={
                        styles.historyIconText
                      }
                    >
                      {"\u2713"}
                    </Text>
                  </View>

                  <View
                    style={{ flex: 1 }}
                  >
                    <Text
                      style={
                        styles.historyTask
                      }
                    >
                      {formatTask(
                        entry.task,
                      )}
                    </Text>

                    <Text
                      style={
                        styles.historyMeta
                      }
                    >
                      {shortId(
                        entry.proofId,
                      )}{" "}
                      {"\u00B7"} Block{" "}
                      {entry.block}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.historyRewardWrap
                    }
                  >
                    <Text
                      style={
                        styles.historyReward
                      }
                    >
                      +{entry.reward}
                    </Text>

                    <Text
                      style={
                        styles.historyRewardLabel
                      }
                    >
                      PRISM
                    </Text>
                  </View>
                </View>
              ),
            )
          )}
        </View>

        <View
          style={styles.networkStats}
        >
          <View
            style={styles.networkStat}
          >
            <Text
              style={
                styles.networkStatValue
              }
            >
              {network?.blocks ?? 0}
            </Text>

            <Text
              style={
                styles.networkStatLabel
              }
            >
              NETWORK BLOCKS
            </Text>
          </View>

          <View
            style={styles.networkStat}
          >
            <Text
              style={
                styles.networkStatValue
              }
            >
              {network?.validators ??
                0}
            </Text>

            <Text
              style={
                styles.networkStatLabel
              }
            >
              VALIDATORS
            </Text>
          </View>

          <View
            style={styles.networkStat}
          >
            <Text
              style={
                styles.networkStatValue
              }
            >
              {network?.totalSupply ??
                0}
            </Text>

            <Text
              style={
                styles.networkStatLabel
              }
            >
              SUPPLY
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Prism {"\u00B7"} Useful Work Miner
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: "#060911",
    },

    container: {
      flex: 1,
      backgroundColor: "#060911",
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 110,
      gap: 16,
    },

    header: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "flex-start",
      gap: 12,
    },

    headerEyebrow: {
      color: "#5f7192",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 2,
    },

    headerTitle: {
      color: "#ffffff",
      fontSize: 36,
      fontWeight: "900",
      letterSpacing: -1.2,
      marginTop: 2,
    },

    headerSubtitle: {
      color: "#8090ad",
      fontSize: 14,
      marginTop: 2,
    },

    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
    },

    statusBadgeOnline: {
      borderColor:
        "rgba(92,220,154,0.25)",
      backgroundColor:
        "rgba(92,220,154,0.07)",
    },

    statusBadgeOffline: {
      borderColor:
        "rgba(255,100,110,0.25)",
      backgroundColor:
        "rgba(255,100,110,0.07)",
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },

    statusDotOnline: {
      backgroundColor: "#62df9a",
    },

    statusDotOffline: {
      backgroundColor: "#ff6674",
    },

    statusBadgeText: {
      color: "#dce6ff",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1,
    },

    hero: {
      alignItems: "center",
      paddingTop: 14,
      paddingBottom: 8,
    },

    orbOuter: {
      width: 122,
      height: 122,
      borderRadius: 61,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(43,100,210,0.07)",
      borderWidth: 1,
      borderColor:
        "rgba(104,167,255,0.18)",
    },

    orbMiddle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(43,100,210,0.11)",
      borderWidth: 1,
      borderColor:
        "rgba(104,167,255,0.24)",
    },

    orbInner: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(104,167,255,0.13)",
      borderWidth: 1,
      borderColor:
        "rgba(104,167,255,0.4)",
    },

    orbIcon: {
      fontSize: 25,
    },

    heroTitle: {
      color: "#eef4ff",
      fontSize: 18,
      fontWeight: "900",
      letterSpacing: 2,
      marginTop: 15,
    },

    heroDescription: {
      color: "#71809c",
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      maxWidth: 310,
      marginTop: 7,
    },

    healthGrid: {
      flexDirection: "row",
      gap: 10,
    },

    healthCard: {
      flex: 1,
      padding: 14,
      borderRadius: 15,
      backgroundColor: "#0a0e18",
      borderWidth: 1,
      borderColor: "#151d2e",
    },

    healthLabel: {
      color: "#566580",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.4,
    },

    healthValue: {
      marginTop: 5,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0.5,
    },

    good: {
      color: "#65e39c",
    },

    bad: {
      color: "#ff6573",
    },

    muted: {
      color: "#7b8ba6",
    },

    networkStrip: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      padding: 14,
      borderRadius: 14,
      backgroundColor: "#090e18",
      borderWidth: 1,
      borderColor: "#172239",
    },

    networkName: {
      color: "#dce7fb",
      fontSize: 13,
      fontWeight: "800",
    },

    networkMeta: {
      color: "#53627d",
      fontSize: 10,
      fontWeight: "700",
      marginTop: 4,
    },

    protocolBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor:
        "rgba(104,167,255,0.08)",
    },

    protocolText: {
      color: "#75adff",
      fontSize: 9,
      fontWeight: "800",
    },

    workCard: {
      padding: 17,
      borderRadius: 18,
      backgroundColor: "#090d16",
      borderWidth: 1,
      borderColor: "#182238",
    },

    eyebrow: {
      color: "#60718e",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.7,
    },

    workTitle: {
      color: "#eef4ff",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 5,
    },

    workDescription: {
      color: "#71809b",
      fontSize: 13,
      lineHeight: 20,
      marginTop: 8,
    },

    workPreviewGrid: {
      flexDirection: "row",
      gap: 8,
      marginTop: 18,
    },

    previewStat: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 13,
      borderRadius: 11,
      backgroundColor: "#0d1320",
      borderWidth: 1,
      borderColor: "#17233a",
    },

    previewValue: {
      color: "#dce8ff",
      fontSize: 10,
      fontWeight: "900",
    },

    previewLabel: {
      color: "#52617a",
      fontSize: 8,
      fontWeight: "800",
      marginTop: 4,
      letterSpacing: 0.7,
    },

    primaryButton: {
      minHeight: 52,
      marginTop: 18,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#397ee8",
      borderWidth: 1,
      borderColor: "#5c9bff",
    },

    primaryButtonText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.2,
      textAlign: "center",
    },

    secondaryButton: {
      minHeight: 50,
      marginTop: 14,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#101827",
      borderWidth: 1,
      borderColor: "#28436d",
    },

    secondaryButtonText: {
      color: "#8db9ff",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1,
    },

    buttonDisabled: {
      opacity: 0.4,
    },

    buttonPressed: {
      opacity: 0.72,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    jobHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "flex-start",
      gap: 10,
    },

    difficultyBadge: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 9,
      borderWidth: 1,
    },

    difficultyLow: {
      backgroundColor:
        "rgba(83,210,151,0.08)",
      borderColor:
        "rgba(83,210,151,0.25)",
    },

    difficultyMedium: {
      backgroundColor:
        "rgba(255,190,79,0.08)",
      borderColor:
        "rgba(255,190,79,0.25)",
    },

    difficultyHigh: {
      backgroundColor:
        "rgba(255,100,110,0.08)",
      borderColor:
        "rgba(255,100,110,0.3)",
    },

    difficultyText: {
      color: "#dce8ff",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1,
    },

    jobId: {
      color: "#566681",
      fontSize: 11,
      marginTop: 4,
    },

    unsupportedCard: {
      marginTop: 16,
      padding: 14,
      borderRadius: 13,
      backgroundColor:
        "rgba(255,190,79,0.07)",
      borderWidth: 1,
      borderColor:
        "rgba(255,190,79,0.24)",
    },

    unsupportedTitle: {
      color: "#ffc768",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },

    unsupportedText: {
      color: "#9d8967",
      fontSize: 11,
      lineHeight: 17,
      marginTop: 6,
    },

    inputCard: {
      marginTop: 16,
      padding: 15,
      borderRadius: 13,
      backgroundColor: "#060a11",
      borderWidth: 1,
      borderColor: "#18243a",
    },

    inputLabel: {
      color: "#50617d",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    inputValue: {
      color: "#7bb0ff",
      fontSize: 17,
      fontWeight: "800",
      marginTop: 7,
    },

    jobStats: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },

    jobStat: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 12,
      borderRadius: 11,
      backgroundColor: "#0d121d",
    },

    jobStatValue: {
      color: "#e7efff",
      fontSize: 13,
      fontWeight: "900",
    },

    rewardStatValue: {
      color: "#65e39c",
      fontSize: 13,
      fontWeight: "900",
    },

    jobStatLabel: {
      color: "#526079",
      fontSize: 8,
      fontWeight: "800",
      marginTop: 4,
      letterSpacing: 0.5,
    },

    computingPanel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
      marginTop: 14,
      borderRadius: 13,
      backgroundColor:
        "rgba(64,123,220,0.08)",
      borderWidth: 1,
      borderColor:
        "rgba(104,167,255,0.18)",
    },

    computingText: {
      flex: 1,
      color: "#8da7ce",
      fontSize: 12,
      lineHeight: 18,
    },

    resultCard: {
      marginTop: 16,
      alignItems: "center",
      padding: 18,
      borderRadius: 14,
      backgroundColor: "#070c15",
      borderWidth: 1,
      borderColor: "#1b2b46",
    },

    resultLabel: {
      color: "#586a86",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.5,
    },

    resultValue: {
      color: "#73adff",
      fontSize: 22,
      lineHeight: 30,
      fontWeight: "900",
      marginTop: 7,
      textAlign: "center",
    },

    proofReady: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      marginTop: 12,
      padding: 14,
      borderRadius: 13,
      backgroundColor:
        "rgba(90,218,153,0.07)",
      borderWidth: 1,
      borderColor:
        "rgba(90,218,153,0.23)",
    },

    proofReadyDot: {
      width: 9,
      height: 9,
      borderRadius: 999,
      backgroundColor: "#61df9a",
    },

    proofReadyTitle: {
      color: "#72e5a7",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1,
    },

    proofReadyText: {
      color: "#6e897d",
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },

    rewardPanel: {
      alignItems: "center",
      marginTop: 15,
      padding: 21,
      borderRadius: 15,
      backgroundColor:
        "rgba(70,210,141,0.08)",
      borderWidth: 1,
      borderColor:
        "rgba(82,225,151,0.28)",
    },

    rewardEyebrow: {
      color: "#67d99b",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.5,
    },

    rewardTitle: {
      color: "#75e8aa",
      fontSize: 28,
      fontWeight: "900",
      marginTop: 5,
    },

    rewardText: {
      color: "#789486",
      fontSize: 12,
      marginTop: 5,
    },

    errorCard: {
      padding: 16,
      borderRadius: 15,
      backgroundColor:
        "rgba(223,69,78,0.07)",
      borderWidth: 1,
      borderColor:
        "rgba(255,87,100,0.24)",
    },

    errorTitle: {
      color: "#ff7782",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.3,
    },

    errorText: {
      color: "#9e747c",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 7,
    },

    errorButton: {
      alignSelf: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginTop: 12,
      borderRadius: 9,
      backgroundColor:
        "rgba(255,100,110,0.08)",
      borderWidth: 1,
      borderColor:
        "rgba(255,100,110,0.2)",
    },

    errorButtonText: {
      color: "#ff8790",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },

    sessionCard: {
      padding: 16,
      borderRadius: 17,
      backgroundColor: "#090d16",
      borderWidth: 1,
      borderColor: "#172137",
    },

    sessionTitle: {
      color: "#e9f0ff",
      fontSize: 17,
      fontWeight: "900",
      marginTop: 4,
    },

    sessionStats: {
      flexDirection: "row",
      gap: 8,
      marginTop: 15,
    },

    sessionStat: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 13,
      borderRadius: 11,
      backgroundColor: "#0d121d",
    },

    sessionStatValue: {
      color: "#e4edff",
      fontSize: 17,
      fontWeight: "900",
    },

    sessionStatLabel: {
      color: "#56657d",
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.8,
      marginTop: 4,
    },

    historyCard: {
      padding: 16,
      borderRadius: 17,
      backgroundColor: "#090d16",
      borderWidth: 1,
      borderColor: "#172137",
    },

    historyHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginBottom: 8,
    },

    historyCount: {
      color: "#6ea8ff",
      fontSize: 18,
      fontWeight: "900",
    },

    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: "#121b2c",
    },

    historyRowLast: {
      borderBottomWidth: 0,
    },

    historyIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(91,220,153,0.09)",
      borderWidth: 1,
      borderColor:
        "rgba(91,220,153,0.2)",
    },

    historyIconText: {
      color: "#62df9a",
      fontSize: 13,
      fontWeight: "900",
    },

    historyTask: {
      color: "#dce7fa",
      fontSize: 11,
      fontWeight: "900",
    },

    historyMeta: {
      color: "#53617a",
      fontSize: 9,
      marginTop: 4,
    },

    historyRewardWrap: {
      alignItems: "flex-end",
    },

    historyReward: {
      color: "#65e39c",
      fontSize: 13,
      fontWeight: "900",
    },

    historyRewardLabel: {
      color: "#53627a",
      fontSize: 8,
      fontWeight: "800",
      marginTop: 2,
    },

    emptyText: {
      color: "#58677f",
      fontSize: 12,
      paddingVertical: 15,
    },

    networkStats: {
      flexDirection: "row",
      gap: 8,
    },

    networkStat: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 14,
      borderRadius: 13,
      backgroundColor: "#080c14",
      borderWidth: 1,
      borderColor: "#141d30",
    },

    networkStatValue: {
      color: "#dfe9fb",
      fontSize: 15,
      fontWeight: "900",
    },

    networkStatLabel: {
      color: "#4e5e77",
      fontSize: 7,
      fontWeight: "900",
      textAlign: "center",
      letterSpacing: 0.6,
      marginTop: 5,
    },

    footer: {
      color: "#35425a",
      fontSize: 10,
      fontWeight: "700",
      textAlign: "center",
      marginTop: 8,
    },
  });
