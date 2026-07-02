import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { Linking, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  projectName: string;
  summary: string;
  outputContent?: string;      // full built content for Share / Copy
  livePreviewUrl?: string;
  downloadUrl?: string;
  architectureNotes?: string;
  creditsUsed: number;
  agentCount: number;
  duration: string;
  onClose?: () => void;
}

export function FinalOutputCard({
  projectName,
  summary,
  outputContent,
  livePreviewUrl,
  downloadUrl,
  architectureNotes,
  creditsUsed,
  agentCount,
  duration,
  onClose,
}: Props) {
  const colors = useColors();
  const [showNotes, setShowNotes] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      await Share.share({
        title: projectName,
        message: outputContent
          ? `${summary}\n\n---\n${outputContent}`
          : summary,
      });
    } catch {}
  }

  async function handleCopy() {
    const text = outputContent ?? summary;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.success + "50" }]}>
      <View style={[styles.header, { backgroundColor: colors.success + "14" }]}>
        <View style={styles.headerLeft}>
          <Feather name="check-circle" size={18} color={colors.success} />
          <View>
            <Text style={[styles.headerLabel, { color: colors.success }]}>Stage 5 — Final Output</Text>
            <Text style={[styles.headerProject, { color: colors.text }]}>{projectName}</Text>
          </View>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
            <Feather name="x" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.summary, { color: colors.text }]}>{summary}</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="zap" size={12} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{creditsUsed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>credits</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="cpu" size={12} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{agentCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>agents</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="clock" size={12} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{duration}</Text>
          </View>
        </View>

        {/* Primary action buttons: Live Preview / Download (when URLs provided) */}
        <View style={styles.ctaButtons}>
          {livePreviewUrl && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => Linking.openURL(livePreviewUrl)}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={14} color="#fff" />
              <Text style={styles.primaryBtnText}>Live Preview</Text>
            </TouchableOpacity>
          )}
          {downloadUrl && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => Linking.openURL(downloadUrl)}
              activeOpacity={0.8}
            >
              <Feather name="download" size={14} color={colors.text} />
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Download ZIP</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Always-visible Share + Copy row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
            onPress={handleShare}
            activeOpacity={0.75}
          >
            <Feather name="share-2" size={13} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Share Output</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: copied ? colors.success + "15" : colors.surface,
                borderColor: copied ? colors.success + "40" : colors.border,
              },
            ]}
            onPress={handleCopy}
            activeOpacity={0.75}
          >
            <Feather name={copied ? "check" : "copy"} size={13} color={copied ? colors.success : colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: copied ? colors.success : colors.textSecondary }]}>
              {copied ? "Copied!" : "Copy Output"}
            </Text>
          </TouchableOpacity>
        </View>

        {architectureNotes && (
          <TouchableOpacity
            style={[styles.notesToggle, { borderTopColor: colors.border }]}
            onPress={() => setShowNotes(!showNotes)}
            activeOpacity={0.7}
          >
            <Feather name="file-text" size={13} color={colors.textSecondary} />
            <Text style={[styles.notesToggleText, { color: colors.textSecondary }]}>Architecture Notes</Text>
            <Feather name={showNotes ? "chevron-up" : "chevron-down"} size={13} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {showNotes && architectureNotes && (
          <View style={[styles.notesBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.notesText, { color: colors.text }]}>{architectureNotes}</Text>
          </View>
        )}
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
    justifyContent: "space-between",
    padding: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLabel: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.4 },
  headerProject: { fontSize: 15, fontWeight: "700" as const, marginTop: 1 },
  body: { padding: 14 },
  summary: { fontSize: 14, lineHeight: 21, marginBottom: 14 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statValue: { fontSize: 13, fontWeight: "700" as const },
  statLabel: { fontSize: 11 },
  ctaButtons: { flexDirection: "row", gap: 8, marginBottom: 10 },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  primaryBtnText: { fontSize: 14, fontWeight: "700" as const, color: "#fff" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 14 },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" as const },
  notesToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  notesToggleText: { fontSize: 13, flex: 1 },
  notesBody: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  notesText: { fontSize: 13, lineHeight: 20 },
});
