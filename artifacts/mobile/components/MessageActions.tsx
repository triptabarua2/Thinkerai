import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Clipboard, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  messageContent: string;
  isProjectOutput?: boolean;
  onRegenerate?: () => void;
  onThinkingLevelUp?: () => void;
  onShare?: () => void;
  onPin?: () => void;
  onSaveToProject?: () => void;
  onVersionHistory?: () => void;
  onRollback?: () => void;
  onFeedback?: (positive: boolean) => void;
}

interface ActionBtnProps {
  icon: string;
  label?: string;
  onPress: () => void;
  color?: string;
  active?: boolean;
}

function ActionBtn({ icon, label, onPress, color, active }: ActionBtnProps) {
  const colors = useColors();
  const btnColor = color ?? colors.textSecondary;
  return (
    <TouchableOpacity style={[styles.btn, active && { backgroundColor: btnColor + "18" }]} onPress={onPress} activeOpacity={0.6}>
      <Feather name={icon as any} size={13} color={active ? btnColor : colors.textSecondary} />
      {label ? <Text style={[styles.btnLabel, { color: colors.textTertiary }]}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

export function MessageActions({
  messageContent,
  isProjectOutput = false,
  onRegenerate,
  onThinkingLevelUp,
  onShare,
  onPin,
  onSaveToProject,
  onVersionHistory,
  onRollback,
  onFeedback,
}: Props) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  async function handleCopy() {
    Clipboard.setString(messageContent);
    setCopied(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleFeedback(positive: boolean) {
    setFeedback(positive ? "up" : "down");
    onFeedback?.(positive);
    if (Platform.OS !== "web") Haptics.selectionAsync();
  }

  return (
    <View style={[styles.row, { borderTopColor: colors.border }]}>
      <ActionBtn icon={copied ? "check" : "copy"} onPress={handleCopy} color={copied ? colors.success : undefined} active={copied} />
      {onRegenerate && <ActionBtn icon="refresh-cw" onPress={onRegenerate} />}
      {onThinkingLevelUp && <ActionBtn icon="arrow-up-circle" onPress={onThinkingLevelUp} />}
      {onShare && <ActionBtn icon="share-2" onPress={onShare} />}
      {onPin && <ActionBtn icon="map-pin" onPress={onPin} />}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <ActionBtn
        icon="thumbs-up"
        onPress={() => handleFeedback(true)}
        color={colors.success}
        active={feedback === "up"}
      />
      <ActionBtn
        icon="thumbs-down"
        onPress={() => handleFeedback(false)}
        color={colors.destructive}
        active={feedback === "down"}
      />

      {isProjectOutput && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {onSaveToProject && <ActionBtn icon="folder-plus" onPress={onSaveToProject} />}
          {onVersionHistory && <ActionBtn icon="clock" onPress={onVersionHistory} />}
          {onRollback && <ActionBtn icon="rotate-ccw" onPress={onRollback} />}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: "wrap",
    gap: 2,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    padding: 6,
    borderRadius: 7,
  },
  btnLabel: { fontSize: 11 },
  divider: {
    width: 1,
    height: 16,
    marginHorizontal: 2,
  },
});
