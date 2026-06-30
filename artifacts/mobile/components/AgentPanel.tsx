import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
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

const PRO_GOLD = "#FFB800";

interface Props {
  agentType: AgentType;
  isStreaming: boolean;
  planTier?: "free" | "pro" | "founder";
  onAgentChange?: (agent: AgentType) => void;
}

export function AgentPanel({ agentType, isStreaming, planTier = "free", onAgentChange }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const agent = AGENTS[agentType] ?? AGENTS.ceo;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showPicker, setShowPicker] = useState(false);

  const userCanUseProAgents = planTier === "pro" || planTier === "founder";

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

  function handleAgentSelect(selectedId: AgentType) {
    const selected = AGENTS[selectedId];
    if (selected.planTier === "pro" && !userCanUseProAgents) {
      Alert.alert(
        "Pro Agent",
        `${selected.name} is available on the Pro plan.\n\nUpgrade to unlock all 8 Pro agents including ${selected.name}.`,
        [
          { text: "Not Now", style: "cancel" },
          { text: "Upgrade to Pro →", style: "default", onPress: () => {} },
        ]
      );
      return;
    }
    setShowPicker(false);
    onAgentChange?.(selectedId);
  }

  // Split agents into free + pro sections
  const freeAgents = AGENT_LIST.filter((a) => a.planTier === "free");
  const proAgents = AGENT_LIST.filter((a) => a.planTier === "pro");

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
          {agent.planTier === "pro" && (
            <View style={styles.pillProBadge}>
              <Text style={styles.pillProText}>PRO</Text>
            </View>
          )}
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
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Switch Agent</Text>
          <Text style={[styles.sheetSub, { color: colors.textTertiary }]}>
            {freeAgents.length} free · {proAgents.length} pro agents available
          </Text>

          {/* Free section */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>FREE</Text>
          <FlatList
            data={freeAgents}
            keyExtractor={(a) => a.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const isActive = item.id === agentType;
              return (
                <TouchableOpacity
                  style={[
                    styles.agentCard,
                    {
                      backgroundColor: isActive ? colors.primary + "20" : colors.card,
                      borderColor: isActive ? colors.primary + "80" : colors.border,
                      flex: 1,
                    },
                  ]}
                  onPress={() => handleAgentSelect(item.id)}
                  activeOpacity={0.75}
                >
                  {isActive && (
                    <View style={[styles.activeCheck, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={9} color="#fff" />
                    </View>
                  )}
                  <View style={[styles.cardIcon, { backgroundColor: isActive ? colors.primary + "22" : item.color + "22" }]}>
                    <Feather name={item.icon as any} size={18} color={isActive ? colors.primary : item.color} />
                  </View>
                  <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.cardCap, { color: colors.textTertiary }]} numberOfLines={2}>
                    {item.capability}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Pro section */}
          <View style={styles.proSectionHeader}>
            <Text style={[styles.sectionLabel, { color: PRO_GOLD }]}>PRO</Text>
            {!userCanUseProAgents && (
              <View style={styles.upgradeBadge}>
                <Feather name="lock" size={10} color={PRO_GOLD} />
                <Text style={styles.upgradeText}>Upgrade to unlock</Text>
              </View>
            )}
          </View>
          <FlatList
            data={proAgents}
            keyExtractor={(a) => a.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const isActive = item.id === agentType;
              const locked = !userCanUseProAgents;
              return (
                <TouchableOpacity
                  style={[
                    styles.agentCard,
                    {
                      backgroundColor: isActive ? colors.primary + "20" : locked ? colors.card : colors.card,
                      borderColor: isActive ? colors.primary + "80" : locked ? PRO_GOLD + "40" : colors.border,
                      flex: 1,
                      opacity: locked ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => handleAgentSelect(item.id)}
                  activeOpacity={0.75}
                >
                  {isActive && !locked && (
                    <View style={[styles.activeCheck, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={9} color="#fff" />
                    </View>
                  )}
                  {/* Pro crown badge */}
                  <View style={styles.proCrown}>
                    <Text style={styles.proCrownText}>PRO</Text>
                  </View>

                  {/* Lock overlay for non-pro users */}
                  {locked && (
                    <View style={styles.lockOverlay}>
                      <View style={styles.lockIconWrap}>
                        <Feather name="lock" size={13} color={PRO_GOLD} />
                      </View>
                    </View>
                  )}

                  <View style={[styles.cardIcon, { backgroundColor: locked ? item.color + "18" : item.color + "22" }]}>
                    <Feather name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={[styles.cardName, { color: locked ? colors.textTertiary : colors.text }]}>
                    {item.name}
                  </Text>
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
  pillProBadge: {
    backgroundColor: PRO_GOLD + "25",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: PRO_GOLD + "60",
  },
  pillProText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: PRO_GOLD,
    letterSpacing: 0.5,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    maxHeight: "82%",
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
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  proSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 16,
    marginTop: 8,
  },
  upgradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PRO_GOLD + "18",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: PRO_GOLD + "40",
  },
  upgradeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: PRO_GOLD,
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
  proCrown: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: PRO_GOLD + "22",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: PRO_GOLD + "50",
  },
  proCrownText: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: PRO_GOLD,
    letterSpacing: 0.5,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 13,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 8,
  },
  lockIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: PRO_GOLD + "18",
    borderWidth: 1,
    borderColor: PRO_GOLD + "50",
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
