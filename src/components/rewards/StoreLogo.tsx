import React, { useState } from "react";
import { Image, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { storeInitials } from "@/utils/rewardsMapping";

// Shadow that follows the logo's own shape (transparent PNG) instead of a box.
const STAMP_SHADOW = Platform.OS === "web" ? ({ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))" } as object) : null;

/**
 * A store's logo as a stamp: whole, no box. A missing or broken logo becomes
 * a monogram of the store's initials, so every reward always has an image.
 */
export default function StoreLogo({ uri, name, size, style }: { uri?: string; name: string; size: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const [broken, setBroken] = useState<string | null>(null);
  const ok = !!uri && uri.startsWith("https://") && broken !== uri;
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      {ok ? (
        <Image source={{ uri }} style={[{ width: size, height: size }, STAMP_SHADOW]} resizeMode="contain" onError={() => setBroken(uri!)} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.mono, { width: size * 0.82, height: size * 0.82, borderRadius: size * 0.41, backgroundColor: colors.chipFill }]} accessible={false}>
          <Text style={{ color: colors.ink, fontSize: size * 0.32, fontWeight: "800", letterSpacing: -0.5 }} numberOfLines={1}>
            {storeInitials(name)}
          </Text>
        </View>
      )}
    </View>
  );
}

/** A user's profile photo, or the same monogram fallback store logos use. */
export function Avatar({ name, photo, size = 44 }: { name: string; photo: string | null; size?: number }) {
  const [broken, setBroken] = useState<string | null>(null);
  return photo?.startsWith("https://") && broken !== photo ? (
    <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} onError={() => setBroken(photo)} accessibilityIgnoresInvertColors />
  ) : (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <StoreLogo name={name} size={size / 0.82} />
    </View>
  );
}

const styles = StyleSheet.create({ mono: { alignItems: "center", justifyContent: "center" } });
