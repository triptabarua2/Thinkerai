import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const PLAN_COLORS: Record<string, string> = {
  Free: "#8585A8",
  Pro: "#0D9488",
  Founder: "#FFB800",
};

const LANGUAGES = [
  "Auto-detect", "English", "Bengali", "Arabic", "Hindi",
  "Chinese", "Spanish", "French", "Portuguese", "Russian",
  "Japanese", "Korean", "Turkish", "German",
];

type DecisionMemory = {
  id: string;
  rule: string;
  appliesTo: string;
  lastApplied: string | null;
};

const INITIAL_DECISIONS: DecisionMemory[] = [
  { id: "1", rule: "Always use React for frontend projects", appliesTo: "All projects", lastApplied: "Jun 28, 2026" },
  { id: "2", rule: "Prefer TypeScript over JavaScript", appliesTo: "Coding domain", lastApplied: "Jun 25, 2026" },
  { id: "3", rule: "Include unit tests for all Builder output", appliesTo: "All projects", lastApplied: null },
];

function EditModal({
  visible,
  title,
  placeholder,
  value,
  onSave,
  onClose,
}: {
  visible: boolean;
  title: string;
  placeholder?: string;
  value: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [text, setText] = useState(value);
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setText(value);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 280, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 60, duration: 180, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  function handleSave() {
    if (text.trim()) { onSave(text.trim()); }
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)", opacity: opacityAnim }]} />
      <KeyboardAvoidingView
        style={editStyles.center}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[editStyles.card, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={[editStyles.title, { color: colors.text }]}>{title}</Text>
          <TextInput
            style={[editStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={text}
            onChangeText={setText}
            placeholder={placeholder ?? ""}
            placeholderTextColor={colors.textTertiary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <View style={editStyles.actions}>
            <TouchableOpacity
              style={[editStyles.btn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: "600" as const }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[editStyles.btn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Text style={{ color: "#fff", fontWeight: "600" as const }}>Save</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
  );
}

function StatCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon as any} size={16} color={colors.primary} style={{ marginBottom: 6 }} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const plan = "Pro";

  const [displayName, setDisplayName] = useState("Thinker AI User");
  const [email, setEmail] = useState("user@example.com");
  const [username, setUsername] = useState("@thinkeruser");
  const [lang, setLang] = useState("Auto-detect");
  const [decisions, setDecisions] = useState<DecisionMemory[]>(INITIAL_DECISIONS);

  const [editModal, setEditModal] = useState<{
    visible: boolean;
    title: string;
    placeholder: string;
    value: string;
    onSave: (v: string) => void;
  }>({ visible: false, title: "", placeholder: "", value: "", onSave: () => {} });

  function openEdit(title: string, value: string, placeholder: string, onSave: (v: string) => void) {
    setEditModal({ visible: true, title, placeholder, value, onSave });
  }

  function closeEdit() {
    setEditModal((prev) => ({ ...prev, visible: false }));
  }

  function pickLanguage() {
    Alert.alert(
      "Preferred Language",
      "Select your preferred language",
      [
        ...LANGUAGES.map((l) => ({
          text: l === lang ? `✓ ${l}` : l,
          onPress: () => setLang(l),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  }

  function deleteDecision(id: string) {
    setDecisions((prev) => prev.filter((d) => d.id !== id));
  }

  function editDecision(d: DecisionMemory) {
    openEdit("Edit Rule", d.rule, "Enter decision rule...", (val) => {
      setDecisions((prev) => prev.map((x) => x.id === d.id ? { ...x, rule: val } : x));
    });
  }

  function addDecision() {
    openEdit("Add Decision Rule", "", "Always use React for frontend...", (val) => {
      const newRule: DecisionMemory = {
        id: Date.now().toString(),
        rule: val,
        appliesTo: "All projects",
        lastApplied: null,
      };
      setDecisions((prev) => [newRule, ...prev]);
    });
  }

  const IDENTITY_FIELDS = [
    {
      icon: "user", label: "Display name", value: displayName,
      onPress: () => openEdit("Display Name", displayName, "Your name...", setDisplayName),
    },
    {
      icon: "mail", label: "Email", value: email,
      onPress: () => openEdit("Email Address", email, "you@example.com", setEmail),
    },
    {
      icon: "at-sign", label: "Username", value: username,
      onPress: () => openEdit("Username", username, "@yourhandle", (v) => setUsername(v.startsWith("@") ? v : `@${v}`)),
    },
    {
      icon: "globe", label: "Preferred language", value: lang,
      onPress: pickLanguage,
    },
    {
      icon: "calendar", label: "Member since", value: "Jun 2026",
      onPress: undefined,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>Profile</Text>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.6}
          onPress={() => openEdit("Display Name", displayName, "Your name...", setDisplayName)}
        >
          <Feather name="edit-2" size={17} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar + Identity */}
        <View style={[styles.identitySection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Alert.alert("Change Photo", "Photo upload will be available soon.", [{ text: "OK" }])}
          >
            <View style={[styles.avatarWrap, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              <View style={[styles.avatarEdit, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="camera" size={10} color={colors.textSecondary} />
              </View>
            </View>
          </TouchableOpacity>

          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.usernameText, { color: colors.textSecondary }]}>{username}</Text>

          <View style={[styles.planBadge, { backgroundColor: (PLAN_COLORS[plan] ?? colors.primary) + "20" }]}>
            <View style={[styles.planDot, { backgroundColor: PLAN_COLORS[plan] ?? colors.primary }]} />
            <Text style={[styles.planText, { color: PLAN_COLORS[plan] ?? colors.primary }]}>
              {plan} Plan
            </Text>
          </View>

          <Text style={[styles.bio, { color: colors.textSecondary }]}>
            Building with AI • Thinker AI user since Jun 2026
          </Text>
        </View>

        {/* Identity Fields */}
        <View style={styles.section}>
          <SectionHeader title="IDENTITY" />
          {IDENTITY_FIELDS.map((row) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.fieldRow, { borderBottomColor: colors.border }]}
              activeOpacity={row.onPress ? 0.6 : 1}
              onPress={row.onPress}
              disabled={!row.onPress}
            >
              <View style={[styles.fieldIcon, { backgroundColor: colors.surface }]}>
                <Feather name={row.icon as any} size={13} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>{row.value}</Text>
              </View>
              {row.onPress ? (
                <Feather name="chevron-right" size={14} color={colors.textTertiary} />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {/* Activity Stats */}
        <View style={styles.section}>
          <SectionHeader title="ACTIVITY" />
          <View style={styles.statsGrid}>
            <StatCard value="12" label="Projects built" icon="box" />
            <StatCard value="1,240" label="Credits spent" icon="zap" />
            <StatCard value="38" label="Conversations" icon="message-circle" />
            <StatCard value="7" label="Files uploaded" icon="paperclip" />
            <StatCard value="Coding" label="Top domain" icon="code" />
            <StatCard value="Medium" label="Fav. level" icon="cpu" />
          </View>
        </View>

        {/* Decision Memory */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <SectionHeader title="DECISION MEMORY" />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary + "18" }]}
              activeOpacity={0.7}
              onPress={addDecision}
            >
              <Feather name="plus" size={12} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Add rule</Text>
            </TouchableOpacity>
          </View>

          {decisions.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyState, { borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={addDecision}
            >
              <Feather name="bookmark" size={24} color={colors.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No saved decisions yet.{"\n"}Tap to add your first rule.
              </Text>
            </TouchableOpacity>
          ) : (
            decisions.map((d) => (
              <View key={d.id} style={[styles.decisionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.decisionRule, { color: colors.text }]}>{d.rule}</Text>
                  <View style={styles.decisionMeta}>
                    <View style={[styles.decisionScope, { backgroundColor: colors.primary + "18" }]}>
                      <Text style={[styles.decisionScopeText, { color: colors.primary }]}>{d.appliesTo}</Text>
                    </View>
                    <Text style={[styles.decisionDate, { color: colors.textTertiary }]}>
                      {d.lastApplied ? `Last applied ${d.lastApplied}` : "Not applied yet"}
                    </Text>
                  </View>
                </View>
                <View style={styles.decisionActions}>
                  <TouchableOpacity
                    style={styles.decisionAction}
                    activeOpacity={0.6}
                    onPress={() => editDecision(d)}
                  >
                    <Feather name="edit-2" size={13} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.decisionAction}
                    activeOpacity={0.6}
                    onPress={() =>
                      Alert.alert("Delete Rule", "Remove this decision rule?", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteDecision(d.id) },
                      ])
                    }
                  >
                    <Feather name="trash-2" size={13} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Linked Accounts */}
        <View style={styles.section}>
          <SectionHeader title="LINKED ACCOUNTS" />
          {[
            { icon: "mail", label: "Google", connected: true, description: "Used for sign-in" },
            { icon: "github", label: "GitHub", connected: false, description: "Code import — coming soon" },
            { icon: "pen-tool", label: "Figma", connected: false, description: "Design import — coming soon" },
          ].map((acct) => (
            <TouchableOpacity
              key={acct.label}
              style={[styles.fieldRow, { borderBottomColor: colors.border }]}
              activeOpacity={acct.connected ? 0.6 : 0.4}
              onPress={() => {
                if (acct.connected) {
                  Alert.alert(
                    `${acct.label} Connected`,
                    acct.description,
                    [
                      { text: "Disconnect", style: "destructive", onPress: () => {} },
                      { text: "OK", style: "cancel" },
                    ]
                  );
                } else {
                  Alert.alert("Coming Soon", `${acct.label} integration will be available in V2.`, [{ text: "OK" }]);
                }
              }}
            >
              <View style={[styles.fieldIcon, { backgroundColor: colors.surface }]}>
                <Feather name={acct.icon as any} size={13} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldValue, { color: acct.connected ? colors.text : colors.textTertiary }]}>
                  {acct.label}
                </Text>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{acct.description}</Text>
              </View>
              {acct.connected ? (
                <View style={[styles.connectedBadge, { backgroundColor: colors.success + "20" }]}>
                  <Text style={[styles.connectedText, { color: colors.success }]}>Connected</Text>
                </View>
              ) : (
                <View style={[styles.connectedBadge, { backgroundColor: colors.border }]}>
                  <Text style={[styles.connectedText, { color: colors.textTertiary }]}>V2</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <EditModal
        visible={editModal.visible}
        title={editModal.title}
        placeholder={editModal.placeholder}
        value={editModal.value}
        onSave={editModal.onSave}
        onClose={closeEdit}
      />
    </View>
  );
}

const editStyles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    zIndex: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontSize: 17, fontWeight: "600" as const, flex: 1, textAlign: "center" },
  identitySection: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { fontSize: 32, fontWeight: "700" as const, color: "#fff" },
  avatarEdit: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  displayName: { fontSize: 20, fontWeight: "700" as const, marginBottom: 2 },
  usernameText: { fontSize: 14, marginBottom: 10 },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  planDot: { width: 6, height: 6, borderRadius: 3 },
  planText: { fontSize: 12, fontWeight: "700" as const },
  bio: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  section: { paddingHorizontal: 20, marginTop: 8 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 12, fontWeight: "600" as const },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  fieldIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: { fontSize: 11, marginBottom: 1 },
  fieldValue: { fontSize: 14 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  statCard: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statValue: { fontSize: 18, fontWeight: "700" as const, marginBottom: 2 },
  statLabel: { fontSize: 11, textAlign: "center" },
  decisionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  decisionRule: { fontSize: 14, fontWeight: "500" as const, marginBottom: 6 },
  decisionMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  decisionScope: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  decisionScopeText: { fontSize: 11, fontWeight: "600" as const },
  decisionDate: { fontSize: 11 },
  decisionActions: { flexDirection: "row", gap: 8, marginTop: 2 },
  decisionAction: { padding: 6 },
  emptyState: {
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 24,
    marginTop: 8,
  },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  connectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  connectedText: { fontSize: 11, fontWeight: "600" as const },
});
