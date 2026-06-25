import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const { width: W } = Dimensions.get("window");
const ONBOARDING_KEY = "@thinkai_onboarded_v1";

interface Slide {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  bullets?: { icon: string; text: string; color: string }[];
}

const SLIDES: Slide[] = [
  {
    id: "welcome",
    icon: "cpu",
    iconColor: "#7B61FF",
    title: "Welcome to Thinker AI",
    subtitle: "Your autonomous AI operating system that plans, researches, builds, and reviews — all on its own.",
    bullets: [
      { icon: "zap", text: "Understands your real goal, not just the words", color: "#7B61FF" },
      { icon: "layers", text: "12 specialized agents work together", color: "#3B9EFF" },
      { icon: "shield", text: "Built-in quality review on every output", color: "#10B981" },
    ],
  },
  {
    id: "agents",
    icon: "users",
    iconColor: "#3B9EFF",
    title: "Meet Your Agent Fleet",
    subtitle: "Each task is handled by the right specialist. You talk to one interface — 12 agents work behind the scenes.",
    bullets: [
      { icon: "compass", text: "Intent Agent — understands what you really want", color: "#7B61FF" },
      { icon: "trending-up", text: "Strategy Agent — validates your idea first", color: "#F59E0B" },
      { icon: "map", text: "Planner Agent — creates a step-by-step blueprint", color: "#10B981" },
      { icon: "code", text: "Builder Agent — writes production-ready code", color: "#3B9EFF" },
      { icon: "award", text: "Judge Agent — scores output quality 0–100", color: "#EC4899" },
    ],
  },
  {
    id: "thinking",
    icon: "layers",
    iconColor: "#F59E0B",
    title: "Choose Your Thinking Level",
    subtitle: "Control how deep Thinker AI goes. Simple questions get instant answers. Big projects get the full treatment.",
    bullets: [
      { icon: "zap", text: "Low — instant answer, 1 credit", color: "#10B981" },
      { icon: "cpu", text: "Medium — analysis + research, 9 credits", color: "#F59E0B" },
      { icon: "layers", text: "High — full 12-agent pipeline, 66 credits", color: "#7B61FF" },
      { icon: "users", text: "Consensus — multi-model vote, 75 credits", color: "#EC4899" },
    ],
  },
  {
    id: "language",
    icon: "globe",
    iconColor: "#10B981",
    title: "Works in Your Language",
    subtitle: "Write in Bengali, Arabic, Chinese, Hindi, Spanish, or any language. Thinker AI detects it automatically and responds in kind.",
    bullets: [
      { icon: "message-circle", text: "বাংলায় লিখুন — বাংলায় উত্তর পাবেন", color: "#10B981" },
      { icon: "message-circle", text: "اكتب بالعربية — والرد بالعربية", color: "#3B9EFF" },
      { icon: "message-circle", text: "用中文写 — 用中文回复", color: "#F59E0B" },
    ],
  },
  {
    id: "start",
    icon: "play-circle",
    iconColor: "#7B61FF",
    title: "Ready to Think",
    subtitle: "Describe any project, ask any question, or pick a quick action. Your first 50 credits are free.",
    bullets: [
      { icon: "check", text: "No setup required", color: "#10B981" },
      { icon: "check", text: "50 free credits to start", color: "#10B981" },
      { icon: "check", text: "Upgrade anytime for more power", color: "#10B981" },
    ],
  },
];

function SlideItem({ slide, colors }: { slide: Slide; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.slide, { width: W }]}>
      {/* Big icon */}
      <View style={[styles.slideIconWrap, { backgroundColor: slide.iconColor + "18" }]}>
        <Feather name={slide.icon as any} size={48} color={slide.iconColor} />
      </View>

      <Text style={[styles.slideTitle, { color: colors.text }]}>{slide.title}</Text>
      <Text style={[styles.slideSubtitle, { color: colors.textSecondary }]}>{slide.subtitle}</Text>

      {slide.bullets && (
        <View style={styles.bullets}>
          {slide.bullets.map((b, i) => (
            <View key={i} style={[styles.bulletRow, { backgroundColor: b.color + "10", borderColor: b.color + "25" }]}>
              <View style={[styles.bulletIcon, { backgroundColor: b.color + "20" }]}>
                <Feather name={b.icon as any} size={14} color={b.color} />
              </View>
              <Text style={[styles.bulletText, { color: colors.text }]}>{b.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [current, setCurrent] = useState(0);

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  }

  function next() {
    if (current < SLIDES.length - 1) {
      const nextIdx = current + 1;
      flatRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setCurrent(nextIdx);
    } else {
      finish();
    }
  }

  function skip() {
    finish();
  }

  const isLast = current === SLIDES.length - 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + 16 + (Platform.OS === "web" ? 67 : 0) }]}
          onPress={skip}
          activeOpacity={0.75}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        renderItem={({ item }) => <SlideItem slide={item} colors={colors} />}
        contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 32 }}
      />

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * W, i * W, (i + 1) * W];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [6, 20, 6],
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
          onPress={next}
          activeOpacity={0.85}
        >
          {isLast ? (
            <>
              <Feather name="play" size={18} color="#fff" />
              <Text style={styles.ctaText}>Start thinking</Text>
            </>
          ) : (
            <>
              <Text style={styles.ctaText}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        {/* Step counter */}
        <Text style={[styles.stepText, { color: colors.textTertiary }]}>
          {current + 1} of {SLIDES.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skipBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  slide: {
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  slideIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 32,
  },
  slideSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  bullets: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  bulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bulletText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
  bottom: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  stepText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
