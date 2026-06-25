import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  mediumFixCount: number;
  fullRebuildCount: number;
  onReset?: () => void;
}

const MEDIUM_LIMIT = 10;
const REBUILD_LIMIT = 3;

function Bar({
  used,
  limit,
  label,
  color,
}: {
  used: number;
  limit: number;
  label: string;
  color: string;
}) {
  const colors = useColors();
  const pct = Math.min(used / limit, 1);
  const atLimit = used >= limit;
  const nearLimit = used >= limit * 0.7;

  const barColor = atLimit ? colors.destructive : nearLimit ? colors.warning : color;

  return (
    <View style={styles.barWrap}>
      <View style={styles.barHeader}>
        <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text
          style={[
            styles.barCount,
            { color: atLimit ? colors.destructive : nearLimit ? colors.warning : colors.textTertiary },
          ]}
        >
          {used}/{limit}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            { width: `${pct * 100}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

export function FixCounterBar({ mediumFixCount, fullRebuildCount, onReset }: Props) {
  const colors = useColors();

  const mediumAtLimit = mediumFixCount >= MEDIUM_LIMIT;
  const rebuildAtLimit = fullRebuildCount >= REBUILD_LIMIT;
  const anyAtLimit = mediumAtLimit || rebuildAtLimit;

  if (mediumFixCount === 0 && fullRebuildCount === 0) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: anyAtLimit ? colors.destructive + "10" : colors.card,
          borderColor: anyAtLimit ? colors.destructive + "40" : colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Feather
          name={anyAtLimit ? "alert-triangle" : "activity"}
          size={13}
          color={anyAtLimit ? colors.destructive : colors.textSecondary}
        />
        <Text
          style={[styles.title, { color: anyAtLimit ? colors.destructive : colors.textSecondary }]}
        >
          {anyAtLimit ? "Fix limit reached" : "Fix budget"}
        </Text>
        {onReset && (
          <TouchableOpacity onPress={onReset} style={styles.resetBtn} activeOpacity={0.75}>
            <Text style={[styles.resetText, { color: colors.primary }]}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      <Bar
        used={mediumFixCount}
        limit={MEDIUM_LIMIT}
        label="Medium fixes"
        color={colors.primary}
      />
      <Bar
        used={fullRebuildCount}
        limit={REBUILD_LIMIT}
        label="Full rebuilds"
        color="#EC4899"
      />
    </View>
  );
}

export { MEDIUM_LIMIT, REBUILD_LIMIT };

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  resetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  resetText: {
    fontSize: 11,
    fontWeight: "700",
  },
  barWrap: {
    gap: 3,
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabel: {
    fontSize: 10,
  },
  barCount: {
    fontSize: 10,
    fontWeight: "600",
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});
