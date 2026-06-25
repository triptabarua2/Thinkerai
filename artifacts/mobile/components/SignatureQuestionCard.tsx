import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Colors {
  surface: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  background: string;
}

interface Props {
  question: string;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
  colors: Colors;
}

export function SignatureQuestionCard({ question, onAnswer, onSkip, colors }: Props) {
  const [answer, setAnswer] = useState("");

  function handleSubmit() {
    if (answer.trim()) {
      onAnswer(answer.trim());
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary + "40" }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
          <Feather name="key" size={16} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.primary }]}>Signature Question</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            This one question stops more wrong projects than any technical review.
          </Text>
        </View>
      </View>

      <Text style={[styles.question, { color: colors.text }]}>{question}</Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="Type your answer here..."
        placeholderTextColor={colors.textSecondary}
        value={answer}
        onChangeText={setAnswer}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.skipBtn, { borderColor: colors.border }]}
          onPress={onSkip}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: answer.trim() ? colors.primary : colors.primary + "40" },
          ]}
          onPress={handleSubmit}
          disabled={!answer.trim()}
        >
          <Feather name="arrow-right" size={14} color="#fff" />
          <Text style={styles.submitText}>Proceed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
  question: {
    fontSize: 15,
    fontWeight: "600" as const,
    lineHeight: 22,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  submitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
});
