import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Message } from "@/context/AppContext";
import { AGENTS } from "@/lib/agents";
import { useColors } from "@/hooks/useColors";

interface Props {
  message: Message;
}

function renderInlineText(text: string, baseColor: string, codeColor: string, codeBg: string) {
  const segments = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**")) {
      return (
        <Text key={i} style={{ fontWeight: "700" as const, color: baseColor }}>
          {seg.slice(2, -2)}
        </Text>
      );
    }
    if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2) {
      return (
        <Text
          key={i}
          style={{
            fontFamily: "monospace",
            color: codeColor,
            backgroundColor: codeBg,
            borderRadius: 4,
            fontSize: 13,
          }}
        >
          {seg.slice(1, -1)}
        </Text>
      );
    }
    return (
      <Text key={i} style={{ color: baseColor }}>
        {seg}
      </Text>
    );
  });
}

export function MessageBubble({ message }: Props) {
  const colors = useColors();
  const isUser = message.role === "user";
  const agent = message.agentType ? AGENTS[message.agentType] : null;

  const textColor = isUser ? "#FFFFFF" : colors.text;
  const codeBg = isUser ? "rgba(255,255,255,0.15)" : colors.border;
  const codeColor = isUser ? "#E0E0FF" : colors.accent;

  const parts = message.content.split(/(```[\s\S]*?```)/g);

  return (
    <View
      style={[
        styles.wrapper,
        isUser ? styles.wrapperUser : styles.wrapperAssistant,
      ]}
    >
      {!isUser && agent && (
        <View style={styles.agentTag}>
          <Feather name={agent.icon as any} size={10} color={agent.color} />
          <Text style={[styles.agentTagText, { color: agent.color }]}>
            {agent.shortName}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleAssistant, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}
      >
        {parts.map((part, i) => {
          if (part.startsWith("```")) {
            const lines = part.split("\n");
            const lang = lines[0].replace("```", "").trim();
            const code = lines.slice(1).join("\n").replace(/```$/, "");
            return (
              <View
                key={i}
                style={[styles.codeBlock, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              >
                {lang ? (
                  <Text style={[styles.codeLang, { color: colors.accent }]}>{lang}</Text>
                ) : null}
                <Text style={[styles.codeText, { color: "#A8FF78" }]}>{code.trim()}</Text>
              </View>
            );
          }

          const lines = part.split("\n");
          return (
            <View key={i}>
              {lines.map((line, li) => {
                if (line.startsWith("# ")) {
                  return (
                    <Text key={li} style={[styles.h1, { color: textColor }]}>
                      {line.slice(2)}
                    </Text>
                  );
                }
                if (line.startsWith("## ")) {
                  return (
                    <Text key={li} style={[styles.h2, { color: textColor }]}>
                      {line.slice(3)}
                    </Text>
                  );
                }
                if (line.startsWith("- ") || line.startsWith("• ")) {
                  return (
                    <View key={li} style={styles.bulletRow}>
                      <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                      <Text style={[styles.messageText, { color: textColor }]}>
                        {renderInlineText(line.slice(2), textColor, codeColor, codeBg)}
                      </Text>
                    </View>
                  );
                }
                if (/^\d+\. /.test(line)) {
                  const match = line.match(/^(\d+)\. (.*)/);
                  if (match) {
                    return (
                      <View key={li} style={styles.bulletRow}>
                        <Text style={[styles.bullet, { color: colors.primary }]}>{match[1]}.</Text>
                        <Text style={[styles.messageText, { color: textColor }]}>
                          {renderInlineText(match[2], textColor, codeColor, codeBg)}
                        </Text>
                      </View>
                    );
                  }
                }
                if (line === "") {
                  return <View key={li} style={styles.spacer} />;
                }
                return (
                  <Text key={li} style={[styles.messageText, { color: textColor }]}>
                    {renderInlineText(line, textColor, codeColor, codeBg)}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 3,
    maxWidth: "85%",
  },
  wrapperUser: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  wrapperAssistant: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  agentTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    marginLeft: 4,
  },
  agentTagText: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
  },
  bubble: {
    borderRadius: 20,
    padding: 14,
  },
  bubbleUser: {
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    flexWrap: "wrap",
  },
  h1: {
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 6,
    marginTop: 4,
  },
  h2: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 4,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 2,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700" as const,
    width: 14,
  },
  spacer: {
    height: 6,
  },
  codeBlock: {
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
  },
  codeLang: {
    fontSize: 11,
    fontWeight: "600" as const,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  codeText: {
    fontSize: 13,
    fontFamily: "monospace",
    lineHeight: 20,
  },
});
