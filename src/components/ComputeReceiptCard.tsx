import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  ComputeReceipt,
  ComputeReceiptSettlement,
} from "../types/computeReceipt";

type Props = {
  receipt: ComputeReceipt;
};

function shortId(
  value: string,
  head = 8,
  tail = 6,
): string {
  if (
    !value ||
    value.length <= head + tail + 1
  ) {
    return value;
  }

  return `${value.slice(
    0,
    head,
  )}…${value.slice(-tail)}`;
}

function formatTask(
  task: string,
): string {
  return task
    .replace(/_/g, " ")
    .toUpperCase();
}

function formatResult(
  result: ComputeReceipt["result"],
): string {
  if (Array.isArray(result)) {
    const preview =
      result.length > 8
        ? [
            ...result.slice(0, 8),
            "…",
          ]
        : result;

    return `[${preview.join(", ")}]`;
  }

  return String(result);
}

function settlementLabel(
  settlement:
    | ComputeReceiptSettlement
    | undefined,
): string {
  if (!settlement) {
    return "NOT ANCHORED";
  }

  switch (settlement.status) {
    case "confirmed":
      return "CONFIRMED";

    case "pending":
      return "PENDING";

    case "failed":
      return "FAILED";
  }
}

function settlementTone(
  settlement:
    | ComputeReceiptSettlement
    | undefined,
) {
  if (!settlement) {
    return styles.chainIdle;
  }

  switch (settlement.status) {
    case "confirmed":
      return styles.chainConfirmed;

    case "pending":
      return styles.chainPending;

    case "failed":
      return styles.chainFailed;
  }
}

export function ComputeReceiptCard({
  receipt,
}: Props) {
  const arbitrum =
    receipt.settlements.find(
      (entry) =>
        entry.chain === "arbitrum",
    );

  const solana =
    receipt.settlements.find(
      (entry) =>
        entry.chain === "solana",
    );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            COMPUTE RECEIPT
          </Text>

          <Text style={styles.title}>
            PoUW VERIFIED WORK
          </Text>
        </View>

        <View
          style={[
            styles.verifiedBadge,
            receipt.verified
              ? styles.verifiedBadgeOk
              : styles.verifiedBadgeBad,
          ]}
        >
          <Text
            style={[
              styles.verifiedText,
              receipt.verified
                ? styles.verifiedTextOk
                : styles.verifiedTextBad,
            ]}
          >
            {receipt.verified
              ? "VERIFIED"
              : "UNVERIFIED"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.label}>
          JOB
        </Text>

        <Text style={styles.value}>
          {shortId(receipt.jobId)}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          PROOF
        </Text>

        <Text style={styles.value}>
          {shortId(receipt.proofId)}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          TASK
        </Text>

        <Text style={styles.value}>
          {formatTask(
            receipt.taskType,
          )}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          WORKER
        </Text>

        <Text style={styles.value}>
          {shortId(receipt.worker)}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          RESULT
        </Text>

        <Text
          style={[
            styles.value,
            styles.result,
          ]}
        >
          {formatResult(
            receipt.result,
          )}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          OUTPUT HASH
        </Text>

        <Text style={styles.value}>
          {shortId(
            receipt.outputHash,
          )}
        </Text>
      </View>

      {receipt.score !==
        undefined && (
        <View style={styles.row}>
          <Text style={styles.label}>
            SCORE
          </Text>

          <Text style={styles.value}>
            {receipt.score}
          </Text>
        </View>
      )}

      {receipt.reward !==
        undefined && (
        <View style={styles.row}>
          <Text style={styles.label}>
            REWARD
          </Text>

          <Text style={styles.reward}>
            {receipt.reward} PRISM
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>
        CROSS-CHAIN RECEIPTS
      </Text>

      <View style={styles.chains}>
        <View
          style={[
            styles.chain,
            receipt.verified
              ? styles.chainConfirmed
              : styles.chainFailed,
          ]}
        >
          <Text style={styles.chainName}>
            PRISM
          </Text>

          <Text style={styles.chainStatus}>
            {receipt.verified
              ? "VERIFIED"
              : "UNVERIFIED"}
          </Text>
        </View>

        <View
          style={[
            styles.chain,
            settlementTone(
              arbitrum,
            ),
          ]}
        >
          <Text style={styles.chainName}>
            ARBITRUM
          </Text>

          <Text style={styles.chainStatus}>
            {settlementLabel(
              arbitrum,
            )}
          </Text>
        </View>

        <View
          style={[
            styles.chain,
            settlementTone(
              solana,
            ),
          ]}
        >
          <Text style={styles.chainName}>
            SOLANA
          </Text>

          <Text style={styles.chainStatus}>
            {settlementLabel(
              solana,
            )}
          </Text>
        </View>
      </View>

      <Text style={styles.chainId}>
        {receipt.prismChainId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 18,
    backgroundColor:
      "rgba(10,18,32,0.96)",
    borderWidth: 1,
    borderColor:
      "rgba(105,153,255,0.22)",
  },

  header: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 14,
  },

  eyebrow: {
    color: "#657d9f",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  title: {
    color: "#eef5ff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },

  verifiedBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },

  verifiedBadgeOk: {
    backgroundColor:
      "rgba(73,210,151,0.09)",
    borderColor:
      "rgba(73,210,151,0.35)",
  },

  verifiedBadgeBad: {
    backgroundColor:
      "rgba(255,100,100,0.08)",
    borderColor:
      "rgba(255,100,100,0.3)",
  },

  verifiedText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  verifiedTextOk: {
    color: "#67dca6",
  },

  verifiedTextBad: {
    color: "#ff7e7e",
  },

  divider: {
    height: 1,
    backgroundColor:
      "rgba(125,158,210,0.12)",
    marginVertical: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 10,
  },

  label: {
    color: "#61718a",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  value: {
    flex: 1,
    color: "#cbd9ed",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },

  result: {
    color: "#75aeff",
  },

  reward: {
    color: "#67dca6",
    fontSize: 12,
    fontWeight: "900",
  },

  sectionTitle: {
    color: "#778da9",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  chains: {
    flexDirection: "row",
    gap: 8,
  },

  chain: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
  },

  chainConfirmed: {
    backgroundColor:
      "rgba(73,210,151,0.07)",
    borderColor:
      "rgba(73,210,151,0.25)",
  },

  chainPending: {
    backgroundColor:
      "rgba(255,196,92,0.07)",
    borderColor:
      "rgba(255,196,92,0.25)",
  },

  chainFailed: {
    backgroundColor:
      "rgba(255,100,100,0.07)",
    borderColor:
      "rgba(255,100,100,0.25)",
  },

  chainIdle: {
    backgroundColor:
      "rgba(110,135,170,0.05)",
    borderColor:
      "rgba(110,135,170,0.16)",
  },

  chainName: {
    color: "#dce8fa",
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center",
  },

  chainStatus: {
    color: "#7489a6",
    fontSize: 8,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },

  chainId: {
    color: "#42546c",
    fontSize: 9,
    textAlign: "center",
    marginTop: 14,
  },
});
