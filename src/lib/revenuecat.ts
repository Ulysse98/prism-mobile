import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const googleApiKey =
  process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?.trim();

const testApiKey =
  process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?.trim();

export async function configureRevenueCat() {
  if (Platform.OS !== 'android') {
    return;
  }

  const apiKey = __DEV__ ? testApiKey : googleApiKey;

  if (!apiKey) {
    console.warn(
      `[RevenueCat] Missing ${
        __DEV__ ? 'Test Store' : 'Google Play'
      } API key.`
    );
    return;
  }

  const isConfigured = await Purchases.isConfigured();

  if (isConfigured) {
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({
    apiKey,
  });

  console.log(
    `[RevenueCat] SDK configured with ${
      __DEV__ ? 'Test Store' : 'Google Play'
    }.`
  );
}