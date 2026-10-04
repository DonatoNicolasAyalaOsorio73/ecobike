import React from "react";
import { router } from "expo-router";
import { captureError } from "@/services/monitoring";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort catch for render/lifecycle errors anywhere below it (a
 * malformed Firestore doc, a null field a screen didn't expect, etc.) —
 * without this, any of those white-screen the whole app instead of leaving
 * a way back in. Only class components can implement componentDidCatch,
 * so the actual themed UI lives in the function component below it.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    captureError(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe}>
        <GlassCard style={{ alignItems: "center", padding: 28 }}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
          <Text style={[styles.title, { color: colors.ink }]}>Algo salió mal</Text>
          <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
            Encontramos un error inesperado. Tus recorridos y datos guardados están a salvo.
          </Text>
          <GlassButton label="Reintentar" icon="refresh" variant="primary" onPress={onRetry} style={{ marginTop: 20, alignSelf: "stretch" }} />
          <GlassButton
            label="Ir al inicio"
            icon="home-outline"
            variant="secondary"
            onPress={() => {
              router.replace("/");
              onRetry();
            }}
            style={{ marginTop: 10, alignSelf: "stretch" }}
          />
        </GlassCard>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 18, fontWeight: "700", marginTop: 14, textAlign: "center" },
  subtitle: { fontSize: 13.5, marginTop: 8, textAlign: "center", lineHeight: 19 },
});
