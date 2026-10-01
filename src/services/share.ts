import { Platform, Share } from "react-native";

/** Native share sheet; on web uses the Web Share API or falls back to the clipboard. Returns "copied" when it only copied. */
export async function shareText(message: string): Promise<"shared" | "copied" | "dismissed"> {
  if (Platform.OS === "web") {
    const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
    if (nav?.share) {
      try {
        await nav.share({ text: message });
        return "shared";
      } catch {
        return "dismissed";
      }
    }
    await nav?.clipboard?.writeText(message);
    return "copied";
  }
  const res = await Share.share({ message });
  return res.action === Share.sharedAction ? "shared" : "dismissed";
}
