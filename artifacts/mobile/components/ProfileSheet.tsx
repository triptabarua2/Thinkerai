import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getCredits } from "@/lib/api";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  founder: "Founder",
};

const PLAN_COLORS: Record<string, string> = {
  free: "#8585A8",
  pro: "#0D9488",
  founder: "#FFB800",
};

export function ProfileSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Sheet is compact — fixed height, not screen-proportion
  const SHEET_HEIGHT = 340 + insets.bottom;

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Real credit data
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [planTier, setPlanTier] = useState<"free" | "pro" | "founder">("free");

  useEffect(() => {
    if (!visible) return;
    getCredits().then((data) => {
      if (!data) return;
      setTotalBalance(data.totalBalance);
      setPlanTier(data.planTier);
    });
  }, [visible]);

  function animateOpen() {
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
  }

  function animateClose(callback?: () => void) {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(dragY, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      callback?.();
    });
  }

  useEffect(() => {
    if (visible) {
      animateOpen();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.6) {
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

  function navigate(path: string) {
    animateClose(() => router.push(path as any));
  }

  function handleSignOut() {
    animateClose(() => {
      // Clear session state and go to the root (login/onboarding)
      router.replace("/" as any);
    });
  }

  const planColor = PLAN_COLORS[planTier] ?? "#8585A8";
  const planLabel = PLAN_LABELS[planTier] ?? "Free";

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={() => animateClose()}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={() => animateClose()}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.55)", opacity: overlayOpacity },
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
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 20 : 0) + 8,
            transform: [{ translateY: Animated.add(translateY, dragY) }],
          },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.handleArea} {...panResponder.panHandlers}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* ── 1. Identity ──────────────────────────────────── */}
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: planColor + "22" }]}>
            <Text style={[styles.avatarText, { color: planColor }]}>T</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>
              Thinker AI User
            </Text>
            <View style={[styles.planBadge, { backgroundColor: planColor + "18" }]}>
              <View style={[styles.planDot, { backgroundColor: planColor }]} />
              <Text style={[styles.planText, { color: planColor }]}>
                {planLabel} Plan
              </Text>
            </View>
          </View>
        </View>

        {/* ── 2. Credit balance ────────────────────────────── */}
        <View
          style={[
            styles.creditRow,
            {
              backgroundColor: colors.primary + "0D",
              borderColor: colors.primary + "25",
            },
          ]}
        >
          <View style={[styles.creditIcon, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="zap" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.creditLabel, { color: colors.textSecondary }]}>
            Credits remaining
          </Text>
          <Text style={[styles.creditValue, { color: colors.text }]}>
            {totalBalance === null ? "—" : totalBalance.toLocaleString()}
          </Text>
        </View>

        {/* ── 3 & 4. Menu ──────────────────────────────────── */}
        <View style={[styles.menu, { borderColor: colors.border }]}>
          <MenuRow
            icon="user"
            label="Profile"
            desc="Identity, activity, billing"
            colors={colors}
            onPress={() => navigate("/profile")}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="settings"
            label="Settings"
            desc="AI behaviour, theme, language"
            colors={colors}
            onPress={() => navigate("/settings")}
            last
          />
        </View>

        {/* ── 5. Sign Out ───────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.signOut, { borderColor: colors.destructive + "35" }]}
          activeOpacity={0.75}
          onPress={handleSignOut}
        >
          <Feather name="log-out" size={15} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

function MenuRow({
  icon,
  label,
  desc,
  colors,
  onPress,
  last = false,
}: {
  icon: string;
  label: string;
  desc: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  last?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 400, useNativeDriver: true }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, damping: 20, stiffness: 400, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.menuRow, last && { borderBottomWidth: 0 }]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={[styles.menuIcon, { backgroundColor: colors.surface }]}>
          <Feather name={icon as any} size={15} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.menuDesc, { color: colors.textTertiary }]}>{desc}</Text>
        </View>
        <Feather name="chevron-right" size={14} color={colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
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
    paddingTop: 8,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },

  // Identity
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 19,
    fontWeight: "700",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    alignSelf: "flex-start",
  },
  planDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  planText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Credit row
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  creditIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  creditLabel: {
    flex: 1,
    fontSize: 13,
  },
  creditValue: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Menu
  menu: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    fontWeight: "500",
  },
  menuDesc: {
    fontSize: 11,
    marginTop: 1,
  },

  // Sign out
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
