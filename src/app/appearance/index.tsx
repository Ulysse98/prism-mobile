import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  usePrismAppearance,
  type PrismThemePreference,
} from "@/theme/prism-appearance";

const OPTIONS: { value: PrismThemePreference; title: string; description: string; symbol: string }[] = [
  { value: "system", title: "Système", description: "Suit le réglage Android", symbol: "◐" },
  { value: "light", title: "Jour", description: "Thème clair", symbol: "☀" },
  { value: "dark", title: "Nuit", description: "Thème sombre", symbol: "☾" },
];

export default function AppearanceScreen() {
  const { preference, scheme, colors, setPreference } = usePrismAppearance();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PRISM MOBILE · V0.70</Text>
        <Text style={styles.heading}>Apparence</Text>
        <Text style={styles.subtitle}>Personnalise l’affichage de l’application.</Text>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Mode d’affichage</Text>
          {OPTIONS.map((option) => {
            const selected = preference === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setPreference(option.value)}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.selectedOption,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.symbol}>{option.symbol}</Text>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.description}</Text>
                </View>
                <Text style={styles.selection}>{selected ? "●" : "○"}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.preview}>
          <Text style={styles.eyebrow}>APERÇU</Text>
          <Text style={styles.previewTitle}>{scheme === "dark" ? "Mode nuit" : "Mode jour"}</Text>
          <Text style={styles.previewSubtitle}>
            Fond, cartes, texte et navigation suivent les couleurs PRISM.
          </Text>
          <View style={styles.previewRow}>
            <View style={styles.miniCard}>
              <Text style={styles.miniValue}>0 PRSM</Text>
              <Text style={styles.miniLabel}>SOLDE DE TEST</Text>
            </View>
            <View style={styles.miniCard}>
              <Text style={styles.success}>● NŒUD VALIDE</Text>
              <Text style={styles.miniLabel}>DEVNET ISOLÉ</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Ce réglage ne modifie ni les clés Ed25519, ni le réseau, ni les transferts.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type Palette = ReturnType<typeof usePrismAppearance>["colors"];

function makeStyles(c: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100, gap: 16 },
    eyebrow: { color: c.accent, fontSize: 11, letterSpacing: 2, fontWeight: "800" },
    heading: { color: c.text, fontSize: 35, letterSpacing: -0.9, fontWeight: "900" },
    subtitle: { color: c.muted, fontSize: 13, marginTop: -10 },
    panel: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 20, padding: 14, gap: 8 },
    panelTitle: { color: c.text, fontWeight: "800", fontSize: 15, margin: 5, marginBottom: 10 },
    option: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: c.border, borderRadius: 14, backgroundColor: c.surface, padding: 14 },
    selectedOption: { borderColor: c.accent, backgroundColor: c.accentSoft },
    pressed: { opacity: 0.7 },
    symbol: { width: 28, textAlign: "center", fontSize: 24, color: c.accent },
    optionCopy: { flex: 1 },
    optionTitle: { color: c.text, fontSize: 14, fontWeight: "800" },
    optionSubtitle: { color: c.muted, fontSize: 11, marginTop: 4 },
    selection: { color: c.accent, fontSize: 18 },
    preview: { backgroundColor: c.elevated, borderColor: c.border, borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 },
    previewTitle: { color: c.text, fontSize: 23, fontWeight: "900" },
    previewSubtitle: { color: c.muted, fontSize: 12 },
    previewRow: { flexDirection: "row", gap: 9, marginTop: 4 },
    miniCard: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, gap: 6, minHeight: 72 },
    miniValue: { color: c.accent, fontSize: 16, fontWeight: "900" },
    miniLabel: { color: c.muted, fontSize: 9, fontWeight: "700" },
    success: { color: c.success, fontSize: 11, fontWeight: "800" },
    footer: { color: c.muted, lineHeight: 17, fontSize: 11, textAlign: "center", marginTop: 10 },
  });
}
