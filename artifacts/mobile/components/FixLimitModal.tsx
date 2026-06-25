import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  limitType: "medium" | "rebuild";
  onScopeDown: () => void;
  onStartFresh: () => void;
  onDismiss: () => void;
}

const MESSAGES = {
  medium: {
    icon: "tool" as const,
    title: "10 fixes reached",
    body: "You've made 10 medium fixes on this project. Continuing may produce inconsistent results. The best next step is to narrow scope or start fresh with everything you've learned.",
    color: "#F59E0B",
  },
  rebuild: {
    icon: "refresh-cw" as const,
    title: "3 rebuilds reached",
    body: "You've fully rebuilt this project 3 times. Each rebuild costs 50 credits. Before rebuilding again, consider narrowing the requirements to 1-2 core features first.",
    color: "#EF4444",
  },
};

export function FixLimitModal({ visible, limitType, onScopeDown, onStartFresh, onDismiss }: Props) {
  const colors = useColors();
  const msg = MESSAGES[limitType];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onDismiss} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: msg.color + "18" }]}>
            <Feather name={msg.icon} size={24} color={msg.color} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{msg.title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{msg.body}</Text>

          {/* Options */}
          <View style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.option} onPress={onScopeDown} activeOpacity={0.75}>
              <View style={[styles.optionIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="scissors" size={16} color={colors.primary} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Narrow scope</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Tell me the 1 most important thing to fix
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.sep, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.option} onPress={onStartFresh} activeOpacity={0.75}>
              <View style={[styles.optionIcon, { backgroundColor: "#10B98115" }]}>
                <Feather name="plus-circle" size={16} color="#10B981" />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Start fresh</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  New chat with all your requirements
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.dismissBtn, { borderColor: colors.border }]}
            onPress={onDismiss}
            activeOpacity={0.75}
          >
            <Text style={[styles.dismissText, { color: colors.textSecondary }]}>
              Continue anyway
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  sheet: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 14,
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
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  optionCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  optionDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  dismissBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
