import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AGENTS, type AgentType } from "@/lib/agents";
import { ConnectorsSheet } from "@/components/ConnectorsSheet";
import { useColors } from "@/hooks/useColors";
import { useConnectors } from "@/hooks/useConnectors";
import { setVoiceCallback } from "@/lib/voiceStore";

const INPUT_MIN_H = 52;
const INPUT_MAX_H = 220; // ~8 lines at lineHeight 25
const LINE_HEIGHT = 25;

interface Props {
  onSend: (text: string) => void;
  onAttach?: () => void;
  disabled?: boolean;
  placeholder?: string;
  agentType?: AgentType;
  editingText?: string | null;
  onCancelEdit?: () => void;
  isStreaming?: boolean;
  onStop?: () => void;
}

export function ChatInput({
  onSend,
  onAttach,
  disabled = false,
  placeholder,
  agentType,
  editingText,
  onCancelEdit,
  isStreaming = false,
  onStop,
}: Props) {
  const colors = useColors();
  const [text, setText] = useState("");
  const [inputH, setInputH] = useState(INPUT_MIN_H);
  const [connectorsVisible, setConnectorsVisible] = useState(false);
  const heightAnim = useRef(new Animated.Value(INPUT_MIN_H)).current;
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { connectedIds } = useConnectors();

  const isEditing = editingText != null;

  const agentDef = agentType ? AGENTS[agentType] : null;
  const resolvedPlaceholder =
    placeholder ?? agentDef?.placeholder ?? "Message Thinker AI...";

  const canSend = text.trim().length > 0 && !disabled;

  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: inputH,
      useNativeDriver: false,
      damping: 22,
      stiffness: 280,
      mass: 0.7,
    }).start();
  }, [inputH]);

  // Web: react-native-web's onContentSizeChange is unreliable, so measure the
  // underlying <textarea> DOM node's scrollHeight directly and size it to fit.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (!node || !node.style) return;
    node.style.height = "auto";
    const scrollHeight = node.scrollHeight;
    const target = Math.min(Math.max(scrollHeight, INPUT_MIN_H), INPUT_MAX_H);
    node.style.height = `${target}px`;
    node.style.overflowY = scrollHeight > INPUT_MAX_H ? "auto" : "hidden";
    setInputH(target);
  }, [text]);

  useEffect(() => {
    if (editingText != null) {
      setText(editingText);
      setInputH(INPUT_MIN_H);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editingText]);

  function handleCancelEdit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setText("");
    setInputH(INPUT_MIN_H);
    heightAnim.setValue(INPUT_MIN_H);
    onCancelEdit?.();
  }

  function handleContentSizeChange(e: any) {
    const h = e.nativeEvent.contentSize?.height;
    if (!h) return;
    const target = Math.min(Math.max(h, INPUT_MIN_H), INPUT_MAX_H);
    if (Math.abs(target - inputH) > 0.5) setInputH(target);
  }

  function handleSend() {
    if (!canSend) return;
    const content = text.trim();
    setText("");
    setInputH(INPUT_MIN_H);
    heightAnim.setValue(INPUT_MIN_H);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(content);
    inputRef.current?.focus();

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }

  return (
    <View>
      {isEditing && (
        <View
          style={[
            styles.editingBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="edit-2" size={13} color={colors.primary} />
          <Text style={[styles.editingLabel, { color: colors.textSecondary }]}>
            Editing message
          </Text>
          <TouchableOpacity onPress={handleCancelEdit} hitSlop={8}>
            <Feather name="x" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onAttach}
          activeOpacity={0.6}
          hitSlop={8}
        >
          <Feather name="paperclip" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setConnectorsVisible(true);
          }}
          activeOpacity={0.6}
          hitSlop={8}
        >
          <View>
            <Feather name="link-2" size={18} color={colors.textSecondary} />
            {connectedIds.length > 0 && (
              <View style={[styles.connectorDot, { backgroundColor: colors.success, borderColor: colors.card }]} />
            )}
          </View>
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.inputWrap,
            Platform.OS !== "web" ? { height: heightAnim } : undefined,
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { color: colors.text, outlineStyle: "none" } as any,
              Platform.OS === "web" ? ({ alignSelf: "stretch" } as any) : null,
            ]}
            value={text}
            onChangeText={setText}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={4000}
            blurOnSubmit={false}
            scrollEnabled={Platform.OS !== "web" && inputH >= INPUT_MAX_H}
            onContentSizeChange={handleContentSizeChange}
            onSubmitEditing={handleSend}
          />
        </Animated.View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setVoiceCallback((transcribed) => {
              if (transcribed.trim()) setText(transcribed.trim());
            });
            router.push("/voice" as any);
          }}
          activeOpacity={0.6}
          hitSlop={8}
        >
          <Feather name="mic" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {isStreaming ? (
            <Pressable
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onStop?.();
              }}
            >
              <Feather name="square" size={16} color="#F9FAFB" />
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.sendBtn,
                { backgroundColor: canSend ? colors.primary : colors.border },
              ]}
              onPress={handleSend}
              disabled={!canSend}
            >
              <Feather
                name="arrow-up"
                size={18}
                color={canSend ? "#F9FAFB" : colors.textTertiary}
              />
            </Pressable>
          )}
        </Animated.View>
      </View>

      <ConnectorsSheet
        visible={connectorsVisible}
        onClose={() => setConnectorsVisible(false)}
      />
    </View>
  );
}

const floatShadow = Platform.select({
  web: { boxShadow: "0 6px 24px rgba(0,0,0,0.13)" },
  default: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
  },
});

const styles = StyleSheet.create({
  editingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editingLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 32,
    borderWidth: 1,
    marginHorizontal: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
    ...(floatShadow as object),
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  connectorDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
  },
  inputWrap: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: (INPUT_MIN_H - LINE_HEIGHT) / 2,
  },
  input: {
    fontSize: 17,
    lineHeight: LINE_HEIGHT,
    width: "100%",
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
