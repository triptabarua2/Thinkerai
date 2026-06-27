import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  completedSteps: number;
  totalSteps: number;
  reason: string;
  workSaved: boolean;
  onResume?: () => void;
  onRescope?: () => void;
  onDismiss?: () => void;
}

export function HaltCard({ completedSteps, totalSteps, reason, workSaved, onResume, onRescope, onDismiss }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.warning + "60" }]}>
      <View style={[styles.header, { backgroundColor: colors.warning + "18" }]}>
        <Feather name="alert-triangle" size={16} color={colors.warning} />
        <Text style={[styles.headerText, { color: colors.warning }]}>Pipeline paused</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.progress, { color: colors.text }]}>
          Completed {completedSteps} of {totalSteps} steps
        </Text>
        <Text style={[styles.reason, { color: colors.textSecondary }]}>{reason}</Text>

        {workSaved && (
          <View style={[styles.savedRow, { backgroundColor: colors.success + "14" }]}>
            <Feather name="save" size={12} color={colors.success} />
            <Text style={[styles.savedText, { color: colors.success }]}>Your work so far is saved</Text>
          </View>
        )}

        <View style={styles.actions}>
          {onResume && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={onResume}
              activeOpacity={0.8}
            >
              <Feather name="play" size={13} color="#fff" />
              <Text style={styles.actionBtnText}>Resume</Text>
            </TouchableOpacity>
          )}
          {onRescope && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }]}
              onPress={onRescope}
              activeOpacity={0.8}
            >
              <Feather name="edit" size={13} color={colors.text} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Re-scope</Text>
            </TouchableOpacity>
          )}
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss} activeOpacity={0.6} style={styles.dismissBtn}>
              <Text style={[styles.dismissText, { color: colors.textTertiary }]}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginHorizontal: 12,
    marginVertical: 6,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerText: { fontSize: 13, fontWeight: "700" as const },
  body: { padding: 14 },
  progress: { fontSize: 15, fontWeight: "600" as const, marginBottom: 4 },
  reason: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  savedText: { fontSize: 12, fontWeight: "600" as const },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" as const, color: "#fff" },
  dismissBtn: { paddingHorizontal: 10, paddingVertical: 8, justifyContent: "center" },
  dismissText: { fontSize: 13 },
});
