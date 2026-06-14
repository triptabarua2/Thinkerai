import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AGENT_LIST, AGENTS, type AgentType } from "@/lib/agents";
import { useColors } from "@/hooks/useColors";

interface Props {
  agentType: AgentType;
  isStreaming: boolean;
  onAgentChange?: (agent: AgentType) => void;
}

export function AgentPanel({ agentType, isStreaming, onAgentChange }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const agent = AGENTS[agentType] ?? AGENTS.ceo;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (isStreaming) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => {
        pulse.stop();
        pulseAnim.setValue(1);
      };
    }
  }, [isStreaming, pulseAnim]);

  function selectAgent(id: AgentType) {
    setShowPicker(false);
    onAgentChange?.(id);
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={onAgentChange ? 0.7 : 1}
        onPress={() => onAgentChange && !isStreaming && setShowPicker(true)}
        style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.left}>
          <View style={[styles.iconWrap, { backgroundColor: agent.color + "22" }]}>
            <Feather name={agent.icon as any} size={13} color={agent.color} />
          </View>
          <Text style={[styles.name, { color: colors.textSecondary }]}>{agent.name}</Text>
          {onAgentChange && !isStreaming && (
            <Feather name="chevron-down" size={12} color={colors.textTertiary} style={{ marginLeft: 2 }} />
          )}
        </View>

        <View style={styles.right}>
          {isStreaming && (
            <Text style={[styles.status, { color: agent.color }]}>{agent.description}...</Text>
          )}
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: agent.color, opacity: isStreaming ? pulseAnim : 0.45 },
            ]}
          />
        </View>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Choose Agent</Text>
            <FlatList
              data={AGENT_LIST}
              keyExtractor={(a) => a.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isActive = item.id === agentType;
                return (
                  <TouchableOpacity
                    style={[
                      styles.agentCard,
                      {
                        backgroundColor: isActive ? item.color + "18" : colors.card,
                        borderColor: isActive ? item.color + "60" : colors.border,
                        flex: 1,
                      },
                    ]}
                    onPress={() => selectAgent(item.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.agentIconWrap, { backgroundColor: item.color + "22" }]}>
                      <Feather name={item.icon as any} size={16} color={item.color} />
                    </View>
                    <Text style={[styles.agentName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.agentCap, { color: colors.textTertiary }]} numberOfLines={2}>
                      {item.capability}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
  overlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  agentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  agentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  agentName: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  agentCap: {
    fontSize: 11,
    lineHeight: 15,
  },
});
