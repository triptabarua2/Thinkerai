import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  projectName?: string;
  previewDescription?: string;
  creditsUsed?: number;
  agentCount?: number;
  onApprove?: () => void;
  onChangeSomething?: () => void;
  onBackToBlueprint?: () => void;
}

export function ApprovalCard({
  projectName = "Your Project",
  previewDescription = "Full application visible in preview panel. Review before finalising.",
  creditsUsed = 52,
  agentCount = 4,
  onApprove,
  onChangeSomething,
  onBackToBlueprint,
}: Props) {
  const colors = useColors();
  const approveScale = useRef(new Animated.Value(1)).current;

  function handleApprovePress() {
    Animated.sequence([
      Animated.timing(approveScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(approveScale, { toValue: 1, useNativeDriver: true }),
    ]).start(() => onApprove?.());
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Stage badge */}
      <View style={styles.headerRow}>
        <View style={[styles.stageBadge, { backgroundColor: colors.success + "20" }]}>
          <Text style={[styles.stageLabel, { color: colors.success }]}>STAGE 4</Text>
        </View>
        <View style={[styles.checkBadge, { backgroundColor: colors.success + "15" }]}>
          <Feather name="check-circle" size={13} color={colors.success} />
          <Text style={[styles.checkLabel, { color: colors.success }]}>Reviewed by {agentCount} agents</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>
        Ready for your approval
      </Text>
      <Text style={[styles.projectName, { color: colors.accent }]}>{projectName}</Text>

      {/* Preview description */}
      <View style={[styles.previewBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="monitor" size={16} color={colors.textSecondary} />
        <Text style={[styles.previewText, { color: colors.textSecondary }]}>
          {previewDescription}
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="zap" size={12} color={colors.accent} />
          <Text style={[styles.statValue, { color: colors.text }]}>{creditsUsed}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>credits</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="users" size={12} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{agentCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>agents</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="shield" size={12} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>100%</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>reviewed</Text>
        </View>
      </View>

      {/* Primary CTA — Approve */}
      <Animated.View style={{ transform: [{ scale: approveScale }] }}>
        <TouchableOpacity
          style={[styles.approveBtn, { backgroundColor: colors.primary }]}
          onPress={handleApprovePress}
          activeOpacity={0.85}
        >
          <Feather name="check" size={18} color="#F9FAFB" />
          <Text style={styles.approveBtnText}>Looks good — finalise</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Secondary CTAs */}
      <TouchableOpacity
        style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={onChangeSomething}
        activeOpacity={0.7}
      >
        <Feather name="edit-2" size={15} color={colors.text} />
        <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Change something specific</Text>
        <Feather name="chevron-right" size={14} color={colors.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={onBackToBlueprint}
        activeOpacity={0.7}
      >
        <Feather name="map" size={15} color={colors.textSecondary} />
        <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Go back to blueprint</Text>
        <Feather name="chevron-right" size={14} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  stageLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  checkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  checkLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  projectName: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: -6,
  },
  previewBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
  },
  approveBtnText: {
    color: "#F9FAFB",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
