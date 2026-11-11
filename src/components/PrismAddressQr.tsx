import { useMemo } from "react";
import { Text, View } from "react-native";
import { createPublicAddressQr } from "@/utils/prism-qr";
import { usePrismAppearance } from "@/theme/prism-appearance";

type Props = {
  address: string;
};

/** Local-only QR view: encodes the public address, not a transaction or private key. */
export function PrismAddressQr({ address }: Props) {
  const { colors } = usePrismAppearance();
  const matrix = useMemo(() => createPublicAddressQr(address), [address]);
  if (!matrix) {
    return <Text style={{ color: colors.muted, textAlign: "center" }}>QR indisponible pour cette adresse.</Text>;
  }
  const cell = 5;
  return (
    <View
      accessibilityLabel="QR de l'adresse publique PRISM"
      accessibilityRole="image"
      style={{ alignSelf: "center", padding: cell * 4, backgroundColor: "#FFFFFF", borderRadius: 14 }}
    >
      {matrix.map((row, y) => (
        <View key={y} style={{ flexDirection: "row", height: cell }}>
          {row.map((dark, x) => (
            <View
              key={x}
              style={{ width: cell, height: cell, backgroundColor: dark ? "#101018" : "#FFFFFF" }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
