import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { usePrismAppearance } from "@/theme/prism-appearance";



export default function AppTabs() {
  const { colors, scheme } = usePrismAppearance();

  useEffect(() => {
    StatusBar.setBarStyle(scheme === "dark" ? "light-content" : "dark-content", true);
  }, [scheme]);
  return (
    <NativeTabs
      backgroundColor={colors.navBackground}
      indicatorColor={colors.navIndicator}
      iconColor={{ default: colors.muted, selected: colors.accent }}
      labelStyle={{
        default: {
          color: colors.muted,
          fontSize: 11,
          fontWeight: "700",
        },
        selected: {
          color: colors.accent,
          fontSize: 11,
          fontWeight: "900",
        },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>
          Home
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mine">
        <NativeTabs.Trigger.Label>
          Compute
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon sf="cpu" md="memory" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="wallet">
        <NativeTabs.Trigger.Label>
          Wallet
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon sf="wallet.pass.fill" md="account_balance_wallet" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>
          Explore
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon sf="safari.fill" md="explore" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="appearance">
        <NativeTabs.Trigger.Label>
          Thème
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="moon.stars.fill" md="dark_mode" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
