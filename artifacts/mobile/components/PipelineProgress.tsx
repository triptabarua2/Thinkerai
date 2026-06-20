import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export type AgentStatus = "idle" | "running" | "done" | "retried";

export interface AgentStep {
  id: string;
  label: string;
  icon: string;
  status: AgentStatus;
  detail?: string;
}

interface Props {
  steps: AgentStep[];
  visible: boolean;
}

const AGENT_META: Record<string, { icon: string; color: string }> = {
  intent:        { icon: "compass",    color: "#7B61FF" },
  clarification: { icon: "help-circle",color: "#3B9EFF" },
  planner:       { icon: "map",        color: "#00C896" },
  research:      { icon: "search",     color: "#FF9F0A" },
  builder:       { icon: "code",       color: "#30D158" },
  reviewer:      { icon: "check-circle",color: "#64D2FF" },
  critic:        { icon: "alert-circle",color: "#FF9F0A" },
  judge:         { icon: "award",      color: "#BF5AF2" },
  consensus:     { icon: "users",      color: "#FF375F" },
};

function AgentDot({ step }: { step: AgentStep }) {
  const colors = useColors();
  const meta = AGENT_META[step.id] ?? { icon: "cpu", color: colors.primary };
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step.status === "running") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [step.status]);

  const isRunning = step.status === "running";
  const isDone    = step.status === "done" || step.status === "retried";
  const isIdle    = step.status === "idle";

  const dotColor = isIdle ? colors.border : meta.color;

  return (
    <View style={styles.agentRow}>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: isDone ? meta.color + "22" : isRunning ? meta.color + "33" : "transparent",
            borderColor: dotColor,
            transform: [{ scale: isRunning ? pulse : 1 }],
          },
        ]}
      >
        <Feather
          name={isDone ? "check" : (meta.icon as any)}
          size={10}
          color={isIdle ? colors.textTertiary : meta.color}
        />
      </Animated.View>
      <Text
        style={[
          styles.agentLabel,
          {
            color: isIdle ? colors.textTertiary : isRunning ? colors.text : colors.textSecondary,
            fontWeight: isRunning ? "600" : "400",
          },
        ]}
        numberOfLines={1}
      >
        {step.label}
      </Text>
      {step.status === "retried" && (
        <View style={[styles.retryBadge, { backgroundColor: "#FF9F0A22" }]}>
          <Text style={styles.retryText}>retry</Text>
        </View>
      )}
    </View>
  );
}

export default function PipelineProgress({ steps, visible }: Props) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (steps.length === 0) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border, opacity },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.headerDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.headerText, { color: colors.textSecondary }]}>
          Thinker AI Pipeline
        </Text>
      </View>
      <View style={styles.steps}>
        {steps.map((step) => (
          <AgentDot key={step.id} step={step} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  steps: {
    gap: 4,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  agentLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  retryBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  retryText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FF9F0A",
    textTransform: "uppercase",
  },
});
