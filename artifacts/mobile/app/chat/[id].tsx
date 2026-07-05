import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { fetch } from "expo/fetch";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  type AppStateStatus,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AgentPanel } from "@/components/AgentPanel";
import { ApprovalCard } from "@/components/ApprovalCard";
import { BlueprintApprovalCard, type BlueprintStep } from "@/components/BlueprintApprovalCard";
import { ChatInput } from "@/components/ChatInput";
import { ClarificationCard, type ClarifyData } from "@/components/ClarificationCard";
import { CreditConfirmModal } from "@/components/CreditConfirmModal";
import { DecisionMemoryBanner } from "@/components/DecisionMemoryBanner";
import { ResumeFromBackgroundBanner } from "@/components/ResumeFromBackgroundBanner";
import { FixCounterBar, MEDIUM_LIMIT, REBUILD_LIMIT } from "@/components/FixCounterBar";
import { FixLimitModal } from "@/components/FixLimitModal";
import { ImageOutputCard } from "@/components/ImageOutputCard";
import { MessageBubble } from "@/components/MessageBubble";
import PipelineProgress, { type AgentStep } from "@/components/PipelineProgress";
import { SignatureQuestionCard } from "@/components/SignatureQuestionCard";
import { ThinkingLevelPicker, type ThinkingLevel } from "@/components/ThinkingLevelPicker";
import { TypingIndicator } from "@/components/TypingIndicator";
import { VersionHistoryCard, type VersionItem } from "@/components/VersionHistoryCard";
import { FinalOutputCard } from "@/components/FinalOutputCard";
import { FileReceivedCard, type FileCategory } from "@/components/FileReceivedCard";
import { useApp } from "@/context/AppContext";
import type { Message } from "@/context/AppContext";
import { AGENTS, agentTypeToDomain, detectAgentType, type AgentType } from "@/lib/agents";
import { getBaseUrl } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import { applyRTL, useRTL } from "@/hooks/useRTL";
import { useOfflineQueue, type PendingMessage } from "@/hooks/useOfflineQueue";
import { useSettings } from "@/hooks/useSettings";

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
  | { status: "approval"; content: string; artifactType: string; version: number; agentCount: number; pendingMessage: string }
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
  const { id, q, workflowPrompt, workflowName, reconnectJobId } = useLocalSearchParams<{ id: string; q?: string; workflowPrompt?: string; workflowName?: string; reconnectJobId?: string }>();
  const activeWorkflowPrompt = workflowPrompt ? decodeURIComponent(workflowPrompt) : undefined;
  const activeWorkflowName = workflowName ? decodeURIComponent(workflowName) : undefined;
  const { getConversation, updateConversation, createConversation } = useApp();
  const { effectiveDefaultLevel, loaded: settingsLoaded } = useSettings();
  useRTL(undefined);

  const conv = getConversation(id ?? "");
  const [messages, setMessages] = useState<Message[]>(conv?.messages ?? []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [agentType, setAgentType] = useState<AgentType>(conv?.agentType ?? "ceo");
  const [clarifyState, setClarifyState] = useState<ClarifyState>({ status: "idle" });
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>("auto");
  const [PLAN_TIER, setPlanTier] = useState<"free" | "pro" | "founder">("free");
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
  const CREDIT_COST: Record<ThinkingLevel, number> = { auto: 0, low: 1, medium: 9, high: 66, consensus: 99 };
  const [CREDIT_BALANCE, setCreditBalance] = useState(0);

  // Fetch the user's real plan tier + credit balance from the backend
  // instead of assuming Pro / 500 credits for everyone. Call refreshCredits()
  // again after any action that spends credits (send message, upload, etc.)
  // to keep the displayed balance in sync with what the server deducted.
  const refreshCredits = useCallback(async () => {
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}api/credits/balance?userId=default`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.planTier === "free" || data.planTier === "pro" || data.planTier === "founder") {
        setPlanTier(data.planTier);
      }
      if (typeof data.totalBalance === "number") {
        setCreditBalance(data.totalBalance);
      }
    } catch {
      // Network/backend unavailable — keep current Free-plan / last-known
      // balance rather than silently pretending the user has a paid one.
    }
  }, []);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  // Load default thinking level from persisted settings once loaded
  useEffect(() => {
    if (settingsLoaded) setThinkingLevel(effectiveDefaultLevel);
  }, [settingsLoaded, effectiveDefaultLevel]);

  // Fix counters
  const [mediumFixCount, setMediumFixCount] = useState(conv?.medium_fix_count ?? 0);
  const [fullRebuildCount, setFullRebuildCount] = useState(conv?.full_rebuild_count ?? 0);
  const [fixLimitModal, setFixLimitModal] = useState<{ visible: boolean; type: "medium" | "rebuild" }>({ visible: false, type: "medium" });

  // Pipeline state
  const [pipelineSteps, setPipelineSteps] = useState<AgentStep[]>(buildInitialSteps());
  const [pipelineActive, setPipelineActive] = useState(false);
  const [pipelineLabel, setPipelineLabel] = useState("");

  // Image approval state (Section 5.11 — Visual Asset Approval Flow)
  const [imageApproval, setImageApproval] = useState<{
    visible: boolean;
    imageUrl: string;
    description: string;
    imagePrompt: string;
    stepId: string;
    attemptNumber: number;
    maxAttempts: number;
    pendingMessage: string;
  } | null>(null);

  // Post-delivery feedback state (Section 9.4)
  const [feedbackPrompt, setFeedbackPrompt] = useState<{
    visible: boolean;
    artifactType: string;
  } | null>(null);

  // Final output card state
  const [finalOutput, setFinalOutput] = useState<{
    projectName: string;
    summary: string;
    creditsUsed: number;
    agentCount: number;
    version: number;
    duration: string;
    builderContent?: string;
  } | null>(null);
  const lastOutputContent = useRef<string>("");
  const pipelineStartTimeRef = useRef<number>(0);

  // Founder Mode notification
  const [founderModeActive, setFounderModeActive] = useState(false);

  // Three-dot chat menu
  const [showChatMenu, setShowChatMenu] = useState(false);

  // Offline retry state
  const [offlineRetrying, setOfflineRetrying] = useState(false);

  // Background job tracking for "Resume from background" banner
  const activeJobIdRef = useRef<string | null>(null);
  const [backgroundJobReady, setBackgroundJobReady] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      // User returned to foreground while a pipeline was running in background
      if (prev !== "active" && nextState === "active" && activeJobIdRef.current) {
        setBackgroundJobReady(true);
      }
    });
    return () => sub.remove();
  }, []);

  const initializedRef = useRef(false);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (conv?.messages && !initializedRef.current) {
      setMessages(conv.messages);
      if (conv.agentType) setAgentType(conv.agentType);
      initializedRef.current = true;
    }
  }, [conv]);

  const handleReloadMessage = useCallback((msg: import("@/context/AppContext").Message) => {
    if (isStreaming) return;
    handleSendRef.current(msg.content);
  }, [isStreaming]);

  const handleRetryAssistant = useCallback((msg: import("@/context/AppContext").Message) => {
    if (isStreaming) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) handleSendRef.current(lastUser.content);
  }, [isStreaming, messages]);

  const handleEditMessage = useCallback((_msg: import("@/context/AppContext").Message) => {
    /* editing is surfaced via the input — future: pre-fill input */
  }, []);

  const handleReplyMessage = useCallback((_msg: import("@/context/AppContext").Message) => {
    /* reply: future implementation */
  }, []);

  const renderMessageItem = useCallback(({ item }: { item: import("@/context/AppContext").Message }) => (
    <MessageBubble
      message={item}
      onReload={item.role === "user" ? handleReloadMessage : handleRetryAssistant}
      onEdit={item.role === "user" ? handleEditMessage : undefined}
      onReply={item.role === "assistant" ? handleReplyMessage : undefined}
    />
  ), [handleReloadMessage, handleRetryAssistant, handleEditMessage, handleReplyMessage]);

  const handleSendRef = useRef<(text: string) => Promise<void>>(async () => {});
  const creditConfirmedLevels = useRef<Set<string>>(new Set());

  const { enqueue: enqueuePending, markSent } = useOfflineQueue({
    conversationId: id,
    onRetry: async (msg: PendingMessage) => {
      setOfflineRetrying(true);
      try {
        await sendMessage(msg.text, msg.displayText, msg.id);
      } finally {
        setOfflineRetrying(false);
      }
    },
  });

  useEffect(() => {
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      const decoded = decodeURIComponent(q);
      setTimeout(() => handleSendRef.current(decoded), 150);
    }
  }, [q]);

  const reconnectRequestedRef = useRef(false);
  useEffect(() => {
    if (reconnectJobId && !reconnectRequestedRef.current) {
      reconnectRequestedRef.current = true;
      activeJobIdRef.current = reconnectJobId;
      setTimeout(() => streamReconnect(reconnectJobId), 150);
    }
  }, [reconnectJobId]);

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

    // Credit gate — show confirmation once per thinking level per session.
    // Skip for "auto": backend resolves the level and already emits thinking_summary
    // with the real cost, so no pre-send blocking needed.
    if (thinkingLevel !== "auto" && thinkingLevel !== "low" && CREDIT_COST[thinkingLevel] > 3 && !creditConfirmedLevels.current.has(thinkingLevel)) {
      setPendingMessage(text);
      setCreditModalVisible(true);
      return;
    }
    await sendMessage(text);
  }

  async function handleCreditConfirm() {
    setCreditModalVisible(false);
    // Remember this level — don't ask again this session
    creditConfirmedLevels.current.add(thinkingLevel);
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

  async function handleAttach() {
    if (isStreaming) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0]!;

      const userMsg: Message = {
        id: genId(),
        role: "user",
        content: `📎 Uploading **${asset.name}**…`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setShowTyping(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const formData = new FormData();
      formData.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType ?? "application/octet-stream" } as any);
      formData.append("intent", "analyze this file");
      formData.append("planTier", PLAN_TIER);
      formData.append("userId", "default");
      formData.append("conversationId", id as string);

      const baseUrl = getBaseUrl();
      const assistantId = genId();
      let fullContent = "";
      let assistantAdded = false;
      const activeAgent = agentType;

      const response = await fetch(`${baseUrl}api/upload`, {
        method: "POST",
        headers: { Accept: "text/event-stream" },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error((err as any).error ?? "Upload failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as Record<string, unknown>;
            if (event.type === "content" || event.type === "document_ready") {
              const chunk = event.type === "content"
                ? (event.text as string)
                : `📄 **${(event.result as any)?.file_name}** analyzed`;
              if (chunk) {
                fullContent += chunk;
                if (!assistantAdded) {
                  setShowTyping(false);
                  setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: fullContent, agentType: activeAgent, timestamp: Date.now() }]);
                  assistantAdded = true;
                } else {
                  setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: fullContent }; return u; });
                }
              }
            }
          } catch {}
        }
      }

      if (id) {
        const finalMessages = messages.concat(userMsg, fullContent ? [{ id: assistantId, role: "assistant" as const, content: fullContent, agentType: activeAgent, timestamp: Date.now() }] : []);
        await updateConversation(id, { messages: finalMessages });
      }
    } catch (err) {
      const errMsg: Message = {
        id: genId(),
        role: "assistant",
        content: `Something went wrong uploading the file. Please try again.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      refreshCredits();
    }
  }

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

  async function handleOutputApprove() {
    if (clarifyState.status !== "approval") return;
    const { pendingMessage } = clarifyState;
    setClarifyState({ status: "skipped" });
    await sendMessageWithOptions(pendingMessage, { outputApproved: true });
  }

  function handleOutputChangeSomething() {
    if (clarifyState.status !== "approval") return;
    const pending = clarifyState.pendingMessage;
    setClarifyState({ status: "idle" });
    setMessages((prev) => [
      ...prev,
      {
        id: genId(),
        role: "assistant",
        content: "Sure — what would you like changed? Describe the revision and I'll rebuild.",
        timestamp: Date.now(),
      },
    ]);
  }

  // ── Image Approval Handlers (Section 5.11) ──────────────────────────────
  function handleImageApprove() {
    if (!imageApproval) return;
    const pending = imageApproval.pendingMessage;
    setImageApproval(null);
    // Continue pipeline with image approved
    sendMessageWithOptions(pending, { imageApproved: true, imageAttemptNumber: imageApproval.attemptNumber });
  }

  function handleImageRevise(instruction: string) {
    if (!imageApproval) return;
    const pending = imageApproval.pendingMessage;
    setImageApproval(null);
    sendMessage(`Revise the image: ${instruction}`, `Revise image: ${instruction}`);
    void pending;
  }

  function handleImageRegenerate() {
    if (!imageApproval) return;
    if (imageApproval.attemptNumber >= imageApproval.maxAttempts) return;
    const pending = imageApproval.pendingMessage;
    const nextAttempt = imageApproval.attemptNumber + 1;
    setImageApproval(null);
    sendMessageWithOptions(pending, { imageAttemptNumber: nextAttempt });
  }

  // ── Feedback Handlers (Section 9.4) ────────────────────────────────────
  function handleFeedbackSelect(feedbackType: "bug" | "missing_feature" | "style" | "vague") {
    setFeedbackPrompt(null);
    const prompts: Record<string, string> = {
      bug: "There's a bug in the output — ",
      missing_feature: "Something is missing — ",
      style: "I'd like to change the style — ",
      vague: "Something isn't right with the output.",
    };
    const pre = prompts[feedbackType] ?? "";
    if (feedbackType === "vague") {
      sendMessage(pre);
    } else {
      // Pre-fill the input by sending a message that triggers clarification
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "assistant",
          content: `What specifically is ${feedbackType === "bug" ? "broken" : feedbackType === "missing_feature" ? "missing" : "wrong with the style"}? Describe it and I'll fix it.`,
          timestamp: Date.now(),
        },
      ]);
    }
  }

  async function handleRollback(versionNum: number) {
    const version = versionHistory.find((v) => v.version_number === versionNum);
    if (!version) return;
    setCurrentVersion(versionNum);
    const rollbackMsg: Message = {
      id: genId(),
      role: "assistant",
      content: `↩️ **Rolled back to Version ${versionNum}**\n\n${version.description}${version.content ? `\n\n${version.content.slice(0, 500)}${version.content.length > 500 ? "\n\n*[content truncated — full version restored]*" : ""}` : ""}`,
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
    setFinalOutput(null);
    pipelineStartTimeRef.current = Date.now();

    const activeAgent = agentType;
    try {
      const baseUrl = getBaseUrl();
      const chatHistory = [
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      const jobRes = await fetch(`${baseUrl}api/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          planTier: PLAN_TIER,
          thinkingLevel,
          domain: selectedDomain !== "general" ? selectedDomain : undefined,
          detectedLanguage: detectedLanguage !== "en" ? detectedLanguage : undefined,
          decisionMemory: decisionMemory.length > 0 ? decisionMemory : undefined,
          versionHistory: versionHistory.length > 0 ? versionHistory : undefined,
          currentVersion: currentVersion > 0 ? currentVersion : undefined,
          ...extraOptions,
        }),
      });
      if (!jobRes.ok) throw new Error(`Error: ${jobRes.status}`);
      const { jobId: jobId1 } = await jobRes.json() as { jobId: string };
      activeJobIdRef.current = jobId1;
      const response = await fetch(`${baseUrl}api/pipeline/stream/${jobId1}`, {
        headers: { Accept: "text/event-stream" },
      });
      if (!response.ok) throw new Error(`Stream error: ${response.status}`);
      await processSSEStream(response, text, activeAgent, currentMessages, userMsg);
    } catch {
      setShowTyping(false);
      setPipelineActive(false);
    } finally {
      activeJobIdRef.current = null;
      setBackgroundJobReady(false);
      setIsStreaming(false);
      setShowTyping(false);
      refreshCredits();
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
      const jobRes2 = await fetch(`${baseUrl}api/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          planTier: PLAN_TIER,
          thinkingLevel,
          domain: selectedDomain !== "general" ? selectedDomain : undefined,
          signatureAnswer: signatureAnswer ?? undefined,
          signatureAnswered,
          detectedLanguage: detectedLanguage !== "en" ? detectedLanguage : undefined,
          decisionMemory: decisionMemory.length > 0 ? decisionMemory : undefined,
          versionHistory: versionHistory.length > 0 ? versionHistory : undefined,
          currentVersion: currentVersion > 0 ? currentVersion : undefined,
        }),
      });
      if (!jobRes2.ok) throw new Error(`Error: ${jobRes2.status}`);
      const { jobId: jobId2 } = await jobRes2.json() as { jobId: string };
      activeJobIdRef.current = jobId2;
      const response = await fetch(`${baseUrl}api/pipeline/stream/${jobId2}`, {
        headers: { Accept: "text/event-stream" },
      });
      if (!response.ok) throw new Error(`Stream error: ${response.status}`);
      await processSSEStream(response, text, activeAgent, currentMessages, userMsg);
    } catch {
      setShowTyping(false);
      setPipelineActive(false);
    } finally {
      activeJobIdRef.current = null;
      setBackgroundJobReady(false);
      setIsStreaming(false);
      setShowTyping(false);
      refreshCredits();
    }
  }

  async function sendMessage(text: string, displayText?: string, existingPendingId?: string) {
    if (!id) return;
    const currentMessages = [...messages];

    const pendingId = existingPendingId ?? genId();

    // Persist to queue BEFORE sending — so if app is killed mid-flight the
    // message survives and will be retried when the app comes back online.
    await enqueuePending({
      id: pendingId,
      conversationId: id,
      text,
      displayText,
      enqueuedAt: Date.now(),
    });

    const userMsg: Message = {
      id: pendingId,
      role: "user",
      content: displayText ?? text,
      timestamp: Date.now(),
    };

    // Avoid duplicating the user bubble when retrying a queued message
    setMessages((prev) => {
      if (prev.some((m) => m.id === pendingId)) return prev;
      return [...prev, userMsg];
    });
    setIsStreaming(true);
    setShowTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setPipelineSteps(buildInitialSteps());
    setPipelineActive(false);
    setPipelineLabel("");
    setDecisionEvent(null);
    setFinalOutput(null);
    pipelineStartTimeRef.current = Date.now();

    const activeAgent = agentType;

    try {
      const baseUrl = getBaseUrl();
      const chatHistory = [
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      const jobRes3 = await fetch(`${baseUrl}api/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          planTier: PLAN_TIER,
          thinkingLevel,
          domain: selectedDomain !== "general" ? selectedDomain : undefined,
          detectedLanguage: detectedLanguage !== "en" ? detectedLanguage : undefined,
          decisionMemory: decisionMemory.length > 0 ? decisionMemory : undefined,
          versionHistory: versionHistory.length > 0 ? versionHistory : undefined,
          currentVersion: currentVersion > 0 ? currentVersion : undefined,
          conversationId: id,
          workflowSystemPrompt: activeWorkflowPrompt,
        }),
      });
      if (!jobRes3.ok) throw new Error(`Error: ${jobRes3.status}`);
      const { jobId: jobId3 } = await jobRes3.json() as { jobId: string };
      activeJobIdRef.current = jobId3;
      const response = await fetch(`${baseUrl}api/pipeline/stream/${jobId3}`, {
        headers: { Accept: "text/event-stream" },
      });
      if (!response.ok) throw new Error(`Stream error: ${response.status}`);
      await processSSEStream(response, text, activeAgent, currentMessages, userMsg);

      // Successfully sent — remove from pending queue
      await markSent(pendingId);
    } catch {
      setShowTyping(false);
      setPipelineActive(false);
      // Don't show error if this was a background retry — queue will retry again
      if (!existingPendingId) {
        const errMsg: Message = {
          id: genId(),
          role: "assistant",
          content: "Connection lost. Your message is saved and will be sent automatically when you're back online.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } finally {
      activeJobIdRef.current = null;
      setBackgroundJobReady(false);
      setIsStreaming(false);
      setShowTyping(false);
      refreshCredits();
    }
  }

  async function streamReconnect(jobId: string) {
    setBackgroundJobReady(false);
    if (isStreaming) return;
    setIsStreaming(true);
    setPipelineActive(true);
    setShowTyping(false);
    const assistantId = genId();
    let assistantAdded = false;
    let fullContent = "";
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}api/pipeline/stream/${jobId}`, {
        headers: { Accept: "text/event-stream" },
      });
      if (!response.ok) return;
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const event = JSON.parse(raw) as Record<string, unknown>;
            switch (event.type) {
              case "agent_start":
                updateStepStatus(event.agent as string, "running", event.label as string);
                setPipelineLabel(event.label as string);
                break;
              case "agent_done":
                updateStepStatus(event.agent as string, "done");
                break;
              case "content":
                fullContent += event.content as string;
                if (!assistantAdded) {
                  assistantAdded = true;
                  setMessages((prev) => [
                    ...prev,
                    { id: assistantId, role: "assistant" as const, content: fullContent, timestamp: Date.now() },
                  ]);
                } else {
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
                  );
                }
                break;
              case "clarification_needed": {
                const questions = event.questions as ClarifyData["questions"];
                const intentType = (event.intent as string) ?? "task";
                const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
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
                  pendingMessage: lastUserMsg,
                });
                setPipelineActive(false);
                break;
              }
              case "signature_question": {
                const question = event.question as string;
                const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
                setClarifyState({ status: "signature", question, pendingMessage: lastUserMsg });
                setPipelineActive(false);
                break;
              }
              case "blueprint_ready": {
                const steps = event.steps as BlueprintStep[];
                const techStack = (event.techStack as string) ?? "";
                const complexity = (event.estimatedComplexity as string) ?? "Medium";
                const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
                setClarifyState({
                  status: "blueprint",
                  steps,
                  techStack,
                  complexity,
                  pendingMessage: lastUserMsg,
                });
                setPipelineActive(false);
                break;
              }
              case "approval_needed": {
                const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
                setClarifyState({
                  status: "approval",
                  content: event.content as string,
                  artifactType: event.artifactType as string,
                  version: event.version as number,
                  agentCount: event.agentCount as number,
                  pendingMessage: lastUserMsg,
                });
                setPipelineActive(false);
                break;
              }
              case "final_output": {
                const finalSummary = event.summary as string;
                const finalType = event.artifactType as string;
                const finalCredits = event.creditsUsed as number;
                const finalAgents = event.agentCount as number;
                const finalVersion = event.version as number;
                const chunk =
                  `\n\n---\n✅ **Build Complete** — Version ${finalVersion}\n\n` +
                  `${finalSummary}\n\n` +
                  `*${finalAgents} agents · ${finalCredits} credits · Type: ${finalType}*\n`;
                fullContent += chunk;
                if (!assistantAdded) {
                  assistantAdded = true;
                  setMessages((prev) => [
                    ...prev,
                    { id: assistantId, role: "assistant" as const, content: fullContent, timestamp: Date.now() },
                  ]);
                } else {
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
                  );
                }
                lastOutputContent.current = fullContent;
                const durationSecs = Math.round((Date.now() - pipelineStartTimeRef.current) / 1000);
                setFinalOutput({
                  projectName: finalType,
                  summary: finalSummary,
                  creditsUsed: finalCredits,
                  agentCount: finalAgents,
                  version: finalVersion,
                  duration: durationSecs > 0 ? `${durationSecs}s` : "< 1s",
                  builderContent: event.builderContent as string | undefined,
                });
                setPipelineActive(false);
                setPipelineLabel("");
                break;
              }
              case "pipeline_halt": {
                const haltReason = event.reason as string;
                if (!assistantAdded) {
                  fullContent = `⚠️ **Pipeline paused**: ${haltReason}\n\nYour work so far has been saved.`;
                  assistantAdded = true;
                  setMessages((prev) => [
                    ...prev,
                    { id: assistantId, role: "assistant" as const, content: fullContent, timestamp: Date.now() },
                  ]);
                }
                setPipelineActive(false);
                break;
              }
              case "image_approval_needed": {
                const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
                setImageApproval({
                  visible: true,
                  imageUrl: event.imageUrl as string,
                  description: event.description as string,
                  imagePrompt: event.imagePrompt as string,
                  stepId: event.stepId as string,
                  attemptNumber: event.attemptNumber as number,
                  maxAttempts: event.maxAttempts as number,
                  pendingMessage: lastUserMsg,
                });
                setPipelineActive(false);
                break;
              }
              case "credit_confirm": {
                // Informational only — no action needed on reconnect.
                break;
              }
              case "error": {
                const errChunk = `⚠️ **Error**: ${event.userMessage as string}`;
                if (!assistantAdded) {
                  assistantAdded = true;
                  setMessages((prev) => [
                    ...prev,
                    { id: assistantId, role: "assistant" as const, content: errChunk, timestamp: Date.now() },
                  ]);
                } else {
                  fullContent += `\n\n${errChunk}`;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
                  );
                }
                setPipelineActive(false);
                break;
              }
              case "done":
                setPipelineActive(false);
                setPipelineLabel("");
                break;
            }
          } catch {}
        }
      }
    } catch {
      setPipelineActive(false);
    } finally {
      activeJobIdRef.current = null;
      setBackgroundJobReady(false);
      setIsStreaming(false);
      setShowTyping(false);
      setPipelineActive(false);
      refreshCredits();
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
              // Apply RTL layout if the detected language is RTL (Section 18.4)
              applyRTL(langCode);
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

            case "stage_3_building": {
              const total = event.totalSteps as number;
              const descs = (event.stepDescriptions as string[]) ?? [];
              setPipelineLabel(`Stage 3: Building ${total} step${total !== 1 ? "s" : ""}...`);
              if (total > 0) {
                const preview = descs
                  .slice(0, 3)
                  .map((d: string, i: number) => `${i + 1}. ${d}`)
                  .join("\n");
                const extra = descs.length > 3 ? `\n*...and ${descs.length - 3} more steps*` : "";
                const chunk = `\n\n🔨 **Stage 3 — Building**\n\n${preview}${extra}\n\n`;
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
                    const u = [...prev];
                    u[u.length - 1] = { ...u[u.length - 1], content: fullContent };
                    return u;
                  });
                }
              }
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
              const autoResolved = event.autoResolved as boolean | undefined;
              const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);
              setPipelineLabel(
                autoResolved
                  ? `Auto → ${levelLabel} Thinking · ~${credits} credits`
                  : `${levelLabel} Thinking · ~${credits} credits`
              );
              break;
            }

            case "credit_confirm": {
              // For "auto" mode: user already trusted backend to pick the level,
              // so credit_confirm is informational — pipelineLabel already shows cost.
              // For explicit levels: this is a redundant server-side event (client already
              // gated pre-send), so no further action needed.
              break;
            }

            case "approval_needed": {
              setClarifyState({
                status: "approval",
                content: event.content as string,
                artifactType: event.artifactType as string,
                version: event.version as number,
                agentCount: event.agentCount as number,
                pendingMessage: originalText,
              });
              setPipelineActive(false);
              break;
            }

            case "final_output": {
              const finalSummary = event.summary as string;
              const finalType = event.artifactType as string;
              const finalCredits = event.creditsUsed as number;
              const finalAgents = event.agentCount as number;
              const finalVersion = event.version as number;
              const chunk =
                `\n\n---\n✅ **Build Complete** — Version ${finalVersion}\n\n` +
                `${finalSummary}\n\n` +
                `*${finalAgents} agents · ${finalCredits} credits · Type: ${finalType}*\n`;
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
              // Show the FinalOutputCard with Share/Copy actions
              lastOutputContent.current = fullContent;
              const durationSecs = Math.round((Date.now() - pipelineStartTimeRef.current) / 1000);
              setFinalOutput({
                projectName: finalType,
                summary: finalSummary,
                creditsUsed: finalCredits,
                agentCount: finalAgents,
                version: finalVersion,
                duration: durationSecs > 0 ? `${durationSecs}s` : "< 1s",
                builderContent: event.builderContent as string | undefined,
              });
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
                    { id: assistantId, role: "assistant", content: fullContent, agentType: activeAgent, timestamp: Date.now(), language: detectedLanguage },
                  ]);
                  assistantAdded = true;
                } else {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent, language: detectedLanguage };
                    return updated;
                  });
                }
              }
              break;
            }

            case "document_ready": {
              const doc = event.result as Record<string, unknown>;
              const docSummary = doc.summary as string ?? "";
              const keyPoints = (doc.key_points as string[]) ?? [];
              const chunk =
                `📄 **${doc.file_name}** (${doc.file_type}, ${doc.page_count} pages, ~${doc.word_count} words)\n\n` +
                `**Summary:** ${docSummary}\n\n` +
                (keyPoints.length > 0 ? `**Key Points:**\n${keyPoints.map((p: string) => `- ${p}`).join("\n")}` : "");
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
              break;
            }

            case "file_security_warning": {
              const warnMsg = event.message as string;
              fullContent += `\n⚠️ **Security Notice:** ${warnMsg}\n\n`;
              break;
            }

            case "image_approval_needed": {
              // Visual Asset Approval Flow (Section 5.11) — pause pipeline
              setImageApproval({
                visible: true,
                imageUrl: event.imageUrl as string,
                description: event.description as string,
                imagePrompt: event.imagePrompt as string,
                stepId: event.stepId as string,
                attemptNumber: event.attemptNumber as number,
                maxAttempts: event.maxAttempts as number,
                pendingMessage: originalText,
              });
              setPipelineActive(false);
              break;
            }

            case "feedback_prompt": {
              // Post-delivery feedback loop (Section 9.4)
              setFeedbackPrompt({
                visible: true,
                artifactType: (event.artifactType as string) ?? "output",
              });
              break;
            }

            case "founder_mode_activated": {
              setFounderModeActive(true);
              const chunk = `🚀 **Founder Mode activated** — ${event.message as string}\n\n`;
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
              break;
            }

            case "fix_limit_reached": {
              // Server-side fix limit enforcement echo (Section 9.5)
              setFixLimitModal({ visible: true, type: event.limitType as "medium" | "rebuild" });
              setPipelineActive(false);
              break;
            }

            case "error": {
              // Standard error codes (Section 10.3)
              const errChunk = `⚠️ **Error**: ${event.userMessage as string}`;
              if (!assistantAdded) {
                setShowTyping(false);
                setMessages((prev) => [
                  ...prev,
                  { id: assistantId, role: "assistant", content: errChunk, agentType: activeAgent, timestamp: Date.now() },
                ]);
                assistantAdded = true;
              } else {
                fullContent += `\n\n${errChunk}`;
                setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: fullContent }; return u; });
              }
              break;
            }

            case "analytics": {
              // Analytics events (Section 20.1) — client-side logging only
              if (__DEV__) {
                console.log("[analytics]", event.event, event.properties);
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
    clarifyState.status === "blueprint" ||
    clarifyState.status === "approval";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top,
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

        {offlineRetrying ? (
          <View style={[styles.clarifyBadge, { backgroundColor: "#F5A623" + "25" }]}>
            <Feather name="wifi" size={12} color="#F5A623" />
            <Text style={[styles.clarifyBadgeText, { color: "#F5A623" }]} numberOfLines={1}>
              Retrying…
            </Text>
          </View>
        ) : pipelineActive && pipelineLabel ? (
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
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.primary + "18" }]}
            onPress={() => setShowChatMenu(true)}
            activeOpacity={0.75}
          >
            <Feather name="more-horizontal" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Agent + Domain */}
      <AgentPanel
        agentType={agentType}
        isStreaming={isStreaming}
        planTier={PLAN_TIER}
        onAgentChange={async (a) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const newChatId = await createConversation(`${AGENTS[a].name} Chat`, a);
          router.replace({ pathname: "/chat/[id]", params: { id: newChatId } });
        }}
      />

      {/* Chat */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          inverted={messages.length > 0}
          removeClippedSubviews={Platform.OS !== "web"}
          maxToRenderPerBatch={8}
          windowSize={10}
          initialNumToRender={12}
          updateCellsBatchingPeriod={30}
          ListHeaderComponent={
            <>
              {backgroundJobReady && activeJobIdRef.current && (
                <ResumeFromBackgroundBanner
                  onReconnect={() => streamReconnect(activeJobIdRef.current!)}
                  onDismiss={() => setBackgroundJobReady(false)}
                  colors={colors as unknown as Parameters<typeof ResumeFromBackgroundBanner>[0]["colors"]}
                />
              )}
              {showTyping && !pipelineActive && <TypingIndicator />}
              {pipelineActive && (
                <PipelineProgress steps={pipelineSteps} visible={pipelineActive} />
              )}
              {decisionEvent && (
                <DecisionMemoryBanner
                  rule={decisionEvent.rule}
                  confirmation={decisionEvent.confirmation}
                  colors={colors as unknown as Record<string, string>}
                />
              )}
              {showVersionHistory && versionHistory.length > 0 && (
                <VersionHistoryCard
                  versions={versionHistory}
                  currentVersion={currentVersion}
                  onRollback={handleRollback}
                  colors={colors as unknown as Record<string, string>}
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
                  colors={colors as unknown as Record<string, string>}
                />
              )}
              {clarifyState.status === "approval" && (
                <ApprovalCard
                  projectName={clarifyState.artifactType ?? "Output"}
                  previewDescription={clarifyState.content ?? "Review the output before finalising."}
                  creditsUsed={0}
                  agentCount={clarifyState.agentCount}
                  onApprove={handleOutputApprove}
                  onChangeSomething={handleOutputChangeSomething}
                />
              )}
              {finalOutput && (
                <FinalOutputCard
                  projectName={finalOutput.projectName}
                  summary={finalOutput.summary}
                  outputContent={lastOutputContent.current}
                  creditsUsed={finalOutput.creditsUsed}
                  agentCount={finalOutput.agentCount}
                  duration={finalOutput.duration}
                  onClose={() => setFinalOutput(null)}
                  onLivePreview={(() => {
                    const bc = finalOutput.builderContent ?? "";
                    const m = bc.match(/```html\n?([\s\S]*?)```/i);
                    const html = m?.[1]?.trim();
                    if (!html) return undefined;
                    return () => {
                      if (Platform.OS === "web" && typeof window !== "undefined") {
                        const blob = new Blob([html], { type: "text/html" });
                        const blobUrl = URL.createObjectURL(blob);
                        (window as unknown as Window & { open: (url: string, target: string) => void }).open(blobUrl, "_blank");
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                      }
                    };
                  })()}
                  onDownload={() => {
                    const content = finalOutput.builderContent ?? lastOutputContent.current;
                    if (Platform.OS === "web" && typeof document !== "undefined") {
                      const hasHtml = /```html\n?[\s\S]*?```/i.test(content);
                      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `thinker-output.${hasHtml ? "html" : "md"}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } else {
                      Share.share({ title: finalOutput.projectName, message: content });
                    }
                  }}
                />
              )}
              {imageApproval?.visible && (
                <ImageOutputCard
                  imageUri={imageApproval.imageUrl}
                  description={imageApproval.description}
                  attemptNumber={imageApproval.attemptNumber}
                  maxAttempts={imageApproval.maxAttempts}
                  onApprove={handleImageApprove}
                  onRevise={handleImageRevise}
                  onRegenerate={handleImageRegenerate}
                />
              )}
              {feedbackPrompt?.visible && (
                <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.feedbackTitle, { color: colors.text }]}>
                    How did the output turn out?
                  </Text>
                  <Text style={[styles.feedbackSub, { color: colors.textSecondary }]}>
                    Your feedback helps me fix it immediately.
                  </Text>
                  <View style={styles.feedbackRow}>
                    {(["bug", "missing_feature", "style"] as const).map((type) => {
                      const labels: Record<string, string> = {
                        bug: "🐛 Bug",
                        missing_feature: "➕ Missing",
                        style: "🎨 Style",
                      };
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.feedbackChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                          onPress={() => handleFeedbackSelect(type)}
                        >
                          <Text style={[styles.feedbackChipText, { color: colors.text }]}>
                            {labels[type]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity onPress={() => setFeedbackPrompt(null)}>
                    <Text style={[styles.feedbackDismiss, { color: colors.textSecondary }]}>
                      Looks great, thanks
                    </Text>
                  </TouchableOpacity>
                </View>
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
            onAttach={handleAttach}
            disabled={isStreaming || isClarifying}
            agentType={agentType}
            placeholder={isClarifying ? "Answer the questions above first..." : undefined}
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

      {/* Chat Options Menu */}
      <Modal
        transparent
        animationType="slide"
        visible={showChatMenu}
        onRequestClose={() => setShowChatMenu(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowChatMenu(false)}
        />
        <View style={[styles.menuSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.menuHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.menuTitle, { color: colors.text }]}>Chat Options</Text>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {[
              { icon: "share-2",     label: "Share",          color: colors.primary,  action: () => { setShowChatMenu(false); Share.share({ message: conv?.title ?? "Chat", title: "Thinker AI Chat" }); } },
              { icon: "edit-2",      label: "Rename",         color: colors.text,     action: () => { setShowChatMenu(false); Alert.alert("Rename Chat", "Enter a new name:", [{ text: "Cancel" }, { text: "Rename", onPress: (name?: string) => { if (name && id) updateConversation(id, { title: name }); } }], { plain: false } as any); } },
              { icon: "star",        label: "Favourite",      color: "#F5A623",       action: () => { setShowChatMenu(false); if (id) updateConversation(id, { favourite: true } as any); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
              { icon: "map-pin",     label: "Pin",            color: colors.text,     action: () => { setShowChatMenu(false); if (id) updateConversation(id, { pinned: true } as any); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
              { icon: "user-plus",   label: "Add to Member",  color: colors.text,     action: () => { setShowChatMenu(false); Alert.alert("Add to Member", "Member sharing coming soon."); } },
              { icon: "folder-plus", label: "Add Project",    color: colors.text,     action: () => { setShowChatMenu(false); Alert.alert("Add Project", "Project assignment coming soon."); } },
              { icon: "search",      label: "Search Chat",    color: colors.text,     action: () => { setShowChatMenu(false); Alert.alert("Search", "In-chat search coming soon."); } },
              { icon: "home",        label: "Add to Home",    color: colors.text,     action: () => { setShowChatMenu(false); Alert.alert("Add to Home", "Shortcut created on home screen."); } },
              { icon: "archive",     label: "Archive",        color: colors.textSecondary, action: () => { setShowChatMenu(false); if (id) updateConversation(id, { archived: true } as any); router.back(); } },
              { icon: "trash-2",     label: "Delete",         color: "#FF3B30",       action: () => { setShowChatMenu(false); Alert.alert("Delete Chat", "This chat will be permanently deleted.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => router.back() }]); } },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuRow, { borderBottomColor: colors.border }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); item.action(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: (item.color === "#FF3B30" ? "#FF3B30" : item.color === "#F5A623" ? "#F5A623" : colors.primary) + "15" }]}>
                  <Feather name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={[styles.menuLabel, { color: item.color }]}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color={colors.border} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
    width: 44,
    height: 44,
    borderRadius: 14,
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
    width: 44,
    height: 44,
    borderRadius: 14,
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
    gap: 6,
    paddingTop: 10,
    paddingHorizontal: 0,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
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
  feedbackCard: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  feedbackSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  feedbackRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  feedbackChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedbackChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  feedbackDismiss: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  menuSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 12,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
});
