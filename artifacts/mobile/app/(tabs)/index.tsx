import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - 32 - 20) / 3;
  const {
    conversations,
    createConversation,
    sidebarOpen,
    setSidebarOpen,
    profileSheetOpen,
    setProfileSheetOpen,
  } = useApp();

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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setSidebarOpen(true)}
            activeOpacity={0.7}
          >
            <Feather name="menu" size={18} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <View style={[styles.logoDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.logoText, { color: colors.text }]}>Think AI</Text>
          </View>

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleNewChat}
            activeOpacity={0.7}
          >
            <Feather name="edit" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

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
        <View style={styles.grid}>
          {QUICK_ACTIONS.map((action) => {
            const agent = AGENTS[action.agentType];
            return (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionCard,
                  { width: cardWidth, backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => handleQuickAction(action.agentType)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.actionIcon, { backgroundColor: agent.color + "22" }]}
                >
                  <Feather name={action.icon as any} size={18} color={agent.color} />
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

      </ScrollView>

      {/* Bottom Chat Bar */}
      <HomeChatBar
        colors={colors}
        insets={insets}
        onSend={handleStartChat}
        onProfile={() => setProfileSheetOpen(true)}
      />

      {/* Overlays — rendered last so they sit above all content */}
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
  const canSend = text.trim().length > 0;

  function handleSend() {
    if (!canSend) return;
    const msg = text.trim();
    setText("");
    onSend(msg);
  }

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View
      style={[
        barStyles.wrap,
        { paddingBottom: bottomPad + 12 },
      ]}
    >
      <TouchableOpacity
        style={[barStyles.profileBtn, { backgroundColor: colors.card }]}
        onPress={onProfile}
        activeOpacity={0.75}
      >
        <Feather name="user" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={[barStyles.inputWrap, { backgroundColor: colors.card }]}>
        <TextInput
          style={[barStyles.input, { color: colors.text }]}
          value={text}
          onChangeText={setText}
          placeholder="Ask Think AI anything..."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={2000}
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
            <Feather name="arrow-up" size={16} color="#FFFFFF" />
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
    paddingTop: 10,
    gap: 10,
    backgroundColor: "transparent",
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 100,
    paddingTop: 3,
    paddingBottom: 3,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  hero: {
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700" as const,
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 1,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  actionCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  actionDesc: {
    fontSize: 12,
  },
});
