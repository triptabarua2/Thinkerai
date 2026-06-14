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
      return () => { pulse.stop(); pulseAnim.setValue(1); };
    }
  }, [isStreaming, pulseAnim]);

  return (
    <>
      {/* Agent pill button */}
      <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => !isStreaming && setShowPicker(true)}
          style={[
            styles.pill,
            {
              backgroundColor: agent.color + "18",
              borderColor: agent.color + "55",
            },
          ]}
        >
          <View style={[styles.pillIcon, { backgroundColor: agent.color + "30" }]}>
            <Feather name={agent.icon as any} size={14} color={agent.color} />
          </View>
          <Text style={[styles.pillName, { color: agent.color }]}>{agent.name}</Text>
          {!isStreaming && (
            <Feather name="chevron-down" size={14} color={agent.color} />
          )}
        </TouchableOpacity>

        {/* Status */}
        <View style={styles.statusRow}>
          {isStreaming ? (
            <Text style={[styles.statusText, { color: colors.textTertiary }]}>
              {agent.description}...
            </Text>
          ) : (
            <Text style={[styles.statusText, { color: colors.textTertiary }]}>
              Tap to switch agent
            </Text>
          )}
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: agent.color, opacity: isStreaming ? pulseAnim : 0.5 },
            ]}
          />
        </View>
      </View>

      {/* Agent picker modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Switch Agent</Text>
          <Text style={[styles.sheetSub, { color: colors.textTertiary }]}>
            {AGENT_LIST.length} specialized agents available
          </Text>

          <FlatList
            data={AGENT_LIST}
            keyExtractor={(a) => a.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isActive = item.id === agentType;
              return (
                <TouchableOpacity
                  style={[
                    styles.agentCard,
                    {
                      backgroundColor: isActive ? item.color + "20" : colors.card,
                      borderColor: isActive ? item.color + "80" : colors.border,
                      flex: 1,
                    },
                  ]}
                  onPress={() => { setShowPicker(false); onAgentChange?.(item.id); }}
                  activeOpacity={0.75}
                >
                  {isActive && (
                    <View style={[styles.activeCheck, { backgroundColor: item.color }]}>
                      <Feather name="check" size={9} color="#fff" />
                    </View>
                  )}
                  <View style={[styles.cardIcon, { backgroundColor: item.color + "22" }]}>
                    <Feather name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.cardCap, { color: colors.textTertiary }]} numberOfLines={2}>
                    {item.capability}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pillName: {
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: 0.1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "400" as const,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#00000055",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    maxHeight: "78%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  sheetSub: {
    fontSize: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  agentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 6,
    position: "relative",
  },
  activeCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  cardName: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  cardCap: {
    fontSize: 11,
    lineHeight: 15,
  },
});
