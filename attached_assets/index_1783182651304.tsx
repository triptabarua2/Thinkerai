import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
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
import { AGENT_LIST, AGENTS, type AgentType } from "@/lib/agents";
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
  const PLAN_TIER: string = "free";
  const userCanUsePro = PLAN_TIER === "pro" || PLAN_TIER === "founder";
  const PRO_TEAL = "#0D9488";

  const [selectedAgent, setSelectedAgent] = useState<AgentType>("coding");
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"agent" | "upgrade">("agent");

  useEffect(() => {
    AsyncStorage.setItem(ONBOARDING_KEY, "true");
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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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

      <View style={[styles.content, { flex: 1, paddingTop: HEADER_H + 16 }]}>
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
        <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 24 }]}>QUICK ACTIONS</Text>
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
      </View>

      {/* Bottom Chat Bar — tracks keyboard height itself; rest of screen stays fixed */}
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
          <View style={styles.agentSheetHeaderRow}>
            <Text style={[styles.agentSheetTitle, { color: colors.text }]}>Choose Agent</Text>
            {!userCanUsePro && (
              <TouchableOpacity
                style={[styles.proUnlockBadge, { backgroundColor: PRO_TEAL + "15", borderColor: PRO_TEAL + "40" }]}
                onPress={() => { setAgentPickerOpen(false); setUpgradeModalOpen(true); }}
                activeOpacity={0.8}
              >
                <Feather name="lock" size={10} color={PRO_TEAL} />
                <Text style={[styles.proUnlockText, { color: PRO_TEAL }]}>8 Pro agents locked</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={AGENT_LIST}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            maxToRenderPerBatch={10}
            windowSize={8}
            initialNumToRender={12}
            removeClippedSubviews={Platform.OS !== "web"}
            renderItem={({ item }) => {
              const isSelected = selectedAgent === item.id;
              const isPro = item.planTier === "pro";
              const locked = isPro && !userCanUsePro;
              return (
                <TouchableOpacity
                  style={[
                    styles.agentRow,
                    {
                      backgroundColor: isSelected
                        ? colors.primary + "12"
                        : locked
                        ? PRO_TEAL + "06"
                        : "transparent",
                      borderColor: isSelected
                        ? colors.primary + "40"
                        : locked
                        ? PRO_TEAL + "30"
                        : colors.border,
                      opacity: locked ? 0.75 : 1,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (locked) {
                      setAgentPickerOpen(false);
                      setUpgradeModalOpen(true);
                      return;
                    }
                    setSelectedAgent(item.id);
                    setAgentPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.agentRowIcon, { backgroundColor: item.color + "18" }]}>
                    <Feather name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.agentRowName, { color: locked ? colors.textSecondary : colors.text }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.agentRowDesc, { color: colors.textTertiary }]} numberOfLines={1}>
                      {item.capability}
                    </Text>
                  </View>
                  {isSelected && !locked && (
                    <View style={[styles.agentCheck, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  )}
                  {isPro && (
                    <View style={[styles.agentProBadge, { backgroundColor: PRO_TEAL + "18", borderColor: PRO_TEAL + "45" }]}>
                      {locked
                        ? <Feather name="lock" size={10} color={PRO_TEAL} />
                        : <Feather name="check-circle" size={10} color={PRO_TEAL} />
                      }
                      <Text style={[styles.agentProText, { color: PRO_TEAL }]}>PRO</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const INPUT_MIN_H = 46;
const INPUT_MAX_H = 130;

// Platform-safe floating shadows
const floatShadow = Platform.select({
  web: { boxShadow: "0 4px 12px rgba(0,0,0,0.12)" },
  default: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
});

const floatShadowLg = Platform.select({
  web: { boxShadow: "0 6px 20px rgba(0,0,0,0.13)" },
  default: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 8,
  },
});

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
  const [inputH, setInputH] = useState(INPUT_MIN_H);
  const heightAnim = useRef(new Animated.Value(INPUT_MIN_H)).current;
  const profileAnim = useRef(new Animated.Value(1)).current;
  const kbOffset = useRef(new Animated.Value(0)).current;
  const canSend = text.trim().length > 0;

  // Track the keyboard's own height and animate ONLY this bar above it.
  // The rest of the screen (header, carousel) never moves.
  useEffect(() => {
    if (Platform.OS === "web") return; // browser keeps position:fixed above the keyboard natively

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const kbHeight = e.endCoordinates?.height ?? 0;
      Animated.timing(kbOffset, {
        toValue: kbHeight,
        duration: Platform.OS === "ios" ? (e.duration ?? 250) : 200,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(kbOffset, {
        toValue: 0,
        duration: Platform.OS === "ios" ? (e.duration ?? 250) : 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Animate height with spring whenever inputH changes
  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: inputH,
      useNativeDriver: false,
      damping: 22,
      stiffness: 280,
      mass: 0.7,
    }).start();
  }, [inputH]);

  // Shrink back to minimum when text is fully cleared
  useEffect(() => {
    if (text === "") setInputH(INPUT_MIN_H);
  }, [text]);

  function animateProfile(val: number) {
    Animated.timing(profileAnim, {
      toValue: val,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }

  function handleFocus() { setFocused(true); animateProfile(0); }
  function handleBlur()  { setFocused(false); animateProfile(1); }

  function handleSend() {
    if (!canSend) return;
    const msg = text.trim();
    setText("");
    setInputH(INPUT_MIN_H);
    onSend(msg);
  }

  function handleContentSizeChange(e: any) {
    const h = e.nativeEvent.contentSize.height;
    const target = Math.min(Math.max(h, INPUT_MIN_H), INPUT_MAX_H);
    if (Math.abs(target - inputH) > 0.5) setInputH(target);
  }

  const borderColor = focused ? colors.primary + "90" : colors.border;
  const profileOpacity = profileAnim;
  const profileWidth  = profileAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 44] });
  const profileMargin = profileAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });
  const atMax = inputH >= INPUT_MAX_H;

  // Web:    position:fixed — browser keeps bar above virtual keyboard naturally
  // Native: kbOffset (above) translates just this bar above the keyboard;
  //         the rest of the screen never moves
  const positionStyle: any =
    Platform.OS === "web"
      ? { position: "fixed", bottom: 0, left: 0, right: 0 }
      : {};

  return (
    <Animated.View
      style={[
        barStyles.wrap,
        positionStyle,
        { paddingBottom: insets.bottom + 12 },
        Platform.OS !== "web" && { transform: [{ translateY: Animated.multiply(kbOffset, -1) }] },
      ]}
    >
      {/* Profile icon — floating circle, fades away on focus */}
      <Animated.View style={{ width: profileWidth, opacity: profileOpacity, marginRight: profileMargin, overflow: "hidden" }}>
        <TouchableOpacity
          style={[barStyles.profileBtn, { backgroundColor: colors.card }]}
          onPress={onProfile}
          activeOpacity={0.75}
        >
          <Feather name="user" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Floating message box */}
      <View
        style={[
          barStyles.inputWrap,
          { backgroundColor: colors.card, borderColor, borderWidth: 1.5 },
          floatShadowLg as any,
        ]}
      >
        <Animated.View style={{ flex: 1, height: heightAnim }}>
          <TextInput
            style={[barStyles.input, { color: colors.text, outlineStyle: "none" } as any]}
            value={text}
            onChangeText={setText}
            placeholder="Ask Thinker AI anything..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={2000}
            scrollEnabled={atMax}
            onContentSizeChange={handleContentSizeChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            returnKeyType="send"
          />
        </Animated.View>
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
    </Animated.View>
  );
}

const barStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 10,
    minHeight: 72,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  content: { paddingHorizontal: 16 },
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
  agentSheetHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingRight: 4,
  },
  agentSheetTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  proUnlockBadge: {
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  proUnlockText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  agentProBadge: {
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  agentProText: {
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 0.4,
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
