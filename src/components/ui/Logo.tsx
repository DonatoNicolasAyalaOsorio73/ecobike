import React from "react";
import { Image, StyleSheet } from "react-native";

const LOGO = require("../../../assets/logo.png");

export default function Logo({ size = "large" }: { size?: "large" | "small" }) {
  const dimension = size === "large" ? 168 : 96;
  return (
    <Image
      source={LOGO}
      style={[styles.image, { width: dimension, height: dimension }]}
      resizeMode="contain"
      accessibilityLabel="EcoBike"
    />
  );
}

const styles = StyleSheet.create({
  image: {},
});
