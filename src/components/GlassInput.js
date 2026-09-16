import React, { useState } from "react";
import { StyleSheet, TextInput, View, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii } from "../theme/colors";

export default function GlassInput({
  icon,
  placeholder,
  secure = false,
  rightChevron = false,
  containerStyle,
  ...textInputProps
}) {
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <BlurView intensity={40} tint="light" style={styles.blur}>
        <View style={styles.inner}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={colors.primaryDark}
              style={styles.icon}
            />
          ) : null}

          <TextInput
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            secureTextEntry={hidden}
            style={styles.input}
            {...textInputProps}
          />

          {secure && (
            <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
              <Ionicons
                name={hidden ? "eye-outline" : "eye-off-outline"}
                size={19}
                color={colors.inkSoft}
              />
            </Pressable>
          )}

          {rightChevron && (
            <Ionicons name="chevron-down" size={18} color={colors.inkSoft} />
          )}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.pill,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  blur: {
    backgroundColor: colors.glassFill,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  icon: {
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontSize: 15.5,
    color: colors.ink,
  },
});
