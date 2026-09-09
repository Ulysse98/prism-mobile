import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import { configureRevenueCat } from '@/lib/revenuecat';

const PRO_ENTITLEMENT = 'pro';
const PRO_OFFERING = 'default';

export default function PrismProButton() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refreshProStatus() {
    if (Platform.OS !== 'android') {
      return;
    }

    await configureRevenueCat();

    const configured = await Purchases.isConfigured();

    if (!configured) {
      return;
    }

    const customerInfo = await Purchases.getCustomerInfo();

    setIsPro(
      Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT])
    );
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshProStatus().catch((error) => {
        console.warn('[RevenueCat] Unable to read Pro status:', error);
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
          'Prism Pro',
          'RevenueCat is not configured for this build.'
        );
        return;
      }

      const offerings = await Purchases.getOfferings();

      const offering =
        offerings.all[PRO_OFFERING] ?? offerings.current;

      if (!offering) {
        Alert.alert(
          'Prism Pro',
          'The Prism Pro offering is not available yet.'
        );
        return;
      }

      await RevenueCatUI.presentPaywallIfNeeded({
        offering,
        requiredEntitlementIdentifier: PRO_ENTITLEMENT,
      });

      const customerInfo = await Purchases.getCustomerInfo();

      const unlocked = Boolean(
        customerInfo.entitlements.active[PRO_ENTITLEMENT]
      );

      setIsPro(unlocked);

      if (unlocked) {
        Alert.alert(
          'Prism Pro unlocked',
          'Advanced Prism features are now available.'
        );
      }
    } catch (error) {
      console.error('[RevenueCat] Prism Pro error:', error);

      Alert.alert(
        'Prism Pro',
        error instanceof Error
          ? error.message
          : 'Unable to open Prism Pro.'
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
        styles.button,
        isPro && styles.buttonActive,
        pressed && !isPro && styles.buttonPressed,
      ]}
    >
      <View>
        <Text style={styles.title}>
          {isPro ? 'PRISM PRO ACTIVE' : 'PRISM PRO'}
        </Text>

        <Text style={styles.subtitle}>
          {isPro
            ? 'Advanced network access unlocked'
            : 'Advanced analytics · 7-day free trial'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text style={styles.action}>
          {isPro ? '✓' : 'OPEN →'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#10182a',
    borderWidth: 1,
    borderColor: '#6f64ff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  buttonActive: {
    borderColor: '#45e391',
    backgroundColor: '#0b281b',
  },

  buttonPressed: {
    opacity: 0.8,
  },

  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  subtitle: {
    color: '#8190a6',
    fontSize: 11,
    marginTop: 4,
  },

  action: {
    color: '#8ea7ff',
    fontSize: 12,
    fontWeight: '900',
  },
});