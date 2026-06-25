import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface BlueprintStep {
  id: string;
  description: string;
  outputType: "code" | "text" | "config" | "image";
  dependencies: string[];
  needsResearch: boolean;
}

interface Props {
  steps: BlueprintStep[];
  techStack: string;
  estimatedComplexity: string;
  onApprove: () => void;
  onModify: (feedback: string) => void;
  onStartOver: () => void;
  colors: Record<string, string>;
}

const OUTPUT_ICONS: Record<string, string> = {
  code: "code",
  text: "file-text",
  config: "settings",
  image: "image",
};

const OUTPUT_COLORS: Record<string, string> = {
  code: "#6C63FF",
  text: "#10B981",
  config: "#F59E0B",
  image: "#EC4899",
};

export function BlueprintApprovalCard({ steps, techStack, estimatedComplexity, onApprove, onModify, onStartOver, colors }: Props) {
  const [modifyMode, setModifyMode] = useState(false);
  const [feedback, setFeedback] = useState("");

  const complexityColor =
    estimatedComplexity === "Simple" ? "#10B981" :
    estimatedComplexity === "Medium" ? "#F59E0B" : "#EF4444";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: "#6C63FF20" }]}>
          <Feather name="map" size={18} color="#6C63FF" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Blueprint Ready</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Review the plan before I start building
          </Text>
        </View>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <View style={[styles.metaBadge, { backgroundColor: complexityColor + "20" }]}>
          <Text style={[styles.metaText, { color: complexityColor }]}>
            {estimatedComplexity}
          </Text>
        </View>
        <View style={[styles.metaBadge, { backgroundColor: colors.primary + "15" }]}>
          <Feather name="layers" size={11} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.primary }]}>
            {steps.length} steps
          </Text>
        </View>
      </View>

      {/* Steps */}
      <ScrollView style={styles.stepsList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {steps.map((step, i) => (
          <View key={step.id} style={[styles.stepRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.stepNum, { color: colors.primary }]}>{i + 1}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepDesc, { color: colors.text }]}>{step.description}</Text>
              <View style={styles.stepMeta}>
                <View style={[styles.typeBadge, { backgroundColor: (OUTPUT_COLORS[step.outputType] ?? "#999") + "20" }]}>
                  <Feather
                    name={(OUTPUT_ICONS[step.outputType] ?? "file") as any}
                    size={10}
                    color={OUTPUT_COLORS[step.outputType] ?? "#999"}
                  />
                  <Text style={[styles.typeText, { color: OUTPUT_COLORS[step.outputType] ?? "#999" }]}>
                    {step.outputType}
                  </Text>
                </View>
                {step.needsResearch && (
                  <View style={[styles.typeBadge, { backgroundColor: "#F59E0B20" }]}>
                    <Feather name="search" size={10} color="#F59E0B" />
                    <Text style={[styles.typeText, { color: "#F59E0B" }]}>research</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Tech stack */}
      <View style={[styles.techRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Feather name="cpu" size={12} color={colors.textSecondary} />
        <Text style={[styles.techText, { color: colors.textSecondary }]}>{techStack}</Text>
      </View>

      {/* Actions */}
      {!modifyMode ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.approveBtn, { backgroundColor: colors.primary }]}
            onPress={onApprove}
            activeOpacity={0.85}
          >
            <Feather name="check" size={16} color="#fff" />
            <Text style={styles.approveBtnText}>Looks good, start building</Text>
          </TouchableOpacity>
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setModifyMode(true)}
              activeOpacity={0.75}
            >
              <Feather name="edit-2" size={13} color={colors.textSecondary} />
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Change something</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={onStartOver}
              activeOpacity={0.75}
            >
              <Feather name="rotate-ccw" size={13} color={colors.textSecondary} />
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Start over</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.modifyWrap}>
          <Text style={[styles.modifyLabel, { color: colors.text }]}>What would you like to change?</Text>
          <View style={[styles.modifyInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text
              style={[styles.modifyPlaceholder, { color: feedback ? colors.text : colors.textTertiary }]}
              onPress={() => {}}
            >
              {feedback || "Describe the change (e.g. 'add a login screen', 'remove the settings page')..."}
            </Text>
          </View>
          <View style={styles.modifyActions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => setModifyMode(false)}
              activeOpacity={0.75}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={() => onModify(feedback || "Please suggest improvements to this blueprint")}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "600",
  },
  stepsList: {
    maxHeight: 220,
    marginHorizontal: 12,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: "700",
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  stepMeta: {
    flexDirection: "row",
    gap: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  techRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    margin: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  techText: {
    fontSize: 11,
    flex: 1,
  },
  actions: {
    padding: 12,
    paddingTop: 4,
    gap: 8,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  approveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modifyWrap: {
    padding: 12,
    gap: 8,
  },
  modifyLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  modifyInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    minHeight: 70,
  },
  modifyPlaceholder: {
    fontSize: 13,
    lineHeight: 18,
  },
  modifyActions: {
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 2,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
