import { NativeTabs } from "expo-router/unstable-native-tabs";

const PRISM_BACKGROUND = "#05070c";
const PRISM_SURFACE = "#10192a";
const PRISM_TEXT = "#ffffff";
const PRISM_MUTED = "#657086";

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={PRISM_BACKGROUND}
      indicatorColor={PRISM_SURFACE}
      labelStyle={{
        default: {
          color: PRISM_MUTED,
          fontSize: 11,
          fontWeight: "700",
        },
        selected: {
          color: PRISM_TEXT,
          fontSize: 11,
          fontWeight: "900",
        },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>
          Home
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/home.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mine">
        <NativeTabs.Trigger.Label>
          Mine
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/explore.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>
          Explore
        </NativeTabs.Trigger.Label>

        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/explore.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
