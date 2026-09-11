import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";

import { configureRevenueCat } from "@/lib/revenuecat";

const PRO_ENTITLEMENT = "pro";
const PRO_OFFERING = "default";

export default function PrismProButton() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refreshProStatus() {
    if (Platform.OS !== "android") {
      return;
    }

    await configureRevenueCat();

    const configured = await Purchases.isConfigured();

    if (!configured) {
      return;
    }

    const customerInfo = await Purchases.getCustomerInfo();

    setIsPro(
      Boolean(
        customerInfo.entitlements.active[PRO_ENTITLEMENT],
      ),
    );
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshProStatus().catch((error) => {
        console.warn(
          "[RevenueCat] Unable to read Pro status:",
          error,
        );
      });
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  async function openPrismPro() {
    if (loading || isPro) {
      return;
    }

    try {
      setLoading(true);

      await configureRevenueCat();

      const configured = await Purchases.isConfigured();

      if (!configured) {
        Alert.alert(
          "Prism Pro",
          "RevenueCat is not configured for this build.",
        );
        return;
      }

      const offerings = await Purchases.getOfferings();

      const offering =
        offerings.all[PRO_OFFERING] ?? offerings.current;

      if (!offering) {
        Alert.alert(
          "Prism Pro",
          "The Prism Pro offering is not available yet.",
        );
        return;
      }

      await RevenueCatUI.presentPaywallIfNeeded({
        offering,
        requiredEntitlementIdentifier: PRO_ENTITLEMENT,
      });

      const customerInfo =
        await Purchases.getCustomerInfo();

      const unlocked = Boolean(
        customerInfo.entitlements.active[
          PRO_ENTITLEMENT
        ],
      );

      setIsPro(unlocked);

      if (unlocked) {
        Alert.alert(
          "Prism Pro unlocked",
          "Advanced Prism features are now available.",
        );
      }
    } catch (error) {
      console.error(
        "[RevenueCat] Prism Pro error:",
        error,
      );

      Alert.alert(
        "Prism Pro",
        error instanceof Error
          ? error.message
          : "Unable to open Prism Pro.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      onPress={() => void openPrismPro()}
      disabled={loading || isPro}
      style={({ pressed }) => [
        styles.container,
        isPro && styles.containerActive,
        pressed && !isPro && styles.pressed,
      ]}
    >
      <View style={styles.left}>
        <View style={styles.topLine}>
          <Text style={styles.brand}>
            PRISM PRO
          </Text>

          <View
            style={[
              styles.badge,
              isPro && styles.badgeActive,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isPro && styles.badgeTextActive,
              ]}
            >
              {isPro ? "ACTIVE" : "PRO"}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>
          {isPro
            ? "Advanced analytics unlocked"
            : "Advanced analytics"}
        </Text>

        <Text style={styles.subtitle}>
          {isPro
            ? "Premium Prism features enabled"
            : "7-day free trial · Test Store"}
        </Text>
      </View>

      <View style={styles.action}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#9aa9ff"
          />
        ) : (
          <Text
            style={[
              styles.actionText,
              isPro && styles.actionTextActive,
            ]}
          >
            {isPro ? "✓" : "OPEN →"}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 92,
    backgroundColor: "#0d1321",
    borderWidth: 1,
    borderColor: "#3d3c77",
    borderRadius: 18,
    paddingHorizontal: 17,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  containerActive: {
    backgroundColor: "#0b1d17",
    borderColor: "#245f46",
  },

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },

  left: {
    flex: 1,
  },

  topLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  brand: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  badge: {
    backgroundColor: "#191c3d",
    borderWidth: 1,
    borderColor: "#44488a",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  badgeActive: {
    backgroundColor: "#0d2a1d",
    borderColor: "#266344",
  },

  badgeText: {
    color: "#a9afff",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  badgeTextActive: {
    color: "#72e8a8",
  },

  title: {
    color: "#e8ebf4",
    fontSize: 15,
    fontWeight: "800",
  },

  subtitle: {
    color: "#728097",
    fontSize: 10,
    marginTop: 4,
  },

  action: {
    minWidth: 70,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: "#151a30",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  actionText: {
    color: "#9aa9ff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  actionTextActive: {
    color: "#72e8a8",
  },
});