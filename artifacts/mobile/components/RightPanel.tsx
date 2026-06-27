import { Feather } from "@expo/vector-icons";
import React, { useRef, useEffect } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Tab = "project" | "versions" | "log" | "files";

export interface ProjectDetails {
  name: string;
  createdAt: string;
  modifiedAt: string;
  domain: string;
  thinkingLevel: string;
  techStack: string;
  creditsSpent: number;
  status: "building" | "complete" | "halted";
  livePreviewUrl?: string;
}

export interface VersionItem {
  id: string;
  label: string;
  timestamp: string;
  summary: string;
}

export interface LogEntry {
  agent: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  model: string;
  tokenCost: number;
}

export interface ProjectFile {
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  project?: ProjectDetails;
  versions?: VersionItem[];
  logs?: LogEntry[];
  files?: ProjectFile[];
  isPlanFounder?: boolean;
  onRestoreVersion?: (id: string) => void;
  onDownloadZip?: () => void;
  onDeleteProject?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  building: "#FFB800",
  complete: "#00C47A",
  halted: "#FF4757",
  success: "#00C47A",
  failed: "#FF4757",
  skipped: "#8585A8",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#8585A8";
  return (
    <View style={[styles.badge, { backgroundColor: color + "20" }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <Feather name={icon as any} size={28} color={colors.textTertiary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

export function RightPanel({
  visible,
  onClose,
  project,
  versions = [],
  logs = [],
  files = [],
  isPlanFounder = false,
  onRestoreVersion,
  onDownloadZip,
  onDeleteProject,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<Tab>("project");
  const translateX = useRef(new Animated.Value(340)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 340, duration: 260, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const TABS: { id: Tab; label: string; icon: string; founderOnly?: boolean }[] = [
    { id: "project", label: "Project", icon: "box" },
    { id: "versions", label: "Versions", icon: "clock" },
    { id: "files", label: "Files", icon: "paperclip" },
    { id: "log", label: "Log", icon: "activity", founderOnly: true },
  ];

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)", opacity: overlayOpacity }]} />
      </Pressable>

      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: colors.card,
            borderLeftColor: colors.border,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>Project</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.6} style={styles.closeBtn}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {TABS.filter((t) => !t.founderOnly || isPlanFounder).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Feather name={tab.icon as any} size={12} color={active ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.textSecondary }, active && { fontWeight: "600" as const }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
          {activeTab === "project" && (
            project ? (
              <View>
                <Text style={[styles.projName, { color: colors.text }]}>{project.name}</Text>
                <StatusBadge status={project.status} />

                {[
                  { label: "Created", value: project.createdAt },
                  { label: "Last modified", value: project.modifiedAt },
                  { label: "Domain", value: project.domain },
                  { label: "Thinking Level", value: project.thinkingLevel },
                  { label: "Tech stack", value: project.techStack },
                  { label: "Credits spent", value: `${project.creditsSpent} credits` },
                ].map((row) => (
                  <View key={row.label} style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{row.value}</Text>
                  </View>
                ))}

                <View style={styles.actionButtons}>
                  {project.livePreviewUrl && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
                      <Feather name="external-link" size={13} color="#fff" />
                      <Text style={styles.actionBtnText}>Live Preview</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={onDownloadZip} activeOpacity={0.8}>
                    <Feather name="download" size={13} color={colors.text} />
                    <Text style={[styles.actionBtnText, { color: colors.text }]}>Download ZIP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive + "18", borderWidth: 1, borderColor: colors.destructive + "40" }]} onPress={onDeleteProject} activeOpacity={0.8}>
                    <Feather name="trash-2" size={13} color={colors.destructive} />
                    <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <EmptyState icon="box" message="No active project. Start building to see details here." />
            )
          )}

          {activeTab === "versions" && (
            versions.length === 0 ? (
              <EmptyState icon="clock" message="No versions saved yet — versions appear here after your first build." />
            ) : (
              versions.map((v, i) => (
                <View key={v.id} style={[styles.versionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.versionHeader}>
                    <View style={[styles.versionBadge, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.versionLabel, { color: colors.primary }]}>v{versions.length - i}</Text>
                    </View>
                    <Text style={[styles.versionTime, { color: colors.textSecondary }]}>{v.timestamp}</Text>
                  </View>
                  <Text style={[styles.versionSummary, { color: colors.text }]}>{v.summary}</Text>
                  <TouchableOpacity
                    style={[styles.restoreBtn, { borderColor: colors.border }]}
                    onPress={() => onRestoreVersion?.(v.id)}
                    activeOpacity={0.7}
                  >
                    <Feather name="rotate-ccw" size={12} color={colors.textSecondary} />
                    <Text style={[styles.restoreBtnText, { color: colors.textSecondary }]}>Restore</Text>
                  </TouchableOpacity>
                </View>
              ))
            )
          )}

          {activeTab === "files" && (
            files.length === 0 ? (
              <EmptyState icon="paperclip" message="No files in this project yet." />
            ) : (
              files.map((f) => (
                <View key={f.name} style={[styles.fileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="file" size={18} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.fileName, { color: colors.text }]}>{f.name}</Text>
                    <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>{f.type} · {f.size} · {f.uploadedAt}</Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.6}>
                    <Feather name="trash-2" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))
            )
          )}

          {activeTab === "log" && (
            logs.length === 0 ? (
              <EmptyState icon="activity" message="No pipeline logs yet." />
            ) : (
              logs.map((entry, i) => (
                <View key={i} style={[styles.logCard, { borderColor: colors.border }]}>
                  <View style={styles.logHeader}>
                    <Text style={[styles.logAgent, { color: colors.text }]}>{entry.agent}</Text>
                    <StatusBadge status={entry.status} />
                  </View>
                  <View style={styles.logMeta}>
                    <Text style={[styles.logMetaText, { color: colors.textSecondary }]}>{entry.durationMs}ms</Text>
                    <Text style={[styles.logMetaText, { color: colors.textSecondary }]}>·</Text>
                    <Text style={[styles.logMetaText, { color: colors.textSecondary }]}>{entry.tokenCost} tokens</Text>
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const PANEL_WIDTH = 300;

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    borderLeftWidth: 1,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelTitle: { fontSize: 16, fontWeight: "600" as const, flex: 1 },
  closeBtn: { padding: 4 },
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 44 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
    marginTop: 4,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontSize: 11, fontWeight: "600" as const },
  projName: { fontSize: 17, fontWeight: "700" as const, marginBottom: 8 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 12, fontWeight: "500" as const, maxWidth: "55%", textAlign: "right" },
  actionButtons: { flexDirection: "column", gap: 8, marginTop: 16 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" as const, color: "#fff" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  versionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  versionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  versionBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  versionLabel: { fontSize: 11, fontWeight: "700" as const },
  versionTime: { fontSize: 11 },
  versionSummary: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  restoreBtnText: { fontSize: 12 },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  fileName: { fontSize: 13, fontWeight: "500" as const },
  fileMeta: { fontSize: 11, marginTop: 2 },
  logCard: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  logHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  logAgent: { fontSize: 13, fontWeight: "600" as const },
  logMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  logMetaText: { fontSize: 11 },
});
