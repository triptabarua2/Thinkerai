import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AgentPanel } from "@/components/AgentPanel";
import { ProfileSheet } from "@/components/ProfileSheet";
import { Sidebar } from "@/components/Sidebar";
import { useApp } from "@/context/AppContext";
import { AGENTS, type AgentType } from "@/lib/agents";
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
  { id: "create", label: "Create", icon: "edit-3", agentType: "content", desc: "Write content" },
  { id: "analyze", label: "Analyze", icon: "bar-chart-2", agentType: "analysis", desc: "Data insights" },
  { id: "automate", label: "Automate", icon: "zap", agentType: "automation", desc: "Build workflows" },
  { id: "plan", label: "Plan", icon: "map", agentType: "planner", desc: "Strategy & goals" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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

  const recentConvs = conversations.slice(0, 5);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
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
                  { backgroundColor: colors.card, borderColor: colors.border },
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

        {/* Recent Chats */}
        {recentConvs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                RECENT CHATS
              </Text>
              <TouchableOpacity onPress={() => setSidebarOpen(true)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>All chats</Text>
              </TouchableOpacity>
            </View>
            {recentConvs.map((conv) => {
              const agent = conv.agentType ? AGENTS[conv.agentType] : null;
              return (
                <TouchableOpacity
                  key={conv.id}
                  style={[
                    styles.convItem,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => router.push(`/chat/${conv.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.convIcon,
                      { backgroundColor: agent ? agent.color + "22" : colors.border },
                    ]}
                  >
                    <Feather
                      name={(agent?.icon ?? "message-circle") as any}
                      size={14}
                      color={agent?.color ?? colors.textSecondary}
                    />
                  </View>
                  <View style={styles.convInfo}>
                    <Text
                      style={[styles.convTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {conv.title}
                    </Text>
                    <Text style={[styles.convMeta, { color: colors.textTertiary }]}>
                      {conv.messages.length} {conv.messages.length === 1 ? "message" : "messages"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Agent Fleet */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: 24 }]}>
          AGENT FLEET
        </Text>
        <View style={styles.agentsWrap}>
          {Object.values(AGENTS).map((agent) => (
            <View
              key={agent.id}
              style={[styles.agentChip, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.agentDot, { backgroundColor: agent.color }]} />
              <Feather name={agent.icon as any} size={12} color={agent.color} />
              <Text style={[styles.agentName, { color: colors.textSecondary }]}>
                {agent.shortName}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Profile FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20,
          },
        ]}
        onPress={() => setProfileSheetOpen(true)}
        activeOpacity={0.8}
      >
        <Feather name="user" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Overlays — rendered last so they sit above all content */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ProfileSheet visible={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} />
    </View>
  );
}

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
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  actionCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
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
  section: {
    marginBottom: 8,
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  convIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  convInfo: {
    flex: 1,
    gap: 2,
  },
  convTitle: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  convMeta: {
    fontSize: 12,
  },
  agentsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  agentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  agentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  agentName: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B61FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
