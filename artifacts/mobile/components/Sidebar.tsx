import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
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

const SWIPE_THRESHOLD = 60;

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
  const { height: screenHeight } = useWindowDimensions();
  const PANEL_HEIGHT = screenHeight;
  const { conversations, createConversation, setSidebarOpen } = useApp();

  const translateY = useRef(new Animated.Value(-screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(false);

  useEffect(() => {
    if (visible) {
      isMounted.current = true;
      dragY.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 24,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: -PANEL_HEIGHT,
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isMounted.current = false;
      });
    }
  }, [visible, translateY, opacity, dragY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 6 && g.dy < 0,
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_THRESHOLD || g.vy < -0.6) {
          dragY.setValue(0);
          onClose();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            damping: 20,
            stiffness: 300,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

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
        <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>
          {title}
        </Text>
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
                <Feather
                  name="message-square"
                  size={14}
                  color={colors.textSecondary}
                />
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

  if (!visible && !isMounted.current) return null;

  const combinedY = Animated.add(translateY, dragY);
  const topOffset = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? "auto" : "none"}>
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity }]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.6)" }]}
          onPress={onClose}
        />
      </Animated.View>

      {/* Drop-down panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            height: PANEL_HEIGHT,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingTop: topOffset + 8,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16,
            transform: [{ translateY: combinedY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header row */}
        <View style={styles.panelHeader}>
          <View style={styles.logoRow}>
            <View style={[styles.logoDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.logoText, { color: colors.text }]}>Thinker AI</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Feather name="x" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* New Chat */}
        <TouchableOpacity
          style={[
            styles.newChatBtn,
            {
              backgroundColor: colors.primary + "18",
              borderColor: colors.primary + "40",
            },
          ]}
          onPress={handleNewChat}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={[styles.newChatText, { color: colors.primary }]}>
            New Chat
          </Text>
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

        {/* Footer links */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {[
            { icon: "folder", label: "Projects" },
            { icon: "zap", label: "Workflows" },
            { icon: "settings", label: "Settings" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.footerItem}
              activeOpacity={0.7}
            >
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
    top: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  handleWrap: {
    alignItems: "center",
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  },
  convTitle: {
    fontSize: 13,
    fontWeight: "400" as const,
    flex: 1,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingTop: 32,
  },
  emptyText: {
    fontSize: 13,
  },
  footer: {
    borderTopWidth: 1,
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  footerItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: "400" as const,
  },
});
