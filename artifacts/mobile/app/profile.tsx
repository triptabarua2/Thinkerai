import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const PLAN_COLORS: Record<string, string> = {
  Free: "#8585A8",
  Pro: "#7B61FF",
  Founder: "#FFB800",
};

type DecisionMemory = {
  id: string;
  rule: string;
  appliesTo: string;
  lastApplied: string | null;
};

const MOCK_DECISIONS: DecisionMemory[] = [
  { id: "1", rule: "Always use React for frontend projects", appliesTo: "All projects", lastApplied: "Jun 28, 2026" },
  { id: "2", rule: "Prefer TypeScript over JavaScript", appliesTo: "Coding domain", lastApplied: "Jun 25, 2026" },
  { id: "3", rule: "Include unit tests for all Builder output", appliesTo: "All projects", lastApplied: null },
];

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
  const [decisions, setDecisions] = useState<DecisionMemory[]>(MOCK_DECISIONS);
  const plan = "Pro";

  function deleteDecision(id: string) {
    setDecisions((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>Profile</Text>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.6}>
          <Feather name="edit-2" size={17} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Avatar + Identity */}
        <View style={[styles.identitySection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.avatarWrap, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>T</Text>
            <TouchableOpacity style={[styles.avatarEdit, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="camera" size={10} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.displayName, { color: colors.text }]}>Thinker AI User</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@thinkeruser</Text>

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
          {[
            { icon: "user", label: "Display name", value: "Thinker AI User" },
            { icon: "mail", label: "Email", value: "user@example.com" },
            { icon: "at-sign", label: "Username", value: "@thinkeruser" },
            { icon: "globe", label: "Preferred language", value: "Auto-detect" },
            { icon: "calendar", label: "Member since", value: "Jun 2026" },
          ].map((row) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.fieldRow, { borderBottomColor: colors.border }]}
              activeOpacity={0.6}
            >
              <View style={[styles.fieldIcon, { backgroundColor: colors.surface }]}>
                <Feather name={row.icon as any} size={13} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>{row.value}</Text>
              </View>
              <Feather name="chevron-right" size={14} color={colors.textTertiary} />
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
            <StatCard value="Medium ■" label="Fav. level" icon="cpu" />
          </View>
        </View>

        {/* Decision Memory */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <SectionHeader title="DECISION MEMORY" />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary + "18" }]} activeOpacity={0.7}>
              <Feather name="plus" size={12} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Add rule</Text>
            </TouchableOpacity>
          </View>

          {decisions.length === 0 ? (
            <View style={[styles.emptyState, { borderColor: colors.border }]}>
              <Feather name="bookmark" size={24} color={colors.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No saved decisions yet.{"\n"}Say 'always use React' and I'll remember it.
              </Text>
            </View>
          ) : (
            decisions.map((d) => (
              <View key={d.id} style={[styles.decisionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.decisionRule, { color: colors.text }]}>{d.rule}</Text>
                  <View style={styles.decisionMeta}>
                    <View style={[styles.decisionScope, { backgroundColor: colors.primary + "18" }]}>
                      <Text style={[styles.decisionScopeText, { color: colors.primary }]}>{d.appliesTo}</Text>
                    </View>
                    {d.lastApplied ? (
                      <Text style={[styles.decisionDate, { color: colors.textTertiary }]}>
                        Last applied {d.lastApplied}
                      </Text>
                    ) : (
                      <Text style={[styles.decisionDate, { color: colors.textTertiary }]}>Not applied yet</Text>
                    )}
                  </View>
                </View>
                <View style={styles.decisionActions}>
                  <TouchableOpacity style={styles.decisionAction} activeOpacity={0.6}>
                    <Feather name="edit-2" size={13} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.decisionAction}
                    activeOpacity={0.6}
                    onPress={() => deleteDecision(d.id)}
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
            <View key={acct.label} style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
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
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 6 },
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
  username: { fontSize: 14, marginBottom: 10 },
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
  decisionAction: { padding: 4 },
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
