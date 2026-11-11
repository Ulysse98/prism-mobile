/**
 * PRISM v0.70 / phase 2B: display-only color variants for existing screens.
 * Original dark StyleSheet definitions are preserved byte-for-byte within each
 * migrated style object. No network, wallet, PoUW or transaction state here.
 */
import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { PRISM_PALETTES, usePrismAppearance } from "@/theme/prism-appearance";

type NamedPrismStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;
type ColorRole = "color" | "background" | "border" | "other";

type RGB = { r: number; g: number; b: number };

function parseRGB(value: string): RGB | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    return {
      r: Number.parseInt(hex[1].slice(0, 2), 16),
      g: Number.parseInt(hex[1].slice(2, 4), 16),
      b: Number.parseInt(hex[1].slice(4, 6), 16),
    };
  }
  const rgba = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.exec(value);
  if (!rgba) return null;
  const [r, g, b] = rgba.slice(1, 4).map(Number);
  return r <= 255 && g <= 255 && b <= 255 ? { r, g, b } : null;
}

function hueAndSaturation({ r, g, b }: RGB) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const range = max - min;
  const saturation = max === 0 ? 0 : range / max;
  if (range === 0) return { hue: 0, saturation, max };
  let hue = max === r ? (g - b) / range :
    max === g ? 2 + (b - r) / range : 4 + (r - g) / range;
  hue = ((hue * 60) + 360) % 360;
  return { hue, saturation, max };
}

function tintedRole(hue: number): "green" | "gold" | "red" | "purple" | "blue" {
  if (hue >= 75 && hue < 180) return "green";
  if (hue >= 18 && hue < 75) return "gold";
  if (hue < 18 || hue >= 345) return "red";
  if (hue >= 260 && hue < 345) return "purple";
  return "blue";
}

/** Color property only: layout, spacing, sizing and opacity are unchanged. */
function lightColor(value: string, property: string, styleName: string): string {
  const rgb = parseRGB(value);
  if (!rgb) return value;
  const { hue, saturation, max } = hueAndSaturation(rgb);
  const colors = PRISM_PALETTES.light;
  const isTinted = saturation >= 0.3;
  const tone = tintedRole(hue);
  const role: ColorRole = property === "color" ? "color" :
    property === "backgroundColor" ? "background" :
    property.toLowerCase().includes("border") ? "border" : "other";

  if (role === "background") {
    if (/^(safe|container|screen|page)$/i.test(styleName)) return colors.background;
    // Keep bright semantic indicators visible, including green/red badges.
    if (max >= 110 && isTinted) return value;
    if (max >= 24 && isTinted && saturation >= 0.5) {
      return { green: "#E7F6EE", gold: "#FFF4DC", red: "#FFF0F1",
        purple: "#EFE7FB", blue: "#EAF1FC" }[tone];
    }
    if (/card|panel|sheet|wrap|section|hero|list|item/i.test(styleName)) return colors.surface;
    return max >= 32 ? colors.elevated : colors.surface;
  }
  if (role === "border") {
    if (isTinted && max >= 24) {
      return { green: "#ABD9C0", gold: "#E9D09D", red: "#E7BAC2",
        purple: "#CFB6E8", blue: "#B4CDEA" }[tone];
    }
    return colors.border;
  }
  if (role === "color") {
    if (max < 64) return colors.text;
    if (isTinted && saturation >= 0.24) {
      return { green: colors.success, gold: colors.warning, red: colors.danger,
        purple: colors.accent, blue: "#285AA8" }[tone];
    }
    if (max >= 184) return colors.text;
    return colors.muted;
  }
  return colors.border;
}

/** Static stylesheet pairs; one React hook in each consuming component. */
export function createPrismStyleVariants<T extends NamedPrismStyles>(definitions: T) {
  const lightDefinitions = Object.fromEntries(
    Object.entries(definitions).map(([styleName, original]) => {
      const light = { ...original } as Record<string, unknown>;
      for (const [property, value] of Object.entries(light)) {
        if (/^(?:color|.*Color)$/.test(property) && typeof value === "string") {
          light[property] = lightColor(value, property, styleName);
        }
      }
      return [styleName, light];
    }),
  ) as unknown as T;
  return {
    dark: StyleSheet.create(definitions),
    light: StyleSheet.create(lightDefinitions),
  };
}

export function usePrismScreenStyles<T extends NamedPrismStyles>(
  variants: { light: T; dark: T },
): T {
  const { scheme } = usePrismAppearance();
  return variants[scheme];
}
