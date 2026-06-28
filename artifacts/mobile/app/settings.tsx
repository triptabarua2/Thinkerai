import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const TABS = [
  { id: "general", label: "General", icon: "settings" },
  { id: "pipeline", label: "Pipeline", icon: "cpu" },
  { id: "memory", label: "Memory", icon: "database" },
  { id: "files", label: "Files", icon: "paperclip" },
  { id: "credits", label: "Credits", icon: "zap" },
  { id: "notifications", label: "Notifs", icon: "bell" },
  { id: "privacy", label: "Privacy", icon: "shield" },
  { id: "advanced", label: "Advanced", icon: "tool" },
] as const;

type TabId = (typeof TABS)[number]["id"];

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
  disabled,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[styles.rowLabel, { color: disabled ? colors.textTertiary : colors.text }]}>
          {label}
        </Text>
        {sub ? (
          <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{sub}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
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
      <Feather name="chevron-right" size={14} color={danger ? colors.destructive : colors.textTertiary} />
    </TouchableOpacity>
  );
}

function GeneralTab() {
  const [thinkingLevel, setThinkingLevel] = useState("Auto");
  const [theme, setTheme] = useState("System");
  const [fontSize, setFontSize] = useState("Medium");

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionHeader title="LANGUAGE" />
      <SelectRow label="App language" value="Auto-detect" onPress={() => {}} />
      <SelectRow label="Response language" value="User's language" onPress={() => {}} />
      <SelectRow label="Code comment language" value="English" onPress={() => {}} />

      <SectionHeader title="DEFAULTS" />
      <SelectRow label="Default Thinking Level" value={thinkingLevel} onPress={() => {}} />
      <SelectRow label="Default domain" value="None" onPress={() => {}} />

      <SectionHeader title="APPEARANCE" />
      <SelectRow label="App theme" value={theme} onPress={() => {}} />
      <SelectRow label="Font size" value={fontSize} onPress={() => {}} />

      <SectionHeader title="REGIONAL" />
      <SelectRow label="Date & time format" value="DD/MM/YYYY" onPress={() => {}} />
      <SelectRow label="Timezone" value="Auto" onPress={() => {}} />
    </ScrollView>
  );
}

function PipelineTab() {
  const [autoLevel, setAutoLevel] = useState(true);
  const [showCreditCost, setShowCreditCost] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [showLevelBadge, setShowLevelBadge] = useState(true);
  const [sigQuestion, setSigQuestion] = useState(true);
  const [founderModeAuto, setFounderModeAuto] = useState(true);
  const [multiLang, setMultiLang] = useState(true);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionHeader title="THINKING LEVEL" />
      <ToggleRow
        label="Auto-select Thinking Level"
        sub="Thinker picks the right depth for each request"
        value={autoLevel}
        onChange={setAutoLevel}
      />
      <ToggleRow
        label="Show credit cost before sending"
        value={showCreditCost}
        onChange={setShowCreditCost}
      />

      <SectionHeader title="PIPELINE DISPLAY" />
      <ToggleRow
        label="Show pipeline progress stages"
        value={showProgress}
        onChange={setShowProgress}
      />
      <ToggleRow
        label="Show Thinking Level badge on every response"
        value={showLevelBadge}
        onChange={setShowLevelBadge}
      />

      <SectionHeader title="CLARIFICATION" />
      <ToggleRow
        label="Signature Question"
        sub="'Why do you believe this is the right solution?'"
        value={sigQuestion}
        onChange={setSigQuestion}
      />
      <SelectRow label="Goal Discovery depth" value="Auto" onPress={() => {}} />

      <SectionHeader title="AGENTS" />
      <ToggleRow
        label="Strategy Agent"
        sub="Enables business & product thinking before planning"
        value={true}
        onChange={() => {}}
      />
      <ToggleRow
        label="Founder Mode auto-detect"
        sub="Activates when market/revenue language is detected"
        value={founderModeAuto}
        onChange={setFounderModeAuto}
      />
      <ToggleRow
        label="Multi-language in pipeline"
        sub="All agent responses in your language"
        value={multiLang}
        onChange={setMultiLang}
      />
    </ScrollView>
  );
}

function MemoryTab() {
  const [projectMemory, setProjectMemory] = useState(true);
  const [longTermMemory, setLongTermMemory] = useState(true);
  const [decisionMemory, setDecisionMemory] = useState(true);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionHeader title="MEMORY TYPES" />
      <ToggleRow
        label="Project Memory"
        sub="Remembers context within each project"
        value={projectMemory}
        onChange={setProjectMemory}
      />
      <ToggleRow
        label="Long-term Preference Memory"
        sub="Remembers your preferences across projects"
        value={longTermMemory}
        onChange={setLongTermMemory}
      />
      <ToggleRow
        label="Decision Memory"
        sub="Applies rules you've set (e.g. 'always use React')"
        value={decisionMemory}
        onChange={setDecisionMemory}
      />

      <SectionHeader title="RETENTION" />
      <SelectRow label="Memory retention period" value="Forever" onPress={() => {}} />

      <SectionHeader title="MANAGE" />
      <ActionRow label="Clear all Project Memory" danger onPress={() => {}} />
      <ActionRow label="Clear all Long-term Memory" danger onPress={() => {}} />
      <ActionRow label="Clear all Decision Memory" danger onPress={() => {}} />
      <ActionRow label="Export all memory (JSON)" onPress={() => {}} />
    </ScrollView>
  );
}

function FilesTab() {
  const [autoScan, setAutoScan] = useState(true);
  const [warnLLM, setWarnLLM] = useState(false);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionHeader title="DEFAULT ACTIONS" />
      <SelectRow label="On code upload" value="Auto-review" onPress={() => {}} />
      <SelectRow label="On document upload" value="Summarise" onPress={() => {}} />
      <SelectRow label="On image upload" value="Analyse" onPress={() => {}} />
      <SelectRow label="On ZIP upload" value="Map & ask" onPress={() => {}} />

      <SectionHeader title="SECURITY" />
      <ToggleRow
        label="Auto-scan code for security issues"
        sub="Detects malware, injection, cryptomining patterns"
        value={autoScan}
        onChange={setAutoScan}
      />
      <ToggleRow
        label="Warn before sending file content to AI"
        value={warnLLM}
        onChange={setWarnLLM}
      />

      <SectionHeader title="LIMITS" />
      <SelectRow label="Max file size limit" value="Platform default" onPress={() => {}} />
    </ScrollView>
  );
}

function CreditsTab() {
  const colors = useColors();
  const [autoTopUp, setAutoTopUp] = useState(false);
  const [lowAlert, setLowAlert] = useState(true);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={[styles.creditCard, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
        <Text style={[styles.creditPlan, { color: colors.primary }]}>Pro Plan</Text>
        <Text style={[styles.creditBalance, { color: colors.text }]}>500</Text>
        <Text style={[styles.creditBalanceLabel, { color: colors.textSecondary }]}>Think Credits remaining</Text>
        <Text style={[styles.creditRenew, { color: colors.textTertiary }]}>Renews Aug 1, 2026</Text>
      </View>

      <SectionHeader title="MANAGE CREDITS" />
      <ActionRow label="Buy extra credits" onPress={() => {}} />
      <ActionRow label="Upgrade plan" onPress={() => {}} />
      <ActionRow label="View billing history" onPress={() => {}} />

      <SectionHeader title="ALERTS & AUTO TOP-UP" />
      <ToggleRow
        label="Low balance alert"
        sub="Warn me when balance falls below 20 credits"
        value={lowAlert}
        onChange={setLowAlert}
      />
      <SelectRow label="Alert threshold" value="20 credits" onPress={() => {}} />
      <ToggleRow
        label="Auto top-up"
        sub="Buy credits automatically when balance is low"
        value={autoTopUp}
        onChange={setAutoTopUp}
      />

      <SectionHeader title="BILLING" />
      <ActionRow label="Download latest invoice" onPress={() => {}} />
      <ActionRow label="Update payment method" onPress={() => {}} />
      <ActionRow label="Cancel subscription" danger onPress={() => {}} />
    </ScrollView>
  );
}

function NotificationsTab() {
  const [pipelineComplete, setPipelineComplete] = useState(true);
  const [buildFailed, setBuildFailed] = useState(true);
  const [lowCredit, setLowCredit] = useState(true);
  const [announcements, setAnnouncements] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [upgradeReminders, setUpgradeReminders] = useState(true);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionHeader title="PIPELINE" />
      <ToggleRow
        label="Pipeline complete"
        sub="Push notification when your build finishes"
        value={pipelineComplete}
        onChange={setPipelineComplete}
      />
      <ToggleRow
        label="Build failed or halted"
        sub="Alert when something goes wrong"
        value={buildFailed}
        onChange={setBuildFailed}
      />

      <SectionHeader title="CREDITS" />
      <ToggleRow
        label="Low credit balance alert"
        value={lowCredit}
        onChange={setLowCredit}
      />

      <SectionHeader title="EMAIL" />
      <ToggleRow
        label="New feature announcements"
        value={announcements}
        onChange={setAnnouncements}
      />
      <ToggleRow
        label="Weekly usage summary"
        value={weeklySummary}
        onChange={setWeeklySummary}
      />
      <ToggleRow
        label="Upgrade reminders"
        value={upgradeReminders}
        onChange={setUpgradeReminders}
      />

      <SectionHeader title="BILLING" />
      <View style={styles.fixedRow}>
        <Text style={{ fontSize: 14, flex: 1, opacity: 0.5 }}>Billing / payment notifications</Text>
        <Text style={{ fontSize: 12, opacity: 0.4 }}>Always on</Text>
      </View>
    </ScrollView>
  );
}

function PrivacyTab() {
  const [twoFA, setTwoFA] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionHeader title="ACCOUNT SECURITY" />
      <ActionRow label="Change password" onPress={() => {}} />
      <ToggleRow
        label="Two-factor authentication"
        sub="TOTP app or SMS"
        value={twoFA}
        onChange={setTwoFA}
      />
      <ActionRow label="Active sessions" sub="View and revoke any active login" onPress={() => {}} />

      <SectionHeader title="DATA" />
      <ToggleRow
        label="Usage analytics"
        sub="Help improve Thinker AI with anonymous usage data"
        value={analytics}
        onChange={setAnalytics}
      />
      <ActionRow label="View data processing information" onPress={() => {}} />
      <ActionRow label="Export all account data (JSON)" onPress={() => {}} />

      <SectionHeader title="ACCOUNT" />
      <ActionRow label="Delete account" danger sub="This action cannot be undone" onPress={() => {}} />
    </ScrollView>
  );
}

function AdvancedTab() {
  const colors = useColors();
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={[styles.lockedBanner, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "40" }]}>
        <Feather name="lock" size={14} color={colors.warning} />
        <Text style={[styles.lockedText, { color: colors.warning }]}>
          Advanced settings are available on the Founder plan
        </Text>
      </View>

      <SectionHeader title="API ACCESS" />
      <ActionRow label="API key management" sub="Create and revoke API keys" onPress={() => {}} />
      <ActionRow label="Webhook URL" sub="Receive build-complete notifications" onPress={() => {}} />
      <ActionRow label="Credit usage API" sub="Programmatic access to usage data" onPress={() => {}} />

      <SectionHeader title="PIPELINE OBSERVABILITY" />
      <ActionRow label="Pipeline log access" sub="Full routing_history and failover_log" onPress={() => {}} />
      <ActionRow label="Pool health dashboard" sub="Active model status per agent" onPress={() => {}} />
      <ActionRow label="Export pipeline log (JSON)" onPress={() => {}} />

      <SectionHeader title="CUSTOMISATION" />
      <ActionRow label="Import Decision Memory rules (JSON)" onPress={() => {}} />
      <ActionRow label="Priority Queue position" onPress={() => {}} />
    </ScrollView>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>("general");

  const tabContent: Record<TabId, React.ReactNode> = {
    general: <GeneralTab />,
    pipeline: <PipelineTab />,
    memory: <MemoryTab />,
    files: <FilesTab />,
    credits: <CreditsTab />,
    notifications: <NotificationsTab />,
    privacy: <PrivacyTab />,
    advanced: <AdvancedTab />,
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                active && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.id)}
            >
              <Feather
                name={tab.icon as any}
                size={13}
                color={active ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.primary : colors.textSecondary },
                  active && { fontWeight: "600" as const },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.tabContent, { paddingBottom: insets.bottom + 16 }]}>
        {tabContent[activeTab]}
      </View>
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
    marginRight: 4,
  },
  topTitle: { fontSize: 17, fontWeight: "600" as const, flex: 1, textAlign: "center" },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxHeight: 52,
  },
  tabBarContent: { paddingHorizontal: 8 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    minHeight: 52,
  },
  tabLabel: { fontSize: 13 },
  tabContent: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    marginTop: 24,
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
  fixedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
  },
  creditCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  creditPlan: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.8, marginBottom: 8 },
  creditBalance: { fontSize: 48, fontWeight: "800" as const },
  creditBalanceLabel: { fontSize: 13, marginTop: 2 },
  creditRenew: { fontSize: 12, marginTop: 6 },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
  },
  lockedText: { fontSize: 13, flex: 1 },
});
