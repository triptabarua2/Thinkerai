import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import type { AgentType } from "@/lib/agents";
import { AGENTS } from "@/lib/agents";
import { useColors } from "@/hooks/useColors";

interface Props {
  agentType: AgentType;
  isStreaming: boolean;
}

export function AgentPanel({ agentType, isStreaming }: Props) {
  const colors = useColors();
  const agent = AGENTS[agentType] ?? AGENTS.ceo;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isStreaming) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      glow.start();
      return () => {
        pulse.stop();
        glow.stop();
        pulseAnim.setValue(1);
        glowAnim.setValue(0);
      };
    }
  }, [isStreaming, pulseAnim, glowAnim]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: agent.color + "22" }]}>
          <Feather name={agent.icon as any} size={13} color={agent.color} />
        </View>
        <Text style={[styles.name, { color: colors.textSecondary }]}>
          {agent.name}
        </Text>
      </View>

      <View style={styles.right}>
        {isStreaming && (
          <Text style={[styles.status, { color: agent.color }]}>
            {agent.description}...
          </Text>
        )}
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: agent.color,
              opacity: isStreaming ? pulseAnim : 0.5,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.2,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  status: {
    fontSize: 11,
    fontWeight: "500" as const,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
