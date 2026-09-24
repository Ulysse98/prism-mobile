import {
  useState,
} from "react";

import {
  Pressable,
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
    value.length <= head + tail + 3
  ) {
    return value;
  }

  return `${value.slice(
    0,
    head,
  )}...${value.slice(-tail)}`;
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
            "...",
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
    return "Not anchored yet";
  }

  switch (settlement.status) {
    case "confirmed":
      return "Anchored";

    case "pending":
      return "Anchoring...";

    case "failed":
      return "Anchor failed";
  }
}

function settlementSymbol(
  settlement:
    | ComputeReceiptSettlement
    | undefined,
): string {
  if (!settlement) {
    return "\u25CB";
  }

  switch (settlement.status) {
    case "confirmed":
      return "\u2713";

    case "pending":
      return "\u25CB";

    case "failed":
      return "\u2715";
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
  const [
    showTechnicalDetails,
    setShowTechnicalDetails,
  ] = useState(false);

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
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          COMPUTE RECEIPT
        </Text>

        <Text
          style={[
            styles.heroTitle,
            !receipt.verified &&
              styles.heroTitleFailed,
          ]}
        >
          {receipt.verified
            ? "\u2713 COMPUTE VERIFIED"
            : "\u2715 VERIFICATION FAILED"}
        </Text>

        <Text style={styles.heroText}>
          {receipt.verified
            ? "Your useful work was verified by the Prism network."
            : "Prism could not verify this computation."}
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            TASK
          </Text>

          <Text style={styles.summaryValue}>
            {formatTask(
              receipt.taskType,
            )}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            RESULT
          </Text>

          <Text
            style={[
              styles.summaryValue,
              styles.result,
            ]}
          >
            {formatResult(
              receipt.result,
            )}
          </Text>
        </View>

        {receipt.reward !==
          undefined && (
          <View style={styles.summaryRow}>
            <Text
              style={styles.summaryLabel}
            >
              REWARD
            </Text>

            <Text style={styles.reward}>
              +{receipt.reward} PRISM
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>
        PRISM VERIFICATION
      </Text>

      <View
        style={[
          styles.verificationRow,
          receipt.verified
            ? styles.chainConfirmed
            : styles.chainFailed,
        ]}
      >
        <Text style={styles.statusSymbol}>
          {receipt.verified
            ? "\u2713"
            : "\u2715"}
        </Text>

        <View style={styles.statusCopy}>
          <Text style={styles.chainName}>
            Prism Network
          </Text>

          <Text style={styles.chainStatus}>
            {receipt.verified
              ? "Computation verified"
              : "Verification failed"}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.sectionTitle,
          styles.externalSectionTitle,
        ]}
      >
        EXTERNAL SETTLEMENT
      </Text>

      <View
        style={[
          styles.verificationRow,
          settlementTone(
            arbitrum,
          ),
        ]}
      >
        <Text style={styles.statusSymbol}>
          {settlementSymbol(
            arbitrum,
          )}
        </Text>

        <View style={styles.statusCopy}>
          <Text style={styles.chainName}>
            Arbitrum
          </Text>

          <Text style={styles.chainStatus}>
            {settlementLabel(
              arbitrum,
            )}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.verificationRow,
          settlementTone(
            solana,
          ),
        ]}
      >
        <Text style={styles.statusSymbol}>
          {settlementSymbol(
            solana,
          )}
        </Text>

        <View style={styles.statusCopy}>
          <Text style={styles.chainName}>
            Solana
          </Text>

          <Text style={styles.chainStatus}>
            {settlementLabel(
              solana,
            )}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() =>
          setShowTechnicalDetails(
            (value) => !value,
          )
        }
        style={({ pressed }) => [
          styles.detailsButton,
          pressed &&
            styles.detailsButtonPressed,
        ]}
      >
        <Text
          style={styles.detailsButtonText}
        >
          {showTechnicalDetails
            ? "Hide technical details"
            : "View technical details"}
        </Text>

        <Text
          style={styles.detailsChevron}
        >
          {showTechnicalDetails
            ? "\u2191"
            : "\u2193"}
        </Text>
      </Pressable>

      {showTechnicalDetails && (
        <View
          style={
            styles.technicalDetails
          }
        >
          <Text
            style={styles.sectionTitle}
          >
            TECHNICAL DETAILS
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>
              JOB ID
            </Text>

            <Text style={styles.value}>
              {shortId(
                receipt.jobId,
              )}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              PROOF ID
            </Text>

            <Text style={styles.value}>
              {shortId(
                receipt.proofId,
              )}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              WORKER
            </Text>

            <Text style={styles.value}>
              {shortId(
                receipt.worker,
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

          {receipt.crossChainReceipt && (
            <View style={styles.row}>
              <Text style={styles.label}>
                REGISTRY ID
              </Text>

              <Text
                style={styles.value}
              >
                {shortId(
                  receipt
                    .crossChainReceipt
                    .registryId,
                  10,
                  8,
                )}
              </Text>
            </View>
          )}

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

          {arbitrum?.txHash && (
            <View style={styles.row}>
              <Text style={styles.label}>
                ARBITRUM TX
              </Text>

              <Text style={styles.value}>
                {shortId(
                  arbitrum.txHash,
                  10,
                  8,
                )}
              </Text>
            </View>
          )}

          {arbitrum?.blockNumber !==
            undefined && (
            <View style={styles.row}>
              <Text style={styles.label}>
                ARBITRUM BLOCK
              </Text>

              <Text style={styles.value}>
                {arbitrum.blockNumber}
              </Text>
            </View>
          )}

          {solana?.txHash && (
            <View style={styles.row}>
              <Text style={styles.label}>
                SOLANA TX
              </Text>

              <Text style={styles.value}>
                {shortId(
                  solana.txHash,
                  10,
                  8,
                )}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>
              PRISM CHAIN
            </Text>

            <Text style={styles.value}>
              {receipt.prismChainId}
            </Text>
          </View>
        </View>
      )}
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

  hero: {
    alignItems: "center",
    paddingVertical: 8,
  },

  eyebrow: {
    color: "#657d9f",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  heroTitle: {
    color: "#67dca6",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center",
  },

  heroTitleFailed: {
    color: "#ff7e7e",
  },

  heroText: {
    color: "#71859f",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
    textAlign: "center",
  },

  summary: {
    marginTop: 18,
    borderRadius: 13,
    padding: 14,
    backgroundColor:
      "rgba(91,142,221,0.05)",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 16,
    marginVertical: 5,
  },

  summaryLabel: {
    color: "#61718a",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  summaryValue: {
    flex: 1,
    color: "#dce8fa",
    fontSize: 12,
    fontWeight: "800",
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

  divider: {
    height: 1,
    backgroundColor:
      "rgba(125,158,210,0.12)",
    marginVertical: 18,
  },

  sectionTitle: {
    color: "#778da9",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  externalSectionTitle: {
    marginTop: 14,
  },

  verificationRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 8,
  },

  statusSymbol: {
    width: 26,
    color: "#dce8fa",
    fontSize: 17,
    fontWeight: "900",
  },

  statusCopy: {
    flex: 1,
  },

  chainName: {
    color: "#dce8fa",
    fontSize: 11,
    fontWeight: "900",
  },

  chainStatus: {
    color: "#7489a6",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 3,
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

  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginTop: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor:
      "rgba(105,153,255,0.16)",
    backgroundColor:
      "rgba(95,137,205,0.06)",
    paddingHorizontal: 13,
    paddingVertical: 11,
  },

  detailsButtonPressed: {
    opacity: 0.65,
  },

  detailsButtonText: {
    color: "#8bbaff",
    fontSize: 10,
    fontWeight: "800",
  },

  detailsChevron: {
    color: "#8bbaff",
    fontSize: 14,
    fontWeight: "900",
  },

  technicalDetails: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor:
      "rgba(125,158,210,0.12)",
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
    fontSize: 10,
    fontWeight: "700",
    textAlign: "right",
  },
});
