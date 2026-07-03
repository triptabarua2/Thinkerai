import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SavePreferenceModal } from "@/components/SavePreferenceModal";
import { useColors } from "@/hooks/useColors";
import { useSavePreference } from "@/hooks/useSavePreference";

// Lazy-require native-only file system module so web doesn't crash
let FileSystemLegacy: {
  documentDirectory: string | null;
  writeAsStringAsync: (
    fileUri: string,
    contents: string
  ) => Promise<void>;
} | null = null;

if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FileSystemLegacy = require("expo-file-system/legacy");
}

interface Props {
  projectName: string;
  summary: string;
  outputContent?: string;
  architectureNotes?: string;
  creditsUsed: number;
  agentCount: number;
  duration: string;
  onClose?: () => void;
  onLivePreview?: () => void;
  onDownload?: () => void | Promise<void>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

/** Sanitize project name for use as a filename */
function toFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\u0980-\u09FF _-]/g, "").trim().replace(/\s+/g, "_") || "output";
}

export function FinalOutputCard({
  projectName,
  summary,
  outputContent,
  architectureNotes,
  creditsUsed,
  agentCount,
  duration,
  onClose,
  onLivePreview,
  onDownload,
}: Props) {
  const colors = useColors();
  const [showNotes, setShowNotes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showPrefModal, setShowPrefModal] = useState(false);
  const { pref, loaded, savePref } = useSavePreference("file");

  // Prevent double auto-save across re-renders
  const autoSaved = useRef(false);

  const content = outputContent
    ? `# ${projectName}\n\n${summary}\n\n---\n\n${outputContent}`
    : `# ${projectName}\n\n${summary}`;

  // Save file to app's document directory (no system permission needed)
  async function saveFile(): Promise<void> {
    if (!FileSystemLegacy) return;
    try {
      setSaveState("saving");
      const dir = FileSystemLegacy.documentDirectory ?? "";
      const fileName = `${toFileName(projectName)}_${Date.now()}.md`;
      await FileSystemLegacy.writeAsStringAsync(`${dir}${fileName}`, content);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  // Show preference modal first time (native only)
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!loaded) return;
    if (!outputContent && !summary) return;
    if (pref === null) setShowPrefModal(true);
  }, [loaded, pref, outputContent, summary]);

  // Auto-save on first mount when pref is "auto" (native only)
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!loaded || autoSaved.current) return;
    if (pref !== "auto") return;
    autoSaved.current = true;
    saveFile();
  }, [loaded, pref]);

  async function handlePrefChoice(choice: "auto" | "manual") {
    setShowPrefModal(false);
    await savePref(choice);
    if (choice === "auto") {
      autoSaved.current = true;
      saveFile();
    }
  }

  async function handleShare() {
    try {
      await Share.share({ title: projectName, message: content });
    } catch {}
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const rawCode = outputContent
    ? (() => {
        const m = outputContent.match(/```[\w-]*\n?([\s\S]*?)```/);
        return m?.[1]?.trim() ?? null;
      })()
    : null;

  async function handleCopyCode() {
    if (!rawCode) return;
    await Clipboard.setStringAsync(rawCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  return (
    <>
      {Platform.OS !== "web" && (
        <SavePreferenceModal
          visible={showPrefModal}
          type="file"
          onChoose={handlePrefChoice}
        />
      )}

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.success + "50" },
        ]}
      >
        <View style={[styles.header, { backgroundColor: colors.success + "14" }]}>
          <View style={styles.headerLeft}>
            <Feather name="check-circle" size={18} color={colors.success} />
            <View>
              <Text style={[styles.headerLabel, { color: colors.success }]}>
                Stage 5 — Final Output
              </Text>
              <Text style={[styles.headerProject, { color: colors.text }]}>
                {projectName}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {/* Save state badge */}
            {saveState === "saving" && (
              <View
                style={[
                  styles.saveBadge,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <ActivityIndicator size={10} color={colors.primary} />
                <Text style={[styles.saveBadgeText, { color: colors.textSecondary }]}>
                  সেভ হচ্ছে…
                </Text>
              </View>
            )}
            {saveState === "saved" && (
              <View
                style={[
                  styles.saveBadge,
                  { backgroundColor: "#16A34A18", borderColor: "#16A34A40" },
                ]}
              >
                <Feather name="check-circle" size={11} color="#16A34A" />
                <Text style={[styles.saveBadgeText, { color: "#16A34A" }]}>
                  ফাইলে সেভ
                </Text>
              </View>
            )}
            {saveState === "error" && (
              <View
                style={[
                  styles.saveBadge,
                  { backgroundColor: "#EF444418", borderColor: "#EF444440" },
                ]}
              >
                <Feather name="alert-circle" size={11} color="#EF4444" />
                <Text style={[styles.saveBadgeText, { color: "#EF4444" }]}>
                  সেভ হয়নি
                </Text>
              </View>
            )}
            {onClose && (
              <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
                <Feather name="x" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[styles.summary, { color: colors.text }]}>{summary}</Text>

          <View style={styles.statsRow}>
            <View
              style={[
                styles.statChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name="zap" size={12} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{creditsUsed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>credits</Text>
            </View>
            <View
              style={[
                styles.statChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name="cpu" size={12} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{agentCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>agents</Text>
            </View>
            <View
              style={[
                styles.statChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name="clock" size={12} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{duration}</Text>
            </View>
          </View>

          {/* Primary: Live Preview / Download (when callbacks provided) */}
          {(onLivePreview || onDownload) && (
            <View style={styles.ctaButtons}>
              {onLivePreview && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={onLivePreview}
                  activeOpacity={0.8}
                >
                  <Feather name="external-link" size={14} color="#fff" />
                  <Text style={styles.primaryBtnText}>Live Preview</Text>
                </TouchableOpacity>
              )}
              {onDownload && (
                <TouchableOpacity
                  style={[
                    styles.secondaryBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => onDownload()}
                  activeOpacity={0.8}
                >
                  <Feather name="download" size={14} color={colors.text} />
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                    Download
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Action row: Share · Copy All · Copy Code · Save File */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.primary + "15",
                  borderColor: colors.primary + "30",
                },
              ]}
              onPress={handleShare}
              activeOpacity={0.75}
            >
              <Feather name="share-2" size={13} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Share</Text>
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
              <Feather
                name={copied ? "check" : "copy"}
                size={13}
                color={copied ? colors.success : colors.textSecondary}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: copied ? colors.success : colors.textSecondary },
                ]}
              >
                {copied ? "Copied!" : "Copy All"}
              </Text>
            </TouchableOpacity>

            {rawCode && (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: codeCopied ? colors.success + "15" : colors.surface,
                    borderColor: codeCopied ? colors.success + "40" : colors.border,
                  },
                ]}
                onPress={handleCopyCode}
                activeOpacity={0.75}
              >
                <Feather
                  name={codeCopied ? "check" : "code"}
                  size={13}
                  color={codeCopied ? colors.success : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: codeCopied ? colors.success : colors.textSecondary },
                  ]}
                >
                  {codeCopied ? "Copied!" : "Copy Code"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Manual save button: native only, shown when pref=manual or error (retry) */}
            {Platform.OS !== "web" &&
              (pref === "manual" || saveState === "error") &&
              saveState !== "saving" &&
              saveState !== "saved" && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={saveFile}
                  activeOpacity={0.75}
                >
                  <Feather name="save" size={13} color={colors.textSecondary} />
                  <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
                    ফাইলে সেভ
                  </Text>
                </TouchableOpacity>
              )}
          </View>

          {/* Where to find the file — shown after a successful save */}
          {saveState === "saved" && Platform.OS !== "web" && (
            <View
              style={[
                styles.savedHint,
                { backgroundColor: "#16A34A0D", borderColor: "#16A34A30" },
              ]}
            >
              <Feather name="info" size={12} color="#16A34A" />
              <Text style={[styles.savedHintText, { color: "#16A34A" }]}>
                {Platform.OS === "ios"
                  ? "Files app → On My iPhone → ThinkerAI"
                  : "Files app → ThinkerAI"}
              </Text>
            </View>
          )}

          {architectureNotes && (
            <TouchableOpacity
              style={[styles.notesToggle, { borderTopColor: colors.border }]}
              onPress={() => setShowNotes(!showNotes)}
              activeOpacity={0.7}
            >
              <Feather name="file-text" size={13} color={colors.textSecondary} />
              <Text style={[styles.notesToggleText, { color: colors.textSecondary }]}>
                Architecture Notes
              </Text>
              <Feather
                name={showNotes ? "chevron-up" : "chevron-down"}
                size={13}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}

          {showNotes && architectureNotes && (
            <View
              style={[
                styles.notesBody,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.notesText, { color: colors.text }]}>
                {architectureNotes}
              </Text>
            </View>
          )}
        </View>
      </View>
    </>
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLabel: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.4 },
  headerProject: { fontSize: 15, fontWeight: "700" as const, marginTop: 1 },
  saveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveBadgeText: { fontSize: 10, fontWeight: "600" as const },
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
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" as const },
  savedHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
    marginBottom: 4,
  },
  savedHintText: { fontSize: 12, fontWeight: "500" as const, flex: 1 },
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
