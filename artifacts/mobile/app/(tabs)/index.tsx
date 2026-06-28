import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
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

import { ProfileSheet } from "@/components/ProfileSheet";
import { Sidebar } from "@/components/Sidebar";
import { useApp } from "@/context/AppContext";
import { type AgentType } from "@/lib/agents";
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
    conversations,
    createConversation,
    sidebarOpen,
    setSidebarOpen,
    profileSheetOpen,
    setProfileSheetOpen,
  } = useApp();

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

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // 2 columns on narrow (<420), 3 on wider
  const cols = W < 420 ? 2 : 3;
  const gap = 10;
  const hPad = 16;
  const cardW = (W - hPad * 2 - gap * (cols - 1)) / cols;

  const HEADER_H = topPad + 68; // paddingTop + 12 + 44btn + 12

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Fixed Header — always at the top, never scrolls away */}
      <View
        style={[
          styles.fixedHeader,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
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

        <View style={styles.logoWrap}>
          <View style={[styles.logoDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.logoText, { color: colors.text }]}>Thinker AI</Text>
        </View>

        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleNewChat}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Feather name="edit" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: HEADER_H + 16, paddingBottom: botPad + 140 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

        {/* Quick Actions */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>QUICK ACTIONS</Text>
        <View style={[styles.grid, { gap }]}>
          {QUICK_ACTIONS.map((action) => {
            const agent = AGENTS[action.agentType];
            return (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionCard,
                  { width: cardW, backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => handleQuickAction(action.agentType)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: agent.color + "22" }]}>
                  <Feather name={action.icon as any} size={20} color={agent.color} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>
                  {action.label}
                </Text>
                <Text style={[styles.actionDesc, { color: colors.textTertiary }]}>
                  {action.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent chats */}
        {conversations.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 24 }]}>
              RECENT CHATS
            </Text>
            {conversations.slice(0, 5).map((conv) => (
              <TouchableOpacity
                key={conv.id}
                style={[styles.recentRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/chat/${conv.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.recentIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="message-square" size={16} color={colors.primary} />
                </View>
                <View style={styles.recentText}>
                  <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>
                    {conv.title}
                  </Text>
                  <Text style={[styles.recentSub, { color: colors.textTertiary }]}>
                    {conv.messages.length} messages
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Bottom Chat Bar */}
      <HomeChatBar
        colors={colors}
        insets={insets}
        onSend={handleStartChat}
        onProfile={() => setProfileSheetOpen(true)}
      />

      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ProfileSheet visible={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} />
    </View>
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

  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const borderColor = focused ? colors.primary + "90" : colors.border;

  const profileOpacity = profileAnim;
  const profileWidth = profileAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 44] });
  const profileMargin = profileAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });

  return (
    <View
      style={[
        barStyles.wrap,
        {
          paddingBottom: botPad + 12,
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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
  scroll: { flex: 1 },
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  logoText: {
    fontSize: 19,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  actionCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 10,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  actionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recentText: { flex: 1 },
  recentTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  recentSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
