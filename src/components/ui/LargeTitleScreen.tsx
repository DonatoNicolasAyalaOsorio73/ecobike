import React, { useMemo, useRef, useState, type ReactElement } from "react";
import { StyleSheet, Text, View, type RefreshControlProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import BackgroundBlobs from "./BackgroundBlobs";
import GlassSurface from "./GlassSurface";
import { ScrollRevealContext } from "./Reveal";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { CONTENT_MAX_WIDTH, useLayout } from "@/hooks/useLayout";

const NAV_H = 44;

interface TitleOptions {
  title: string;
  /** Small line above the large title (date, greeting, context). */
  eyebrow?: string;
  /** Leading nav-bar control (a back button on pushed-style screens). */
  leading?: React.ReactNode;
  /** Trailing nav-bar controls (icon buttons, avatar). Always visible. */
  trailing?: React.ReactNode;
  /** Sits right of the large title (e.g. a "sample data" pill). */
  titleAccessory?: React.ReactNode;
  /** Optional: receives the scroll offset so content can do scroll-linked effects (parallax). */
  scrollY?: SharedValue<number>;
  /** False on pushed/modal screens that have no tab bar under them. */
  tabBar?: boolean;
}

/**
 * The iOS 26 large-title behavior as a hook, so ScrollViews and virtualized
 * lists (FlatList/SectionList) share one implementation:
 *  - `header`: the large title, rendered as the first thing in the content
 *  - `navBar`: overlay whose glass + compact title fade in as the large
 *    title scrolls under it; leading/trailing controls always on top
 *  - `onScroll` / `contentContainerStyle`: wire into the scroller
 * All scroll-linked styles run on the UI thread (no re-renders while scrolling).
 */
export function useLargeTitle({ title, eyebrow, leading, trailing, titleAccessory, scrollY, tabBar = true }: TitleOptions) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { desktop, bottomInset } = useLayout();
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  const top = desktop ? 12 : insets.top;

  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
    if (scrollY) scrollY.value = e.contentOffset.y;
  });

  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [18, 52], [0, 1], Extrapolation.CLAMP),
  }));
  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [36, 60], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(y.value, [36, 60], [6, 0], Extrapolation.CLAMP) }],
  }));
  const largeTitleStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const s = interpolate(y.value, [-140, 0], [1.1, 1], Extrapolation.CLAMP);
    // Scale from the leading edge, as UIKit does.
    return { transform: [{ translateX: (s - 1) * 120 }, { scale: s }] };
  });

  const header = (
    <View style={styles.titleBlock}>
      {eyebrow ? <Text style={[type.eyebrow, { color: colors.inkSoft }]}>{eyebrow}</Text> : null}
      <View style={styles.titleRow}>
        <Animated.Text style={[type.largeTitle, { color: colors.ink, flexShrink: 1 }, largeTitleStyle]} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Animated.Text>
        {titleAccessory}
      </View>
    </View>
  );

  const navBar = (
    <View style={[styles.nav, { height: top + NAV_H }, { pointerEvents: "box-none" }]}>
      <Animated.View style={[StyleSheet.absoluteFill, barStyle, { pointerEvents: "none" }]}>
        <GlassSurface radius={0} intensity={60} specular={false} backgroundColor="rgba(255,255,255,0.55)" borderColor="transparent" style={StyleSheet.absoluteFill} />
        <View style={[styles.hairline, { backgroundColor: colors.divider }]} />
      </Animated.View>
      <View style={[styles.navRow, { marginTop: top }, styles.column, { pointerEvents: "box-none" }]}>
        <Animated.Text style={[type.headline, styles.compactTitle, { color: colors.ink }, compactTitleStyle]} numberOfLines={1} aria-hidden>
          {title}
        </Animated.Text>
        <View style={styles.slot}>{leading}</View>
        <View style={styles.slot}>{trailing}</View>
      </View>
    </View>
  );

  const contentContainerStyle: ViewStyle = { paddingTop: top + NAV_H, paddingBottom: tabBar ? bottomInset : insets.bottom + 32 };

  return { onScroll, scrollOffset: y, header, navBar, contentContainerStyle, showsVerticalScrollIndicator: desktop };
}

interface Props extends TitleOptions {
  refreshControl?: ReactElement<RefreshControlProps>;
  /** Horizontal 20pt gutter around children. Off for full-bleed carousels. */
  padded?: boolean;
  children: React.ReactNode;
}

/** ScrollView screen built on useLargeTitle (every top-level screen uses it). */
export default function LargeTitleScreen({ refreshControl, padded = true, children, ...titleOptions }: Props) {
  const lt = useLargeTitle(titleOptions);
  // Scroll-reveal context: cards inside measure themselves against the
  // content and animate in as they cross the bottom of the viewport.
  const viewportH = useSharedValue(0);
  const contentRef = useRef<View>(null);
  const [version, setVersion] = useState(0);
  const reveal = useMemo(() => ({ scrollY: lt.scrollOffset, viewportH, contentRef, version }), [lt.scrollOffset, viewportH, version]);
  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <Animated.ScrollView
        onScroll={lt.onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        // iOS: the keyboard pushes the content up so inputs low on long forms
        // (admin reasons, profile fields) stay visible. Android resizes the window itself.
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={lt.showsVerticalScrollIndicator}
        refreshControl={refreshControl}
        contentContainerStyle={lt.contentContainerStyle}
        onLayout={(e) => (viewportH.value = e.nativeEvent.layout.height)}
        onContentSizeChange={() => setVersion((v) => v + 1)}
      >
        <ScrollRevealContext.Provider value={reveal}>
          <View ref={contentRef} style={styles.column}>
            {lt.header}
            <View style={padded ? styles.pad : null}>{children}</View>
          </View>
        </ScrollRevealContext.Provider>
      </Animated.ScrollView>
      {lt.navBar}
    </View>
  );
}

/** Readable centered column; also used by list screens for their content. */
export const columnStyle = { width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" } as const;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: columnStyle,
  titleBlock: { paddingHorizontal: 20, paddingBottom: 16, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pad: { paddingHorizontal: 20 },
  nav: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  hairline: { position: "absolute", left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  navRow: { height: NAV_H, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  compactTitle: { position: "absolute", left: 72, right: 72, textAlign: "center", pointerEvents: "none" },
  slot: { flexDirection: "row", alignItems: "center", gap: 10 },
});
