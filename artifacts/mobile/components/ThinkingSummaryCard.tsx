import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  goalUnderstanding: string;
  strategyBrief: string;
  proposedApproach: string;
  thinkingLevel: "low" | "medium" | "high" | "consensus";
  creditCost: number;
  onConfirm: () => void;
  onEdit: () => void;
}

const LEVEL_META = {
  low: { label: "Low Thinking", color: "#8585A8", icon: "■" },
  medium: { label: "Medium Thinking", color: "#7B61FF", icon: "■■" },
  high: { label: "High Thinking", color: "#00C8E0", icon: "■■■" },
  consensus: { label: "Consensus", color: "#FFB800", icon: "■■■■" },
};

export function ThinkingSummaryCard({
  goalUnderstanding,
  strategyBrief,
  proposedApproach,
  thinkingLevel,
  creditCost,
  onConfirm,
  onEdit,
}: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(true);
  const level = LEVEL_META[thinkingLevel];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={[styles.stageTag, { backgroundColor: colors.primary + "18" }]}>
          <Text style={[styles.stageNum, { color: colors.primary }]}>Stage 1</Text>
          <Text style={[styles.stageLabel, { color: colors.primary }]}>Thinking Summary</Text>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          <View style={[styles.levelBadge, { backgroundColor: level.color + "18", borderColor: level.color + "40" }]}>
            <Text style={{ color: level.color, fontSize: 11 }}>{level.icon}</Text>
            <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
            <Text style={[styles.creditCost, { color: level.color }]}>· {creditCost} credits</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="target" size={12} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Goal understood</Text>
            </View>
            <Text style={[styles.sectionContent, { color: colors.text }]}>{goalUnderstanding}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="trending-up" size={12} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Strategy brief</Text>
            </View>
            <Text style={[styles.sectionContent, { color: colors.text }]}>{strategyBrief}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="map" size={12} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Proposed approach</Text>
            </View>
            <Text style={[styles.sectionContent, { color: colors.text }]}>{proposedApproach}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Feather name="check" size={14} color="#fff" />
              <Text style={styles.confirmBtnText}>Confirm & build</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={onEdit}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={13} color={colors.text} />
              <Text style={[styles.editBtnText, { color: colors.text }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 12,
    marginVertical: 6,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  stageTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  stageNum: { fontSize: 11, fontWeight: "800" as const },
  stageLabel: { fontSize: 12, fontWeight: "600" as const },
  body: { paddingHorizontal: 14, paddingBottom: 14 },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  levelText: { fontSize: 12, fontWeight: "600" as const },
  creditCost: { fontSize: 12 },
  section: { marginBottom: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 },
  sectionTitle: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.5 },
  sectionContent: { fontSize: 14, lineHeight: 21 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  confirmBtnText: { fontSize: 14, fontWeight: "700" as const, color: "#fff" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 14 },
});
