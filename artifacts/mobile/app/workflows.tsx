import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useWorkflows, type Workflow } from "@/context/WorkflowContext";
import { useColors } from "@/hooks/useColors";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

interface WorkflowFormModal {
  visible: boolean;
  editing: Workflow | null;
}

export default function WorkflowsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { workflows, createWorkflow, updateWorkflow, deleteWorkflow } = useWorkflows();
  const { createConversation } = useApp();

  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = screenHeight * 0.5;

  const [modal, setModal] = useState<WorkflowFormModal>({ visible: false, editing: null });
  const [formName, setFormName] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  // Slide-from-top animation — travels exactly one sheet-height
  const slideAnim = useRef(new Animated.Value(-sheetHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (modal.visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [modal.visible]);

  function openCreate() {
    setFormName("");
    setFormPrompt("");
    slideAnim.setValue(-sheetHeight);
    fadeAnim.setValue(0);
    setModal({ visible: true, editing: null });
  }

  function openEdit(wf: Workflow) {
    setFormName(wf.name);
    setFormPrompt(wf.prompt);
    slideAnim.setValue(-sheetHeight);
    fadeAnim.setValue(0);
    setModal({ visible: true, editing: wf });
  }

  function closeModal() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -sheetHeight, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setModal({ visible: false, editing: null });
      setFormName("");
      setFormPrompt("");
    });
  }

  async function handleSave() {
    const name = formName.trim();
    const prompt = formPrompt.trim();
    if (!name) {
      Alert.alert("Name required", "Please enter a name for this workflow.");
      return;
    }
    if (!prompt) {
      Alert.alert("Instruction required", "Please enter an instruction for this workflow.");
      return;
    }
    setSaving(true);
    try {
      if (modal.editing) {
        await updateWorkflow(modal.editing.id, name, prompt);
      } else {
        await createWorkflow(name, prompt);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleRun(wf: Workflow) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const convId = await createConversation(`[${wf.name}] Chat`, "ceo");
    router.push(`/chat/${convId}?workflowPrompt=${encodeURIComponent(wf.prompt)}&workflowName=${encodeURIComponent(wf.name)}` as any);
  }

  function handleDelete(wf: Workflow) {
    Alert.alert(
      "Delete Workflow",
      `Delete "${wf.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteWorkflow(wf.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Feather name="zap" size={18} color={colors.primary} />
          <Text style={s.headerTitle}>Workflows</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.7}>
          <Feather name="plus" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView style={s.list} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
        {/* New Workflow button — always at the top */}
        <TouchableOpacity style={[s.newTopBtn, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.85}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={s.newTopBtnText}>New Workflow</Text>
        </TouchableOpacity>

        {workflows.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Feather name="zap" size={32} color={colors.textTertiary} />
            </View>
            <Text style={s.emptyTitle}>No workflows yet</Text>
            <Text style={s.emptyDesc}>
              Create a workflow with a name and instruction. The agents will follow that instruction every time you run it.
            </Text>
          </View>
        ) : (
          <>
            {workflows.map((wf) => (
              <View key={wf.id} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.cardTop}>
                  <View style={s.cardIconWrap}>
                    <Feather name="zap" size={14} color={colors.primary} />
                  </View>
                  <View style={s.cardMeta}>
                    <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>
                      {wf.name}
                    </Text>
                    <Text style={[s.cardTime, { color: colors.textTertiary }]}>{timeAgo(wf.updatedAt)}</Text>
                  </View>
                </View>
                <Text style={[s.cardPrompt, { color: colors.textSecondary }]} numberOfLines={3}>
                  {wf.prompt}
                </Text>
                <View style={s.cardActions}>
                  <TouchableOpacity
                    style={[s.runBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                    onPress={() => handleRun(wf)}
                  >
                    <Feather name="play" size={13} color="#fff" />
                    <Text style={s.runBtnText}>Run</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    activeOpacity={0.7}
                    onPress={() => openEdit(wf)}
                  >
                    <Feather name="edit-2" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    activeOpacity={0.7}
                    onPress={() => handleDelete(wf)}
                  >
                    <Feather name="trash-2" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Create / Edit Modal — slides down from top */}
      <Modal
        visible={modal.visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={{ flex: 1 }}>
          {/* Dimmed backdrop — absolute so it doesn't push the sheet down */}
          <Animated.View style={[s.modalOverlay, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeModal} />
          </Animated.View>

          {/* Sheet — absolutely pinned to top, covers half the screen */}
          <Animated.View
            style={[
              s.sheet,
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: sheetHeight,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingTop: insets.top + 16,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>
                {modal.editing ? "Edit Workflow" : "New Workflow"}
              </Text>
              <TouchableOpacity onPress={closeModal} activeOpacity={0.7} style={s.sheetClose}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable fields */}
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. Bangla Copywriter"
                placeholderTextColor={colors.textTertiary}
                maxLength={60}
                returnKeyType="next"
                autoFocus={!modal.editing}
              />

              <Text style={[s.label, { color: colors.textSecondary, marginTop: 8 }]}>Instruction</Text>
              <Text style={[s.labelHint, { color: colors.textTertiary }]}>
                Agents will follow this instruction on every message in this workflow.
              </Text>
              <TextInput
                style={[s.textarea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                value={formPrompt}
                onChangeText={setFormPrompt}
                placeholder="e.g. Always reply in Bengali. Write short social media captions only. Do not use emojis."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                maxLength={2000}
                textAlignVertical="top"
              />
              <Text style={[s.charCount, { color: colors.textTertiary }]}>{formPrompt.length}/2000</Text>
            </ScrollView>

            {/* Buttons — always visible at bottom */}
            <View style={s.sheetBtns}>
              <TouchableOpacity
                style={[s.cancelBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                activeOpacity={0.7}
                onPress={closeModal}
              >
                <Text style={[s.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
                activeOpacity={0.8}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={s.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 6, marginRight: 4 },
    headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
    headerTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
    addBtn: { padding: 6 },
    list: { flex: 1 },
    listContent: { padding: 16, gap: 12, paddingBottom: 40 },
    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      alignItems: "center", justifyContent: "center",
    },
    emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
    emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 32 },
    newTopBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.primary, borderRadius: 12,
      paddingVertical: 13, marginBottom: 4,
    },
    newTopBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
    card: {
      borderRadius: 14, borderWidth: 1, padding: 14, gap: 10,
    },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    cardIconWrap: {
      width: 30, height: 30, borderRadius: 8,
      backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
      alignItems: "center", justifyContent: "center",
    },
    cardMeta: { flex: 1 },
    cardName: { fontSize: 15, fontWeight: "600" },
    cardTime: { fontSize: 11, marginTop: 1 },
    cardPrompt: { fontSize: 13, lineHeight: 19 },
    cardActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
    runBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7,
    },
    runBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
    iconBtn: {
      width: 34, height: 34, borderRadius: 8, borderWidth: 1,
      alignItems: "center", justifyContent: "center",
    },
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
    kav: { justifyContent: "flex-start" },
    sheet: {
      borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
      borderWidth: 1, borderTopWidth: 0,
      padding: 20, paddingBottom: 24, gap: 10,
      overflow: "hidden",
    },
    sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    sheetClose: { padding: 4 },
    sheetHandle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 8 },
    sheetTitle: { fontSize: 18, fontWeight: "700" },
    label: { fontSize: 13, fontWeight: "600", marginTop: 4 },
    labelHint: { fontSize: 12, marginTop: -6 },
    input: {
      borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 15, height: 46,
    },
    textarea: {
      borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, minHeight: 120,
    },
    charCount: { fontSize: 11, textAlign: "right", marginTop: -6 },
    sheetBtns: { flexDirection: "row", gap: 10, marginTop: 6 },
    cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
    cancelBtnText: { fontSize: 15, fontWeight: "500" },
    saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
    saveBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  });
