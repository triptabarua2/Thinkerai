import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type Conversation } from "@/context/AppContext";
import { AGENTS, type AgentType } from "@/lib/agents";
import { useColors } from "@/hooks/useColors";

// Agents whose output is a saved asset worth surfacing in the Library
const LIBRARY_AGENT_TYPES = new Set<AgentType>(["image", "video", "music", "canvas", "report", "file"]);

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function getLibraryItems(conversations: Conversation[]): Conversation[] {
  return conversations
    .filter((c) => c.agentType && LIBRARY_AGENT_TYPES.has(c.agentType) && (c.messages?.length ?? 0) > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations } = useApp();

  const items = useMemo(() => getLibraryItems(conversations), [conversations]);

  function handleOpen(id: string) {
    router.push(`/chat/${id}` as any);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Library</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
            {items.length} saved {items.length === 1 ? "output" : "outputs"}
          </Text>
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="grid" size={28} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
              Images, videos, reports and other generated files will show up here once you create them.
            </Text>
          </View>
        ) : (
          items.map((conv) => {
            const agent = conv.agentType ? AGENTS[conv.agentType] : null;
            const msgCount = conv.messages?.length ?? 0;

            return (
              <TouchableOpacity
                key={conv.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleOpen(conv.id)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.agentIcon,
                    { backgroundColor: (agent?.color ?? colors.primary) + "18" },
                  ]}
                >
                  <Feather
                    name={(agent?.icon ?? "file") as any}
                    size={18}
                    color={agent?.color ?? colors.primary}
                  />
                </View>

                <View style={styles.cardMeta}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                    {conv.title}
                  </Text>
                  <Text style={[styles.cardAgent, { color: colors.textTertiary }]}>
                    {agent?.name ?? "General"} · {timeAgo(conv.updatedAt)} · {msgCount} messages
                  </Text>
                </View>

                <Feather name="chevron-right" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  list: { flex: 1 },
  listContent: {
    padding: 16,
    gap: 12,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  agentIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  cardAgent: {
    fontSize: 11,
    marginTop: 2,
  },
});
