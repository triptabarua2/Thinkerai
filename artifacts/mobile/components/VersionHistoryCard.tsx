import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface VersionItem {
  version_number: number;
  description: string;
  timestamp: number;
  artifactType: string;
}

interface Props {
  versions: VersionItem[];
  currentVersion: number;
  onRollback: (version: number) => void;
  colors: Record<string, string>;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function VersionHistoryCard({ versions, currentVersion, onRollback, colors }: Props) {
  if (versions.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: "#10B98120" }]}>
          <Feather name="clock" size={14} color="#10B981" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Version History</Text>
        <Text style={[styles.badge, { backgroundColor: colors.primary + "20", color: colors.primary }]}>
          {versions.length} saved
        </Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {[...versions].reverse().map((v) => {
          const isCurrent = v.version_number === currentVersion;
          return (
            <View
              key={v.version_number}
              style={[
                styles.row,
                {
                  backgroundColor: isCurrent ? colors.primary + "10" : "transparent",
                  borderLeftColor: isCurrent ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.rowLeft}>
                <Text style={[styles.vNum, { color: isCurrent ? colors.primary : colors.textSecondary }]}>
                  v{v.version_number}
                </Text>
                <View>
                  <Text style={[styles.vDesc, { color: colors.text }]}>{v.description}</Text>
                  <Text style={[styles.vTime, { color: colors.textTertiary }]}>{timeAgo(v.timestamp)}</Text>
                </View>
              </View>
              {!isCurrent && (
                <TouchableOpacity
                  style={[styles.rollbackBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => onRollback(v.version_number)}
                  activeOpacity={0.75}
                >
                  <Feather name="rotate-ccw" size={12} color={colors.textSecondary} />
                  <Text style={[styles.rollbackText, { color: colors.textSecondary }]}>Restore</Text>
                </TouchableOpacity>
              )}
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.currentText, { color: colors.primary }]}>Current</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    paddingBottom: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  badge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  list: {
    maxHeight: 200,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: 4,
    gap: 10,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  vNum: {
    fontSize: 12,
    fontWeight: "700",
    width: 24,
  },
  vDesc: {
    fontSize: 12,
    fontWeight: "500",
  },
  vTime: {
    fontSize: 11,
    marginTop: 1,
  },
  rollbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  rollbackText: {
    fontSize: 11,
    fontWeight: "600",
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
