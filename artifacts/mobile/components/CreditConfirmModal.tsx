import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  action: string;
  credits: number;
  balance: number;
  thinkingLevel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const LEVEL_LABELS: Record<string, string> = {
  low: "Quick Answer",
  medium: "Medium Analysis",
  high: "Deep Thinking",
  consensus: "Consensus Validation",
};

const LEVEL_COLORS: Record<string, string> = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#6C63FF",
  consensus: "#EC4899",
};

const LEVEL_ICONS: Record<string, string> = {
  low: "zap",
  medium: "cpu",
  high: "layers",
  consensus: "users",
};

const CREDIT_DESCRIPTIONS: Record<string, string> = {
  low: "Direct answer — no pipeline agents",
  medium: "Analysis with planner & research",
  high: "Full 12-agent pipeline with review loop",
  consensus: "Full pipeline + multi-model consensus vote",
};

export function CreditConfirmModal({
  visible,
  action,
  credits,
  balance,
  thinkingLevel,
  onConfirm,
  onCancel,
}: Props) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const levelColor = LEVEL_COLORS[thinkingLevel] ?? colors.primary;
  const levelIcon = LEVEL_ICONS[thinkingLevel] ?? "cpu";
  const levelLabel = LEVEL_LABELS[thinkingLevel] ?? thinkingLevel;
  const levelDesc = CREDIT_DESCRIPTIONS[thinkingLevel] ?? "";
  const remaining = balance - credits;
  const canAfford = remaining >= 0;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 9 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.92);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.overlay, { opacity }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ scale }],
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: levelColor + "18" }]}>
            <Feather name={levelIcon as any} size={24} color={levelColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Confirm Thinking Level</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            This will use Thinker Credits to run the pipeline
          </Text>

          {/* Level badge */}
          <View style={[styles.levelRow, { backgroundColor: levelColor + "12", borderColor: levelColor + "30" }]}>
            <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
            <Text style={[styles.levelLabel, { color: levelColor }]}>{levelLabel}</Text>
          </View>

          <Text style={[styles.levelDesc, { color: colors.textSecondary }]}>{levelDesc}</Text>

          {/* Credit breakdown */}
          <View style={[styles.creditCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.creditRow}>
              <Text style={[styles.creditLabel, { color: colors.textSecondary }]}>Cost</Text>
              <Text style={[styles.creditValue, { color: colors.text }]}>
                ~{credits} credits
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.creditRow}>
              <Text style={[styles.creditLabel, { color: colors.textSecondary }]}>Your balance</Text>
              <Text style={[styles.creditValue, { color: colors.text }]}>
                {balance} credits
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.creditRow}>
              <Text style={[styles.creditLabel, { color: colors.textSecondary }]}>After</Text>
              <Text
                style={[
                  styles.creditValue,
                  { color: canAfford ? colors.success : colors.destructive, fontWeight: "700" },
                ]}
              >
                {remaining >= 0 ? remaining : 0} credits
              </Text>
            </View>
          </View>

          {!canAfford && (
            <View style={[styles.warningRow, { backgroundColor: "#EF444415", borderColor: "#EF444430" }]}>
              <Feather name="alert-triangle" size={13} color={colors.destructive} />
              <Text style={[styles.warningText, { color: colors.destructive }]}>
                Not enough credits. Upgrade your plan to continue.
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={onCancel}
              activeOpacity={0.75}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: canAfford ? levelColor : colors.muted, flex: 2 },
              ]}
              onPress={canAfford ? onConfirm : undefined}
              activeOpacity={canAfford ? 0.85 : 1}
            >
              <Feather name="play" size={14} color={canAfford ? "#fff" : colors.textTertiary} />
              <Text
                style={[
                  styles.confirmText,
                  { color: canAfford ? "#fff" : colors.textTertiary },
                ]}
              >
                {canAfford ? `Use ${credits} credits` : "Not enough credits"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Free tip */}
          {thinkingLevel === "low" && (
            <Text style={[styles.freeTip, { color: colors.textTertiary }]}>
              💡 Quick Answer uses only 1 credit
            </Text>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000060",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: -4,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  levelDesc: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginTop: -4,
  },
  creditCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 4,
  },
  creditRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  creditLabel: {
    fontSize: 13,
  },
  creditValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "700",
  },
  freeTip: {
    fontSize: 11,
    textAlign: "center",
    marginTop: -4,
  },
});
