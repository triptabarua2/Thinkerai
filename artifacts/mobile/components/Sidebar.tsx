import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { AGENTS } from "@/lib/agents";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SIDEBAR_WIDTH = 300;

function groupConversations(convs: ReturnType<typeof useApp>["conversations"]) {
  const now = Date.now();
  const today: typeof convs = [];
  const yesterday: typeof convs = [];
  const earlier: typeof convs = [];

  for (const c of convs) {
    const diff = now - c.updatedAt;
    if (diff < 86400000) today.push(c);
    else if (diff < 172800000) yesterday.push(c);
    else earlier.push(c);
  }
  return { today, yesterday, earlier };
}

export function Sidebar({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations, createConversation, deleteConversation, setSidebarOpen } = useApp();
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: visible ? 0 : -SIDEBAR_WIDTH,
        damping: 22,
        stiffness: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateX, opacity]);

  async function handleNewChat() {
    const id = await createConversation("New Chat");
    setSidebarOpen(false);
    router.push(`/chat/${id}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleOpenChat(id: string) {
    setSidebarOpen(false);
    router.push(`/chat/${id}`);
  }

  const { today, yesterday, earlier } = groupConversations(conversations);

  const ConvGroup = ({
    title,
    items,
  }: {
    title: string;
    items: typeof conversations;
  }) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>{title}</Text>
        {items.map((conv) => {
          const agent = conv.agentType ? AGENTS[conv.agentType] : null;
          return (
            <TouchableOpacity
              key={conv.id}
              style={[styles.convItem, { borderColor: colors.border }]}
              onPress={() => handleOpenChat(conv.id)}
              activeOpacity={0.7}
            >
              {agent ? (
                <Feather name={agent.icon as any} size={14} color={agent.color} />
              ) : (
                <Feather name="message-square" size={14} color={colors.textSecondary} />
              )}
              <Text
                style={[styles.convTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {conv.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (!visible && translateX.__getValue() === -SIDEBAR_WIDTH) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? "auto" : "none"}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.65)" }]}
          onPress={onClose}
        />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: colors.surface,
            borderRightColor: colors.border,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
            transform: [{ translateX }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.panelHeader}>
          <View style={styles.logoRow}>
            <View style={[styles.logoDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.logoText, { color: colors.text }]}>Think AI</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* New Chat */}
        <TouchableOpacity
          style={[
            styles.newChatBtn,
            { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" },
          ]}
          onPress={handleNewChat}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={[styles.newChatText, { color: colors.primary }]}>New Chat</Text>
        </TouchableOpacity>

        {/* Conversations */}
        <ScrollView
          style={styles.convList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.convListContent}
        >
          {conversations.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="message-circle" size={28} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No conversations yet
              </Text>
            </View>
          ) : (
            <>
              <ConvGroup title="Today" items={today} />
              <ConvGroup title="Yesterday" items={yesterday} />
              <ConvGroup title="Earlier" items={earlier} />
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {[
            { icon: "folder", label: "Projects" },
            { icon: "zap", label: "Workflows" },
            { icon: "settings", label: "Settings" },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.footerItem} activeOpacity={0.7}>
              <Feather name={item.icon as any} size={16} color={colors.textSecondary} />
              <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 4,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  newChatText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  convList: {
    flex: 1,
  },
  convListContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  group: {
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 0,
  },
  convTitle: {
    fontSize: 13,
    fontWeight: "400" as const,
    flex: 1,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 13,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  footerLabel: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
});
