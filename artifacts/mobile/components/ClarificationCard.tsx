import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

export interface ClarifyQuestion {
  id: string;
  question: string;
  type: "choice" | "boolean" | "text";
  options?: string[];
}

export interface ClarifyData {
  confidence: number;
  intent: string;
  task_type: string;
  needs_clarification: boolean;
  reason: string;
  questions: ClarifyQuestion[];
}

interface Props {
  data: ClarifyData;
  originalMessage: string;
  onProceed: (answers: Record<string, string>) => void;
  onSkip: () => void;
}

export function ClarificationCard({ data, originalMessage, onProceed, onSkip }: Props) {
  const colors = useColors();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const allAnswered = data.questions.every((q) => answers[q.id] !== undefined && answers[q.id] !== "");
  const confidenceColor =
    data.confidence >= 70 ? "#00D48A" : data.confidence >= 50 ? "#FFB800" : "#FF4757";

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleProceed() {
    onProceed(answers);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: "#7B61FF20" }]}>
          <Feather name="cpu" size={16} color="#7B61FF" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Clarification Needed</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {data.intent}
          </Text>
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + "20" }]}>
          <Text style={[styles.confidenceNum, { color: confidenceColor }]}>
            {data.confidence}%
          </Text>
          <Text style={[styles.confidenceLabel, { color: confidenceColor }]}>sure</Text>
        </View>
      </View>

      {/* Confidence bar */}
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barFill,
            { width: `${data.confidence}%` as any, backgroundColor: confidenceColor },
          ]}
        />
      </View>

      {/* Questions */}
      <ScrollView style={styles.questions} showsVerticalScrollIndicator={false}>
        {data.questions.map((q, i) => (
          <View key={q.id} style={styles.questionBlock}>
            <Text style={[styles.questionNum, { color: colors.textSecondary }]}>
              {i + 1} of {data.questions.length}
            </Text>
            <Text style={[styles.questionText, { color: colors.text }]}>{q.question}</Text>

            {q.type === "choice" && q.options && (
              <View style={styles.options}>
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.optionBtn,
                        {
                          backgroundColor: selected ? "#7B61FF" : colors.surface,
                          borderColor: selected ? "#7B61FF" : colors.border,
                        },
                      ]}
                      onPress={() => setAnswer(q.id, opt)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: selected ? "#fff" : colors.text },
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {q.type === "boolean" && (
              <View style={styles.boolRow}>
                {["Yes", "No"].map((opt) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.boolBtn,
                        {
                          backgroundColor: selected
                            ? opt === "Yes"
                              ? "#00D48A"
                              : "#FF4757"
                            : colors.surface,
                          borderColor: selected
                            ? opt === "Yes"
                              ? "#00D48A"
                              : "#FF4757"
                            : colors.border,
                          flex: 1,
                        },
                      ]}
                      onPress={() => setAnswer(q.id, opt)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={opt === "Yes" ? "check" : "x"}
                        size={14}
                        color={selected ? "#fff" : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.boolText,
                          { color: selected ? "#fff" : colors.text },
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {q.type === "text" && (
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: answers[q.id] ? colors.primary : colors.border,
                    color: colors.text,
                    outlineStyle: "none",
                  } as any,
                ]}
                placeholder="Type your answer…"
                placeholderTextColor={colors.textSecondary}
                value={answers[q.id] ?? ""}
                onChangeText={(v) => setAnswer(q.id, v)}
                multiline
              />
            )}
          </View>
        ))}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.skipBtn, { borderColor: colors.border }]}
          onPress={onSkip}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.proceedBtn,
            { backgroundColor: allAnswered ? "#7B61FF" : colors.surface, opacity: allAnswered ? 1 : 0.5 },
          ]}
          onPress={handleProceed}
          disabled={!allAnswered}
          activeOpacity={0.8}
        >
          <Feather name="zap" size={14} color={allAnswered ? "#fff" : colors.textSecondary} />
          <Text style={[styles.proceedText, { color: allAnswered ? "#fff" : colors.textSecondary }]}>
            Proceed
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  confidenceBadge: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  confidenceNum: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  confidenceLabel: {
    fontSize: 9,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  barTrack: {
    height: 3,
    marginHorizontal: 14,
    borderRadius: 2,
    marginBottom: 4,
  },
  barFill: {
    height: 3,
    borderRadius: 2,
  },
  questions: {
    maxHeight: 320,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  questionBlock: {
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  questionNum: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  questionText: {
    fontSize: 14,
    fontWeight: "500" as const,
    lineHeight: 20,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  boolRow: {
    flexDirection: "row",
    gap: 10,
  },
  boolBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  boolText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingTop: 12,
  },
  skipBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  proceedBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 11,
    gap: 6,
  },
  proceedText: {
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: 0.3,
  },
});
