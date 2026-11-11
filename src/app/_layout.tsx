import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { configureRevenueCat } from '@/lib/revenuecat';
import { PrismAppearanceProvider, usePrismAppearance } from '@/theme/prism-appearance';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  useEffect(() => {
    configureRevenueCat().catch((error) => {
      console.error('[RevenueCat] Configuration failed:', error);
    });
  }, []);

  return (
    <PrismAppearanceProvider>
      <PrismThemedNavigation />
    </PrismAppearanceProvider>
  );
}

function PrismThemedNavigation() {
  const { scheme, colors } = usePrismAppearance();
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [scheme, colors]);

  return (
    <ThemeProvider value={navigationTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
