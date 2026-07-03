import { Feather } from "@expo/vector-icons";
import { getLocales } from "expo-localization";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SavePreferenceModal } from "@/components/SavePreferenceModal";
import { useColors } from "@/hooks/useColors";
import { useSavePreference } from "@/hooks/useSavePreference";

// Lazy-import native-only modules so they are never evaluated on web
let MediaLibrary: typeof import("expo-media-library") | null = null;
let FileSystemLegacy: {
  cacheDirectory: string | null;
  downloadAsync: (uri: string, fileUri: string) => Promise<{ uri: string }>;
} | null = null;

if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MediaLibrary = require("expo-media-library");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FileSystemLegacy = require("expo-file-system/legacy");
}

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

type SaveState = "idle" | "saving" | "saved" | "error";

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
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showPrefModal, setShowPrefModal] = useState(false);
  const { pref, loaded, savePref } = useSavePreference("image");

  // Track which URI was already auto-saved to prevent double-saves
  const autoSavedUri = useRef<string | null>(null);

  const attemptsLeft = maxAttempts - attemptNumber;

  // Returns true if the primary device locale is Bengali (bn, bn-BD, etc.)
  function isBengali(): boolean {
    const locales = getLocales();
    const first = locales[0];
    return (
      first?.languageCode === "bn" ||
      (first?.languageTag?.startsWith("bn") ?? false)
    );
  }

  // Reset save state whenever a new image arrives
  useEffect(() => {
    if (imageUri) setSaveState("idle");
  }, [imageUri]);

  // Save image to device gallery (native only)
  async function saveToGallery(uri: string): Promise<void> {
    if (!MediaLibrary || !FileSystemLegacy) return;

    try {
      setSaveState("saving");
      const bn = isBengali();

      // Check current permission status
      const { status: existing, canAskAgain } =
        await MediaLibrary.getPermissionsAsync();

      if (existing !== "granted") {
        if (!canAskAgain) {
          // Previously denied — guide to Settings
          Alert.alert(
            bn ? "অনুমতি দেওয়া হয়নি" : "Permission Denied",
            bn
              ? "Settings থেকে Photos অনুমতি চালু করলে ছবি গ্যালারিতে সেভ করা যাবে।"
              : "Go to Settings and enable Photos access to save images to your gallery.",
            [{ text: bn ? "ঠিক আছে" : "OK" }]
          );
          setSaveState("error");
          return;
        }

        // First time (undetermined) — show friendly rationale before system dialog
        await new Promise<void>((resolve) =>
          Alert.alert(
            bn ? "গ্যালারি অ্যাক্সেস" : "Gallery Access",
            bn
              ? "ThinkerAI-এর তৈরি ছবি আপনার গ্যালারিতে সেভ করতে অনুমতি দরকার।"
              : "ThinkerAI needs permission to save generated images to your photo library.",
            [{ text: bn ? "ঠিক আছে" : "OK", onPress: () => resolve() }]
          )
        );

        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          setSaveState("error");
          return;
        }
      }

      // Download remote URL to local cache
      let localUri = uri;
      if (uri.startsWith("http")) {
        const dir = FileSystemLegacy.cacheDirectory ?? "";
        const dest = `${dir}thinker_${Date.now()}.jpg`;
        const result = await FileSystemLegacy.downloadAsync(uri, dest);
        if (!result.uri) throw new Error("Download failed");
        localUri = result.uri;
      }

      await MediaLibrary.saveToLibraryAsync(localUri);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  // Show preference modal the first time an image is ready (native only)
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!loaded || !imageUri || isLoading) return;
    if (pref === null) setShowPrefModal(true);
  }, [loaded, imageUri, isLoading, pref]);

  // Auto-save when pref is "auto" and a new image is available (native only)
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!loaded || !imageUri || isLoading) return;
    if (pref !== "auto") return;
    if (autoSavedUri.current === imageUri) return;
    autoSavedUri.current = imageUri;
    saveToGallery(imageUri);
  }, [loaded, imageUri, isLoading, pref]);

  async function handlePrefChoice(choice: "auto" | "manual") {
    setShowPrefModal(false);
    await savePref(choice);
    if (choice === "auto" && imageUri) {
      autoSavedUri.current = imageUri;
      saveToGallery(imageUri);
    }
  }

  return (
    <>
      {Platform.OS !== "web" && (
        <SavePreferenceModal
          visible={showPrefModal}
          type="image"
          onChoose={handlePrefChoice}
        />
      )}

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.headerBadge,
              { backgroundColor: colors.primary + "18" },
            ]}
          >
            <Feather name="image" size={12} color={colors.primary} />
            <Text style={[styles.headerBadgeText, { color: colors.primary }]}>
              Design Agent
            </Text>
          </View>
          <View style={styles.headerRight}>
            {saveState === "saving" && (
              <View
                style={[
                  styles.saveBadge,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <ActivityIndicator size={10} color={colors.primary} />
                <Text
                  style={[
                    styles.saveBadgeText,
                    { color: colors.textSecondary },
                  ]}
                >
                  সেভ হচ্ছে…
                </Text>
              </View>
            )}
            {saveState === "saved" && (
              <View
                style={[
                  styles.saveBadge,
                  {
                    backgroundColor: "#16A34A18",
                    borderColor: "#16A34A40",
                  },
                ]}
              >
                <Feather name="check-circle" size={11} color="#16A34A" />
                <Text style={[styles.saveBadgeText, { color: "#16A34A" }]}>
                  গ্যালারিতে সেভ
                </Text>
              </View>
            )}
            {saveState === "error" && (
              <View
                style={[
                  styles.saveBadge,
                  {
                    backgroundColor: "#EF444418",
                    borderColor: "#EF444440",
                  },
                ]}
              >
                <Feather name="alert-circle" size={11} color="#EF4444" />
                <Text style={[styles.saveBadgeText, { color: "#EF4444" }]}>
                  সেভ হয়নি
                </Text>
              </View>
            )}
            <View
              style={[
                styles.attemptBadge,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.attemptText, { color: colors.textSecondary }]}>
                Attempt {attemptNumber}/{maxAttempts}
              </Text>
            </View>
          </View>
        </View>

        {/* Image */}
        <View
          style={[styles.imageContainer, { backgroundColor: colors.surface }]}
        >
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Generating image…
              </Text>
            </View>
          ) : imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.loadingState}>
              <Feather name="image" size={32} color={colors.textTertiary} />
              <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
                No image yet
              </Text>
            </View>
          )}
        </View>

        {description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        ) : null}

        {/* Action buttons */}
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
              style={[
                styles.secondaryBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={() => setShowRevise(!showRevise)}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={13} color={colors.text} />
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                Revise
              </Text>
            </TouchableOpacity>

            {attemptsLeft > 0 && (
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={onRegenerate}
                activeOpacity={0.7}
              >
                <Feather name="refresh-cw" size={13} color={colors.text} />
                <Text
                  style={[styles.secondaryBtnText, { color: colors.text }]}
                >
                  Regenerate ({attemptsLeft} left)
                </Text>
              </TouchableOpacity>
            )}

            {/* Native: manual save button */}
            {Platform.OS !== "web" &&
              (pref === "manual" || saveState === "error") &&
              saveState !== "saving" &&
              saveState !== "saved" && (
                <TouchableOpacity
                  style={[
                    styles.secondaryBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  onPress={() => saveToGallery(imageUri)}
                  activeOpacity={0.7}
                >
                  <Feather name="download" size={13} color={colors.text} />
                  <Text
                    style={[styles.secondaryBtnText, { color: colors.text }]}
                  >
                    গ্যালারিতে সেভ
                  </Text>
                </TouchableOpacity>
              )}

            {/* Web: open image in new tab */}
            {Platform.OS === "web" && (
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={() => Linking.openURL(imageUri)}
                activeOpacity={0.7}
              >
                <Feather name="external-link" size={13} color={colors.text} />
                <Text
                  style={[styles.secondaryBtnText, { color: colors.text }]}
                >
                  Open image
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {attemptsLeft === 0 && !isLoading && (
          <View
            style={[
              styles.limitRow,
              { backgroundColor: colors.warning + "14" },
            ]}
          >
            <Feather name="alert-circle" size={12} color={colors.warning} />
            <Text style={[styles.limitText, { color: colors.warning }]}>
              Maximum regeneration attempts reached
            </Text>
          </View>
        )}
      </View>
    </>
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerBadgeText: { fontSize: 11, fontWeight: "600" as const },
  saveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveBadgeText: { fontSize: 10, fontWeight: "600" as const },
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
