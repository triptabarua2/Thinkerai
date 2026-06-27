import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export type FileCategory = "document" | "code" | "image" | "data" | "archive";

interface Props {
  fileName: string;
  fileType: string;
  fileSize: string;
  category: FileCategory;
  detectedLanguage?: string;
  onAction: (action: string) => void;
}

const CATEGORY_META: Record<FileCategory, { icon: string; color: string; actions: string[] }> = {
  document: {
    icon: "file-text",
    color: "#7B61FF",
    actions: ["Summarise", "Translate", "Ask questions", "Extract data"],
  },
  code: {
    icon: "code",
    color: "#00C8E0",
    actions: ["Review code", "Fix all issues", "Explain this code", "Add a feature", "Rewrite in..."],
  },
  image: {
    icon: "image",
    color: "#FF6B6B",
    actions: ["Analyse image", "Edit / remove object", "Style transfer", "Upscale / enhance"],
  },
  data: {
    icon: "bar-chart-2",
    color: "#00C47A",
    actions: ["Analyse data", "Summarise", "Create chart", "Export cleaned"],
  },
  archive: {
    icon: "archive",
    color: "#FFB800",
    actions: ["Map structure", "Review codebase", "Add a feature", "Fix bugs", "Analyse only"],
  },
};

export function FileReceivedCard({ fileName, fileType, fileSize, category, detectedLanguage, onAction }: Props) {
  const colors = useColors();
  const meta = CATEGORY_META[category];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.fileIconWrap, { backgroundColor: meta.color + "18" }]}>
          <Feather name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{fileName}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{fileType.toUpperCase()}</Text>
            <Text style={[styles.metaDot, { color: colors.textTertiary }]}>·</Text>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{fileSize}</Text>
            {detectedLanguage && (
              <>
                <Text style={[styles.metaDot, { color: colors.textTertiary }]}>·</Text>
                <Text style={[styles.metaText, { color: meta.color }]}>{detectedLanguage}</Text>
              </>
            )}
          </View>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: meta.color + "18" }]}>
          <Text style={[styles.categoryText, { color: meta.color }]}>{category}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>What would you like to do?</Text>
      <View style={styles.actions}>
        {meta.actions.map((action) => (
          <TouchableOpacity
            key={action}
            style={[styles.actionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => onAction(action)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionChipText, { color: colors.text }]}>{action}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 14,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  fileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: { fontSize: 14, fontWeight: "600" as const, marginBottom: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 },
  metaText: { fontSize: 11 },
  metaDot: { fontSize: 11 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 0.5 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 10 },
  actionLabel: { fontSize: 12, marginBottom: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionChipText: { fontSize: 13 },
});
