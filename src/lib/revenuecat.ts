import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const googleApiKey =
  process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY;

export async function configureRevenueCat() {
  // Shipaton build is Android-first.
  if (Platform.OS !== 'android') {
    return;
  }

  if (!googleApiKey) {
    console.warn(
      '[RevenueCat] EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY is not configured.'
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
    apiKey: googleApiKey,
  });

  console.log('[RevenueCat] SDK configured');
}
