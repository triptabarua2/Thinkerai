import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface BuildStep {
  id: string;
  label: string;
  status: "done" | "active" | "pending";
  duration?: string;
}

interface Props {
  projectName?: string;
  steps?: BuildStep[];
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  onApproveFirstScreen?: () => void;
  onChangeDirection?: () => void;
  showApprovalPrompt?: boolean;
}

const DEFAULT_STEPS: BuildStep[] = [
  { id: "1", label: "Generating project structure", status: "done", duration: "2.1s" },
  { id: "2", label: "Building HomeScreen component", status: "done", duration: "3.8s" },
  { id: "3", label: "Building AuthScreen component", status: "active" },
  { id: "4", label: "Wiring navigation & routing", status: "pending" },
  { id: "5", label: "Generating styles & theme", status: "pending" },
  { id: "6", label: "Adding API integrations", status: "pending" },
];

function PulsingDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.35, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 400, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

export function BuildProgressCard({
  projectName = "Your Project",
  steps = DEFAULT_STEPS,
  completedSteps,
  totalSteps,
  onApproveFirstScreen,
  onChangeDirection,
  showApprovalPrompt = false,
}: Props) {
  const colors = useColors();

  const done = completedSteps ?? steps.filter((s) => s.status === "done").length;
  const total = totalSteps ?? steps.length;
  const pct = total > 0 ? done / total : 0;

  const barWidth = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.stageBadge, { backgroundColor: colors.accent + "20" }]}>
          <Text style={[styles.stageLabel, { color: colors.accent }]}>STAGE 3</Text>
        </View>
        <View style={styles.pctRow}>
          <PulsingDot color={colors.accent} />
          <Text style={[styles.pctText, { color: colors.accent }]}>Building</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{projectName}</Text>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.accent,
              width: barWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
        {done} of {total} steps complete
      </Text>

      {/* Step list */}
      <ScrollView
        style={styles.stepList}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {steps.map((step, idx) => (
          <View key={step.id} style={styles.stepRow}>
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  { backgroundColor: step.status === "done" ? colors.accent + "50" : colors.border },
                ]}
              />
            )}

            {/* Status icon */}
            <View
              style={[
                styles.stepIcon,
                {
                  backgroundColor:
                    step.status === "done"
                      ? colors.accent + "20"
                      : step.status === "active"
                      ? colors.primary + "20"
                      : colors.border,
                  borderColor:
                    step.status === "done"
                      ? colors.accent + "50"
                      : step.status === "active"
                      ? colors.primary + "60"
                      : colors.border,
                },
              ]}
            >
              {step.status === "done" ? (
                <Feather name="check" size={11} color={colors.accent} />
              ) : step.status === "active" ? (
                <PulsingDot color={colors.primary} />
              ) : (
                <View style={[styles.pendingDot, { backgroundColor: colors.textTertiary }]} />
              )}
            </View>

            {/* Label + duration */}
            <View style={styles.stepContent}>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color:
                      step.status === "done"
                        ? colors.textSecondary
                        : step.status === "active"
                        ? colors.text
                        : colors.textTertiary,
                    textDecorationLine: step.status === "done" ? "line-through" : "none",
                  },
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
              {step.duration && (
                <Text style={[styles.stepDuration, { color: colors.textTertiary }]}>
                  {step.duration}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* First-screen approval prompt */}
      {showApprovalPrompt && (
        <View style={[styles.approvalBox, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <View style={styles.approvalHeader}>
            <Feather name="eye" size={14} color={colors.primary} />
            <Text style={[styles.approvalTitle, { color: colors.primary }]}>
              First screen ready — approve to continue
            </Text>
          </View>
          <Text style={[styles.approvalSub, { color: colors.textSecondary }]}>
            Review the first screen before the rest of the build continues.
          </Text>
          <View style={styles.approvalBtns}>
            <TouchableOpacity
              style={[styles.approveBtn, { backgroundColor: colors.primary }]}
              onPress={onApproveFirstScreen}
              activeOpacity={0.8}
            >
              <Feather name="check" size={14} color="#F9FAFB" />
              <Text style={styles.approveBtnText}>Looks good — continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.changeBtn, { borderColor: colors.border }]}
              onPress={onChangeDirection}
              activeOpacity={0.7}
            >
              <Text style={[styles.changeBtnText, { color: colors.textSecondary }]}>Change direction</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 10,
    marginVertical: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  stageLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pctRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pctText: {
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: -4,
  },
  stepList: {
    maxHeight: 220,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
    position: "relative",
  },
  connector: {
    position: "absolute",
    left: 13,
    top: 28,
    width: 2,
    height: 18,
    borderRadius: 1,
  },
  stepIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  stepDuration: {
    fontSize: 11,
  },
  approvalBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginTop: 4,
  },
  approvalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  approvalTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  approvalSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  approvalBtns: {
    gap: 8,
    marginTop: 4,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
  },
  approveBtnText: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "700",
  },
  changeBtn: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
