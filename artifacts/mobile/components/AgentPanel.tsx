import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  SectionList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AGENT_LIST, AGENTS, type AgentType } from "@/lib/agents";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useColors } from "@/hooks/useColors";

const PRO_TEAL = "#0D9488";

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
  const [showUpgrade, setShowUpgrade] = useState(false);

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
      setShowPicker(false);
      setShowUpgrade(true);
      return;
    }
    setShowPicker(false);
    onAgentChange?.(selectedId);
  }

  const freeAgents = AGENT_LIST.filter((a) => a.planTier === "free");
  const proAgents  = AGENT_LIST.filter((a) => a.planTier === "pro");

  // Pair agents into rows of 2 for the grid layout
  type AgentDef = typeof freeAgents[number];
  type AgentRow = [AgentDef, AgentDef | null];
  function pairRows(list: AgentDef[]): AgentRow[] {
    const rows: AgentRow[] = [];
    for (let i = 0; i < list.length; i += 2) {
      rows.push([list[i], list[i + 1] ?? null]);
    }
    return rows;
  }

  const sections = [
    { key: "free", data: pairRows(freeAgents) },
    { key: "pro",  data: pairRows(proAgents)  },
  ];

  function renderAgentCard(item: AgentDef, isPro: boolean) {
    const isActive = item.id === agentType;
    const locked   = isPro && !userCanUseProAgents;
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.agentCard,
          {
            backgroundColor: isActive ? colors.primary + "20" : colors.card,
            borderColor: isActive
              ? colors.primary + "80"
              : locked ? PRO_TEAL + "35" : colors.border,
            opacity: locked ? 0.72 : 1,
            flex: 1,
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
        {isPro && (
          <View style={styles.proCrown}>
            <Text style={styles.proCrownText}>PRO</Text>
          </View>
        )}
        {locked && (
          <View style={styles.lockOverlay}>
            <View style={styles.lockIconWrap}>
              <Feather name="lock" size={12} color={PRO_TEAL} />
            </View>
          </View>
        )}
        <View style={[styles.cardIcon, { backgroundColor: isActive ? colors.primary + "22" : item.color + "22" }]}>
          <Feather name={item.icon as any} size={18} color={isActive ? colors.primary : item.color} />
        </View>
        <Text style={[styles.cardName, { color: locked ? colors.textTertiary : colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.cardCap, { color: colors.textTertiary }]} numberOfLines={2}>
          {item.capability}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      {/* Agent pill */}
      <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => !isStreaming && setShowPicker(true)}
          style={[styles.pill, { backgroundColor: agent.color + "18", borderColor: agent.color + "55" }]}
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
          {!isStreaming && <Feather name="chevron-down" size={14} color={agent.color} />}
        </TouchableOpacity>

        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: colors.textTertiary }]}>
            {isStreaming ? `${agent.description}...` : "Tap to switch agent"}
          </Text>
          <Animated.View
            style={[styles.dot, { backgroundColor: agent.color, opacity: isStreaming ? pulseAnim : 0.5 }]}
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
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPicker(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Switch Agent</Text>
          <Text style={[styles.sheetSub, { color: colors.textTertiary }]}>
            {freeAgents.length} free · {proAgents.length} pro agents
          </Text>

          {/* Single SectionList — scrollable, no nested ScrollView */}
          <SectionList
            sections={sections}
            keyExtractor={(row, i) => `${row[0].id}-${i}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) =>
              section.key === "free" ? (
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>FREE</Text>
              ) : (
                <View style={styles.proSectionHeader}>
                  <Text style={[styles.sectionLabel, { color: PRO_TEAL }]}>PRO</Text>
                  {!userCanUseProAgents && (
                    <TouchableOpacity
                      style={styles.upgradeBadge}
                      onPress={() => { setShowPicker(false); setShowUpgrade(true); }}
                      activeOpacity={0.8}
                    >
                      <Feather name="lock" size={10} color={PRO_TEAL} />
                      <Text style={styles.upgradeText}>Upgrade to unlock</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            }
            renderItem={({ item: row, section }) => {
              const isPro = section.key === "pro";
              return (
                <View style={styles.cardRow}>
                  {renderAgentCard(row[0], isPro)}
                  {row[1]
                    ? renderAgentCard(row[1], isPro)
                    : <View style={{ flex: 1 }} />
                  }
                </View>
              );
            }}
          />
        </View>
      </Modal>

      {/* Upgrade sheet */}
      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
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
    backgroundColor: PRO_TEAL + "20",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: PRO_TEAL + "55",
  },
  pillProText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: PRO_TEAL,
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
    maxHeight: "84%",
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
    marginTop: 4,
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
    backgroundColor: PRO_TEAL + "15",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: PRO_TEAL + "35",
  },
  upgradeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: PRO_TEAL,
  },
  cardRow: {
    flexDirection: "row" as const,
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
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
    backgroundColor: PRO_TEAL + "18",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: PRO_TEAL + "45",
  },
  proCrownText: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: PRO_TEAL,
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
    backgroundColor: PRO_TEAL + "15",
    borderWidth: 1,
    borderColor: PRO_TEAL + "45",
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
