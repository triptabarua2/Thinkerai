import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BlurView } from "expo-blur";
import { ProfileSheet } from "@/components/ProfileSheet";
import { Sidebar } from "@/components/Sidebar";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useApp } from "@/context/AppContext";
import { AGENT_LIST, type AgentType } from "@/lib/agents";
import { AGENTS } from "@/lib/agents";
import { useColors } from "@/hooks/useColors";

const QUICK_ACTIONS: {
  id: string;
  label: string;
  icon: string;
  agentType: AgentType;
  desc: string;
}[] = [
  { id: "research", label: "Research", icon: "search", agentType: "research", desc: "Deep research" },
  { id: "code", label: "Code", icon: "code", agentType: "coding", desc: "Build software" },
  { id: "create", label: "Create", icon: "edit-3", agentType: "report", desc: "Write content" },
  { id: "analyze", label: "Analyze", icon: "bar-chart-2", agentType: "report", desc: "Data insights" },
  { id: "automate", label: "Automate", icon: "zap", agentType: "automation", desc: "Build workflows" },
  { id: "plan", label: "Plan", icon: "map", agentType: "planner", desc: "Strategy & goals" },
];

const ONBOARDING_KEY = "@thinkai_onboarded_v1";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const {
    createConversation,
    sidebarOpen,
    setSidebarOpen,
    profileSheetOpen,
    setProfileSheetOpen,
  } = useApp();
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("coding");
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"agent" | "upgrade">("agent");

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (!val) router.replace("/onboarding" as any);
    });
  }, []);

  async function handleQuickAction(agentType: AgentType) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const agent = AGENTS[agentType];
    const id = await createConversation(`${agent.name} Session`, agentType);
    router.push(`/chat/${id}` as any);
  }

  async function handleNewChat() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = await createConversation("New Chat");
    router.push(`/chat/${id}` as any);
  }

  async function handleStartChat(text: string) {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = await createConversation("New Chat");
    router.push(`/chat/${id}?q=${encodeURIComponent(text.trim())}` as any);
  }

  // Carousel
  const hPad = 16;
  const cGap = 10;
  const visibleW = W - hPad * 2;
  const cardW = (visibleW - 2 * cGap) / 3;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const [carouselBase, setCarouselBase] = useState(0);
  const animating = useRef(false);

  // 5-card strip: [base-1, base, base+1(CENTER), base+2, base+3]
  // Strip rests at -(cardW+cGap) so base-1 is off-screen left, base+3 off-screen right
  // slideAnim: 0=rest, +1=forward(left), -1=backward(right)
  const stripX = slideAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, -(cardW + cGap), -2 * (cardW + cGap)],
  });
  // Per-position (0–4) scale and opacity for slideAnim ∈ [-1, 0, 1]
  const scaleByPos = [
    slideAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.85, 0.85, 0.85] }),
    slideAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [1,    0.85, 0.85] }),
    slideAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.85, 1,    0.85] }),
    slideAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.85, 0.85, 1   ] }),
    slideAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.85, 0.85, 0.85] }),
  ];
  const opacityByPos = [
    slideAnim.interpolate({ inputRange: [-1, -0.3, 0, 1], outputRange: [1, 0, 0, 0], extrapolate: "clamp" }),
    slideAnim.interpolate({ inputRange: [-1,  0,   0.4, 1], outputRange: [1, 1, 0, 0], extrapolate: "clamp" }),
    slideAnim.interpolate({ inputRange: [-1,  0,   1  ], outputRange: [1, 1, 1], extrapolate: "clamp" }),
    slideAnim.interpolate({ inputRange: [-1, -0.4, 0,  1], outputRange: [0, 0, 1, 1], extrapolate: "clamp" }),
    slideAnim.interpolate({ inputRange: [-1,  0,   0.3, 1], outputRange: [0, 0, 0, 1], extrapolate: "clamp" }),
  ];

  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function runSlide(direction: 1 | -1) {
    if (animating.current) return;
    animating.current = true;
    Animated.timing(slideAnim, {
      toValue: direction,
      duration: 520,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      slideAnim.setValue(0);
      setCarouselBase((prev) =>
        (prev + direction + QUICK_ACTIONS.length) % QUICK_ACTIONS.length
      );
      animating.current = false;
    });
  }

  function advanceCarousel() { runSlide(1); }

  function resetAutoTimer() {
    if (autoTimer.current) clearInterval(autoTimer.current);
    autoTimer.current = setInterval(advanceCarousel, 2800);
  }

  useEffect(() => {
    autoTimer.current = setInterval(advanceCarousel, 2800);
    return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
  }, []);

  // Swipe pan responder
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          resetAutoTimer();
          runSlide(1);
        } else if (g.dx > 40) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          resetAutoTimer();
          runSlide(-1);
        }
      },
    })
  ).current;

  // Header sits right at safe-area top
  const HEADER_TOP = insets.top + 12;
  const HEADER_H = HEADER_TOP + 44 + 12;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Fixed Header — absolute overlay, doesn't affect flex layout */}
      <BlurView
        intensity={60}
        tint={colors.background === "#F0FAFA" ? "light" : "dark"}
        style={[
          styles.fixedHeader,
          {
            paddingTop: HEADER_TOP,
            backgroundColor: colors.background + "CC",
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setSidebarOpen(true)}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Feather name="menu" size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Segmented pill — Agent | Upgrade */}
        <View style={[styles.segmentWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.segment, activeTab === "agent" && { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("agent");
              setAgentPickerOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, { color: activeTab === "agent" ? "#fff" : colors.textSecondary }]}>
              Agent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segment, activeTab === "upgrade" && { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("upgrade");
              setUpgradeModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, { color: activeTab === "upgrade" ? "#fff" : colors.textSecondary }]}>
              Upgrade
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleNewChat}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Feather name="edit" size={20} color={colors.text} />
        </TouchableOpacity>
      </BlurView>

      {/* Scrollable content area — takes all remaining flex space */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.content, { paddingTop: HEADER_H + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {"What can I\nachieve for you?"}
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Plan, research, code, create — autonomously
          </Text>
        </View>

        {/* Quick Actions Carousel */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>QUICK ACTIONS</Text>
        <View style={{ width: visibleW, overflow: "hidden" }} {...panResponder.panHandlers}>
          <Animated.View style={{ flexDirection: "row", gap: cGap, transform: [{ translateX: stripX }] }}>
            {[-1, 0, 1, 2, 3].map((offset, pos) => {
              const idx = ((carouselBase + offset) % QUICK_ACTIONS.length + QUICK_ACTIONS.length) % QUICK_ACTIONS.length;
              const action = QUICK_ACTIONS[idx];
              const agent = AGENTS[action.agentType];
              const isCenter = offset === 1;

              return (
                <Animated.View
                  key={`${carouselBase}-${pos}`}
                  style={{
                    width: cardW,
                    opacity: opacityByPos[pos],
                    transform: [{ scale: scaleByPos[pos] as any }],
                    alignSelf: "flex-end",
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.carouselCard,
                      {
                        height: isCenter ? 178 : 134,
                        backgroundColor: isCenter ? colors.primary : colors.card,
                        borderColor: isCenter ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleQuickAction(action.agentType)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.carouselIcon, { backgroundColor: isCenter ? "rgba(255,255,255,0.18)" : agent.color + "22" }]}>
                      <Feather name={action.icon as any} size={isCenter ? 22 : 18} color={isCenter ? "#fff" : agent.color} />
                    </View>
                    <Text style={[styles.carouselLabel, { color: isCenter ? "#fff" : colors.text, fontSize: isCenter ? 15 : 13 }]}>
                      {action.label}
                    </Text>
                    <Text style={[styles.carouselDesc, { color: isCenter ? "rgba(255,255,255,0.72)" : colors.textTertiary, fontSize: isCenter ? 12 : 10 }]} numberOfLines={2}>
                      {action.desc}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.View>
        </View>

        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {QUICK_ACTIONS.map((_, i) => {
            const centerIdx = ((carouselBase + 1) % QUICK_ACTIONS.length + QUICK_ACTIONS.length) % QUICK_ACTIONS.length;
            const isActive = i === centerIdx;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  const diff = i - centerIdx;
                  if (diff === 0) return;
                  resetAutoTimer();
                  const steps = ((diff % QUICK_ACTIONS.length) + QUICK_ACTIONS.length) % QUICK_ACTIONS.length;
                  const shortSteps = steps <= QUICK_ACTIONS.length / 2 ? steps : steps - QUICK_ACTIONS.length;
                  runSlide(shortSteps > 0 ? 1 : -1);
                }}
                hitSlop={8}
              >
                <View style={[styles.dot, { backgroundColor: isActive ? colors.primary : colors.border, width: isActive ? 16 : 6 }]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Chat Bar — flex child, NOT absolute, so keyboard pushes it up */}
      <HomeChatBar
        colors={colors}
        insets={insets}
        onSend={handleStartChat}
        onProfile={() => { if (!profileSheetOpen) setProfileSheetOpen(true); }}
      />

      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ProfileSheet visible={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} />
      <UpgradeModal
        visible={upgradeModalOpen}
        onClose={() => {
          setUpgradeModalOpen(false);
          setActiveTab("agent");
        }}
      />

      {/* Agent Picker Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={agentPickerOpen}
        onRequestClose={() => setAgentPickerOpen(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.agentOverlay}
          activeOpacity={1}
          onPress={() => setAgentPickerOpen(false)}
        />
        <View style={[styles.agentSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.agentHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.agentSheetTitle, { color: colors.text }]}>Choose Agent</Text>
          <FlatList
            data={AGENT_LIST}
            keyExtractor={(item) => item.type}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => {
              const isSelected = selectedAgent === item.type;
              return (
                <TouchableOpacity
                  style={[
                    styles.agentRow,
                    {
                      backgroundColor: isSelected ? colors.primary + "12" : "transparent",
                      borderColor: isSelected ? colors.primary + "40" : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedAgent(item.type);
                    setAgentPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.agentRowIcon, { backgroundColor: item.color + "18" }]}>
                    <Feather name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.agentRowName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.agentRowDesc, { color: colors.textTertiary }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.agentCheck, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function HomeChatBar({
  colors,
  insets,
  onSend,
  onProfile,
}: {
  colors: ReturnType<typeof useColors>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  onSend: (text: string) => void;
  onProfile: () => void;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const profileAnim = useRef(new Animated.Value(1)).current;
  const canSend = text.trim().length > 0;

  function animateProfile(val: number) {
    Animated.timing(profileAnim, {
      toValue: val,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }

  function handleFocus() {
    setFocused(true);
    animateProfile(0);
  }

  function handleBlur() {
    setFocused(false);
    animateProfile(1);
  }

  function handleSend() {
    if (!canSend) return;
    const msg = text.trim();
    setText("");
    onSend(msg);
  }

  const borderColor = focused ? colors.primary + "90" : colors.border;

  const profileOpacity = profileAnim;
  const profileWidth = profileAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 44] });
  const profileMargin = profileAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });

  return (
    <View
      style={[
        barStyles.wrap,
        {
          paddingBottom: insets.bottom + 8,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      {/* Profile icon — fades/slides away on focus */}
      <Animated.View style={{ width: profileWidth, opacity: profileOpacity, marginRight: profileMargin, overflow: "hidden" }}>
        <TouchableOpacity
          style={[barStyles.profileBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onProfile}
          activeOpacity={0.75}
        >
          <Feather name="user" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Message box — always expanded */}
      <View
        style={[
          barStyles.inputWrap,
          { backgroundColor: colors.card, borderColor, borderWidth: 1.5 },
        ]}
      >
        <TextInput
          style={[barStyles.input, { color: colors.text, outlineStyle: "none" } as any]}
          value={text}
          onChangeText={setText}
          placeholder="Ask Thinker AI anything..."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={2000}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          returnKeyType="send"
        />
        {canSend && (
          <TouchableOpacity
            style={[barStyles.sendBtn, { backgroundColor: colors.primary }]}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            <Feather name="arrow-up" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    minHeight: 52,
    maxHeight: 130,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 2,
    paddingBottom: 2,
    minHeight: 32,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollArea: { flex: 1 },
  content: { paddingHorizontal: 16, flexGrow: 1 },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  segmentWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600" as const,
    letterSpacing: -0.1,
  },
  agentOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  agentSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: "70%",
  },
  agentHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  agentSheetTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  agentRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  agentRowName: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  agentRowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  agentCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  carouselCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    justifyContent: "space-between",
    gap: 8,
  },
  carouselIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  carouselLabel: {
    fontWeight: "700" as const,
    letterSpacing: -0.2,
  },
  carouselDesc: {
    lineHeight: 14,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  hero: { marginBottom: 28 },
  heroTitle: {
    fontSize: 32,
    fontWeight: "700" as const,
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
});
