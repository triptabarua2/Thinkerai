import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { fetch } from "expo/fetch";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AgentPanel } from "@/components/AgentPanel";
import { BlueprintApprovalCard, type BlueprintStep } from "@/components/BlueprintApprovalCard";
import { ChatInput } from "@/components/ChatInput";
import { ClarificationCard, type ClarifyData } from "@/components/ClarificationCard";
import { CreditConfirmModal } from "@/components/CreditConfirmModal";
import { DecisionMemoryBanner } from "@/components/DecisionMemoryBanner";
import { FixCounterBar, MEDIUM_LIMIT, REBUILD_LIMIT } from "@/components/FixCounterBar";
import { FixLimitModal } from "@/components/FixLimitModal";
import { MessageBubble } from "@/components/MessageBubble";
import PipelineProgress, { type AgentStep } from "@/components/PipelineProgress";
import { SignatureQuestionCard } from "@/components/SignatureQuestionCard";
import { ThinkingLevelPicker, type ThinkingLevel } from "@/components/ThinkingLevelPicker";
import { TypingIndicator } from "@/components/TypingIndicator";
import { VersionHistoryCard, type VersionItem } from "@/components/VersionHistoryCard";
import { useApp } from "@/context/AppContext";
import type { Message } from "@/context/AppContext";
import { AGENTS, detectAgentType, type AgentType } from "@/lib/agents";
import { getBaseUrl } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

let msgCounter = 0;
function genId(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

type ClarifyState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "needed"; data: ClarifyData; pendingMessage: string }
  | { status: "signature"; question: string; pendingMessage: string }
  | { status: "blueprint"; steps: BlueprintStep[]; techStack: string; complexity: string; pendingMessage: string }
  | { status: "skipped" };

interface DecisionEvent {
  rule: string;
  confirmation: string;
}

const PIPELINE_AGENTS = [
  { id: "intent",        label: "Intent analysis",     icon: "compass" },
  { id: "clarification", label: "Requirements check",  icon: "help-circle" },
  { id: "strategy",      label: "Strategic thinking",  icon: "trending-up" },
  { id: "planner",       label: "Execution plan",      icon: "map" },
  { id: "research",      label: "Research",            icon: "search" },
  { id: "design",        label: "Visual design",       icon: "image" },
  { id: "builder",       label: "Building",            icon: "code" },
  { id: "reviewer",      label: "Quality review",      icon: "check-circle" },
  { id: "critic",        label: "Independent review",  icon: "alert-circle" },
  { id: "judge",         label: "Final judgment",      icon: "award" },
  { id: "consensus",     label: "Consensus vote",      icon: "users" },
];

function buildInitialSteps(): AgentStep[] {
  return PIPELINE_AGENTS.map((a) => ({ ...a, status: "idle" as const }));
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, q } = useLocalSearchParams<{ id: string; q?: string }>();
  const { getConversation, updateConversation, createConversation } = useApp();

  const conv = getConversation(id ?? "");
  const [messages, setMessages] = useState<Message[]>(conv?.messages ?? []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [agentType, setAgentType] = useState<AgentType>(conv?.agentType ?? "ceo");
  const [clarifyState, setClarifyState] = useState<ClarifyState>({ status: "idle" });
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>("medium");
  const [selectedDomain, setSelectedDomain] = useState<string>("general");
  const [detectedLanguage, setDetectedLanguage] = useState<string>("en");
  const [decisionEvent, setDecisionEvent] = useState<DecisionEvent | null>(null);
  const [decisionMemory, setDecisionMemory] = useState<Array<{ rule: string; detectedAt: number; applies_to: string }>>([]);
  const [versionHistory, setVersionHistory] = useState<VersionItem[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Credit confirmation
  const [creditModalVisible, setCreditModalVisible] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const CREDIT_COST: Record<ThinkingLevel, number> = { low: 1, medium: 9, high: 66, consensus: 75 };
  const CREDIT_BALANCE = 500; // TODO: fetch from user profile

  // Fix counters
  const [mediumFixCount, setMediumFixCount] = useState(conv?.medium_fix_count ?? 0);
  const [fullRebuildCount, setFullRebuildCount] = useState(conv?.full_rebuild_count ?? 0);
  const [fixLimitModal, setFixLimitModal] = useState<{ visible: boolean; type: "medium" | "rebuild" }>({ visible: false, type: "medium" });

  // Pipeline state
  const [pipelineSteps, setPipelineSteps] = useState<AgentStep[]>(buildInitialSteps());
  const [pipelineActive, setPipelineActive] = useState(false);
  const [pipelineLabel, setPipelineLabel] = useState("");

  const initializedRef = useRef(false);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (conv?.messages && !initializedRef.current) {
      setMessages(conv.messages);
      if (conv.agentType) setAgentType(conv.agentType);
      initializedRef.current = true;
    }
  }, [conv]);

  const handleSendRef = useRef<(text: string) => Promise<void>>(async () => {});

  useEffect(() => {
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      const decoded = decodeURIComponent(q);
      setTimeout(() => handleSendRef.current(decoded), 150);
    }
  }, [q]);

  function updateStepStatus(agentId: string, status: AgentStep["status"], label?: string) {
    setPipelineSteps((prev) =>
      prev.map((s) =>
        s.id === agentId ? { ...s, status, ...(label ? { label } : {}) } : s
      )
    );
  }

  function detectFixType(text: string): "small" | "medium" | "rebuild" | null {
    const lower = text.toLowerCase();
    const isRebuild = /\b(rebuild|rewrite|redo|start over|from scratch|completely redo|build again)\b/.test(lower);
    const isMedium = /\b(fix|change|update|adjust|tweak|improve|modify|edit|refactor|add|remove|rename|move)\b/.test(lower);
    if (isRebuild) return "rebuild";
    if (isMedium) return "medium";
    return null;
  }

  async function handleSend(text: string) {
    if (isStreaming || !id) return;

    // Fix counter enforcement
    const fixType = detectFixType(text);
    if (fixType === "rebuild" && fullRebuildCount >= REBUILD_LIMIT) {
      setFixLimitModal({ visible: true, type: "rebuild" });
      setPendingMessage(text);
      return;
    }
    if (fixType === "medium" && mediumFixCount >= MEDIUM_LIMIT) {
      setFixLimitModal({ visible: true, type: "medium" });
      setPendingMessage(text);
      return;
    }

    // Increment counters
    if (fixType === "rebuild") {
      const next = fullRebuildCount + 1;
      setFullRebuildCount(next);
      updateConversation(id, { full_rebuild_count: next });
    } else if (fixType === "medium") {
      const next = mediumFixCount + 1;
      setMediumFixCount(next);
      updateConversation(id, { medium_fix_count: next });
    }

    // Credit gate for expensive thinking levels
    if (thinkingLevel !== "low" && CREDIT_COST[thinkingLevel] > 3) {
      setPendingMessage(text);
      setCreditModalVisible(true);
      return;
    }
    await sendMessage(text);
  }

  async function handleCreditConfirm() {
    setCreditModalVisible(false);
    await sendMessage(pendingMessage);
    setPendingMessage("");
  }

  function handleCreditCancel() {
    setCreditModalVisible(false);
    setPendingMessage("");
  }

  function handleFixLimitScopeDown() {
    setFixLimitModal({ visible: false, type: "medium" });
    // Pre-fill a scope-narrowing prompt
    sendMessage("What is the single most important issue to fix right now? Focus only on that.");
    setPendingMessage("");
  }

  async function handleFixLimitStartFresh() {
    setFixLimitModal({ visible: false, type: "medium" });
    if (!id) return;
    const freshId = await createConversation("New Chat (fresh start)");
    router.replace({ pathname: "/chat/[id]", params: { id: freshId } });
  }

  function handleFixLimitDismiss() {
    // Allow continuing despite limit
    setFixLimitModal({ visible: false, type: "medium" });
    sendMessage(pendingMessage);
    setPendingMessage("");
  }

  handleSendRef.current = handleSend;

  async function handleClarifyProceed(answers: Record<string, string>) {
    if (clarifyState.status !== "needed") return;
    const { pendingMessage, data } = clarifyState;
    const answerLines = data.questions
      .map((q) => `- ${q.question}: **${answers[q.id]}**`)
      .join("\n");
    const enrichedMessage = `${pendingMessage}\n\n**My answers:**\n${answerLines}`;
    setClarifyState({ status: "skipped" });
    await sendMessage(enrichedMessage, pendingMessage);
  }

  function handleClarifySkip() {
    if (clarifyState.status !== "needed") return;
    const pending = clarifyState.pendingMessage;
    setClarifyState({ status: "skipped" });
    sendMessage(pending);
  }

  async function handleSignatureAnswer(answer: string) {
    if (clarifyState.status !== "signature") return;
    const { pendingMessage } = clarifyState;
    setClarifyState({ status: "skipped" });
    await sendMessageWithSignature(pendingMessage, answer, true);
  }

  function handleSignatureSkip() {
    if (clarifyState.status !== "signature") return;
    const { pendingMessage } = clarifyState;
    setClarifyState({ status: "skipped" });
    sendMessageWithSignature(pendingMessage, null, true);
  }

  async function handleBlueprintApprove() {
    if (clarifyState.status !== "blueprint") return;
    const { pendingMessage, steps } = clarifyState;
    setClarifyState({ status: "skipped" });
    await sendMessageWithOptions(pendingMessage, {
      blueprintApproved: true,
      existingPlan: steps,
    });
  }

  async function handleBlueprintModify(feedback: string) {
    if (clarifyState.status !== "blueprint") return;
    const { pendingMessage } = clarifyState;
    setClarifyState({ status: "skipped" });
    await sendMessage(`${pendingMessage}\n\n**Blueprint feedback:** ${feedback}`);
  }

  function handleBlueprintStartOver() {
    if (clarifyState.status !== "blueprint") return;
    setClarifyState({ status: "idle" });
  }

  async function handleRollback(versionNum: number) {
    const version = versionHistory.find((v) => v.version_number === versionNum);
    if (!version) return;
    setCurrentVersion(versionNum);
    const rollbackMsg: Message = {
      id: genId(),
      role: "assistant",
      content: `↩️ **Rolled back to Version ${versionNum}**\n\n${version.description}\n\n${version.content.slice(0, 500)}${version.content.length > 500 ? "\n\n*[content truncated — full version restored]*" : ""}`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, rollbackMsg]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function sendMessageWithOptions(text: string, extraOptions: Record<string, unknown>) {
    if (!id) return;
    const currentMessages = [...messages];
    const userMsg: Message = {
      id: genId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);
    setPipelineSteps(buildInitialSteps());
    setPipelineActive(false);
    setDecisionEvent(null);

    const activeAgent = agentType;
    try {
      const baseUrl = getBaseUrl();
      const chatHistory = [
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      const response = await fetch(`${baseUrl}api/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages: chatHistory,
          thinkingLevel,
          domain: selectedDomain,
          detectedLanguage,
          decisionMemory,
          versionHistory,
          currentVersion,
          ...extraOptions,
        }),
      });

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      await processSSEStream(response, text, activeAgent, currentMessages, userMsg);
    } catch {
      setShowTyping(false);
      setPipelineActive(false);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }

  async function sendMessageWithSignature(text: string, signatureAnswer: string | null, signatureAnswered: boolean) {
    const currentMessages = [...messages];
    const userMsg: Message = {
      id: genId(),
      role: "user",
      content: signatureAnswer ? `*"${signatureAnswer}"*` : "*(skipped signature question)*",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);
    setPipelineSteps(buildInitialSteps());
    setPipelineActive(false);
    setDecisionEvent(null);

    const activeAgent = agentType;
    try {
      const baseUrl = getBaseUrl();
      const chatHistory = [
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];
      const response = await fetch(`${baseUrl}api/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages: chatHistory,
          thinkingLevel,
          domain: selectedDomain,
          signatureAnswer: signatureAnswer ?? undefined,
          signatureAnswered,
          detectedLanguage,
          decisionMemory,
          versionHistory,
          currentVersion,
        }),
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      await processSSEStream(response, text, activeAgent, currentMessages, userMsg);
    } catch {
      setShowTyping(false);
      setPipelineActive(false);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }

  async function sendMessage(text: string, displayText?: string) {
    if (!id) return;
    const currentMessages = [...messages];
    const detected = detectAgentType(displayText ?? text);
    if (messages.length === 0) setAgentType(detected);

    const userMsg: Message = {
      id: genId(),
      role: "user",
      content: displayText ?? text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setPipelineSteps(buildInitialSteps());
    setPipelineActive(false);
    setPipelineLabel("");
    setDecisionEvent(null);

    const activeAgent = messages.length === 0 ? detected : agentType;

    try {
      const baseUrl = getBaseUrl();
      const chatHistory = [
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      const response = await fetch(`${baseUrl}api/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages: chatHistory,
          thinkingLevel,
          domain: selectedDomain !== "general" ? selectedDomain : undefined,
          detectedLanguage: detectedLanguage !== "en" ? detectedLanguage : undefined,
          decisionMemory: decisionMemory.length > 0 ? decisionMemory : undefined,
          versionHistory: versionHistory.length > 0 ? versionHistory : undefined,
          currentVersion: currentVersion > 0 ? currentVersion : undefined,
        }),
      });

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      await processSSEStream(response, text, activeAgent, currentMessages, userMsg);
    } catch {
      setShowTyping(false);
      setPipelineActive(false);
      const errMsg: Message = {
        id: genId(),
        role: "assistant",
        content: "Something went wrong. Please check your connection and try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }

  async function processSSEStream(
    response: Response,
    originalText: string,
    activeAgent: AgentType,
    currentMessages: Message[],
    userMsg: Message
  ) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";
    let assistantAdded = false;
    const assistantId = genId();
    let pipelineWasActive = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data) as Record<string, unknown>;

          switch (event.type) {
            case "agent_start": {
              const agent = event.agent as string;
              const label = event.label as string;
              if (agent !== "intent") {
                if (!pipelineWasActive) {
                  pipelineWasActive = true;
                  setPipelineActive(true);
                  setShowTyping(false);
                }
              }
              updateStepStatus(agent, "running", label);
              setPipelineLabel(label);
              break;
            }

            case "agent_done": {
              updateStepStatus(event.agent as string, "done");
              break;
            }

            case "pipeline_retry": {
              updateStepStatus(event.agent as string, "retried");
              break;
            }

            case "language_detected": {
              const langCode = event.language as string;
              setDetectedLanguage(langCode);
              break;
            }

            case "decision_saved": {
              const rule = event.rule as string;
              const confirmation = event.confirmation as string;
              setDecisionEvent({ rule, confirmation });
              setDecisionMemory((prev) => [
                ...prev,
                { rule, detectedAt: Date.now(), applies_to: "all_projects" },
              ]);
              break;
            }

            case "version_saved": {
              const vNum = event.version_number as number;
              const vDesc = event.description as string;
              setVersionHistory((prev) => {
                const existing = prev.find((v) => v.version_number === vNum);
                if (existing) return prev;
                const newV: VersionItem = {
                  version_number: vNum,
                  description: vDesc,
                  timestamp: Date.now(),
                  artifactType: "code",
                };
                return [...prev.slice(-9), newV];
              });
              setCurrentVersion(vNum);
              break;
            }

            case "clarification_needed": {
              const questions = event.questions as ClarifyData["questions"];
              const intentType = (event.intent as string) ?? "task";
              setClarifyState({
                status: "needed",
                data: {
                  needs_clarification: true,
                  confidence: 60,
                  intent: `${intentType} request`,
                  task_type: intentType,
                  reason: "Need more information to proceed",
                  questions,
                },
                pendingMessage: originalText,
              });
              setPipelineActive(false);
              break;
            }

            case "signature_question": {
              const question = event.question as string;
              setClarifyState({
                status: "signature",
                question,
                pendingMessage: originalText,
              });
              setPipelineActive(false);
              break;
            }

            case "blueprint_ready": {
              const steps = event.steps as BlueprintStep[];
              const techStack = (event.techStack as string) ?? "";
              const complexity = (event.estimatedComplexity as string) ?? "Medium";
              setClarifyState({
                status: "blueprint",
                steps,
                techStack,
                complexity,
                pendingMessage: originalText,
              });
              setPipelineActive(false);
              break;
            }

            case "strategy_brief": {
              const brief = event.brief as string;
              const assessment = event.assessment as string;
              const founderMode = event.founderMode as boolean;
              const assessmentEmoji = assessment === "go" ? "✅" : assessment === "caution" ? "⚠️" : "🔴";
              const founderTag = founderMode ? " 🚀 **Founder Mode**\n\n" : "";
              if (brief) {
                const chunk = `${founderTag}> ${assessmentEmoji} **Strategy Brief**: ${brief}\n\n`;
                fullContent += chunk;
                if (!assistantAdded) {
                  setShowTyping(false);
                  setMessages((prev) => [
                    ...prev,
                    { id: assistantId, role: "assistant", content: fullContent, agentType: activeAgent, timestamp: Date.now() },
                  ]);
                  assistantAdded = true;
                } else {
                  setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: fullContent }; return u; });
                }
              }
              break;
            }

            case "thinking_summary": {
              const level = event.thinkingLevel as ThinkingLevel;
              const credits = event.estimatedCredits as number;
              const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);
              setPipelineLabel(`${levelLabel} Thinking · ~${credits} credits`);
              break;
            }

            case "pipeline_halt": {
              const haltReason = event.reason as string;
              if (!assistantAdded) {
                fullContent = `⚠️ **Pipeline paused**: ${haltReason}\n\nYour work so far has been saved.`;
                setMessages((prev) => [
                  ...prev,
                  { id: assistantId, role: "assistant", content: fullContent, agentType: activeAgent, timestamp: Date.now() },
                ]);
                assistantAdded = true;
              }
              setPipelineActive(false);
              break;
            }

            case "content": {
              const chunk = event.text as string;
              if (chunk) {
                fullContent += chunk;
                if (!assistantAdded) {
                  setShowTyping(false);
                  setMessages((prev) => [
                    ...prev,
                    { id: assistantId, role: "assistant", content: fullContent, agentType: activeAgent, timestamp: Date.now() },
                  ]);
                  assistantAdded = true;
                } else {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                    return updated;
                  });
                }
              }
              break;
            }

            case "done": {
              setPipelineActive(false);
              setPipelineLabel("");
              break;
            }
          }
        } catch {}
      }
    }

    const finalMessages = [
      ...currentMessages,
      userMsg,
      ...(fullContent
        ? [{ id: assistantId, role: "assistant" as const, content: fullContent, agentType: activeAgent, timestamp: Date.now() }]
        : []),
    ];

    const newTitle =
      conv?.title === "New Chat" || conv?.title === `${AGENTS[activeAgent].name} Session`
        ? (originalText).slice(0, 40) + (originalText.length > 40 ? "..." : "")
        : conv?.title ?? "Chat";

    await updateConversation(id!, {
      messages: finalMessages,
      title: newTitle,
      agentType: activeAgent,
    });
  }

  const reversedMessages = [...messages].reverse();
  const isClarifying =
    clarifyState.status === "checking" ||
    clarifyState.status === "needed" ||
    clarifyState.status === "signature" ||
    clarifyState.status === "blueprint";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {conv?.title ?? "Chat"}
        </Text>

        {pipelineActive && pipelineLabel ? (
          <View style={[styles.clarifyBadge, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="cpu" size={12} color={colors.primary} />
            <Text style={[styles.clarifyBadgeText, { color: colors.primary }]} numberOfLines={1}>
              {pipelineLabel}
            </Text>
          </View>
        ) : null}

        <View style={styles.headerActions}>
          {versionHistory.length > 0 && (
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: colors.card }]}
              onPress={() => setShowVersionHistory((v) => !v)}
            >
              <Feather name="clock" size={16} color={showVersionHistory ? colors.primary : colors.text} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.card }]}>
            <Feather name="more-horizontal" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Agent + Domain */}
      <AgentPanel
        agentType={agentType}
        isStreaming={isStreaming}
        onAgentChange={(a) => {
          setAgentType(a);
          setSelectedDomain(a === "ceo" ? "general" : a);
        }}
      />

      {/* Chat */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          inverted={messages.length > 0}
          ListHeaderComponent={
            <>
              {showTyping && !pipelineActive && <TypingIndicator />}
              {pipelineActive && (
                <PipelineProgress steps={pipelineSteps} visible={pipelineActive} />
              )}
              {decisionEvent && (
                <DecisionMemoryBanner
                  rule={decisionEvent.rule}
                  confirmation={decisionEvent.confirmation}
                  colors={colors}
                />
              )}
              {showVersionHistory && versionHistory.length > 0 && (
                <VersionHistoryCard
                  versions={versionHistory}
                  currentVersion={currentVersion}
                  onRollback={handleRollback}
                  colors={colors}
                />
              )}
              {clarifyState.status === "needed" && (
                <ClarificationCard
                  data={clarifyState.data}
                  originalMessage={clarifyState.pendingMessage}
                  onProceed={handleClarifyProceed}
                  onSkip={handleClarifySkip}
                />
              )}
              {clarifyState.status === "signature" && (
                <SignatureQuestionCard
                  question={clarifyState.question}
                  onAnswer={handleSignatureAnswer}
                  onSkip={handleSignatureSkip}
                  colors={colors}
                />
              )}
              {clarifyState.status === "blueprint" && (
                <BlueprintApprovalCard
                  steps={clarifyState.steps}
                  techStack={clarifyState.techStack}
                  estimatedComplexity={clarifyState.complexity}
                  onApprove={handleBlueprintApprove}
                  onModify={handleBlueprintModify}
                  onStartOver={handleBlueprintStartOver}
                  colors={colors}
                />
              )}
            </>
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isClarifying ? null : (
              <View style={styles.empty}>
                <View
                  style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Feather name="cpu" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to think</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  Ask anything — I'll understand your goal,{"\n"}plan the work, then build and verify it
                </Text>
                {detectedLanguage !== "en" && (
                  <View style={[styles.langBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                    <Feather name="globe" size={12} color={colors.primary} />
                    <Text style={[styles.langText, { color: colors.primary }]}>
                      Responding in detected language
                    </Text>
                  </View>
                )}
              </View>
            )
          }
        />

        {/* Composer */}
        <View
          style={[
            styles.composerWrap,
            {
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8,
              borderTopColor: colors.border,
            },
          ]}
        >
          <FixCounterBar
            mediumFixCount={mediumFixCount}
            fullRebuildCount={fullRebuildCount}
            onReset={() => {
              setMediumFixCount(0);
              setFullRebuildCount(0);
              if (id) updateConversation(id, { medium_fix_count: 0, full_rebuild_count: 0 });
            }}
          />
          <View style={styles.toolbar}>
            <ThinkingLevelPicker
              value={thinkingLevel}
              onChange={setThinkingLevel}
              disabled={isStreaming}
            />
            {versionHistory.length > 0 && (
              <TouchableOpacity
                style={[styles.versionPill, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowVersionHistory((v) => !v)}
                activeOpacity={0.75}
              >
                <Feather name="clock" size={12} color={colors.textSecondary} />
                <Text style={[styles.versionPillText, { color: colors.textSecondary }]}>
                  v{currentVersion}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ChatInput
            onSend={handleSend}
            disabled={isStreaming || isClarifying}
            placeholder={
              isClarifying
                ? "Answer the questions above first..."
                : "Ask anything or describe a project..."
            }
          />
        </View>
      </KeyboardAvoidingView>

      {/* Credit Confirmation Modal */}
      <CreditConfirmModal
        visible={creditModalVisible}
        action={`${thinkingLevel} thinking pipeline`}
        credits={CREDIT_COST[thinkingLevel]}
        balance={CREDIT_BALANCE}
        thinkingLevel={thinkingLevel}
        onConfirm={handleCreditConfirm}
        onCancel={handleCreditCancel}
      />

      {/* Fix Limit Modal */}
      <FixLimitModal
        visible={fixLimitModal.visible}
        limitType={fixLimitModal.type}
        onScopeDown={handleFixLimitScopeDown}
        onStartFresh={handleFixLimitStartFresh}
        onDismiss={handleFixLimitDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  clarifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 140,
  },
  clarifyBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    padding: 12,
    paddingBottom: 4,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  langBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  langText: {
    fontSize: 12,
    fontWeight: "600",
  },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  versionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
