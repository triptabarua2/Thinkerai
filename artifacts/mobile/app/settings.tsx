import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/hooks/useSettings";

const LEVEL_LABELS: Record<string, string> = {
  auto: "Auto",
  low: "Low (1 credit)",
  medium: "Medium (9 credits)",
  high: "High (66 credits)",
  consensus: "Consensus (99 credits)",
};
const LABEL_TO_LEVEL: Record<string, string> = Object.fromEntries(
  Object.entries(LEVEL_LABELS).map(([k, v]) => [v, k])
);

const APP_LANGUAGES = [
  "Auto-detect",
  "English",
  "বাংলা",
  "Arabic",
  "Chinese",
  "Hindi",
  "Spanish",
  "French",
  "Portuguese",
  "Russian",
  "Japanese",
  "Korean",
];

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
      {title}
    </Text>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{sub}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

function SelectRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text>
      <Feather name="chevron-right" size={14} color={colors.textTertiary} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

function ActionRow({
  label,
  sub,
  danger,
  onPress,
}: {
  label: string;
  sub?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.text }]}>
          {label}
        </Text>
        {sub ? (
          <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{sub}</Text>
        ) : null}
      </View>
      <Feather
        name="chevron-right"
        size={14}
        color={danger ? colors.destructive : colors.textTertiary}
      />
    </TouchableOpacity>
  );
}

function showPicker(
  title: string,
  options: string[],
  current: string,
  onSelect: (v: string) => void
) {
  Alert.alert(
    title,
    `Current: ${current}`,
    [
      ...options.map((opt) => ({
        text: opt === current ? `✓ ${opt}` : opt,
        onPress: () => onSelect(opt),
      })),
      { text: "Cancel", style: "cancel" as const },
    ]
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();

  const thinkingLevelLabel = LEVEL_LABELS[settings.defaultThinkingLevel] ?? "Auto";

  const [theme, setTheme] = useState("System");
  const [appLang, setAppLang] = useState("Auto-detect");
  const [lowCreditAlert, setLowCreditAlert] = useState(true);
  const [buildNotifs, setBuildNotifs] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  function confirmClearMemory() {
    Alert.alert(
      "Clear my memory?",
      "This will permanently delete all your stored preferences, project context, and decision rules. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear memory",
          style: "destructive",
          onPress: () =>
            Alert.alert("Done", "Your memory has been cleared.", [{ text: "OK" }]),
        },
      ]
    );
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Delete account?",
      "This will permanently delete your account, all conversations, credits, and data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () =>
            Alert.alert("Submitted", "Your deletion request has been submitted.", [{ text: "OK" }]),
        },
      ]
    );
  }

  function handleExportMemory() {
    Alert.alert(
      "Export memory",
      "Your memory data will be prepared and sent to your email within 24 hours.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Request export", onPress: () => {} },
      ]
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="AI BEHAVIOUR" />
        <SelectRow
          label="Default Thinking Level"
          value={thinkingLevelLabel}
          onPress={() =>
            showPicker(
              "Default Thinking Level",
              Object.values(LEVEL_LABELS),
              thinkingLevelLabel,
              (label) => {
                const level = (LABEL_TO_LEVEL[label] ?? "auto") as import("@/components/ThinkingLevelPicker").ThinkingLevel;
                updateSettings({ defaultThinkingLevel: level, autoSelectLevel: level === "auto" });
              }
            )
          }
        />

        <SectionHeader title="APPEARANCE" />
        <SelectRow
          label="Theme"
          value={theme}
          onPress={() =>
            showPicker("App Theme", ["System", "Light", "Dark"], theme, setTheme)
          }
        />

        <SectionHeader title="LANGUAGE" />
        <SelectRow
          label="App language"
          value={appLang}
          onPress={() =>
            showPicker("App Language", APP_LANGUAGES, appLang, setAppLang)
          }
        />

        <SectionHeader title="CREDITS" />
        <ToggleRow
          label="Low-credit alert"
          sub="Notify me when my balance is running low"
          value={lowCreditAlert}
          onChange={setLowCreditAlert}
        />
        <ActionRow
          label="Buy credits"
          onPress={() =>
            Alert.alert("Coming Soon", "Credit purchase will be available soon.", [{ text: "OK" }])
          }
        />
        <ActionRow
          label="View billing history"
          onPress={() =>
            Alert.alert("Coming Soon", "Billing history will be available soon.", [{ text: "OK" }])
          }
        />

        <SectionHeader title="NOTIFICATIONS" />
        <ToggleRow
          label="Build & task notifications"
          sub="Alert when a pipeline finishes or fails"
          value={buildNotifs}
          onChange={setBuildNotifs}
        />
        <ToggleRow
          label="Marketing emails"
          sub="Product updates, tips, and announcements"
          value={marketingEmails}
          onChange={setMarketingEmails}
        />

        <SectionHeader title="PRIVACY" />
        <ToggleRow
          label="Analytics"
          sub="Share anonymous usage data to help improve Thinker AI"
          value={analytics}
          onChange={setAnalytics}
        />

        <SectionHeader title="DATA" />
        <ActionRow
          label="Export memory (JSON)"
          sub="Download all your stored preferences and context"
          onPress={handleExportMemory}
        />
        <ActionRow
          label="Clear my memory"
          sub="Remove all stored preferences and project context"
          danger
          onPress={confirmClearMemory}
        />

        <SectionHeader title="ACCOUNT" />
        <ActionRow
          label="Delete account"
          sub="Permanently delete your account and all data"
          danger
          onPress={confirmDeleteAccount}
        />
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
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    flex: 1,
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    marginTop: 28,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 15 },
  rowSub: { fontSize: 12, marginTop: 3 },
  rowValue: { fontSize: 14 },
});
