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
  TextInput,
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
type SidebarTab = "all" | "pinned" | "favourites" | "archived";

const TABS: { key: SidebarTab; label: string; icon: string }[] = [
  { key: "all",        label: "All",        icon: "message-square" },
  { key: "pinned",     label: "Pinned",     icon: "map-pin" },
  { key: "favourites", label: "Favourites", icon: "star" },
  { key: "archived",   label: "Archived",   icon: "archive" },
];

function groupConversations(convs: Conversation[]) {
  const active = convs.filter((c) => !c.archived);
  const pinned = active.filter((c) => !!c.pinnedAt).sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
  const favourites = convs.filter((c) => !!c.favourite && !c.archived);
  const archived = convs.filter((c) => !!c.archived);
  const unpinned = active.filter((c) => !c.pinnedAt && !c.favourite);
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
  return { pinned, favourites, archived, today, yesterday, earlier };
}

interface ContextMenu {
  conv: Conversation;
}

export function Sidebar({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const PANEL_HEIGHT = screenHeight;
  const {
    conversations,
    createConversation,
    setSidebarOpen,
    deleteConversation,
    pinConversation,
    favouriteConversation,
    archiveConversation,
    updateConversation,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SidebarTab>("all");
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [activeDomain, setActiveDomain] = useState<Domain>("general");
  const [renameModal, setRenameModal] = useState<{ conv: Conversation; text: string } | null>(null);
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
        Animated.spring(translateY, { toValue: 0, damping: 24, stiffness: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, { toValue: -PANEL_HEIGHT, damping: 20, stiffness: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start(() => { isMounted.current = false; });
    }
  }, [visible, translateY, opacity, dragY]);

  useEffect(() => {
    if (contextMenu) {
      Animated.spring(menuAnim, { toValue: 1, damping: 22, stiffness: 280, useNativeDriver: true }).start();
    } else {
      menuAnim.setValue(0);
    }
  }, [contextMenu]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && g.dy < 0,
      onPanResponderMove: (_, g) => { if (g.dy < 0) dragY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_THRESHOLD || g.vy < -0.6) {
          dragY.setValue(0);
          onClose();
        } else {
          Animated.spring(dragY, { toValue: 0, damping: 20, stiffness: 300, useNativeDriver: true }).start();
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
    Animated.timing(menuAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setContextMenu(null));
  }

  async function handlePin() {
    if (!contextMenu) return;
    const isPinned = !!contextMenu.conv.pinnedAt;
    await pinConversation(contextMenu.conv.id, !isPinned);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeContextMenu();
  }

  async function handleFavourite() {
    if (!contextMenu) return;
    const isFav = !!contextMenu.conv.favourite;
    await favouriteConversation(contextMenu.conv.id, !isFav);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeContextMenu();
  }

  async function handleArchive() {
    if (!contextMenu) return;
    const isArchived = !!contextMenu.conv.archived;
    await archiveConversation(contextMenu.conv.id, !isArchived);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeContextMenu();
    if (!isArchived) setActiveTab("all");
  }

  function handleRename() {
    if (!contextMenu) return;
    setRenameModal({ conv: contextMenu.conv, text: contextMenu.conv.title });
    closeContextMenu();
  }

  async function submitRename() {
    if (!renameModal || !renameModal.text.trim()) return;
    await updateConversation(renameModal.conv.id, { title: renameModal.text.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRenameModal(null);
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

  const { pinned, favourites, archived, today, yesterday, earlier } = groupConversations(conversations);

  function getTabConversations(): Conversation[] | null {
    if (activeTab === "pinned") return pinned;
    if (activeTab === "favourites") return favourites;
    if (activeTab === "archived") return archived;
    return null;
  }

  const ConvItem = ({ conv }: { conv: Conversation }) => {
    const agent = conv.agentType ? AGENTS[conv.agentType] : null;
    const isPinned = !!conv.pinnedAt;
    const isFav = !!conv.favourite;
    const isArchived = !!conv.archived;
    return (
      <TouchableOpacity
        style={[
          styles.convItem,
          {
            borderColor: isFav ? "#F5A623" + "40" : isPinned ? colors.primary + "40" : colors.border,
            backgroundColor: isFav ? "#F5A623" + "08" : isPinned ? colors.primary + "08" : "transparent",
          },
        ]}
        onPress={() => handleOpenChat(conv.id)}
        onLongPress={() => handleLongPress(conv)}
        delayLongPress={350}
        activeOpacity={0.7}
      >
        {isFav ? (
          <Feather name="star" size={13} color="#F5A623" />
        ) : isPinned ? (
          <Feather name="map-pin" size={13} color={colors.primary} />
        ) : isArchived ? (
          <Feather name="archive" size={13} color={colors.textTertiary} />
        ) : agent ? (
          <Feather name={agent.icon as any} size={14} color={agent.color} />
        ) : (
          <Feather name="message-square" size={14} color={colors.textSecondary} />
        )}
        <Text style={[styles.convTitle, { color: isArchived ? colors.textSecondary : colors.text }]} numberOfLines={1}>
          {conv.title}
        </Text>
        {isFav && (
          <View style={[styles.badge, { backgroundColor: "#F5A623" + "22" }]}>
            <Text style={[styles.badgeLabel, { color: "#F5A623" }]}>★</Text>
          </View>
        )}
        {isPinned && !isFav && (
          <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.badgeLabel, { color: colors.primary }]}>pinned</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const ConvGroup = ({ title, items, icon }: { title: string; items: Conversation[]; icon?: string }) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.group}>
        <View style={styles.groupTitleRow}>
          {icon && <Feather name={icon as any} size={10} color={colors.textTertiary} />}
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>{title}</Text>
        </View>
        {items.map((conv) => <ConvItem key={conv.id} conv={conv} />)}
      </View>
    );
  };

  const tabConvs = getTabConversations();
  const isEmpty = tabConvs !== null ? tabConvs.length === 0 : conversations.length === 0;

  if (!visible && !isMounted.current) return null;

  const combinedY = Animated.add(translateY, dragY);
  const topOffset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const menuTranslateY = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? "auto" : "none"}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents={visible ? "auto" : "none"}>
        <Pressable style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.6)" }]} onPress={onClose} />
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

        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabScrollContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count =
              tab.key === "pinned" ? pinned.length :
              tab.key === "favourites" ? favourites.length :
              tab.key === "archived" ? archived.length :
              conversations.filter((c) => !c.archived).length;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.key);
                }}
                activeOpacity={0.75}
              >
                <Feather name={tab.icon as any} size={12} color={isActive ? "#fff" : colors.textSecondary} />
                <Text style={[styles.tabLabel, { color: isActive ? "#fff" : colors.textSecondary }]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : colors.border }]}>
                    <Text style={[styles.tabBadgeText, { color: isActive ? "#fff" : colors.textTertiary }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* New Chat */}
        <TouchableOpacity
          style={[styles.newChatBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
          onPress={handleNewChat}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={[styles.newChatText, { color: colors.primary }]}>New Chat</Text>
        </TouchableOpacity>

        {/* Conversations */}
        <ScrollView style={styles.convList} showsVerticalScrollIndicator={false} contentContainerStyle={styles.convListContent}>
          {isEmpty ? (
            <View style={styles.empty}>
              <Feather
                name={activeTab === "pinned" ? "map-pin" : activeTab === "favourites" ? "star" : activeTab === "archived" ? "archive" : "message-circle"}
                size={28}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {activeTab === "pinned" ? "No pinned chats" :
                 activeTab === "favourites" ? "No favourite chats" :
                 activeTab === "archived" ? "No archived chats" :
                 "No conversations yet"}
              </Text>
            </View>
          ) : tabConvs !== null ? (
            <ConvGroup title={TABS.find((t) => t.key === activeTab)!.label} items={tabConvs} icon={TABS.find((t) => t.key === activeTab)!.icon} />
          ) : (
            <>
              <ConvGroup title="Pinned" items={pinned} icon="map-pin" />
              <ConvGroup title="Favourites" items={favourites} icon="star" />
              <ConvGroup title="Today" items={today} />
              <ConvGroup title="Yesterday" items={yesterday} />
              <ConvGroup title="Earlier" items={earlier} />
            </>
          )}
        </ScrollView>

        {/* Footer links */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {[
            { icon: "folder", label: "Projects", onPress: () => { onClose(); router.push("/projects" as any); } },
            { icon: "zap", label: "Workflows", onPress: () => { onClose(); router.push("/workflows" as any); } },
            { icon: "settings", label: "Settings", onPress: () => { onClose(); router.push("/settings" as any); } },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.footerItem, { borderColor: colors.border, backgroundColor: colors.card }]}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <Feather name={item.icon as any} size={15} color={colors.textSecondary} />
              <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Rename Modal */}
      <Modal visible={!!renameModal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setRenameModal(null)}>
        <Pressable style={styles.menuOverlay} onPress={() => setRenameModal(null)}>
          <Pressable style={[styles.renameSheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.renameTitle, { color: colors.text }]}>Rename Chat</Text>
            <TextInput
              style={[styles.renameInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              value={renameModal?.text ?? ""}
              onChangeText={(t) => setRenameModal((prev) => prev ? { ...prev, text: t } : null)}
              autoFocus
              maxLength={80}
              placeholder="Chat name"
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={submitRename}
              returnKeyType="done"
            />
            <View style={styles.renameBtns}>
              <TouchableOpacity style={[styles.renameBtn, { borderColor: colors.border }]} onPress={() => setRenameModal(null)} activeOpacity={0.7}>
                <Text style={[styles.renameBtnLabel, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.renameBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={submitRename} activeOpacity={0.7}>
                <Text style={[styles.renameBtnLabel, { color: "#fff" }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Context Menu Modal */}
      <Modal visible={!!contextMenu} transparent animationType="none" statusBarTranslucent onRequestClose={closeContextMenu}>
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
              <Text style={[styles.menuTitle, { color: colors.text }]} numberOfLines={1}>
                {contextMenu?.conv.title}
              </Text>
            </View>

            {/* Pin / Unpin */}
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handlePin} activeOpacity={0.7}>
              <View style={[styles.menuIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="map-pin" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                {contextMenu?.conv.pinnedAt ? "Unpin Chat" : "Pin Chat"}
              </Text>
              <Feather name="chevron-right" size={14} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Favourite / Unfavourite */}
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleFavourite} activeOpacity={0.7}>
              <View style={[styles.menuIconWrap, { backgroundColor: "#F5A623" + "20" }]}>
                <Feather name="star" size={16} color="#F5A623" />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                {contextMenu?.conv.favourite ? "Remove from Favourites" : "Add to Favourites"}
              </Text>
              <Feather name="chevron-right" size={14} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Archive / Unarchive */}
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleArchive} activeOpacity={0.7}>
              <View style={[styles.menuIconWrap, { backgroundColor: colors.textSecondary + "18" }]}>
                <Feather name="archive" size={16} color={colors.textSecondary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                {contextMenu?.conv.archived ? "Unarchive Chat" : "Archive Chat"}
              </Text>
              <Feather name="chevron-right" size={14} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Rename */}
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleRename} activeOpacity={0.7}>
              <View style={[styles.menuIconWrap, { backgroundColor: colors.textSecondary + "18" }]}>
                <Feather name="edit-2" size={16} color={colors.textSecondary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Rename</Text>
              <Feather name="chevron-right" size={14} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: "transparent" }]} onPress={handleDelete} activeOpacity={0.7}>
              <View style={[styles.menuIconWrap, { backgroundColor: "#ff453a18" }]}>
                <Feather name="trash-2" size={16} color="#ff453a" />
              </View>
              <Text style={[styles.menuLabel, { color: "#ff453a" }]}>Delete Chat</Text>
              <Feather name="chevron-right" size={14} color="#ff453a50" />
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.border + "60" }]} onPress={closeContextMenu} activeOpacity={0.7}>
              <Text style={[styles.cancelLabel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderWidth: 1,
    borderTopWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
    overflow: "hidden",
  },
  handleWrap: { alignItems: "center", paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, opacity: 0.5 },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.3 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tabScroll: { maxHeight: 46, marginBottom: 6 },
  tabScrollContent: { paddingHorizontal: 14, gap: 6, flexDirection: "row", alignItems: "center" },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 12, fontWeight: "600" as const },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: { fontSize: 10, fontWeight: "700" as const },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  newChatText: { fontSize: 14, fontWeight: "600" as const },
  convList: { flex: 1 },
  convListContent: { paddingHorizontal: 12, paddingBottom: 8 },
  group: { marginBottom: 8 },
  groupTitleRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  groupTitle: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.8, textTransform: "uppercase" },
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
  convTitle: { fontSize: 13, fontWeight: "400" as const, flex: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeLabel: { fontSize: 10, fontWeight: "600" as const, letterSpacing: 0.3 },
  empty: { alignItems: "center", gap: 10, paddingTop: 40 },
  emptyText: { fontSize: 13 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingTop: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  footerItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  footerLabel: { fontSize: 12, fontWeight: "500" as const },
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  menuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingBottom: 24,
    overflow: "hidden",
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuTitle: { fontSize: 14, fontWeight: "600" as const, flex: 1 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "500" as const },
  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelLabel: { fontSize: 15, fontWeight: "600" as const },
  renameSheet: {
    margin: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  renameTitle: { fontSize: 16, fontWeight: "700" as const },
  renameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  renameBtns: { flexDirection: "row", gap: 10 },
  renameBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  renameBtnLabel: { fontSize: 14, fontWeight: "600" as const },
});
