import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  featureName: string;
  requiredPlan: "Pro" | "Founder";
  onDismiss?: () => void;
}

const PLAN_COLORS: Record<string, string> = {
  Pro: "#7B61FF",
  Founder: "#FFB800",
};

export function UpgradeBanner({ featureName, requiredPlan, onDismiss }: Props) {
  const colors = useColors();
  const planColor = PLAN_COLORS[requiredPlan] ?? colors.primary;

  return (
    <View style={[styles.banner, { backgroundColor: planColor + "14", borderColor: planColor + "40" }]}>
      <Feather name="lock" size={14} color={planColor} style={styles.icon} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: planColor }]}>
          {featureName} requires {requiredPlan}
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Upgrade to unlock this and more powerful features.
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.upgradeBtn, { backgroundColor: planColor }]}
        activeOpacity={0.8}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.upgradeBtnText}>Upgrade</Text>
      </TouchableOpacity>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} activeOpacity={0.6}>
          <Feather name="x" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    gap: 10,
  },
  icon: { marginTop: 1 },
  title: { fontSize: 13, fontWeight: "600" as const, marginBottom: 2 },
  sub: { fontSize: 12, lineHeight: 16 },
  upgradeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  upgradeBtnText: { fontSize: 12, fontWeight: "700" as const, color: "#fff" },
  dismissBtn: { padding: 4 },
});
