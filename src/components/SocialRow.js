import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { AntDesign, FontAwesome } from "@expo/vector-icons";
import { colors } from "../theme/colors";

function SocialCircle({ children, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.circleWrap, pressed && { opacity: 0.8 }]}
    >
      <BlurView intensity={45} tint="light" style={styles.circleInner}>
        {children}
      </BlurView>
    </Pressable>
  );
}

export default function SocialRow({ onGoogle, onApple, onFacebook }) {
  return (
    <View>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>O continúa con</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.row}>
        <SocialCircle onPress={onGoogle}>
          <AntDesign name="google" size={20} color="#EA4335" />
        </SocialCircle>
        <SocialCircle onPress={onApple}>
          <AntDesign name="apple1" size={22} color="#111111" />
        </SocialCircle>
        <SocialCircle onPress={onFacebook}>
          <FontAwesome name="facebook" size={20} color="#1877F2" />
        </SocialCircle>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    color: colors.inkFaint,
    fontSize: 12.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  circleWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  circleInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glassFillStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
