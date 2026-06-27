import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  imageUri?: string;
  description: string;
  attemptNumber: number;
  maxAttempts: number;
  isLoading?: boolean;
  onApprove: () => void;
  onRevise: (instruction: string) => void;
  onRegenerate: () => void;
}

export function ImageOutputCard({
  imageUri,
  description,
  attemptNumber,
  maxAttempts,
  isLoading = false,
  onApprove,
  onRevise,
  onRegenerate,
}: Props) {
  const colors = useColors();
  const [showRevise, setShowRevise] = useState(false);
  const attemptsLeft = maxAttempts - attemptNumber;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.headerBadge, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="image" size={12} color={colors.primary} />
          <Text style={[styles.headerBadgeText, { color: colors.primary }]}>Design Agent</Text>
        </View>
        <View style={[styles.attemptBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.attemptText, { color: colors.textSecondary }]}>
            Attempt {attemptNumber}/{maxAttempts}
          </Text>
        </View>
      </View>

      <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Generating image…</Text>
          </View>
        ) : imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.loadingState}>
            <Feather name="image" size={32} color={colors.textTertiary} />
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>No image yet</Text>
          </View>
        )}
      </View>

      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}

      {!isLoading && imageUri && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.approveBtn, { backgroundColor: colors.success }]}
            onPress={onApprove}
            activeOpacity={0.8}
          >
            <Feather name="check" size={14} color="#fff" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setShowRevise(!showRevise)}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={13} color={colors.text} />
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Revise</Text>
          </TouchableOpacity>

          {attemptsLeft > 0 && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={onRegenerate}
              activeOpacity={0.7}
            >
              <Feather name="refresh-cw" size={13} color={colors.text} />
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                Regenerate ({attemptsLeft} left)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {attemptsLeft === 0 && !isLoading && (
        <View style={[styles.limitRow, { backgroundColor: colors.warning + "14" }]}>
          <Feather name="alert-circle" size={12} color={colors.warning} />
          <Text style={[styles.limitText, { color: colors.warning }]}>
            Maximum regeneration attempts reached
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 12,
    marginVertical: 6,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerBadgeText: { fontSize: 11, fontWeight: "600" as const },
  attemptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  attemptText: { fontSize: 11 },
  imageContainer: {
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  loadingState: { alignItems: "center", gap: 10 },
  loadingText: { fontSize: 13, marginTop: 4 },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: 14,
    marginTop: 10,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  approveBtnText: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 13 },
  limitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  limitText: { fontSize: 12, fontWeight: "600" as const },
});
