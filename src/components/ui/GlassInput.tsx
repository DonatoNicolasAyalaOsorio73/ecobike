import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";

interface Props extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  rightChevron?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  errorText?: string | null;
  /** Small label shown above the field. */
  label?: string;
  /** Extra content on the right (status icon, counter...). */
  right?: React.ReactNode;
  /** Helper text under the field when there's no error. */
  hint?: string | null;
}

export default function GlassInput({
  icon,
  secure = false,
  rightChevron = false,
  containerStyle,
  errorText,
  label,
  right,
  hint,
  onFocus,
  onBlur,
  ...textInputProps
}: Props) {
  const { colors, radii } = useTheme();
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);
  const shake = useSharedValue(0);
  const prevError = useRef<string | null | undefined>(errorText);

  // A new error shakes the field once (Duolingo's "wrong answer" nudge).
  useEffect(() => {
    if (errorText && errorText !== prevError.current) {
      shake.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 50 })
      );
    }
    prevError.current = errorText;
  }, [errorText, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const border = errorText ? colors.danger : focused ? colors.primaryDark : colors.glassBorderSoft;

  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, { color: colors.inkSoft }]}>{label}</Text> : null}
      <Animated.View style={shakeStyle}>
        <GlassSurface radius={radii.pill} intensity={40} specular={false} borderColor={border} style={[styles.wrap, { borderWidth: focused || errorText ? 2 : 1 }]}>
          <View style={styles.inner}>
            {icon ? <Ionicons name={icon} size={18} color={errorText ? colors.danger : colors.primaryDark} /> : null}

            <TextInput
              placeholderTextColor={colors.placeholder}
              secureTextEntry={hidden}
              style={[styles.input, { color: colors.ink }]}
              accessibilityLabel={textInputProps.accessibilityLabel ?? label ?? (textInputProps.placeholder as string | undefined)}
              onFocus={(e) => {
                setFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setFocused(false);
                onBlur?.(e);
              }}
              {...textInputProps}
            />

            {right}
            {secure && (
              <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityRole="button" accessibilityLabel={hidden ? "Mostrar contraseña" : "Ocultar contraseña"}>
                <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={19} color={colors.inkSoft} />
              </Pressable>
            )}
            {rightChevron && <Ionicons name="chevron-down" size={18} color={colors.inkSoft} />}
          </View>
        </GlassSurface>
      </Animated.View>
      {errorText ? (
        <Text style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {errorText}
        </Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: colors.inkFaint }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12.5, fontWeight: "700", marginBottom: 6, marginLeft: 6 },
  wrap: { marginBottom: 12 },
  inner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, gap: 10 },
  input: { flex: 1, fontSize: 15.5, minWidth: 0 },
  error: { fontSize: 12.5, marginTop: -8, marginBottom: 10, marginLeft: 18, fontWeight: "700" },
  hint: { fontSize: 12, marginTop: -8, marginBottom: 10, marginLeft: 18 },
});
