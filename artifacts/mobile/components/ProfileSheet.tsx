import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
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

import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type MenuItem = {
  icon: string;
  label: string;
  route: string;
  tab?: string;
  desc?: string;
};

const MENU_ITEMS: MenuItem[] = [
  { icon: "user",        label: "Profile",            route: "/profile",   desc: "View & edit your identity" },
  { icon: "credit-card", label: "Subscription",       route: "/settings",  tab: "credits",       desc: "Plan, credits & billing" },
  { icon: "cpu",         label: "Pipeline Settings",  route: "/settings",  tab: "pipeline",      desc: "AI models & API keys" },
  { icon: "database",    label: "Memory & Rules",     route: "/settings",  tab: "memory",        desc: "Decision memory stats" },
  { icon: "bell",        label: "Notifications",      route: "/settings",  tab: "notifications", desc: "Alerts & reminders" },
  { icon: "moon",        label: "Theme & Display",    route: "/settings",  tab: "general",       desc: "Appearance, language" },
  { icon: "shield",      label: "Privacy & Security", route: "/settings",  tab: "privacy",       desc: "Data & account safety" },
  { icon: "settings",    label: "All Settings",       route: "/settings",  desc: "Full settings panel" },
];

function AnimatedMenuItem({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      damping: 20,
      stiffness: 400,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 400,
    }).start();
  }

  function handlePress() {
    onClose();
    const params: Record<string, string> = {};
    if (item.tab) params.tab = item.tab;
    router.push(
      item.tab
        ? { pathname: item.route as any, params }
        : (item.route as any)
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: colors.border }]}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={[styles.menuIcon, { backgroundColor: colors.surface }]}>
          <Feather name={item.icon as any} size={15} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
          {item.desc ? (
            <Text style={[styles.menuDesc, { color: colors.textTertiary }]}>{item.desc}</Text>
          ) : null}
        </View>
        <Feather name="chevron-right" size={14} color={colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ProfileSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const SHEET_HEIGHT = Math.round(screenHeight * 0.82);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  function animateClose() {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(dragY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }

  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 0.7) {
          animateClose();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            damping: 22,
            stiffness: 320,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={animateClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={animateClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.65)", opacity: overlayOpacity },
          ]}
        />
      </Pressable>

      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_HEIGHT,
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8,
            transform: [{ translateY: Animated.add(translateY, dragY) }],
          },
        ]}
      >
        {/* Handle — drag area */}
        <View style={styles.handleArea} {...panResponder.panHandlers}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>T</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.text }]}>Thinker AI User</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>user@example.com</Text>
            <View style={[styles.planBadge, { backgroundColor: colors.primary + "20" }]}>
              <View style={[styles.planDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.planText, { color: colors.primary }]}>Pro Plan</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
            onPress={() => { onClose(); router.push("/profile" as any); }}
          >
            <Feather name="edit-2" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          {[
            { label: "Chats", value: "38" },
            { label: "Credits", value: "260" },
            { label: "Projects", value: "12" },
          ].map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <ScrollView
          style={styles.menu}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {MENU_ITEMS.map((item) => (
            <AnimatedMenuItem key={item.label} item={item} onClose={onClose} />
          ))}

          {/* Sign out */}
          <TouchableOpacity
            style={[styles.signOutBtn, { borderColor: colors.destructive + "40" }]}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
            }}
          >
            <Feather name="log-out" size={15} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 1,
  },
  profileEmail: {
    fontSize: 12,
    marginBottom: 5,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  planDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  planText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginHorizontal: 20,
    marginBottom: 6,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  menu: {
    paddingHorizontal: 14,
    paddingTop: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  menuDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    marginHorizontal: 6,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
});
