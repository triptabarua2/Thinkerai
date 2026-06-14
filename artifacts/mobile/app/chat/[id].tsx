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
import { ChatInput } from "@/components/ChatInput";
import { ClarificationCard, type ClarifyData } from "@/components/ClarificationCard";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
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
  | { status: "skipped" };

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, q } = useLocalSearchParams<{ id: string; q?: string }>();
  const { getConversation, updateConversation } = useApp();

  const conv = getConversation(id ?? "");
  const [messages, setMessages] = useState<Message[]>(conv?.messages ?? []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [agentType, setAgentType] = useState<AgentType>(conv?.agentType ?? "ceo");
  const [clarifyState, setClarifyState] = useState<ClarifyState>({ status: "idle" });
  const initializedRef = useRef(false);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (conv?.messages && !initializedRef.current) {
      setMessages(conv.messages);
      if (conv.agentType) setAgentType(conv.agentType);
      initializedRef.current = true;
    }
  }, [conv]);

  async function checkClarification(text: string): Promise<ClarifyData | null> {
    try {
      const baseUrl = getBaseUrl();
      const history = messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${baseUrl}api/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationHistory: history }),
      });

      if (!res.ok) return null;
      const data = (await res.json()) as ClarifyData;
      return data;
    } catch {
      return null;
    }
  }

  // Auto-send message passed from home screen via ?q= param
  const handleSendRef = useRef<(text: string) => Promise<void>>(async () => {});

  useEffect(() => {
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      const decoded = decodeURIComponent(q);
      // Small delay to let the screen render first
      setTimeout(() => handleSendRef.current(decoded), 150);
    }
  }, [q]);

  async function handleSend(text: string) {
    if (isStreaming || !id) return;

    // First message only: run clarification check
    if (messages.length === 0 && clarifyState.status === "idle") {
      setClarifyState({ status: "checking" });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const clarify = await checkClarification(text);

      if (clarify && clarify.needs_clarification && clarify.questions.length > 0) {
        setClarifyState({ status: "needed", data: clarify, pendingMessage: text });
        return;
      }

      setClarifyState({ status: "skipped" });
    }

    await sendMessage(text);
  }

  handleSendRef.current = handleSend;

  async function handleClarifyProceed(answers: Record<string, string>) {
    if (clarifyState.status !== "needed") return;
    const { pendingMessage, data } = clarifyState;

    const answerLines = data.questions
      .map((q) => `- ${q.question}: **${answers[q.id]}**`)
      .join("\n");

    const enrichedMessage = `${pendingMessage}\n\n**My answers to clarifying questions:**\n${answerLines}`;

    setClarifyState({ status: "skipped" });
    await sendMessage(enrichedMessage, pendingMessage);
  }

  function handleClarifySkip() {
    if (clarifyState.status !== "needed") return;
    const pending = clarifyState.pendingMessage;
    setClarifyState({ status: "skipped" });
    sendMessage(pending);
  }

  async function sendMessage(text: string, displayText?: string) {
    if (!id) return;

    const currentMessages = [...messages];
    const detected = detectAgentType(displayText ?? text);
    if (messages.length === 0) {
      setAgentType(detected);
    }

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

    const activeAgent = messages.length === 0 ? detected : agentType;

    try {
      const baseUrl = getBaseUrl();
      const chatHistory = [
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ messages: chatHistory, agentType: activeAgent }),
      });

      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";
      let assistantAdded = false;
      const assistantId = genId();

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
            const parsed = JSON.parse(data) as { content?: string; error?: string };
            if (parsed.content) {
              fullContent += parsed.content;
              if (!assistantAdded) {
                setShowTyping(false);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantId,
                    role: "assistant",
                    content: fullContent,
                    agentType: activeAgent,
                    timestamp: Date.now(),
                  },
                ]);
                assistantAdded = true;
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              }
            }
          } catch {}
        }
      }

      const finalMessages = [
        ...currentMessages,
        userMsg,
        {
          id: assistantId,
          role: "assistant" as const,
          content: fullContent,
          agentType: activeAgent,
          timestamp: Date.now(),
        },
      ];

      const newTitle =
        conv?.title === "New Chat" || conv?.title === `${AGENTS[activeAgent].name} Session`
          ? (displayText ?? text).slice(0, 40) + ((displayText ?? text).length > 40 ? "..." : "")
          : conv?.title ?? "Chat";

      await updateConversation(id, {
        messages: finalMessages,
        title: newTitle,
        agentType: activeAgent,
      });
    } catch (err) {
      setShowTyping(false);
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

  const reversedMessages = [...messages].reverse();
  const isClarifying =
    clarifyState.status === "checking" || clarifyState.status === "needed";

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

        {/* Clarify status indicator */}
        {clarifyState.status === "checking" && (
          <View style={[styles.clarifyBadge, { backgroundColor: "#7B61FF20" }]}>
            <Feather name="cpu" size={12} color="#7B61FF" />
            <Text style={styles.clarifyBadgeText}>Analyzing…</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.card }]}>
          <Feather name="more-horizontal" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Agent Status */}
      <AgentPanel
        agentType={agentType}
        isStreaming={isStreaming}
        onAgentChange={(a) => setAgentType(a)}
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
              {showTyping && <TypingIndicator />}
              {clarifyState.status === "needed" && (
                <ClarificationCard
                  data={clarifyState.data}
                  originalMessage={clarifyState.pendingMessage}
                  onProceed={handleClarifyProceed}
                  onSkip={handleClarifySkip}
                />
              )}
            </>
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            clarifyState.status === "needed" ? null : (
              <View style={styles.empty}>
                <View
                  style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Feather name="cpu" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to help</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  Ask anything — I can plan, research,{"\n"}code, create, and execute tasks
                </Text>
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
          <ChatInput onSend={handleSend} disabled={isStreaming || isClarifying} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  clarifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clarifyBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#7B61FF",
    letterSpacing: 0.3,
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
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
    fontWeight: "600" as const,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  composerWrap: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
