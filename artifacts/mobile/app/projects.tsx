import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type Conversation } from "@/context/AppContext";
import { AGENTS } from "@/lib/agents";
import { useColors } from "@/hooks/useColors";

type Filter = "all" | "active" | "completed" | "pinned";

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

function getStatus(conv: Conversation): { label: string; color: string } {
  const msgs = conv.messages ?? [];
  if (msgs.length === 0) return { label: "Empty", color: "#94A3B8" };
  const last = msgs[msgs.length - 1];
  if (last.role === "user") return { label: "Waiting", color: "#F59E0B" };
  if (msgs.length >= 6) return { label: "Completed", color: "#10B981" };
  return { label: "Active", color: "#0B6E69" };
}

export default function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations, deleteConversation, pinConversation } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    if (filter === "pinned") list = list.filter((c) => !!c.pinnedAt);
    else if (filter === "active") list = list.filter((c) => getStatus(c).label === "Active" || getStatus(c).label === "Waiting");
    else if (filter === "completed") list = list.filter((c) => getStatus(c).label === "Completed");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, filter, search]);

  function handleOpen(id: string) {
    router.push(`/chat/${id}` as any);
  }

  function handleDelete(conv: Conversation) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Project",
      `"${conv.title}" permanently delete হবে।`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteConversation(conv.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }

  async function handlePin(conv: Conversation) {
    await pinConversation(conv.id, !conv.pinnedAt);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const FILTERS: { key: Filter; label: string; icon: string }[] = [
    { key: "all", label: "All", icon: "grid" },
    { key: "active", label: "Active", icon: "zap" },
    { key: "completed", label: "Done", icon: "check-circle" },
    { key: "pinned", label: "Pinned", icon: "bookmark" },
  ];

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Projects</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
            {conversations.length} total
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/" as any)}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, outlineStyle: "none" } as any]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search projects..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? colors.primary + "18" : colors.card,
                  borderColor: isActive ? colors.primary + "60" : colors.border,
                },
              ]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Feather
                name={f.icon as any}
                size={12}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.chipLabel,
                  { color: isActive ? colors.primary : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="folder" size={28} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No projects yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
              Start a new chat to create your first project
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/" as any)}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.emptyBtnLabel}>New Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((conv) => {
            const agent = conv.agentType ? AGENTS[conv.agentType] : null;
            const status = getStatus(conv);
            const msgCount = conv.messages?.length ?? 0;
            const isPinned = !!conv.pinnedAt;

            return (
              <TouchableOpacity
                key={conv.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: isPinned ? colors.primary + "40" : colors.border,
                  },
                ]}
                onPress={() => handleOpen(conv.id)}
                activeOpacity={0.75}
              >
                {/* Top row */}
                <View style={styles.cardTop}>
                  <View
                    style={[
                      styles.agentIcon,
                      { backgroundColor: (agent?.color ?? colors.primary) + "18" },
                    ]}
                  >
                    <Feather
                      name={(agent?.icon ?? "message-square") as any}
                      size={16}
                      color={agent?.color ?? colors.primary}
                    />
                  </View>

                  <View style={styles.cardMeta}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {conv.title}
                    </Text>
                    <Text style={[styles.cardAgent, { color: colors.textTertiary }]}>
                      {agent?.name ?? "General"} · {timeAgo(conv.updatedAt)}
                    </Text>
                  </View>

                  {/* Status badge */}
                  <View style={[styles.badge, { backgroundColor: status.color + "18" }]}>
                    <View style={[styles.badgeDot, { backgroundColor: status.color }]} />
                    <Text style={[styles.badgeLabel, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                {/* Message preview */}
                {msgCount > 0 && (
                  <Text
                    style={[styles.preview, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {conv.messages[conv.messages.length - 1]?.content ?? ""}
                  </Text>
                )}

                {/* Bottom row */}
                <View style={[styles.cardBottom, { borderTopColor: colors.border }]}>
                  <View style={styles.cardStats}>
                    <Feather name="message-circle" size={11} color={colors.textTertiary} />
                    <Text style={[styles.statText, { color: colors.textTertiary }]}>
                      {msgCount} messages
                    </Text>
                    {isPinned && (
                      <>
                        <Feather name="bookmark" size={11} color={colors.primary} />
                        <Text style={[styles.statText, { color: colors.primary }]}>pinned</Text>
                      </>
                    )}
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => handlePin(conv)}
                      hitSlop={8}
                      style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                      <Feather
                        name="bookmark"
                        size={13}
                        color={isPinned ? colors.primary : colors.textTertiary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(conv)}
                      hitSlop={8}
                      style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                      <Feather name="trash-2" size={13} color="#F87171" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleOpen(conv.id)}
                      hitSlop={8}
                      style={[styles.actionBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
                    >
                      <Feather name="arrow-right" size={13} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
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
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingTop: 0,
    paddingBottom: 0,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "600",
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
    maxWidth: 240,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  agentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  preview: {
    fontSize: 12,
    lineHeight: 18,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  cardStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontSize: 11,
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
