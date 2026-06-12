import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder = "Message Think AI..." }: Props) {
  const colors = useColors();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const canSend = text.trim().length > 0 && !disabled;

  function handleSend() {
    if (!canSend) return;
    const content = text.trim();
    setText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(content);
    inputRef.current?.focus();

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity style={styles.attachBtn} activeOpacity={0.6}>
        <Feather name="paperclip" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          { color: colors.text },
        ]}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline
        maxLength={4000}
        blurOnSubmit={false}
        onSubmitEditing={handleSend}
      />

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          style={[
            styles.sendBtn,
            {
              backgroundColor: canSend ? colors.primary : colors.border,
            },
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Feather
            name="arrow-up"
            size={18}
            color={canSend ? "#FFFFFF" : colors.textTertiary}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 28,
    borderWidth: 1,
    marginHorizontal: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 130,
    paddingTop: 7,
    paddingBottom: 7,
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
