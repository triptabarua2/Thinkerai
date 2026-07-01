import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AGENTS, type AgentType } from "@/lib/agents";
import { useColors } from "@/hooks/useColors";

const INPUT_MIN_H = 36;
const INPUT_MAX_H = 120;

const CREDIT_COSTS: Record<string, number> = {
  low: 1,
  medium: 3,
  high: 10,
  consensus: 30,
};

const LEVEL_LABELS: Record<string, string> = {
  low: "■ Low",
  medium: "■■ Mid",
  high: "■■■ High",
  consensus: "■■■■ Consensus",
};

type ThinkingLevel = "low" | "medium" | "high" | "consensus";
const LEVEL_ORDER: ThinkingLevel[] = ["low", "medium", "high", "consensus"];

interface Props {
  onSend: (text: string, level: ThinkingLevel) => void;
  onAttach?: () => void;
  disabled?: boolean;
  placeholder?: string;
  creditBalance?: number;
  agentType?: AgentType;
}

export function ChatInput({
  onSend,
  onAttach,
  disabled = false,
  placeholder,
  creditBalance = 50,
  agentType,
}: Props) {
  const colors = useColors();
  const [text, setText] = useState("");
  const [level, setLevel] = useState<ThinkingLevel>("medium");
  const [inputH, setInputH] = useState(INPUT_MIN_H);
  const heightAnim = useRef(new Animated.Value(INPUT_MIN_H)).current;
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const agentDef = agentType ? AGENTS[agentType] : null;
  const resolvedPlaceholder =
    placeholder ?? agentDef?.placeholder ?? "Message Thinker AI...";

  const canSend = text.trim().length > 0 && !disabled;
  const estimatedCredits = CREDIT_COSTS[level];
  const canAfford = creditBalance >= estimatedCredits;

  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: inputH,
      useNativeDriver: false,
      damping: 22,
      stiffness: 280,
      mass: 0.7,
    }).start();
  }, [inputH]);

  function cycleLevel() {
    Haptics.selectionAsync();
    const idx = LEVEL_ORDER.indexOf(level);
    setLevel(LEVEL_ORDER[(idx + 1) % LEVEL_ORDER.length]);
  }

  function handleContentSizeChange(e: any) {
    if (!text) return;
    const h = e.nativeEvent.contentSize.height;
    const target = Math.min(Math.max(h, INPUT_MIN_H), INPUT_MAX_H);
    if (Math.abs(target - inputH) > 0.5) setInputH(target);
  }

  function handleSend() {
    if (!canSend) return;
    const content = text.trim();
    setText("");
    setInputH(INPUT_MIN_H);
    heightAnim.setValue(INPUT_MIN_H);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(content, level);
    inputRef.current?.focus();

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }

  return (
    <View style={styles.wrapper}>
      {text.trim().length > 0 && (
        <View style={[styles.chipRow]}>
          <View
            style={[
              styles.creditChip,
              {
                backgroundColor: canAfford ? colors.primary + "15" : colors.destructive + "15",
                borderColor: canAfford ? colors.primary + "40" : colors.destructive + "40",
              },
            ]}
          >
            <Feather
              name="zap"
              size={10}
              color={canAfford ? colors.primary : colors.destructive}
            />
            <Text
              style={[
                styles.chipText,
                { color: canAfford ? colors.primary : colors.destructive },
              ]}
            >
              ~{estimatedCredits} credits
            </Text>
          </View>
          <View style={[styles.balanceChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.balanceText, { color: colors.textSecondary }]}>
              Balance: {creditBalance}
            </Text>
          </View>
        </View>
      )}

      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onAttach}
          activeOpacity={0.6}
          hitSlop={8}
        >
          <Feather name="paperclip" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <Animated.View style={[styles.inputWrap, { height: heightAnim }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text, outlineStyle: "none" } as any]}
            value={text}
            onChangeText={setText}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={4000}
            blurOnSubmit={false}
            scrollEnabled={inputH >= INPUT_MAX_H}
            onContentSizeChange={handleContentSizeChange}
            onSubmitEditing={handleSend}
          />
        </Animated.View>

        <TouchableOpacity
          style={[
            styles.levelChip,
            { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35" },
          ]}
          onPress={cycleLevel}
          activeOpacity={0.7}
          hitSlop={4}
        >
          <Text style={[styles.levelText, { color: colors.primary }]}>
            {LEVEL_LABELS[level]}
          </Text>
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: canSend ? colors.primary : colors.border },
            ]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Feather
              name="arrow-up"
              size={18}
              color={canSend ? "#F9FAFB" : colors.textTertiary}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
  creditChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  balanceChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  balanceText: {
    fontSize: 11,
    fontWeight: "500",
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 28,
    borderWidth: 1,
    marginHorizontal: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    justifyContent: "center",
  },
  input: {
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 4,
  },
  levelChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  levelText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
