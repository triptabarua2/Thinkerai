import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  type: "image" | "file";
  onChoose: (choice: "auto" | "manual") => void;
}

export function SavePreferenceModal({ visible, type, onChoose }: Props) {
  const colors = useColors();
  const isImage = type === "image";

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
            <Feather name={isImage ? "image" : "file-text"} size={26} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {isImage ? "ছবি কীভাবে সেভ করবেন?" : "ফাইল কীভাবে সেভ করবেন?"}
          </Text>

          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            {isImage
              ? "নতুন ছবি তৈরি হলে কি অটোমেটিক গ্যালারিতে সেভ হবে, নাকি আপনি নিজে Save বাটন চেপে সেভ করবেন?"
              : "নতুন ফাইল তৈরি হলে কি অটোমেটিক সেভ হবে, নাকি আপনি নিজে Save বাটন চেপে সেভ করবেন?"}
          </Text>

          {/* Auto */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => onChoose("auto")}
            activeOpacity={0.85}
          >
            <Feather name="zap" size={15} color="#fff" />
            <Text style={styles.btnText}>অটোমেটিক সেভ</Text>
          </TouchableOpacity>

          {/* Manual */}
          <TouchableOpacity
            style={[styles.btn2, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => onChoose("manual")}
            activeOpacity={0.8}
          >
            <Feather name="save" size={15} color={colors.text} />
            <Text style={[styles.btn2Text, { color: colors.text }]}>আমি নিজে করবো</Text>
          </TouchableOpacity>

          <Text style={[styles.note, { color: colors.textTertiary }]}>
            Settings থেকে পরে যেকোনো সময় বদলানো যাবে
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  desc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 4,
  },
  btn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  btn2: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
  },
  btn2Text: { fontSize: 15, fontWeight: "600" },
  note: { fontSize: 12, textAlign: "center", marginTop: 4 },
});
