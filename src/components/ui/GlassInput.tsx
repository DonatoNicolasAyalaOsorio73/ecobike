import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";

interface Props extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  rightChevron?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  errorText?: string | null;
}

export default function GlassInput({
  icon,
  secure = false,
  rightChevron = false,
  containerStyle,
  errorText,
  ...textInputProps
}: Props) {
  const { colors, radii } = useTheme();
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={containerStyle}>
      <GlassSurface
        radius={radii.pill}
        intensity={40}
        specular={false}
        borderColor={errorText ? colors.danger : colors.glassBorderSoft}
        style={styles.wrap}
      >
        <View style={styles.inner}>
          {icon ? <Ionicons name={icon} size={18} color={colors.primaryDark} /> : null}

          <TextInput
            placeholderTextColor={colors.placeholder}
            secureTextEntry={hidden}
            style={[styles.input, { color: colors.ink }]}
            {...textInputProps}
          />

          {secure && (
            <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
              <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={19} color={colors.inkSoft} />
            </Pressable>
          )}

          {rightChevron && <Ionicons name="chevron-down" size={18} color={colors.inkSoft} />}
        </View>
      </GlassSurface>
      {errorText ? <Text style={[styles.error, { color: colors.danger }]}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  inner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, gap: 10 },
  input: { flex: 1, fontSize: 15.5 },
  error: { fontSize: 12.5, marginTop: -8, marginBottom: 10, marginLeft: 18, fontWeight: "600" },
});
