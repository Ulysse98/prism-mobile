import {
  Stack,
  router,
} from "expo-router";

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
} from "../components/ComputeReceiptCard";

import {
  createComputeReceipt,
} from "../types/computeReceipt";

/*
 * Static v0.41 preview.
 *
 * These identifiers are demo data only.
 * The next step will replace this object
 * with the real receipt produced after
 * successful PoUW verification.
 */
const demoReceipt =
  createComputeReceipt({
    jobId:
      "demo-job-v041-47e236d5c6a5b4f7",

    proofId:
      "demo-proof-v041-91ab8d02e0af4c77",

    taskType:
      "dot_product",

    requester:
      "Alice",

    worker:
      "prism1-mobile-demo-worker",

    prismChainId:
      "prism-d8c1f3e740b48957",

    result: 320,

    outputHash:
      "demo-output-b8f5bc70cdbda91541d7b36f754d8e09",

    score: 6,

    reward: 25,

    verified: true,

    createdAt:
      "2026-09-23T10:45:00.000Z",

    settlements: [
      {
        chain: "arbitrum",
        status: "confirmed",
        txHash:
          "0xdemo-arbitrum-receipt-v041",
        registryAddress:
          "demo-arbitrum-registry",
      },
      {
        chain: "solana",
        status: "pending",
        txHash:
          "demo-solana-receipt-v041",
        registryAddress:
          "demo-solana-registry",
      },
    ],
  });

export default function ReceiptScreen() {
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

          <View style={styles.demoNotice}>
            <Text
              style={
                styles.demoNoticeTitle
              }
            >
              PREVIEW RECEIPT
            </Text>

            <Text
              style={
                styles.demoNoticeText
              }
            >
              Static sample data for the
              v0.41 mobile receipt UI.
              Network receipts will be
              wired in next.
            </Text>
          </View>

          <ComputeReceiptCard
            receipt={demoReceipt}
          />

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
