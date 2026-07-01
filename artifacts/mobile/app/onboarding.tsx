import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const { width: W } = Dimensions.get("window");
const ONBOARDING_KEY = "@thinkai_onboarded_v1";

const TEAL = "#0B6E69";
const TEAL_LIGHT = "#14B8A6";

interface Slide {
  id: string;
  type?: "plan_picker" | "default";
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle: string;
  bullets?: { icon: string; text: string; color: string }[];
}

const SLIDES: Slide[] = [
  {
    id: "welcome",
    icon: "cpu",
    iconColor: TEAL,
    title: "Welcome to Thinker AI",
    subtitle: "Thinker AI thinks before it builds. Many specialized agents collaborate, debate, verify, and deliver one trusted outcome.",
    bullets: [
      { icon: "zap", text: "Understands your real goal, not just the words", color: TEAL },
      { icon: "layers", text: "13 specialized agents work together", color: TEAL_LIGHT },
      { icon: "shield", text: "Built-in quality review on every output", color: "#10B981" },
    ],
  },
  {
    id: "plan_picker",
    type: "plan_picker",
    title: "Choose your plan",
    subtitle: "Start free and upgrade anytime.",
  },
  {
    id: "thinking",
    icon: "layers",
    iconColor: TEAL_LIGHT,
    title: "Choose Your Thinking Level",
    subtitle: "Control how deep Thinker AI goes. Simple questions get instant answers. Big projects get the full treatment.",
    bullets: [
      { icon: "zap", text: "Low — instant answer, 1 credit", color: "#10B981" },
      { icon: "cpu", text: "Medium — analysis + research, ~9 credits", color: TEAL_LIGHT },
      { icon: "layers", text: "High — full 13-agent pipeline, ~66 credits", color: TEAL },
      { icon: "users", text: "Consensus — multi-model vote, ~75 credits", color: "#8B5CF6" },
    ],
  },
  {
    id: "language",
    icon: "globe",
    iconColor: "#10B981",
    title: "Works in Your Language",
    subtitle: "Write in Bengali, Arabic, Chinese, Hindi, Spanish, or any language. Thinker AI detects it automatically.",
    bullets: [
      { icon: "message-circle", text: "বাংলায় লিখুন — বাংলায় উত্তর পাবেন", color: "#10B981" },
      { icon: "message-circle", text: "اكتب بالعربية — والرد بالعربية", color: TEAL_LIGHT },
      { icon: "message-circle", text: "用中文写 — 用中文回复", color: TEAL },
    ],
  },
  {
    id: "start",
    icon: "play-circle",
    iconColor: TEAL,
    title: "Ready to Think",
    subtitle: "Describe any project, ask any question. Your first 50 credits are free — no setup required.",
    bullets: [
      { icon: "check", text: "No setup required", color: "#10B981" },
      { icon: "check", text: "50 free Think Credits to start", color: "#10B981" },
      { icon: "check", text: "Upgrade anytime for more power", color: "#10B981" },
    ],
  },
];

const PLANS = [
  {
    id: "free",
    name: "Free Trial",
    price: "$0",
    period: "",
    credits: "50 credits",
    creditSub: "one-time, never refills",
    color: "#475569",
    features: ["Direct chat", "Basic clarification", "Planner Agent", "3 version saves"],
    cta: "Start free",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "/month",
    credits: "1,500 credits",
    creditSub: "per month",
    color: TEAL,
    features: ["All Free features", "Strategy Agent", "Smart clarification", "Design Agent", "10 version saves"],
    cta: "Choose Pro",
    highlight: true,
  },
  {
    id: "founder",
    name: "Founder",
    price: "$59",
    period: "/month",
    credits: "5,000 credits",
    creditSub: "per month",
    color: "#8B5CF6",
    features: ["All Pro features", "Consensus Agent", "Decision Memory", "Priority queue", "25 version saves", "API access"],
    cta: "Choose Founder",
    highlight: false,
  },
];

function PlanPickerSlide({
  colors,
  selectedPlan,
  onSelect,
}: {
  colors: ReturnType<typeof useColors>;
  selectedPlan: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={[planStyles.root, { width: W }]}>
      <Text style={[planStyles.title, { color: colors.text }]}>Choose your plan</Text>
      <Text style={[planStyles.sub, { color: colors.textSecondary }]}>
        Start free and upgrade anytime.
      </Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={planStyles.cards}
      >
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                planStyles.card,
                {
                  backgroundColor: isSelected ? plan.color + "15" : colors.card,
                  borderColor: isSelected ? plan.color : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => onSelect(plan.id)}
              activeOpacity={0.8}
            >
              {/* Name + price */}
              <View style={planStyles.cardHeader}>
                <View style={planStyles.nameRow}>
                  {isSelected && (
                    <View style={[planStyles.selectedDot, { backgroundColor: plan.color }]} />
                  )}
                  <Text style={[planStyles.planName, { color: colors.text }]}>{plan.name}</Text>
                  {plan.highlight && (
                    <View style={[planStyles.popularBadge, { backgroundColor: TEAL + "25" }]}>
                      <Text style={[planStyles.popularText, { color: TEAL }]}>Most popular</Text>
                    </View>
                  )}
                </View>
                <View style={planStyles.priceRow}>
                  <Text style={[planStyles.price, { color: plan.color }]}>{plan.price}</Text>
                  <Text style={[planStyles.period, { color: colors.textSecondary }]}>{plan.period}</Text>
                </View>
              </View>

              {/* Credits */}
              <View style={[planStyles.creditRow, { backgroundColor: plan.color + "12", borderColor: plan.color + "25" }]}>
                <Feather name="zap" size={12} color={plan.color} />
                <Text style={[planStyles.creditText, { color: plan.color }]}>
                  {plan.credits}
                </Text>
                <Text style={[planStyles.creditSub, { color: colors.textSecondary }]}>
                  {plan.creditSub}
                </Text>
              </View>

              {/* Features */}
              <View style={planStyles.features}>
                {plan.features.map((f, i) => (
                  <View key={i} style={planStyles.featureRow}>
                    <Feather name="check" size={12} color={plan.color} />
                    <Text style={[planStyles.featureText, { color: colors.textSecondary }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const planStyles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 4,
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  cards: {
    gap: 12,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  planName: {
    fontSize: 16,
    fontWeight: "700",
  },
  popularBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  popularText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
  },
  period: {
    fontSize: 13,
  },
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  creditText: {
    fontSize: 12,
    fontWeight: "700",
  },
  creditSub: {
    fontSize: 11,
  },
  features: {
    gap: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    flex: 1,
  },
});

function SlideItem({ slide, colors, selectedPlan, onSelectPlan }: {
  slide: Slide;
  colors: ReturnType<typeof useColors>;
  selectedPlan: string;
  onSelectPlan: (id: string) => void;
}) {
  if (slide.type === "plan_picker") {
    return <PlanPickerSlide colors={colors} selectedPlan={selectedPlan} onSelect={onSelectPlan} />;
  }

  return (
    <View style={[styles.slide, { width: W }]}>
      <View style={[styles.slideIconWrap, { backgroundColor: (slide.iconColor ?? TEAL) + "18" }]}>
        <Feather name={slide.icon as any} size={48} color={slide.iconColor ?? TEAL} />
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
  const [selectedPlan, setSelectedPlan] = useState("free");

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
  const isPlanPicker = SLIDES[current].type === "plan_picker";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {!isLast && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + 16 + (Platform.OS === "web" ? 67 : 0) }]}
          onPress={skip}
          activeOpacity={0.75}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}

      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        renderItem={({ item }) => (
          <SlideItem
            slide={item}
            colors={colors}
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
          />
        )}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 32,
        }}
      />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
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
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.primary }]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
          onPress={next}
          activeOpacity={0.85}
        >
          {isLast ? (
            <>
              <Feather name="play" size={18} color="#F9FAFB" />
              <Text style={styles.ctaText}>Start thinking</Text>
            </>
          ) : isPlanPicker ? (
            <>
              <Text style={styles.ctaText}>
                {selectedPlan === "free" ? "Continue with Free Trial" : `Continue with ${PLANS.find(p => p.id === selectedPlan)?.name}`}
              </Text>
              <Feather name="arrow-right" size={18} color="#F9FAFB" />
            </>
          ) : (
            <>
              <Text style={styles.ctaText}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#F9FAFB" />
            </>
          )}
        </TouchableOpacity>

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
  skipText: { fontSize: 14, fontWeight: "600" },
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
  bullets: { width: "100%", gap: 10, marginTop: 8 },
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
  bulletText: { fontSize: 13, fontWeight: "500", flex: 1, lineHeight: 18 },
  bottom: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  dots: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: { color: "#F9FAFB", fontSize: 16, fontWeight: "700" },
  stepText: { fontSize: 12, fontWeight: "500" },
});
