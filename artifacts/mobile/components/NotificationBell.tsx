import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { fetchJobs, type JobSummary } from "@/lib/api";

const POLL_INTERVAL_MS = 30_000;

function statusLabel(job: JobSummary): string {
  if (job.status === "awaiting_approval") {
    if (job.approvalType === "blueprint") return "Blueprint অপেক্ষমাণ — Approve করুন";
    if (job.approvalType === "output") return "Output অপেক্ষমাণ — Approve করুন";
    return "Approval প্রয়োজন";
  }
  if (job.status === "running") return "চলছে…";
  if (job.status === "complete") return "সম্পন্ন হয়েছে";
  if (job.status === "failed") return "সমস্যা হয়েছে";
  return "Unknown";
}

function statusColor(job: JobSummary, colors: ReturnType<typeof useColors>): string {
  if (job.status === "awaiting_approval") return "#F59E0B";
  if (job.status === "running") return colors.primary;
  if (job.status === "complete") return colors.success;
  if (job.status === "failed") return colors.destructive;
  return colors.textSecondary;
}

function statusIcon(job: JobSummary): string {
  if (job.status === "awaiting_approval") return "alert-circle";
  if (job.status === "running") return "loader";
  if (job.status === "complete") return "check-circle";
  if (job.status === "failed") return "x-circle";
  return "circle";
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "এইমাত্র";
  if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
  return `${Math.floor(diff / 86400)} দিন আগে`;
}

interface Props {
  iconBtnStyle: object;
}

export function NotificationBell({ iconBtnStyle }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchJobs("default");
    setJobs(data.jobs);
    setPendingCount(data.pendingCount);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (pendingCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, { toValue: 1.35, duration: 600, useNativeDriver: true }),
          Animated.timing(badgePulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      badgePulse.setValue(1);
    }
  }, [pendingCount, badgePulse]);

  function openSheet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
    setOpen(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 200,
    }).start();
  }

  function closeSheet() {
    Animated.timing(slideAnim, {
      toValue: 500,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  }

  function handleJobPress(job: JobSummary) {
    closeSheet();
    setTimeout(() => {
      router.push(`/chat/${job.conversationId}` as any);
    }, 240);
  }

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Feather name="bell-off" size={38} color={colors.textTertiary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        কোনো সাম্প্রতিক activity নেই
      </Text>
      <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
        Background job শুরু হলে এখানে দেখাবে
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: JobSummary }) => {
    const color = statusColor(item, colors);
    const icon = statusIcon(item);
    const isPending = item.status === "awaiting_approval";
    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            backgroundColor: isPending ? "#F59E0B10" : colors.background,
            borderColor: isPending ? "#F59E0B40" : colors.border,
          },
        ]}
        onPress={() => handleJobPress(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.itemIcon, { backgroundColor: color + "18" }]}>
          <Feather name={icon as any} size={18} color={color} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.itemLabel, { color: colors.text }]} numberOfLines={1}>
            {statusLabel(item)}
          </Text>
          <Text style={[styles.itemMeta, { color: colors.textTertiary }]} numberOfLines={1}>
            Chat · {timeAgo(item.createdAt)}
          </Text>
        </View>
        {isPending && (
          <View style={[styles.pendingDot, { backgroundColor: "#F59E0B" }]} />
        )}
        <Feather name="chevron-right" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={iconBtnStyle}
        onPress={openSheet}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Feather name="bell" size={20} color={colors.text} />
        {pendingCount > 0 && (
          <Animated.View
            style={[
              styles.badge,
              { transform: [{ scale: badgePulse }] },
            ]}
          >
            <Text style={styles.badgeText}>
              {pendingCount > 9 ? "9+" : String(pendingCount)}
            </Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      <Modal
        transparent
        animationType="none"
        visible={open}
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={closeSheet} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="bell" size={18} color={colors.primary} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Activity
              </Text>
              {pendingCount > 0 && (
                <View style={[styles.headerBadge, { backgroundColor: "#F59E0B" }]}>
                  <Text style={styles.headerBadgeText}>{pendingCount} pending</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={closeSheet} hitSlop={8}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading && jobs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>লোড হচ্ছে…</Text>
            </View>
          ) : (
            <FlatList
              data={jobs}
              keyExtractor={(j) => j.jobId}
              renderItem={renderItem}
              ListEmptyComponent={renderEmpty}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={jobs.length === 0 ? { flex: 1 } : { paddingTop: 8 }}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            />
          )}
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: "72%",
    paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 12 },
      web: { boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemMeta: {
    fontSize: 12,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
