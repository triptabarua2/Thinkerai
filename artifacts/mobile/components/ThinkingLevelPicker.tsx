import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export type ThinkingLevel = "low" | "medium" | "high" | "consensus";

interface LevelDef {
  id: ThinkingLevel;
  label: string;
  icon: string;
  dots: number;
  credits: string;
  description: string;
  color: string;
}

const LEVELS: LevelDef[] = [
  {
    id: "low",
    label: "Low",
    icon: "zap",
    dots: 1,
    credits: "1 credit",
    description: "Fast answers, direct chat",
    color: "#00C47A",
  },
  {
    id: "medium",
    label: "Medium",
    icon: "cpu",
    dots: 2,
    credits: "~9 credits",
    description: "Analysis, comparisons, recommendations",
    color: "#00C8E0",
  },
  {
    id: "high",
    label: "High",
    icon: "layers",
    dots: 3,
    credits: "~66 credits",
    description: "Deep planning, full project builds",
    color: "#7B61FF",
  },
  {
    id: "consensus",
    label: "Consensus",
    icon: "users",
    dots: 4,
    credits: "~75 credits",
    description: "Multi-model validation, startup ideas",
    color: "#E6A500",
  },
];

function Dots({ count, color, size = 6 }: { count: number; color: string; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2, alignItems: "center" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: i < count ? color : color + "30",
          }}
        />
      ))}
    </View>
  );
}

interface Props {
  value: ThinkingLevel;
  onChange: (level: ThinkingLevel) => void;
  disabled?: boolean;
}

export function ThinkingLevelPicker({ value, onChange, disabled = false }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const current = LEVELS.find((l) => l.id === value) ?? LEVELS[1];

  function select(level: ThinkingLevel) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(level);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.badge,
          {
            backgroundColor: current.color + "18",
            borderColor: current.color + "40",
          },
        ]}
        onPress={() => {
          if (!disabled) setOpen(true);
        }}
        activeOpacity={0.7}
      >
        <Dots count={current.dots} color={current.color} size={5} />
        <Text style={[styles.badgeLabel, { color: current.color }]}>
          {current.label}
        </Text>
        <Feather name="chevron-up" size={10} color={current.color} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            Thinking Level
          </Text>
          <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
            More thinking = more questions = more validation
          </Text>

          <View style={styles.levels}>
            {LEVELS.map((level) => {
              const active = value === level.id;
              return (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.levelRow,
                    {
                      backgroundColor: active ? level.color + "12" : colors.surface,
                      borderColor: active ? level.color + "60" : colors.border,
                    },
                  ]}
                  onPress={() => select(level.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.levelIcon,
                      { backgroundColor: level.color + "20" },
                    ]}
                  >
                    <Feather
                      name={level.icon as keyof typeof Feather.glyphMap}
                      size={16}
                      color={level.color}
                    />
                  </View>

                  <View style={styles.levelInfo}>
                    <View style={styles.levelHeader}>
                      <Text style={[styles.levelName, { color: colors.text }]}>
                        {level.label} Thinking
                      </Text>
                      <Dots count={level.dots} color={level.color} size={7} />
                    </View>
                    <Text style={[styles.levelDesc, { color: colors.textSecondary }]}>
                      {level.description}
                    </Text>
                  </View>

                  <View style={styles.levelRight}>
                    <Text style={[styles.levelCredits, { color: level.color }]}>
                      {level.credits}
                    </Text>
                    {active && (
                      <Feather name="check" size={14} color={level.color} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Feather name="info" size={12} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Credits deducted only after each agent completes successfully
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    textAlign: "center",
  },
  sheetSub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 4,
  },
  levels: {
    gap: 8,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  levelIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  levelInfo: {
    flex: 1,
    gap: 3,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelName: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  levelDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  levelRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  levelCredits: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 4,
  },
  footerText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
});
