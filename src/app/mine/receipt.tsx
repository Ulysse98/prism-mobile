import {
  Stack,
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  useMemo,
} from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  ComputeReceiptCard,
} from "../../components/ComputeReceiptCard";

import type {
  ComputeReceipt,
} from "../../types/computeReceipt";

function parseReceipt(
  raw: string | undefined,
): ComputeReceipt | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(raw) as Partial<ComputeReceipt>;

    if (
      parsed.version !== 1 ||
      typeof parsed.jobId !== "string" ||
      typeof parsed.proofId !== "string" ||
      typeof parsed.worker !== "string" ||
      typeof parsed.prismChainId !== "string" ||
      typeof parsed.outputHash !== "string" ||
      parsed.verified !== true
    ) {
      return null;
    }

    return parsed as ComputeReceipt;
  } catch {
    return null;
  }
}

export default function ReceiptScreen() {
  const params =
    useLocalSearchParams<{
      receipt?: string;
    }>();

  const receipt = useMemo(
    () => parseReceipt(params.receipt),
    [params.receipt],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <SafeAreaView
        style={styles.safeArea}
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={() =>
                router.back()
              }
              style={({ pressed }) => [
                styles.backButton,
                pressed &&
                  styles.backButtonPressed,
              ]}
            >
              <Text
                style={
                  styles.backButtonText
                }
              >
                ←
              </Text>
            </Pressable>

            <View
              style={
                styles.headingBlock
              }
            >
              <Text
                style={
                  styles.protocolLabel
                }
              >
                PRISM MOBILE · v0.41
              </Text>

              <Text style={styles.heading}>
                Compute Receipt
              </Text>
            </View>
          </View>
          {receipt ? (
            <>
              <View style={styles.demoNotice}>
                <Text
                  style={
                    styles.demoNoticeTitle
                  }
                >
                  LIVE COMPUTE RECEIPT
                </Text>

                <Text
                  style={
                    styles.demoNoticeText
                  }
                >
                  Verified by the Prism node.
                  External settlement status is
                  shown below.
                </Text>
              </View>

              <ComputeReceiptCard
                receipt={receipt}
              />
            </>
          ) : (
            <View style={styles.demoNotice}>
              <Text
                style={
                  styles.demoNoticeTitle
                }
              >
                RECEIPT UNAVAILABLE
              </Text>

              <Text
                style={
                  styles.demoNoticeText
                }
              >
                Return to Mine and submit a
                verified PoUW proof.
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text
              style={
                styles.footerTitle
              }
            >
              PROOF → RECEIPT → SETTLEMENT
            </Text>

            <Text
              style={
                styles.footerText
              }
            >
              Prism verifies the useful
              computation first. External
              chains anchor the resulting
              compute receipt.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#050a12",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 40,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(95,137,205,0.08)",
    borderWidth: 1,
    borderColor:
      "rgba(105,153,255,0.16)",
  },

  backButtonPressed: {
    opacity: 0.65,
  },

  backButtonText: {
    color: "#8bbaff",
    fontSize: 22,
    fontWeight: "700",
  },

  headingBlock: {
    marginLeft: 14,
  },

  protocolLabel: {
    color: "#536d91",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  heading: {
    color: "#eef5ff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 3,
  },

  demoNotice: {
    borderRadius: 13,
    padding: 13,
    marginBottom: 14,
    backgroundColor:
      "rgba(91,142,221,0.06)",
    borderWidth: 1,
    borderColor:
      "rgba(91,142,221,0.16)",
  },

  demoNoticeTitle: {
    color: "#78aef9",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  demoNoticeText: {
    color: "#71859f",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  footer: {
    marginTop: 18,
    paddingHorizontal: 8,
  },

  footerTitle: {
    color: "#526985",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
    textAlign: "center",
  },

  footerText: {
    color: "#455a74",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 7,
  },
});
