import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
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
import type { Conversation } from "@/context/AppContext";
import { AGENTS, DOMAIN_META, type Domain } from "@/lib/agents";
import { ThinkerLogo } from "@/components/ThinkerLogo";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 60;

function groupConversations(convs: Conversation[]) {
  const pinned = convs.filter((c) => !!c.pinnedAt).sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
  const unpinned = convs.filter((c) => !c.pinnedAt);
  const now = Date.now();
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const earlier: Conversation[] = [];
  for (const c of unpinned) {
    const diff = now - c.updatedAt;
    if (diff < 86400000) today.push(c);
    else if (diff < 172800000) yesterday.push(c);
    else earlier.push(c);
  }
  return { pinned, today, yesterday, earlier };
}

interface ContextMenu {
  conv: Conversation;
}

export function Sidebar({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const PANEL_HEIGHT = screenHeight;
  const { conversations, createConversation, setSidebarOpen, deleteConversation, pinConversation } = useApp();

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [activeDomain, setActiveDomain] = useState<Domain>("general");
  const menuAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (contextMenu) {
      Animated.spring(menuAnim, {
        toValue: 1,
        damping: 22,
        stiffness: 280,
        useNativeDriver: true,
      }).start();
    } else {
      menuAnim.setValue(0);
    }
  }, [contextMenu]);

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

  function handleLongPress(conv: Conversation) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContextMenu({ conv });
  }

  function closeContextMenu() {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setContextMenu(null));
  }

  async function handlePin() {
    if (!contextMenu) return;
    const isPinned = !!contextMenu.conv.pinnedAt;
    await pinConversation(contextMenu.conv.id, !isPinned);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeContextMenu();
  }

  function handleDelete() {
    if (!contextMenu) return;
    const conv = contextMenu.conv;
    closeContextMenu();
    setTimeout(() => {
      Alert.alert(
        "Delete Chat",
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
    }, 200);
  }

  const { pinned, today, yesterday, earlier } = groupConversations(conversations);

  const ConvItem = ({ conv }: { conv: Conversation }) => {
    const agent = conv.agentType ? AGENTS[conv.agentType] : null;
    const isPinned = !!conv.pinnedAt;
    return (
      <TouchableOpacity
        style={[styles.convItem, { borderColor: colors.border }]}
        onPress={() => handleOpenChat(conv.id)}
        onLongPress={() => handleLongPress(conv)}
        delayLongPress={350}
        activeOpacity={0.7}
      >
        {isPinned ? (
          <Feather name="bookmark" size={13} color={colors.primary} />
        ) : agent ? (
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
        {isPinned && (
          <View style={[styles.pinnedDot, { backgroundColor: colors.primary + "30" }]}>
            <Text style={[styles.pinnedLabel, { color: colors.primary }]}>pinned</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const ConvGroup = ({
    title,
    items,
    icon,
  }: {
    title: string;
    items: Conversation[];
    icon?: string;
  }) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.group}>
        <View style={styles.groupTitleRow}>
          {icon && <Feather name={icon as any} size={10} color={colors.textTertiary} />}
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>
            {title}
          </Text>
        </View>
        {items.map((conv) => (
          <ConvItem key={conv.id} conv={conv} />
        ))}
      </View>
    );
  };

  if (!visible && !isMounted.current) return null;

  const combinedY = Animated.add(translateY, dragY);
  const topOffset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const menuTranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

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
            <ThinkerLogo size={28} />
            <Text style={[styles.logoText, { color: colors.text }]}>Thinker AI</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Feather name="x" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Domain picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.domainScroll}
          contentContainerStyle={styles.domainScrollContent}
        >
          {(Object.entries(DOMAIN_META) as [Domain, typeof DOMAIN_META[Domain]][]).map(([key, meta]) => {
            const isActive = activeDomain === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.domainChip,
                  {
                    backgroundColor: isActive ? meta.color + "22" : colors.card,
                    borderColor: isActive ? meta.color + "66" : colors.border,
                  },
                ]}
                onPress={() => setActiveDomain(key)}
                activeOpacity={0.7}
              >
                <Feather name={meta.icon as any} size={12} color={isActive ? meta.color : colors.textSecondary} />
                <Text style={[styles.domainChipLabel, { color: isActive ? meta.color : colors.textSecondary }]}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
              <ConvGroup title="Pinned" items={pinned} icon="bookmark" />
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
            { icon: "settings", label: "Settings", onPress: () => { onClose(); router.push("/settings" as any); } },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.footerItem, { borderColor: colors.border, backgroundColor: colors.card }]}
              activeOpacity={0.7}
              onPress={(item as any).onPress}
            >
              <Feather name={item.icon as any} size={15} color={colors.textSecondary} />
              <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Context Menu Modal */}
      <Modal
        visible={!!contextMenu}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeContextMenu}
      >
        <Pressable style={styles.menuOverlay} onPress={closeContextMenu}>
          <Animated.View
            style={[
              styles.menuSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: menuAnim,
                transform: [{ translateY: menuTranslateY }],
              },
            ]}
          >
            {/* Chat title */}
            <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
              <Feather name="message-square" size={14} color={colors.textSecondary} />
              <Text
                style={[styles.menuTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {contextMenu?.conv.title}
              </Text>
            </View>

            {/* Pin / Unpin */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={handlePin}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="bookmark" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                {contextMenu?.conv.pinnedAt ? "Unpin Chat" : "Pin Chat"}
              </Text>
              <Feather name="chevron-right" size={14} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Rename (placeholder) */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={closeContextMenu}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: colors.textSecondary + "18" }]}>
                <Feather name="edit-2" size={16} color={colors.textSecondary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                Rename
              </Text>
              <Feather name="chevron-right" size={14} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: "transparent" }]}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: "#ff453a18" }]}>
                <Feather name="trash-2" size={16} color="#ff453a" />
              </View>
              <Text style={[styles.menuLabel, { color: "#ff453a" }]}>
                Delete Chat
              </Text>
              <Feather name="chevron-right" size={14} color="#ff453a50" />
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.border + "60" }]}
              onPress={closeContextMenu}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelLabel, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
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
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  domainScroll: {
    maxHeight: 44,
    marginBottom: 8,
  },
  domainScrollContent: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  domainChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  domainChipLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.1,
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
  groupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  convTitle: {
    fontSize: 13,
    fontWeight: "400" as const,
    flex: 1,
  },
  pinnedDot: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pinnedLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
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
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  footerItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: "400" as const,
  },
  // Context menu
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  menuSheet: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "500" as const,
    flex: 1,
  },
  cancelBtn: {
    margin: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
});
