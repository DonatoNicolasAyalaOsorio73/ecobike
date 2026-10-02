import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

// Nothing else owns the bare "/" route since neither (auth) nor (tabs) has a
// literal index.tsx — Stack.Protected swaps which GROUP is mounted based on
// auth status, but something still has to own "/" itself to bootstrap that.
export default function Index() {
  const status = useAuthStore((s) => s.status);
  return <Redirect href={status === "signedOut" ? "/(auth)/welcome" : "/(tabs)/home"} />;
}
